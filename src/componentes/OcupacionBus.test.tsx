// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { LineaOcupacion, PildoraOcupacion, htmlPildoraOcupacion } from './OcupacionBus';
import type { VistaOcupacion } from '../core/ocupacion';

const VISTA: VistaOcupacion = {
  cantidad: '12',
  texto: 'Hay lugar',
  tono: 'lugar',
  frase: 'Lleva 12 personas · hay lugar',
  detalle: 'Según el conductor, hace 3 min',
};

afterEach(cleanup);

describe('Ocupación del bus', () => {
  it('la pastilla lleva cantidad y nivel con el tono del nivel', () => {
    const { container } = render(<PildoraOcupacion vista={VISTA} />);
    const pastilla = container.querySelector('.ocupacion-bus')!;
    expect(pastilla.className).toContain('ocupacion-bus--lugar');
    expect(pastilla.textContent).toBe('12Hay lugar');
  });

  it('la versión HTML del marcador es la misma pastilla', () => {
    const html = htmlPildoraOcupacion(VISTA);
    expect(html).toContain('ocupacion-bus--lugar');
    expect(html).toContain('>12<');
    expect(html).toContain('>Hay lugar<');
  });

  it('la línea de la hoja dice cuánta gente lleva y de dónde sale', () => {
    render(<LineaOcupacion vista={VISTA} />);
    expect(screen.getByText('Lleva 12 personas · hay lugar')).toBeTruthy();
    expect(screen.getByText('Según el conductor, hace 3 min')).toBeTruthy();
  });
});
