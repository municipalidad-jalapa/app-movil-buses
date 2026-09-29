// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MenuAcceso } from './MenuAcceso';

afterEach(cleanup);

describe('Menú de acceso del mapa', () => {
  it('no ofrece entrar como conductor ni como administrador: tienen su enlace directo', () => {
    render(
      <MemoryRouter>
        <MenuAcceso />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Acceder/ }));

    expect(screen.getByRole('menuitem', { name: /Pasajero/ })).toBeTruthy();
    expect(screen.queryByRole('menuitem', { name: /Conductor/ })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: /Administrador/ })).toBeNull();
    expect(document.querySelector('a[href="/conductor/login"]')).toBeNull();
    expect(document.querySelector('a[href="/admin"]')).toBeNull();
  });
});
