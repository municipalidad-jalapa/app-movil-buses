import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../core/apiClient';
import type { ResumenRuta } from '../core/tipos';

/** Cada cuanto se refresca el conteo. La demanda cambia a paso de persona. */
export const REFRESCO_RESUMEN_MS = 15_000;

/**
 * Cuantas personas esperan en cada parada, de `GET /rutas/{id}/resumen`.
 *
 * <p>Es el numero que el diseno (MapaOSM) pone bajo cada parada y en la hoja de
 * reserva. Se consulta al abrir y cada {@link REFRESCO_RESUMEN_MS}; `refrescar`
 * lo pide ya, por ejemplo despues de reservar o cancelar.
 *
 * <p>Si una consulta falla se conserva el ultimo conteo: un numero de hace un
 * rato sirve mas que ninguno.
 */
export function useResumenRuta(rutaId: number | null | undefined) {
  const [esperandoPorParada, setEsperando] = useState<ReadonlyMap<number, number>>(new Map());
  const [pedido, setPedido] = useState(0);

  useEffect(() => {
    if (rutaId == null) return;
    const control = new AbortController();

    const consultar = () =>
      apiClient
        .get<ResumenRuta>(`/api/v1/rutas/${rutaId}/resumen`, { signal: control.signal, intentos: 1 })
        .then((datos) => {
          if (!datos || control.signal.aborted) return;
          setEsperando(
            new Map(datos.reservasActivas.porParada.map((f) => [f.paradaId, f.reservasActivas])),
          );
        })
        .catch(() => {});

    void consultar();
    const temporizador = setInterval(consultar, REFRESCO_RESUMEN_MS);
    return () => {
      clearInterval(temporizador);
      control.abort();
    };
  }, [rutaId, pedido]);

  const refrescar = useCallback(() => setPedido((n) => n + 1), []);

  return { esperandoPorParada, refrescar };
}
