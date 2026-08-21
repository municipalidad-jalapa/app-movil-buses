import { useEffect, useRef, useState } from 'react';
import type { Map as MapaMapLibre, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './MapaRuta.css';

interface Coordenadas {
  latitud: number;
  longitud: number;
}

interface Props {
  centro?: Coordenadas;
  zoom?: number;
  estilo?: string;
}

const CENTRO_JALAPA: Coordenadas = { latitud: 14.6349, longitud: -89.9882 };
const ESTILO_OSM_RESPALDO: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

let pmtilesRegistrado = false;

function obtenerEstilo(): string | StyleSpecification {
  return import.meta.env.VITE_MAP_STYLE_URL?.trim() || ESTILO_OSM_RESPALDO;
}

export function MapaRuta({
  centro = CENTRO_JALAPA,
  zoom = 13,
  estilo,
}: Props) {
  const nodoMapa = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaMapLibre | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando');
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!nodoMapa.current) return undefined;

    setEstado('cargando');
    let cancelado = false;
    let instancia: MapaMapLibre | null = null;

    Promise.all([import('maplibre-gl'), import('pmtiles')])
      .then(([maplibre, { Protocol }]) => {
        if (cancelado || !nodoMapa.current) return;
        if (!pmtilesRegistrado) {
          const protocoloPmtiles = new Protocol();
          maplibre.addProtocol('pmtiles', protocoloPmtiles.tile);
          pmtilesRegistrado = true;
        }

        instancia = new maplibre.Map({
          container: nodoMapa.current,
          style: estilo || obtenerEstilo(),
          center: [centro.longitud, centro.latitud],
          zoom,
          dragRotate: false,
          touchPitch: false,
        });

        mapa.current = instancia;
        instancia.once('load', () => setEstado('listo'));
        instancia.once('error', () => setEstado('error'));
      })
      .catch(() => {
        if (!cancelado) setEstado('error');
      });

    return () => {
      cancelado = true;
      instancia?.remove();
      mapa.current = null;
    };
  }, [centro.latitud, centro.longitud, estilo, zoom, intento]);

  return (
    <section className="mapa-ruta" aria-label="Mapa de la ruta de EcoRuta">
      <div ref={nodoMapa} className="mapa-ruta__lienzo" aria-hidden={estado !== 'listo'} />
      {estado === 'cargando' && (
        <div className="mapa-ruta__estado" role="status" aria-live="polite">
          <span className="mapa-ruta__icono" aria-hidden="true">...</span>
          <span>Cargando el mapa...</span>
        </div>
      )}
      {estado === 'error' && (
        <div className="mapa-ruta__estado mapa-ruta__estado--error" role="alert">
          <span className="mapa-ruta__icono" aria-hidden="true">!</span>
          <span>No se pudo cargar el mapa. Intenta de nuevo.</span>
          <button type="button" onClick={() => setIntento((numero) => numero + 1)}>
            Reintentar
          </button>
        </div>
      )}
    </section>
  );
}