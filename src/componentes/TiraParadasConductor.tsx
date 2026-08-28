import type { ParadaConDemanda } from '../hooks/usePanelConductor';
import type { Parada } from '../core/tipos';
import './TiraParadasConductor.css';

interface Props {
  paradas: ParadaConDemanda[];
}

function etiquetaAccesible(parada: Parada, activas: number | null): string {
  if (activas === null) return `${parada.nombre}: sin datos por el momento`;
  if (activas === 0) return `${parada.nombre}: nadie esperando`;
  if (activas === 1) return `${parada.nombre}: 1 persona esperando`;
  return `${parada.nombre}: ${activas} personas esperando`;
}

/**
 * Tira horizontal de paradas del panel del conductor (HU-62), en el orden
 * del recorrido.
 *
 * Cada parada se distingue a simple vista si tiene gente esperando o no
 * (criterio 4): numero grande y linea solida contra linea punteada sin
 * numero. Nunca solo por color (DESIGN.md §3, §12).
 */
export function TiraParadasConductor({ paradas }: Props) {
  return (
    <ol className="tira-conductor" aria-label="Paradas de la ruta, en orden de recorrido">
      {paradas.map(({ parada, activas }) => {
        const tieneGente = (activas ?? 0) > 0;
        const className = tieneGente
          ? 'tira-conductor__item'
          : 'tira-conductor__item tira-conductor__item--vacia';

        return (
          <li key={parada.id} className={className} aria-label={etiquetaAccesible(parada, activas)}>
            {tieneGente ? (
              <span className="tira-conductor__contador" aria-hidden="true">
                {activas}
              </span>
            ) : (
              <span className="tira-conductor__sin-gente" aria-hidden="true">
                {activas === null ? 'sin datos' : 'nadie esperando'}
              </span>
            )}

            <span className="tira-conductor__linea" aria-hidden="true">
              <span className="tira-conductor__marcador" />
            </span>

            <span className="tira-conductor__nombre" aria-hidden="true">
              {parada.nombre}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
