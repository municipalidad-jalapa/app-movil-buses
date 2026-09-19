import { useCallback, useEffect, useRef, useState } from 'react';

const EVENTOS_DE_ACTIVIDAD = ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart', 'focus'] as const;

interface Opciones {
  /** Vencimiento del JWT en ms epoch. El reloj de la sesion es este, no uno local. */
  expiraEnMs: number;
  /** Pide al backend un token nuevo. Solo se llama si hubo actividad. */
  alRenovar: () => void;
  /** La sesion vencio sin actividad. */
  alCerrar: () => void;
  /** Cuanto antes del cierre se avisa. */
  avisoMs?: number;
  /** Como mucho una renovacion cada tanto, aunque haya actividad continua. */
  renovarCadaMs?: number;
}

/**
 * Cierre de sesion por inactividad (SCRUM-173, criterio 3).
 *
 * La actividad renueva el token en el backend, y el backend no lo renueva sin
 * ella: si nadie usa el panel, el JWT vence y la API responde 401 aunque esta
 * pestaña se quede abierta. Este hook solo lo hace visible: avisa antes y
 * cierra al vencer. Durante el aviso, mover el raton no alcanza: hay que elegir.
 *
 * @returns los segundos que faltan mientras se muestra el aviso (null si no), y
 *          `seguir`, que renueva la sesion desde el aviso.
 */
export function useInactividad({
  expiraEnMs,
  alRenovar,
  alCerrar,
  avisoMs = 60_000,
  renovarCadaMs = 60_000,
}: Opciones) {
  const [segundosRestantes, setSegundosRestantes] = useState<number | null>(null);
  const ultimaRenovacionRef = useRef(Date.now());
  const avisandoRef = useRef(false);
  const alRenovarRef = useRef(alRenovar);
  const alCerrarRef = useRef(alCerrar);
  alRenovarRef.current = alRenovar;
  alCerrarRef.current = alCerrar;

  const renovar = useCallback(() => {
    ultimaRenovacionRef.current = Date.now();
    alRenovarRef.current();
  }, []);

  useEffect(() => {
    const alHaberActividad = () => {
      if (avisandoRef.current) return;
      if (Date.now() - ultimaRenovacionRef.current >= renovarCadaMs) {
        renovar();
      }
    };
    EVENTOS_DE_ACTIVIDAD.forEach((evento) => window.addEventListener(evento, alHaberActividad, { passive: true }));
    return () => EVENTOS_DE_ACTIVIDAD.forEach((evento) => window.removeEventListener(evento, alHaberActividad));
  }, [renovar, renovarCadaMs]);

  useEffect(() => {
    let cerrada = false;
    const revisar = () => {
      if (cerrada) return;
      const restanteMs = expiraEnMs - Date.now();
      if (restanteMs <= 0) {
        cerrada = true;
        avisandoRef.current = false;
        setSegundosRestantes(null);
        alCerrarRef.current();
        return;
      }
      if (restanteMs <= avisoMs) {
        avisandoRef.current = true;
        setSegundosRestantes(Math.ceil(restanteMs / 1000));
      } else {
        avisandoRef.current = false;
        setSegundosRestantes(null);
      }
    };
    revisar();
    const intervalo = window.setInterval(revisar, 1000);
    return () => window.clearInterval(intervalo);
  }, [expiraEnMs, avisoMs]);

  const seguir = useCallback(() => {
    avisandoRef.current = false;
    setSegundosRestantes(null);
    renovar();
  }, [renovar]);

  return { segundosRestantes, seguir };
}
