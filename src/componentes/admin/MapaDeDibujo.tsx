import { useEffect, useRef, useState, type RefObject } from 'react';
import { AttributionControl, GeoJSONSource, LngLatBounds, Map as MapaLibre, Marker, NavigationControl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { estiloOpenStreetMap } from '../../core/estiloMapa';
import { borrar, metrosEntre } from '../../core/panelAdmin/geometriaRuta';
import type { PuntoGeo } from '../../core/panelAdmin/rutasAdminApi';
import { soportaMapa } from '../../core/soporteDeMapa';
import './MapaDeDibujo.css';

/**
 * El mapa del creador de rutas (informe de QA, panel del administrador).
 *
 * <ul>
 *   <li><b>Lápiz</b>: se arrastra por donde pasa el bus y, al soltar, el trazo
 *       se entrega a quien lo ajusta a las calles. Cerca del borde el mapa se
 *       corre solo para seguir dibujando una ruta larga. Con dos dedos el mapa
 *       se mueve y se acerca igual que siempre.</li>
 *   <li><b>Borrador</b>: se pasa por encima de lo que sobra; lo que se va se
 *       marca en rojo y al soltar se entrega a quien lo quita.</li>
 *   <li><b>Mano</b>: el mapa se arrastra; las paradas tambien.</li>
 *   <li><b>Clic derecho</b> (o mantener presionado en pantallas tactiles):
 *       «Crear parada aquí».</li>
 * </ul>
 *
 * <p>El estado vive en la pantalla: este componente dibuja y avisa.
 */

export type Herramienta = 'lapiz' | 'borrador' | 'mano';

export interface ParadaEnMapa extends PuntoGeo {
  id: number;
  nombre: string;
  orden: number;
}

export interface ControlMapaDeDibujo {
  /** Encuadra toda la ruta: reemplaza al "mapa chico" del diseño. */
  verTodo: () => void;
}

interface Props {
  trazado: PuntoGeo[];
  /** El trazo a mano mientras se ajusta a las calles: se ve punteado. */
  pendiente: PuntoGeo[] | null;
  paradas: ParadaEnMapa[];
  herramienta: Herramienta;
  /** false en "Revisar y publicar": el mapa solo se mira. */
  editable: boolean;
  onTrazo: (puntos: PuntoGeo[]) => void;
  /** Por donde paso el borrador y su radio, en metros. */
  onBorrar: (goma: PuntoGeo[], radio: number) => void;
  onCrearParada: (punto: PuntoGeo) => void;
  onMoverParada: (id: number, punto: PuntoGeo) => void;
  /** Cambia al abrir otra ruta: el mapa se vuelve a encuadrar. */
  claveEncuadre: number;
  control?: RefObject<ControlMapaDeDibujo | null>;
}

const VERDE = '#10402A';
const AMARILLO = '#F2B705';
const CREMA = '#FBF7F0';
const ROJO = '#8C2B22';
const CENTRO_JALAPA: [number, number] = [-89.9885, 14.6355];

/** Distancia al borde, en px, a la que el mapa empieza a correrse solo. */
const BORDE_PX = 56;
/** Cuanto se corre en cada movimiento del lapiz cerca del borde. */
const PASO_PX = 14;
/** Mantener presionado, en ms, para abrir el menu en pantallas tactiles. */
const PRESION_MS = 600;
/** Radio del borrador, en px: el circulo de su cursor (MapaDeDibujo.css). */
const RADIO_GOMA_PX = 15;

interface Menu {
  x: number;
  y: number;
  punto: PuntoGeo;
}

export function MapaDeDibujo(props: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaLibre | null>(null);
  const marcadoresParada = useRef<Marker[]>([]);
  const marcadoresExtremos = useRef<Marker[]>([]);
  const [listo, setListo] = useState(false);
  const [sinMapa, setSinMapa] = useState(false);
  const [menu, setMenu] = useState<Menu | null>(null);
  // Los manejadores del mapa se crean una vez: leen siempre las ultimas props.
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
      center: CENTRO_JALAPA,
      zoom: 14.5,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      doubleClickZoom: false,
    });
    instancia.touchZoomRotate.disableRotation();
    instancia.addControl(new AttributionControl({ compact: false }), 'bottom-right');
    instancia.addControl(new NavigationControl({ showCompass: false }), 'bottom-right');

    // Listo apenas carga el ESTILO, no con 'load': 'load' espera todas las
    // teselas y con una sola colgada no se dibujaba nada (igual que en
    // MapaOpenStreetMap).
    const preparar = () => {
      if (!instancia.isStyleLoaded() || instancia.getSource('trazado')) return;
      for (const id of ['trazado', 'crudo']) instancia.addSource(id, { type: 'geojson', data: linea([]) });
      instancia.addSource('borrado', { type: 'geojson', data: lineas([]) });
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
      instancia.addLayer({
        id: 'borrado-linea',
        type: 'line',
        source: 'borrado',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': ROJO, 'line-width': 7 },
      });
      instancia.addLayer({
        id: 'crudo-linea',
        type: 'line',
        source: 'crudo',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': AMARILLO, 'line-width': 5, 'line-dasharray': [0.4, 1.6] },
      });
      setListo(true);
    };
    // El ultimo 'styledata' puede llegar antes de que isStyleLoaded() de true:
    // 'data' vuelve a probar con cada tesela y la guarda evita repetir.
    instancia.on('styledata', preparar);
    instancia.on('data', preparar);
    instancia.on('load', preparar);

    // --- El lapiz, el menu y mantener presionado --------------------------
    const lienzo = instancia.getCanvasContainer();
    const activos = new Set<number>();
    let trazo: PuntoGeo[] | null = null;
    let goma: { puntos: PuntoGeo[]; radio: number } | null = null;
    let cuadro = 0;
    let presion: { x: number; y: number; temporizador: number } | null = null;

    // Las medidas salen del contenedor del mapa: el del lienzo mide 0 de alto.
    const marco = instancia.getContainer();
    const enPantalla = (e: PointerEvent): [number, number] => {
      const caja = marco.getBoundingClientRect();
      return [e.clientX - caja.left, e.clientY - caja.top];
    };
    const aPunto = (xy: [number, number]): PuntoGeo => {
      const { lat, lng } = instancia.unproject(xy);
      return { latitud: lat, longitud: lng };
    };
    const pintarCrudo = (puntos: PuntoGeo[]) =>
      (instancia.getSource('crudo') as GeoJSONSource | undefined)?.setData(linea(puntos));
    const pintarBorrado = (partes: PuntoGeo[][]) =>
      (instancia.getSource('borrado') as GeoJSONSource | undefined)?.setData(lineas(partes));
    // Lo que se va a borrar se recalcula una vez por cuadro, no con cada movimiento.
    const marcarBorrado = () => {
      if (cuadro) return;
      cuadro = window.requestAnimationFrame(() => {
        cuadro = 0;
        if (goma) pintarBorrado(borrar(ultimo.current.trazado, goma.puntos, goma.radio)?.borrados ?? []);
      });
    };
    const soltarPresion = () => {
      if (presion) window.clearTimeout(presion.temporizador);
      presion = null;
    };
    const cancelarTrazo = () => {
      trazo = null;
      pintarCrudo(ultimo.current.pendiente ?? []);
      if (goma) {
        goma = null;
        pintarBorrado([]);
      }
    };
    const abrirMenu = (xy: [number, number]) => {
      if (!ultimo.current.editable) return;
      setMenu({ x: xy[0], y: xy[1], punto: aPunto(xy) });
    };

    const alBajar = (e: PointerEvent) => {
      activos.add(e.pointerId);
      // Dos dedos: el mapa se mueve y se acerca; nada de dibujar.
      if (activos.size > 1) {
        soltarPresion();
        cancelarTrazo();
        return;
      }
      if (e.button !== 0) return;
      setMenu(null);
      const xy = enPantalla(e);
      if (e.pointerType !== 'mouse') {
        presion = {
          x: xy[0],
          y: xy[1],
          temporizador: window.setTimeout(() => {
            presion = null;
            cancelarTrazo();
            abrirMenu(xy);
          }, PRESION_MS),
        };
      }
      const { herramienta, editable, pendiente, trazado } = ultimo.current;
      if (herramienta === 'lapiz' && editable && !pendiente) {
        trazo = [aPunto(xy)];
        lienzo.setPointerCapture?.(e.pointerId);
      }
      if (herramienta === 'borrador' && editable && !pendiente && trazado.length) {
        // El radio en metros depende del acercamiento: se mide al empezar.
        const centro = aPunto(xy);
        goma = { puntos: [centro], radio: metrosEntre(centro, aPunto([xy[0] + RADIO_GOMA_PX, xy[1]])) };
        lienzo.setPointerCapture?.(e.pointerId);
        marcarBorrado();
      }
    };

    const alMover = (e: PointerEvent) => {
      const xy = enPantalla(e);
      if (presion && Math.hypot(xy[0] - presion.x, xy[1] - presion.y) > 10) soltarPresion();
      if ((!trazo && !goma) || activos.size > 1) return;
      if (trazo) {
        trazo.push(aPunto(xy));
        pintarCrudo(trazo);
      }
      if (goma) {
        goma.puntos.push(aPunto(xy));
        marcarBorrado();
      }
      // Ruta larga: cerca del borde el mapa se corre solo para seguir dibujando.
      const { width, height } = marco.getBoundingClientRect();
      const dx = xy[0] < BORDE_PX ? -PASO_PX : xy[0] > width - BORDE_PX ? PASO_PX : 0;
      const dy = xy[1] < BORDE_PX ? -PASO_PX : xy[1] > height - BORDE_PX ? PASO_PX : 0;
      if (dx || dy) instancia.panBy([dx, dy], { duration: 0 });
    };

    const alSubir = (e: PointerEvent) => {
      activos.delete(e.pointerId);
      soltarPresion();
      if (goma) {
        const { puntos, radio } = goma;
        goma = null;
        // Lo marcado en rojo sigue a la vista hasta que el recorrido cambia.
        if (borrar(ultimo.current.trazado, puntos, radio)) ultimo.current.onBorrar(puntos, radio);
        else pintarBorrado([]);
      }
      if (!trazo) return;
      const hecho = trazo;
      trazo = null;
      if (hecho.length >= 3) ultimo.current.onTrazo(hecho);
      else pintarCrudo(ultimo.current.pendiente ?? []);
    };

    const alMenu = (e: MouseEvent) => {
      e.preventDefault();
      cancelarTrazo();
      const caja = marco.getBoundingClientRect();
      abrirMenu([e.clientX - caja.left, e.clientY - caja.top]);
    };

    lienzo.addEventListener('pointerdown', alBajar);
    lienzo.addEventListener('pointermove', alMover);
    lienzo.addEventListener('pointerup', alSubir);
    lienzo.addEventListener('pointercancel', alSubir);
    lienzo.addEventListener('contextmenu', alMenu);
    mapa.current = instancia;
    // Asa para depurar desde la consola del navegador. Solo en desarrollo.
    if (import.meta.env.DEV) {
      (window as unknown as { __mapaDibujo?: MapaLibre }).__mapaDibujo = instancia;
    }

    return () => {
      soltarPresion();
      window.cancelAnimationFrame(cuadro);
      lienzo.removeEventListener('pointerdown', alBajar);
      lienzo.removeEventListener('pointermove', alMover);
      lienzo.removeEventListener('pointerup', alSubir);
      lienzo.removeEventListener('pointercancel', alSubir);
      lienzo.removeEventListener('contextmenu', alMenu);
      instancia.remove();
      mapa.current = null;
    };
  }, []);

  // Con el lapiz o el borrador, un dedo (o el mouse) dibuja o borra: el mapa
  // no se arrastra.
  useEffect(() => {
    const instancia = mapa.current;
    if (!instancia) return;
    const herramienta = props.editable ? props.herramienta : 'mano';
    if (herramienta === 'mano') instancia.dragPan.enable();
    else instancia.dragPan.disable();
    // Los cursores propios (MapaDeDibujo.css) cuelgan de estas clases.
    const lienzo = instancia.getCanvasContainer();
    for (const h of ['lapiz', 'borrador', 'mano'] as const) {
      lienzo.classList.toggle(`mapa-dibujo__lienzo--${h}`, h === herramienta);
    }
  }, [props.herramienta, props.editable, listo]);

  // La linea del recorrido.
  useEffect(() => {
    const instancia = mapa.current;
    if (!listo || !instancia) return;
    (instancia.getSource('trazado') as GeoJSONSource | undefined)?.setData(linea(props.trazado));

    marcadoresExtremos.current.forEach((m) => m.remove());
    marcadoresExtremos.current = [];
    const inicio = props.trazado[0];
    const fin = props.trazado.at(-1);
    if (inicio) {
      const e = document.createElement('span');
      e.className = 'mapa-dibujo__inicio';
      e.textContent = 'Inicio';
      marcadoresExtremos.current.push(new Marker({ element: e, anchor: 'top', offset: [0, 10] }).setLngLat([inicio.longitud, inicio.latitud]).addTo(instancia));
    }
    if (fin && props.trazado.length > 1) {
      const e = document.createElement('span');
      e.className = 'mapa-dibujo__fin';
      e.title = 'El siguiente trazo sigue desde aquí';
      marcadoresExtremos.current.push(new Marker({ element: e }).setLngLat([fin.longitud, fin.latitud]).addTo(instancia));
    }
  }, [props.trazado, listo]);

  // Lo marcado por el borrador se quita cuando el recorrido ya cambio o cuando
  // no hay nada ajustandose (unir un hueco en medio va por la red).
  useEffect(() => {
    const instancia = mapa.current;
    if (!listo || !instancia || props.pendiente) return;
    (instancia.getSource('borrado') as GeoJSONSource | undefined)?.setData(lineas([]));
  }, [props.trazado, props.pendiente, listo]);

  // El trazo a mano que se esta ajustando.
  useEffect(() => {
    const instancia = mapa.current;
    if (!listo || !instancia) return;
    (instancia.getSource('crudo') as GeoJSONSource | undefined)?.setData(linea(props.pendiente ?? []));
  }, [props.pendiente, listo]);

  // Las paradas, numeradas; con la Mano se arrastran.
  useEffect(() => {
    const instancia = mapa.current;
    if (!listo || !instancia) return;
    marcadoresParada.current.forEach((m) => m.remove());
    const arrastrables = props.editable && props.herramienta === 'mano';
    marcadoresParada.current = props.paradas.map((p) => {
      const elemento = document.createElement('span');
      elemento.className = 'mapa-dibujo__parada';
      elemento.textContent = String(p.orden);
      elemento.title = p.nombre;
      elemento.setAttribute('aria-label', `Parada ${p.orden}: ${p.nombre}`);
      const marcador = new Marker({ element: elemento, draggable: arrastrables })
        .setLngLat([p.longitud, p.latitud])
        .addTo(instancia);
      marcador.on('dragend', () => {
        const { lat, lng } = marcador.getLngLat();
        ultimo.current.onMoverParada(p.id, { latitud: lat, longitud: lng });
      });
      return marcador;
    });
  }, [props.paradas, props.editable, props.herramienta, listo]);

  // Encuadre al abrir la ruta.
  useEffect(() => {
    if (!listo) return;
    encuadrar(mapa.current, props.trazado, props.paradas, 0);
    // Solo al abrir otra ruta, no con cada trazo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.claveEncuadre, listo]);

  useEffect(() => {
    if (!props.control) return;
    props.control.current = {
      verTodo: () => encuadrar(mapa.current, ultimo.current.trazado, ultimo.current.paradas, 500),
    };
  }, [props.control]);

  if (sinMapa) {
    return (
      <div className="mapa-dibujo mapa-dibujo--sin-mapa">
        Este navegador no puede mostrar el mapa (necesita WebGL2). Abrí el panel en otro navegador para dibujar rutas.
      </div>
    );
  }

  return (
    <div className="mapa-dibujo">
      <div ref={contenedor} className="mapa-dibujo__lienzo" aria-label="Mapa para dibujar la ruta" />
      {menu && (
        <div
          role="menu"
          aria-label="Acciones en este punto del mapa"
          className="mapa-dibujo__menu"
          style={{ left: menu.x, top: menu.y }}
        >
          <button
            type="button"
            role="menuitem"
            className="mapa-dibujo__opcion mapa-dibujo__opcion--principal"
            autoFocus
            onClick={() => {
              setMenu(null);
              ultimo.current.onCrearParada(menu.punto);
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z" />
              <path d="M12 7v6M9 10h6" />
            </svg>
            Crear parada aquí
          </button>
          <button type="button" role="menuitem" className="mapa-dibujo__opcion" onClick={() => setMenu(null)}>
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

function linea(puntos: PuntoGeo[]) {
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'LineString' as const, coordinates: puntos.map((p) => [p.longitud, p.latitud]) },
  };
}

function lineas(partes: PuntoGeo[][]) {
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'MultiLineString' as const,
      coordinates: partes.map((puntos) => puntos.map((p) => [p.longitud, p.latitud])),
    },
  };
}

function encuadrar(instancia: MapaLibre | null, trazado: PuntoGeo[], paradas: PuntoGeo[], duracion: number) {
  if (!instancia) return;
  const puntos = [...trazado, ...paradas];
  if (puntos.length === 0) {
    instancia.easeTo({ center: CENTRO_JALAPA, zoom: 14.5, duration: duracion });
    return;
  }
  const limites = new LngLatBounds();
  puntos.forEach((p) => limites.extend([p.longitud, p.latitud]));
  instancia.fitBounds(limites, { padding: 64, duration: duracion, maxZoom: 17 });
}
