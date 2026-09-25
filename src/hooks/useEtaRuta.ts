import { useEffect, useRef, useState } from 'react';
import { apiClient } from '../core/apiClient';
import type { EtaRuta } from '../core/tipos';

/** Cada cuanto se vuelve a pedir el ETA aunque no llegue posicion nueva. */
export const REFRESCO_ETA_MS = 20_000;

/** Con posiciones seguidas, no se pide mas de una vez en este lapso. */
const ESPERA_MINIMA_MS = 8_000;

/**
 * El ETA de la ruta, de `GET /api/v1/rutas/{id}/eta` (QA 5.1, HU-74).
 *
 * <p>Se pide al abrir, cada {@link REFRESCO_ETA_MS} y cuando llega una
 * posicion nueva del bus (`marcaDePosicion`), sin pasar de una consulta cada
 * pocos segundos. Si una consulta falla se conserva la anterior.
 */
export function useEtaRuta(rutaId: number | null | undefined, marcaDePosicion?: string | null) {
  const [eta, setEta] = useState<EtaRuta | null>(null);
  const ultimaConsulta = useRef(0);
  const control = useRef<AbortController | null>(null);

  const consultar = useRef<(forzar?: boolean) => void>(() => {});
  consultar.current = (forzar = false) => {
    if (rutaId == null) return;
    const ahora = Date.now();
    if (!forzar && ahora - ultimaConsulta.current < ESPERA_MINIMA_MS) return;
    ultimaConsulta.current = ahora;
    const senal = control.current?.signal;
    apiClient
      .get<EtaRuta>(`/api/v1/rutas/${rutaId}/eta`, { signal: senal, intentos: 1 })
      .then((datos) => {
        if (datos && !senal?.aborted && datos.rutaId === rutaId) setEta(datos);
      })
      .catch(() => {});
  };

  useEffect(() => {
    setEta(null);
    if (rutaId == null) return;
    control.current = new AbortController();
    consultar.current(true);
    const temporizador = setInterval(() => consultar.current(true), REFRESCO_ETA_MS);
    return () => {
      clearInterval(temporizador);
      control.current?.abort();
    };
  }, [rutaId]);

  useEffect(() => {
    if (marcaDePosicion) consultar.current();
  }, [marcaDePosicion]);

  return eta;
}
