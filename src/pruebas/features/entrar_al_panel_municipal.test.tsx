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
import { consultarPanel, intercambiarTokenAdmin } from '../../core/panelAdmin/panelAdminApi';
import { borrarSesionAdmin, guardarSesionAdmin } from '../../core/panelAdmin/sesionAdmin';
import { LoginAdmin } from '../../paginas/admin/LoginAdmin';
import { PanelAdmin } from '../../paginas/admin/PanelAdmin';

/**
 * Aceptacion de SCRUM-173 (HU-78) y del contrato de rutas de HU-79. El 403 y el
 * vencimiento real del JWT los prueba el backend; aqui se prueba lo que ve el administrador.
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
  consultarPanel: vi.fn(),
}));

const PANEL = {
  rutas: [
    {
      rutaId: 1,
      nombre: 'Ruta de ejemplo - Centro de Jalapa',
      vehiculoId: 1,
      posicion: { latitud: 14.63, longitud: -89.98, registradaEn: '2026-09-14T10:41:00Z' },
      transmitiendo: true,
      reservasPorParada: [
        { paradaId: 10, activas: 3 },
        { paradaId: 11, activas: 2 },
        { paradaId: 12, activas: 0 },
      ],
    },
    {
      rutaId: 2,
      nombre: 'Ruta de prueba - Parque Central a Metroplaza',
      vehiculoId: 2,
      posicion: null,
      transmitiendo: false,
      reservasPorParada: [{ paradaId: 20, activas: 0 }],
    },
    {
      rutaId: 3,
      nombre: 'Ruta periurbana - Barrio La Esperanza',
      vehiculoId: null,
      posicion: null,
      transmitiendo: false,
      reservasPorParada: [],
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
    vi.mocked(consultarPanel).mockResolvedValue(PANEL);
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
    Then('la tabla muestra las 3 rutas del panel con su estado de transmisión', async () => {
      expect(await screen.findByText('Ruta de ejemplo - Centro de Jalapa')).toBeTruthy();
      expect(screen.getByText('Ruta de prueba - Parque Central a Metroplaza')).toBeTruthy();
      expect(screen.getByText('Ruta periurbana - Barrio La Esperanza')).toBeTruthy();
      expect(screen.getByText('Transmitiendo')).toBeTruthy();
      expect(screen.getAllByText('Sin transmitir')).toHaveLength(2);
      expect(screen.queryByRole('columnheader', { name: 'Velocidad' })).toBeNull();
      expect(screen.getByRole('columnheader', { name: 'Reservas activas' })).toBeTruthy();
      expect(consultarPanel).toHaveBeenCalledWith('jwt-admin', expect.anything());
    });
  });

  Scenario('Una ruta con reservas activas muestra el total y el detalle por parada', ({ Given, When, Then }) => {
    Given('que tengo una sesión de administrador que vence en 30 minutos', () => {
      guardarSesionAdmin({ token: 'jwt-admin', expiraEnMs: Date.now() + 30 * 60_000, inactividadMinutos: 30, correo: 'a@muni.gt' });
    });
    When('abro el panel municipal', () => {
      montar('/admin');
    });
    Then('veo 5 reservas activas y el detalle "Parada 10: 3" y "Parada 11: 2"', async () => {
      const fila = (await screen.findByText('Ruta de ejemplo - Centro de Jalapa')).closest('tr');
      expect(fila?.textContent).toContain('5');
      expect(fila?.textContent).toContain('Parada 10: 3');
      expect(fila?.textContent).toContain('Parada 11: 2');
      expect(fila?.textContent).not.toContain('Parada 12');
    });
  });

  Scenario('Una ruta sin reservas muestra "Sin reservas"', ({ Given, When, Then }) => {
    Given('que tengo una sesión de administrador que vence en 30 minutos', () => {
      guardarSesionAdmin({ token: 'jwt-admin', expiraEnMs: Date.now() + 30 * 60_000, inactividadMinutos: 30, correo: 'a@muni.gt' });
    });
    When('abro el panel municipal', () => {
      montar('/admin');
    });
    Then('veo "Sin reservas" en la ruta sin reservas activas', async () => {
      const sinReservas = (await screen.findByText('Ruta de prueba - Parque Central a Metroplaza')).closest('tr');
      expect(sinReservas?.textContent).toContain('Sin reservas');
      expect(sinReservas?.textContent).toMatch(/0/);
      const sinVehiculo = screen.getByText('Ruta periurbana - Barrio La Esperanza').closest('tr');
      expect(sinVehiculo?.textContent).toContain('Sin reservas');
    });
  });

  Scenario('Una ruta sin vehículo asignado aparece como sin transmitir', ({ Given, When, Then }) => {
    Given('que tengo una sesión de administrador que vence en 30 minutos', () => {
      guardarSesionAdmin({ token: 'jwt-admin', expiraEnMs: Date.now() + 30 * 60_000, inactividadMinutos: 30, correo: 'a@muni.gt' });
    });
    When('abro el panel municipal', () => {
      montar('/admin');
    });
    Then('veo "Sin vehículo asignado" y el estado "Sin transmitir"', async () => {
      const fila = (await screen.findByText('Ruta periurbana - Barrio La Esperanza')).closest('tr');
      expect(fila?.textContent).toContain('Sin vehículo asignado');
      expect(fila?.textContent).toContain('Sin transmitir');
    });
  });
});
