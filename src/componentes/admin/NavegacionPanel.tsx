import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import './NavegacionPanel.css';

/**
 * Secciones del panel municipal (SCRUM-26, A.3), responsive:
 *
 * <ul>
 *   <li>Escritorio (1440 px o mas): todas en la cabecera.</li>
 *   <li>Tablet horizontal y escritorio chico (1024 a 1439 px): las principales en la cabecera y el resto en
 *       «Más», para que ningun texto se corte ni se encime (informe de QA).</li>
 *   <li>Telefono y tablet vertical (menos de 1024 px): la cabecera muestra la hamburguesa y las
 *       secciones van en un cajon lateral ({@link CajonDelPanel}).</li>
 * </ul>
 */

interface Seccion {
  a: string;
  texto: string;
  exacta?: boolean;
  principal: boolean;
  icono: ReactNode;
}

const SECCIONES: Seccion[] = [
  { a: '/admin', texto: 'Estado del servicio', exacta: true, principal: true, icono: <IconoEstado /> },
  { a: '/admin/opiniones', texto: 'Opiniones', principal: true, icono: <IconoOpiniones /> },
  // Informe de QA: crear, dibujar y eliminar rutas.
  { a: '/admin/rutas', texto: 'Rutas', principal: true, icono: <IconoRutas /> },
  { a: '/admin/vehiculos', texto: 'Vehículos', principal: true, icono: <IconoVehiculos /> },
  // SCRUM-26, bloque F: pasajeros subidos segun lo que marco el piloto.
  { a: '/admin/abordajes', texto: 'Pasajeros subidos', principal: false, icono: <IconoPasajeros /> },
  // HU-86: descarga de demanda y recorridos.
  { a: '/admin/exportar', texto: 'Exportar datos', principal: false, icono: <IconoExportar /> },
  // Volver a lo que ve el pasajero: el mapa del bus.
  { a: '/', texto: 'Ver el mapa', exacta: true, principal: false, icono: <IconoMapa /> },
];

/** La navegacion de la cabecera, en escritorio y tablet. */
export function NavegacionPanel() {
  const [masAbierto, setMasAbierto] = useState(false);
  const mas = useRef<HTMLDivElement>(null);

  // «Más» se cierra al tocar fuera o con Escape.
  useEffect(() => {
    if (!masAbierto) return;
    const fuera = (e: PointerEvent) => {
      if (!mas.current?.contains(e.target as Node)) setMasAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setMasAbierto(false);
    document.addEventListener('pointerdown', fuera);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('pointerdown', fuera);
      document.removeEventListener('keydown', tecla);
    };
  }, [masAbierto]);

  return (
    <nav className="panel-navegacion" aria-label="Secciones del panel">
      {SECCIONES.filter((s) => s.principal).map((s) => (
        <NavLink key={s.a} to={s.a} end={s.exacta} className={claseEnlace}>
          {s.texto}
        </NavLink>
      ))}
      <div className="panel-navegacion__grupo" ref={mas}>
        <button
          type="button"
          className="panel-navegacion__mas"
          aria-expanded={masAbierto}
          onClick={() => setMasAbierto((v) => !v)}
        >
          Más
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
        </button>
        <div
          className={
            masAbierto ? 'panel-navegacion__secundarias panel-navegacion__secundarias--abiertas' : 'panel-navegacion__secundarias'
          }
        >
          {SECCIONES.filter((s) => !s.principal).map((s) => (
            <NavLink key={s.a} to={s.a} end={s.exacta} className={claseEnlace} onClick={() => setMasAbierto(false)}>
              {s.texto}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}

/** El cajon lateral del telefono: todas las secciones, una por linea, con icono. */
export function CajonDelPanel({
  correo,
  onCerrar,
  onCerrarSesion,
}: {
  correo: string | undefined;
  onCerrar: () => void;
  onCerrarSesion: () => void;
}) {
  const cerrarBoton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cerrarBoton.current?.focus();
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [onCerrar]);

  return (
    <div className="panel-cajon" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="panel-cajon__hoja" role="dialog" aria-modal="true" aria-label="Menú del panel municipal">
        <div className="panel-cajon__cabecera">
          <span className="panel-cajon__marca">EcoRuta</span>
          <button ref={cerrarBoton} type="button" className="panel-cajon__cerrar" aria-label="Cerrar el menú" onClick={onCerrar}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
              strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <span className="panel-cajon__rotulo">Panel municipal</span>
        <nav aria-label="Secciones del panel">
          <ul className="panel-cajon__lista">
            {SECCIONES.map((s) => (
              <li key={s.a}>
                <NavLink
                  to={s.a}
                  end={s.exacta}
                  className={({ isActive }) =>
                    isActive ? 'panel-cajon__enlace panel-cajon__enlace--activo' : 'panel-cajon__enlace'
                  }
                  onClick={onCerrar}
                >
                  {s.icono}
                  {s.texto}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="panel-cajon__pie">
          <span className="panel-cajon__correo">{correo}</span>
          <button type="button" className="panel-cajon__salir" onClick={onCerrarSesion}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}

function claseEnlace({ isActive }: { isActive: boolean }) {
  return isActive ? 'panel-navegacion__enlace panel-navegacion__enlace--activo' : 'panel-navegacion__enlace';
}

function Icono({ children }: { children: ReactNode }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

function IconoEstado() {
  return <Icono><path d="M3 12h4l3-8 4 16 3-8h4" /></Icono>;
}
function IconoOpiniones() {
  return <Icono><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></Icono>;
}
function IconoRutas() {
  return <Icono><path d="M5 19c3-10 11-4 14-14" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="5" r="2" /></Icono>;
}
function IconoVehiculos() {
  return <Icono><rect x="4" y="4" width="16" height="13" rx="3" /><path d="M4 11h16M8 21v-2M16 21v-2" /></Icono>;
}
function IconoPasajeros() {
  return <Icono><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9" /></Icono>;
}
function IconoExportar() {
  return <Icono><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></Icono>;
}
function IconoMapa() {
  return <Icono><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14M15 6v14" /></Icono>;
}
