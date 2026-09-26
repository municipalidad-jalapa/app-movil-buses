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
      {/* SCRUM-26, bloque F: pasajeros subidos segun lo que marco el piloto. */}
      <NavLink to="/admin/abordajes" className={claseEnlace}>
        Pasajeros subidos
      </NavLink>
      {/* QA 5.6: crear rutas y corregir su trazado y sus paradas. */}
      <NavLink to="/admin/rutas" className={claseEnlace}>
        Rutas
      </NavLink>
      <NavLink to="/admin/vehiculos" className={claseEnlace}>
        Vehículos
      </NavLink>
      {/* HU-86: descarga de demanda y recorridos. */}
      <NavLink to="/admin/exportar" className={claseEnlace}>
        Exportar datos
      </NavLink>
      {/* Volver a lo que ve el pasajero: el mapa del bus. */}
      <NavLink to="/" end className={claseEnlace}>
        Ver el mapa
      </NavLink>
    </nav>
  );
}

function claseEnlace({ isActive }: { isActive: boolean }) {
  return isActive ? 'panel-navegacion__enlace panel-navegacion__enlace--activo' : 'panel-navegacion__enlace';
}
