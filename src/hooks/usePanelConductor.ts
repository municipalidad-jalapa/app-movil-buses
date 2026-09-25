import { useCallback, useEffect, useState } from 'react';
import { ErrorApi } from '../core/errores';
import { marcarParadaAtendida, obtenerPanelConductor, type PanelConductor } from '../core/panelConductor';

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
  marcarAtendida: (paradaId: number) => Promise<string | null>;
  reintentar: () => void;
}

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

  /** Devuelve un mensaje para mostrar, o null si salio bien. */
  const marcarAtendida = useCallback(
    async (paradaId: number): Promise<string | null> => {
      if (!panel) return null;
      setMarcando(paradaId);
      try {
        const respuesta = await marcarParadaAtendida(panel.rutaId, paradaId);
        reintentar();
        const cerradas = respuesta?.reservasCerradas ?? 0;
        return cerradas === 1 ? 'Listo: 1 pasajero abordó.' : `Listo: ${cerradas} pasajeros abordaron.`;
      } catch (causa) {
        // 409: ya estaba atendida (otro toque, otra pestana). Se refresca y listo.
        if (causa instanceof ErrorApi && causa.status === 409) {
          reintentar();
          return 'Esta parada ya estaba marcada como atendida.';
        }
        return causa instanceof ErrorApi ? causa.mensajeParaUsuario() : 'No pudimos marcar la parada. Probá de nuevo.';
      } finally {
        setMarcando(null);
      }
    },
    [panel, reintentar],
  );

  return { panel, cargando: !cargaLista, error, actualizadoEn, marcando, marcarAtendida, reintentar };
}
