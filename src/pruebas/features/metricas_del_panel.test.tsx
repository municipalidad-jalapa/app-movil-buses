// @vitest-environment jsdom
import {
  describeFeature,
  getVitestCucumberConfiguration,
  loadFeature,
  setVitestCucumberConfiguration,
} from '@amiceli/vitest-cucumber';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, vi } from 'vitest';

import { OpinarSobreElServicio } from '../../componentes/opiniones/OpinarSobreElServicio';
import { enviarOpinion, listarOpiniones, type PaginaDeOpiniones, type PromedioOpiniones } from '../../core/opiniones';
import { AuthAdminContext, type EstadoAuthAdmin } from '../../core/panelAdmin/AuthAdminContext';
import { consultarAbordajes, type ConteoDeAbordajes } from '../../core/panelAdmin/panelAdminApi';
import { AbordajesPanel } from '../../paginas/admin/AbordajesPanel';
import { OpinionesPanel } from '../../paginas/admin/OpinionesPanel';

/** Aceptacion de SCRUM-26 (HU-146), bloque F, en la web. */

setVitestCucumberConfiguration(getVitestCucumberConfiguration({ language: 'es' }));

const feature = await loadFeature('src/pruebas/features/metricas_del_panel.feature', { language: 'es' });

const RUTA = { id: 1, nombre: 'Ruta de ejemplo - Centro de Jalapa', paradas: [], trazado: [] };

vi.mock('../../hooks/useRutaElegida', () => ({
  useRutaElegida: () => ({
    rutas: [RUTA],
    rutaActiva: RUTA,
    elegirRuta: vi.fn(),
    cargando: false,
    error: null,
    reintentar: vi.fn(),
  }),
}));
vi.mock('../../hooks/useReserva', () => ({ useReserva: () => ({ reserva: null }) }));
vi.mock('../../core/pasajero/SesionPasajeroContext', () => ({ useSesionPasajero: () => null }));
vi.mock('../../core/opiniones', async (original) => ({
  ...(await original<typeof import('../../core/opiniones')>()),
  enviarOpinion: vi.fn(),
  listarOpiniones: vi.fn(),
  marcarAtendida: vi.fn(),
}));
vi.mock('../../core/panelAdmin/panelAdminApi', async (original) => ({
  ...(await original<typeof import('../../core/panelAdmin/panelAdminApi')>()),
  consultarAbordajes: vi.fn(),
}));
vi.mock('../../core/apiClient', async (original) => ({
  ...(await original<typeof import('../../core/apiClient')>()),
  apiClient: { get: vi.fn(async () => []), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

function promedio(parcial: Partial<PromedioOpiniones>): PromedioOpiniones {
  return {
    id: 1,
    nombre: RUTA.nombre,
    promedio: null,
    calidad: null,
    limpieza: null,
    conduccion: null,
    calificadas: 2,
    opiniones: 2,
    ...parcial,
  };
}

function pagina(promedios: PromedioOpiniones[]): PaginaDeOpiniones {
  return {
    total: 0,
    pagina: 0,
    tamano: 20,
    opiniones: [],
    resumen: { total: 0, promedioPorRuta: promedios, promedioPorVehiculo: [] },
  };
}

function conteo(parcial: Partial<ConteoDeAbordajes>): ConteoDeAbordajes {
  return {
    total: 0,
    granularidad: 'DIA',
    porRuta: [],
    porVehiculo: [],
    porPeriodo: [],
    ...parcial,
  };
}

function sesionAdmin(): EstadoAuthAdmin {
  return {
    estado: 'dentro',
    sesion: { token: 'jwt', expiraEnMs: Date.now() + 30 * 60_000, inactividadMinutos: 30, correo: 'jefa@muni.gt' },
    correoDenegado: null,
    motivoCierre: null,
    iniciarSesion: vi.fn(),
    renovarSesion: vi.fn(async () => undefined),
    cerrarSesion: vi.fn(),
    usarOtraCuenta: vi.fn(),
  };
}

function montarPanel(Pantalla: () => React.JSX.Element) {
  render(
    <MemoryRouter>
      <AuthAdminContext.Provider value={sesionAdmin()}>
        <Pantalla />
      </AuthAdminContext.Provider>
    </MemoryRouter>,
  );
}

/** Puntúa una dimensión por su etiqueta accesible: «<etiqueta>: N estrellas de 5». */
function calificar(etiqueta: string, valor: number) {
  fireEvent.click(
    screen.getByRole('radio', {
      name: new RegExp(`^${etiqueta}: ${valor} (estrella|estrellas) de 5$`),
    }),
  );
}

describeFeature(feature, ({ Scenario, BeforeEachScenario, AfterEachScenario }) => {
  BeforeEachScenario(() => {
    vi.mocked(enviarOpinion).mockResolvedValue({ id: 91, rutaId: 1, vehiculoId: 1 });
    vi.mocked(listarOpiniones).mockResolvedValue(pagina([]));
    vi.mocked(consultarAbordajes).mockResolvedValue(conteo({}));
  });

  AfterEachScenario(() => {
    cleanup();
    vi.clearAllMocks();
  });

  Scenario('El pasajero puntúa las tres cosas por separado', ({ Given, When, Then, And }) => {
    Given('que abro la hoja para opinar', () => {
      render(<OpinarSobreElServicio />);
      fireEvent.click(screen.getByRole('button', { name: /Opinar sobre el servicio/ }));
      fireEvent.click(screen.getByRole('radio', { name: 'Calificación' }));
    });
    When('califico la calidad con 4, la limpieza con 2 y la conducción con 5', () => {
      calificar('Calidad del servicio', 4);
      calificar('Limpieza de la unidad', 2);
      calificar('Conducción prudente', 5);
    });
    And('envío la opinión', async () => {
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Enviar/ }));
      });
    });
    Then('la opinión se envía con las tres valoraciones', () => {
      expect(enviarOpinion).toHaveBeenCalledWith(
        expect.objectContaining({ calidad: 4, limpieza: 2, conduccion: 5, rutaId: 1 }),
        undefined,
      );
    });
  });

  Scenario('Puntuar una sola dimensión ya es contenido suficiente', ({ Given, When, Then, And }) => {
    Given('que abro la hoja para opinar', () => {
      render(<OpinarSobreElServicio />);
      fireEvent.click(screen.getByRole('button', { name: /Opinar sobre el servicio/ }));
      fireEvent.click(screen.getByRole('radio', { name: 'Calificación' }));
    });
    When('califico solo la limpieza con 3', () => {
      calificar('Limpieza de la unidad', 3);
    });
    And('envío la opinión', async () => {
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Enviar/ }));
      });
    });
    Then('la opinión se envía solo con la limpieza', () => {
      expect(enviarOpinion).toHaveBeenCalledWith(
        expect.objectContaining({ limpieza: 3, calidad: undefined, conduccion: undefined }),
        undefined,
      );
    });
  });

  Scenario('El panel muestra cada dimensión por separado', ({ Given, When, Then, And }) => {
    Given('que el panel tiene promedios de calidad 4.5, limpieza 2.5 y conducción 4.5', () => {
      vi.mocked(listarOpiniones).mockResolvedValue(
        pagina([promedio({ promedio: 4.5, calidad: 4.5, limpieza: 2.5, conduccion: 4.5 })]),
      );
    });
    When('abro las opiniones del panel', () => {
      montarPanel(OpinionesPanel);
    });
    Then('veo el promedio de "Calidad del servicio" en 4.5', async () => {
      const fila = (await screen.findAllByText('Calidad del servicio'))[0].closest('li');
      expect(within(fila!).getByText('4.5')).toBeTruthy();
    });
    And('veo el promedio de "Limpieza de la unidad" en 2.5', () => {
      const fila = screen.getAllByText('Limpieza de la unidad')[0].closest('li');
      expect(within(fila!).getByText('2.5')).toBeTruthy();
    });
    And('veo el promedio de "Conducción prudente" en 4.5', () => {
      const fila = screen.getAllByText('Conducción prudente')[0].closest('li');
      expect(within(fila!).getByText('4.5')).toBeTruthy();
    });
  });

  Scenario('Una dimensión sin datos no se muestra como cero', ({ Given, When, Then }) => {
    Given('que el panel tiene promedio de calidad 4.0 y ninguna otra dimensión puntuada', () => {
      vi.mocked(listarOpiniones).mockResolvedValue(pagina([promedio({ calidad: 4 })]));
    });
    When('abro las opiniones del panel', () => {
      montarPanel(OpinionesPanel);
    });
    Then('la limpieza y la conducción dicen "Sin datos"', async () => {
      const limpieza = (await screen.findAllByText('Limpieza de la unidad'))[0].closest('li');
      expect(within(limpieza!).getByText('Sin datos')).toBeTruthy();
      const conduccion = screen.getAllByText('Conducción prudente')[0].closest('li');
      expect(within(conduccion!).getByText('Sin datos')).toBeTruthy();
      expect(within(conduccion!).queryByText('0.0')).toBeNull();
    });
  });

  Scenario('El panel muestra los pasajeros subidos por ruta y por periodo', ({ Given, When, Then, And }) => {
    Given('que el piloto marcó 128 abordajes en el periodo', () => {
      vi.mocked(consultarAbordajes).mockResolvedValue(
        conteo({
          total: 128,
          porRuta: [{ id: 1, nombre: RUTA.nombre, abordajes: 90 }],
          porVehiculo: [{ id: 1, nombre: 'BUS-01', abordajes: 90 }],
          porPeriodo: [{ periodo: '2026-09-19T00:00:00Z', abordajes: 37 }],
        }),
      );
    });
    When('abro los pasajeros subidos del panel', () => {
      montarPanel(AbordajesPanel);
    });
    Then('veo el total de 128 pasajeros subidos', async () => {
      expect(await screen.findByText('128')).toBeTruthy();
    });
    And('veo el desglose por ruta y por vehículo', () => {
      expect(screen.getByText('BUS-01')).toBeTruthy();
      expect(screen.getAllByText(RUTA.nombre).length).toBeGreaterThan(0);
      expect(screen.getByText('37')).toBeTruthy();
    });
    And('la pantalla aclara que se cuenta lo que marcó el piloto', () => {
      expect(screen.getByText(/el dato del piloto es el que prevalece/i)).toBeTruthy();
    });
  });

  Scenario('Sin abordajes en el periodo se explica el vacío', ({ Given, When, Then }) => {
    Given('que no hay abordajes en el periodo', () => {
      vi.mocked(consultarAbordajes).mockResolvedValue(conteo({ total: 0 }));
    });
    When('abro los pasajeros subidos del panel', () => {
      montarPanel(AbordajesPanel);
    });
    Then('veo "No hay abordajes con estos filtros"', async () => {
      await waitFor(() => expect(consultarAbordajes).toHaveBeenCalled());
      expect(await screen.findByText('No hay abordajes con estos filtros')).toBeTruthy();
    });
  });
});
