// @vitest-environment jsdom
import {
  describeFeature,
  getVitestCucumberConfiguration,
  loadFeature,
  setVitestCucumberConfiguration,
} from '@amiceli/vitest-cucumber';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, vi } from 'vitest';

import { MenuAcceso } from '../../componentes/MenuAcceso';
import { SesionPasajeroProvider } from '../../core/pasajero/SesionPasajeroProvider';
import { CLAVE_MODO, CLAVE_SESION } from '../../core/pasajero/sesionPasajero';
import { Herramientas } from '../../paginas/Herramientas';

/** Correccion de QA: el pasajero no ve el acceso del conductor ni de la administracion. */

setVitestCucumberConfiguration(getVitestCucumberConfiguration({ language: 'es' }));

const feature = await loadFeature('src/pruebas/features/acceso_del_personal.feature', { language: 'es' });

vi.mock('../../core/firebase', () => ({ authFirebase: {} }));
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class {},
  signInWithPopup: vi.fn(),
  getIdToken: vi.fn(),
  signOut: vi.fn(async () => undefined),
}));

function montarMenu() {
  return render(
    <MemoryRouter>
      <SesionPasajeroProvider>
        <MenuAcceso />
      </SesionPasajeroProvider>
    </MemoryRouter>,
  );
}

/** Los destinos son marcadores: aqui solo importa a donde lleva cada opcion. */
function montarRuta(ruta: string) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/tools" element={<Herramientas />} />
        <Route path="/" element={<p>Mapa del pasajero</p>} />
        <Route path="/conductor/login" element={<p>Login del conductor</p>} />
        <Route path="/admin" element={<p>Pantalla del administrador</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

const abrirMenu = () => fireEvent.click(screen.getByRole('button', { name: /Cuenta|Invitado|Acceder/ }));

const opcionesDelMenu = () => screen.getAllByRole('menuitem').map((opcion) => opcion.textContent ?? '');

function sinAccesoDelPersonal() {
  const opciones = opcionesDelMenu();
  expect(opciones.some((texto) => /Conductor/.test(texto))).toBe(false);
  expect(opciones.some((texto) => /Administrador/.test(texto))).toBe(false);
  expect(screen.queryByRole('link', { name: /Conductor|Administrador/ })).toBeNull();
}

describeFeature(feature, ({ Scenario, BeforeEachScenario, AfterEachScenario }) => {
  BeforeEachScenario(() => {
    localStorage.clear();
  });

  AfterEachScenario(() => cleanup());

  Scenario('El menú del invitado no ofrece el acceso del personal', ({ Given, When, Then, And }) => {
    Given('que entro a la aplicación como invitado', () => {
      localStorage.setItem(CLAVE_MODO, 'invitado');
      montarMenu();
    });
    When('abro el menú', () => {
      abrirMenu();
    });
    Then('veo las opciones "Pasajero" e "Iniciar sesión"', () => {
      expect(screen.getByRole('menuitem', { name: /Pasajero/ })).toBeTruthy();
      expect(screen.getByRole('menuitem', { name: /Iniciar sesión/ })).toBeTruthy();
    });
    And('no veo las opciones "Conductor" ni "Administrador"', () => {
      sinAccesoDelPersonal();
    });
  });

  Scenario('El menú del pasajero con cuenta no ofrece el acceso del personal', ({ Given, When, Then, And }) => {
    Given('que tengo la sesión iniciada con Google', () => {
      localStorage.setItem(CLAVE_MODO, 'cuenta');
      localStorage.setItem(
        CLAVE_SESION,
        JSON.stringify({ token: 'jwt-pasajero', expiraEnMs: Date.now() + 86_400_000, correo: 'samuel@gmail.com' }),
      );
      montarMenu();
    });
    When('abro el menú', () => {
      abrirMenu();
    });
    Then('veo la opción "Cerrar sesión"', () => {
      expect(screen.getByRole('menuitem', { name: /Cerrar sesión/ })).toBeTruthy();
    });
    And('no veo las opciones "Conductor" ni "Administrador"', () => {
      sinAccesoDelPersonal();
    });
  });

  Scenario('La ruta /tools ofrece las tres opciones de acceso', ({ Given, Then }) => {
    Given('que abro "/tools"', () => {
      montarRuta('/tools');
    });
    Then('veo las opciones de acceso "Pasajero", "Conductor" y "Administrador"', () => {
      const navegacion = screen.getByRole('navigation', { name: 'Opciones de acceso' });
      const enlaces = Array.from(navegacion.querySelectorAll('a'));
      expect(enlaces.map((a) => a.querySelector('.herramientas__titulo')?.textContent)).toEqual([
        'Pasajero',
        'Conductor',
        'Administrador',
      ]);
      expect(enlaces.map((a) => a.getAttribute('href'))).toEqual(['/', '/conductor/login', '/admin']);
    });
  });

  Scenario('Desde /tools el conductor llega a su inicio de sesión', ({ Given, When, Then }) => {
    Given('que abro "/tools"', () => {
      montarRuta('/tools');
    });
    When('elijo "Conductor"', () => {
      fireEvent.click(screen.getByRole('link', { name: /Conductor/ }));
    });
    Then('veo "Login del conductor"', () => {
      expect(screen.getByText('Login del conductor')).toBeTruthy();
    });
  });

  Scenario('Desde /tools el administrador llega al panel municipal', ({ Given, When, Then }) => {
    Given('que abro "/tools"', () => {
      montarRuta('/tools');
    });
    When('elijo "Administrador"', () => {
      fireEvent.click(screen.getByRole('link', { name: /Administrador/ }));
    });
    Then('veo "Pantalla del administrador"', () => {
      expect(screen.getByText('Pantalla del administrador')).toBeTruthy();
    });
  });

  Scenario('Desde /tools el pasajero vuelve al mapa', ({ Given, When, Then }) => {
    Given('que abro "/tools"', () => {
      montarRuta('/tools');
    });
    When('elijo "Pasajero"', () => {
      fireEvent.click(screen.getByRole('link', { name: /Pasajero/ }));
    });
    Then('veo "Mapa del pasajero"', () => {
      expect(screen.getByText('Mapa del pasajero')).toBeTruthy();
    });
  });
});
