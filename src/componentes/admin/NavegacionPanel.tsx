import { NavLink } from 'react-router-dom';
import './NavegacionPanel.css';

/**
 * Secciones del panel municipal, en la cabecera (SCRUM-26, A.3). Canvas
 * «EcoRuta · Opiniones», pantalla 5.
 */
export function NavegacionPanel() {
  return (
    <nav className="panel-navegacion" aria-label="Secciones del panel">
      <NavLink to="/admin" end className={claseEnlace}>
        Estado del servicio
      </NavLink>
      <NavLink to="/admin/opiniones" className={claseEnlace}>
        Opiniones
      </NavLink>
    </nav>
  );
}

function claseEnlace({ isActive }: { isActive: boolean }) {
  return isActive ? 'panel-navegacion__enlace panel-navegacion__enlace--activo' : 'panel-navegacion__enlace';
}
