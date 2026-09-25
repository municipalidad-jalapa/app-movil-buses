import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RasterSourceSpecification } from 'maplibre-gl';
import { estiloOpenStreetMap, estiloOpenStreetMapOscuro } from './estiloMapa';

function fuente(estilo: ReturnType<typeof estiloOpenStreetMap>): RasterSourceSpecification {
  return estilo.sources.osm as RasterSourceSpecification;
}

describe('estiloMapa', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sin configuracion usa las teselas estandar de OSM con su atribucion', () => {
    const osm = fuente(estiloOpenStreetMap());
    expect(osm.tiles?.[0]).toContain('tile.openstreetmap.org');
    expect(osm.tileSize).toBe(256);
    expect(osm.attribution).toBe('© OpenStreetMap');
  });

  it('VITE_MAPA_TESELAS cambia el proveedor sin tocar codigo', () => {
    vi.stubEnv('VITE_MAPA_TESELAS', 'https://t1.ejemplo.gt/{z}/{x}/{y}@2x.png, https://t2.ejemplo.gt/{z}/{x}/{y}@2x.png');
    vi.stubEnv('VITE_MAPA_ATRIBUCION', '© OpenStreetMap · Municipalidad');
    const osm = fuente(estiloOpenStreetMap());
    expect(osm.tiles).toEqual(['https://t1.ejemplo.gt/{z}/{x}/{y}@2x.png', 'https://t2.ejemplo.gt/{z}/{x}/{y}@2x.png']);
    // Las @2x son de 512 px: nitidas en pantallas densas.
    expect(osm.tileSize).toBe(512);
    expect(osm.attribution).toBe('© OpenStreetMap · Municipalidad');
  });

  it('el modo oscuro baja el brillo del tile claro si no hay teselas oscuras propias', () => {
    const estilo = estiloOpenStreetMapOscuro();
    expect(estilo.layers[0].type).toBe('raster');
    expect((estilo.layers[0] as { paint?: Record<string, number> }).paint?.['raster-brightness-max']).toBeLessThan(1);
  });

  it('con teselas oscuras propias las usa tal cual', () => {
    vi.stubEnv('VITE_MAPA_TESELAS_OSCURO', 'https://oscuro.ejemplo.gt/{z}/{x}/{y}.png');
    const estilo = estiloOpenStreetMapOscuro();
    expect(fuente(estilo).tiles).toEqual(['https://oscuro.ejemplo.gt/{z}/{x}/{y}.png']);
    expect((estilo.layers[0] as { paint?: unknown }).paint).toBeUndefined();
  });
});
