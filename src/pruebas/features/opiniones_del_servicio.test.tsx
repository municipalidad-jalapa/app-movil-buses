// @vitest-environment jsdom
import {
  describeFeature,
  getVitestCucumberConfiguration,
  loadFeature,
  setVitestCucumberConfiguration,
} from '@amiceli/vitest-cucumber';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, vi, test } from 'vitest';

import { OpinarSobreElServicio } from '../../componentes/opiniones/OpinarSobreElServicio';
import { ErrorApi } from '../../core/errores';
import { enviarOpinion, listarOpiniones, marcarAtendida, type PaginaDeOpiniones } from '../../core/opiniones';
import { AuthAdminContext, type EstadoAuthAdmin } from '../../core/panelAdmin/AuthAdminContext';
import { OpinionesPanel } from '../../paginas/admin/OpinionesPanel';

/** Aceptacion de SCRUM-26 (HU-146), bloque A, en la web. */

setVitestCucumberConfiguration(getVitestCucumberConfiguration({ language: 'es' }));

const feature = await loadFeature('src/pruebas/features/opiniones_del_servicio.feature', { language: 'es' });

const RUTA = { id: 1, nombre: 'Ruta de ejemplo - Centro de Jalapa', paradas: [], trazado: [] };

vi.mock('../../hooks/useRutaElegida', () => ({
  useRutaElegida: () => ({ rutas: [RUTA], rutaActiva: RUTA, elegirRuta: vi.fn(), cargando: false, error: null, reintentar: vi.fn() }),
}));
vi.mock('../../hooks/useReserva', () => ({
  useReserva: () => ({ reserva: null }),
}));
vi.mock('../../core/opiniones', async (original) => ({
  ...(await original<typeof import('../../core/opiniones')>()),
  enviarOpinion: vi.fn(),
  listarOpiniones: vi.fn(),
  marcarAtendida: vi.fn(),
}));
vi.mock('../../core/apiClient', async (original) => ({
  ...(await original<typeof import('../../core/apiClient')>()),
  apiClient: { get: vi.fn(async () => []), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const PAGINA: PaginaDeOpiniones = {
  total: 1,
  pagina: 0,
  tamano: 20,
  opiniones: [
    {
      id: 91,
      creadaEn: '2026-09-18T16:38:00Z',
      tipo: 'comentario',
      rutaId: 1,
      ruta: RUTA.nombre,
      vehiculoId: 1,
      vehiculo: 'BUS-01',
      estrellas: null,
      calidad: null,
      limpieza: null,
      conduccion: null,
      // Asi llega del backend: neutralizado.
      texto: '&lt;b&gt;hola&lt;/b&gt;',
      atendidaEn: null,
      atendidaPor: null,
    },
  ],
  resumen: { total: 1, promedioPorRuta: [], promedioPorVehiculo: [] },
};

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

describeFeature(feature, ({ Scenario, BeforeEachScenario, AfterEachScenario }) => {
  BeforeEachScenario(() => {
    vi.mocked(enviarOpinion).mockReset();
    vi.mocked(enviarOpinion).mockResolvedValue({ id: 91, rutaId: 1, vehiculoId: 1 });
    vi.mocked(listarOpiniones).mockResolvedValue(PAGINA);
    vi.mocked(marcarAtendida).mockResolvedValue({ id: 91, atendidaPor: 'jefa', atendidaEn: '2026-09-18T16:42:00Z' });
  });

  AfterEachScenario(() => cleanup());

  const mirandoLaRuta = () => {
    render(<OpinarSobreElServicio />);
  };
  const abrir = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Opinar sobre el servicio' }));
  };

  Scenario('Opinar desde la pantalla del pasajero sin cuenta y sin elegir la ruta', ({ Given, When, Then }) => {
    Given('que estoy mirando la ruta "Ruta de ejemplo - Centro de Jalapa"', mirandoLaRuta);
    When('abro "Opinar"', abrir);
    Then('veo la ruta "Ruta de ejemplo - Centro de Jalapa" como contexto, sin selector', () => {
      expect(screen.getByRole('dialog').textContent).toContain(RUTA.nombre);
      expect(screen.queryByRole('combobox')).toBeNull();
    });
  });

  Scenario('Enviar una calificación con estrellas y ver la confirmación', ({ Given, When, And, Then }) => {
    Given('que estoy mirando la ruta "Ruta de ejemplo - Centro de Jalapa"', mirandoLaRuta);
    When('abro "Opinar"', abrir);
    And('elijo el tipo "Calificación" y 4 estrellas', () => {
      fireEvent.click(screen.getByRole('radio', { name: /Calificación/ }));
      fireEvent.click(screen.getByRole('radio', { name: '4 estrellas de 5' }));
    });
    And('envío la opinión', () => {
      const boton = screen.getByRole('button', { name: 'Enviar opinión' });
      // Doble toque: no debe mandarse dos veces.
      fireEvent.click(boton);
      fireEvent.click(boton);
    });
    Then('se envía una sola vez con 4 estrellas para la ruta 1', async () => {
      await waitFor(() => expect(enviarOpinion).toHaveBeenCalledTimes(1));
      // Sin sesion de pasajero no viaja ningun token (segundo argumento vacio).
      expect(enviarOpinion).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: 'calificacion', rutaId: 1, estrellas: 4 }),
        undefined,
      );
    });
    And('veo "Gracias, recibimos tu opinión"', async () => {
      expect(await screen.findByText('Gracias, recibimos tu opinión')).toBeTruthy();
    });
  });

  Scenario('El comentario muestra cuántos caracteres quedan', ({ Given, When, And, Then }) => {
    Given('que estoy mirando la ruta "Ruta de ejemplo - Centro de Jalapa"', mirandoLaRuta);
    When('abro "Opinar"', abrir);
    And('escribo "Hola"', () => {
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Hola' } });
    });
    Then('veo "quedan 496 caracteres"', () => {
      expect(screen.getByText('quedan 496 caracteres')).toBeTruthy();
    });
  });

  Scenario('Si el envío falla, el texto no se pierde y puedo reintentar', ({ Given, When, And, Then }) => {
    Given('que estoy mirando la ruta "Ruta de ejemplo - Centro de Jalapa"', mirandoLaRuta);
    And('que el envío va a fallar por la conexión', () => {
      vi.mocked(enviarOpinion).mockRejectedValueOnce(new ErrorApi(0, 'Failed to fetch'));
    });
    When('abro "Opinar"', abrir);
    And('elijo el tipo "Queja" y escribo "El bus no paró"', () => {
      fireEvent.click(screen.getByRole('radio', { name: /Queja/ }));
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'El bus no paró' } });
    });
    And('envío la opinión', () => {
      fireEvent.click(screen.getByRole('button', { name: 'Enviar opinión' }));
    });
    Then('veo el aviso "No pudimos enviar tu opinión."', async () => {
      expect((await screen.findByRole('alert')).textContent).toContain('No pudimos enviar tu opinión.');
      expect(screen.getByRole('alert').textContent).not.toContain('Failed to fetch');
    });
    And('el texto "El bus no paró" sigue escrito', () => {
      expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('El bus no paró');
    });
    And('puedo "Reintentar"', () => {
      expect(screen.getByRole('button', { name: /Reintentar/ })).toBeTruthy();
    });
  });

  const abrirPanel = () => {
    render(
      <MemoryRouter>
        <AuthAdminContext.Provider value={sesionAdmin()}>
          <OpinionesPanel />
        </AuthAdminContext.Provider>
      </MemoryRouter>,
    );
  };

  Scenario('El panel municipal lista las opiniones con su texto como texto plano', ({ Given, When, Then, And }) => {
    Given('que tengo sesión de administrador', () => {});
    When('abro las opiniones del panel municipal', abrirPanel);
    Then('veo la opinión "<b>hola</b>" escrita tal cual, sin interpretarla', async () => {
      expect(await screen.findByText('<b>hola</b>')).toBeTruthy();
      expect(document.querySelector('.opiniones-texto b')).toBeNull();
    });
    And('veo "Opiniones del servicio"', () => {
      expect(screen.getByRole('heading', { name: 'Opiniones del servicio' })).toBeTruthy();
    });
  });

  Scenario('Marcar una opinión como atendida desde el panel', ({ Given, When, And, Then }) => {
    Given('que tengo sesión de administrador', () => {});
    When('abro las opiniones del panel municipal', abrirPanel);
    And('marco la opinión como atendida', async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Marcar como atendida' }));
    });
    Then('veo "Atendida por jefa"', async () => {
      expect(await screen.findByText(/Atendida por jefa/)).toBeTruthy();
      expect(marcarAtendida).toHaveBeenCalledWith('jwt', 91);
    });
  });
});

test('envía el texto literal y lo muestra sin ejecutar HTML ni decodificar dos veces', async () => {
  const literal = '  <script>alert("x")</script> & texto &lt;b&gt;  ';
  const neutralizado = '  &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; texto &amp;lt;b&amp;gt;  ';
  vi.mocked(enviarOpinion).mockReset();
  vi.mocked(enviarOpinion).mockResolvedValue({ id: 91, rutaId: 1, vehiculoId: 1 });
  try {
    render(<OpinarSobreElServicio />);
    fireEvent.click(screen.getByRole('button', { name: 'Opinar sobre el servicio' }));
    fireEvent.click(screen.getByRole('radio', { name: /Comentario/ }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: literal } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar opinión' }));
    await waitFor(() => expect(enviarOpinion).toHaveBeenCalledWith(
      expect.objectContaining({ texto: literal }), undefined));
    cleanup();
    vi.mocked(listarOpiniones).mockResolvedValue({ ...PAGINA,
      opiniones: [{ ...PAGINA.opiniones[0], texto: neutralizado }] });
    render(<MemoryRouter><AuthAdminContext.Provider value={sesionAdmin()}>
      <OpinionesPanel />
    </AuthAdminContext.Provider></MemoryRouter>);
    await waitFor(() => expect(document.querySelector('.opiniones-texto')?.textContent).toBe(literal));
    expect(document.querySelector('.opiniones-texto script, .opiniones-texto b')).toBeNull();
  } finally { cleanup(); }
});
