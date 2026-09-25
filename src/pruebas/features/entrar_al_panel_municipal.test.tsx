// @vitest-environment jsdom
import {
  describeFeature,
  getVitestCucumberConfiguration,
  loadFeature,
  setVitestCucumberConfiguration,
} from '@amiceli/vitest-cucumber';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';
import { expect, vi } from 'vitest';

import { RutaProtegidaAdmin } from '../../componentes/admin/RutaProtegidaAdmin';
import { ErrorApi } from '../../core/errores';
import { AuthAdminProvider } from '../../core/panelAdmin/AuthAdminProvider';
import { consultarServicio, intercambiarTokenAdmin } from '../../core/panelAdmin/panelAdminApi';
import { borrarSesionAdmin, guardarSesionAdmin } from '../../core/panelAdmin/sesionAdmin';
import { LoginAdmin } from '../../paginas/admin/LoginAdmin';
import { PanelAdmin } from '../../paginas/admin/PanelAdmin';

/**
 * Aceptacion de SCRUM-173 (HU-78) en el panel. El 403 y el vencimiento real del
 * JWT los prueba el backend; aqui se prueba lo que ve el administrador.
 */

setVitestCucumberConfiguration(getVitestCucumberConfiguration({ language: 'es' }));

const feature = await loadFeature('src/pruebas/features/entrar_al_panel_municipal.feature', { language: 'es' });

vi.mock('../../core/firebase', () => ({ authFirebase: {} }));
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(async (_auth: unknown, correo: string, contrasena: string) => {
    if (contrasena === 'mala') {
      throw Object.assign(new Error('firebase'), { code: 'auth/invalid-credential' });
    }
    return { user: { email: correo } };
  }),
  getIdToken: vi.fn(async (user: { email: string }) => `id-${user.email}`),
  signOut: vi.fn(async () => undefined),
}));
vi.mock('../../core/panelAdmin/panelAdminApi', async (original) => ({
  ...(await original<typeof import('../../core/panelAdmin/panelAdminApi')>()),
  intercambiarTokenAdmin: vi.fn(),
  renovarSesionAdmin: vi.fn(),
  consultarServicio: vi.fn(),
}));

const SERVICIO = {
  consultadoEn: '2026-09-14T10:42:00Z',
  rutas: [
    {
      rutaId: 1,
      nombre: 'Ruta de ejemplo - Centro de Jalapa',
      paradas: 8,
      bus: { id: 1, identificador: 'BUS-01', placa: 'P-000BBB' },
      estado: 'EN_RUTA' as const,
      posicion: { latitud: 14.63, longitud: -89.98, velocidadKmh: 24, timestamp: '2026-09-14T10:41:00Z', vehiculo: 'BUS-01' },
    },
    {
      rutaId: 2,
      nombre: 'Ruta de prueba - Parque Central a Metroplaza',
      paradas: 5,
      bus: { id: 2, identificador: 'BUS-02', placa: 'P-000CCC' },
      estado: 'SIN_DATOS_RECIENTES' as const,
      posicion: null,
    },
  ],
};

function montar(ruta: string) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <AuthAdminProvider>
        <Routes>
          <Route path="/admin/login" element={<LoginAdmin />} />
          <Route
            path="/admin"
            element={
              <RutaProtegidaAdmin>
                <PanelAdmin />
              </RutaProtegidaAdmin>
            }
          />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </AuthAdminProvider>
    </MemoryRouter>,
  );
}

function entrarCon(correo: string, contrasena = 'secreta') {
  fireEvent.change(screen.getByLabelText('Correo'), { target: { value: correo } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: contrasena } });
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
}

describeFeature(feature, ({ Background, Scenario, BeforeEachScenario, AfterEachScenario }) => {
  void Background;

  BeforeEachScenario(() => {
    borrarSesionAdmin();
    vi.mocked(consultarServicio).mockResolvedValue(SERVICIO);
    vi.mocked(intercambiarTokenAdmin).mockImplementation(async (_idToken, correo) => {
      if (correo.startsWith('conductor')) {
        throw new ErrorApi(403, 'Esta cuenta no tiene permiso para el panel municipal');
      }
      return { token: 'jwt-admin', expiraEnMs: Date.now() + 30 * 60_000, inactividadMinutos: 30, correo };
    });
  });

  AfterEachScenario(() => {
    cleanup();
    vi.useRealTimers();
    borrarSesionAdmin();
  });

  Scenario('Un administrador entra con su cuenta de la municipalidad', ({ Given, When, Then }) => {
    Given('que estoy en el login del panel municipal', () => {
      montar('/admin/login');
    });
    When('entro con una cuenta de administrador', () => {
      entrarCon('admin@jalapa.gob.gt');
    });
    Then('veo el estado del servicio', async () => {
      expect(await screen.findByRole('heading', { name: 'Estado del servicio' })).toBeTruthy();
      expect(screen.getByText('admin@jalapa.gob.gt')).toBeTruthy();
    });
  });

  Scenario('Credenciales incorrectas', ({ Given, When, Then }) => {
    Given('que estoy en el login del panel municipal', () => {
      montar('/admin/login');
    });
    When('entro con una contraseña incorrecta', () => {
      entrarCon('admin@jalapa.gob.gt', 'mala');
    });
    Then('veo el aviso "El correo o la contraseña no coinciden. Revísalos e intenta de nuevo."', async () => {
      expect((await screen.findByRole('alert')).textContent).toContain(
        'El correo o la contraseña no coinciden. Revísalos e intenta de nuevo.',
      );
    });
  });

  Scenario('Un conductor que intenta entrar ve acceso denegado', ({ Given, When, Then, And }) => {
    Given('que estoy en el login del panel municipal', () => {
      montar('/admin/login');
    });
    When('entro con una cuenta de conductor', () => {
      entrarCon('conductor@jalapa.gob.gt');
    });
    Then('veo "Esta cuenta no tiene permiso para el panel"', async () => {
      expect(await screen.findByRole('heading', { name: 'Esta cuenta no tiene permiso para el panel' })).toBeTruthy();
      expect(screen.getByText('conductor@jalapa.gob.gt')).toBeTruthy();
    });
    And('puedo volver a intentar con otra cuenta', () => {
      fireEvent.click(screen.getByRole('button', { name: 'Usar otra cuenta' }));
      expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeTruthy();
    });
  });

  Scenario('La sesión se cierra por inactividad tras avisar', ({ Given, When, Then }) => {
    Given('que tengo una sesión de administrador que vence en 2 minutos', () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      guardarSesionAdmin({ token: 'jwt-admin', expiraEnMs: Date.now() + 2 * 60_000, inactividadMinutos: 30, correo: 'a@muni.gt' });
      montar('/admin');
    });
    When('no uso el panel durante 1 minuto y 5 segundos', () => {
      act(() => vi.advanceTimersByTime(65_000));
    });
    Then('veo el aviso de que mi sesión se cerrará por inactividad', () => {
      expect(screen.getByRole('alertdialog').textContent).toContain('por inactividad');
    });
    When('sigo sin usar el panel hasta que vence', () => {
      act(() => vi.advanceTimersByTime(60_000));
    });
    Then('vuelvo al login con el mensaje "Cerramos tu sesión por inactividad. Entra de nuevo para seguir."', async () => {
      await waitFor(() =>
        expect(screen.getByRole('alert').textContent).toContain(
          'Cerramos tu sesión por inactividad. Entra de nuevo para seguir.',
        ),
      );
    });
  });

  Scenario('El administrador ve todas las rutas, no una sola', ({ Given, When, Then }) => {
    Given('que tengo una sesión de administrador que vence en 30 minutos', () => {
      guardarSesionAdmin({ token: 'jwt-admin', expiraEnMs: Date.now() + 30 * 60_000, inactividadMinutos: 30, correo: 'a@muni.gt' });
    });
    When('abro el panel municipal', () => {
      montar('/admin');
    });
    Then('la tabla muestra las 2 rutas del servicio con su estado', async () => {
      expect(await screen.findByText('Ruta de ejemplo - Centro de Jalapa')).toBeTruthy();
      expect(screen.getByText('Ruta de prueba - Parque Central a Metroplaza')).toBeTruthy();
      expect(screen.getByText('En ruta')).toBeTruthy();
      expect(screen.getByText('Sin datos recientes')).toBeTruthy();
      expect(consultarServicio).toHaveBeenCalledWith('jwt-admin', expect.anything());
    });
  });
});
