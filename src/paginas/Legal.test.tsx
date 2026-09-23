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
    render(
      <MemoryRouter>
        <Privacidad />
      </MemoryRouter>,
    );

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
    render(
      <MemoryRouter>
        <Privacidad />
      </MemoryRouter>,
    );

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
    render(
      <MemoryRouter>
        <Privacidad />
      </MemoryRouter>,
    );

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
    render(
      <MemoryRouter>
        <AvisoLegal />
      </MemoryRouter>,
    );

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

  it('la política permite volver al mapa', () => {
    render(
      <MemoryRouter>
        <Privacidad />
      </MemoryRouter>,
    );

    const volver = screen.getByRole('link', {
      name: /volver al mapa/i,
    });

    expect(volver.getAttribute('href')).toBe('/');
  });

  it('el aviso legal permite volver al mapa', () => {
    render(
      <MemoryRouter>
        <AvisoLegal />
      </MemoryRouter>,
    );

    const volver = screen.getByRole('link', {
      name: /volver al mapa/i,
    });

    expect(volver.getAttribute('href')).toBe('/');
  });

  it('la política incluye un índice de contenidos', () => {
    render(
      <MemoryRouter>
        <Privacidad />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('navigation', {
        name: /contenido de la política de privacidad/i,
      }),
    ).toBeTruthy();

    expect(
      screen.getByRole('link', {
        name: 'Ubicación',
      }),
    ).toBeTruthy();

    expect(
      screen.getByRole('link', {
        name: 'Contacto',
      }),
    ).toBeTruthy();
  });
});
