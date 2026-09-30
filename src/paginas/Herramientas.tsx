import { Link } from 'react-router-dom';
import { PantallaDeIdentidad } from '../componentes/admin/PantallaDeIdentidad';
import './Herramientas.css';

/**
 * Acceso del personal (`/tools`), correccion de QA: "que una persona que no
 * sea de administracion o conductor no vea las opciones de inicio de sesion".
 *
 * El menu del pasajero ya no enlaza al conductor ni a la administracion; las
 * tres caras del sistema solo se ofrecen aqui. No es una barrera de seguridad:
 * el backend sigue exigiendo el rol en cada peticion (ROLE_CONDUCTOR,
 * ROLE_ADMIN). Esta ruta solo saca esas opciones de la vista publica.
 */
export function Herramientas() {
  return (
    <PantallaDeIdentidad titulo="Acceso del personal" anchoContenido={440}>
      <header className="panel-encabezado">
        <p className="panel-rotulo">Herramientas</p>
        <h1 className="panel-h1">¿Cómo querés entrar?</h1>
        <p className="panel-apoyo">Elegí el acceso que te corresponde.</p>
      </header>

      <nav aria-label="Opciones de acceso">
        <ul className="herramientas__lista">
          <li>
            <Link className="herramientas__opcion" to="/">
              <span className="herramientas__titulo">Pasajero</span>
              <span className="herramientas__ayuda">Mirá dónde viene tu bus</span>
            </Link>
          </li>
          <li>
            <Link className="herramientas__opcion" to="/conductor/login">
              <span className="herramientas__titulo">Conductor</span>
              <span className="herramientas__ayuda">Iniciá tu jornada</span>
            </Link>
          </li>
          <li>
            <Link className="herramientas__opcion" to="/admin">
              <span className="herramientas__titulo">Administrador</span>
              <span className="herramientas__ayuda">Panel municipal</span>
            </Link>
          </li>
        </ul>
      </nav>
    </PantallaDeIdentidad>
  );
}
