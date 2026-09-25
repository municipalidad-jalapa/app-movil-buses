import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { config } from '../core/config';
import './MenuAcceso.css';

/**
 * Menu de acceso por rol, en la cabecera junto a la marca.
 *
 * Un unico punto de entrada a las tres caras del sistema: el pasajero (el mapa
 * a sangre), el conductor (su login) y la administracion. Existe porque cada
 * rol vive en una ruta distinta y no habia forma de llegar a las de conductor
 * o admin sin escribir la URL a mano.
 *
 * Admin todavia no tiene pantalla propia: su unica superficie es la API. Por
 * eso ese enlace abre la documentacion (Swagger) del backend, y se reemplazara
 * por el panel cuando exista. Se deja como enlace externo, en otra pestana.
 */
export function MenuAcceso() {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

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

  // Swagger cuelga de la raiz del backend. La base sale de `config` (unico punto
  // de acceso a las variables de entorno, ya validada y sin barra final).
  const urlAdmin = `${config.apiBaseUrl}/swagger-ui/index.html`;

  return (
    <div className="menu-acceso" ref={contenedor}>
      <button
        type="button"
        className="menu-acceso__boton"
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
      >
        Acceder
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
          <a
            className="menu-acceso__opcion"
            role="menuitem"
            href={urlAdmin}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setAbierto(false)}
          >
            <span className="menu-acceso__titulo">Administrador</span>
            <span className="menu-acceso__ayuda">Documentacion de la API</span>
          </a>
        </div>
      )}
    </div>
  );
}
