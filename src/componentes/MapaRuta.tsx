import { useEffect, useRef, useState } from 'react';
import type {
  GeoJSONSource,
  Map as MapaMapLibre,
  Marker,
  StyleSpecification,
} from 'maplibre-gl';
import type { Feature, FeatureCollection, LineString, Point } from 'geojson';
import type { Parada, Ruta } from '../core/tipos';
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
  ruta?: Ruta | null;
  paradas?: Parada[];
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

const ID_FUENTE_RUTA = 'ecoruta-ruta-activa';
const ID_CAPA_RUTA = 'ecoruta-trazo-ruta';

export function obtenerCoordenadasRuta(paradas: Parada[]): Coordenadas[] {
  return [...paradas]
    .filter(
      (parada) =>
        Number.isFinite(parada.latitud) && Number.isFinite(parada.longitud),
    )
    .sort((a, b) => a.orden - b.orden)
    .map(({ latitud, longitud }) => ({ latitud, longitud }));
}

let pmtilesRegistrado = false;

function obtenerEstilo(): string | StyleSpecification {
  return import.meta.env.VITE_MAP_STYLE_URL?.trim() || ESTILO_OSM_RESPALDO;
}

export function MapaRuta({
  centro = CENTRO_JALAPA,
  zoom = 13,
  estilo,
  ruta = null,
  paradas = ruta?.paradas ?? [],
}: Props) {
  const nodoMapa = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaMapLibre | null>(null);
  const marcadores = useRef<Marker[]>([]);
  const ConstructorMarcador = useRef<typeof import('maplibre-gl').Marker | null>(null);
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
        ConstructorMarcador.current = maplibre.Marker;
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

  useEffect(() => {
    const instancia = mapa.current;
    const CrearMarcador = ConstructorMarcador.current;
    if (estado !== 'listo' || !instancia || !CrearMarcador) return undefined;

    const coordenadas = obtenerCoordenadasRuta(paradas);
    const geojson: FeatureCollection<LineString | Point> = {
      type: 'FeatureCollection',
      features: coordenadas.length > 1
        ? [{
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: coordenadas.map(({ latitud, longitud }) => [longitud, latitud]),
            },
          } as Feature<LineString>]
        : [],
    };

    const fuenteExistente = instancia.getSource(ID_FUENTE_RUTA) as GeoJSONSource | undefined;
    if (fuenteExistente) {
      fuenteExistente.setData(geojson);
    } else {
      instancia.addSource(ID_FUENTE_RUTA, { type: 'geojson', data: geojson });
      instancia.addLayer({
        id: ID_CAPA_RUTA,
        type: 'line',
        source: ID_FUENTE_RUTA,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#2F5D3A',
          'line-width': 6,
          'line-opacity': 0.95,
        },
      });
    }

    marcadores.current.forEach((marcador) => marcador.remove());
    marcadores.current = paradas
      .filter(
        (parada) =>
          Number.isFinite(parada.latitud) && Number.isFinite(parada.longitud),
      )
      .sort((a, b) => a.orden - b.orden)
      .map((parada) => {
        const nodo = document.createElement('div');
        nodo.className = 'mapa-ruta__marcador-parada';
        nodo.setAttribute('role', 'img');
        nodo.setAttribute('aria-label', `Parada ${parada.orden}: ${parada.nombre}`);
        nodo.title = parada.nombre;
        return new CrearMarcador({ element: nodo })
          .setLngLat([parada.longitud, parada.latitud])
          .addTo(instancia);
      });

    return () => {
      marcadores.current.forEach((marcador) => marcador.remove());
      marcadores.current = [];
    };
  }, [estado, paradas]);

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