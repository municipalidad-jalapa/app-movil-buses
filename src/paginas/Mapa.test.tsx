// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import type { Ruta } from '../core/tipos';
import { ErrorApi } from '../core/errores';
import { cancelarReserva, registrarDemanda, renovarReserva } from '../core/registroDemanda';
import { ReservaProvider } from '../estado/ReservaProvider';
import { Mapa } from './Mapa';

/*
 * jsdom no tiene WebGL2: el mapa cae al croquis, que es el mismo camino de un
 * telefono de gama baja. Las paradas del croquis tambien se tocan, asi que el
 * flujo completo de la reserva se prueba aqui.
 */

const RUTA: Ruta = {
  id: 1,
  nombre: 'Ruta de ejemplo',
  activa: true,
  paradas: [
    { id: 1, nombre: 'Parque Central', latitud: 14.634878, longitud: -89.981202, orden: 1 },
    { id: 2, nombre: '1a Calle - Mercado', latitud: 14.63245, longitud: -89.987308, orden: 2 },
    { id: 3, nombre: '1a Calle - El Calvario', latitud: 14.630328, longitud: -89.993654, orden: 3 },
  ],
  trazado: [],
};

const ubicacion = { latitud: 14.6323, longitud: -89.9871 };
const { solicitarUbicacion, refrescar, bus } = vi.hoisted(() => ({
  solicitarUbicacion: vi.fn(),
  refrescar: vi.fn(),
  bus: { posicion: null as null | Record<string, unknown>, recibidoEn: null as Date | null },
}));

vi.mock('../hooks/useRutas', () => ({
  useRutas: () => ({ rutaActiva: RUTA, cargando: false, error: null, reintentar: () => {} }),
}));
vi.mock('../hooks/usePosicionBus', () => ({
  usePosicionBus: () => ({
    posicion: bus.posicion,
    estadoConexion: 'en-vivo',
    recibidoEn: bus.recibidoEn,
    cargaInicialLista: false,
  }),
}));
vi.mock('../hooks/useResumenRuta', () => ({
  useResumenRuta: () => ({ esperandoPorParada: new Map([[2, 4]]), refrescar }),
}));
vi.mock('../hooks/useUbicacion', () => ({
  useUbicacion: () => ({ ubicacion: null, solicitando: false, error: null, solicitarUbicacion }),
}));
vi.mock('../core/registroDemanda', async (original) => ({
  ...(await original<typeof import('../core/registroDemanda')>()),
  registrarDemanda: vi.fn(),
  cancelarReserva: vi.fn(),
  renovarReserva: vi.fn(),
}));

function DelQr() {
  const { paradaId } = useParams();
  return <Navigate to={`/?parada=${paradaId}`} replace />;
}

function abrir(ruta = '/') {
  render(
    <ReservaProvider>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/" element={<Mapa />} />
          <Route path="/registro/:paradaId" element={<DelQr />} />
        </Routes>
      </MemoryRouter>
    </ReservaProvider>,
  );
}

const enMs = (ms: number) => new Date(Date.now() + ms).toISOString();

function guardarReservaVigente(expiraEn = enMs(5 * 60_000)) {
  localStorage.setItem(
    'ecoruta_reserva',
    JSON.stringify({ id: 9, paradaId: 2, estado: 'ACTIVA', expiraEn }),
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(registrarDemanda).mockReset();
  vi.mocked(cancelarReserva).mockReset();
  vi.mocked(renovarReserva).mockReset();
  bus.posicion = null;
  bus.recibidoEn = null;
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  solicitarUbicacion.mockReset().mockResolvedValue(ubicacion);
  refrescar.mockReset();
});
afterEach(cleanup);

describe('Pantalla del pasajero: reservar desde el mapa (HU-53)', () => {
  it('se llega a la reserva tocando una parada del mapa', () => {
    abrir();
    expect(screen.getByText('Tocá en el mapa la parada donde vas a esperar')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '1a Calle - Mercado' }));

    expect(screen.getByText('Parada elegida')).toBeTruthy();
    expect(screen.getByRole('heading', { name: '1a Calle - Mercado' })).toBeTruthy();
    // El conteo sale del resumen de la ruta.
    expect(screen.getByText('4')).toBeTruthy();
  });

  it('"Usar la parada más cercana" elige la parada por la ubicacion', async () => {
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Usar la parada más cercana' }));
    await screen.findByRole('heading', { name: '1a Calle - Mercado' });
  });

  it('sin permiso de ubicacion no se queda buscando: invita a tocar el mapa', async () => {
    solicitarUbicacion.mockResolvedValue(null);
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Usar la parada más cercana' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/tocándola en el mapa/);
    expect(screen.getByText('¿En qué parada vas a esperar?')).toBeTruthy();
  });

  it('confirma contra /reservas con dispositivo, parada y coordenadas', async () => {
    vi.mocked(registrarDemanda).mockResolvedValue({
      id: 9,
      paradaId: 2,
      estado: 'ACTIVA',
      expiraEn: enMs(5 * 60_000),
    });
    abrir();
    fireEvent.click(screen.getByRole('button', { name: '1a Calle - Mercado' }));
    fireEvent.click(screen.getByRole('button', { name: 'Estoy esperando aquí' }));

    await screen.findByText('Ya avisamos que estás esperando');
    expect(registrarDemanda).toHaveBeenCalledWith(
      expect.objectContaining({ paradaId: 2, latitud: ubicacion.latitud, longitud: ubicacion.longitud }),
    );
    expect(vi.mocked(registrarDemanda).mock.calls[0][0].dispositivoId).toMatch(/.+/);
    expect(screen.getByText('5')).toBeTruthy(); // MIN DE AVISO
    expect(refrescar).toHaveBeenCalled();
  });

  it('si el backend rechaza por la geocerca, lo dice en la hoja', async () => {
    const mensaje = 'Debes acercarte más a la parada para registrar que estás esperando.';
    vi.mocked(registrarDemanda).mockRejectedValue(
      new ErrorApi(422, mensaje, { timestamp: '', status: 422, error: '', path: '', message: mensaje }),
    );
    abrir();
    fireEvent.click(screen.getByRole('button', { name: '1a Calle - Mercado' }));
    fireEvent.click(screen.getByRole('button', { name: 'Estoy esperando aquí' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/acercarte más/);
  });

  it('una reserva duplicada no se trata como error (SCRUM-256)', async () => {
    vi.mocked(registrarDemanda).mockRejectedValue(
      new ErrorApi(422, 'Este dispositivo ya tiene una reserva activa.'),
    );
    abrir();
    fireEvent.click(screen.getByRole('button', { name: '1a Calle - Mercado' }));
    fireEvent.click(screen.getByRole('button', { name: 'Estoy esperando aquí' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/No hace falta avisar de nuevo/);
  });

  it('el QR de la parada abre el mapa con esa parada elegida (R2)', () => {
    abrir('/registro/3');
    expect(screen.getByRole('heading', { name: '1a Calle - El Calvario' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Estoy esperando aquí' })).toBeTruthy();
  });

  it('un QR de una parada que no es de la ruta vuelve a pedir la parada', async () => {
    abrir('/registro/99');
    await screen.findByText('¿En qué parada vas a esperar?');
  });

  it('una reserva vigente sigue confirmada al volver a abrir la app', () => {
    guardarReservaVigente();
    abrir();
    expect(screen.getByText('Ya avisamos que estás esperando')).toBeTruthy();
    expect(registrarDemanda).not.toHaveBeenCalled();
  });

  it('"Ya no voy a esperar" cancela con el dispositivo y vuelve a R1', async () => {
    guardarReservaVigente();
    vi.mocked(cancelarReserva).mockResolvedValue();
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Ya no voy a esperar' }));

    await screen.findByText('¿En qué parada vas a esperar?');
    expect(cancelarReserva).toHaveBeenCalledWith(9, expect.any(String));
    expect(localStorage.getItem('ecoruta_reserva')).toBeNull();
  });

  it('con la reserva hecha, tocar otra parada no la cambia', () => {
    guardarReservaVigente();
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Parque Central' }));
    expect(screen.getByText('Ya avisamos que estás esperando')).toBeTruthy();
  });

  it('cuando vence la reserva vuelve a R2 con la misma parada', async () => {
    guardarReservaVigente(enMs(1200));
    abrir();
    await waitFor(() => expect(screen.getByText(/Tu aviso venció/)).toBeTruthy(), { timeout: 3000 });
    expect(screen.getByRole('heading', { name: '1a Calle - Mercado' })).toBeTruthy();
  });
});

describe('Pantalla del pasajero: vigencia de la reserva (HU-52)', () => {
  it('con menos de un minuto pregunta si sigue esperando y renueva', async () => {
    guardarReservaVigente(enMs(45_000));
    vi.mocked(renovarReserva).mockResolvedValue({
      id: 9,
      paradaId: 2,
      estado: 'RENOVADA',
      expiraEn: enMs(5 * 60_000),
    });
    abrir();

    expect(screen.getByText('¿Seguís esperando?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Sigo esperando' }));

    await waitFor(() => expect(screen.queryByText('¿Seguís esperando?')).toBeNull());
    expect(renovarReserva).toHaveBeenCalledWith(9, expect.any(String));
    expect(screen.getByText('5')).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('ecoruta_reserva') ?? '{}').estado).toBe('RENOVADA');
  });

  it('con tiempo de sobra no pregunta nada', () => {
    guardarReservaVigente();
    abrir();
    expect(screen.queryByText('¿Seguís esperando?')).toBeNull();
  });

  it('si al renovar ya habia vencido, vuelve a R2 con la misma parada', async () => {
    guardarReservaVigente(enMs(45_000));
    vi.mocked(renovarReserva).mockRejectedValue(new ErrorApi(422, 'Esta reserva ya venció o no está activa.'));
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Sigo esperando' }));
    await screen.findByText(/Tu aviso venció/);
    expect(screen.getByRole('button', { name: 'Estoy esperando aquí' })).toBeTruthy();
  });
});

describe('Pantalla del pasajero: datos del bus (HU-60) y sin conexion (09)', () => {
  it('con un dato de mas de 5 minutos, la hora pasa al frente', () => {
    const hace = new Date(Date.now() - 8 * 60_000);
    bus.posicion = {
      latitud: 14.63,
      longitud: -89.98,
      velocidadKmh: 0,
      timestamp: hace.toISOString(),
      vehiculo: 'BUS-01',
    };
    bus.recibidoEn = hace;
    abrir();
    expect(screen.getByText(/Sin datos nuevos: puede que el bus/)).toBeTruthy();
  });

  it('con un dato fresco no se avisa nada', () => {
    bus.posicion = {
      latitud: 14.63,
      longitud: -89.98,
      velocidadKmh: 0,
      timestamp: new Date().toISOString(),
      vehiculo: 'BUS-01',
    };
    bus.recibidoEn = new Date();
    abrir();
    expect(screen.queryByText(/Sin datos nuevos: puede/)).toBeNull();
  });

  it('sin red muestra el estado del artboard 09, sin tono de error', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    abrir();
    expect(screen.getByRole('heading', { name: 'Sin internet' })).toBeTruthy();
    expect(screen.getByText(/Los números pueden haber cambiado/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Intentar de nuevo' })).toBeTruthy();
  });
});
