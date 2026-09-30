import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ReportarAtraso } from '../../componentes/atrasos/ReportarAtraso';
import { Cargando } from '../../componentes/Cargando';
import { ElegirRuta } from '../../componentes/conductor/ElegirRuta';
import { MapaConductor } from '../../componentes/conductor/MapaConductor';
import { MensajeError } from '../../componentes/MensajeError';
import { useAuth } from '../../core/autenticacion/useAuth';
import {
  paradaDondeEstaElBus,
  posicionVigente,
  proximaParada,
  textoLlegada,
  type ParadaDelPanel,
} from '../../core/panelConductor';
import { useDeslizarHoja } from '../../hooks/useDeslizarHoja';
import { usePanelConductor } from '../../hooks/usePanelConductor';
import { usePosicionBus } from '../../hooks/usePosicionBus';
import { useRutas } from '../../hooks/useRutas';
import './PanelConductor.css';

/**
 * Panel del conductor en ruta (HU-62, HU-75, HU-76). Teléfono en el tablero,
 * en horizontal, con una sola mano.
 *
 * <p>Una sola pantalla: la parada en la que está el bus (según el GPS) o la
 * próxima del recorrido, con "Subió" y "Bajó" ahí mismo y "Siguiente parada"
 * para cerrarla con lo que contó el piloto. No hay que avisar que se llegó.
 * Al primer toque la parada queda fija hasta cerrarla, aunque el GPS proponga
 * otra: el conteo nunca cambia de parada a medio contar.
 *
 * <p>La ruta se ve y se cambia tocando su nombre en la barra.
 */

type Movimiento = 'sube' | 'baja';

type Hoja = 'paradas' | 'atraso' | 'ruta' | null;

export function PanelConductor() {
  const { cerrarSesion } = useAuth();
  const { panel, cargando, error, marcando, cerrarParada, reintentar } = usePanelConductor();
  const [hoja, setHoja] = useState<Hoja>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [cierre, setCierre] = useState<string | null>(null);
  /** Parada fijada a mano (lista de paradas) o por el primer toque. */
  const [fijadaId, setFijadaId] = useState<number | null>(null);
  const [historial, setHistorial] = useState<Movimiento[]>([]);
  /** La recien cerrada sigue pendiente hasta que llega el panel nuevo. */
  const [cerradaId, setCerradaId] = useState<number | null>(null);

  // La ruta (ubicacion de las paradas) y el bus en vivo: para el mapa y para
  // saber en que parada esta el bus. null mientras no hay panel: no se pide nada.
  const { rutas } = useRutas();
  const ruta = rutas?.find((r) => r.id === panel?.rutaId) ?? null;
  const { posicion } = usePosicionBus(undefined, panel ? panel.rutaId : null);
  const ubicaciones = useMemo(
    () => new Map((ruta?.paradas ?? []).map((p) => [p.id, { latitud: p.latitud, longitud: p.longitud }] as const)),
    [ruta],
  );
  const bus = posicionVigente(posicion, Date.now());

  // El panel nuevo ya trae la parada cerrada como atendida (o una vuelta nueva).
  useEffect(() => setCerradaId(null), [panel]);

  const paradas = panel?.paradas ?? [];
  const pendientes = paradas.filter((p) => p.paradaId !== cerradaId && !p.atendidaEn);
  const fijada = pendientes.find((p) => p.paradaId === fijadaId) ?? null;
  const aqui = paradaDondeEstaElBus(pendientes, ubicaciones, bus);
  const actual = fijada ?? proximaParada(pendientes, ubicaciones, bus);

  // La parada fijada se cerro por otro lado (otra pestana): el conteo se suelta.
  useEffect(() => {
    if (fijadaId !== null && !fijada && panel) {
      setFijadaId(null);
      setHistorial([]);
    }
  }, [fijadaId, fijada, panel]);

  const subieron = historial.filter((m) => m === 'sube').length;
  const bajaron = historial.length - subieron;
  const aBordo = Math.max(0, (panel?.aBordo ?? 0) + subieron - bajaron);

  function mover(movimiento: Movimiento) {
    if (!actual) return;
    setFijadaId((id) => id ?? actual.paradaId);
    setCierre(null);
    setFallo(null);
    setHistorial((h) => [...h, movimiento]);
  }

  async function siguienteParada() {
    if (!actual) return;
    setFallo(null);
    const resultado = await cerrarParada(actual.paradaId, { subieron, bajaron });
    if (!resultado.ok) {
      setFallo(resultado.mensaje);
      return;
    }
    setCierre(textoCierre(actual.nombre, subieron, bajaron));
    setCerradaId(actual.paradaId);
    setFijadaId(null);
    setHistorial([]);
  }

  function elegirParada(p: ParadaDelPanel) {
    setHoja(null);
    setFijadaId(p.paradaId);
    setCierre(null);
  }

  /** Cambio la ruta desde la barra o la eligio al entrar: arranca de cero. */
  function rutaElegida() {
    setHoja(null);
    setFallo(null);
    setCierre(null);
    setFijadaId(null);
    setHistorial([]);
    reintentar();
  }

  const salir = (
    <button type="button" className="conductor__chico" onClick={() => void cerrarSesion()}>
      Cerrar sesión
    </button>
  );

  // Sin ruta todavia (403): la elige aqui mismo.
  if (!panel && error?.status === 403) {
    return (
      <div className="conductor conductor--mensaje">
        <h1 className="conductor__titulo">¿Qué ruta vas a manejar hoy?</h1>
        <ElegirRuta onElegida={rutaElegida} />
        {salir}
      </div>
    );
  }

  // Sin panel todavia: cargando o sin conexion.
  if (!panel) {
    return (
      <div className="conductor conductor--mensaje">
        {error ? (
          <MensajeError error={error} onReintentar={reintentar} />
        ) : (
          cargando && <Cargando texto="Cargando tu ruta…" />
        )}
        <Link to="/" className="conductor__chico">
          Ver el mapa
        </Link>
        {salir}
      </div>
    );
  }

  const enviando = actual !== null && marcando === actual.paradaId;

  return (
    <div className="conductor">
      <header className="conductor__barra">
        <button
          type="button"
          className="conductor__ruta"
          aria-label={`Cambiar ruta. Ahora: ${panel.rutaNombre}`}
          onClick={() => setHoja('ruta')}
        >
          <span className="conductor__ruta-nombre">{panel.rutaNombre}</span>
          <IconoCambiar />
        </button>
        {panel.vuelta !== undefined && <span className="conductor__vuelta">Vuelta {panel.vuelta}</span>}
        <span className="conductor__gps">
          <span
            className={
              panel.estadoBus === 'SIN_DATOS' ? 'conductor__punto conductor__punto--sin-datos' : 'conductor__punto'
            }
            aria-hidden="true"
          />
          {panel.estadoBus === 'SIN_DATOS' ? 'Sin GPS' : 'GPS en vivo'}
        </span>
        {error && <span className="conductor__sin-conexion">Sin conexión: reintentando</span>}
        <span className="conductor__acciones">
          <button type="button" className="conductor__chico" onClick={() => setHoja('paradas')}>
            Paradas
          </button>
          <button type="button" className="conductor__chico" onClick={() => setHoja('atraso')}>
            Reportar atraso
          </button>
          {salir}
        </span>
      </header>

      <main className="conductor__contenido">
        <section className="conductor__tarjeta" aria-labelledby="conductor-parada">
          {actual ? (
            <>
              <div className="conductor__cabeza">
                <span className="conductor__rotulo">{fijada || aqui ? 'Estás aquí' : 'Próxima parada'}</span>
                <h1 id="conductor-parada" className="conductor__titulo">
                  {actual.nombre}
                </h1>
                <p className="conductor__detalle">
                  <span>{textoLlegada(actual, panel.estadoBus)}</span>
                  <span aria-hidden="true">·</span>
                  <IconoPersonas />
                  <strong>{textoEsperan(actual.reservasActivas)}</strong>
                  <span>según la app</span>
                </p>
              </div>

              <div className="conductor__contar">
                <button
                  type="button"
                  className="conductor__boton-conteo conductor__boton-conteo--sube"
                  onClick={() => mover('sube')}
                  disabled={enviando}
                  aria-label={`Subió. Van ${subieron}`}
                >
                  <IconoFlecha arriba />
                  <span className="conductor__boton-texto">Subió</span>
                  <span className="conductor__boton-cifra tabular">{subieron}</span>
                </button>
                <button
                  type="button"
                  className="conductor__boton-conteo conductor__boton-conteo--baja"
                  onClick={() => mover('baja')}
                  disabled={enviando}
                  aria-label={`Bajó. Van ${bajaron}`}
                >
                  <IconoFlecha />
                  <span className="conductor__boton-texto">Bajó</span>
                  <span className="conductor__boton-cifra tabular">{bajaron}</span>
                </button>
              </div>

              <div className="conductor__pie">
                <Cifra valor={aBordo} rotulo="a bordo" />
                <Cifra valor={panel.subieronHoy ?? 0} rotulo="subieron hoy" />
                <p className={fallo ? 'conductor__estado conductor__estado--fallo' : 'conductor__estado'} role="status">
                  {fallo ?? (historial.length > 0 ? textoConteo(actual.reservasActivas, subieron) : cierre)}
                </p>
                <button
                  type="button"
                  className="conductor__secundario"
                  onClick={() => setHistorial((h) => h.slice(0, -1))}
                  disabled={historial.length === 0 || enviando}
                  aria-label="Deshacer el último"
                >
                  <IconoDeshacer />
                </button>
                <button
                  type="button"
                  className="conductor__siguiente"
                  onClick={() => void siguienteParada()}
                  disabled={enviando}
                >
                  {enviando ? 'Guardando…' : 'Siguiente parada'}
                </button>
              </div>
            </>
          ) : (
            <div className="conductor__cabeza">
              <h1 id="conductor-parada" className="conductor__titulo">
                Recorrido completo
              </h1>
              <p className="conductor__detalle">Ya cerraste todas las paradas de esta vuelta.</p>
              {cierre && (
                <p className="conductor__estado" role="status">
                  {cierre}
                </p>
              )}
            </div>
          )}
        </section>

        <MapaConductor panel={panel} ruta={ruta} posicion={posicion} />
      </main>

      {hoja === 'paradas' && (
        <Hoja titulo="Paradas de tu recorrido" onCerrar={() => setHoja(null)}>
          <ul className="conductor__lista" aria-label="Paradas del recorrido">
            {paradas.map((p) => (
              <li key={p.paradaId} className="conductor__item">
                <span className="conductor__item-textos">
                  <strong>{p.nombre}</strong>
                  <span>
                    {textoEsperan(p.reservasActivas)} · {textoLlegada(p, panel.estadoBus)}
                  </span>
                </span>
                {p.atendidaEn || p.paradaId === cerradaId ? (
                  <span className="conductor__item-estado">Cerrada</span>
                ) : p.paradaId === actual?.paradaId ? (
                  <span className="conductor__item-estado">Aquí</span>
                ) : (
                  <button
                    type="button"
                    className="conductor__chico"
                    onClick={() => elegirParada(p)}
                    disabled={historial.length > 0}
                  >
                    Estoy aquí
                  </button>
                )}
              </li>
            ))}
          </ul>
          {historial.length > 0 && (
            <p className="conductor__estado">Cerrá la parada que estás contando para elegir otra.</p>
          )}
        </Hoja>
      )}

      {hoja === 'ruta' && (
        <Hoja titulo="Cambiar de ruta" onCerrar={() => setHoja(null)}>
          <ElegirRuta onElegida={rutaElegida} />
        </Hoja>
      )}

      {hoja === 'atraso' && (
        <Hoja titulo="Reportar atraso" onCerrar={() => setHoja(null)} clara>
          {/* SCRUM-26, bloque E.2: el piloto avisa que viene demorado. */}
          <ReportarAtraso />
        </Hoja>
      )}
    </div>
  );
}

function Hoja({
  titulo,
  onCerrar,
  clara = false,
  children,
}: {
  titulo: string;
  onCerrar: () => void;
  clara?: boolean;
  children: ReactNode;
}) {
  const deslizable = useDeslizarHoja({ alBajar: onCerrar });
  useEffect(() => {
    const alTecla = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    document.addEventListener('keydown', alTecla);
    return () => document.removeEventListener('keydown', alTecla);
  }, [onCerrar]);

  return (
    <div className="conductor__velo" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <section
        ref={deslizable}
        className={clara ? 'conductor__hoja conductor__hoja--clara' : 'conductor__hoja'}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
      >
        <header className="conductor__hoja-cabecera">
          <h2>{titulo}</h2>
          <button type="button" className="conductor__chico" onClick={onCerrar}>
            Cerrar
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function Cifra({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <span className="conductor__cifra">
      <span className="conductor__cifra-valor tabular">{valor}</span>
      <span className="conductor__cifra-rotulo">{rotulo}</span>
    </span>
  );
}

function textoEsperan(n: number): string {
  if (n === 0) return 'Nadie espera';
  return n === 1 ? '1 espera' : `${n} esperan`;
}

function textoConteo(avisaron: number, subieron: number): string {
  if (subieron < avisaron) {
    const faltan = avisaron - subieron;
    return faltan === 1 ? 'Falta 1 de los que avisaron' : `Faltan ${faltan} de los que avisaron`;
  }
  if (subieron === avisaron) {
    return avisaron === 0 ? 'Contando' : 'Subieron todos los que avisaron';
  }
  const extra = subieron - avisaron;
  return extra === 1 ? '1 subió sin avisar por la app' : `${extra} subieron sin avisar por la app`;
}

function textoCierre(nombre: string, subieron: number, bajaron: number): string {
  return `${nombre} cerrada: ${subieron} ${subieron === 1 ? 'subió' : 'subieron'}, ${bajaron} ${
    bajaron === 1 ? 'bajó' : 'bajaron'
  }.`;
}

function IconoFlecha({ arriba = false }: { arriba?: boolean }) {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {arriba ? (
        <>
          <path d="M12 20V5" />
          <path d="M5 11l7-7 7 7" />
        </>
      ) : (
        <>
          <path d="M12 4v15" />
          <path d="M19 13l-7 7-7-7" />
        </>
      )}
    </svg>
  );
}

function IconoDeshacer() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function IconoCambiar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function IconoPersonas() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
      <path d="M16 3.1a4 4 0 0 1 0 7.8" />
    </svg>
  );
}
