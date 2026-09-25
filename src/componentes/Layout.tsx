import type { ReactNode } from 'react';
import { MenuAcceso } from './MenuAcceso';
import { PieLegal } from './PieLegal';
import './Layout.css';

interface Props {
  children: ReactNode;

  /**
   * Sin margenes ni ancho maximo: el contenido llega a los bordes.
   *
   * Lo necesita la pantalla del mapa, que en `design/MapaOSM.dc.html`
   * ocupa todo el ancho y lleva la informacion flotando encima,
   * no debajo.
   */
  aSangre?: boolean;

  /**
   * Permite usar un contenedor mas amplio en pantallas de escritorio
   * sin afectar el ancho normal del resto de la aplicacion.
   */
  anchoAmplio?: boolean;

  /**
   * Estado del servicio, a la derecha de la marca.
   */
  estado?: ReactNode;

  /**
   * Permite ocultar el pie legal en pantallas que necesiten
   * ocupar completamente el espacio disponible.
   */
  sinPie?: boolean;
}

/**
 * Cascaron de la app: cabecera verde, contenido principal
 * y pie legal.
 */
export function Layout({
  children,
  aSangre = false,
  anchoAmplio = false,
  estado,
  sinPie = false,
}: Props) {
  const clasesContenido = [
    'apl__contenido',
    aSangre ? 'apl__contenido--a-sangre' : '',
    anchoAmplio ? 'apl__contenido--amplio' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="apl">
      <header className="apl__encabezado">
        <span className="apl__marca">
          <svg
            width="30"
            height="30"
            viewBox="0 0 64 64"
            aria-hidden="true"
            focusable="false"
          >
            <circle
              cx="32"
              cy="32"
              r="31"
              fill="#FBF7F0"
            />

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

        <span className="apl__acciones">
          {estado && (
            <span className="apl__estado">
              {estado}
            </span>
          )}

          <MenuAcceso />
        </span>
      </header>

      <main className={clasesContenido}>
        {children}
      </main>

      {!sinPie && <PieLegal />}
    </div>
  );
}
