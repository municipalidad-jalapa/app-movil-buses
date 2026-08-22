import { useEffect, useRef, useState } from 'react';
import type {
  GeoJSONSource,
  LngLatBoundsLike,
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
  paradaDestacadaId?: number;
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

const ESTILO_OSM_RESPALDO_OSCURO: StyleSpecification = {
  version: 8,
  sources: ESTILO_OSM_RESPALDO.sources,
  layers: [
    { id: 'fondo-oscuro', type: 'background', paint: { 'background-color': '#1A1712' } },
    { id: 'osm-oscuro', type: 'raster', source: 'osm', paint: {
      'raster-opacity': 0.18,
      'raster-saturation': -1,
      'raster-contrast': 0.15,
    } },
  ],
};

const ID_FUENTE_RUTA = 'ecoruta-ruta-activa';
const ID_CAPA_CONTORNO = 'ecoruta-contorno-ruta';
const ID_CAPA_RUTA = 'ecoruta-trazo-ruta';
export const TEXTO_ATRIBUCION_OSM = '© OpenStreetMap';

export function AtribucionMapa() {
  return <div className="mapa-ruta__atribucion" aria-label="Atribución del mapa">{TEXTO_ATRIBUCION_OSM}</div>;
}

export function obtenerCoordenadasRuta(paradas: Parada[]): Coordenadas[] {
  return [...paradas]
    .filter(
      (parada) =>
        Number.isFinite(parada.latitud) && Number.isFinite(parada.longitud),
    )
    .sort((a, b) => a.orden - b.orden)
    .map(({ latitud, longitud }) => ({ latitud, longitud }));
}

export function obtenerLimitesParadas(
  paradas: Parada[],
): LngLatBoundsLike | undefined {
  const coordenadas = obtenerCoordenadasRuta(paradas);
  if (coordenadas.length === 0) return undefined;

  const longitudes = coordenadas.map(({ longitud }) => longitud);
  const latitudes = coordenadas.map(({ latitud }) => latitud);
  return [
    [Math.min(...longitudes), Math.min(...latitudes)],
    [Math.max(...longitudes), Math.max(...latitudes)],
  ];
}

let pmtilesRegistrado = false;

function obtenerEstilo(): string | StyleSpecification {
  if (import.meta.env.VITE_MAP_STYLE_URL?.trim()) return import.meta.env.VITE_MAP_STYLE_URL.trim();
  const oscuro = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return oscuro ? ESTILO_OSM_RESPALDO_OSCURO : ESTILO_OSM_RESPALDO;
}

export function MapaRuta({
  centro = CENTRO_JALAPA,
  zoom = 13,
  estilo,
  ruta = null,
  paradas = ruta?.paradas ?? [],
  paradaDestacadaId,
}: Props) {
  const nodoMapa = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaMapLibre | null>(null);
  const marcadores = useRef<Marker[]>([]);
  const ConstructorMarcador = useRef<typeof import('maplibre-gl').Marker | null>(null);
  const ConstructorPopup = useRef<typeof import('maplibre-gl').Popup | null>(null);
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
          attributionControl: false,
          dragRotate: false,
          touchPitch: false,
        });

        mapa.current = instancia;
        ConstructorMarcador.current = maplibre.Marker;
        ConstructorPopup.current = maplibre.Popup;
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
    const CrearPopup = ConstructorPopup.current;
    if (estado !== 'listo' || !instancia || !CrearMarcador || !CrearPopup) return undefined;

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
        id: ID_CAPA_CONTORNO,
        type: 'line',
        source: ID_FUENTE_RUTA,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#FBF7F0',
          'line-width': 16,
        },
      });
      instancia.addLayer({
        id: ID_CAPA_RUTA,
        type: 'line',
        source: ID_FUENTE_RUTA,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#10402A',
          'line-width': 8,
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
        const destacada = parada.id === paradaDestacadaId;
        const contenedor = document.createElement('div');
        contenedor.className = 'mapa-ruta__marcador-contenedor';
        contenedor.setAttribute('role', 'img');
        contenedor.setAttribute('aria-label', `Parada ${parada.orden}: ${parada.nombre}`);
        contenedor.title = parada.nombre;

        const nodo = document.createElement('span');
        nodo.className = `mapa-ruta__marcador-parada${destacada ? ' mapa-ruta__marcador-parada--destacada' : ''}`;
        contenedor.appendChild(nodo);

        if (destacada) {
          const etiqueta = document.createElement('span');
          etiqueta.className = 'mapa-ruta__etiqueta-parada';
          etiqueta.textContent = parada.nombre;
          contenedor.appendChild(etiqueta);
        }

        const marcador = new CrearMarcador({ element: contenedor })
          .setLngLat([parada.longitud, parada.latitud])
          .addTo(instancia);
        if (!destacada) {
          marcador.setPopup(new CrearPopup({
            closeButton: true,
            closeOnClick: true,
            className: 'mapa-ruta__popup',
          }).setText(parada.nombre));
        }
        return marcador;
      });

    const limites = obtenerLimitesParadas(paradas);
    if (limites) {
      instancia.fitBounds(limites, { padding: 48, maxZoom: 15, duration: 0 });
    }

    return () => {
      marcadores.current.forEach((marcador) => marcador.remove());
      marcadores.current = [];
    };
  }, [estado, paradas]);

  return (
    <section className="mapa-ruta" aria-label="Mapa de la ruta de EcoRuta">
      <div ref={nodoMapa} className="mapa-ruta__lienzo" aria-hidden={estado !== 'listo'} />
      <AtribucionMapa />
      {estado === 'cargando' && (
        <div className="mapa-ruta__estado" role="status" aria-live="polite">
          <div className="mapa-ruta__esqueleto" aria-hidden="true">
            {Array.from({ length: 15 }, (_, indice) => <span key={indice} />)}
          </div>
          <div className="mapa-ruta__cargando">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
            <span>Cargando el mapa…</span>
          </div>
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