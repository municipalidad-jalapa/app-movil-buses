import { describe, expect, it } from 'vitest';
import { dimensionesPng, existe, leer, leerBinario, tokenDeTema } from '../utilidades';

/**
 * HU-87 - Ícono y título definitivos del sitio.
 * Se prueba sobre los archivos reales que entran al build (index.html y public/).
 */

const html = leer('index.html');
const manifiesto = JSON.parse(leer('public', 'manifest.webmanifest')) as {
  name: string;
  short_name: string;
  lang: string;
  start_url: string;
  display: string;
  theme_color: string;
  background_color: string;
  icons: { src: string; sizes: string; type: string; purpose?: string }[];
};

/** Valor del atributo `href` de un <link> con ese `rel`. */
function hrefDe(rel: string): string | null {
  const etiqueta = html.match(new RegExp(`<link[^>]*rel="${rel}"[^>]*>`));
  return etiqueta?.[0].match(/href="([^"]+)"/)?.[1] ?? null;
}

describe('HU-87 - Título del sitio', () => {
  it('el documento declara español', () => {
    expect(html).toMatch(/<html lang="es">/);
  });

  it('el título es el definitivo de EcoRuta', () => {
    expect(html).toMatch(/<title>EcoRuta — Bus eléctrico de Jalapa<\/title>/);
  });

  it('el título no es el de una plantilla', () => {
    const titulo = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
    expect(titulo).not.toMatch(/vite|react app|document|untitled/i);
  });

  it('hay una descripción con acentos, sin errores de escritura evidentes', () => {
    const descripcion = html.match(/name="description"\s+content="([^"]+)"/)?.[1] ?? '';
    expect(descripcion).toContain('dónde');
    expect(descripcion).toContain('eléctrico');
    expect(descripcion.length).toBeGreaterThan(30);
  });

  it('el color de la barra del navegador es el verde Jumay del tema', () => {
    const color = html.match(/name="theme-color"\s+content="(#[0-9a-fA-F]{6})"/)?.[1];
    expect(color?.toLowerCase()).toBe(tokenDeTema('--verde-jumay'));
  });
});

describe('HU-87 - Ícono del sitio', () => {
  it('index.html enlaza el favicon SVG y el archivo existe en public/', () => {
    expect(hrefDe('icon')).toBe('/favicon.svg');
    expect(existe('public', 'favicon.svg')).toBe(true);
  });

  it('index.html enlaza el ícono de iOS y el archivo existe', () => {
    expect(hrefDe('apple-touch-icon')).toBe('/apple-touch-icon.png');
    expect(existe('public', 'apple-touch-icon.png')).toBe(true);
  });

  it('index.html enlaza el manifest y el archivo existe', () => {
    expect(hrefDe('manifest')).toBe('/manifest.webmanifest');
    expect(existe('public', 'manifest.webmanifest')).toBe(true);
  });

  it('no queda el ícono por defecto de Vite', () => {
    expect(existe('public', 'vite.svg')).toBe(false);
    expect(html).not.toContain('vite.svg');
  });

  it('el favicon es un SVG válido, autocontenido y sin scripts ni imágenes raster', () => {
    const svg = leer('public', 'favicon.svg');
    expect(svg).toMatch(/<svg[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    expect(svg).toMatch(/viewBox="0 0 64 64"/);
    expect(svg).not.toMatch(/<script|<image|data:image|href="http/i);
  });

  it('el favicon usa solo colores del sistema de diseño', () => {
    const svg = leer('public', 'favicon.svg');
    const permitidos = new Set([
      tokenDeTema('--verde-jumay'),
      tokenDeTema('--superficie-base'),
      tokenDeTema('--rojo-santa-marta'),
      tokenDeTema('--amarillo-volcan'),
    ]);
    const usados = [...svg.matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{6})"/g)].map((m) =>
      m[1].toLowerCase(),
    );
    expect(usados.length).toBeGreaterThan(0);
    for (const color of usados) expect(permitidos).toContain(color);
  });

  it.each([
    ['icon-192.png', 192],
    ['icon-512.png', 512],
    ['icon-maskable-512.png', 512],
    ['apple-touch-icon.png', 180],
  ])('%s es un PNG real de %i x %i px', (archivo, lado) => {
    const medidas = dimensionesPng(leerBinario('public', archivo));
    expect(medidas).toEqual({ ancho: lado, alto: lado });
  });

  it('los PNG pesan poco (presupuesto de peso, DESIGN.md §13)', () => {
    for (const archivo of ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png']) {
      expect(leerBinario('public', archivo).length).toBeLessThan(40 * 1024);
    }
  });
});

describe('HU-87 - Manifest de la aplicación', () => {
  it('nombre, idioma y arranque', () => {
    expect(manifiesto.name).toBe('EcoRuta — Bus eléctrico de Jalapa');
    expect(manifiesto.short_name).toBe('EcoRuta');
    expect(manifiesto.lang).toBe('es');
    expect(manifiesto.start_url).toBe('/');
    expect(manifiesto.display).toBe('standalone');
  });

  it('el nombre del manifest coincide con el título del sitio', () => {
    const titulo = html.match(/<title>([^<]*)<\/title>/)?.[1];
    expect(manifiesto.name).toBe(titulo);
  });

  it('los colores son los del tema', () => {
    expect(manifiesto.theme_color).toBe(tokenDeTema('--verde-jumay'));
    expect(manifiesto.background_color).toBe(tokenDeTema('--verde-jumay'));
  });

  it('cada ícono declarado existe en public/', () => {
    for (const icono of manifiesto.icons) {
      expect(existe('public', icono.src.replace(/^\//, ''))).toBe(true);
    }
  });

  it('el tamaño declarado de cada PNG coincide con el real', () => {
    const png = manifiesto.icons.filter((i) => i.type === 'image/png');
    expect(png.length).toBeGreaterThanOrEqual(3);
    for (const icono of png) {
      const [ancho, alto] = icono.sizes.split('x').map(Number);
      const real = dimensionesPng(leerBinario('public', icono.src.replace(/^\//, '')));
      expect(real).toEqual({ ancho, alto });
    }
  });

  it('cumple lo que pide Android para poder instalarse: 192, 512 y uno maskable', () => {
    const tiene = (tam: string, proposito: string) =>
      manifiesto.icons.some(
        (i) => i.sizes === tam && i.type === 'image/png' && (i.purpose ?? 'any') === proposito,
      );
    expect(tiene('192x192', 'any')).toBe(true);
    expect(tiene('512x512', 'any')).toBe(true);
    expect(tiene('512x512', 'maskable')).toBe(true);
  });
});
