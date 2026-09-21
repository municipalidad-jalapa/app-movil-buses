// @vitest-environment jsdom
import {
  describeFeature,
  getVitestCucumberConfiguration,
  loadFeature,
  setVitestCucumberConfiguration,
} from '@amiceli/vitest-cucumber';
import { cleanup, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { MemoryRouter } from 'react-router-dom';
import { expect, vi } from 'vitest';

import { ErrorApi } from '../../core/errores';
import { AuthAdminContext, type EstadoAuthAdmin } from '../../core/panelAdmin/AuthAdminContext';
import { consultarAbordajes, type ConteoDeAbordajes } from '../../core/panelAdmin/panelAdminApi';
import { atrasoVigente } from '../../core/atrasos';
import { ReportarAtraso } from '../../componentes/atrasos/ReportarAtraso';
import { AbordajesPanel } from '../../paginas/admin/AbordajesPanel';
import {
  alturasMinimasDeControles,
  anchosQueDesbordan,
  coloresFueraDelTema,
  contraste,
  paleta,
  tamanosDeLetra,
} from '../utilidades/auditoriaVisual';

/**
 * Aceptación de SCRUM-26 (HU-146), bloque G.
 *
 * El criterio 1 pide traducir «visiblemente agradable» a números verificables;
 * esta prueba es esa traducción, y falla cuando alguien los rompe.
 */

setVitestCucumberConfiguration(getVitestCucumberConfiguration({ language: 'es' }));

const feature = await loadFeature('src/pruebas/features/criterios_visuales.feature', { language: 'es' });

/**
 * Pares de color que la interfaz usa como texto sobre fondo. Se revisan en las
 * dos versiones del tema: el modo oscuro está diseñado aparte, no invertido, y
 * es justo donde un color de marca puede quedar ilegible.
 */
const PARES: [string, string][] = [
  ['tinta', 'superficie-base'],
  ['tinta-cuerpo', 'superficie-base'],
  ['tinta-secundaria', 'superficie-base'],
  ['tinta-tenue', 'superficie-base'],
  ['tinta-tenue', 'superficie-suave'],
  ['acento-texto', 'superficie-base'],
  ['acento-texto', 'superficie-tarjeta'],
  ['alerta-texto', 'superficie-base'],
  ['aviso-tinta', 'aviso-superficie'],
  ['amarillo-volcan-tinta', 'amarillo-volcan'],
  ['verde-jumay-suave', 'verde-jumay'],
  ['conductor-tinta', 'conductor-fondo'],
  ['conductor-tinta', 'conductor-tarjeta'],
  ['conductor-tinta-suave', 'conductor-tarjeta'],
];

/**
 * Deuda heredada: hojas anteriores a SCRUM-26 que escriben el color a mano en
 * vez de usar un token. La lista está para que no crezca; cada historia que
 * toque uno de estos archivos lo pasa a tokens y lo saca de aquí.
 */
const DEUDA_DE_PALETA = [
  'src/componentes/AvisoSinConexion.css',
  'src/componentes/HojaReserva.css',
  'src/componentes/Layout.css',
  'src/componentes/MapaJalapa.css',
  'src/componentes/MenuAcceso.css',
  'src/componentes/PreferenciaNotificaciones.css',
  'src/componentes/SelectorDeRuta.css',
  'src/componentes/TarjetaAbordaje.css',
  'src/paginas/PantallaRegistro.css',
  'src/paginas/admin/PanelMunicipal.css',
];

/** Letras menores a 13 px: solo sellos y atribuciones sobre el mapa. */
const LETRA_PEQUENA_PERMITIDA = [
  'src/componentes/HojaReserva.css',
  'src/componentes/HoraUltimoDato.css',
  'src/componentes/MapaJalapa.css',
  'src/componentes/MenuAcceso.css',
  'src/componentes/opiniones/OpinarSobreElServicio.css',
  'src/paginas/admin/OpinionesPanel.css',
];

vi.mock('../../core/panelAdmin/panelAdminApi', async (original) => ({
  ...(await original<typeof import('../../core/panelAdmin/panelAdminApi')>()),
  consultarAbordajes: vi.fn(),
}));
vi.mock('../../core/atrasos', async (original) => ({
  ...(await original<typeof import('../../core/atrasos')>()),
  atrasoVigente: vi.fn(),
  reportarAtraso: vi.fn(),
  retirarAtraso: vi.fn(),
}));
vi.mock('../../core/apiClient', async (original) => ({
  ...(await original<typeof import('../../core/apiClient')>()),
  apiClient: { get: vi.fn(async () => []), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

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

function montarPanel() {
  render(
    <MemoryRouter>
      <AuthAdminContext.Provider value={sesionAdmin()}>
        <AbordajesPanel />
      </AuthAdminContext.Provider>
    </MemoryRouter>,
  );
}

const vacio: ConteoDeAbordajes = {
  total: 0,
  granularidad: 'DIA',
  porRuta: [],
  porVehiculo: [],
  porPeriodo: [],
};

describeFeature(feature, ({ Scenario, AfterEachScenario }) => {
  AfterEachScenario(() => {
    cleanup();
    vi.clearAllMocks();
  });

  Scenario('La tipografía del cuerpo se lee sin esfuerzo', ({ Then, And }) => {
    Then('el texto base mide 16 px', () => {
      const global = readFileSync('src/estilos/global.css', 'utf8');
      // 1rem = 16 px: el navegador manda, y así respeta el tamaño del sistema.
      expect(global).toMatch(/body\s*{[^}]*font-size:\s*1rem/);
      expect(global).toMatch(/line-height:\s*1\.5/);
    });
    And('ninguna hoja de estilo declara una letra menor a 11 px', () => {
      const pequenas = tamanosDeLetra().filter(({ px }) => px < 11);
      expect(pequenas).toEqual([]);
      // Entre 11 y 13 px solo los sellos y atribuciones ya existentes.
      const sellos = [...new Set(tamanosDeLetra().filter(({ px }) => px < 13).map((f) => f.ruta))];
      expect(sellos.filter((ruta) => !LETRA_PEQUENA_PERMITIDA.includes(ruta))).toEqual([]);
    });
  });

  Scenario('El contraste cumple WCAG AA de día y de noche', ({ Then, And }) => {
    Then('cada par de color documentado llega a 4.5 a 1 en modo claro', () => {
      const { claro } = paleta();
      for (const [texto, fondo] of PARES) {
        expect(claro[texto], `falta el token --${texto}`).toBeDefined();
        expect(contraste(claro[texto], claro[fondo]), `${texto} sobre ${fondo} (claro)`)
          .toBeGreaterThanOrEqual(4.5);
      }
    });
    And('cada par de color documentado llega a 4.5 a 1 en modo oscuro', () => {
      const { oscuro } = paleta();
      for (const [texto, fondo] of PARES) {
        expect(contraste(oscuro[texto], oscuro[fondo]), `${texto} sobre ${fondo} (oscuro)`)
          .toBeGreaterThanOrEqual(4.5);
      }
    });
  });

  Scenario('El área tocable nunca baja del mínimo', ({ Then, And }) => {
    Then('el área tocable mínima del tema es de al menos 44 px', () => {
      const tema = readFileSync('src/estilos/tema.css', 'utf8');
      const declarado = Number(tema.match(/--tactil-minimo:\s*([0-9.]+)px/)?.[1]);
      expect(declarado).toBeGreaterThanOrEqual(44);
    });
    And('ninguna altura mínima declarada baja de 44 px', () => {
      // Un min-height menor a 44 px es un control que no se puede tocar con el
      // pulgar. Los adornos (manijas, pastillas de carga) no cuentan.
      const controles = alturasMinimasDeControles();
      // La prueba tiene que estar mirando controles de verdad, no una lista vacía.
      expect(controles.length).toBeGreaterThan(5);
      expect(controles.filter(({ px }) => px < 44)).toEqual([]);
    });
  });

  Scenario('La paleta vive en un solo lugar', ({ Then }) => {
    Then('los colores nuevos salen del tema y no se escriben a mano', () => {
      expect(coloresFueraDelTema()).toEqual(DEUDA_DE_PALETA);
    });
  });

  Scenario('En un teléfono no hay desplazamiento horizontal', ({ Then }) => {
    Then('ninguna pantalla del pasajero fija un ancho mayor al del teléfono', () => {
      expect(anchosQueDesbordan()).toEqual([]);
    });
  });

  Scenario('Cargando tiene tratamiento visual, no una pantalla en blanco', ({ Given, When, Then }) => {
    Given('que el panel todavía no recibe los datos', () => {
      vi.mocked(atrasoVigente).mockReturnValue(new Promise(() => {}));
    });
    When('abro la pantalla del piloto', () => {
      render(<ReportarAtraso />);
    });
    Then('veo que algo está pasando y no una pantalla vacía', () => {
      expect(screen.getByText(/Revisando si hay un atraso reportado/)).toBeTruthy();
      expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
    });
  });

  Scenario('El vacío se explica y ofrece una salida', ({ Given, When, Then }) => {
    Given('que no hay abordajes en el periodo', () => {
      vi.mocked(consultarAbordajes).mockResolvedValue(vacio);
    });
    When('abro los pasajeros subidos del panel', () => {
      montarPanel();
    });
    Then('veo un texto que explica el vacío y un botón para limpiar filtros', async () => {
      expect(await screen.findByText('No hay abordajes con estos filtros')).toBeTruthy();
      expect(screen.getByRole('button', { name: /Limpiar filtros/ })).toBeTruthy();
    });
  });

  Scenario('El error se anuncia en palabras entendibles', ({ Given, When, Then }) => {
    Given('que el servidor falla al cargar los abordajes', () => {
      vi.mocked(consultarAbordajes).mockRejectedValue(new ErrorApi(500, 'Error interno'));
    });
    When('abro los pasajeros subidos del panel', () => {
      montarPanel();
    });
    Then('veo un aviso de error anunciado a la tecnología de asistencia', async () => {
      const alerta = await screen.findByRole('alert');
      expect(alerta.textContent).toBeTruthy();
      expect(alerta.textContent).not.toContain('500');
    });
  });
});
