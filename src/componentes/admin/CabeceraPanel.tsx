import { Link, NavLink } from 'react-router-dom';
import { useAuthAdmin } from '../../core/panelAdmin/AuthAdminContext';
import { IconoSalir, SimboloEcoRuta } from './IconosPanel';

/** Cabecera comun del panel municipal: marca, secciones y cierre de sesion. */
export function CabeceraPanel() {
  const { sesion, cerrarSesion } = useAuthAdmin();
  return (
    <header className="panel-cabecera">
      <div className="panel-cabecera__marca">
        <Link to="/" className="panel-cabecera__inicio" aria-label="EcoRuta, volver al mapa">
          <SimboloEcoRuta tamano={30} />
          <span className="panel-cabecera__ecoruta">EcoRuta</span>
        </Link>
        <span className="panel-cabecera__separador" aria-hidden="true" />
        <span className="panel-cabecera__seccion">Panel municipal</span>
        <nav className="panel-cabecera__nav" aria-label="Secciones del panel">
          <NavLink to="/admin" end className="panel-cabecera__enlace">
            Estado del servicio
          </NavLink>
          <NavLink to="/admin/exportar" className="panel-cabecera__enlace">
            Exportar datos
          </NavLink>
        </nav>
      </div>
      <div className="panel-cabecera__usuario">
        <span className="panel-cabecera__correo">{sesion?.correo}</span>
        <button type="button" className="panel-boton panel-boton--cabecera" onClick={() => cerrarSesion()}>
          <IconoSalir />
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
