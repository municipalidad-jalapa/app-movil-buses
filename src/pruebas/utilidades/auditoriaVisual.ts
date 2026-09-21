import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Herramientas de la auditoría visual (SCRUM-26, bloque G).
 *
 * «Visiblemente agradable» no se puede verificar; estas funciones traducen el
 * criterio a números que una prueba puede revisar sola: contraste WCAG,
 * tamaño de letra, área tocable y de dónde sale cada color.
 */

const RAIZ = 'src';

/** Todos los .css del proyecto, con su ruta relativa. */
export function hojasDeEstilo(directorio = RAIZ): { ruta: string; css: string }[] {
  const salida: { ruta: string; css: string }[] = [];
  for (const entrada of readdirSync(directorio)) {
    const ruta = join(directorio, entrada);
    if (statSync(ruta).isDirectory()) {
      salida.push(...hojasDeEstilo(ruta));
    } else if (entrada.endsWith('.css')) {
      salida.push({ ruta: ruta.replaceAll('\\', '/'), css: readFileSync(ruta, 'utf8') });
    }
  }
  return salida;
}

/** Los tokens de color del tema, en su versión de día y la de noche. */
export function paleta(): { claro: Record<string, string>; oscuro: Record<string, string> } {
  const css = readFileSync('src/estilos/tema.css', 'utf8');
  const [base, ...resto] = css.split('@media (prefers-color-scheme: dark)');
  const claro = tokensDe(base);
  return { claro, oscuro: { ...claro, ...tokensDe(resto.join('')) } };
}

function tokensDe(bloque: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const [, nombre, valor] of bloque.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})/g)) {
    tokens[nombre] = valor;
  }
  return tokens;
}

/** Luminancia relativa de WCAG 2.1. */
function luminancia(hex: string): number {
  let valor = hex.replace('#', '');
  if (valor.length === 3) {
    valor = [...valor].map((c) => c + c).join('');
  }
  const canales = [0, 2, 4]
    .map((i) => parseInt(valor.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * canales[0] + 0.7152 * canales[1] + 0.0722 * canales[2];
}

/** Razón de contraste entre dos colores, de 1 a 21. AA pide 4.5 en texto normal. */
export function contraste(uno: string, otro: string): number {
  const a = luminancia(uno);
  const b = luminancia(otro);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Todos los `font-size` declarados en píxeles, con el archivo donde están. */
export function tamanosDeLetra(): { ruta: string; px: number }[] {
  return hojasDeEstilo().flatMap(({ ruta, css }) =>
    [...css.matchAll(/font-size:\s*([0-9.]+)px/g)].map((coincidencia) => ({
      ruta,
      px: Number(coincidencia[1]),
    })),
  );
}

/**
 * Altura mínima de los CONTROLES del teléfono: lo que se toca con el pulgar.
 *
 * No entran los adornos (manijas de la hoja, pastillas de carga) ni el panel
 * municipal, que es de escritorio y se usa con ratón (DESIGN.md §11).
 */
export function alturasMinimasDeControles(): { ruta: string; selector: string; px: number }[] {
  const esControl =
    /(button|select|input|textarea)|boton|opcion|estrella|enlace|acceso|cerrar|salir|lista|tipo|entrada__|primario|secundario/;
  // Los adornos no se tocan: manija de la hoja, pastilla de "cargando", chips.
  const esAdorno = /manija|cargando|esqueleto|chip|insignia/;
  const tactilMinimo = Number(
    readFileSync('src/estilos/tema.css', 'utf8').match(/--tactil-minimo:\s*([0-9.]+)px/)?.[1] ?? 0,
  );

  return hojasDeEstilo()
    // El panel municipal es de escritorio por diseño (DESIGN.md §11).
    .filter(({ ruta }) => !ruta.includes('/admin/'))
    .flatMap(({ ruta, css }) => {
      const salida: { ruta: string; selector: string; px: number }[] = [];
      for (const bloque of sinMediaQueries(css).split('}')) {
        const corte = bloque.lastIndexOf('{');
        if (corte < 0) continue;
        const selector = bloque.slice(0, corte).split(/[{;]/).pop()!.trim().replace(/\s+/g, ' ');
        const declaraciones = bloque.slice(corte + 1);
        const alto = declaraciones.match(/min-height:\s*([^;]+);/);
        if (!alto || !esControl.test(selector) || esAdorno.test(selector)) continue;

        const valor = alto[1].trim();
        // El token es la forma correcta de declararlo; vale lo que dice el tema.
        const px = valor.includes('--tactil-minimo') ? tactilMinimo : Number(valor.replace('px', ''));
        if (!Number.isNaN(px)) {
          salida.push({ ruta, selector, px });
        }
      }
      return salida;
    });
}

/** Colores escritos a mano (hex) fuera del tema: la paleta vive en un solo lugar. */
export function coloresFueraDelTema(): string[] {
  return hojasDeEstilo()
    .filter(({ ruta }) => ruta !== 'src/estilos/tema.css')
    .filter(({ css }) => sinComentarios(css).match(/#[0-9a-fA-F]{3,8}\b/))
    .map(({ ruta }) => ruta)
    .sort();
}

function sinComentarios(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** El texto de la regla sin la cabecera de sus consultas de medios. */
function sinMediaQueries(css: string): string {
  return sinComentarios(css).replace(/@media[^{]*\{/g, '{');
}

/**
 * Anchos fijos mayores al teléfono de referencia (360 px), fuera de consultas
 * de medios: son los que provocan desplazamiento horizontal.
 */
export function anchosQueDesbordan(telefonoPx = 360): { ruta: string; px: number }[] {
  return hojasDeEstilo()
    // El panel municipal es de escritorio por diseño (DESIGN.md §11).
    .filter(({ ruta }) => !ruta.includes('/admin/'))
    .flatMap(({ ruta, css }) =>
      // Se quitan las consultas de medios: `@media (min-width: 720px)` dice
      // cuándo aplica una regla, no cuánto mide un elemento.
      [...sinMediaQueries(css).matchAll(/(?<!max-)(?<!-)\b(?:min-width|width):\s*([0-9.]+)px/g)]
        .map((coincidencia) => ({ ruta, px: Number(coincidencia[1]) }))
        .filter(({ px }) => px > telefonoPx),
    );
}
