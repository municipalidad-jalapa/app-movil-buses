import { useCallback, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthAdmin } from '../../core/panelAdmin/AuthAdminContext';
import { useInactividad } from '../../hooks/useInactividad';
import { AvisoInactividad } from './AvisoInactividad';
import { IconoSalir, SimboloEcoRuta } from './IconosPanel';

/**
 * El marco comun de las pantallas del panel municipal: cabecera sobria con la
 * navegacion entre secciones, cierre por inactividad y el contenido.
 *
 * <p>QA 5.6: "Corregir rutas" no tenia por donde entrar. La navegacion vive
 * aqui para que cada seccion nueva aparezca sola en todas las pantallas.
 */
export function MarcoPanel({ children }: { children: ReactNode }) {
  const { sesion, renovarSesion, cerrarSesion } = useAuthAdmin();

  const alCerrarPorInactividad = useCallback(() => cerrarSesion('inactividad'), [cerrarSesion]);
  const { segundosRestantes, seguir } = useInactividad({
    expiraEnMs: sesion?.expiraEnMs ?? 0,
    alRenovar: () => void renovarSesion(),
    alCerrar: alCerrarPorInactividad,
  });

  const clase = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'panel-nav__enlace panel-nav__enlace--activo' : 'panel-nav__enlace';

  return (
    <div className="panel-escritorio">
      <header className="panel-cabecera">
        <div className="panel-cabecera__marca">
          <SimboloEcoRuta tamano={30} />
          <span className="panel-cabecera__ecoruta">EcoRuta</span>
          <span className="panel-cabecera__separador" aria-hidden="true" />
          <span className="panel-cabecera__seccion">Panel municipal</span>
        </div>
        <nav className="panel-nav" aria-label="Secciones del panel">
          <NavLink to="/admin" end className={clase}>
            Estado del servicio
          </NavLink>
          <NavLink to="/admin/rutas" className={clase}>
            Corregir rutas
          </NavLink>
        </nav>
        <div className="panel-cabecera__usuario">
          <span className="panel-cabecera__correo">{sesion?.correo}</span>
          <button type="button" className="panel-boton panel-boton--cabecera" onClick={() => cerrarSesion()}>
            <IconoSalir />
            Cerrar sesión
          </button>
        </div>
      </header>

      {children}

      {segundosRestantes !== null && (
        <AvisoInactividad segundos={segundosRestantes} onSeguir={seguir} onCerrarSesion={() => cerrarSesion()} />
      )}
    </div>
  );
}
