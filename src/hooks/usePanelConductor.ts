import { useEffect, useMemo, useState } from 'react';
import { ErrorApi } from '../core/errores';
import { obtenerReservasParada } from '../core/reservas';
import { haySesionConductor } from '../core/sesionConductor';
import type { Parada, Ruta } from '../core/tipos';
import { useRutas } from './useRutas';

/** Cada cuanto se refresca el panel solo, sin que el conductor recargue (HU-62, criterio 3). */
const INTERVALO_ACTUALIZACION_MS = 15_000;

export interface ParadaConDemanda {
  parada: Parada;
  /** null cuando la ultima consulta a esta parada especifica todavia no tuvo exito. */
  activas: number | null;
}

export interface EstadoPanelConductor {
  sesionValida: boolean;
  ruta: Ruta | null;
  /** En el orden del recorrido (criterio 1): nunca alfabetico ni por id. */
  paradas: ParadaConDemanda[];
  cargando: boolean;
  error: ErrorApi | null;
  reintentar: () => void;
}

type ResultadoConsulta =
  | { paradaId: number; ok: true; activas: number }
  | { paradaId: number; ok: false; error: ErrorApi };

function esFallido(r: ResultadoConsulta): r is Extract<ResultadoConsulta, { ok: false }> {
  return !r.ok;
}

function esErrorDeSesion(error: ErrorApi): boolean {
  return error.status === 401 || error.status === 403;
}

/**
 * Datos del panel del conductor (HU-62 / Desarrollo-62).
 *
 * Junta dos cosas: la ruta activa (para el orden del recorrido y sus
 * paradas) y, por cada parada, sus reservas activas — una peticion por
 * parada, tal como expone el contrato `GET /paradas/{id}/reservas`. Se
 * repite sola cada `INTERVALO_ACTUALIZACION_MS` mientras haya sesion.
 *
 * Si una parada individual falla en un ciclo, conserva su ultimo valor
 * conocido en vez de mostrar un cero falso: una falla de red no debe hacer
 * parecer que una parada se quedo sin gente esperando.
 */
export function usePanelConductor(): EstadoPanelConductor {
  const [sesionValida, setSesionValida] = useState(haySesionConductor());

  const {
    rutaActiva,
    cargando: cargandoRuta,
    error: errorRuta,
    reintentar: reintentarRuta,
  } = useRutas();

  const paradasOrdenadas = useMemo(
    () => [...(rutaActiva?.paradas ?? [])].sort((a, b) => a.orden - b.orden),
    [rutaActiva],
  );
  const idsParadas = paradasOrdenadas.map((p) => p.id).join(',');

  const [activasPorParada, setActivasPorParada] = useState<Record<number, number | null>>({});
  const [primeraCargaLista, setPrimeraCargaLista] = useState(false);
  const [errorReservas, setErrorReservas] = useState<ErrorApi | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!sesionValida || paradasOrdenadas.length === 0) return;

    let vigente = true;
    const control = new AbortController();

    async function actualizar() {
      const resultados: ResultadoConsulta[] = await Promise.all(
        paradasOrdenadas.map((parada) =>
          obtenerReservasParada(parada.id, { signal: control.signal }).then(
            (respuesta): ResultadoConsulta => ({
              paradaId: parada.id,
              ok: true,
              activas: respuesta.activas,
            }),
            (causa): ResultadoConsulta => ({
              paradaId: parada.id,
              ok: false,
              error: causa instanceof ErrorApi ? causa : new ErrorApi(0, String(causa)),
            }),
          ),
        ),
      );

      if (!vigente) return;

      const fallidos = resultados.filter(esFallido);
      const huboExito = fallidos.length < resultados.length;
      const errorDeSesion = fallidos.find((r) => esErrorDeSesion(r.error));

      // Ninguna parada respondio y encima la razon es de sesion: no sigas
      // pintando el panel, es el estado de "sin sesion valida" (criterio 6).
      if (errorDeSesion && !huboExito) {
        setSesionValida(false);
        return;
      }

      setActivasPorParada((anterior) => {
        const siguiente = { ...anterior };
        for (const resultado of resultados) {
          siguiente[resultado.paradaId] = resultado.ok
            ? resultado.activas
            : (anterior[resultado.paradaId] ?? null);
        }
        return siguiente;
      });

      setErrorReservas(huboExito ? null : (fallidos[0]?.error ?? null));
      setPrimeraCargaLista(true);
    }

    void actualizar();
    const id = setInterval(() => void actualizar(), INTERVALO_ACTUALIZACION_MS);

    return () => {
      vigente = false;
      control.abort();
      clearInterval(id);
    };
    // idsParadas resume la lista de paradas sin comparar el array entero;
    // intento solo existe para forzar un reintento manual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsParadas, sesionValida, intento]);

  const paradas: ParadaConDemanda[] = paradasOrdenadas.map((parada) => ({
    parada,
    activas: activasPorParada[parada.id] ?? null,
  }));

  return {
    sesionValida,
    ruta: rutaActiva,
    paradas,
    cargando:
      sesionValida && (cargandoRuta || (paradasOrdenadas.length > 0 && !primeraCargaLista)),
    error: errorRuta ?? errorReservas,
    reintentar: () => {
      setErrorReservas(null);
      setIntento((n) => n + 1);
      reintentarRuta();
    },
  };
}
