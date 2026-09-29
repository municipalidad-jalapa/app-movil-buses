import { useCallback, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuthAdmin } from '../../core/panelAdmin/AuthAdminContext';
import { useInactividad } from '../../hooks/useInactividad';
import { AvisoInactividad } from './AvisoInactividad';
import { IconoSalir, SimboloEcoRuta } from './IconosPanel';
import { CajonDelPanel, NavegacionPanel } from './NavegacionPanel';

/**
 * El marco comun de las pantallas del panel municipal: cabecera sobria con la
 * navegacion entre secciones, cierre por inactividad y el contenido.
 *
 * <p>Responsive (informe de QA: "en el menu, las letras se sobreponen"): en el
 * telefono la cabecera lleva solo la hamburguesa y la marca, y las secciones,
 * la cuenta y "Cerrar sesion" van en un cajon lateral.
 */
export function MarcoPanel({ children }: { children: ReactNode }) {
  const { sesion, renovarSesion, cerrarSesion } = useAuthAdmin();
  const [cajonAbierto, setCajonAbierto] = useState(false);
  const cerrarCajon = useCallback(() => setCajonAbierto(false), []);

  const alCerrarPorInactividad = useCallback(() => cerrarSesion('inactividad'), [cerrarSesion]);
  const { segundosRestantes, seguir } = useInactividad({
    expiraEnMs: sesion?.expiraEnMs ?? 0,
    alRenovar: () => void renovarSesion(),
    alCerrar: alCerrarPorInactividad,
  });

  return (
    <div className="panel-escritorio">
      <header className="panel-cabecera">
        <div className="panel-cabecera__marca">
          <button
            type="button"
            className="panel-cabecera__menu"
            aria-label="Abrir el menú"
            aria-expanded={cajonAbierto}
            onClick={() => setCajonAbierto(true)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
              strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
          <Link to="/" className="panel-cabecera__inicio" aria-label="EcoRuta, volver al mapa">
            <SimboloEcoRuta tamano={30} />
            <span className="panel-cabecera__ecoruta">EcoRuta</span>
          </Link>
          <span className="panel-cabecera__separador" aria-hidden="true" />
          <span className="panel-cabecera__seccion">Panel municipal</span>
          <NavegacionPanel />
        </div>
        <div className="panel-cabecera__usuario">
          <span className="panel-cabecera__correo">{sesion?.correo}</span>
          <button type="button" className="panel-boton panel-boton--cabecera" onClick={() => cerrarSesion()}>
            <IconoSalir />
            Cerrar sesión
          </button>
        </div>
      </header>

      {children}

      {cajonAbierto && (
        <CajonDelPanel correo={sesion?.correo} onCerrar={cerrarCajon} onCerrarSesion={() => cerrarSesion()} />
      )}

      {segundosRestantes !== null && (
        <AvisoInactividad segundos={segundosRestantes} onSeguir={seguir} onCerrarSesion={() => cerrarSesion()} />
      )}
    </div>
  );
}
