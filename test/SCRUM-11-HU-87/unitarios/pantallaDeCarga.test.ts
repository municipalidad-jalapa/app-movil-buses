// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { contraste, leer, tokenDeTema } from '../utilidades';

/**
 * HU-87 - Pantalla de carga definitiva.
 *
 * Vive dentro de #raiz en index.html: el navegador la pinta antes de que baje el
 * JavaScript y React la reemplaza al montar. Se prueba el HTML real, no una copia.
 */

const html = leer('index.html');
const documento = new DOMParser().parseFromString(html, 'text/html');
const estilos = [...documento.querySelectorAll('head style')].map((e) => e.textContent ?? '').join('\n');
const pantalla = documento.querySelector('#raiz .pantalla-de-carga');
const scriptDeDemora = [...documento.querySelectorAll('script:not([type])')]
  .map((s) => s.textContent ?? '')
  .find((texto) => texto.includes('pantalla-de-carga__estado')) ?? '';

const VERDE = tokenDeTema('--verde-jumay');
const BLANCO = tokenDeTema('--superficie-base');
const AMARILLO = tokenDeTema('--amarillo-volcan');
const VERDE_SUAVE = tokenDeTema('--verde-jumay-suave');

describe('HU-87 - La pantalla de carga existe antes de que arranque React', () => {
  it('está dentro de #raiz, el elemento donde monta la app', () => {
    expect(pantalla).not.toBeNull();
    expect(leer('src', 'main.tsx')).toContain("getElementById('raiz')");
  });

  it('muestra el nombre, el lema y el estado', () => {
    expect(pantalla?.querySelector('.pantalla-de-carga__nombre')?.textContent).toBe('EcoRuta');
    expect(pantalla?.querySelector('.pantalla-de-carga__lema')?.textContent).toBe('Bus eléctrico · Jalapa');
    expect(pantalla?.querySelector('.pantalla-de-carga__estado')?.textContent).toBe('Cargando…');
  });

  it('el módulo de la app se carga después del contenedor', () => {
    expect(html.indexOf('id="raiz"')).toBeLessThan(html.indexOf('src="/src/main.tsx"'));
  });

  it('el símbolo y los volcanes son decorativos: no los lee el lector de pantalla', () => {
    const svgs = pantalla?.querySelectorAll('svg') ?? [];
    expect(svgs.length).toBe(2);
    for (const svg of svgs) expect(svg.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('HU-87 - Accesibilidad de la pantalla de carga', () => {
  it('anuncia el estado a los lectores de pantalla (role=status, aria-live=polite)', () => {
    expect(pantalla?.getAttribute('role')).toBe('status');
    expect(pantalla?.getAttribute('aria-live')).toBe('polite');
  });

  it('el texto principal cumple AAA sobre el verde de fondo (contador y ETA piden AAA)', () => {
    expect(contraste(BLANCO, VERDE)).toBeGreaterThanOrEqual(7);
  });

  it('el texto de apoyo y el lema cumplen AA sobre el verde de fondo', () => {
    expect(contraste(VERDE_SUAVE, VERDE)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(AMARILLO, VERDE)).toBeGreaterThanOrEqual(4.5);
  });

  it('ningún texto baja de 11.5 px (DESIGN.md §4 [DURA])', () => {
    const tamanos = [...estilos.matchAll(/font-size:\s*([\d.]+)px/g)].map((m) => Number(m[1]));
    expect(tamanos.length).toBeGreaterThan(0);
    for (const tamano of tamanos) expect(tamano).toBeGreaterThanOrEqual(11.5);
  });

  it('respeta prefers-reduced-motion: apaga la animación', () => {
    const bloque = estilos.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\}\s*\}/)?.[0] ?? '';
    expect(bloque).toContain('animation: none');
  });

  it('la animación solo mueve opacity o transform (DESIGN.md §12 [DURA])', () => {
    const cuadros = estilos.match(/@keyframes pantalla-de-carga-latido\s*\{([\s\S]*?)\n\s{6}\}/)?.[1] ?? '';
    const propiedades = [...cuadros.matchAll(/([a-z-]+):\s*[^;]+;/g)].map((m) => m[1]);
    expect(propiedades.length).toBeGreaterThan(0);
    for (const propiedad of propiedades) expect(['opacity', 'transform']).toContain(propiedad);
  });
});

describe('HU-87 - Identidad y peso de la pantalla de carga', () => {
  it('el fondo y los colores salen de tema.css, no se inventan', () => {
    const usados = [...(estilos + html).matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0].toLowerCase());
    const permitidos = new Set(
      [
        '--verde-jumay',
        '--verde-jumay-suave',
        '--amarillo-volcan',
        '--rojo-santa-marta',
        '--superficie-base',
      ].map(tokenDeTema),
    );
    for (const color of usados) expect(permitidos).toContain(color);
  });

  it('el fondo de la pantalla es el verde Jumay', () => {
    expect(estilos).toMatch(new RegExp(`\\.pantalla-de-carga\\s*\\{[^}]*background:\\s*${VERDE}`));
  });

  it('nunca negro puro ni blanco puro (DESIGN.md §3.3 [DURA])', () => {
    expect(estilos).not.toMatch(/#(000|fff)(?![0-9a-f])/i);
    expect(estilos).not.toMatch(/#(000000|ffffff)\b/i);
  });

  it('no pide nada a otros servidores: sin fuentes ni imágenes externas', () => {
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).not.toMatch(/<img/i);
    expect(estilos).not.toMatch(/url\(/);
  });

  it('todo el índice pesa poco (llega antes que cualquier otro archivo)', () => {
    expect(Buffer.byteLength(html)).toBeLessThan(10 * 1024);
  });

  it('el texto respeta el microcopy: sin "Error", sin "por favor", sin admiración', () => {
    const textos = [...(pantalla?.querySelectorAll('p') ?? [])].map((p) => p.textContent ?? '').join(' ');
    expect(textos + scriptDeDemora).not.toMatch(/error|por favor|exitosamente|!/i);
  });
});

describe('HU-87 - Sin JavaScript', () => {
  it('avisa con un mensaje claro y oculta el "Cargando…"', () => {
    const aviso = documento.querySelector('#raiz noscript')?.textContent ?? '';
    // jsdom trata el contenido de <noscript> como texto cuando los scripts estan activos.
    expect(aviso).toMatch(/necesita JavaScript/);
    expect(aviso).toMatch(/Actívalo/);
    const ocultar = documento.querySelector('head noscript')?.textContent ?? html;
    expect(ocultar).toContain('.pantalla-de-carga__estado');
    expect(ocultar).toContain('display: none');
  });

  it('el aviso no usa la clase que oculta el noscript (si no, nunca se vería)', () => {
    const aviso = documento.querySelector('#raiz noscript')?.innerHTML ?? '';
    expect(aviso).toContain('pantalla-de-carga__aviso');
    expect(aviso).not.toContain('pantalla-de-carga__estado');
  });
});

describe('HU-87 - Si la app no llega a montar', () => {
  let temporizadores: { accion: () => void; espera: number }[];

  beforeEach(() => {
    temporizadores = [];
    document.body.innerHTML = documento.querySelector('#raiz')?.outerHTML ?? '';
    vi.spyOn(window, 'setTimeout').mockImplementation(((accion: () => void, espera?: number) => {
      temporizadores.push({ accion, espera: espera ?? 0 });
      return 0;
    }) as typeof window.setTimeout);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('el script de demora existe y programa un aviso a los 20 segundos', () => {
    expect(scriptDeDemora).not.toBe('');
    window.eval(scriptDeDemora);
    expect(temporizadores).toHaveLength(1);
    expect(temporizadores[0].espera).toBe(20000);
  });

  it('pasados 20 segundos cambia "Cargando…" por qué pasa y qué hacer', () => {
    window.eval(scriptDeDemora);
    temporizadores[0].accion();
    const texto = document.querySelector('.pantalla-de-carga__estado')?.textContent ?? '';
    expect(texto).toBe('Está tardando más de lo normal: revisa tu conexión y vuelve a abrir la página.');
  });

  it('si React ya montó (la pantalla ya no existe) no hace nada ni falla', () => {
    window.eval(scriptDeDemora);
    document.body.innerHTML = '<div id="raiz"><main>La app</main></div>';
    expect(() => temporizadores[0].accion()).not.toThrow();
    expect(document.body.textContent).toBe('La app');
  });
});
