import type { ReactNode } from 'react';
import './Layout.css';

interface Props {
  children: ReactNode;
  /**
   * Sin margenes ni ancho maximo: el contenido llega a los bordes.
   *
   * <p>Lo necesita la pantalla del mapa, que en `design/MapaOSM.dc.html` ocupa
   * todo el ancho y lleva la informacion flotando encima, no debajo.
   */
  aSangre?: boolean;
  /**
   * Estado del servicio, a la derecha de la marca. El canvas pone ahi la
   * pastilla "En ruta"; hoy no hay historia ni dato que la alimente, asi que
   * nadie la pasa.
   */
  estado?: ReactNode;
}

/**
 * Cascaron de la app: la cabecera verde del canvas (logo y "EcoRuta") y el
 * area de contenido. Movil primero.
 */
export function Layout({ children, aSangre = false, estado }: Props) {
  return (
    <div className="apl">
      <header className="apl__encabezado">
        <span className="apl__marca">
          <svg width="30" height="30" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
            <circle cx="32" cy="32" r="31" fill="#FBF7F0" />
            <path
              d="M14 48c0-16 10-28 24-28 7 0 12 5 12 12s-5 11-11 11-10-4-10-10 4-8 8-8"
              fill="none"
              stroke="#10402A"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </svg>
          EcoRuta
        </span>
        {estado && <span className="apl__estado">{estado}</span>}
      </header>
      <main className={aSangre ? 'apl__contenido apl__contenido--a-sangre' : 'apl__contenido'}>
        {children}
      </main>
    </div>
  );
}
