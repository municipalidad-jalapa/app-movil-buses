import { useEffect, useState } from 'react';
import { apiClient } from '../core/apiClient';
import { ErrorApi } from '../core/errores';
import type { Ruta } from '../core/tipos';

/** La ruta activa y sus paradas, para dibujar el mapa (HU-50). */
export function useRutas() {
  const [rutas, setRutas] = useState<Ruta[] | null>(null);
  const [error, setError] = useState<ErrorApi | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const control = new AbortController();
    let vigente = true;
    setError(null);

    apiClient
      .get<Ruta[]>('/api/v1/rutas', { signal: control.signal })
      .then((datos) => vigente && setRutas(datos ?? []))
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
    rutas,
    /** La activa. El producto opera una sola ruta (ADR-009). */
    rutaActiva: rutas?.find((r) => r.activa) ?? null,
    cargando: rutas === null && error === null,
    error,
    reintentar: () => setIntento((n) => n + 1),
  };
}
