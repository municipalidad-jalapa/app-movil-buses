// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { BannerConexion } from './BannerConexion';

afterEach(cleanup);

describe('BannerConexion', () => {
  it('al reconectar informa, no alarma', () => {
    const { container } = render(<BannerConexion estadoConexion="reconectando" />);

    expect(screen.getByRole('status').textContent).toContain('Sin datos nuevos');
    expect(screen.getByRole('status').textContent).toContain('reconectando');
    expect(container.querySelector('.banner-conexion__icono')).not.toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('en vivo combina color, icono y texto', () => {
    const { container } = render(<BannerConexion estadoConexion="en-vivo" />);

    expect(screen.getByRole('status').textContent).toContain('En vivo');
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('mientras conecta dice que busca al bus', () => {
    render(<BannerConexion estadoConexion="conectando" />);
    expect(screen.getByRole('status').textContent).toContain('Buscando al bus');
  });
});
