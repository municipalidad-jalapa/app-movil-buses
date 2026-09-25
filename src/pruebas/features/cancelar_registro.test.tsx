// @vitest-environment jsdom
import {
  describeFeature,
  getVitestCucumberConfiguration,
  loadFeature,
  setVitestCucumberConfiguration,
} from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Ruta } from '../../core/tipos';
import { ErrorApi } from '../../core/errores';
import { cancelarReserva } from '../../core/registroDemanda';
import { ReservaProvider } from '../../estado/ReservaProvider';
import { RutaElegidaProvider } from '../../estado/RutaElegidaProvider';
import { Mapa } from '../../paginas/Mapa';

/**
 * Pruebas de aceptación de HU-77 (SCRUM-172): cancelar el registro de demanda.
 * Sigue el mismo patrón Gherkin + vitest-cucumber que avisos_y_abordaje.
 */

setVitestCucumberConfiguration(
  getVitestCucumberConfiguration({ language: 'es' }),
);

const feature = await loadFeature('src/pruebas/features/cancelar_registro.feature', {
  language: 'es',
});

const RUTA: Ruta = {
  id: 1,
  nombre: 'Ruta de ejemplo',
  activa: true,
  paradas: [
    { id: 1, nombre: 'Parque Central', latitud: 14.634878, longitud: -89.981202, orden: 1 },
    { id: 2, nombre: '1a Calle - Mercado', latitud: 14.63245, longitud: -89.987308, orden: 2 },
  ],
  trazado: [],
};

/** Fuera del mock para que la referencia sea estable entre renders. */
const RUTAS = [RUTA];

const { refrescar } = vi.hoisted(() => ({ refrescar: vi.fn() }));

vi.mock('../../hooks/useRutas', () => ({
  useRutas: () => ({ rutas: RUTAS, rutaActiva: RUTA, cargando: false, error: null, reintentar: () => {} }),
}));
vi.mock('../../hooks/usePosicionBus', () => ({
  usePosicionBus: () => ({
    posicion: null,
    estadoConexion: 'en-vivo',
    recibidoEn: null,
    cargaInicialLista: false,
  }),
}));
vi.mock('../../hooks/useResumenRuta', () => ({
  useResumenRuta: () => ({ esperandoPorParada: new Map([[2, 5]]), refrescar }),
}));
vi.mock('../../hooks/useUbicacion', () => ({
  useUbicacion: () => ({
    ubicacion: null,
    solicitando: false,
    error: null,
    solicitarUbicacion: vi.fn(),
  }),
}));
vi.mock('../../core/registroDemanda', async (original) => ({
  ...(await original<typeof import('../../core/registroDemanda')>()),
  cancelarReserva: vi.fn(),
  registrarDemanda: vi.fn(),
  renovarReserva: vi.fn(),
}));

function sembrarReserva() {
  localStorage.setItem(
    'ecoruta_reserva',
    JSON.stringify({
      id: 9,
      paradaId: 2,
      estado: 'ACTIVA',
      expiraEn: new Date(Date.now() + 5 * 60_000).toISOString(),
    }),
  );
}

function montarMapa() {
  return render(
    <RutaElegidaProvider>
      <ReservaProvider>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<Mapa />} />
          </Routes>
        </MemoryRouter>
      </ReservaProvider>
    </RutaElegidaProvider>,
  );
}

function prepararEscenario() {
  localStorage.clear();
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  vi.mocked(cancelarReserva).mockResolvedValue();
}

function limpiarEscenario() {
  cleanup();
}

describeFeature(feature, ({ Scenario, BeforeEachScenario, AfterEachScenario }) => {
  BeforeEachScenario(prepararEscenario);
  AfterEachScenario(limpiarEscenario);

  Scenario('Cancelar mi aviso activo con un toque', ({ Given, When, Then, And }) => {
    Given('que tengo una reserva activa guardada en este dispositivo', () => {
      sembrarReserva();
      montarMapa();
      expect(screen.getByText('Ya avisamos que estás esperando')).toBeTruthy();
    });
    When('toco el botón "Ya no voy a esperar"', () => {
      fireEvent.click(screen.getByRole('button', { name: 'Ya no voy a esperar' }));
    });
    Then('se solicita cancelar esa reserva con la identidad de mi dispositivo', async () => {
      await waitFor(() => expect(cancelarReserva).toHaveBeenCalledWith(9, expect.any(String)));
      expect(cancelarReserva).toHaveBeenCalledTimes(1);
    });
    And('regreso a la selección de parada', async () => {
      await screen.findByText('¿En qué parada vas a esperar?');
      expect(localStorage.getItem('ecoruta_reserva')).toBeNull();
    });
    And('se solicita actualizar el conteo', () => {
      expect(refrescar).toHaveBeenCalled();
    });
  });

  Scenario('No presentar como cancelada una reserva ya abordada', ({ Given, When, Then, And }) => {
    Given('que tengo una reserva activa en la aplicación', () => {
      sembrarReserva();
    });
    And('el servidor informa que ya fue marcada como abordada', () => {
      vi.mocked(cancelarReserva).mockRejectedValue(
        new ErrorApi(422, 'Esta reserva ya fue marcada como abordada.'),
      );
      montarMapa();
    });
    When('intento cancelar mi registro', () => {
      fireEvent.click(screen.getByRole('button', { name: 'Ya no voy a esperar' }));
    });
    Then(
      'la aplicación no elimina mi reserva como si la cancelación hubiera funcionado',
      async () => {
        await screen.findByRole('alert');
        expect(localStorage.getItem('ecoruta_reserva')).not.toBeNull();
        expect(screen.getByText('Ya avisamos que estás esperando')).toBeTruthy();
      },
    );
    And('muestra un mensaje entendible', () => {
      const aviso = screen.getByRole('alert');
      expect(aviso.textContent?.trim().length).toBeGreaterThan(0);
      expect(aviso.textContent).not.toMatch(/ApiError|422/i);
    });
  });

  Scenario('Conservar mi reserva si no hay conexión', ({ Given, When, Then, And }) => {
    Given('que tengo una reserva activa guardada', () => {
      sembrarReserva();
    });
    And('el servidor no puede ser alcanzado', () => {
      vi.mocked(cancelarReserva).mockRejectedValue(new ErrorApi(0, 'Failed to fetch'));
      montarMapa();
    });
    When('intento cancelar mi registro', () => {
      fireEvent.click(screen.getByRole('button', { name: 'Ya no voy a esperar' }));
    });
    Then('mi reserva continúa guardada', async () => {
      await screen.findByRole('alert');
      expect(localStorage.getItem('ecoruta_reserva')).not.toBeNull();
    });
    And('puedo intentar nuevamente', () => {
      expect(
        (screen.getByRole('button', { name: 'Ya no voy a esperar' }) as HTMLButtonElement).disabled,
      ).toBe(false);
    });
  });

  Scenario('Actualizar el conteo después de cancelar', ({ Given, When, Then }) => {
    Given('que el conteo incluye mi reserva activa', () => {
      sembrarReserva();
      montarMapa();
      expect(screen.getByText('Ya avisamos que estás esperando')).toBeTruthy();
    });
    When('cancelo correctamente mi registro', async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Ya no voy a esperar' }));
      await screen.findByText('¿En qué parada vas a esperar?');
    });
    Then('la aplicación solicita inmediatamente un resumen actualizado', () => {
      expect(refrescar).toHaveBeenCalled();
    });
  });
});
