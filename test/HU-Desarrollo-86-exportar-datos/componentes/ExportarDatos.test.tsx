// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RutaProtegidaAdmin } from '../../../src/componentes/admin/RutaProtegidaAdmin';
import { ErrorApi } from '../../../src/core/errores';
import { AuthAdminProvider } from '../../../src/core/panelAdmin/AuthAdminProvider';
import { exportarDatosDelServicio } from '../../../src/core/panelAdmin/panelAdminApi';
import { borrarSesionAdmin, guardarSesionAdmin, leerSesionAdmin } from '../../../src/core/panelAdmin/sesionAdmin';
import { ExportarDatos, hoyEnGuatemala } from '../../../src/paginas/admin/ExportarDatos';

vi.mock('../../../src/core/firebase', () => ({ authFirebase: {} }));
vi.mock('firebase/auth', () => ({ signInWithEmailAndPassword: vi.fn(), getIdToken: vi.fn(), signOut: vi.fn() }));
vi.mock('../../../src/core/panelAdmin/panelAdminApi', async (original) => ({
  ...(await original<typeof import('../../../src/core/panelAdmin/panelAdminApi')>()),
  exportarDatosDelServicio: vi.fn(),
  renovarSesionAdmin: vi.fn(),
}));

const mockExportar = vi.mocked(exportarDatosDelServicio);
let clicks: string[] = [];

function montar() {
  return render(
    <MemoryRouter initialEntries={['/admin/exportar']}>
      <AuthAdminProvider>
        <Routes>
          <Route path="/admin/login" element={<h1>Login del panel</h1>} />
          <Route path="/admin" element={<h1>Portada</h1>} />
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

function elegir(desde: string, hasta: string) {
  fireEvent.change(screen.getByLabelText('Desde'), { target: { value: desde } });
  fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: hasta } });
}
const descargar = () => fireEvent.click(screen.getByRole('button', { name: /Descargar hoja de cálculo|Generando archivo/ }));

beforeEach(() => {
  clicks = [];
  borrarSesionAdmin();
  guardarSesionAdmin({ token: 'jwt-admin', expiraEnMs: Date.now() + 30 * 60_000, inactividadMinutos: 30, correo: 'admin@muni.gt' });
  mockExportar.mockReset();
  mockExportar.mockImplementation(async (_t, d, h) => ({ blob: new Blob(['x']), nombre: `e_${d}_${h}.xlsx` }));
  URL.createObjectURL = vi.fn(() => 'blob:prueba');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    clicks.push(this.download);
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  borrarSesionAdmin();
});

describe('HU-86 · pantalla Exportar datos · acceso', () => {
  it('sin sesion de administrador manda al login', () => {
    borrarSesionAdmin();
    montar();
    expect(screen.getByRole('heading', { name: 'Login del panel' })).toBeTruthy();
    expect(mockExportar).not.toHaveBeenCalled();
  });

  it('con sesion muestra titulo, correo y enlaces de navegacion', () => {
    montar();
    expect(screen.getByRole('heading', { name: 'Exportar datos del servicio' })).toBeTruthy();
    expect(screen.getByText('admin@muni.gt')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Estado del servicio' }).getAttribute('href')).toBe('/admin');
    expect(screen.getByRole('link', { name: 'Exportar datos' }).getAttribute('href')).toBe('/admin/exportar');
  });
});

describe('HU-86 · pantalla Exportar datos · selector de fechas (criterio 2)', () => {
  it('"Hasta" arranca en hoy (hora de Guatemala) y "Desde" vacio', () => {
    montar();
    expect((screen.getByLabelText('Hasta') as HTMLInputElement).value).toBe(hoyEnGuatemala());
    expect((screen.getByLabelText('Desde') as HTMLInputElement).value).toBe('');
  });

  it('los campos son selectores de fecha y no dejan elegir el futuro', () => {
    montar();
    const desde = screen.getByLabelText('Desde') as HTMLInputElement;
    const hasta = screen.getByLabelText('Hasta') as HTMLInputElement;
    expect(desde.type).toBe('date');
    expect(hasta.type).toBe('date');
    expect(hasta.max).toBe(hoyEnGuatemala());
    expect(desde.max).toBe(hasta.value);
  });

  it('avisa el maximo de 366 dias y que se cuenta en hora de Guatemala', () => {
    montar();
    expect(screen.getByText(/Máximo 366 días/)).toBeTruthy();
    expect(screen.getByText(/hora de Guatemala/)).toBeTruthy();
  });

  it('sin elegir "Desde" no envia y lo dice', () => {
    montar();
    descargar();
    expect(screen.getByRole('alert').textContent).toContain('Elige la fecha de inicio y la fecha final.');
    expect(mockExportar).not.toHaveBeenCalled();
  });

  it('un solo dia (desde = hasta) se envia', async () => {
    montar();
    elegir('2026-09-10', '2026-09-10');
    descargar();
    await waitFor(() => expect(mockExportar).toHaveBeenCalledWith('jwt-admin', '2026-09-10', '2026-09-10', expect.anything()));
  });

  it('corregir el rango limpia el aviso de error al reenviar', async () => {
    montar();
    elegir('2026-09-15', '2026-09-01');
    descargar();
    expect(screen.getByRole('alert')).toBeTruthy();
    elegir('2026-09-01', '2026-09-15');
    descargar();
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });
});

describe('HU-86 · pantalla Exportar datos · descarga (criterio 1)', () => {
  it('descarga el archivo con el nombre del servidor y lo confirma', async () => {
    montar();
    elegir('2026-09-01', '2026-09-15');
    descargar();
    expect((await screen.findByRole('status')).textContent).toContain('e_2026-09-01_2026-09-15.xlsx');
    expect(clicks).toEqual(['e_2026-09-01_2026-09-15.xlsx']);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('libera la URL temporal del archivo', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    montar();
    elegir('2026-09-01', '2026-09-15');
    descargar();
    await waitFor(() => expect(clicks).toHaveLength(1));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:prueba');
  });

  it('mientras genera, el boton se bloquea y no se duplica la peticion', async () => {
    let terminar!: () => void;
    mockExportar.mockImplementation(
      () => new Promise((ok) => (terminar = () => ok({ blob: new Blob(['x']), nombre: 'a.xlsx' }))),
    );
    montar();
    elegir('2026-09-01', '2026-09-15');
    descargar();
    const boton = await screen.findByRole('button', { name: 'Generando archivo…' });
    expect((boton as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(boton);
    expect(mockExportar).toHaveBeenCalledTimes(1);
    await act(async () => terminar());
    expect(((await screen.findByRole('button', { name: 'Descargar hoja de cálculo' })) as HTMLButtonElement).disabled).toBe(false);
  });

  it('se puede descargar otro rango despues del primero', async () => {
    montar();
    elegir('2026-09-01', '2026-09-15');
    descargar();
    await screen.findByRole('status');
    elegir('2026-08-01', '2026-08-31');
    descargar();
    await waitFor(() => expect(clicks).toEqual(['e_2026-09-01_2026-09-15.xlsx', 'e_2026-08-01_2026-08-31.xlsx']));
  });

  it('al desmontar durante la descarga no hay errores ni se descarga nada', async () => {
    let terminar!: () => void;
    mockExportar.mockImplementation(
      (_t, _d, _h, signal) =>
        new Promise((ok, no) => {
          signal?.addEventListener('abort', () => no(new ErrorApi(0, 'Peticion cancelada')));
          terminar = () => ok({ blob: new Blob(['x']), nombre: 'a.xlsx' });
        }),
    );
    const vista = montar();
    elegir('2026-09-01', '2026-09-15');
    descargar();
    vista.unmount();
    await act(async () => terminar?.());
    expect(clicks).toEqual([]);
  });
});

describe('HU-86 · pantalla Exportar datos · errores', () => {
  const apiError = (status: number, message: string) =>
    new ErrorApi(status, message, { timestamp: 't', status, error: 'e', message, path: '/p' });

  it('422: muestra el motivo del backend en lenguaje claro', async () => {
    mockExportar.mockRejectedValue(apiError(422, 'El rango no puede superar 366 días'));
    montar();
    elegir('2026-09-01', '2026-09-15');
    descargar();
    expect((await screen.findByRole('alert')).textContent).toContain('El rango no puede superar 366 días');
    expect(clicks).toEqual([]);
  });

  it('400: mensaje generico, sin codigos', async () => {
    mockExportar.mockRejectedValue(apiError(400, 'Bad Request'));
    montar();
    elegir('2026-09-01', '2026-09-15');
    descargar();
    expect((await screen.findByRole('alert')).textContent).toBe('Los datos enviados no son validos.');
  });

  it('401: cierra la sesion y manda al login', async () => {
    mockExportar.mockRejectedValue(apiError(401, 'Sesion invalida'));
    montar();
    elegir('2026-09-01', '2026-09-15');
    descargar();
    expect(await screen.findByRole('heading', { name: 'Login del panel' })).toBeTruthy();
    expect(leerSesionAdmin()).toBeNull();
  });

  it('403: cierra la sesion y manda al login', async () => {
    mockExportar.mockRejectedValue(apiError(403, 'Sin permiso'));
    montar();
    elegir('2026-09-01', '2026-09-15');
    descargar();
    expect(await screen.findByRole('heading', { name: 'Login del panel' })).toBeTruthy();
  });

  it('sin red: "revisa tu conexion", con opcion de reintentar el mismo rango', async () => {
    mockExportar.mockRejectedValueOnce(new ErrorApi(0, 'Fallo de red'));
    montar();
    elegir('2026-09-01', '2026-09-15');
    descargar();
    expect((await screen.findByRole('alert')).textContent).toContain('revisa tu conexion');
    expect((screen.getByLabelText('Desde') as HTMLInputElement).value).toBe('2026-09-01');
    descargar();
    await waitFor(() => expect(clicks).toHaveLength(1));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('500: dice que el servicio no esta disponible, sin jerga', async () => {
    mockExportar.mockRejectedValue(apiError(500, 'Internal Server Error'));
    montar();
    elegir('2026-09-01', '2026-09-15');
    descargar();
    const texto = (await screen.findByRole('alert')).textContent ?? '';
    expect(texto).toContain('no esta disponible');
    expect(texto).not.toMatch(/500|Internal/);
  });

  it('un error inesperado (no ErrorApi) muestra un mensaje propio', async () => {
    mockExportar.mockRejectedValue(new Error('boom'));
    montar();
    elegir('2026-09-01', '2026-09-15');
    descargar();
    expect((await screen.findByRole('alert')).textContent).toBe('No pudimos generar la exportación.');
  });
});

describe('HU-86 · pantalla Exportar datos · privacidad (criterio 3)', () => {
  it('avisa que solo hay datos agregados y no identifican a un pasajero', () => {
    montar();
    expect(screen.getByText(/no incluye información que identifique a ningún pasajero/)).toBeTruthy();
  });

  it('describe las 3 hojas del archivo', () => {
    montar();
    expect(screen.getByText(/^Resumen:/)).toBeTruthy();
    expect(screen.getByText(/^Demanda:/)).toBeTruthy();
    expect(screen.getByText(/^Recorridos:/)).toBeTruthy();
  });

  it('la pantalla no ofrece ningun campo de pasajero ni dispositivo', () => {
    montar();
    const campos = Array.from(document.querySelectorAll('input')).map((i) => i.type);
    expect(campos).toEqual(['date', 'date']);
  });
});
