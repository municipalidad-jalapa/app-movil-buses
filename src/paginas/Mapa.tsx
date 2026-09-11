import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePosicionBus } from '../hooks/usePosicionBus';
import { usePrefiereOscuro } from '../hooks/usePrefiereOscuro';
import { useResumenRuta } from '../hooks/useResumenRuta';
import { useRutas } from '../hooks/useRutas';
import { useUbicacion } from '../hooks/useUbicacion';
import { MapaJalapa } from '../componentes/MapaJalapa';
import type { ControlMapa } from '../componentes/MapaOpenStreetMap';
import { BannerConexion } from '../componentes/BannerConexion';
import { EstadoSinPosicion } from '../componentes/EstadoSinPosicion';
import { HojaReserva, type FaseHoja } from '../componentes/HojaReserva';
import { HoraUltimoDato } from '../componentes/HoraUltimoDato';
import { MensajeError } from '../componentes/MensajeError';
import { minutosRestantes, paradaMasCercana, textoDistancia } from '../core/distanciaAParada';
import { ErrorApi } from '../core/errores';
import { obtenerIdDispositivo } from '../core/identidadDispositivo';
import {
  cancelarReserva,
  guardarReserva,
  leerReservaGuardada,
  registrarDemanda,
} from '../core/registroDemanda';
import type { RegistroCreadoResponse } from '../core/tipos';
import './Mapa.css';

const SIN_UBICACION =
  'Para avisar necesitamos comprobar que estás en la parada. Activá el permiso de ubicación e intentá de nuevo.';
const SIN_UBICACION_CERCANA =
  'No pudimos saber dónde estás. Elegí la parada tocándola en el mapa.';
const AVISO_VENCIDO = 'Tu aviso venció. Si seguís esperando, avisá de nuevo.';
const YA_AVISASTE = 'Ya avisamos desde este teléfono que estás esperando. No hace falta avisar de nuevo.';

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
 * a esperar), HU-52 (minutos de aviso que quedan).
 */
export function Mapa() {
  const { rutaActiva, cargando, error, reintentar } = useRutas();
  const { posicion, estadoConexion, recibidoEn, cargaInicialLista } = usePosicionBus();
  const { esperandoPorParada, refrescar } = useResumenRuta(rutaActiva?.id);
  const { ubicacion, solicitarUbicacion } = useUbicacion();
  const oscuro = usePrefiereOscuro();
  const control = useRef<ControlMapa | null>(null);

  const [parametros, setParametros] = useSearchParams();
  // Todo arranca en el primer render, no en un efecto: el mapa necesita saber
  // desde el principio sobre que parada abrir.
  const [reserva, setReserva] = useState<RegistroCreadoResponse | null>(() => leerReservaGuardada());
  const [paradaId, setParadaId] = useState<number | null>(() => {
    if (reserva) return reserva.paradaId;
    const delQr = Number(parametros.get('parada'));
    return Number.isInteger(delQr) && delQr > 0 ? delQr : null;
  });
  const [fase, setFase] = useState<FaseHoja>(() => (reserva ? 'confirmada' : paradaId ? 'elegida' : 'vacia'));
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const ahora = useReloj(reserva !== null);
  const pantalla = useRef<HTMLDivElement>(null);
  const hoja = useRef<HTMLDivElement>(null);
  useAltoDeHoja(pantalla, hoja);

  // El parametro del QR ya se leyo: se quita para que una recarga no vuelva a
  // elegir esa parada despues de que el pasajero eligio otra.
  useEffect(() => {
    if (parametros.has('parada')) setParametros({}, { replace: true });
  }, [parametros, setParametros]);

  const parada = rutaActiva?.paradas.find((p) => p.id === paradaId) ?? null;

  // Un QR con una parada que no es de la ruta: se vuelve a elegir.
  useEffect(() => {
    if (rutaActiva && paradaId !== null && !parada && fase === 'elegida') {
      setParadaId(null);
      setFase('vacia');
    }
  }, [rutaActiva, paradaId, parada, fase]);

  const soltarReserva = useCallback(() => {
    guardarReserva(null);
    setReserva(null);
  }, []);

  // HU-52: la reserva vence sola. Se vuelve a R2 con la misma parada, para que
  // avisar de nuevo sea un solo toque.
  const minutos = reserva ? minutosRestantes(reserva.expiraEn, ahora) : null;
  useEffect(() => {
    if (reserva && minutos === 0) {
      soltarReserva();
      setFase('elegida');
      setAviso(AVISO_VENCIDO);
      refrescar();
    }
  }, [reserva, minutos, soltarReserva, refrescar]);

  const elegir = useCallback(
    (id: number) => {
      // Con la reserva hecha, la parada no cambia por un toque en el mapa.
      if (fase === 'confirmada' || enviando) return;
      setParadaId(id);
      setFase('elegida');
      setAviso(null);
      control.current?.verParada(id);
    },
    [fase, enviando],
  );

  async function usarCercana() {
    if (fase === 'confirmada') {
      // Ya hay reserva: el boton solo pone el punto "yo" en el mapa.
      void solicitarUbicacion();
      return;
    }
    setFase('buscando');
    setAviso(null);
    const donde = await solicitarUbicacion();
    const cercana = donde && rutaActiva ? paradaMasCercana(rutaActiva.paradas, donde) : null;
    if (!cercana) {
      setFase(paradaId ? 'elegida' : 'vacia');
      setAviso(SIN_UBICACION_CERCANA);
      return;
    }
    setParadaId(cercana.id);
    setFase('elegida');
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
      guardarReserva(creada);
      setReserva(creada);
      setFase('confirmada');
      refrescar();
    } catch (causa) {
      setAviso(mensajeDe(causa));
    } finally {
      setEnviando(false);
    }
  }

  function elegirOtra() {
    setParadaId(null);
    setFase('vacia');
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
    soltarReserva();
    setEnviando(false);
    elegirOtra();
    refrescar();
  }

  // Sin red no se cae a una pantalla de error: se cae al croquis, que es una
  // pantalla de primera clase (DESIGN.md seccion 7).
  const capa = cargando ? 'cargando' : estadoConexion === 'reconectando' ? 'croquis' : 'mapa';

  return (
    <div className="pantalla-mapa" ref={pantalla}>
      <MapaJalapa
        ruta={rutaActiva}
        posicionBus={posicion}
        capa={capa}
        modo={oscuro ? 'oscuro' : 'claro'}
        paradaTuyaId={paradaId}
        esperandoPorParada={esperandoPorParada}
        ubicacionPasajero={ubicacion}
        onElegirParada={elegir}
        control={control}
      />

      <div className="pantalla-mapa__encima">
        {/* "En vivo" es lo normal y el diseno no lo anuncia; solo se avisa la degradacion. */}
        {estadoConexion !== 'en-vivo' && <BannerConexion estadoConexion={estadoConexion} />}

        {error && (
          <div className="pantalla-mapa__aviso">
            <MensajeError error={error} onReintentar={reintentar} />
          </div>
        )}

        {cargaInicialLista && posicion === null && !error && (
          <div className="pantalla-mapa__aviso">
            <EstadoSinPosicion />
          </div>
        )}

        {fase === 'vacia' && (
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
          esperando={paradaId !== null ? (esperandoPorParada.get(paradaId) ?? 0) : 0}
          minutosDeAviso={minutos}
          ultimoDato={posicion && recibidoEn ? <HoraUltimoDato recibidoEn={recibidoEn} /> : null}
          aviso={aviso}
          enviando={enviando}
          onUsarCercana={() => void usarCercana()}
          onConfirmar={() => void confirmar()}
          onElegirOtra={elegirOtra}
          onCancelar={() => void cancelar()}
        />
        </div>
      </div>
    </div>
  );
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

/** La hora actual, refrescada cada segundo mientras `activo`. */
function useReloj(activo: boolean): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (!activo) return;
    setAhora(Date.now());
    const temporizador = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(temporizador);
  }, [activo]);
  return ahora;
}
