import type { ReactNode } from 'react';
import './Layout.css';

interface Props {
  children: ReactNode;
}

/** Cascaron de la app: encabezado fijo y area de contenido. Movil primero. */
export function Layout({ children }: Props) {
  return (
    <div className="apl">
      <header className="apl__encabezado">
        <span className="apl__marca">EcoRuta</span>
        <span className="apl__lugar">Jalapa</span>
      </header>
      <main className="apl__contenido">{children}</main>
    </div>
  );
}
