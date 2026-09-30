import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * QA (Eco-Ruta, informe): "En el menu, las letras se sobreponen."
 *
 * En telefono, las 7 pestañas de NavegacionPanel se repartian con
 * `flex: 1 1 0` + `min-width: 0` y sin `overflow-wrap`. Una etiqueta larga
 * ("Pasajeros subidos", "Estado del servicio") no cabia en su columna de
 * ~50px y, sin permiso para partirse, se desbordaba sobre la pestaña vecina.
 * Esta prueba fija el arreglo (fila deslizable, una sola linea por pestaña)
 * para que el breakpoint movil no vuelva a encoger el texto por debajo de
 * su propio ancho.
 */
const CSS = readFileSync('src/componentes/admin/NavegacionPanel.css', 'utf8');

function bloqueMovil(css: string): string {
  const inicio = css.indexOf('@media (max-width: 640px)');
  expect(inicio, 'no se encontro el breakpoint movil en NavegacionPanel.css').toBeGreaterThan(-1);
  return css.slice(inicio);
}

describe('NavegacionPanel.css — breakpoint movil no superpone las pestañas', () => {
  it('cada pestaña se queda en una sola linea (no se encoge por debajo de su texto)', () => {
    const movil = bloqueMovil(CSS);
    expect(movil).toMatch(/\.panel-navegacion__enlace\s*{[^}]*white-space:\s*nowrap/);
  });

  it('la fila de pestañas se desliza en vez de partir el texto', () => {
    const movil = bloqueMovil(CSS);
    expect(movil).toMatch(/\.panel-navegacion\s*{[^}]*overflow-x:\s*auto/);
  });

  it('ninguna pestaña vuelve a usar min-width: 0 con flex: 1 1 0 (la combinacion que causaba el desborde)', () => {
    const movil = bloqueMovil(CSS);
    const bloqueEnlace = movil.match(/\.panel-navegacion__enlace\s*{([^}]*)}/)?.[1] ?? '';
    expect(bloqueEnlace).not.toMatch(/min-width:\s*0/);
    expect(bloqueEnlace).not.toMatch(/flex:\s*1 1 0/);
  });
});
