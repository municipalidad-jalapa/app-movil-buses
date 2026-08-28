import { Link } from 'react-router-dom';
import { Cargando } from '../componentes/Cargando';
import { MensajeError } from '../componentes/MensajeError';
import { TiraParadasConductor } from '../componentes/TiraParadasConductor';
import { usePanelConductor } from '../hooks/usePanelConductor';
import './PanelConductor.css';

/**
 * Panel del conductor: cuantas personas esperan en cada parada, en el orden
 * del recorrido (HU-62 / Desarrollo-62).
 *
 * DESIGN.md §11 es explicito sobre esta superficie: sin mapa, sin ornamento,
 * alto contraste, legible a un metro mientras se maneja, sin scroll
 * vertical. Por eso vive en su propia paleta oscura fija (ver
 * PanelConductor.css), independiente del tema claro del resto de la app:
 * no es "modo oscuro", es la superficie del conductor.
 */
export function PanelConductor() {
  const { sesionValida, ruta, paradas, cargando, error, reintentar } = usePanelConductor();

  if (!sesionValida) {
    return (
      <div className="panel-conductor panel-conductor--mensaje">
        <p className="panel-conductor__aviso" role="alert">
          No tenés una sesión de conductor activa.
        </p>
        <Link className="panel-conductor__enlace" to="/conductor/iniciar-sesion">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  if (cargando) {
    return (
      <div className="panel-conductor panel-conductor--mensaje">
        <Cargando texto="Cargando las paradas…" />
      </div>
    );
  }

  if (paradas.length === 0) {
    return (
      <div className="panel-conductor panel-conductor--mensaje">
        {error ? (
          <MensajeError error={error} onReintentar={reintentar} />
        ) : (
          <p className="panel-conductor__aviso">No hay una ruta activa en este momento.</p>
        )}
      </div>
    );
  }

  return (
    <div className="panel-conductor">
      <header className="panel-conductor__cabecera">
        <span className="panel-conductor__ruta">{ruta?.nombre ?? 'Ruta'}</span>
      </header>

      {error && (
        <p className="panel-conductor__aviso-discreto" role="status">
          No se pudo actualizar toda la lista. Mostrando el último dato conocido.
        </p>
      )}

      <TiraParadasConductor paradas={paradas} />
    </div>
  );
}
