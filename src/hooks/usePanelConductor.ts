import { useCallback, useEffect, useState } from 'react';
import { ErrorApi } from '../core/errores';
import {
  marcarParadaAtendida,
  obtenerPanelConductor,
  type ConteoDeParada,
  type PanelConductor,
} from '../core/panelConductor';

/**
 * Cada cuanto se actualiza el panel solo (QA 4.3: "actualizandose solo"). El
 * conductor no toca nada para ver a la gente nueva esperando.
 */
export const REFRESCO_PANEL_MS = 15_000;

export interface EstadoPanelConductor {
  panel: PanelConductor | null;
  cargando: boolean;
  error: ErrorApi | null;
  /** Cuando llego el ultimo panel valido. */
  actualizadoEn: Date | null;
  marcando: number | null;
  /** Cierra la parada con lo que conto el piloto. */
  cerrarParada: (paradaId: number, conteo: ConteoDeParada) => Promise<ResultadoDeCierre>;
  reintentar: () => void;
}

export type ResultadoDeCierre = { ok: true; reservasCerradas: number } | { ok: false; mensaje: string };

export function usePanelConductor(): EstadoPanelConductor {
  const [panel, setPanel] = useState<PanelConductor | null>(null);
  const [error, setError] = useState<ErrorApi | null>(null);
  const [actualizadoEn, setActualizadoEn] = useState<Date | null>(null);
  const [cargaLista, setCargaLista] = useState(false);
  const [marcando, setMarcando] = useState<number | null>(null);
  const [pedido, setPedido] = useState(0);

  useEffect(() => {
    const control = new AbortController();
    const cargar = async () => {
      try {
        const datos = await obtenerPanelConductor(control.signal);
        if (control.signal.aborted) return;
        if (datos) setPanel(datos);
        setError(null);
        setActualizadoEn(new Date());
      } catch (causa) {
        if (control.signal.aborted) return;
        // Se conserva el ultimo panel: un dato de hace un rato sirve mas que nada.
        setError(causa instanceof ErrorApi ? causa : new ErrorApi(0, String(causa)));
      } finally {
        if (!control.signal.aborted) setCargaLista(true);
      }
    };
    void cargar();
    const temporizador = setInterval(() => void cargar(), REFRESCO_PANEL_MS);
    return () => {
      control.abort();
      clearInterval(temporizador);
    };
  }, [pedido]);

  const reintentar = useCallback(() => setPedido((n) => n + 1), []);

  const cerrarParada = useCallback(
    async (paradaId: number, conteo: ConteoDeParada): Promise<ResultadoDeCierre> => {
      if (!panel) return { ok: false, mensaje: 'Todavía no cargó tu ruta. Probá de nuevo.' };
      setMarcando(paradaId);
      try {
        const respuesta = await marcarParadaAtendida(panel.rutaId, paradaId, conteo);
        reintentar();
        return { ok: true, reservasCerradas: respuesta?.reservasCerradas ?? 0 };
      } catch (causa) {
        // 409: la misma parada se cerro hace un momento (doble toque, otra
        // pestana). Una vuelta nueva no da 409: empieza sola en el backend.
        if (causa instanceof ErrorApi && causa.status === 409) {
          reintentar();
          return { ok: false, mensaje: 'Esta parada ya la cerraste hace un momento: este conteo no se guardó.' };
        }
        return {
          ok: false,
          mensaje:
            causa instanceof ErrorApi ? causa.mensajeParaUsuario() : 'No pudimos cerrar la parada. Probá de nuevo.',
        };
      } finally {
        setMarcando(null);
      }
    },
    [panel, reintentar],
  );

  return { panel, cargando: !cargaLista, error, actualizadoEn, marcando, cerrarParada, reintentar };
}
