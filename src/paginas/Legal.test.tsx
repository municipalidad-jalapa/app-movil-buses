// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { PieLegal } from '../componentes/PieLegal';
import { AvisoLegal } from './AvisoLegal';
import { Privacidad } from './Privacidad';

afterEach(() => {
  cleanup();
});

describe('HU-89 - Política de privacidad y aviso legal', () => {
  it('el pie muestra enlaces a privacidad y aviso legal', () => {
    render(
      <MemoryRouter>
        <PieLegal />
      </MemoryRouter>,
    );

    const privacidad = screen.getByRole('link', {
      name: 'Política de privacidad',
    });

    const avisoLegal = screen.getByRole('link', {
      name: 'Aviso legal',
    });

    expect(privacidad.getAttribute('href')).toBe('/privacidad');
    expect(avisoLegal.getAttribute('href')).toBe('/aviso-legal');

    expect(
      screen.getByText('Municipalidad de Jalapa'),
    ).toBeTruthy();
  });

  it('la política explica el uso de la ubicación', () => {
    render(<Privacidad />);

    expect(
      screen.getByRole('heading', {
        name: 'Política de privacidad',
      }),
    ).toBeTruthy();

    expect(
      screen.getByRole('heading', {
        name: 'Uso de su ubicación',
      }),
    ).toBeTruthy();

    expect(
      screen.getByText(
        /No realiza seguimiento continuo ni en segundo plano/i,
      ),
    ).toBeTruthy();
  });

  it('la política explica las notificaciones', () => {
    render(<Privacidad />);

    expect(
      screen.getByRole('heading', {
        name: 'Notificaciones en su teléfono',
      }),
    ).toBeTruthy();

    expect(
      screen.getByText(/Las notificaciones son opcionales/i),
    ).toBeTruthy();
  });

  it('la política muestra el contacto de la Municipalidad', () => {
    render(<Privacidad />);

    expect(
      screen.getByText(
        /Municipalidad de Jalapa — Unidad de Información Pública/i,
      ),
    ).toBeTruthy();

    expect(
      screen.getByText(/udip@gobmunijalapa\.gob\.gt/i),
    ).toBeTruthy();
  });

  it('el aviso legal identifica al responsable y la finalidad del sitio', () => {
    render(<AvisoLegal />);

    expect(
      screen.getByRole('heading', {
        name: 'Aviso legal',
      }),
    ).toBeTruthy();

    expect(
      screen.getByRole('heading', {
        name: 'Responsable del servicio',
      }),
    ).toBeTruthy();

    expect(
      screen.getByRole('heading', {
        name: 'Finalidad del sitio',
      }),
    ).toBeTruthy();

    expect(
      screen.getByText(
        /EcoRuta es un servicio de seguimiento del transporte público de la Municipalidad de Jalapa/i,
      ),
    ).toBeTruthy();
  });
});
