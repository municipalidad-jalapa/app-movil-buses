import { useEffect, useRef, useState } from 'react';
import {
  GeoJSONSource,
  LngLatBounds,
  Map as MapaLibre,
  Marker,
  NavigationControl,
  Popup,
  type LayerSpecification,
  type LngLatLike,
} from 'maplibre-gl';
import type {
  Feature,
  FeatureCollection,
  GeoJSON as GeoJsonDato,
} from 'geojson';

import 'maplibre-gl/dist/maplibre-gl.css';

import { recorridoDeRuta } from '../core/recorridoDeRuta';
import {
  estiloOpenStreetMap,
  estiloOpenStreetMapOscuro,
} from '../core/estiloMapa';
import { soportaMapa } from '../core/soporteDeMapa';
import type { Posicion, Ruta } from '../core/tipos';

/**
 * El mapa real de OpenStreetMap con la ruta, las paradas y el bus encima.
 *
 * <p>Los colores, grosores y formas son los del mock
 * `design/MapaJalapa.dc.html`;
 * lo unico que cambia respecto a el es que el fondo son tiles de verdad
 * en lugar de un dibujo propio.
 */

/** Del mock: verde del trazo y del bus. */
const VERDE_RUTA = '#10402A';
const AMARILLO = '#F2B705';
const TINTA_AMARILLO = '#241C00';
const CONTORNO = '#FBF7F0';

const FUENTE_RUTA = 'ruta';
const FUENTE_PARADAS = 'paradas';

interface Props {
  ruta: Ruta | null;
  posicionBus: Posicion | null;
  oscuro: boolean;

  /** Parada elegida actualmente por el pasajero. */
  paradaTuyaId?: number | null;

  /** Informa al componente padre qué parada seleccionó el pasajero. */
  onSeleccionarParada?: (paradaId: number) => void;

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
  oscuro,
  paradaTuyaId = null,
  onSeleccionarParada,
  onNoDisponible,
}: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaLibre | null>(null);
  const marcadorBus = useRef<Marker | null>(null);
  const encuadrado = useRef(false);
  const popupPuesto = useRef(false);

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
   * las capas de la ruta: el mapa aparece, pero sin ruta ni paradas.
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
        style: oscuro
          ? estiloOpenStreetMapOscuro()
          : estiloOpenStreetMap(),
        center: [-89.9885, 14.6355], // Jalapa, hasta que lleguen las paradas
        zoom: 14,

        // La atribucion va siempre visible y no se puede plegar:
        // es requisito de licencia, no un detalle visual.
        attributionControl: { compact: false },
      });
    } catch {
      // Sin WebGL2 no hay mapa.
      // No es un error que mostrar al pasajero:
      // se cae al croquis, que ensena lo mismo y pesa menos.
      onNoDisponible?.();
      return;
    }

    // MapLibre no siempre lanza al fallar el arranque de la GPU:
    // a veces lo emite como evento.
    instancia.on('error', (e) => {
      const mensaje = String(
        (e as { error?: unknown }).error ?? '',
      );

      if (/webgl|gpu/i.test(mensaje)) {
        onNoDisponible?.();
      }
    });

    instancia.on('load', () => {
      setListo(true);
    });

    // Asa para depurar desde la consola del navegador.
    // Solo en desarrollo.
    if (import.meta.env.DEV) {
      (
        window as unknown as {
          __mapa?: MapaLibre;
        }
      ).__mapa = instancia;
    }

    instancia.addControl(
      new NavigationControl({
        showCompass: false,
      }),
      'top-right',
    );

    mapa.current = instancia;

    return () => {
      instancia.remove();
      mapa.current = null;
      setListo(false);
    };

    // El modo se aplica en su propio efecto;
    // aqui solo se crea el mapa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Modo claro / oscuro -------------------------------------------------
  useEffect(() => {
    const instancia = mapa.current;

    if (!instancia || modoAplicado.current === oscuro) {
      return;
    }

    modoAplicado.current = oscuro;

    instancia.setStyle(
      oscuro
        ? estiloOpenStreetMapOscuro()
        : estiloOpenStreetMap(),
    );

    // Cambiar el estilo borra las capas propias:
    // se vuelven a poner al cargar.
    instancia.once('styledata', () => {
      pintarRuta(
        instancia,
        ruta,
        paradaTuyaId,
        popupPuesto,
        onSeleccionarParada,
      );
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oscuro]);

  // --- La ruta y sus paradas ----------------------------------------------
  useEffect(() => {
    const instancia = mapa.current;

    if (!instancia || !listo || !ruta) {
      return;
    }

    pintarRuta(
      instancia,
      ruta,
      paradaTuyaId,
      popupPuesto,
      onSeleccionarParada,
    );

    // El encuadre se hace UNA vez:
    // si se rehiciera con cada dato nuevo,
    // el mapa saltaria bajo el marcador.
    const paraEncuadrar = recorridoDeRuta(ruta);

    if (!encuadrado.current && paraEncuadrar.length > 0) {
      const limites = new LngLatBounds();

      paraEncuadrar.forEach((p) => {
        limites.extend([
          p.longitud,
          p.latitud,
        ]);
      });

      instancia.fitBounds(limites, {
        padding: 72,
        duration: 0,
        maxZoom: 16,
      });

      encuadrado.current = true;
    }
  }, [
    ruta,
    paradaTuyaId,
    listo,
    onSeleccionarParada,
  ]);

  // --- El bus --------------------------------------------------------------
  useEffect(() => {
    const instancia = mapa.current;

    if (!instancia || !listo || !posicionBus) {
      return;
    }

    const donde: LngLatLike = [
      posicionBus.longitud,
      posicionBus.latitud,
    ];

    if (!marcadorBus.current) {
      marcadorBus.current = new Marker({
        element: elementoDelBus(),
      })
        .setLngLat(donde)
        .addTo(instancia);

      return;
    }

    // Mover el marcador existente, no crear otro.
    marcadorBus.current.setLngLat(donde);
  }, [posicionBus, listo]);

  return (
    <div
      ref={contenedor}
      className="mapa-jalapa__capa"
      aria-label="Mapa de Jalapa con la ruta del bus"
    />
  );
}

/**
 * Dibuja la linea de la ruta y los circulos de las paradas.
 */
function pintarRuta(
  instancia: MapaLibre,
  ruta: Ruta | null,
  paradaTuyaId: number | null,
  popupPuesto: { current: boolean },
  onSeleccionarParada?: (paradaId: number) => void,
) {
  if (!ruta) {
    return;
  }

  const recorrido = recorridoDeRuta(ruta);

  const linea: Feature = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: recorrido.map((p) => [
        p.longitud,
        p.latitud,
      ]),
    },
  };

  const paradas: FeatureCollection = {
    type: 'FeatureCollection',

    features: ruta.paradas.map((p) => ({
      type: 'Feature',

      properties: {
        id: p.id,
        nombre: p.nombre,
        tuya: p.id === paradaTuyaId,
      },

      geometry: {
        type: 'Point',
        coordinates: [
          p.longitud,
          p.latitud,
        ],
      },
    })),
  };

  ponerFuente(
    instancia,
    FUENTE_RUTA,
    linea,
  );

  ponerFuente(
    instancia,
    FUENTE_PARADAS,
    paradas,
  );

  // Contorno claro debajo del trazo:
  // lo despega del fondo del mapa.
  ponerCapa(instancia, {
    id: 'ruta-contorno',
    type: 'line',
    source: FUENTE_RUTA,

    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },

    paint: {
      'line-color': CONTORNO,
      'line-width': 16,
    },
  });

  ponerCapa(instancia, {
    id: 'ruta-trazo',
    type: 'line',
    source: FUENTE_RUTA,

    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },

    paint: {
      'line-color': VERDE_RUTA,
      'line-width': 8,
    },
  });

  ponerCapa(instancia, {
    id: 'paradas',
    type: 'circle',
    source: FUENTE_PARADAS,

    filter: [
      '!',
      ['get', 'tuya'],
    ],

    paint: {
      'circle-radius': 9,
      'circle-color': CONTORNO,
      'circle-stroke-color': VERDE_RUTA,
      'circle-stroke-width': 5,
    },
  });

  // Tu parada:
  // mas grande y amarilla.
  ponerCapa(instancia, {
    id: 'parada-tuya',
    type: 'circle',
    source: FUENTE_PARADAS,

    filter: [
      'get',
      'tuya',
    ],

    paint: {
      'circle-radius': 21,
      'circle-color': AMARILLO,
      'circle-stroke-color': TINTA_AMARILLO,
      'circle-stroke-width': 4,
    },
  });

  // Registrar los eventos solo una vez.
  if (!popupPuesto.current) {
    instancia.on('click', 'paradas', (e) => {
      const propiedades =
        e.features?.[0]?.properties;

      const nombre =
        propiedades?.nombre;

      const paradaId =
        Number(propiedades?.id);

      if (
        !nombre ||
        !Number.isFinite(paradaId)
      ) {
        return;
      }

      // Informa al componente padre
      // cual parada eligio el pasajero.
      onSeleccionarParada?.(paradaId);

      new Popup({
        offset: 14,
      })
        .setLngLat(e.lngLat)
        .setText(String(nombre))
        .addTo(instancia);
    });

    instancia.on(
      'mouseenter',
      'paradas',
      () => {
        instancia.getCanvas().style.cursor =
          'pointer';
      },
    );

    instancia.on(
      'mouseleave',
      'paradas',
      () => {
        instancia.getCanvas().style.cursor =
          '';
      },
    );

    popupPuesto.current = true;
  }
}

function ponerFuente(
  instancia: MapaLibre,
  id: string,
  datos: Feature | FeatureCollection,
) {
  const existente =
    instancia.getSource(id) as
      | GeoJSONSource
      | undefined;

  if (existente) {
    existente.setData(
      datos as GeoJsonDato,
    );
  } else {
    instancia.addSource(id, {
      type: 'geojson',
      data: datos as GeoJsonDato,
    });
  }
}

function ponerCapa(
  instancia: MapaLibre,
  capa: LayerSpecification,
) {
  if (!instancia.getLayer(capa.id)) {
    instancia.addLayer(capa);
  }
}

/**
 * El marcador del bus,
 * con la misma forma del mock.
 */
function elementoDelBus(): HTMLElement {
  const nodo =
    document.createElement('div');

  nodo.className = 'marcador-bus';

  nodo.setAttribute(
    'aria-label',
    'Dónde va el bus',
  );

  nodo.innerHTML = `
    <svg
      width="60"
      height="70"
      viewBox="-30 -46 60 70"
      aria-hidden="true"
    >
      <path
        d="M0 -40 L11 -25 L-11 -25 Z"
        fill="${VERDE_RUTA}"
        stroke="${CONTORNO}"
        stroke-width="3"
      />

      <circle
        r="23"
        fill="${VERDE_RUTA}"
        stroke="${CONTORNO}"
        stroke-width="4"
      />

      <g transform="translate(-11,-11)">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="${CONTORNO}"
          stroke-width="2.2"
          stroke-linecap="round"
        >
          <rect
            x="3"
            y="5"
            width="18"
            height="11"
            rx="2"
          />

          <path
            d="M3 11h18M7 20v-2M17 20v-2"
          />
        </svg>
      </g>
    </svg>
  `;

  return nodo;
}