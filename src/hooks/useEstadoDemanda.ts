import { useEffect, useState } from 'react';
import { apiClient } from '../core/apiClient';
import { ErrorApi } from '../core/errores';
import type { EstadoDemanda } from '../core/tipos';

export const RUTA_ESTADO_DEMANDA = '/api/v1/demanda/estado';

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
}

/** Consulta el estado actual de la demanda del servicio (HU de contador de demanda). */
export function useEstadoDemanda(): EstadoDelHookDemanda {
  const [estadoDemanda, setEstadoDemanda] = useState<EstadoDemanda | null>(null);
  const [error, setError] = useState<ErrorApi | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const control = new AbortController();
    let vigente = true;
    setError(null);

    apiClient
      .get<EstadoDemanda>(RUTA_ESTADO_DEMANDA, { signal: control.signal })
      .then((datos) => {
        if (!vigente) return;
        setEstadoDemanda(datos);
      })
      .catch((causa) => {
        if (!vigente) return;
        setError(causa instanceof ErrorApi ? causa : new ErrorApi(0, String(causa)));
      });

    return () => {
      vigente = false;
      control.abort();
    };
  }, [intento]);

  return {
    registrosActivos: estadoDemanda?.totalEsperando ?? null,
    umbral: estadoDemanda?.umbralSalida ?? null,
    faltantes: estadoDemanda?.faltanParaSalir ?? null,
    porParada: estadoDemanda?.porParada ?? null,
    estadoDemanda,
    cargando: estadoDemanda === null && error === null,
    error,
    reintentar: () => setIntento((numero) => numero + 1),
  };
}
