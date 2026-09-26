import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
  recordarRutaConfirmada,
  rutaYaConfirmada,
  textoLlegada,
  type ParadaDelPanel,
} from '../../core/panelConductor';
import { useDeslizarHoja } from '../../hooks/useDeslizarHoja';
import { usePanelConductor } from '../../hooks/usePanelConductor';
import { usePosicionBus } from '../../hooks/usePosicionBus';
import { useRutas } from '../../hooks/useRutas';
import './PanelConductor.css';

/**
 * Panel del conductor en ruta (HU-62, HU-75, HU-76). Diseño "Panel del
 * conductor en ruta": teléfono en el tablero, en horizontal, con una sola mano.
 *
 * <p>Al entrar, el conductor confirma la ruta que va a manejar o la cambia; en
 * la jornada la cambia tocando su nombre en la barra.
 *
 * <p>La parada que propone "Llegué" es aquella en la que esta el bus segun el
 * GPS; si no esta en ninguna, la proxima del recorrido.
 *
 * <p>Tres momentos, cada uno con un protagonista del lado del pulgar:
 * en camino ("Llegué"), en la parada ("Subió" y "Bajó") y parada cerrada
 * ("Seguir la ruta"). Al salir de la parada se guarda lo que contó el piloto,
 * incluidos los que subieron sin avisar por la app, y se cierran sus avisos.
 */

type Movimiento = 'sube' | 'baja';

type Fase =
  | { tipo: 'camino' }
  | { tipo: 'parada'; parada: ParadaDelPanel; historial: Movimiento[]; aBordoAlLlegar: number }
  | {
      tipo: 'cerrada';
      parada: ParadaDelPanel;
      subieron: number;
      bajaron: number;
      aBordo: number;
    };

type Hoja = 'paradas' | 'atraso' | 'ruta' | null;

export function PanelConductor() {
  const { cerrarSesion } = useAuth();
  const { panel, cargando, error, marcando, cerrarParada, reintentar } = usePanelConductor();
  const [fase, setFase] = useState<Fase>({ tipo: 'camino' });
  const [hoja, setHoja] = useState<Hoja>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [confirmada, setConfirmada] = useState(rutaYaConfirmada);
  const [eligiendoRuta, setEligiendoRuta] = useState(false);

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

  const paradas = panel?.paradas ?? [];
  const aBordo = panel?.aBordo ?? 0;
  // La que se acaba de cerrar puede seguir pendiente hasta el proximo refresco.
  const cerradaId = fase.tipo === 'cerrada' ? fase.parada.paradaId : null;
  const pendientes = paradas.filter((p) => p.paradaId !== cerradaId);
  const aqui = paradaDondeEstaElBus(pendientes, ubicaciones, bus);
  const proxima = proximaParada(pendientes, ubicaciones, bus);

  const llegar = useCallback(
    (parada: ParadaDelPanel) => {
      setHoja(null);
      setFallo(null);
      setFase({ tipo: 'parada', parada, historial: [], aBordoAlLlegar: aBordo });
    },
    [aBordo],
  );

  // El GPS detecta la llegada: el bus detenido en la parada que toca, o en la
  // que el GPS lo ubica aunque no fuera la siguiente del orden.
  const autoLlegada = useRef<number | null>(null);
  const aquiId = aqui?.paradaId ?? null;
  useEffect(() => {
    if (fase.tipo !== 'camino' || !panel || !proxima) return;
    const enLaParada =
      panel.estadoBus === 'DETENIDO_EN_PARADA' &&
      (aquiId === proxima.paradaId || (proxima.minutos !== null && proxima.minutos <= 0));
    if (enLaParada && autoLlegada.current !== proxima.paradaId) {
      autoLlegada.current = proxima.paradaId;
      llegar(proxima);
    }
  }, [fase.tipo, panel, proxima, aquiId, llegar]);

  async function salirDeLaParada() {
    if (fase.tipo !== 'parada') return;
    const subieron = fase.historial.filter((m) => m === 'sube').length;
    const bajaron = fase.historial.length - subieron;
    setFallo(null);
    const resultado = await cerrarParada(fase.parada.paradaId, { subieron, bajaron });
    if (!resultado.ok) {
      setFallo(resultado.mensaje);
      return;
    }
    setFase({
      tipo: 'cerrada',
      parada: fase.parada,
      subieron,
      bajaron,
      aBordo: Math.max(0, fase.aBordoAlLlegar + subieron - bajaron),
    });
  }

  function empezar() {
    recordarRutaConfirmada();
    setConfirmada(true);
    setEligiendoRuta(false);
  }

  /** Eligio ruta (al entrar o desde la barra): empieza en camino con el panel nuevo. */
  function rutaElegida() {
    empezar();
    setHoja(null);
    setFallo(null);
    setFase({ tipo: 'camino' });
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
        <h1 className="conductor__titulo conductor__titulo--mediano">¿Qué ruta vas a manejar hoy?</h1>
        <ElegirRuta onElegida={rutaElegida} />
        {salir}
      </div>
    );
  }

  // Al entrar: confirma la ruta o la cambia, una vez por sesion.
  if (panel && !confirmada) {
    return (
      <div className="conductor conductor--mensaje">
        {eligiendoRuta ? (
          <>
            <h1 className="conductor__titulo conductor__titulo--mediano">¿Qué ruta vas a manejar hoy?</h1>
            <ElegirRuta onElegida={rutaElegida} />
            <button type="button" className="conductor__chico" onClick={() => setEligiendoRuta(false)}>
              Volver
            </button>
          </>
        ) : (
          <>
            <span className="conductor__rotulo">Hoy manejás</span>
            <h1 className="conductor__titulo">{panel.rutaNombre}</h1>
            <button
              type="button"
              className="conductor__grande conductor__grande--principal conductor__empezar"
              onClick={empezar}
            >
              <span className="conductor__grande-texto">Empezar</span>
            </button>
            <button type="button" className="conductor__chico" onClick={() => setEligiendoRuta(true)}>
              Cambiar ruta
            </button>
          </>
        )}
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

  const barra = (
    <header className="conductor__barra">
      <button
        type="button"
        className="conductor__ruta"
        aria-label={`Cambiar ruta. Ahora: ${panel.rutaNombre}`}
        onClick={() => setHoja('ruta')}
      >
        {panel.rutaNombre}
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
        <Link to="/" className="conductor__chico">
          Ver el mapa
        </Link>
        <button type="button" className="conductor__chico" onClick={() => setHoja('paradas')}>
          Paradas
        </button>
        <button type="button" className="conductor__chico" onClick={() => setHoja('atraso')}>
          Reportar atraso
        </button>
        {salir}
      </span>
    </header>
  );

  return (
    <div className="conductor">
      {fase.tipo !== 'parada' && barra}

      {fase.tipo === 'camino' && (
        <main className="conductor__contenido conductor__contenido--camino">
          <section className="conductor__tarjeta" aria-labelledby="conductor-proxima">
            {proxima ? (
              <>
                <span className="conductor__rotulo">{aqui ? 'Estás aquí' : 'Próxima parada'}</span>
                <div className="conductor__fila-grande">
                  <h1 id="conductor-proxima" className="conductor__titulo">
                    {proxima.nombre}
                  </h1>
                  <span className="conductor__minutos">{textoLlegada(proxima, panel.estadoBus)}</span>
                </div>
                <p className="conductor__esperan">
                  <IconoPersonas />
                  <strong>{textoEsperan(proxima.reservasActivas)}</strong>
                  <span>según la app</span>
                </p>
                <div className="conductor__espacio" />
                <div className="conductor__pie">
                  <Cifra valor={aBordo} rotulo="a bordo" />
                  <Cifra valor={panel.subieronHoy ?? 0} rotulo="subieron hoy" />
                  {siguientes(paradas, proxima).map((p) => (
                    <span key={p.paradaId} className="conductor__siguiente">
                      <strong>{p.nombre}</strong>
                      <span>
                        {textoEsperan(p.reservasActivas)} · {textoLlegada(p, panel.estadoBus)}
                      </span>
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h1 id="conductor-proxima" className="conductor__titulo">
                  Recorrido completo
                </h1>
                <p className="conductor__apoyo">Ya cerraste todas las paradas de esta vuelta.</p>
                <div className="conductor__espacio" />
                <div className="conductor__pie">
                  <Cifra valor={aBordo} rotulo="a bordo" />
                  <Cifra valor={panel.subieronHoy ?? 0} rotulo="subieron hoy" />
                </div>
              </>
            )}
          </section>

          <MapaConductor panel={panel} ruta={ruta} posicion={posicion} />

          <button
            type="button"
            className="conductor__grande conductor__grande--principal"
            onClick={() => proxima && llegar(proxima)}
            disabled={!proxima}
          >
            <IconoUbicacion />
            <span className="conductor__grande-texto">Llegué</span>
            {proxima && <span className="conductor__grande-apoyo">a {proxima.nombre}</span>}
            <span className="conductor__grande-nota">El GPS también la detecta solo</span>
          </button>
        </main>
      )}

      {fase.tipo === 'parada' && (
        <EnLaParada
          fase={fase}
          enviando={marcando === fase.parada.paradaId}
          fallo={fallo}
          onMover={(m) => setFase((f) => (f.tipo === 'parada' ? { ...f, historial: [...f.historial, m] } : f))}
          onDeshacer={() => setFase((f) => (f.tipo === 'parada' ? { ...f, historial: f.historial.slice(0, -1) } : f))}
          onSalir={() => void salirDeLaParada()}
        />
      )}

      {fase.tipo === 'cerrada' && (
        <main className="conductor__contenido">
          <section className="conductor__tarjeta" aria-labelledby="conductor-cerrada">
            <div className="conductor__cerrada">
              <span className="conductor__check" aria-hidden="true">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                  strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
              </span>
              <h1 id="conductor-cerrada" className="conductor__titulo">
                {fase.parada.nombre}: cerrada
              </h1>
            </div>
            <div className="conductor__cifras">
              <Cifra valor={fase.subieron} rotulo="subieron" tono="sube" />
              <Cifra valor={fase.bajaron} rotulo="bajaron" tono="baja" />
              <Cifra valor={fase.parada.reservasActivas} rotulo="avisaron" tono="suave" />
              <Cifra valor={fase.aBordo} rotulo="a bordo" tono="borde" />
            </div>
            <p className="conductor__apoyo">{textoCierre(fase.parada.reservasActivas, fase.subieron)}</p>
          </section>

          <button
            type="button"
            className="conductor__grande conductor__grande--claro conductor__grande--seguir"
            onClick={() => setFase({ tipo: 'camino' })}
          >
            <span className="conductor__sigue">
              <span className="conductor__sigue-rotulo">Sigue</span>
              <strong>{proxima ? proxima.nombre : 'Fin del recorrido'}</strong>
              {proxima && (
                <span>
                  {textoEsperan(proxima.reservasActivas)} · {textoLlegada(proxima, panel.estadoBus)}
                </span>
              )}
            </span>
            <span className="conductor__seguir">
              <IconoFlecha tamano={64} />
              <span className="conductor__grande-texto">Seguir la ruta</span>
            </span>
          </button>
        </main>
      )}

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
                {p.atendidaEn ? (
                  <span className="conductor__item-estado">Cerrada</span>
                ) : (
                  <button type="button" className="conductor__chico" onClick={() => llegar(p)}>
                    Estoy aquí
                  </button>
                )}
              </li>
            ))}
          </ul>
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

function EnLaParada({
  fase,
  enviando,
  fallo,
  onMover,
  onDeshacer,
  onSalir,
}: {
  fase: Extract<Fase, { tipo: 'parada' }>;
  enviando: boolean;
  fallo: string | null;
  onMover: (m: Movimiento) => void;
  onDeshacer: () => void;
  onSalir: () => void;
}) {
  const subieron = fase.historial.filter((m) => m === 'sube').length;
  const bajaron = fase.historial.length - subieron;
  const aBordo = Math.max(0, fase.aBordoAlLlegar + subieron - bajaron);
  const avisaron = fase.parada.reservasActivas;

  return (
    <main className="conductor__contenido conductor__contenido--parada">
      <section className="conductor__lateral" aria-labelledby="conductor-parada">
        <div>
          <span className="conductor__rotulo">Estás en la parada</span>
          <h1 id="conductor-parada" className="conductor__titulo conductor__titulo--mediano">
            {fase.parada.nombre}
          </h1>
          <span className="conductor__apoyo">{textoAvisaron(avisaron)}</span>
        </div>
        <div className="conductor__cifras conductor__cifras--tres">
          <Cifra valor={subieron} rotulo="subieron" tono="sube" />
          <Cifra valor={bajaron} rotulo="bajaron" tono="baja" />
          <Cifra valor={aBordo} rotulo="a bordo" tono="borde" />
        </div>
        <p className="conductor__estado" role="status">
          {textoConteo(avisaron, subieron)}
        </p>
        {fallo && (
          <p className="conductor__fallo" role="alert">
            {fallo}
          </p>
        )}
        <div className="conductor__espacio" />
        <button
          type="button"
          className="conductor__secundario"
          onClick={onDeshacer}
          disabled={fase.historial.length === 0 || enviando}
        >
          <IconoDeshacer />
          Deshacer el último
        </button>
        <button type="button" className="conductor__salir" onClick={onSalir} disabled={enviando}>
          {enviando ? 'Guardando…' : 'Salir de la parada'}
          {!enviando && <IconoFlecha tamano={28} />}
        </button>
      </section>

      <button
        type="button"
        className="conductor__grande conductor__grande--sube"
        onClick={() => onMover('sube')}
        disabled={enviando}
      >
        <svg width="104" height="104" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20V5" /><path d="M5 11l7-7 7 7" /></svg>
        <span className="conductor__grande-texto">Subió</span>
        <span className="conductor__grande-apoyo">+1 pasajero</span>
      </button>

      <button
        type="button"
        className="conductor__grande conductor__grande--baja"
        onClick={() => onMover('baja')}
        disabled={enviando}
      >
        <svg width="104" height="104" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v15" /><path d="M19 13l-7 7-7-7" /></svg>
        <span className="conductor__grande-texto">Bajó</span>
        <span className="conductor__grande-apoyo">−1 pasajero</span>
      </button>
    </main>
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

function Cifra({
  valor,
  rotulo,
  tono,
}: {
  valor: number;
  rotulo: string;
  tono?: 'sube' | 'baja' | 'suave' | 'borde';
}) {
  return (
    <span className={tono ? `conductor__cifra conductor__cifra--${tono}` : 'conductor__cifra'}>
      <span className="conductor__cifra-valor tabular">{valor}</span>
      <span className="conductor__cifra-rotulo">{rotulo}</span>
    </span>
  );
}

/** Las dos paradas pendientes que siguen a la proxima, en el orden del recorrido. */
function siguientes(paradas: ParadaDelPanel[], proxima: ParadaDelPanel): ParadaDelPanel[] {
  return paradas.filter((p) => !p.atendidaEn && p.orden > proxima.orden).slice(0, 2);
}

function textoEsperan(n: number): string {
  if (n === 0) return 'Nadie espera';
  return n === 1 ? '1 espera' : `${n} esperan`;
}

function textoAvisaron(n: number): string {
  if (n === 0) return 'Nadie avisó por la app';
  return n === 1 ? '1 avisó por la app' : `${n} avisaron por la app`;
}

function textoConteo(avisaron: number, subieron: number): string {
  if (subieron < avisaron) {
    const faltan = avisaron - subieron;
    return faltan === 1 ? 'Falta 1 de los que avisaron' : `Faltan ${faltan} de los que avisaron`;
  }
  if (subieron === avisaron) {
    return avisaron === 0 ? 'Marcá a cada persona que suba o baje' : 'Subieron todos los que avisaron';
  }
  const extra = subieron - avisaron;
  return extra === 1 ? '1 subió sin avisar por la app' : `${extra} subieron sin avisar por la app`;
}

function textoCierre(avisaron: number, subieron: number): string {
  if (avisaron === 0) return 'Nadie había avisado por la app en esta parada.';
  const avisos = avisaron === 1 ? 'El aviso de esta parada queda' : `Los ${avisaron} avisos de esta parada quedan`;
  const sinAviso = subieron > avisaron ? ' Los que subieron sin aviso cuentan aparte.' : '';
  return `${avisos} como abordados.${sinAviso}`;
}

function IconoUbicacion() {
  return (
    <svg width="88" height="88" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}

function IconoFlecha({ tamano }: { tamano: number }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

function IconoDeshacer() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
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
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
      <path d="M16 3.1a4 4 0 0 1 0 7.8" />
    </svg>
  );
}
