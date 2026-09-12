import type { ReactNode } from 'react';
import './Layout.css';

interface Props {
  children: ReactNode;
  /**
   * Sin margenes ni ancho maximo: el contenido llega a los bordes.
   *
   * <p>Lo necesita la pantalla del mapa, que en `design/EcoRuta.dc.html` ocupa
   * todo el ancho y lleva la informacion flotando encima, no debajo.
   */
  aSangre?: boolean;
  /** Estado del servicio, junto a la marca. Ej. "En ruta". */
  estado?: ReactNode;
}

/** Cascaron de la app: encabezado fijo y area de contenido. Movil primero. */
export function Layout({ children, aSangre = false, estado }: Props) {
  return (
    <div className="apl">
      <header className="apl__encabezado">
        <span className="apl__marca">EcoRuta</span>
        <span className="apl__lugar">Jalapa</span>
        {estado && <span className="apl__estado">{estado}</span>}
      </header>
      <main className={aSangre ? 'apl__contenido apl__contenido--a-sangre' : 'apl__contenido'}>
        {children}
      </main>
    </div>
  );
}
