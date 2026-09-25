import { useEffect, useRef, useState } from 'react';
import { AttributionControl, GeoJSONSource, LngLatBounds, Map as MapaLibre, Marker, NavigationControl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { estiloOpenStreetMap } from '../../core/estiloMapa';
import { soportaMapa } from '../../core/soporteDeMapa';
import type { PuntoGeo } from '../../core/panelAdmin/rutasAdminApi';

/**
 * Mapa del editor de rutas del panel municipal (QA 5.6).
 *
 * <p>Los vertices del trazado son puntos que se arrastran; un clic en el mapa
 * agrega un vertice en el tramo mas cercano; tocar un vertice lo selecciona
 * para quitarlo. Las paradas se arrastran para corregir su ubicacion. El
 * estado vive en la pantalla: este componente solo dibuja y avisa.
 */
interface ParadaEditable extends PuntoGeo {
  id: number;
  nombre: string;
  orden: number;
}

interface Props {
  trazado: PuntoGeo[];
  paradas: ParadaEditable[];
  verticeElegido: number | null;
  paradaElegida: number | null;
  onMoverVertice: (indice: number, punto: PuntoGeo) => void;
  onElegirVertice: (indice: number | null) => void;
  onAgregarVertice: (punto: PuntoGeo) => void;
  onMoverParada: (id: number, punto: PuntoGeo) => void;
  onElegirParada: (id: number) => void;
  /** Cambia cuando se elige otra ruta: el mapa se vuelve a encuadrar. */
  claveEncuadre: number | null;
}

const VERDE = '#10402A';
const AMARILLO = '#F2B705';
const CREMA = '#FBF7F0';
const ROJO = '#8C2B22';

export function EditorDeRuta(props: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaLibre | null>(null);
  const vertices = useRef<Marker[]>([]);
  const marcadoresParada = useRef<Marker[]>([]);
  const [listo, setListo] = useState(false);
  const [sinMapa, setSinMapa] = useState(false);
  // Los manejadores cambian en cada render; los marcadores llaman al ultimo.
  const ultimo = useRef(props);
  ultimo.current = props;

  useEffect(() => {
    if (!contenedor.current || mapa.current) return;
    if (!soportaMapa()) {
      setSinMapa(true);
      return;
    }
    const instancia = new MapaLibre({
      container: contenedor.current,
      style: estiloOpenStreetMap(),
      center: [-89.9885, 14.6355],
      zoom: 14.5,
      attributionControl: false,
      dragRotate: false,
    });
    instancia.addControl(new AttributionControl({ compact: false }), 'bottom-left');
    instancia.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    instancia.on('load', () => {
      instancia.addSource('trazado', { type: 'geojson', data: lineaVacia() });
      instancia.addLayer({
        id: 'trazado-contorno',
        type: 'line',
        source: 'trazado',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': CREMA, 'line-width': 10 },
      });
      instancia.addLayer({
        id: 'trazado-linea',
        type: 'line',
        source: 'trazado',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': VERDE, 'line-width': 5 },
      });
      setListo(true);
    });
    instancia.on('click', (e) => {
      ultimo.current.onAgregarVertice({ latitud: e.lngLat.lat, longitud: e.lngLat.lng });
    });
    mapa.current = instancia;
    return () => {
      instancia.remove();
      mapa.current = null;
    };
  }, []);

  // La linea.
  useEffect(() => {
    const fuente = mapa.current?.getSource('trazado') as GeoJSONSource | undefined;
    if (!listo || !fuente) return;
    fuente.setData({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: props.trazado.map((p) => [p.longitud, p.latitud]) },
    });
  }, [props.trazado, listo]);

  // Los vertices arrastrables.
  useEffect(() => {
    const instancia = mapa.current;
    if (!listo || !instancia) return;
    vertices.current.forEach((m) => m.remove());
    vertices.current = props.trazado.map((p, i) => {
      const elemento = document.createElement('button');
      elemento.type = 'button';
      elemento.className = i === props.verticeElegido ? 'editor-vertice editor-vertice--elegido' : 'editor-vertice';
      elemento.setAttribute('aria-label', `Punto ${i + 1} del trazado`);
      elemento.addEventListener('click', (e) => {
        e.stopPropagation();
        ultimo.current.onElegirVertice(i);
      });
      const marcador = new Marker({ element: elemento, draggable: true }).setLngLat([p.longitud, p.latitud]).addTo(instancia);
      marcador.on('dragend', () => {
        const { lat, lng } = marcador.getLngLat();
        ultimo.current.onMoverVertice(i, { latitud: lat, longitud: lng });
      });
      return marcador;
    });
  }, [props.trazado, props.verticeElegido, listo]);

  // Las paradas arrastrables.
  useEffect(() => {
    const instancia = mapa.current;
    if (!listo || !instancia) return;
    marcadoresParada.current.forEach((m) => m.remove());
    marcadoresParada.current = props.paradas.map((p) => {
      const elegida = p.id === props.paradaElegida;
      const elemento = document.createElement('button');
      elemento.type = 'button';
      elemento.className = elegida ? 'editor-parada editor-parada--elegida' : 'editor-parada';
      elemento.textContent = String(p.orden);
      elemento.title = p.nombre;
      elemento.setAttribute('aria-label', `Parada ${p.orden}: ${p.nombre}`);
      elemento.style.setProperty('--color-parada', elegida ? AMARILLO : CREMA);
      elemento.style.setProperty('--borde-parada', elegida ? '#241C00' : ROJO);
      elemento.addEventListener('click', (e) => {
        e.stopPropagation();
        ultimo.current.onElegirParada(p.id);
      });
      const marcador = new Marker({ element: elemento, draggable: true }).setLngLat([p.longitud, p.latitud]).addTo(instancia);
      marcador.on('dragend', () => {
        const { lat, lng } = marcador.getLngLat();
        ultimo.current.onMoverParada(p.id, { latitud: lat, longitud: lng });
      });
      return marcador;
    });
  }, [props.paradas, props.paradaElegida, listo]);

  // Encuadre al cambiar de ruta.
  useEffect(() => {
    const instancia = mapa.current;
    if (!listo || !instancia || props.claveEncuadre === null) return;
    const puntos = [...props.trazado, ...props.paradas];
    if (puntos.length === 0) return;
    const limites = new LngLatBounds();
    puntos.forEach((p) => limites.extend([p.longitud, p.latitud]));
    instancia.fitBounds(limites, { padding: 48, duration: 0, maxZoom: 17 });
    // Solo al cambiar de ruta, no con cada arrastre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.claveEncuadre, listo]);

  if (sinMapa) {
    return (
      <div className="editor-ruta editor-ruta--sin-mapa">
        Este navegador no puede mostrar el mapa (necesita WebGL2). Abrí el panel en otro navegador para corregir rutas.
      </div>
    );
  }
  return <div ref={contenedor} className="editor-ruta" aria-label="Mapa para corregir la ruta" />;
}

function lineaVacia() {
  return { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: [] } };
}
