import { useEffect, useState } from 'react';
import { apiClient } from '../core/apiClient';
import { ErrorApi } from '../core/errores';
import { INTERVALO_ACTUALIZACION_DATOS_MS } from '../core/frecuenciaActualizacion';
import { armarFilasPanelConductor, esDatoFresco, type FilaPanelConductor } from '../core/panelConductor';
import type { ReservasActivasPorParada, RutaEta } from '../core/tipos';
import { useRutas } from './useRutas';

export interface EstadoPanelConductor {
  filas: FilaPanelConductor[];
  cargando: boolean;
  error: ErrorApi | null;
  /** Cuando llego el ultimo ETA + reservas validos. Null antes de la primer carga. */
  actualizadoEn: Date | null;
  reintentar: () => void;
}

/**
 * Datos del panel del conductor: ETA y reservas activas de cada parada de SU
 * recorrido (HU-75).
 *
 * La ruta nunca se elige a mano (criterio de aceptacion): ADR-009 dice que el
 * producto opera una sola ruta, asi que la ruta activa que ya expone
 * `useRutas` ES la ruta del conductor. Si el backend algun dia asigna varias
 * rutas por conductor, este hook es el unico lugar que hay que tocar.
 *
 * Si el conductor autenticado no es el de esa ruta, el backend responde 403 y
 * llega aca como `ErrorApi` comun: la pantalla lo muestra con `MensajeError`,
 * igual que cualquier otro error de la API.
 *
 * Sondea a `INTERVALO_ACTUALIZACION_DATOS_MS`, la misma cadencia que usa (o
 * usara) la pantalla del pasajero -- no hay stream para ETA/demanda todavia.
 */
export function usePanelConductor(): EstadoPanelConductor {
  const { rutaActiva, cargando: cargandoRuta, error: errorRuta, reintentar: reintentarRuta } = useRutas();
  const rutaId = rutaActiva?.id ?? null;

  const [eta, setEta] = useState<RutaEta | null>(null);
  const [reservas, setReservas] = useState<ReservasActivasPorParada | null>(null);
  const [error, setError] = useState<ErrorApi | null>(null);
  const [actualizadoEn, setActualizadoEn] = useState<Date | null>(null);
  const [cargaInicialLista, setCargaInicialLista] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (rutaId === null) return;

    let vigente = true;
    const control = new AbortController();

    async function cargar() {
      try {
        const [datosEta, datosReservas] = await Promise.all([
          apiClient.get<RutaEta>(`/api/v1/rutas/${rutaId}/eta`, { signal: control.signal }),
          apiClient.get<ReservasActivasPorParada>(`/api/v1/rutas/${rutaId}/reservas/activas`, {
            signal: control.signal,
          }),
        ]);
        if (!vigente) return;
        if (datosEta) setEta(datosEta);
        if (datosReservas) setReservas(datosReservas);
        setError(null);
        setActualizadoEn(new Date());
      } catch (causa) {
        if (!vigente) return;
        setError(causa instanceof ErrorApi ? causa : new ErrorApi(0, String(causa)));
      } finally {
        if (vigente) setCargaInicialLista(true);
      }
    }

    void cargar();
    const id = setInterval(() => void cargar(), INTERVALO_ACTUALIZACION_DATOS_MS);

    return () => {
      vigente = false;
      control.abort();
      clearInterval(id);
    };
    // intento fuerza un refetch manual (reintentar) sin esperar al proximo sondeo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rutaId, intento]);

  const filas = armarFilasPanelConductor(rutaActiva, eta, reservas, esDatoFresco(actualizadoEn));

  return {
    filas,
    cargando: cargandoRuta || (rutaId !== null && !cargaInicialLista),
    error: errorRuta ?? error,
    actualizadoEn,
    reintentar: () => {
      reintentarRuta();
      setIntento((n) => n + 1);
    },
  };
}
