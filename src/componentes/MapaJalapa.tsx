import { useMemo, useState, type RefObject } from 'react';
import {
  comoPuntoGeografico,
  crearProyeccion,
  type PuntoLienzo,
} from '../core/proyeccionMapa';
import type { Posicion, Ruta } from '../core/tipos';
import { FondoCargando, FondoCroquis } from './FondosDeMapa';
import { MapaOpenStreetMap, type ControlMapa } from './MapaOpenStreetMap';
import { OverlayRuta, type ParadaEnMapa } from './OverlayRuta';
import './MapaJalapa.css';

/**
 * El mapa de la pantalla del pasajero (HU-50).
 *
 * <p>Portado de `design/MapaJalapa.dc.html` y con las mismas tres perillas que
 * el mock: `capa`, `modo` y `desvio`.
 *
 * <p>El fondo es el mapa real de OpenStreetMap servido con MapLibre, como pide
 * HU-50. El croquis dibujado queda como respaldo para cuando no hay red, que
 * DESIGN.md seccion 7 exige tratar como pantalla de primera clase y no como
 * error.
 */

export type CapaMapa = 'mapa' | 'croquis' | 'cargando';
export type ModoMapa = 'claro' | 'oscuro';

interface Props {
  ruta: Ruta | null;
  posicionBus: Posicion | null;
  /** El dato del bus tiene mas de 5 min: el marcador se atenua (HU-60). */
  busRancio?: boolean;
  /** Posiciones anteriores, de mas vieja a mas nueva. Dibujan la estela. */
  historial?: readonly Posicion[];
  capa?: CapaMapa;
  modo?: ModoMapa;
  desvio?: boolean;
  /** Parada que el pasajero eligio esperar. */
  paradaTuyaId?: number | null;
  /** paradaId -> personas esperando, para el contador bajo cada parada. */
  esperandoPorParada?: ReadonlyMap<number, number>;
  /** El punto "yo", si el pasajero compartio su ubicacion. */
  ubicacionPasajero?: { latitud: number; longitud: number } | null;
  onElegirParada?: (id: number) => void;
  control?: RefObject<ControlMapa | null>;
}

export function MapaJalapa({
  ruta,
  posicionBus,
  busRancio = false,
  historial = [],
  capa = 'mapa',
  modo = 'claro',
  desvio = false,
  paradaTuyaId = null,
  esperandoPorParada,
  ubicacionPasajero = null,
  onElegirParada,
  control,
}: Props) {
  const oscuro = modo === 'oscuro';

  // Si el telefono no puede con el mapa, se ensena el croquis. Mismo trazo,
  // mismos marcadores; solo cambia el fondo (DESIGN.md seccion 8).
  const [mapaNoDisponible, setMapaNoDisponible] = useState(false);
  const capaEfectiva = capa === 'mapa' && mapaNoDisponible ? 'croquis' : capa;

  // El encuadre se calcula SOLO con las paradas, no con la posicion del bus: si
  // dependiera del bus, el mapa entero saltaria con cada evento nuevo y seria
  // imposible de seguir.
  const proyeccion = useMemo(
    () => crearProyeccion((ruta?.paradas ?? []).map((p) => ({ latitud: p.latitud, longitud: p.longitud }))),
    [ruta],
  );

  const paradas: ParadaEnMapa[] = useMemo(
    () =>
      (ruta?.paradas ?? []).map((p) => ({
        id: p.id,
        nombre: p.nombre,
        punto: proyeccion.proyectar({ latitud: p.latitud, longitud: p.longitud }),
        tuya: p.id === paradaTuyaId,
      })),
    [ruta, proyeccion, paradaTuyaId],
  );

  const trazoRuta: PuntoLienzo[] = useMemo(() => paradas.map((p) => p.punto), [paradas]);

  const bus = posicionBus ? proyeccion.proyectar(comoPuntoGeografico(posicionBus)) : null;

  // Solo las dos ultimas: mas puntos ensucian el mapa sin decir nada nuevo.
  const estela = useMemo(
    () => historial.slice(-2).map((p) => proyeccion.proyectar(comoPuntoGeografico(p))),
    [historial, proyeccion],
  );

  return (
    <div className="mapa-jalapa" data-modo={modo}>
      {capaEfectiva === 'mapa' && (
        // La ruta, las paradas y el bus van como capas del propio mapa, para
        // que sigan al terreno cuando el usuario hace zoom o arrastra.
        <MapaOpenStreetMap
          ruta={ruta}
          posicionBus={posicionBus}
          busRancio={busRancio}
          oscuro={oscuro}
          paradaElegidaId={paradaTuyaId}
          esperandoPorParada={esperandoPorParada}
          ubicacionPasajero={ubicacionPasajero}
          onElegirParada={onElegirParada}
          control={control}
          onNoDisponible={() => setMapaNoDisponible(true)}
        />
      )}

      {capaEfectiva === 'cargando' && <FondoCargando />}

      {capaEfectiva === 'croquis' && (
        <>
          <FondoCroquis />
          {/* Mismo trazo, mismos marcadores: solo cambia el fondo (DESIGN.md 8). */}
          <OverlayRuta
            paradas={paradas}
            trazoRuta={trazoRuta}
            bus={bus}
            busRancio={busRancio}
            estela={estela}
            desvio={desvio}
            trazoReal={desvio && bus ? [...trazoRuta.slice(0, 2), bus] : []}
            onElegirParada={onElegirParada}
          />
        </>
      )}

      {/* Con el mapa real la pone MapLibre; en croquis y carga, nosotros. */}
      {capaEfectiva !== 'mapa' && <span className="mapa-jalapa__atribucion">© OpenStreetMap</span>}
    </div>
  );
}
