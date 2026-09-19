// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  getIdToken,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { configurarManejador401, peticion } from '../apiClient';
import { ErrorApi } from '../errores';
import { AuthProvider } from './AuthProvider';
import { intercambiarTokenConductor } from './autenticacionApi';
import {
  MENSAJE_CREDENCIALES_INVALIDAS,
  MENSAJE_SESION_CADUCADA,
} from './traducirErrorFirebase';
import { useAuth } from './useAuth';

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  getIdToken: vi.fn(),
  onIdTokenChanged: vi.fn(() => () => {}),
}));

vi.mock('../firebase', () => ({
  authFirebase: { name: 'prueba' },
}));

vi.mock('./autenticacionApi', () => ({
  intercambiarTokenConductor: vi.fn(),
}));

function respuestaFalsa(status: number, cuerpo?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: async () => {
      if (cuerpo === undefined) throw new Error('sin cuerpo');
      return cuerpo;
    },
  } as Response;
}

function VistaPrueba() {
  const { usuario, token, rol, cargando, mensajeSesion, iniciarSesion, cerrarSesion } = useAuth();
  return (
    <div>
      <p data-testid="cargando">{cargando ? 'si' : 'no'}</p>
      <p data-testid="correo">{usuario?.correo ?? ''}</p>
      <p data-testid="token">{token ?? ''}</p>
      <p data-testid="rol">{rol ?? ''}</p>
      <p data-testid="mensaje">{mensajeSesion ?? ''}</p>
      <button
        type="button"
        onClick={() => {
          void iniciarSesion('conductor@jalapa.gob.gt', 'secreto').catch((causa) => {
            document.querySelector('[data-testid="error"]')!.textContent =
              causa instanceof Error ? causa.message : String(causa);
          });
        }}
      >
        Entrar
      </button>
      <button type="button" onClick={() => void cerrarSesion()}>
        Salir
      </button>
      <p data-testid="error" />
    </div>
  );
}

function montar() {
  return render(
    <AuthProvider>
      <VistaPrueba />
    </AuthProvider>,
  );
}

const usuarioFirebase = { email: 'conductor@jalapa.gob.gt' } as User;
const sesionOk = {
  token: 'jwt-propio',
  expiraEn: Math.floor(Date.now() / 1000) + 3600,
  rol: 'conductor',
};

describe('AuthProvider', () => {
  let emitirCambio: (user: User | null) => void = () => {};

  beforeEach(() => {
    localStorage.clear();
    emitirCambio = () => {};
    vi.mocked(onIdTokenChanged).mockImplementation((_auth, escuchador) => {
      emitirCambio = escuchador as (user: User | null) => void;
      return () => {};
    });
    vi.mocked(signOut).mockResolvedValue(undefined);
    vi.mocked(getIdToken).mockResolvedValue('id-token-firebase');
    vi.mocked(intercambiarTokenConductor).mockResolvedValue(sesionOk);
    vi.mocked(signInWithEmailAndPassword).mockResolvedValue({
      user: usuarioFirebase,
    } as never);
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    configurarManejador401(null);
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('inicia sesion y deja usuario, token y rol en el contexto', async () => {
    montar();
    emitirCambio(null);

    await waitFor(() => expect(screen.getByTestId('cargando').textContent).toBe('no'));
    expect(screen.getByTestId('mensaje').textContent).toBe('');

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(screen.getByTestId('correo').textContent).toBe('conductor@jalapa.gob.gt'));
    expect(screen.getByTestId('token').textContent).toBe('jwt-propio');
    expect(screen.getByTestId('rol').textContent).toBe('conductor');
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'conductor@jalapa.gob.gt',
      'secreto',
    );
  });

  it('traduce credenciales invalidas y no muestra el code de Firebase', async () => {
    vi.mocked(signInWithEmailAndPassword).mockRejectedValue({ code: 'auth/invalid-credential' });
    montar();
    emitirCambio(null);

    await waitFor(() => expect(screen.getByTestId('cargando').textContent).toBe('no'));
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toBe(MENSAJE_CREDENCIALES_INVALIDAS),
    );
    expect(screen.getByTestId('error').textContent).not.toContain('auth/');
    expect(screen.getByTestId('mensaje').textContent).toBe('');
    expect(screen.getByTestId('correo').textContent).toBe('');
  });

  it('trata un 401 del intercambio como credenciales, no como sesion caducada', async () => {
    vi.mocked(intercambiarTokenConductor).mockRejectedValue(new ErrorApi(401, 'idToken invalido'));
    montar();
    emitirCambio(null);

    await waitFor(() => expect(screen.getByTestId('cargando').textContent).toBe('no'));
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toBe(MENSAJE_CREDENCIALES_INVALIDAS),
    );
    expect(screen.getByTestId('mensaje').textContent).not.toBe(MENSAJE_SESION_CADUCADA);
  });

  it('refresca el JWT cuando Firebase emite un idToken nuevo', async () => {
    montar();
    emitirCambio(null);
    await waitFor(() => expect(screen.getByTestId('cargando').textContent).toBe('no'));

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(screen.getByTestId('token').textContent).toBe('jwt-propio'));

    vi.mocked(intercambiarTokenConductor).mockResolvedValue({
      ...sesionOk,
      token: 'jwt-refrescado',
    });
    emitirCambio(usuarioFirebase);

    await waitFor(() => expect(screen.getByTestId('token').textContent).toBe('jwt-refrescado'));
    expect(screen.getByTestId('correo').textContent).toBe('conductor@jalapa.gob.gt');
  });

  it('conserva el JWT vigente si el refresco falla por red', async () => {
    montar();
    emitirCambio(null);
    await waitFor(() => expect(screen.getByTestId('cargando').textContent).toBe('no'));

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(screen.getByTestId('token').textContent).toBe('jwt-propio'));

    vi.mocked(intercambiarTokenConductor).mockRejectedValue(new ErrorApi(0, 'Fallo de red'));
    emitirCambio(usuarioFirebase);

    await waitFor(() => expect(intercambiarTokenConductor).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('token').textContent).toBe('jwt-propio');
    expect(screen.getByTestId('mensaje').textContent).toBe('');
  });

  it('cierra sesion y limpia usuario, token y rol', async () => {
    montar();
    emitirCambio(null);
    await waitFor(() => expect(screen.getByTestId('cargando').textContent).toBe('no'));

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(screen.getByTestId('correo').textContent).toBe('conductor@jalapa.gob.gt'));

    fireEvent.click(screen.getByRole('button', { name: 'Salir' }));

    await waitFor(() => expect(screen.getByTestId('correo').textContent).toBe(''));
    expect(screen.getByTestId('token').textContent).toBe('');
    expect(screen.getByTestId('rol').textContent).toBe('');
    expect(signOut).toHaveBeenCalled();
  });

  it('ante un 401 con sesion activa muestra caducada y no deja pantalla en blanco', async () => {
    montar();
    emitirCambio(null);
    await waitFor(() => expect(screen.getByTestId('cargando').textContent).toBe('no'));

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(screen.getByTestId('token').textContent).toBe('jwt-propio'));

    vi.stubGlobal('fetch', vi.fn(async () => respuestaFalsa(401)));
    await peticion('/api/v1/conductor/estado', { intentos: 1 }).catch(() => undefined);

    await waitFor(() => expect(screen.getByTestId('mensaje').textContent).toBe(MENSAJE_SESION_CADUCADA));
    expect(screen.getByTestId('correo').textContent).toBe('');
    expect(screen.getByTestId('cargando').textContent).toBe('no');
  });

  it('un 401 en el refresco silencioso caduca la sesion una sola vez', async () => {
    montar();
    emitirCambio(null);
    await waitFor(() => expect(screen.getByTestId('cargando').textContent).toBe('no'));

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(screen.getByTestId('token').textContent).toBe('jwt-propio'));

    vi.mocked(signOut).mockClear();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => respuestaFalsa(401, { status: 401, message: 'idToken invalido' })),
    );
    vi.mocked(intercambiarTokenConductor).mockImplementation(async (idToken) => {
      const respuesta = await peticion<{ token: string; expiraEn: number; rol: string }>(
        '/api/v1/auth/conductor',
        { metodo: 'POST', cuerpo: { idToken }, intentos: 1 },
      );
      if (!respuesta?.token) {
        throw new Error('Respuesta de autenticacion incompleta.');
      }
      return respuesta;
    });

    emitirCambio(usuarioFirebase);

    await waitFor(() =>
      expect(screen.getByTestId('mensaje').textContent).toBe(MENSAJE_SESION_CADUCADA),
    );
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('correo').textContent).toBe('');
  });

  it('si Firebase invalida la sesion por su cuenta, explica que caduco', async () => {
    montar();
    emitirCambio(null);
    await waitFor(() => expect(screen.getByTestId('cargando').textContent).toBe('no'));

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() =>
      expect(screen.getByTestId('correo').textContent).toBe('conductor@jalapa.gob.gt'),
    );

    emitirCambio(null);

    await waitFor(() =>
      expect(screen.getByTestId('mensaje').textContent).toBe(MENSAJE_SESION_CADUCADA),
    );
    expect(screen.getByTestId('correo').textContent).toBe('');
    expect(screen.getByTestId('token').textContent).toBe('');
  });
});

describe('useAuth', () => {
  afterEach(cleanup);

  it('falla si se usa fuera de AuthProvider', () => {
    function Fuera() {
      useAuth();
      return null;
    }

    expect(() => render(<Fuera />)).toThrow(/dentro de AuthProvider/);
  });
});
