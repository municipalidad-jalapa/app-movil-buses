import { formatearEta, type FilaPanelConductor } from '../../core/panelConductor';
import './FilaParadaConductor.css';

interface Props {
  fila: FilaPanelConductor;
}

/**
 * Una parada del recorrido en el panel del conductor (HU-75).
 *
 * DESIGN.md §11 [DURA]: sin mapa, sin ornamento, alto contraste, legible a un
 * metro. El estado atendida/pendiente nunca depende solo del color (DESIGN.md
 * §12 [DURA]): siempre lleva texto.
 */
export function FilaParadaConductor({ fila }: Props) {
  const { nombre, atendida, reservasActivas, eta } = fila;
  const etaConfiable = eta.tipo === 'exacto' || eta.tipo === 'rango';

  return (
    <li
      className={
        atendida ? 'fila-parada-conductor fila-parada-conductor--atendida' : 'fila-parada-conductor'
      }
    >
      <div className="fila-parada-conductor__identidad">
        <p className="fila-parada-conductor__nombre">{nombre}</p>
        <p className="fila-parada-conductor__estado-texto">
          {atendida ? 'Atendida' : 'Pendiente'}
        </p>
      </div>

      <p className="fila-parada-conductor__eta" data-confiable={etaConfiable}>
        {formatearEta(eta)}
      </p>

      <p className="fila-parada-conductor__reservas">
        <span className="fila-parada-conductor__reservas-numero">{reservasActivas}</span>
        <span className="fila-parada-conductor__reservas-etiqueta">
          {reservasActivas === 1 ? 'reserva activa' : 'reservas activas'}
        </span>
      </p>
    </li>
  );
}
