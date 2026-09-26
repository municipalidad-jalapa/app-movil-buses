import { useMemo } from 'react';
import type { PanelConductor } from '../../core/panelConductor';
import type { Posicion, Ruta } from '../../core/tipos';
import { MapaJalapa } from '../MapaJalapa';

/**
 * El mapa de la ruta en el panel del conductor: el recorrido, las paradas con
 * quienes esperan y el bus en vivo. Es apoyo para ubicarse; la proxima parada
 * y "Llegué" siguen siendo lo principal (DESIGN.md seccion 11).
 *
 * <p>La ruta y la posicion llegan del panel, que las usa tambien para elegir
 * la parada en la que esta el bus: una sola fuente para las dos cosas.
 */
export function MapaConductor({
  panel,
  ruta,
  posicion,
}: {
  panel: PanelConductor;
  ruta: Ruta | null;
  posicion: Posicion | null;
}) {
  // Solo las pendientes: una parada cerrada ya no tiene a quien recoger.
  const esperando = useMemo(
    () =>
      new Map(
        panel.paradas
          .filter((p) => !p.atendidaEn && p.reservasActivas > 0)
          .map((p) => [p.paradaId, p.reservasActivas] as const),
      ),
    [panel.paradas],
  );

  return (
    <section className="conductor__mapa" aria-label={`Mapa de ${panel.rutaNombre}`}>
      <MapaJalapa ruta={ruta} posicionBus={posicion} modo="oscuro" esperandoPorParada={esperando} />
    </section>
  );
}
