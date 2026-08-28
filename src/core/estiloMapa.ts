import type { StyleSpecification } from 'maplibre-gl';

/**
 * Estilo base del mapa: tiles reales de OpenStreetMap.
 *
 * <p>HU-50 pide MapLibre con PMTiles, pero ese archivo lo genera y publica
 * DevOps y todavia no existe. Mientras tanto se usan los tiles raster estandar
 * de OSM, que dan el mapa real sin depender de ningun archivo ni de ninguna
 * llave de API.
 *
 * <p>ATENCION antes de desplegar: la politica de uso de tile.openstreetmap.org
 * no permite trafico de produccion. Para QA y produccion hay que apuntar a los
 * PMTiles de Jalapa cuando esten publicados; se cambia solo esta funcion.
 */

const ATRIBUCION = '© OpenStreetMap';

/** Los tiles estandar de OSM. Solo para desarrollo y demo. */
export function estiloOpenStreetMap(): StyleSpecification {
  return {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: [
          'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
          'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
          'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
        ],
        tileSize: 256,
        // Requisito de licencia, y ademas MapLibre lo muestra solo.
        attribution: ATRIBUCION,
        maxzoom: 19,
      },
    },
    layers: [
      {
        id: 'osm',
        type: 'raster',
        source: 'osm',
        paint: {
          // DESIGN.md seccion 8: solo la ruta, el bus y tu parada llevan color
          // saturado. El fondo se apaga para que el dato principal gane.
          'raster-saturation': -0.35,
          'raster-contrast': -0.05,
        },
      },
    ],
  };
}

/**
 * El mismo mapa en modo oscuro.
 *
 * <p>DESIGN.md seccion 3.5 no admite invertir el modo claro. Con tiles raster no
 * hay tokens que redefinir, asi que se ajusta el brillo del propio tile, que es
 * lo mas cerca que se puede estar de un estilo oscuro deliberado sin cambiar de
 * proveedor de tiles.
 */
export function estiloOpenStreetMapOscuro(): StyleSpecification {
  const estilo = estiloOpenStreetMap();
  estilo.layers[0].paint = {
    'raster-brightness-max': 0.4,
    'raster-saturation': -0.6,
    'raster-contrast': 0.15,
  };
  return estilo;
}
