import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MenuAcceso } from './MenuAcceso';
import { PieLegal } from './PieLegal';
import { SimboloMarca } from './SimboloMarca';
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
    <div className={aSangre ? 'apl apl--a-sangre' : 'apl'}>
      <header className="apl__encabezado">
        <Link to="/" className="apl__marca" aria-label="Mi Bus Jalapa, volver al mapa">
          <SimboloMarca tamano={30} />
          <span className="apl__nombre">Mi Bus Jalapa</span>
        </Link>

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
