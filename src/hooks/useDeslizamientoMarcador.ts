import { useEffect, useRef, useState } from 'react';
import {
  DURACION_DESLIZAMIENTO_MS,
  interpolarPunto,
  progresoAnimacion,
  rumboEntre,
  type PuntoGeografico,
} from '../core/interpolacionPosicion';

export interface EstadoDeslizamiento {
  punto: PuntoGeografico;
  rumbo: number;
}

function prefiereMenosMovimiento(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Desliza el marcador entre eventos (SCRUM-245).
 * El primer punto y prefers-reduced-motion saltan sin interpolar.
 */
export function useDeslizamientoMarcador(
  destino: PuntoGeografico | null,
): EstadoDeslizamiento | null {
  const [visual, setVisual] = useState<EstadoDeslizamiento | null>(null);
  const visualRef = useRef(visual);
  visualRef.current = visual;

  useEffect(() => {
    if (!destino) {
      setVisual(null);
      return;
    }

    const actual = visualRef.current;
    const reducir = prefiereMenosMovimiento();
    if (!actual || reducir) {
      const rumbo = actual ? rumboEntre(actual.punto, destino) : 0;
      setVisual({ punto: destino, rumbo });
      return;
    }

    const origen = actual.punto;
    const rumbo = rumboEntre(origen, destino);
    const inicio = performance.now();
    let cuadro = 0;

    const avanzar = (ahora: number) => {
      const t = progresoAnimacion(ahora, inicio, DURACION_DESLIZAMIENTO_MS, false);
      setVisual({ punto: interpolarPunto(origen, destino, t), rumbo });
      if (t < 1) {
        cuadro = requestAnimationFrame(avanzar);
      }
    };

    cuadro = requestAnimationFrame(avanzar);
    return () => cancelAnimationFrame(cuadro);
  }, [destino?.latitud, destino?.longitud]);

  return visual;
}
