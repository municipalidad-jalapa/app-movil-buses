// @vitest-environment jsdom
import {
  describeFeature,
  getVitestCucumberConfiguration,
  loadFeature,
  setVitestCucumberConfiguration,
} from '@amiceli/vitest-cucumber';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, vi } from 'vitest';

import { RutaProtegidaAdmin } from '../../componentes/admin/RutaProtegidaAdmin';
import { ErrorApi } from '../../core/errores';
import { AuthAdminProvider } from '../../core/panelAdmin/AuthAdminProvider';
import { exportarDatosDelServicio } from '../../core/panelAdmin/panelAdminApi';
import { borrarSesionAdmin, guardarSesionAdmin } from '../../core/panelAdmin/sesionAdmin';
import { ExportarDatos } from '../../paginas/admin/ExportarDatos';

/** Aceptacion de HU-86 en el panel. El contenido del .xlsx y la privacidad los prueba el backend. */

setVitestCucumberConfiguration(getVitestCucumberConfiguration({ language: 'es' }));

const feature = await loadFeature('src/pruebas/features/exportar_datos_del_servicio.feature', { language: 'es' });

vi.mock('../../core/firebase', () => ({ authFirebase: {} }));
vi.mock('firebase/auth', () => ({ signInWithEmailAndPassword: vi.fn(), getIdToken: vi.fn(), signOut: vi.fn() }));
vi.mock('../../core/panelAdmin/panelAdminApi', async (original) => ({
  ...(await original<typeof import('../../core/panelAdmin/panelAdminApi')>()),
  exportarDatosDelServicio: vi.fn(),
  renovarSesionAdmin: vi.fn(),
}));

function montar() {
  return render(
    <MemoryRouter initialEntries={['/admin/exportar']}>
      <AuthAdminProvider>
        <Routes>
          <Route
            path="/admin/exportar"
            element={
              <RutaProtegidaAdmin>
                <ExportarDatos />
              </RutaProtegidaAdmin>
            }
          />
        </Routes>
      </AuthAdminProvider>
    </MemoryRouter>,
  );
}

function elegirYDescargar(desde: string, hasta: string) {
  fireEvent.change(screen.getByLabelText('Desde'), { target: { value: desde } });
  fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: hasta } });
  fireEvent.click(screen.getByRole('button', { name: 'Descargar hoja de cálculo' }));
}

describeFeature(feature, ({ Scenario, BeforeEachScenario, AfterEachScenario }) => {
  const guardado: { nombre: string; blob: Blob }[] = [];

  BeforeEachScenario(() => {
    guardado.length = 0;
    borrarSesionAdmin();
    guardarSesionAdmin({ token: 'jwt-admin', expiraEnMs: Date.now() + 30 * 60_000, inactividadMinutos: 30, correo: 'a@muni.gt' });
    vi.mocked(exportarDatosDelServicio).mockReset();
    vi.mocked(exportarDatosDelServicio).mockImplementation(async (_t, desde, hasta) => ({
      blob: new Blob(['xlsx']),
      nombre: `exportacion-servicio_${desde}_${hasta}.xlsx`,
    }));
    URL.createObjectURL = vi.fn(() => 'blob:prueba');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      guardado.push({ nombre: this.download, blob: new Blob() });
    });
  });

  AfterEachScenario(() => {
    cleanup();
    vi.restoreAllMocks();
    borrarSesionAdmin();
  });

  Scenario('Descargo la hoja de cálculo de un rango de fechas', ({ Given, When, Then, And }) => {
    Given('que tengo una sesión de administrador en la pantalla de exportar datos', () => {
      montar();
    });
    When('elijo del "2026-09-01" al "2026-09-15" y descargo', () => elegirYDescargar('2026-09-01', '2026-09-15'));
    Then('se pide el archivo de ese rango con mi sesión', async () => {
      await waitFor(() =>
        expect(exportarDatosDelServicio).toHaveBeenCalledWith('jwt-admin', '2026-09-01', '2026-09-15', expect.anything()),
      );
    });
    And('se guarda el archivo "exportacion-servicio_2026-09-01_2026-09-15.xlsx"', async () => {
      await waitFor(() => expect(guardado.map((g) => g.nombre)).toEqual(['exportacion-servicio_2026-09-01_2026-09-15.xlsx']));
      expect(await screen.findByRole('status')).toBeTruthy();
    });
  });

  Scenario('Un rango invertido no se envía', ({ Given, When, Then, And }) => {
    Given('que tengo una sesión de administrador en la pantalla de exportar datos', () => {
      montar();
    });
    When('elijo del "2026-09-15" al "2026-09-01" y descargo', () => elegirYDescargar('2026-09-15', '2026-09-01'));
    Then('veo el aviso "La fecha final no puede ser anterior a la fecha de inicio."', () => {
      expect(screen.getByRole('alert').textContent).toContain('La fecha final no puede ser anterior a la fecha de inicio.');
    });
    And('no se pide ningún archivo', () => {
      expect(exportarDatosDelServicio).not.toHaveBeenCalled();
    });
  });

  Scenario('Un rango de más de 366 días no se envía', ({ Given, When, Then, And }) => {
    Given('que tengo una sesión de administrador en la pantalla de exportar datos', () => {
      montar();
    });
    When('elijo del "2025-01-01" al "2026-09-15" y descargo', () => elegirYDescargar('2025-01-01', '2026-09-15'));
    Then('veo el aviso "El rango puede abarcar como máximo 366 días."', () => {
      expect(screen.getByRole('alert').textContent).toContain('El rango puede abarcar como máximo 366 días.');
    });
    And('no se pide ningún archivo', () => {
      expect(exportarDatosDelServicio).not.toHaveBeenCalled();
    });
  });

  Scenario('El backend rechaza el rango', ({ Given, And, When, Then }) => {
    Given('que tengo una sesión de administrador en la pantalla de exportar datos', () => {
      montar();
    });
    And('que el servicio rechaza el rango con "El rango no puede superar 366 días"', () => {
      vi.mocked(exportarDatosDelServicio).mockRejectedValue(
        new ErrorApi(422, 'El rango no puede superar 366 días', {
          timestamp: '2026-09-20T10:00:00Z',
          status: 422,
          error: 'Unprocessable Entity',
          message: 'El rango no puede superar 366 días',
          path: '/api/v1/admin/exportaciones/servicio',
        }),
      );
    });
    When('elijo del "2026-09-01" al "2026-09-15" y descargo', () => elegirYDescargar('2026-09-01', '2026-09-15'));
    Then('veo el aviso "El rango no puede superar 366 días"', async () => {
      expect((await screen.findByRole('alert')).textContent).toContain('El rango no puede superar 366 días');
    });
  });

  Scenario('La pantalla avisa que no hay datos de pasajeros', ({ Given, Then }) => {
    Given('que tengo una sesión de administrador en la pantalla de exportar datos', () => {
      montar();
    });
    Then('veo que el archivo no incluye información que identifique a ningún pasajero', () => {
      expect(screen.getByText(/no incluye información que identifique a ningún pasajero/)).toBeTruthy();
    });
  });
});
