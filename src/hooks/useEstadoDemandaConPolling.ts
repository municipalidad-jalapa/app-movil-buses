import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../core/apiClient';
import { ErrorApi } from '../core/errores';
import type { EstadoDemanda } from '../core/tipos';

export const RUTA_ESTADO_DEMANDA = '/api/v1/demanda/estado';

const INTERVALO_POLLING_MS_DEFECTO = 15 * 1000; // 15 segundos

export interface EstadoDelHookDemanda {
  /** Cantidad de registros activos en todas las paradas. */
  registrosActivos: number | null;
  /** Cantidad de registros necesaria para que salga el bus. */
  umbral: number | null;
  /** Registros que faltan para alcanzar el umbral. */
  faltantes: number | null;
  /** Desglose de registros activos por parada. */
  porParada: Record<string, number> | null;
  /** Respuesta completa, disponible para consumidores que necesiten el contrato original. */
  estadoDemanda: EstadoDemanda | null;
  cargando: boolean;
  error: ErrorApi | null;
  reintentar: () => void;
  /** True si el polling está pausado porque la pestaña no es visible. */
  pausadoPorVisibilidad: boolean;
}

/**
 * Hook que consulta el estado de demanda con polling automático cada 15s.
 *
 * Se pausa automáticamente cuando la pestaña pierde foco (visibilitychange)
 * para no desperdiciar datos en un teléfono con cobertura cara.
 *
 * El usuario está de pie, en la calle, bajo sol: si cierra la app un segundo,
 * el sondeo se pausa. Si vuelve a abrir en 5 minutos, el siguiente sondeo sale
 * apenas abre.
 */
export function useEstadoDemandaConPolling(
  intervaloMs: number = INTERVALO_POLLING_MS_DEFECTO,
): EstadoDelHookDemanda {
  const [estadoDemanda, setEstadoDemanda] = useState<EstadoDemanda | null>(null);
  const [error, setError] = useState<ErrorApi | null>(null);
  const [intento, setIntento] = useState(0);
  const [pausadoPorVisibilidad, setPausadoPorVisibilidad] = useState(false);

  // Referencias mutables para evitar recrear en cada render
  const controllerRef = useRef<AbortController | null>(null);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vigenteRef = useRef(true);

  /**
   * Consulta el endpoint de estado de demanda.
   */
  const consultarEstado = useCallback(async (skipVisibilityCheck = false) => {
    // Si no es vigente o está pausado (y no saltamos el chequeo), no consultar
    if (!vigenteRef.current || (!skipVisibilityCheck && document.hidden)) {
      return;
    }

    // Crear controller solo si no existe
    if (controllerRef.current === null) {
      controllerRef.current = new AbortController();
    }

    try {
      const datos = await apiClient.get<EstadoDemanda>(RUTA_ESTADO_DEMANDA, {
        signal: controllerRef.current.signal,
      });

      if (!vigenteRef.current) return;
      setEstadoDemanda(datos);
      setError(null);
    } catch (causa) {
      if (!vigenteRef.current) return;
      // Si es un AbortError (porque nos desmontamos), no actualizar estado
      if (causa instanceof DOMException && causa.name === 'AbortError') {
        return;
      }
      setError(causa instanceof ErrorApi ? causa : new ErrorApi(0, String(causa)));
    }
  }, []);

  /**
   * Efecto principal: consulta inicial y setup del polling.
   */
  useEffect(() => {
    vigenteRef.current = true;
    controllerRef.current = null;

    // Consulta inmediata
    void consultarEstado(true);

    // Programa polling cada 15 segundos
    const reprogramar = () => {
      if (timeoutIdRef.current !== null) {
        clearTimeout(timeoutIdRef.current);
      }

      timeoutIdRef.current = setTimeout(() => {
        // Tras desmontar ya no reprogramamos: evita fugas de temporizadores.
        if (!vigenteRef.current) return;
        void consultarEstado();
        reprogramar();
      }, intervaloMs);
    };

    reprogramar();

    return () => {
      vigenteRef.current = false;
      if (timeoutIdRef.current !== null) {
        clearTimeout(timeoutIdRef.current);
      }
      if (controllerRef.current !== null) {
        controllerRef.current.abort();
      }
    };
  }, [intento, intervaloMs, consultarEstado]);

  /**
   * Efecto secundario: detecta cambios de visibilidad de la pestaña.
   */
  useEffect(() => {
    const manejarCambioVisibilidad = () => {
      const ahora = document.hidden;
      setPausadoPorVisibilidad(ahora);

      // Si vuelve a ser visible, consultar inmediatamente
      if (!ahora && vigenteRef.current) {
        void consultarEstado(true);
      }
    };

    document.addEventListener('visibilitychange', manejarCambioVisibilidad);

    return () => {
      document.removeEventListener('visibilitychange', manejarCambioVisibilidad);
    };
  }, [consultarEstado]);

  return {
    registrosActivos: estadoDemanda?.totalEsperando ?? null,
    umbral: estadoDemanda?.umbralSalida ?? null,
    faltantes: estadoDemanda?.faltanParaSalir ?? null,
    porParada: estadoDemanda?.porParada ?? null,
    estadoDemanda,
    cargando: estadoDemanda === null && error === null,
    error,
    pausadoPorVisibilidad,
    reintentar: () => setIntento((numero) => numero + 1),
  };
}
