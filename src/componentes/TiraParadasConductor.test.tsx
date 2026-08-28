// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { TiraParadasConductor } from './TiraParadasConductor';
import type { ParadaConDemanda } from '../hooks/usePanelConductor';

afterEach(cleanup);

function paradas(): ParadaConDemanda[] {
  return [
    {
      parada: { id: 10, nombre: 'Terminal', latitud: 14.64, longitud: -89.99, orden: 1 },
      activas: 5,
    },
    {
      parada: { id: 20, nombre: 'Parque Central', latitud: 14.63, longitud: -89.98, orden: 2 },
      activas: 0,
    },
  ];
}

describe('TiraParadasConductor', () => {
  it('lista las paradas en el orden recibido', () => {
    render(<TiraParadasConductor paradas={paradas()} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0].getAttribute('aria-label')).toContain('Terminal');
    expect(items[1].getAttribute('aria-label')).toContain('Parque Central');
  });

  it('muestra el numero grande cuando hay gente esperando (criterio 2)', () => {
    render(<TiraParadasConductor paradas={paradas()} />);

    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByRole('listitem', { name: /Terminal/ }).getAttribute('aria-label')).toBe(
      'Terminal: 5 personas esperando',
    );
  });

  it('distingue una parada sin nadie esperando en vez de mostrar un numero (criterio 4)', () => {
    render(<TiraParadasConductor paradas={paradas()} />);

    const vacia = screen.getByRole('listitem', { name: /Parque Central/ });
    expect(vacia.getAttribute('aria-label')).toBe('Parque Central: nadie esperando');
    expect(vacia.textContent).not.toMatch(/^0/);
  });

  it('no confunde "sin datos" con "nadie esperando"', () => {
    render(
      <TiraParadasConductor
        paradas={[
          {
            parada: { id: 30, nombre: 'Mercado', latitud: 14.62, longitud: -89.97, orden: 3 },
            activas: null,
          },
        ]}
      />,
    );

    expect(screen.getByRole('listitem').getAttribute('aria-label')).toBe(
      'Mercado: sin datos por el momento',
    );
  });
});
