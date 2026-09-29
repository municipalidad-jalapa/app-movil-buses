import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Los cursores del lapiz y de la mano: jsdom no pinta cursores, asi que se
 * revisa la hoja de estilo.
 */
const css = readFileSync('src/componentes/admin/MapaDeDibujo.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const reglas = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map(([, selector, cuerpo]) => ({ selector: selector.trim(), cuerpo }))
  .filter(({ cuerpo }) => /cursor:\s*url\(/.test(cuerpo));

describe('cursores del mapa de dibujo', () => {
  it('hay uno para el lápiz y dos para la mano (abierta y arrastrando)', () => {
    const cursores = reglas.map((r) => r.selector);
    expect(cursores.some((s) => s.includes('mapa-dibujo__lienzo--lapiz'))).toBe(true);
    expect(cursores.some((s) => s.includes('mapa-dibujo__lienzo--mano') && !s.includes(':active'))).toBe(true);
    expect(cursores.some((s) => s.includes('mapa-dibujo__lienzo--mano:active'))).toBe(true);
  });

  it('solo aplican dentro del mapa de dibujo y le ganan al cursor de MapLibre', () => {
    for (const { selector } of reglas) {
      for (const parte of selector.split(',')) {
        // .mapa-dibujo acota el alcance; .maplibregl-canvas-container suma el
        // peso que hace falta frente a .maplibregl-canvas-container.maplibregl-interactive.
        expect(parte.trim()).toMatch(/^\.mapa-dibujo \.maplibregl-canvas-container\.mapa-dibujo__lienzo--/);
      }
    }
  });

  it('cada cursor trae su punto activo y un cursor de respaldo del sistema', () => {
    for (const { cuerpo } of reglas) {
      expect(cuerpo).toMatch(/cursor:\s*url\("data:image\/svg\+xml,[^"]+"\)\s+\d+\s+\d+,\s*(crosshair|grab|grabbing);/);
    }
  });
});
