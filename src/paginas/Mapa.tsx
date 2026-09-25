import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAvisosDelBus } from '../hooks/useAvisosDelBus';
import { useEnLinea } from '../hooks/useEnLinea';
import { useEtaRuta } from '../hooks/useEtaRuta';
import { usePosicionBus } from '../hooks/usePosicionBus';
import { usePrefiereOscuro } from '../hooks/usePrefiereOscuro';
import { useReserva } from '../hooks/useReserva';
import { useResumenRuta } from '../hooks/useResumenRuta';
import { useRutaElegida } from '../hooks/useRutaElegida';
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
import { TarjetaEta } from '../componentes/TarjetaEta';
import { metrosEntre, minutosRestantes, paradaMasCercana, textoDistancia } from '../core/distanciaAParada';
import { ErrorApi } from '../core/errores';
import { esRancio } from '../core/frescuraDato';
import { notificarSiNoSeVe, vibrar } from '../core/notificaciones/avisoLocal';
import { obtenerIdDispositivo } from '../core/identidadDispositivo';
import { cancelarReserva, registrarDemanda, renovarReserva } from '../core/registroDemanda';
import type { EstadoReserva, RegistroCreadoResponse, Reserva } from '../core/tipos';
import { estaVigente } from '../estado/ReservaProvider';
import { OpinarSobreElServicio } from '../componentes/opiniones/OpinarSobreElServicio';
import { IconoBus } from '../componentes/IconoBus';
import './Mapa.css';

const SIN_UBICACION =
  'Para avisar necesitamos comprobar que estás en la parada. Activá el permiso de ubicación e intentá de nuevo.';
const SIN_UBICACION_CERCANA = 'No pudimos saber dónde estás. Elegí la parada tocándola en el mapa.';
const AVISO_VENCIDO = 'Tu aviso venció. Si seguís esperando, avisá de nuevo.';
const YA_AVISASTE = 'Ya avisamos desde este teléfono que estás esperando. No hace falta avisar de nuevo.';

/**
 * Radios del aviso de proximidad, los mismos del backend
 * (`ecoruta.notificaciones.radio-*-metros`, HU-57): a 250 m el bus "ya viene",
 * a 40 m "llego". La app los evalua tambien por su cuenta con la posicion en
 * vivo, para no depender de que el push llegue: sin Firebase configurado, o con
 * el permiso negado, el pasajero igual se entera y puede responder si subio.
 */
const RADIO_APROXIMACION_M = 250;
const RADIO_LLEGADA_M = 40;

/**
 * HU-52 y QA 4.1: con este tiempo o menos, se avisa que la reserva esta por
 * vencer y la hoja pregunta si sigue esperando. Dos minutos dan margen para
 * sacar el telefono del bolsillo y responder.
 */
const PREGUNTAR_SI_SIGUE_MS = 120_000;

/** Cuanto dura la pista "Toca otra vez" del boton de ubicacion. */
const PISTA_UBICACION_MS = 6_000;

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
  const { rutas, rutaActiva, elegirRuta, cargando, error, reintentar } = useRutaElegida();
  // null mientras carga: no se pinta el bus de ninguna ruta hasta saber cual es.
  const { posicion, estadoConexion, recibidoEn, cargaInicialLista } = usePosicionBus(
    undefined,
    rutaActiva ? rutaActiva.id : null,
  );
  const { esperandoPorParada, refrescar } = useResumenRuta(rutaActiva?.id);
  // QA 5.1: minutos para que el bus llegue a la parada, por el trazado real.
  const eta = useEtaRuta(rutaActiva?.id, posicion?.timestamp ?? null);
  const { ubicacion, solicitarUbicacion } = useUbicacion();
  const { reserva, guardarReserva, limpiarReserva } = useReserva();
  const { preguntandoAbordaje: avisoDeAbordaje } = useAvisosDelBus();
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
  // QA 4.1: el boton redondo de ubicacion va en dos toques. El primero te
  // muestra donde estas; el segundo te lleva a la parada mas cercana.
  const [ubicacionCentrada, setUbicacionCentrada] = useState(false);
  // QA 4.1: la hoja se puede achicar a una linea para ver el mapa.
  const [hojaMinimizada, setHojaMinimizada] = useState(false);
  /** Evita un segundo DELETE si el toque se repite antes de que el botón se deshabilite. */
  const cancelando = useRef(false);
  // La parada del QR se aplica una sola vez: despues, el pasajero puede cambiar
  // de ruta sin que el QR lo vuelva a arrastrar.
  const paradaDelQr = useRef<number | null>(!reserva ? paradaId : null);

  const vigente = reserva !== null && reserva.estado !== 'EXPIRADA' && estaVigenteSinReloj(reserva);
  const ahora = useReloj(vigente ? 1000 : 15_000);
  const resuelta = reserva !== null && (reserva.estado === 'ABORDO' || reserva.estado === 'CANCELADA');
  const reservaVigente = reserva !== null && estaVigente(reserva, ahora);

  const pantalla = useRef<HTMLDivElement>(null);
  const hoja = useRef<HTMLDivElement>(null);
  const encima = useRef<HTMLDivElement>(null);
  useAltoDeHoja(pantalla, hoja);
  // El mapa pregunta cuanto tapan los avisos y la hoja justo al moverse.
  const obtenerMargenes = useCallback(
    () => ({ arriba: encima.current?.offsetHeight ?? 0, abajo: hoja.current?.offsetHeight ?? 220 }),
    [],
  );

  // El parametro del QR ya se leyo: se quita para que una recarga no vuelva a
  // elegir esa parada despues de que el pasajero eligio otra.
  useEffect(() => {
    if (parametros.has('parada')) setParametros({}, { replace: true });
  }, [parametros, setParametros]);

  const paradaMostradaId = reservaVigente || resuelta ? reserva!.paradaId : paradaId;
  const parada = rutaActiva?.paradas.find((p) => p.id === paradaMostradaId) ?? null;
  const fase: FaseHoja = reservaVigente ? 'confirmada' : faseLocal;

  // La ruta sigue a la parada: la de la reserva (vigente o recien respondida)
  // manda siempre; la del QR, solo al abrir. Asi un QR de la Metroplaza abre la
  // ruta de la Metroplaza aunque la ultima vez se miro otra.
  const paradaQueFijaLaRuta = reserva ? reserva.paradaId : paradaDelQr.current;
  useEffect(() => {
    if (paradaQueFijaLaRuta === null || rutas.length === 0) return;
    const suRuta = rutas.find((r) => r.paradas.some((p) => p.id === paradaQueFijaLaRuta));
    if (suRuta && suRuta.id !== rutaActiva?.id) elegirRuta(suRuta.id);
    if (!reserva) paradaDelQr.current = null;
  }, [paradaQueFijaLaRuta, rutas, rutaActiva, elegirRuta, reserva]);

  // Al cambiar de ruta a mano, lo elegido en la otra ya no aplica.
  const rutaAnterior = useRef<number | null>(null);
  useEffect(() => {
    const actual = rutaActiva?.id ?? null;
    const anterior = rutaAnterior.current;
    rutaAnterior.current = actual;
    if (anterior === null || actual === null || anterior === actual || reserva) return;
    if (!rutaActiva?.paradas.some((p) => p.id === paradaId)) {
      setParadaId(null);
      setFaseLocal('vacia');
      setAviso(null);
    }
    // Solo el cambio de ruta dispara esto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rutaActiva?.id]);

  // Un QR con una parada que no es de ninguna ruta: se vuelve a elegir.
  useEffect(() => {
    const existe = rutas.some((r) => r.paradas.some((p) => p.id === paradaId));
    if (rutas.length > 0 && paradaId !== null && !existe && faseLocal === 'elegida' && !reservaVigente) {
      setParadaId(null);
      setFaseLocal('vacia');
    }
  }, [rutas, paradaId, faseLocal, reservaVigente]);

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

  // QA 4.1: avisar cuando la reserva esta por vencer. Una vez por vencimiento
  // (renovar cambia expiraEn y rearma el aviso): vibra y, si la pagina no esta
  // a la vista, deja una notificacion del sistema.
  const vencimientoAvisado = useRef<string | null>(null);
  useEffect(() => {
    if (!preguntarSiSigue || !reserva || vencimientoAvisado.current === reserva.expiraEn) return;
    vencimientoAvisado.current = reserva.expiraEn;
    vibrar();
    void notificarSiNoSeVe({
      titulo: 'Tu aviso está por vencer',
      cuerpo: '¿Seguís esperando el bus? Abrí EcoRuta y tocá «Sigo esperando».',
      etiqueta: 'reserva-' + reserva.id + '-vence',
    });
  }, [preguntarSiSigue, reserva]);

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

  // La pista del segundo toque se retira sola.
  useEffect(() => {
    if (!ubicacionCentrada) return;
    const t = setTimeout(() => setUbicacionCentrada(false), PISTA_UBICACION_MS);
    return () => clearTimeout(t);
  }, [ubicacionCentrada]);

  /** El boton redondo: primero "donde estoy", despues "la parada mas cercana". */
  async function botonUbicacion() {
    if (ubicacionCentrada) {
      setUbicacionCentrada(false);
      if ((reservaVigente || resuelta) && reserva) {
        // Con reserva, la parada que importa es la tuya.
        control.current?.verParada(reserva.paradaId);
        return;
      }
      await usarCercana();
      return;
    }
    const donde = await solicitarUbicacion();
    if (!donde) {
      setAviso(SIN_UBICACION_CERCANA);
      return;
    }
    control.current?.verPunto(donde.latitud, donde.longitud);
    setUbicacionCentrada(true);
  }

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
    if (!reserva || cancelando.current) return;
    cancelando.current = true;
    setEnviando(true);
    setAviso(null);
    try {
      await cancelarReserva(reserva.id, obtenerIdDispositivo());
    } catch (causa) {
      // 404: la copia local ya no existe en el servidor → se limpia sin fingir éxito.
      if (causa instanceof ErrorApi && causa.status === 404) {
        limpiarReserva();
        setEnviando(false);
        cancelando.current = false;
        elegirOtra();
        refrescar();
        return;
      }
      // 403, 422 (p. ej. ABORDO), red o 5xx: se conserva la reserva y se puede reintentar.
      setAviso(mensajeDe(causa));
      setEnviando(false);
      cancelando.current = false;
      return;
    }
    limpiarReserva();
    setEnviando(false);
    cancelando.current = false;
    elegirOtra();
    refrescar();
  }

  function cerrarAbordaje() {
    limpiarReserva();
    elegirOtra();
    refrescar();
  }

  // HU-57/HU-58 sin depender del push: distancia del bus a tu parada. Con un
  // dato rancio no se avisa nada: el bus puede estar en otro lado.
  const metrosDelBus =
    reservaVigente && parada && posicion && !esRancio(posicion, ahora) ? metrosEntre(parada, posicion) : null;
  const busCerca = metrosDelBus !== null && metrosDelBus <= RADIO_APROXIMACION_M;
  // Una vez que el bus llego se pregunta hasta que el pasajero responda, aunque
  // el bus ya se haya ido: justo entonces es cuando hay que saber si subio.
  const [llegoParaReserva, setLlegoParaReserva] = useState<number | null>(null);
  useEffect(() => {
    if (reserva && metrosDelBus !== null && metrosDelBus <= RADIO_LLEGADA_M) setLlegoParaReserva(reserva.id);
  }, [reserva, metrosDelBus]);
  const preguntandoAbordaje = avisoDeAbordaje || (reserva !== null && llegoParaReserva === reserva.id);

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

  // Lo que pide respuesta abre la hoja aunque se haya achicado.
  const hojaAbiertaAFuerza =
    preguntarSiSigue || contenidoAbordaje !== null || aviso !== null || fase === 'buscando';
  const hojaChica = hojaMinimizada && !hojaAbiertaAFuerza;

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
        obtenerMargenes={obtenerMargenes}
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

      <div className="pantalla-mapa__encima" ref={encima}>
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

        {/* HU-57: el mismo aviso de aproximacion, dentro de la app. */}
        {enLinea && busCerca && !preguntandoAbordaje && (
          <div className="pantalla-mapa__viene" role="status" aria-live="polite">
            <IconoBus tamano={22} grosor={2.2} />
            <span>El bus ya viene para tu parada</span>
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
          {/* SCRUM-26: opinar sobre la ruta que se esta mirando. */}
          <OpinarSobreElServicio redondo />
          <button
            type="button"
            className="pantalla-mapa__redondo"
            title="Ver el bus"
            aria-label="Ver el bus"
            onClick={() => control.current?.verBus()}
            disabled={!posicion}
          >
            <IconoBus tamano={26} grosor={2.2} />
          </button>
          <div className="pantalla-mapa__con-pista">
            {ubicacionCentrada && (
              <span className="pantalla-mapa__pista-boton" role="status">
                {reservaVigente || resuelta ? 'Tocá otra vez: tu parada' : 'Tocá otra vez: parada más cercana'}
              </span>
            )}
            <button
              type="button"
              className={
                ubicacionCentrada ? 'pantalla-mapa__redondo pantalla-mapa__redondo--segundo' : 'pantalla-mapa__redondo'
              }
              title={ubicacionCentrada ? 'Ir a la parada más cercana' : 'Ver mi ubicación'}
              aria-label={ubicacionCentrada ? 'Ir a la parada más cercana' : 'Ver mi ubicación'}
              onClick={() => void botonUbicacion()}
              disabled={enviando || fase === 'buscando'}
            >
              {ubicacionCentrada ? (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 21s7-6.3 7-11a7 7 0 10-14 0c0 4.7 7 11 7 11z" />
                  <circle cx="12" cy="10" r="2.4" />
                </svg>
              ) : (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="3.4" />
                  <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="pantalla-mapa__hoja" ref={hoja}>
          <HojaReserva
            fase={fase}
            nombreParada={parada?.nombre ?? ''}
            distancia={parada && ubicacion ? textoDistancia(parada, ubicacion) : null}
            esperando={paradaMostradaId !== null ? (esperandoPorParada.get(paradaMostradaId) ?? 0) : 0}
            minutosDeAviso={minutos}
            ultimoDato={ultimoDato}
            eta={parada ? <TarjetaEta eta={eta} paradaId={parada.id} /> : null}
            aviso={aviso}
            enviando={enviando}
            preguntarSiSigue={preguntarSiSigue}
            segundosRestantes={msRestantes !== null ? msRestantes / 1000 : null}
            minimizada={hojaChica}
            onAlternarTamano={() => setHojaMinimizada(!hojaChica)}
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
