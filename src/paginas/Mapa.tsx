import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAvisosDelBus } from '../hooks/useAvisosDelBus';
import { useEnLinea } from '../hooks/useEnLinea';
import { usePosicionBus } from '../hooks/usePosicionBus';
import { usePrefiereOscuro } from '../hooks/usePrefiereOscuro';
import { useReserva } from '../hooks/useReserva';
import { useResumenRuta } from '../hooks/useResumenRuta';
import { useRutas } from '../hooks/useRutas';
import { useUbicacion } from '../hooks/useUbicacion';
import { MapaJalapa } from '../componentes/MapaJalapa';
import type { ControlMapa } from '../componentes/MapaOpenStreetMap';
import { AvisoSinConexion } from '../componentes/AvisoSinConexion';
import { BannerConexion } from '../componentes/BannerConexion';
import { EstadoSinPosicion } from '../componentes/EstadoSinPosicion';
import { HojaReserva, type FaseHoja } from '../componentes/HojaReserva';
import { HoraUltimoDato, formatearMomento } from '../componentes/HoraUltimoDato';
import { MensajeError } from '../componentes/MensajeError';
import { PreferenciaNotificaciones } from '../componentes/PreferenciaNotificaciones';
import { TarjetaAbordaje } from '../componentes/TarjetaAbordaje';
import { minutosRestantes, paradaMasCercana, textoDistancia } from '../core/distanciaAParada';
import { ErrorApi } from '../core/errores';
import { esRancio } from '../core/frescuraDato';
import { obtenerIdDispositivo } from '../core/identidadDispositivo';
import { cancelarReserva, registrarDemanda, renovarReserva } from '../core/registroDemanda';
import type { EstadoReserva, RegistroCreadoResponse, Reserva } from '../core/tipos';
import { estaVigente } from '../estado/ReservaProvider';
import './Mapa.css';

const SIN_UBICACION =
  'Para avisar necesitamos comprobar que estás en la parada. Activá el permiso de ubicación e intentá de nuevo.';
const SIN_UBICACION_CERCANA = 'No pudimos saber dónde estás. Elegí la parada tocándola en el mapa.';
const AVISO_VENCIDO = 'Tu aviso venció. Si seguís esperando, avisá de nuevo.';
const YA_AVISASTE = 'Ya avisamos desde este teléfono que estás esperando. No hace falta avisar de nuevo.';

/** HU-52: con este tiempo o menos, la hoja pregunta si sigue esperando. */
const PREGUNTAR_SI_SIGUE_MS = 60_000;

/** Fases que la pantalla lleva por su cuenta; "confirmada" sale de la reserva. */
type FaseLocal = Exclude<FaseHoja, 'confirmada'>;

/**
 * Pantalla del pasajero: el mapa con la ruta, el bus y la reserva de parada.
 *
 * <p>Calco de `design/MapaOSM.dc.html` y de los artboards R1–R3: el mapa manda,
 * las paradas llevan su contador y la reserva vive en la hoja inferior. Se
 * llega a la reserva tocando una parada o con "Usar la parada más cercana";
 * el QR de una parada (`/registro/:id`) abre esta misma pantalla con esa
 * parada elegida.
 *
 * <p>HU-50 y HU-51 (mapa y bus), HU-53 (avisar que espero), HU-124 (ya no voy
 * a esperar), HU-52 (vigencia y renovacion), HU-58 (avisos y abordaje),
 * HU-60 (dato rancio), HU-61 (respaldo al reconectar) y el estado sin conexion
 * del artboard 09.
 */
export function Mapa() {
  const { rutaActiva, cargando, error, reintentar } = useRutas();
  const { posicion, estadoConexion, recibidoEn, cargaInicialLista } = usePosicionBus();
  const { esperandoPorParada, refrescar } = useResumenRuta(rutaActiva?.id);
  const { ubicacion, solicitarUbicacion } = useUbicacion();
  const { reserva, guardarReserva, limpiarReserva } = useReserva();
  const { preguntandoAbordaje } = useAvisosDelBus();
  const enLinea = useEnLinea();
  const oscuro = usePrefiereOscuro();
  const control = useRef<ControlMapa | null>(null);

  const [parametros, setParametros] = useSearchParams();
  // Todo arranca en el primer render, no en un efecto: el mapa necesita saber
  // desde el principio sobre que parada abrir.
  const [paradaId, setParadaId] = useState<number | null>(() => {
    if (reserva) return reserva.paradaId;
    const delQr = Number(parametros.get('parada'));
    return Number.isInteger(delQr) && delQr > 0 ? delQr : null;
  });
  const [faseLocal, setFaseLocal] = useState<FaseLocal>(() =>
    !reserva && paradaId !== null ? 'elegida' : 'vacia',
  );
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const vigente = reserva !== null && reserva.estado !== 'EXPIRADA' && estaVigenteSinReloj(reserva);
  const ahora = useReloj(vigente ? 1000 : 15_000);
  const resuelta = reserva !== null && (reserva.estado === 'ABORDO' || reserva.estado === 'CANCELADA');
  const reservaVigente = reserva !== null && estaVigente(reserva, ahora);

  const pantalla = useRef<HTMLDivElement>(null);
  const hoja = useRef<HTMLDivElement>(null);
  useAltoDeHoja(pantalla, hoja);

  // El parametro del QR ya se leyo: se quita para que una recarga no vuelva a
  // elegir esa parada despues de que el pasajero eligio otra.
  useEffect(() => {
    if (parametros.has('parada')) setParametros({}, { replace: true });
  }, [parametros, setParametros]);

  const paradaMostradaId = reservaVigente || resuelta ? reserva!.paradaId : paradaId;
  const parada = rutaActiva?.paradas.find((p) => p.id === paradaMostradaId) ?? null;
  const fase: FaseHoja = reservaVigente ? 'confirmada' : faseLocal;

  // Un QR con una parada que no es de la ruta: se vuelve a elegir.
  useEffect(() => {
    if (rutaActiva && paradaId !== null && !parada && faseLocal === 'elegida' && !reservaVigente) {
      setParadaId(null);
      setFaseLocal('vacia');
    }
  }, [rutaActiva, paradaId, parada, faseLocal, reservaVigente]);

  // HU-52: la reserva vence sola. Se vuelve a R2 con la misma parada, para que
  // avisar de nuevo sea un solo toque.
  const vencer = useCallback(
    (anterior: Reserva) => {
      limpiarReserva();
      setParadaId(anterior.paradaId);
      setFaseLocal('elegida');
      setAviso(AVISO_VENCIDO);
      refrescar();
    },
    [limpiarReserva, refrescar],
  );

  useEffect(() => {
    if (!reserva || resuelta) return;
    if (reserva.estado === 'EXPIRADA' || !estaVigente(reserva, ahora)) vencer(reserva);
  }, [reserva, resuelta, ahora, vencer]);

  const msRestantes = reservaVigente ? Date.parse(reserva!.expiraEn) - ahora : null;
  const minutos = reservaVigente ? minutosRestantes(reserva!.expiraEn, ahora) : null;
  const preguntarSiSigue = msRestantes !== null && msRestantes <= PREGUNTAR_SI_SIGUE_MS;

  const elegir = useCallback(
    (id: number) => {
      // Con la reserva hecha, la parada no cambia por un toque en el mapa.
      if (reservaVigente || resuelta || enviando) return;
      setParadaId(id);
      setFaseLocal('elegida');
      setAviso(null);
      control.current?.verParada(id);
    },
    [reservaVigente, resuelta, enviando],
  );

  async function usarCercana() {
    if (reservaVigente || resuelta) {
      // Ya hay reserva: el boton solo pone el punto "yo" en el mapa.
      void solicitarUbicacion();
      return;
    }
    setFaseLocal('buscando');
    setAviso(null);
    const donde = await solicitarUbicacion();
    const cercana = donde && rutaActiva ? paradaMasCercana(rutaActiva.paradas, donde) : null;
    if (!cercana) {
      setFaseLocal(paradaId ? 'elegida' : 'vacia');
      setAviso(SIN_UBICACION_CERCANA);
      return;
    }
    setParadaId(cercana.id);
    setFaseLocal('elegida');
    control.current?.verParada(cercana.id);
  }

  async function confirmar() {
    if (paradaId === null) return;
    setEnviando(true);
    setAviso(null);
    const donde = ubicacion ?? (await solicitarUbicacion());
    if (!donde) {
      setEnviando(false);
      setAviso(SIN_UBICACION);
      return;
    }
    try {
      const creada = await registrarDemanda({
        dispositivoId: obtenerIdDispositivo(),
        paradaId,
        latitud: donde.latitud,
        longitud: donde.longitud,
      });
      guardarReserva(comoReserva(creada));
      refrescar();
    } catch (causa) {
      setAviso(mensajeDe(causa));
    } finally {
      setEnviando(false);
    }
  }

  async function renovar() {
    if (!reserva) return;
    setEnviando(true);
    setAviso(null);
    try {
      const renovada = await renovarReserva(reserva.id, obtenerIdDispositivo());
      guardarReserva(comoReserva(renovada));
    } catch (causa) {
      // 422: vencio mientras el pasajero decidia.
      if (causa instanceof ErrorApi && causa.status === 422) vencer(reserva);
      else setAviso(mensajeDe(causa));
    } finally {
      setEnviando(false);
    }
  }

  function elegirOtra() {
    setParadaId(null);
    setFaseLocal('vacia');
    setAviso(null);
    control.current?.verRuta();
  }

  async function cancelar() {
    if (!reserva) return;
    setEnviando(true);
    setAviso(null);
    try {
      await cancelarReserva(reserva.id, obtenerIdDispositivo());
    } catch (causa) {
      // 404 o 422: en el servidor ya no esta vigente, que es lo que se pedia.
      const yaNoVigente = causa instanceof ErrorApi && (causa.status === 404 || causa.status === 422);
      if (!yaNoVigente) {
        setAviso(mensajeDe(causa));
        setEnviando(false);
        return;
      }
    }
    limpiarReserva();
    setEnviando(false);
    elegirOtra();
    refrescar();
  }

  function cerrarAbordaje() {
    limpiarReserva();
    elegirOtra();
    refrescar();
  }

  // Sin red, o con el flujo en vivo cortado, se cae al croquis: es una
  // pantalla de primera clase, no un error (DESIGN.md seccion 7).
  const capa = cargando ? 'cargando' : !enLinea || estadoConexion === 'reconectando' ? 'croquis' : 'mapa';
  const rancio = esRancio(posicion, ahora);
  // La hora que se muestra es la del DATO (captura a bordo), no la de llegada al
  // telefono: un dato viejo recien llegado sigue siendo viejo (HU-60).
  const horaDelDato = posicion ? fechaValida(posicion.timestamp) ?? recibidoEn : null;
  const ultimoDato = horaDelDato ? <HoraUltimoDato recibidoEn={horaDelDato} /> : null;

  const contenidoAbordaje =
    resuelta || (reservaVigente && preguntandoAbordaje) ? (
      <TarjetaAbordaje preguntando={preguntandoAbordaje} onListo={cerrarAbordaje} />
    ) : null;

  return (
    <div
      className={enLinea ? 'pantalla-mapa' : 'pantalla-mapa pantalla-mapa--sin-conexion'}
      ref={pantalla}
    >
      <MapaJalapa
        ruta={rutaActiva}
        posicionBus={posicion}
        busRancio={rancio}
        capa={capa}
        modo={oscuro ? 'oscuro' : 'claro'}
        paradaTuyaId={paradaMostradaId}
        esperandoPorParada={esperandoPorParada}
        ubicacionPasajero={ubicacion}
        onElegirParada={elegir}
        control={control}
      />

      {!enLinea && (
        <AvisoSinConexion
          recibidoEn={horaDelDato}
          onReintentar={() => {
            reintentar();
            refrescar();
          }}
        />
      )}

      <div className="pantalla-mapa__encima">
        {/* "En vivo" es lo normal y el diseno no lo anuncia; solo se avisa la degradacion. */}
        {enLinea && estadoConexion !== 'en-vivo' && <BannerConexion estadoConexion={estadoConexion} />}

        {enLinea && error && (
          <div className="pantalla-mapa__aviso">
            <MensajeError error={error} onReintentar={reintentar} />
          </div>
        )}

        {cargaInicialLista && posicion === null && !error && (
          <div className="pantalla-mapa__aviso">
            <EstadoSinPosicion />
          </div>
        )}

        {/* HU-60: con el dato viejo, la hora pasa al frente (DESIGN.md §7). */}
        {enLinea && rancio && horaDelDato && (
          <div className="pantalla-mapa__rancio" role="status">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            {/* La hora cierra la frase: "p. m." ya trae su punto. */}
            <span>
              Sin datos nuevos: puede que el bus no esté donde lo ves. Último dato{' '}
              <time dateTime={horaDelDato.toISOString()} className="tabular">
                {formatearMomento(horaDelDato, new Date(ahora))}
              </time>
            </span>
          </div>
        )}

        {enLinea && fase === 'vacia' && !contenidoAbordaje && (
          <div className="pantalla-mapa__pista">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M12 21s7-6.3 7-11a7 7 0 10-14 0c0 4.7 7 11 7 11z" />
              <circle cx="12" cy="10" r="2.4" />
            </svg>
            <span>Tocá en el mapa la parada donde vas a esperar</span>
          </div>
        )}
      </div>

      <div className="pantalla-mapa__abajo">
        <div className="pantalla-mapa__flotantes">
          <button
            type="button"
            className="pantalla-mapa__redondo"
            title="Ver el bus"
            aria-label="Ver el bus"
            onClick={() => control.current?.verBus()}
            disabled={!posicion}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <rect x="3" y="5" width="18" height="11" rx="2" />
              <path d="M3 11h18M7 20v-2M17 20v-2" />
            </svg>
          </button>
          <button
            type="button"
            className="pantalla-mapa__redondo"
            title="Usar mi ubicación"
            aria-label="Usar mi ubicación"
            onClick={() => void usarCercana()}
            disabled={enviando || fase === 'buscando'}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3.4" />
              <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
            </svg>
          </button>
        </div>

        <div ref={hoja}>
          <HojaReserva
            fase={fase}
            nombreParada={parada?.nombre ?? ''}
            distancia={parada && ubicacion ? textoDistancia(parada, ubicacion) : null}
            esperando={paradaMostradaId !== null ? (esperandoPorParada.get(paradaMostradaId) ?? 0) : 0}
            minutosDeAviso={minutos}
            ultimoDato={ultimoDato}
            aviso={aviso}
            enviando={enviando}
            preguntarSiSigue={preguntarSiSigue}
            extraConfirmada={<PreferenciaNotificaciones />}
            contenido={contenidoAbordaje}
            onUsarCercana={() => void usarCercana()}
            onConfirmar={() => void confirmar()}
            onElegirOtra={elegirOtra}
            onCancelar={() => void cancelar()}
            onRenovar={() => void renovar()}
          />
        </div>
      </div>
    </div>
  );
}

function fechaValida(texto: string): Date | null {
  const fecha = new Date(texto);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function comoReserva(r: RegistroCreadoResponse): Reserva {
  return { id: r.id, paradaId: r.paradaId, estado: r.estado as EstadoReserva, expiraEn: r.expiraEn };
}

/** Para elegir el ritmo del reloj antes de tener el reloj. */
function estaVigenteSinReloj(reserva: Reserva): boolean {
  return reserva.estado === 'ACTIVA' || reserva.estado === 'RENOVADA';
}

function mensajeDe(causa: unknown): string {
  // SCRUM-256: la reserva duplicada no es un error para el pasajero.
  if (causa instanceof ErrorApi && causa.status === 422 && /ya tiene una reserva activa/i.test(causa.message)) {
    return YA_AVISASTE;
  }
  return causa instanceof ErrorApi ? causa.mensajeParaUsuario() : 'Algo salió mal. Intentá de nuevo.';
}

/** Publica la altura de la hoja como `--alto-hoja`, para la atribucion. */
function useAltoDeHoja(
  pantalla: RefObject<HTMLDivElement | null>,
  hoja: RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    const nodo = hoja.current;
    if (!nodo || typeof ResizeObserver === 'undefined') return;
    const observador = new ResizeObserver(() => {
      pantalla.current?.style.setProperty('--alto-hoja', `${nodo.offsetHeight}px`);
    });
    observador.observe(nodo);
    return () => observador.disconnect();
  }, [pantalla, hoja]);
}

/** La hora actual, refrescada cada `cadaMs`. */
function useReloj(cadaMs: number): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    setAhora(Date.now());
    const temporizador = setInterval(() => setAhora(Date.now()), cadaMs);
    return () => clearInterval(temporizador);
  }, [cadaMs]);
  return ahora;
}
