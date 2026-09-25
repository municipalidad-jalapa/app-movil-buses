import type { StyleSpecification } from 'maplibre-gl';

/**
 * Estilo base del mapa: teselas raster hechas con los datos de OpenStreetMap.
 *
 * <p>QA (Ecoruta_DESARROLLO, "Mapa de Jalapa"): el mapa se veia pero no era
 * legible. La causa no eran las teselas sino lo que se les ponia encima: un
 * filtro sepia que les quitaba contraste (ver MapaJalapa.css) y paradas que se
 * pisaban a zoom de ciudad. Por defecto siguen las teselas estandar de OSM.
 *
 * <p>La politica de tile.openstreetmap.org no admite trafico de un servicio en
 * produccion, asi que el proveedor se cambia sin tocar codigo con
 * `VITE_MAPA_TESELAS` (y `VITE_MAPA_TESELAS_OSCURO`, `VITE_MAPA_ATRIBUCION`):
 * una o varias URL con `{z}/{x}/{y}` separadas por coma. URL con `@2x` se
 * tratan como teselas de 512 px, para pantallas densas.
 */

const OSM_ESTANDAR = ['a', 'b', 'c'].map((s) => `https://${s}.tile.openstreetmap.org/{z}/{x}/{y}.png`);

/** Requisito de licencia. */
const ATRIBUCION_POR_DEFECTO = '© OpenStreetMap';

function urlsDe(variable: unknown, porDefecto: string[]): string[] {
  const texto = typeof variable === 'string' ? variable.trim() : '';
  if (!texto) return porDefecto;
  return texto
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
}

/** Las @2x traen 512 px por tesela; las URL propias se asumen de 256. */
function tamanoDe(urls: string[]): number {
  return urls.every((u) => u.includes('@2x')) ? 512 : 256;
}

function estiloRaster(urls: string[], atribucion: string): StyleSpecification {
  return {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: urls,
        tileSize: tamanoDe(urls),
        // Requisito de licencia, y ademas MapLibre lo muestra solo.
        attribution: atribucion,
        maxzoom: 19,
      },
    },
    layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
  };
}

function atribucion(): string {
  const propia = import.meta.env.VITE_MAPA_ATRIBUCION;
  return typeof propia === 'string' && propia.trim() ? propia.trim() : ATRIBUCION_POR_DEFECTO;
}

/** El mapa claro. */
export function estiloOpenStreetMap(): StyleSpecification {
  return estiloRaster(urlsDe(import.meta.env.VITE_MAPA_TESELAS, OSM_ESTANDAR), atribucion());
}

/**
 * El mismo mapa en modo oscuro.
 *
 * <p>Con teselas propias para oscuro (`VITE_MAPA_TESELAS_OSCURO`) se usan tal
 * cual. Si no, se oscurece el tile claro: DESIGN.md seccion 3.5 no admite
 * invertirlo, asi que se baja el brillo sin perder la lectura de las calles.
 */
export function estiloOpenStreetMapOscuro(): StyleSpecification {
  const propias = urlsDe(import.meta.env.VITE_MAPA_TESELAS_OSCURO, []);
  if (propias.length > 0) return estiloRaster(propias, atribucion());
  const estilo = estiloOpenStreetMap();
  estilo.layers[0].paint = {
    'raster-brightness-max': 0.55,
    'raster-saturation': -0.5,
    'raster-contrast': 0.2,
  };
  return estilo;
}
