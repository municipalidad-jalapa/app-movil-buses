import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * QA (Eco-Ruta, informe): "En el menu, las letras se sobreponen."
 *
 * En telefono, las 7 pestañas de NavegacionPanel se repartian con
 * `flex: 1 1 0` + `min-width: 0` y sin `overflow-wrap`. Una etiqueta larga
 * ("Pasajeros subidos", "Estado del servicio") no cabia en su columna de
 * ~50px y, sin permiso para partirse, se desbordaba sobre la pestaña vecina.
 *
 * El rediseño responsive del panel (correcciones-panel-de-administracion)
 * quito la fila de pestañas del telefono: por debajo de 1024 px las secciones
 * van en un cajon lateral, una por renglon. Esta prueba fija ese arreglo.
 */
const CSS = readFileSync('src/componentes/admin/NavegacionPanel.css', 'utf8');

function bloqueMovil(css: string): string {
  const inicio = css.indexOf('@media (max-width: 1023px)');
  expect(inicio, 'no se encontro el breakpoint movil en NavegacionPanel.css').toBeGreaterThan(-1);
  return css.slice(inicio, css.indexOf('\n}', inicio));
}

function regla(css: string, selector: string): string {
  const escapado = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return css.match(new RegExp(`${escapado}\\s*{([^}]*)}`))?.[1] ?? '';
}

describe('NavegacionPanel.css — en el telefono las secciones no se superponen', () => {
  it('la fila de pestañas no se muestra en el telefono: las secciones van en el cajon', () => {
    expect(regla(bloqueMovil(CSS), '.panel-navegacion')).toMatch(/display:\s*none/);
  });

  it('en el cajon cada seccion ocupa su propio renglon', () => {
    expect(regla(CSS, '.panel-cajon__lista')).toMatch(/flex-direction:\s*column/);
  });

  it('ninguna pestaña vuelve a usar min-width: 0 con flex: 1 1 0 (la combinacion que causaba el desborde)', () => {
    for (const selector of ['.panel-navegacion__enlace', '.panel-cajon__enlace']) {
      const bloque = regla(CSS, selector);
      expect(bloque).not.toMatch(/min-width:\s*0/);
      expect(bloque).not.toMatch(/flex:\s*1 1 0/);
    }
  });
});
