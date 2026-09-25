import type { ReactNode } from 'react';
import { PatronVoluta, SimboloEcoRuta, Volcanes } from './IconosPanel';
import '../../paginas/admin/PanelMunicipal.css';

/**
 * Pantalla partida del panel municipal: franja de identidad a la izquierda
 * (unico lugar con ornamento, DESIGN.md §6) y el contenido a la derecha.
 * La usan el login y el acceso denegado.
 */
export function PantallaDeIdentidad({
  children,
  anchoContenido = 400,
  titulo = 'Panel municipal del servicio',
}: {
  children: ReactNode;
  anchoContenido?: number;
  titulo?: string;
}) {
  return (
    <div className="panel-identidad">
      <aside className="panel-identidad__franja">
        <PatronVoluta />
        <div className="panel-identidad__marca">
          <SimboloEcoRuta tamano={64} conPuntos />
          <div className="panel-identidad__nombre">
            <span className="panel-identidad__ecoruta">EcoRuta</span>
            <span className="panel-identidad__lema">Bus eléctrico · Jalapa</span>
          </div>
        </div>
        <div className="panel-identidad__pie">
          <Volcanes />
          <p className="panel-identidad__titulo">{titulo}</p>
          <p className="panel-identidad__municipio">Municipalidad de Jalapa</p>
        </div>
      </aside>
      <main className="panel-identidad__contenido">
        <section className="panel-identidad__columna" style={{ maxWidth: anchoContenido }}>
          {children}
        </section>
      </main>
    </div>
  );
}
