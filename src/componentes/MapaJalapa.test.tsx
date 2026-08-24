// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { MapaJalapa } from './MapaJalapa';
import type { Posicion, Ruta } from '../core/tipos';

/** La ruta semilla del backend: cuatro paradas alrededor de Jalapa. */
const RUTA: Ruta = {
  id: 1,
  nombre: 'Ruta Centro - Terminal',
  activa: true,
  paradas: [
    { id: 1, nombre: 'Parque Central', latitud: 14.633, longitud: -89.989, orden: 1 },
    { id: 2, nombre: 'Mercado Municipal', latitud: 14.6345, longitud: -89.987, orden: 2 },
    { id: 3, nombre: 'Hospital Nacional', latitud: 14.6365, longitud: -89.984, orden: 3 },
    { id: 4, nombre: 'Terminal de Buses', latitud: 14.639, longitud: -89.981, orden: 4 },
  ],
};

const BUS: Posicion = {
  latitud: 14.6355,
  longitud: -89.9855,
  velocidadKmh: 18,
  timestamp: '2026-08-22T10:00:00Z',
  vehiculo: 'BUS-01',
};

/*
 * jsdom no tiene WebGL2, asi que MapLibre no arranca aqui y el componente cae
 * al croquis. Eso NO es un apano de pruebas: es el mismo camino que sigue un
 * telefono de gama baja sin WebGL2, que es justo el publico de esta app
 * (DESIGN.md seccion 1). Lo que se prueba abajo con capa="croquis" es, ademas,
 * la degradacion real.
 *
 * El mapa con tiles se verifica en un navegador de verdad, no aqui.
 */
describe('MapaJalapa', () => {
  it('la atribucion de OpenStreetMap esta siempre visible', () => {
    // Requisito de licencia, no un detalle visual (DESIGN.md seccion 8).
    const { getByText } = render(<MapaJalapa ruta={RUTA} posicionBus={null} capa="croquis" />);

    expect(getByText('© OpenStreetMap')).toBeTruthy();
  });

  it('sin WebGL2 cae al croquis en vez de romperse', () => {
    // El croquis ensena lo mismo: mismo trazo, mismos marcadores.
    const { container } = render(<MapaJalapa ruta={RUTA} posicionBus={BUS} />);

    expect(container.querySelector('[aria-label="Croquis ligero de la ruta"]')).toBeTruthy();
    expect(container.textContent).not.toMatch(/error|no compatible|actualiza tu/i);
  });

  it('dibuja una parada por cada parada de la ruta', () => {
    const { container } = render(<MapaJalapa ruta={RUTA} posicionBus={null} capa="croquis" />);

    const titulos = [...container.querySelectorAll('title')].map((t) => t.textContent);
    expect(titulos).toContain('Parque Central');
    expect(titulos).toContain('Terminal de Buses');
  });

  it('sin posicion no dibuja el bus, pero si la ruta', () => {
    const { container } = render(<MapaJalapa ruta={RUTA} posicionBus={null} capa="croquis" />);

    expect(container.querySelector('[aria-label*="posición del bus"]')).toBeTruthy();
    // El icono del bus solo aparece cuando hay posicion.
    expect(container.querySelectorAll('rect[rx="2"]').length).toBe(0);
  });

  it('las paradas caen dentro del lienzo del mock', () => {
    // El overlay esta hecho para un viewBox de 390x640: si la proyeccion se
    // saliera, las paradas quedarian fuera de pantalla.
    const { container } = render(<MapaJalapa ruta={RUTA} posicionBus={BUS} capa="croquis" />);

    for (const circulo of container.querySelectorAll('circle[r="9"]')) {
      const x = Number(circulo.getAttribute('cx'));
      const y = Number(circulo.getAttribute('cy'));
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(390);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(640);
    }
  });

  it('el modo oscuro se declara en el contenedor', () => {
    // DESIGN.md seccion 3.5: el modo oscuro se disena a proposito, con valores
    // propios; no se genera invirtiendo el claro.
    const { container } = render(
      <MapaJalapa ruta={RUTA} posicionBus={null} modo="oscuro" capa="croquis" />,
    );

    expect(container.querySelector('[data-modo="oscuro"]')).toBeTruthy();
  });

  it('la capa de croquis no dice que algo fallo', () => {
    // DESIGN.md seccion 7: sin conexion es una pantalla de primera clase, no de
    // error. Ni iconografia de fallo ni tono de disculpa.
    const { container } = render(<MapaJalapa ruta={RUTA} posicionBus={BUS} capa="croquis" />);

    expect(container.querySelector('[aria-label="Croquis ligero de la ruta"]')).toBeTruthy();
    expect(container.textContent).not.toMatch(/error|falla|lo sentimos/i);
  });

  it('mientras carga avisa sin tapar el mapa con un error', () => {
    const { getByText, container } = render(
      <MapaJalapa ruta={null} posicionBus={null} capa="cargando" />,
    );

    expect(getByText(/Cargando el mapa/)).toBeTruthy();
    // Con esqueleto no se dibuja overlay: no hay nada que mostrar todavia.
    expect(container.querySelector('[aria-label*="posición del bus"]')).toBeNull();
  });

  it('en desvio la ruta oficial se atenua pero sigue visible', () => {
    // DESIGN.md seccion 7: la ruta de siempre queda como referencia.
    const { container, getByText } = render(
      <MapaJalapa ruta={RUTA} posicionBus={BUS} desvio capa="croquis" />,
    );

    expect(container.querySelector('[stroke-dasharray="16 12"]')).toBeTruthy();
    expect(getByText('Ruta de siempre')).toBeTruthy();
  });

  it('marca tu parada de forma distinta al resto', () => {
    const { getByText, container } = render(
      <MapaJalapa ruta={RUTA} posicionBus={BUS} paradaTuyaId={2} capa="croquis" />,
    );

    // Color + forma + tamano, nunca solo color (DESIGN.md seccion 3.1).
    expect(getByText('Tu parada')).toBeTruthy();
    expect(container.querySelector('circle[r="21"]')).toBeTruthy();
  });
});
