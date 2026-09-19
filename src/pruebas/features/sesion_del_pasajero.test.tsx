// @vitest-environment jsdom
import {
  describeFeature,
  getVitestCucumberConfiguration,
  loadFeature,
  setVitestCucumberConfiguration,
} from '@amiceli/vitest-cucumber';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { signInWithPopup } from 'firebase/auth';
import { MemoryRouter } from 'react-router-dom';
import { expect, vi } from 'vitest';

import { MenuAcceso } from '../../componentes/MenuAcceso';
import { PuertaDelPasajero } from '../../componentes/sesionPasajero/PuertaDelPasajero';
import { SesionPasajeroProvider } from '../../core/pasajero/SesionPasajeroProvider';
import {
  CLAVE_MODO,
  CLAVE_SESION,
  intercambiarTokenPasajero,
  vincularNavegador,
} from '../../core/pasajero/sesionPasajero';

/** Aceptacion de SCRUM-26 (HU-146), bloque B.1, en la web. */

setVitestCucumberConfiguration(getVitestCucumberConfiguration({ language: 'es' }));

const feature = await loadFeature('src/pruebas/features/sesion_del_pasajero.feature', { language: 'es' });

vi.mock('../../core/firebase', () => ({ authFirebase: {} }));
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class {},
  signInWithPopup: vi.fn(async () => ({ user: { email: 'samuel@gmail.com' } })),
  getIdToken: vi.fn(async () => 'id-token-google'),
  signOut: vi.fn(async () => undefined),
}));
vi.mock('../../core/pasajero/sesionPasajero', async (original) => ({
  ...(await original<typeof import('../../core/pasajero/sesionPasajero')>()),
  intercambiarTokenPasajero: vi.fn(),
  vincularNavegador: vi.fn(),
}));

function montar() {
  return render(
    <MemoryRouter>
      <SesionPasajeroProvider>
        <MenuAcceso />
        <PuertaDelPasajero>
          <p>App del pasajero</p>
        </PuertaDelPasajero>
      </SesionPasajeroProvider>
    </MemoryRouter>,
  );
}

const abrirMenu = () => fireEvent.click(screen.getByRole('button', { name: /Cuenta|Invitado|Acceder/ }));

describeFeature(feature, ({ Scenario, BeforeEachScenario, AfterEachScenario }) => {
  BeforeEachScenario(() => {
    localStorage.clear();
    vi.mocked(signInWithPopup).mockResolvedValue({ user: { email: 'samuel@gmail.com' } } as never);
    vi.mocked(intercambiarTokenPasajero).mockResolvedValue({
      token: 'jwt-pasajero',
      expiraEnMs: Date.now() + 86_400_000,
      correo: 'samuel@gmail.com',
    });
    vi.mocked(vincularNavegador).mockResolvedValue({ reservasVinculadas: 0, opinionesVinculadas: 0 });
  });

  AfterEachScenario(() => cleanup());

  Scenario('La primera vez se ofrecen dos opciones con la misma jerarquía', ({ Given, Then }) => {
    Given('que abro la aplicación por primera vez', () => {
      montar();
    });
    Then('veo "Ingresar como invitado" e "Iniciar sesión" con el mismo estilo', () => {
      const invitado = screen.getByRole('button', { name: /Ingresar como invitado/ });
      const cuenta = screen.getByRole('button', { name: /Iniciar sesión/ });
      expect(invitado.className).toBe(cuenta.className);
      expect(screen.queryByText('App del pasajero')).toBeNull();
    });
  });

  Scenario('Como invitado se entra de inmediato y la elección se recuerda', ({ Given, When, Then, And }) => {
    Given('que abro la aplicación por primera vez', () => {
      montar();
    });
    When('elijo "Ingresar como invitado"', () => {
      fireEvent.click(screen.getByRole('button', { name: /Ingresar como invitado/ }));
    });
    Then('veo la aplicación del pasajero', () => {
      expect(screen.getByText('App del pasajero')).toBeTruthy();
    });
    And('al volver a abrirla no se me pregunta de nuevo', () => {
      cleanup();
      montar();
      expect(localStorage.getItem(CLAVE_MODO)).toBe('invitado');
      expect(screen.getByText('App del pasajero')).toBeTruthy();
    });
  });

  Scenario('Iniciar sesión con Google y conservar lo hecho como invitado', ({ Given, When, Then, And }) => {
    Given('que abro la aplicación por primera vez', () => {
      montar();
    });
    And('que este teléfono tiene 2 reservas y 1 opinión como invitado', () => {
      vi.mocked(vincularNavegador).mockResolvedValue({ reservasVinculadas: 2, opinionesVinculadas: 1 });
    });
    When('inicio sesión con Google', async () => {
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/ }));
      });
    });
    Then('veo "Guardamos en tu cuenta 2 reservas y 1 opinión de este teléfono."', async () => {
      expect(await screen.findByText('Guardamos en tu cuenta 2 reservas y 1 opinión de este teléfono.')).toBeTruthy();
      expect(intercambiarTokenPasajero).toHaveBeenCalledWith('id-token-google');
    });
    And('el menú muestra mi cuenta', () => {
      fireEvent.click(screen.getByRole('button', { name: 'Entendido' }));
      abrirMenu();
      expect(screen.getByText('samuel@gmail.com')).toBeTruthy();
      expect(screen.getByRole('menuitem', { name: /Cerrar sesión/ })).toBeTruthy();
    });
  });

  Scenario('Si Google falla se explica y se puede seguir como invitado', ({ Given, When, Then, And }) => {
    Given('que abro la aplicación por primera vez', () => {
      montar();
    });
    And('que Google no deja iniciar sesión', () => {
      vi.mocked(signInWithPopup).mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'auth/internal-error' }));
    });
    When('inicio sesión con Google', async () => {
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/ }));
      });
    });
    Then('veo el aviso "No pudimos iniciar sesión con Google."', async () => {
      expect((await screen.findByRole('alert')).textContent).toContain('No pudimos iniciar sesión con Google.');
    });
    When('elijo "Continuar como invitado"', () => {
      fireEvent.click(screen.getByRole('button', { name: /Continuar como invitado/ }));
    });
    Then('veo la aplicación del pasajero', () => {
      expect(screen.getByText('App del pasajero')).toBeTruthy();
    });
  });

  Scenario('Cerrar sesión vuelve al modo invitado', ({ Given, When, Then }) => {
    Given('que tengo la sesión iniciada con Google', () => {
      localStorage.setItem(CLAVE_MODO, 'cuenta');
      localStorage.setItem(
        CLAVE_SESION,
        JSON.stringify({ token: 'jwt-pasajero', expiraEnMs: Date.now() + 86_400_000, correo: 'samuel@gmail.com' }),
      );
      montar();
    });
    When('cierro sesión desde el menú', () => {
      abrirMenu();
      fireEvent.click(screen.getByRole('menuitem', { name: /Cerrar sesión/ }));
    });
    Then('el menú muestra que estoy como invitado', async () => {
      await waitFor(() => expect(localStorage.getItem(CLAVE_SESION)).toBeNull());
      abrirMenu();
      expect(screen.getByText('Estás como invitado')).toBeTruthy();
      expect(screen.getByText('App del pasajero')).toBeTruthy();
    });
  });
});
