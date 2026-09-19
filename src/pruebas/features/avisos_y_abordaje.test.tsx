// @vitest-environment jsdom
import {
  describeFeature,
  getVitestCucumberConfiguration,
  loadFeature,
  setVitestCucumberConfiguration,
} from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ReservaProvider } from '../../estado/ReservaProvider';
import { TarjetaAbordaje } from '../../componentes/TarjetaAbordaje';
import { PreferenciaNotificaciones } from '../../componentes/PreferenciaNotificaciones';
import { useAvisosDelBus } from '../../hooks/useAvisosDelBus';
import { confirmarAbordaje } from '../../core/reservas';
import { interpretarAviso } from '../../core/notificaciones/mensajeria';
import {
  marcarRechazado,
  sePuedeOfrecerAvisos,
  solicitarPermiso,
} from '../../core/notificaciones/permisoNotificaciones';
import { obtenerTokenNotificacion } from '../../core/notificaciones/mensajeria';
import { registrarTokenDelDispositivo } from '../../core/notificaciones/registroDeToken';
import type { Reserva } from '../../core/tipos';

/**
 * Pruebas de aceptacion de HU-58 (SCRUM-153).
 *
 * Misma convencion que el backend: los criterios de aceptacion de Jira se
 * escriben en Gherkin y cada escenario lleva su `@criterio-N`.
 *
 * Los escenarios `@manual` quedan excluidos a proposito: dependen de un push
 * real de Firebase o de un navegador de verdad. Su guion vive en
 * `docs/pruebas-manuales-HU-58.md`. Se dejan escritos en el .feature para que
 * el criterio no desaparezca solo porque ninguna herramienta lo alcanza.
 */

// `getVitestCucumberConfiguration` completa los campos que el setter exige y
// que aca no nos interesan (predefinedSteps, mappedExamples).
setVitestCucumberConfiguration(
  getVitestCucumberConfiguration({ language: 'es', excludeTags: ['manual'] }),
);

const feature = await loadFeature('src/pruebas/features/avisos_y_abordaje.feature', {
  language: 'es',
});

vi.mock('../../core/reservas', async (original) => ({
  ...(await original<typeof import('../../core/reservas')>()),
  confirmarAbordaje: vi.fn(),
}));

vi.mock('../../core/notificaciones/permisoNotificaciones', () => ({
  sePuedeOfrecerAvisos: vi.fn(),
  solicitarPermiso: vi.fn(),
  marcarRechazado: vi.fn(),
  yaFueRechazado: vi.fn(),
}));

vi.mock('../../core/notificaciones/registroDeToken', () => ({
  registrarTokenDelDispositivo: vi.fn(),
}));

vi.mock('../../core/notificaciones/mensajeria', async (original) => ({
  ...(await original<typeof import('../../core/notificaciones/mensajeria')>()),
  obtenerTokenNotificacion: vi.fn(),
}));

/** localStorage respaldado por un Map, igual que `identidadDispositivo.test.ts`. */
const almacenamiento = new Map<string, string>();

/**
 * jsdom no trae `navigator.serviceWorker`. Se monta un EventTarget para poder
 * despachar los mismos mensajes que manda el worker de verdad.
 */
let canalDelWorker: EventTarget;

const RESERVA_ACTIVA: Reserva = {
  id: 1,
  paradaId: 3,
  estado: 'ACTIVA',
  // Relativa al reloj: una reserva vencida ya no se restaura.
  expiraEn: new Date(Date.now() + 5 * 60_000).toISOString(),
};

function sembrarReserva(reserva: Reserva = RESERVA_ACTIVA) {
  almacenamiento.set('ecoruta_reserva', JSON.stringify(reserva));
}

function reservaGuardada(): Reserva | null {
  const crudo = almacenamiento.get('ecoruta_reserva');
  return crudo ? (JSON.parse(crudo) as Reserva) : null;
}

function avisarDeAbordaje(extra: Record<string, string> = {}) {
  canalDelWorker.dispatchEvent(
    new MessageEvent('message', {
      data: { tipo: 'confirmar-abordaje', reservaId: '1', ...extra },
    }),
  );
}

/** La pantalla del mapa reducida a lo que esta historia toca. */
function PantallaConAvisos() {
  const { preguntandoAbordaje } = useAvisosDelBus();
  return <TarjetaAbordaje preguntando={preguntandoAbordaje} />;
}

function montarMapa() {
  return render(
    <ReservaProvider>
      <PantallaConAvisos />
    </ReservaProvider>,
  );
}

/**
 * OJO: vitest-cucumber ejecuta CADA PASO como un `test` de vitest independiente.
 * Un `beforeEach`/`afterEach` normal correria entre pasos y desmontaria lo que
 * el paso anterior renderizo, dejando el DOM vacio a mitad de escenario. Por eso
 * el montaje y la limpieza van en los hooks por escenario, no por test.
 */
function prepararEscenario() {
  almacenamiento.clear();
  vi.clearAllMocks();

  vi.stubGlobal('localStorage', {
    getItem: (clave: string) => almacenamiento.get(clave) ?? null,
    setItem: (clave: string, valor: string) => almacenamiento.set(clave, valor),
    removeItem: (clave: string) => almacenamiento.delete(clave),
  });

  canalDelWorker = new EventTarget();
  vi.stubGlobal('navigator', {
    ...window.navigator,
    serviceWorker: canalDelWorker,
  });

  vi.mocked(sePuedeOfrecerAvisos).mockReturnValue(true);
  vi.mocked(obtenerTokenNotificacion).mockResolvedValue('token-fcm');
  vi.mocked(registrarTokenDelDispositivo).mockResolvedValue(undefined);
}

function limpiarEscenario() {
  cleanup();
  vi.unstubAllGlobals();
}

describeFeature(feature, ({ Scenario, BeforeEachScenario, AfterEachScenario }) => {
  BeforeEachScenario(prepararEscenario);
  AfterEachScenario(limpiarEscenario);

  Scenario('Se explica para qué sirven los avisos antes de pedir el permiso', ({ Given, When, Then, And }) => {
    Given('que el navegador todavía no sabe si el pasajero quiere avisos', () => {
      vi.mocked(sePuedeOfrecerAvisos).mockReturnValue(true);
    });
    When('el pasajero llega a la invitación de avisos', () => {
      render(<PreferenciaNotificaciones />);
    });
    Then('se le explica que le avisaremos cuando el bus venga para su parada', () => {
      expect(screen.getByText(/Te avisamos cuando el bus ya viene/)).toBeTruthy();
    });
    And('el navegador no ha pedido el permiso todavía', () => {
      expect(solicitarPermiso).not.toHaveBeenCalled();
    });
  });

  Scenario('Rechazar los avisos no rompe la reserva', ({ Given, When, Then, And }) => {
    Given('que el navegador todavía no sabe si el pasajero quiere avisos', () => {
      vi.mocked(sePuedeOfrecerAvisos).mockReturnValue(true);
      render(<PreferenciaNotificaciones />);
    });
    When('el pasajero elige seguir sin dar permisos', () => {
      fireEvent.click(screen.getByRole('button', { name: 'Seguir sin dar permisos' }));
    });
    Then('no se muestra ningún error', () => {
      expect(screen.queryByRole('alert')).toBeNull();
    });
    And('la negativa queda recordada', () => {
      expect(marcarRechazado).toHaveBeenCalled();
    });
  });

  Scenario('No se vuelve a insistir en cada visita', ({ Given, When, Then }) => {
    let contenedor: HTMLElement;

    Given('que el pasajero ya rechazó los avisos antes', () => {
      vi.mocked(sePuedeOfrecerAvisos).mockReturnValue(false);
    });
    When('el pasajero vuelve a la aplicación', () => {
      contenedor = render(<PreferenciaNotificaciones />).container;
    });
    Then('no se le ofrece activar los avisos', () => {
      expect(contenedor.firstChild).toBeNull();
    });
  });

  Scenario('Que falle el registro del token no se le informa al pasajero', ({ Given, But, Then }) => {
    Given('que el pasajero concede el permiso de avisos', () => {
      vi.mocked(solicitarPermiso).mockResolvedValue('concedido');
    });
    But('el registro del token falla', async () => {
      vi.mocked(registrarTokenDelDispositivo).mockRejectedValue(new Error('sin red'));
      render(<PreferenciaNotificaciones />);
      fireEvent.click(screen.getByRole('button', { name: 'Activar avisos' }));
      await waitFor(() => expect(registrarTokenDelDispositivo).toHaveBeenCalled());
    });
    Then('no se muestra ningún error', async () => {
      await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    });
  });

  Scenario('Sin Firebase configurado la aplicación sigue funcionando', ({ Given, When, Then, And }) => {
    Given('que el entorno no tiene Firebase configurado', () => {
      vi.mocked(obtenerTokenNotificacion).mockResolvedValue(null);
      vi.mocked(solicitarPermiso).mockResolvedValue('concedido');
    });
    When('el pasajero concede el permiso de avisos', async () => {
      render(<PreferenciaNotificaciones />);
      fireEvent.click(screen.getByRole('button', { name: 'Activar avisos' }));
      await waitFor(() => expect(obtenerTokenNotificacion).toHaveBeenCalled());
    });
    Then('no se registra ningún token', () => {
      expect(registrarTokenDelDispositivo).not.toHaveBeenCalled();
    });
    And('no se muestra ningún error', () => {
      expect(screen.queryByRole('alert')).toBeNull();
    });
  });

  Scenario('Al llegar el bus se pregunta si logró subir', ({ Given, When, Then, And }) => {
    Given('que el pasajero tiene una reserva activa', () => {
      sembrarReserva();
      montarMapa();
    });
    When('llega el aviso de que el bus llegó', () => {
      avisarDeAbordaje();
    });
    Then('se le pregunta si logró subir', async () => {
      expect(await screen.findByText('¿Lograste subir?')).toBeTruthy();
    });
    And('puede responder "Sí subí" o "No subí"', () => {
      expect(screen.getByRole('button', { name: /Sí subí/ })).toBeTruthy();
      expect(screen.getByRole('button', { name: /No subí/ })).toBeTruthy();
    });
  });

  Scenario('Sin aviso no se pregunta nada', ({ Given, When, Then }) => {
    Given('que el pasajero tiene una reserva activa', () => {
      sembrarReserva();
      montarMapa();
    });
    When('todavía no llegó ningún aviso', () => {
      // A proposito: no se despacha nada.
    });
    Then('no se le pregunta si logró subir', async () => {
      await waitFor(() => expect(screen.queryByText('¿Lograste subir?')).toBeNull());
    });
  });

  Scenario('Responder que sí cierra la reserva sin recargar', ({ Given, And, When, Then }) => {
    Given('que el pasajero tiene una reserva activa', () => {
      sembrarReserva();
      montarMapa();
    });
    And('llegó el aviso de que el bus llegó', async () => {
      avisarDeAbordaje();
      await screen.findByText('¿Lograste subir?');
    });
    When('responde que sí subió', async () => {
      vi.mocked(confirmarAbordaje).mockResolvedValue({ id: 1, estado: 'ABORDO' });
      fireEvent.click(screen.getByRole('button', { name: /Sí subí/ }));
      await waitFor(() => expect(confirmarAbordaje).toHaveBeenCalledWith(1, true));
    });
    Then('la reserva queda en estado "ABORDO"', async () => {
      await waitFor(() => expect(reservaGuardada()?.estado).toBe('ABORDO'));
    });
    And('la pantalla lo refleja sin recargar', async () => {
      expect(await screen.findByText(/Buen viaje/)).toBeTruthy();
    });
  });

  Scenario('Responder que no cancela la reserva sin recargar', ({ Given, And, When, Then }) => {
    Given('que el pasajero tiene una reserva activa', () => {
      sembrarReserva();
      montarMapa();
    });
    And('llegó el aviso de que el bus llegó', async () => {
      avisarDeAbordaje();
      await screen.findByText('¿Lograste subir?');
    });
    When('responde que no subió', async () => {
      vi.mocked(confirmarAbordaje).mockResolvedValue({ id: 1, estado: 'CANCELADA' });
      fireEvent.click(screen.getByRole('button', { name: /No subí/ }));
      await waitFor(() => expect(confirmarAbordaje).toHaveBeenCalledWith(1, false));
    });
    Then('la reserva queda en estado "CANCELADA"', async () => {
      await waitFor(() => expect(reservaGuardada()?.estado).toBe('CANCELADA'));
    });
    And('la pantalla lo refleja sin recargar', async () => {
      expect(await screen.findByText(/no lograste subir/)).toBeTruthy();
    });
  });

  Scenario('Si falla el envío la reserva no se pierde', ({ Given, And, When, Then }) => {
    Given('que el pasajero tiene una reserva activa', () => {
      sembrarReserva();
      montarMapa();
    });
    And('llegó el aviso de que el bus llegó', async () => {
      avisarDeAbordaje();
      await screen.findByText('¿Lograste subir?');
    });
    When('responde que sí subió pero el envío falla', async () => {
      vi.mocked(confirmarAbordaje).mockRejectedValue(new Error('sin red'));
      fireEvent.click(screen.getByRole('button', { name: /Sí subí/ }));
      await waitFor(() => expect(confirmarAbordaje).toHaveBeenCalled());
    });
    Then('se le avisa del problema', async () => {
      expect(await screen.findByRole('alert')).toBeTruthy();
    });
    And('todavía puede volver a responder', () => {
      expect(screen.getByRole('button', { name: /Sí subí/ })).toBeTruthy();
      expect(reservaGuardada()?.estado).toBe('ACTIVA');
    });
  });

  Scenario('Responder desde la propia notificación no vuelve a preguntar', ({ Given, When, Then, And }) => {
    Given('que el pasajero tiene una reserva activa', () => {
      sembrarReserva();
      vi.mocked(confirmarAbordaje).mockResolvedValue({ id: 1, estado: 'ABORDO' });
      montarMapa();
    });
    When('responde que sí subió desde el botón del aviso', async () => {
      avisarDeAbordaje({ respuestaAbordaje: 'true' });
      await waitFor(() => expect(confirmarAbordaje).toHaveBeenCalledWith(1, true));
    });
    Then('la reserva queda en estado "ABORDO"', async () => {
      await waitFor(() => expect(reservaGuardada()?.estado).toBe('ABORDO'));
    });
    And('no se le vuelve a preguntar', () => {
      expect(screen.queryByText('¿Lograste subir?')).toBeNull();
    });
  });

  Scenario('Ya no existe ningún aviso por juntar diez pasajeros', ({ When, Then }) => {
    let reconocidos: string[];

    When('se revisan los tipos de aviso que la aplicación entiende', () => {
      const candidatos = [
        'bus-cerca',
        'confirmar-abordaje',
        'umbral-alcanzado',
        'diez-pasajeros',
        'salida-programada',
      ];
      reconocidos = candidatos.filter((tipo) => interpretarAviso({ tipo }) !== null);
    });
    Then('solo existen el de bus acercándose y el de confirmar abordaje', () => {
      expect(reconocidos).toEqual(['bus-cerca', 'confirmar-abordaje']);
    });
  });
});
