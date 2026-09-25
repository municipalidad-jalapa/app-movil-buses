import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  AttributionControl,
  GeoJSONSource,
  LngLatBounds,
  Map as MapaLibre,
  Marker,
  type LayerSpecification,
  type LngLatLike,
} from 'maplibre-gl';
import type { Feature, GeoJSON as GeoJsonDato } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';
import { recorridoDeRuta } from '../core/recorridoDeRuta';
import { estiloOpenStreetMap, estiloOpenStreetMapOscuro } from '../core/estiloMapa';
import { soportaMapa } from '../core/soporteDeMapa';
import type { Parada, Posicion, Ruta } from '../core/tipos';
import { svgIconoBus } from './IconoBus';

/**
 * El mapa real de OpenStreetMap con la ruta, las paradas y el bus encima.
 *
 * <p>Calco de `design/MapaOSM.dc.html`: trazo con contorno 13/6, paradas como
 * botones con su contador de personas esperando, la parada elegida en amarillo
 * con rombo, el bus y el punto rojo del pasajero. Cada color y medida de este
 * archivo sale de ese artboard.
 */

const VERDE = '#10402A';
const AMARILLO = '#F2B705';
const TINTA_AMARILLO = '#241C00';
const CREMA = '#FBF7F0';
const ROJO = '#8C2B22';
const TINTA = '#1C1A17';
const BORDE = '#DDD3C2';

const FUENTE_RUTA = 'ruta';

/**
 * Lo que tapan los avisos de arriba y la hoja de abajo, en px. El mapa lo
 * resta al encuadrar y al centrar, para que la ruta y la parada queden en la
 * franja que de verdad se ve (QA: en pantallas chicas los avisos tapaban la
 * ruta entera).
 */
export interface MargenesMapa {
  arriba: number;
  abajo: number;
}

const SIN_MARGENES: MargenesMapa = { arriba: 0, abajo: 220 };

/** Por debajo de este zoom las paradas se achican y esconden su contador. */
const ZOOM_CERCA = 14.5;

/** Acciones que la pantalla pide al mapa: los botones flotantes del diseno. */
export interface ControlMapa {
  /** "Ver el bus": centra en el bus a zoom 15.2. */
  verBus(): void;
  /** Centra en una parada, dejando sitio a la hoja. */
  verParada(id: number): void;
  /** Vuelve a encuadrar la ruta entera. */
  verRuta(): void;
  /** Centra en un punto cualquiera, como la ubicacion del pasajero. */
  verPunto(latitud: number, longitud: number): void;
}

interface Props {
  ruta: Ruta | null;
  posicionBus: Posicion | null;
  /** Dato de mas de 5 min: el bus se atenua (DESIGN.md §7). */
  busRancio?: boolean;
  oscuro: boolean;
  /** La parada elegida o reservada: amarilla, con rombo. */
  paradaElegidaId?: number | null;
  /** paradaId -> personas esperando. La que falte se muestra en 0. */
  esperandoPorParada?: ReadonlyMap<number, number>;
  /** El punto rojo "yo". Solo si el pasajero compartio su ubicacion. */
  ubicacionPasajero?: { latitud: number; longitud: number } | null;
  onElegirParada?: (id: number) => void;
  control?: RefObject<ControlMapa | null>;
  /** Cuanto tapan hoy los avisos y la hoja. Se consulta en cada movimiento. */
  obtenerMargenes?: () => MargenesMapa;
  /**
   * El mapa no se pudo crear. Pasa de verdad: MapLibre necesita WebGL2 y hay
   * telefonos de gama baja que no lo traen, que es justo el publico de esta app
   * (DESIGN.md seccion 1). Quien llama debe caer al croquis.
   */
  onNoDisponible?: () => void;
}

export function MapaOpenStreetMap({
  ruta,
  posicionBus,
  busRancio = false,
  oscuro,
  paradaElegidaId = null,
  esperandoPorParada,
  ubicacionPasajero = null,
  onElegirParada,
  control,
  obtenerMargenes,
  onNoDisponible,
}: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaLibre | null>(null);
  const marcadorBus = useRef<Marker | null>(null);
  const marcadorYo = useRef<Marker | null>(null);
  const marcadoresParada = useRef<Marker[]>([]);
  /** La ruta que ya se encuadro. Al elegir otra, se vuelve a encuadrar. */
  const rutaEncuadrada = useRef<number | null>(null);
  const elegidaAlAbrir = useRef(paradaElegidaId);
  // El manejador cambia en cada render; los marcadores llaman siempre al ultimo.
  const alElegir = useRef(onElegirParada);
  useEffect(() => {
    alElegir.current = onElegirParada;
  }, [onElegirParada]);
  const margenes = useRef(obtenerMargenes);
  useEffect(() => {
    margenes.current = obtenerMargenes;
  }, [obtenerMargenes]);
  const margenesActuales = () => margenes.current?.() ?? SIN_MARGENES;
  /**
   * El mapa ya cargo su estilo.
   *
   * <p>Hace falta como estado y no como `once('load')`: la ruta llega por red y
   * puede aterrizar DESPUES de que el mapa haya cargado, y entonces un `once`
   * ya disparado no vuelve a ejecutarse y la ruta nunca se dibuja.
   */
  const [listo, setListo] = useState(false);
  /**
   * El mapa ya nace con el estilo correcto, asi que el efecto del modo NO debe
   * hacer nada la primera vez. Si lo hiciera, llamaria a setStyle() mientras el
   * estilo aun carga, MapLibre lo reconstruiria entero y se llevaria por delante
   * las capas de la ruta: el mapa aparece, pero sin ruta.
   */
  const modoAplicado = useRef(oscuro);

  // --- Crear el mapa una sola vez -----------------------------------------
  useEffect(() => {
    if (!contenedor.current || mapa.current) return;

    if (!soportaMapa()) {
      onNoDisponible?.();
      return;
    }

    let instancia: MapaLibre;
    try {
      instancia = new MapaLibre({
        container: contenedor.current,
        style: oscuro ? estiloOpenStreetMapOscuro() : estiloOpenStreetMap(),
        center: [-89.9885, 14.6355], // Jalapa, hasta que lleguen las paradas
        zoom: 14.6,
        // La atribucion se agrega abajo, a la izquierda: a la derecha la tapan
        // los botones redondos.
        attributionControl: false,
        // Como el diseno: el mapa se arrastra y se acerca, no se gira.
        dragRotate: false,
        pitchWithRotate: false,
      });
    } catch {
      // Sin WebGL2 no hay mapa. No es un error que mostrar al pasajero: se cae
      // al croquis, que ensena lo mismo y pesa menos.
      onNoDisponible?.();
      return;
    }

    // MapLibre no siempre lanza al fallar el arranque de la GPU: a veces lo
    // emite como evento. Hay que escuchar los dos caminos o la app se queda con
    // un mapa en blanco y sin decir nada.
    instancia.on('error', (e) => {
      const mensaje = String((e as { error?: unknown }).error ?? '');
      if (/webgl|gpu/i.test(mensaje)) onNoDisponible?.();
    });

    // Listo apenas carga el ESTILO, no con 'load': 'load' espera a que bajen
    // todas las teselas iniciales, y con una sola que se cuelgue en el
    // servidor de OSM la ruta y las paradas no se dibujaban nunca.
    const marcarListo = () => {
      if (instancia.isStyleLoaded()) setListo(true);
    };
    instancia.on('styledata', marcarListo);
    instancia.on('load', () => setListo(true));

    // Lejos, las paradas se amontonan y sus contadores se tapan entre si:
    // se achican y el contador espera a que la persona se acerque.
    const marcarDistancia = () =>
      contenedor.current?.classList.toggle('mapa-jalapa__capa--lejos', instancia.getZoom() < ZOOM_CERCA);
    instancia.on('zoom', marcarDistancia);
    marcarDistancia();

    // Asa para depurar desde la consola del navegador. Solo en desarrollo.
    if (import.meta.env.DEV) {
      (window as unknown as { __mapa?: MapaLibre }).__mapa = instancia;
    }

    // Siempre visible y sin plegar: es requisito de licencia, no un detalle
    // visual (DESIGN.md seccion 8).
    instancia.addControl(new AttributionControl({ compact: false }), 'bottom-left');
    mapa.current = instancia;

    return () => {
      instancia.remove();
      mapa.current = null;
      marcadorBus.current = null;
      marcadorYo.current = null;
      marcadoresParada.current = [];
      setListo(false);
    };
    // El modo se aplica en su propio efecto; aqui solo se crea el mapa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Modo claro / oscuro -------------------------------------------------
  useEffect(() => {
    const instancia = mapa.current;
    if (!instancia || modoAplicado.current === oscuro) return;
    modoAplicado.current = oscuro;

    instancia.setStyle(oscuro ? estiloOpenStreetMapOscuro() : estiloOpenStreetMap());
    // Cambiar el estilo borra las capas propias: se vuelven a poner al cargar.
    instancia.once('styledata', () => pintarRuta(instancia, ruta));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oscuro]);

  // --- El trazo de la ruta -------------------------------------------------
  useEffect(() => {
    const instancia = mapa.current;
    if (!instancia || !listo || !ruta) return;

    pintarRuta(instancia, ruta);

    // El encuadre se hace UNA vez: si se rehiciera con cada dato nuevo, el mapa
    // saltaria bajo el dedo y seria imposible de seguir.
    // Si se llega con una parada ya elegida (el QR de la parada, o una reserva
    // vigente), se abre sobre ella, como R2; si no, con la ruta entera.
    if (rutaEncuadrada.current !== ruta.id) {
      // Solo la primera vez se abre sobre la parada del QR o de la reserva; al
      // cambiar de ruta se muestra la ruta nueva entera.
      const primeraVez = rutaEncuadrada.current === null;
      const elegida = primeraVez ? ruta.paradas.find((p) => p.id === elegidaAlAbrir.current) : undefined;
      if (elegida) {
        instancia.easeTo({
          center: [elegida.longitud, elegida.latitud],
          zoom: 15.2,
          offset: desplazamiento(margenesActuales()),
          duration: 0,
        });
      } else {
        encuadrarRuta(instancia, ruta, primeraVez ? 0 : 600, margenesActuales());
      }
      rutaEncuadrada.current = ruta.id;
    }
    // margenesActuales lee un ref: no hace falta como dependencia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruta, listo]);

  // --- Las paradas con su contador ----------------------------------------
  useEffect(() => {
    const instancia = mapa.current;
    if (!instancia || !listo || !ruta) return;

    marcadoresParada.current.forEach((m) => m.remove());
    marcadoresParada.current = ruta.paradas.map((p) =>
      new Marker({
        element: elementoDeParada(p, esperandoPorParada?.get(p.id) ?? 0, p.id === paradaElegidaId, () =>
          alElegir.current?.(p.id),
        ),
        anchor: 'bottom',
      })
        .setLngLat([p.longitud, p.latitud])
        .addTo(instancia),
    );
  }, [ruta, listo, paradaElegidaId, esperandoPorParada]);

  // --- El bus --------------------------------------------------------------
  useEffect(() => {
    const instancia = mapa.current;
    if (!instancia || !listo) return;

    // Sin posicion (por ejemplo, recien cambiada la ruta) no queda el bus de la
    // ruta anterior dibujado en el mapa.
    if (!posicionBus) {
      marcadorBus.current?.remove();
      marcadorBus.current = null;
      return;
    }

    const donde: LngLatLike = [posicionBus.longitud, posicionBus.latitud];

    if (!marcadorBus.current) {
      marcadorBus.current = new Marker({ element: elementoDelBus() }).setLngLat(donde).addTo(instancia);
      return;
    }
    // Mover el marcador existente, no crear otro: el bus se desliza en vez de
    // aparecer en otro lado (DESIGN.md seccion 8).
    marcadorBus.current.setLngLat(donde);
  }, [posicionBus, listo]);

  useEffect(() => {
    const nodo = marcadorBus.current?.getElement();
    if (nodo) nodo.style.opacity = busRancio ? '0.5' : '1';
  }, [busRancio, posicionBus]);

  // --- El pasajero ---------------------------------------------------------
  useEffect(() => {
    const instancia = mapa.current;
    if (!instancia || !listo) return;

    if (!ubicacionPasajero) {
      marcadorYo.current?.remove();
      marcadorYo.current = null;
      return;
    }
    const donde: LngLatLike = [ubicacionPasajero.longitud, ubicacionPasajero.latitud];
    if (marcadorYo.current) marcadorYo.current.setLngLat(donde);
    else marcadorYo.current = new Marker({ element: elementoYo() }).setLngLat(donde).addTo(instancia);
  }, [ubicacionPasajero, listo]);

  // --- Acciones que pide la pantalla --------------------------------------
  useEffect(() => {
    if (!control) return;
    control.current = {
      verBus() {
        if (!mapa.current || !posicionBus) return;
        mapa.current.easeTo({
          center: [posicionBus.longitud, posicionBus.latitud],
          zoom: 15.2,
          offset: desplazamiento(margenesActuales()),
          duration: 700,
        });
      },
      verParada(id) {
        const p = ruta?.paradas.find((x) => x.id === id);
        if (!mapa.current || !p) return;
        mapa.current.easeTo({
          center: [p.longitud, p.latitud],
          // Al elegir se acerca lo justo para leer las calles de alrededor.
          zoom: Math.max(mapa.current.getZoom(), ZOOM_CERCA + 0.2),
          offset: desplazamiento(margenesActuales()),
          duration: 600,
        });
      },
      verRuta() {
        if (mapa.current && ruta) encuadrarRuta(mapa.current, ruta, 600, margenesActuales());
      },
      verPunto(latitud, longitud) {
        if (!mapa.current) return;
        mapa.current.easeTo({
          center: [longitud, latitud],
          zoom: Math.max(mapa.current.getZoom(), 16),
          offset: desplazamiento(margenesActuales()),
          duration: 700,
        });
      },
    };
    // margenesActuales lee un ref: no hace falta como dependencia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [control, posicionBus, ruta]);

  return (
    <div
      ref={contenedor}
      className={oscuro ? 'mapa-jalapa__capa' : 'mapa-jalapa__capa mapa-jalapa__capa--calida'}
      aria-label="Mapa de Jalapa con la ruta del bus"
    />
  );
}

/** El centro visible no es el del lienzo: sube o baja segun lo que tapan. */
function desplazamiento(m: MargenesMapa): [number, number] {
  return [0, Math.round((m.arriba - m.abajo) / 2)];
}

function encuadrarRuta(instancia: MapaLibre, ruta: Ruta, duracion: number, m: MargenesMapa) {
  const puntos = recorridoDeRuta(ruta);
  if (puntos.length === 0) return;
  const limites = new LngLatBounds();
  puntos.forEach((p) => limites.extend([p.longitud, p.latitud]));

  // Arriba y abajo se descuenta lo que tapan avisos y hoja; a la derecha, los
  // botones redondos. Si el telefono es tan chico que no queda franja util, se
  // reparte lo que hay: mejor la ruta un poco tapada que un encuadre roto.
  const { clientWidth: ancho, clientHeight: alto } = instancia.getContainer();
  let arriba = m.arriba + 20;
  let abajo = m.abajo + 20;
  const franjaMinima = 140;
  if (alto > 0 && alto - arriba - abajo < franjaMinima) {
    const escala = Math.max(0, alto - franjaMinima) / Math.max(1, arriba + abajo);
    arriba = Math.round(arriba * escala);
    abajo = Math.round(abajo * escala);
  }
  instancia.fitBounds(limites, {
    padding: { top: arriba, right: ancho > 0 && ancho < 420 ? 72 : 88, bottom: abajo, left: 28 },
    duration: duracion,
    maxZoom: 16.5,
  });
}

/** El trazo: contorno crema de 13 px y linea verde de 6 px, como MapaOSM. */
function pintarRuta(instancia: MapaLibre, ruta: Ruta | null) {
  if (!ruta) return;

  const linea: Feature = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: recorridoDeRuta(ruta).map((p) => [p.longitud, p.latitud]),
    },
  };

  const existente = instancia.getSource(FUENTE_RUTA) as GeoJSONSource | undefined;
  if (existente) existente.setData(linea as GeoJsonDato);
  else instancia.addSource(FUENTE_RUTA, { type: 'geojson', data: linea as GeoJsonDato });

  ponerCapa(instancia, {
    id: 'ruta-casing',
    type: 'line',
    source: FUENTE_RUTA,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    // Mas finas de lejos, para que la ruta no tape las calles que cruza.
    paint: { 'line-color': CREMA, 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 7, 15, 12, 18, 18] },
  });
  ponerCapa(instancia, {
    id: 'ruta-linea',
    type: 'line',
    source: FUENTE_RUTA,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': VERDE, 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 3, 15, 6, 18, 9] },
  });
}

function ponerCapa(instancia: MapaLibre, capa: LayerSpecification) {
  if (!instancia.getLayer(capa.id)) instancia.addLayer(capa);
}

/**
 * Una parada: boton con el nodo y, debajo, cuantas personas esperan. La
 * elegida cambia color, forma y tamano a la vez, nunca solo el color.
 */
export function elementoDeParada(
  parada: Pick<Parada, 'id' | 'nombre'>,
  esperando: number,
  elegida: boolean,
  alTocar: () => void,
): HTMLElement {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'marcador-parada';
  // Selector estable para pruebas automatizadas (QA, ronda 2).
  boton.dataset.testid = `parada-${parada.id}`;
  boton.setAttribute(
    'aria-label',
    `${parada.nombre}, ${esperando} ${esperando === 1 ? 'persona esperando' : 'personas esperando'}`,
  );
  boton.setAttribute('aria-pressed', String(elegida));
  boton.style.cssText =
    'display:flex;flex-direction:column;align-items:center;gap:2px;background:none;border:none;' +
    'padding:0;min-height:0;cursor:pointer;font-family:var(--fuente)';

  const nodo = document.createElement('span');
  nodo.className = elegida ? 'marcador-parada__nodo marcador-parada__nodo--elegida' : 'marcador-parada__nodo';
  if (elegida) {
    nodo.style.cssText =
      `width:44px;height:44px;border-radius:999px;background:${AMARILLO};border:4px solid ${TINTA_AMARILLO};` +
      `display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 3px ${CREMA};box-sizing:border-box`;
    const rombo = document.createElement('span');
    rombo.style.cssText = `width:15px;height:15px;background:${TINTA_AMARILLO};transform:rotate(45deg)`;
    nodo.appendChild(rombo);
  } else {
    nodo.style.cssText =
      `width:26px;height:26px;border-radius:999px;background:${CREMA};border:6px solid ${VERDE};box-sizing:border-box`;
  }

  const numero = document.createElement('span');
  numero.className = 'marcador-parada__numero';
  numero.textContent = String(esperando);
  numero.style.cssText =
    `font-size:${elegida ? '17px' : '14px'};font-weight:800;color:${TINTA};background:${CREMA};` +
    `border:1px solid ${BORDE};border-radius:6px 2px 6px 2px;padding:1px 6px;` +
    'font-variant-numeric:tabular-nums;line-height:1.3';

  boton.append(nodo, numero);
  boton.addEventListener('click', (e) => {
    e.stopPropagation();
    alTocar();
  });
  return boton;
}

/** El bus: circulo verde de 46 px con borde crema. */
function elementoDelBus(): HTMLElement {
  const nodo = document.createElement('div');
  nodo.className = 'marcador-bus';
  nodo.dataset.testid = 'bus';
  nodo.setAttribute('role', 'img');
  nodo.setAttribute('aria-label', 'Dónde va el bus');
  nodo.style.cssText =
    `width:46px;height:46px;border-radius:999px;background:${VERDE};border:4px solid ${CREMA};` +
    'display:flex;align-items:center;justify-content:center;box-sizing:border-box';
  nodo.innerHTML =
    svgIconoBus(CREMA, 22, 2.2);
  return nodo;
}

/** El pasajero: punto rojo de 20 px con borde crema. */
function elementoYo(): HTMLElement {
  const nodo = document.createElement('div');
  nodo.setAttribute('role', 'img');
  nodo.setAttribute('aria-label', 'Dónde estás');
  nodo.dataset.testid = 'yo';
  nodo.style.cssText =
    `width:20px;height:20px;border-radius:999px;background:${ROJO};border:4px solid ${CREMA};box-sizing:border-box`;
  return nodo;
}
