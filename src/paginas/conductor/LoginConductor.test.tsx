// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LoginConductor } from './LoginConductor';
import { useAuth } from '../../core/autenticacion/useAuth';
import { MENSAJE_CREDENCIALES_INVALIDAS, MENSAJE_SESION_CADUCADA } from '../../core/autenticacion/traducirErrorFirebase';

afterEach(cleanup);

vi.mock('../../core/autenticacion/useAuth', () => ({
  useAuth: vi.fn(),
}));

function montar() {
  return render(
    <MemoryRouter initialEntries={['/conductor/login']}>
      <Routes>
        <Route path="/conductor/login" element={<LoginConductor />} />
        <Route path="/conductor" element={<p>Panel</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LoginConductor', () => {
  it('envia correo y contraseña a iniciarSesion', async () => {
    const iniciarSesion = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAuth).mockReturnValue({
      usuario: null,
      token: null,
      rol: null,
      cargando: false,
      mensajeSesion: null,
      iniciarSesion,
      cerrarSesion: vi.fn(),
    });

    montar();
    fireEvent.change(screen.getByLabelText('Correo'), {
      target: { value: 'conductor@jalapa.gob.gt' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'secreto' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() =>
      expect(iniciarSesion).toHaveBeenCalledWith('conductor@jalapa.gob.gt', 'secreto'),
    );
  });

  it('muestra el error de credenciales sin codes tecnicos', async () => {
    const iniciarSesion = vi.fn().mockRejectedValue(new Error(MENSAJE_CREDENCIALES_INVALIDAS));
    vi.mocked(useAuth).mockReturnValue({
      usuario: null,
      token: null,
      rol: null,
      cargando: false,
      mensajeSesion: null,
      iniciarSesion,
      cerrarSesion: vi.fn(),
    });

    montar();
    fireEvent.change(screen.getByLabelText('Correo'), {
      target: { value: 'mal@jalapa.gob.gt' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'no' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(MENSAJE_CREDENCIALES_INVALIDAS));
    expect(screen.getByRole('alert').textContent).not.toContain('auth/');
  });

  it('muestra el mensaje de sesion caducada si viene del contexto', () => {
    vi.mocked(useAuth).mockReturnValue({
      usuario: null,
      token: null,
      rol: null,
      cargando: false,
      mensajeSesion: MENSAJE_SESION_CADUCADA,
      iniciarSesion: vi.fn(),
      cerrarSesion: vi.fn(),
    });

    montar();

    expect(screen.getByRole('alert').textContent).toBe(MENSAJE_SESION_CADUCADA);
  });
});
