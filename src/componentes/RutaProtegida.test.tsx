// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RutaProtegida } from './RutaProtegida';
import { useAuth } from '../core/autenticacion/useAuth';

afterEach(cleanup);

vi.mock('../core/autenticacion/useAuth', () => ({
  useAuth: vi.fn(),
}));

function montar() {
  return render(
    <MemoryRouter initialEntries={['/conductor']}>
      <Routes>
        <Route
          path="/conductor"
          element={
            <RutaProtegida>
              <p>Panel del conductor</p>
            </RutaProtegida>
          }
        />
        <Route path="/conductor/login" element={<p>Inicio de sesión</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RutaProtegida', () => {
  it('muestra Cargando mientras arranca la sesion', () => {
    vi.mocked(useAuth).mockReturnValue({
      usuario: null,
      token: null,
      rol: null,
      cargando: true,
      mensajeSesion: null,
      iniciarSesion: vi.fn(),
      cerrarSesion: vi.fn(),
    });

    montar();

    expect(screen.getByRole('status').textContent).toContain('Comprobando sesión');
    expect(screen.queryByText('Panel del conductor')).toBeNull();
    expect(screen.queryByText('Inicio de sesión')).toBeNull();
  });

  it('redirige al login si no hay sesion', () => {
    vi.mocked(useAuth).mockReturnValue({
      usuario: null,
      token: null,
      rol: null,
      cargando: false,
      mensajeSesion: null,
      iniciarSesion: vi.fn(),
      cerrarSesion: vi.fn(),
    });

    montar();

    expect(screen.getByText('Inicio de sesión')).toBeTruthy();
    expect(screen.queryByText('Panel del conductor')).toBeNull();
  });

  it('renderiza los hijos cuando hay sesion', () => {
    vi.mocked(useAuth).mockReturnValue({
      usuario: { correo: 'conductor@jalapa.gob.gt' },
      token: 'jwt',
      rol: 'conductor',
      cargando: false,
      mensajeSesion: null,
      iniciarSesion: vi.fn(),
      cerrarSesion: vi.fn(),
    });

    montar();

    expect(screen.getByText('Panel del conductor')).toBeTruthy();
  });
});
