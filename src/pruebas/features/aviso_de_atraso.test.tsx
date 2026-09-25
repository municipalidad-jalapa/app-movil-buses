// @vitest-environment jsdom
import {
  describeFeature,
  getVitestCucumberConfiguration,
  loadFeature,
  setVitestCucumberConfiguration,
} from '@amiceli/vitest-cucumber';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, vi } from 'vitest';

import { AvisoDeDemora } from '../../componentes/atrasos/AvisoDeDemora';
import { ReportarAtraso } from '../../componentes/atrasos/ReportarAtraso';
import {
  atrasoVigente,
  reportarAtraso,
  retirarAtraso,
  type AvisoDeAtraso,
  type MotivoDeAtraso,
} from '../../core/atrasos';
import { consultarEta, type Eta } from '../../core/eta';
import { ErrorApi } from '../../core/errores';

/** Aceptacion de SCRUM-26 (HU-146), bloque E, en la web. */

setVitestCucumberConfiguration(getVitestCucumberConfiguration({ language: 'es' }));

const feature = await loadFeature('src/pruebas/features/aviso_de_atraso.feature', { language: 'es' });

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
vi.mock('../../core/atrasos', async (original) => ({
  ...(await original<typeof import('../../core/atrasos')>()),
  atrasoVigente: vi.fn(),
  reportarAtraso: vi.fn(),
  retirarAtraso: vi.fn(),
}));
vi.mock('../../core/eta', async (original) => ({
  ...(await original<typeof import('../../core/eta')>()),
  consultarEta: vi.fn(),
}));

function aviso(motivo: MotivoDeAtraso, minutos: number): AvisoDeAtraso {
  return {
    id: 7,
    rutaId: 1,
    motivo,
    demoraMinutos: minutos,
    comentario: null,
    reportadoEn: '2026-09-20T15:00:00Z',
    vigenteHasta: '2026-09-20T15:30:00Z',
  };
}

function eta(minutos: number | null, atraso: AvisoDeAtraso | null): Eta {
  return {
    rutaId: 1,
    vehiculoId: 1,
    calculadoEn: '2026-09-20T15:00:00Z',
    estado: 'EN_RUTA',
    paradas: [{ paradaId: 2, orden: 2, minutos, confiable: true }],
    atraso,
  };
}

const montarPiloto = async () => {
  render(<ReportarAtraso />);
  await screen.findByText('Aviso de atraso');
};

describeFeature(feature, ({ Scenario, BeforeEachScenario, AfterEachScenario }) => {
  BeforeEachScenario(() => {
    vi.mocked(atrasoVigente).mockResolvedValue(null);
    vi.mocked(reportarAtraso).mockResolvedValue(aviso('TRAFICO', 10));
    vi.mocked(retirarAtraso).mockResolvedValue(undefined);
    vi.mocked(consultarEta).mockResolvedValue(eta(8, null));
  });

  AfterEachScenario(() => {
    cleanup();
    vi.clearAllMocks();
  });

  Scenario('El piloto avisa un atraso con motivo y demora', ({ Given, When, Then, And }) => {
    Given('que soy el piloto y no tengo ningún atraso reportado', async () => {
      await montarPiloto();
    });
    When('elijo el motivo "Incidente" y una demora de 20 minutos', () => {
      fireEvent.click(screen.getByRole('button', { name: 'Incidente' }));
      fireEvent.change(screen.getByLabelText(/Otra cantidad/), { target: { value: '20' } });
    });
    And('aviso el atraso', async () => {
      vi.mocked(reportarAtraso).mockResolvedValue(aviso('INCIDENTE', 20));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Avisar atraso/ }));
      });
    });
    Then('se reporta el atraso por "incidente" de 20 minutos', () => {
      expect(reportarAtraso).toHaveBeenCalledWith({
        motivo: 'incidente',
        demoraMinutos: 20,
        comentario: undefined,
      });
    });
    And('la pantalla confirma que los pasajeros ya lo están viendo', async () => {
      expect(await screen.findByText(/Avisaste un incidente: unos 20 min de demora\./)).toBeTruthy();
      expect(screen.getByText(/Los pasajeros lo están viendo/)).toBeTruthy();
    });
  });

  Scenario('El aviso no se manda dos veces por un doble toque', ({ Given, When, Then }) => {
    Given('que soy el piloto y no tengo ningún atraso reportado', async () => {
      await montarPiloto();
    });
    When('aviso el atraso dos veces seguidas', async () => {
      const boton = screen.getByRole('button', { name: /Avisar atraso/ });
      await act(async () => {
        fireEvent.click(boton);
        fireEvent.click(boton);
      });
    });
    Then('el atraso se reporta una sola vez', () => {
      expect(reportarAtraso).toHaveBeenCalledTimes(1);
    });
  });

  Scenario('Si el aviso falla se explica en palabras entendibles', ({ Given, When, Then, And }) => {
    Given('que soy el piloto y no tengo ningún atraso reportado', async () => {
      await montarPiloto();
    });
    And('que el servidor rechaza el aviso', () => {
      vi.mocked(reportarAtraso).mockRejectedValue(
        new ErrorApi(422, 'Unprocessable Entity', {
          timestamp: '2026-09-20T15:00:00Z',
          status: 422,
          error: 'Unprocessable Entity',
          message: 'Este piloto no tiene una ruta asignada.',
          path: '/api/v1/conductor/atrasos',
        }),
      );
    });
    When('aviso el atraso', async () => {
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Avisar atraso/ }));
      });
    });
    Then('veo un aviso de error que no es el error crudo de la API', async () => {
      const alerta = await screen.findByRole('alert');
      expect(alerta.textContent).toBe('Este piloto no tiene una ruta asignada.');
      expect(alerta.textContent).not.toContain('422');
    });
  });

  Scenario('El piloto retira el aviso cuando se normaliza', ({ Given, When, Then }) => {
    Given('que soy el piloto y tengo un atraso reportado por "tráfico" de 10 minutos', async () => {
      vi.mocked(atrasoVigente).mockResolvedValue(aviso('TRAFICO', 10));
      await montarPiloto();
      expect(await screen.findByText(/Avisaste tráfico: unos 10 min de demora\./)).toBeTruthy();
    });
    When('retiro el aviso', async () => {
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Ya se normalizó/ }));
      });
    });
    Then('vuelvo a ver el formulario para avisar un atraso', async () => {
      expect(retirarAtraso).toHaveBeenCalled();
      expect(await screen.findByRole('button', { name: /Avisar atraso/ })).toBeTruthy();
    });
  });

  Scenario('El pasajero ve la demora junto al tiempo estimado', ({ Given, When, Then, And }) => {
    Given('que la ruta que estoy mirando tiene un atraso reportado por "tráfico" de 15 minutos', () => {
      vi.mocked(consultarEta).mockResolvedValue(eta(8, aviso('TRAFICO', 15)));
    });
    And('que el bus llega en 8 minutos', () => {
      expect(vi.mocked(consultarEta)).toBeDefined();
    });
    When('abro la pantalla del pasajero', () => {
      render(<AvisoDeDemora />);
    });
    Then('veo "Llega en 8 min, con demora reportada"', async () => {
      expect(await screen.findByText('Llega en 8 min, con demora reportada')).toBeTruthy();
    });
    And('veo que el piloto avisó tráfico y unos 15 min más', () => {
      expect(screen.getByText(/El piloto avisó tráfico: unos 15 min más de lo estimado\./)).toBeTruthy();
    });
  });

  Scenario('Sin atraso reportado no se muestra ningún aviso', ({ Given, When, Then }) => {
    Given('que la ruta que estoy mirando no tiene ningún atraso reportado', () => {
      vi.mocked(consultarEta).mockResolvedValue(eta(8, null));
    });
    When('abro la pantalla del pasajero', () => {
      render(<AvisoDeDemora />);
    });
    Then('no veo ningún aviso de demora', async () => {
      await waitFor(() => expect(consultarEta).toHaveBeenCalled());
      expect(screen.queryByText(/demora reportada/)).toBeNull();
    });
  });
});
