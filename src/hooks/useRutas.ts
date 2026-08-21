import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../core/apiClient';
import type { Parada, Ruta } from '../core/tipos';

export interface EstadoRutas {
  rutas: Ruta[];
  rutaActiva: Ruta | null;
  paradas: Parada[];
  cargando: boolean;
  error: unknown;
  reintentar: () => void;
}

/** Consulta el catalogo de rutas y expone la ruta activa para las pantallas. */
export function useRutas(): EstadoRutas {
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [intento, setIntento] = useState(0);

  const reintentar = useCallback(() => setIntento((numero) => numero + 1), []);

  useEffect(() => {
    const control = new AbortController();
    setCargando(true);
    setError(null);

    apiClient
      .get<Ruta[]>('/api/v1/rutas', { signal: control.signal })
      .then((datos) => {
        if (control.signal.aborted) return;
        setRutas(datos ?? []);
      })
      .catch((causa: unknown) => {
        if (control.signal.aborted) return;
        setRutas([]);
        setError(causa);
      })
      .finally(() => {
        if (!control.signal.aborted) setCargando(false);
      });

    return () => control.abort();
  }, [intento]);

  const rutaActiva = rutas.find((ruta) => ruta.activa) ?? null;

  return {
    rutas,
    rutaActiva,
    paradas: rutaActiva?.paradas ?? [],
    cargando,
    error,
    reintentar,
  };
}