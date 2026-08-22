import { useEffect, useRef } from 'react';
import { useDeslizamientoMarcador } from '../hooks/useDeslizamientoMarcador';
import type { Posicion } from '../core/tipos';
import './MarcadorBus.css';

/**
 * Contrato minimo para anclar el bus al mapa.
 * No depende de maplibre-gl: HU-50 entregara el adaptador real.
 */
export interface AnclaDeMarcador {
  mover(longitud: number, latitud: number, rumboGrados: number): void;
  quitar(): void;
}

export interface MapaParaMarcador {
  anclar(elemento: HTMLElement): AnclaDeMarcador;
}

interface Props {
  posicion: Posicion | null;
  mapa: MapaParaMarcador | null;
}

/**
 * Marcador del bus (DESIGN.md §8): se desliza, no salta, y lleva orientacion.
 * El movimiento visual va por transform, nunca por top/left.
 */
export function MarcadorBus({ posicion, mapa }: Props) {
  const iconoRef = useRef<HTMLDivElement | null>(null);
  const anclaRef = useRef<AnclaDeMarcador | null>(null);
  const visual = useDeslizamientoMarcador(posicion);

  function guardarNodo(nodo: HTMLDivElement | null) {
    iconoRef.current = nodo;
  }

  useEffect(() => {
    const icono = iconoRef.current;
    if (!mapa || !icono) return;
    const ancla = mapa.anclar(icono);
    anclaRef.current = ancla;
    return () => {
      ancla.quitar();
      anclaRef.current = null;
    };
  }, [mapa]);

  useEffect(() => {
    if (!visual || !iconoRef.current) return;
    iconoRef.current.style.transform = `rotate(${visual.rumbo}deg)`;
    anclaRef.current?.mover(visual.punto.longitud, visual.punto.latitud, visual.rumbo);
  }, [visual]);

  return (
    <div
      ref={guardarNodo}
      className="marcador-bus"
      role="img"
      aria-label="Dónde va el bus"
      hidden={!posicion || !visual}
      data-latitud={visual?.punto.latitud}
      data-longitud={visual?.punto.longitud}
      data-rumbo={visual?.rumbo}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M12 2.2 6.4 16.4h3.2l2.4 5.4 2.4-5.4h3.2L12 2.2z"
        />
      </svg>
    </div>
  );
}
