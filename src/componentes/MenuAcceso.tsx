import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSesionPasajero } from '../core/pasajero/SesionPasajeroContext';
import { IconoPersona, IconoSalirCuenta, LogoGoogle } from './sesionPasajero/IconosSesion';
import './MenuAcceso.css';

/**
 * Menu de acceso por rol, en la cabecera junto a la marca.
 *
 * Un unico punto de entrada a las tres caras del sistema: el pasajero (el mapa
 * a sangre), el conductor (su login) y la administracion. Existe porque cada
 * rol vive en una ruta distinta y no habia forma de llegar a las de conductor
 * o admin sin escribir la URL a mano.
 *
 * Administrador abre el panel municipal (SCRUM-173). En la app del pasajero el
 * menu muestra ademas su cuenta opcional o el modo invitado (SCRUM-26, B.1).
 * QA 5.6: el enlace de administracion apuntaba
 * a Swagger en el host de la API, que en QA es el mismo del frontend, y
 * terminaba en "Pagina no encontrada".
 */
export function MenuAcceso() {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  // SCRUM-26, B.1: solo en la app del pasajero hay sesion de pasajero.
  const pasajero = useSesionPasajero();
  const conCuenta = pasajero?.modo === 'cuenta' && pasajero.sesion !== null;
  const correo = pasajero?.sesion?.correo ?? '';
  const inicial = (correo.charAt(0) || '·').toUpperCase();

  // Cerrar al hacer clic fuera o con Escape: comportamiento esperado de un menu.
  useEffect(() => {
    if (!abierto) return;
    const alClic = (e: MouseEvent) => {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    const alTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('mousedown', alClic);
    document.addEventListener('keydown', alTecla);
    return () => {
      document.removeEventListener('mousedown', alClic);
      document.removeEventListener('keydown', alTecla);
    };
  }, [abierto]);

  return (
    <div className="menu-acceso" ref={contenedor}>
      <button
        type="button"
        className="menu-acceso__boton"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={conCuenta ? 'Cuenta de ' + correo : undefined}
        onClick={() => setAbierto((v) => !v)}
      >
        {pasajero?.modo ? (
          <>
            <span className={conCuenta ? 'menu-acceso__avatar menu-acceso__avatar--cuenta' : 'menu-acceso__avatar'}>
              {conCuenta ? inicial : <IconoPersona tamano={18} />}
            </span>
            <span className="menu-acceso__rotulo">{conCuenta ? 'Cuenta' : 'Invitado'}</span>
          </>
        ) : (
          'Acceder'
        )}
        <svg
          className={abierto ? 'menu-acceso__flecha menu-acceso__flecha--abierta' : 'menu-acceso__flecha'}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>

      {abierto && (
        <div className="menu-acceso__lista" role="menu">
          {pasajero?.modo && (
            <>
              <div className="menu-acceso__cuenta">
                {conCuenta ? (
                  <>
                    <span className="menu-acceso__avatar menu-acceso__avatar--cuenta menu-acceso__avatar--grande">
                      {inicial}
                    </span>
                    <span className="menu-acceso__cuenta-textos">
                      <span className="menu-acceso__cuenta-ayuda">Sesión iniciada con Google</span>
                      <span className="menu-acceso__cuenta-correo">{correo}</span>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="menu-acceso__avatar menu-acceso__avatar--invitado">
                      <IconoPersona tamano={18} />
                    </span>
                    <span className="menu-acceso__cuenta-textos">
                      <span className="menu-acceso__cuenta-correo">Estás como invitado</span>
                      <span className="menu-acceso__cuenta-ayuda">Todo funciona sin cuenta</span>
                    </span>
                  </>
                )}
              </div>
              {conCuenta ? (
                <button
                  type="button"
                  role="menuitem"
                  className="menu-acceso__opcion menu-acceso__accion"
                  onClick={() => {
                    pasajero.cerrarSesion();
                    setAbierto(false);
                  }}
                >
                  <IconoSalirCuenta />
                  <span className="menu-acceso__textos">
                    <span className="menu-acceso__titulo menu-acceso__titulo--salir">Cerrar sesión</span>
                    <span className="menu-acceso__ayuda">Vuelves a modo invitado; tus datos quedan en tu cuenta</span>
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  className="menu-acceso__opcion menu-acceso__accion"
                  onClick={() => {
                    setAbierto(false);
                    void pasajero.iniciarConGoogle();
                  }}
                  disabled={pasajero.iniciando}
                >
                  <LogoGoogle />
                  <span className="menu-acceso__textos">
                    <span className="menu-acceso__titulo menu-acceso__titulo--entrar">Iniciar sesión</span>
                    <span className="menu-acceso__ayuda">Conserva tus reservas y opiniones</span>
                  </span>
                </button>
              )}
            </>
          )}
          <Link className="menu-acceso__opcion" role="menuitem" to="/" onClick={() => setAbierto(false)}>
            <span className="menu-acceso__titulo">Pasajero</span>
            <span className="menu-acceso__ayuda">Mira donde viene tu bus</span>
          </Link>
          <Link
            className="menu-acceso__opcion"
            role="menuitem"
            to="/conductor/login"
            onClick={() => setAbierto(false)}
          >
            <span className="menu-acceso__titulo">Conductor</span>
            <span className="menu-acceso__ayuda">Inicia tu jornada</span>
          </Link>
          <Link className="menu-acceso__opcion" role="menuitem" to="/admin" onClick={() => setAbierto(false)}>
            <span className="menu-acceso__titulo">Administrador</span>
            <span className="menu-acceso__ayuda">Panel municipal</span>
          </Link>
        </div>
      )}
      {pasajero?.modo === 'invitado' && pasajero.error && !abierto && (
        <div className="menu-acceso__error" role="alert">
          <p>{pasajero.error}</p>
          <button type="button" onClick={pasajero.entrarComoInvitado}>Continuar como invitado</button>
        </div>
      )}
    </div>
  );
}
