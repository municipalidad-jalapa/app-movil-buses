// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import type { Ruta } from '../core/tipos';
import { ErrorApi } from '../core/errores';
import { cancelarReserva, registrarDemanda, renovarReserva } from '../core/registroDemanda';
import { ReservaProvider } from '../estado/ReservaProvider';
import { RutaElegidaProvider } from '../estado/RutaElegidaProvider';
import { SelectorDeRuta } from '../componentes/SelectorDeRuta';
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

/** La ruta de prueba de V12, con ids de parada propios. */
const RUTA_METROPLAZA: Ruta = {
  id: 2,
  nombre: 'Ruta de prueba - Parque Central a Metroplaza',
  activa: true,
  paradas: [
    { id: 21, nombre: 'Parque Central (Metroplaza)', latitud: 14.634878, longitud: -89.981202, orden: 1 },
    { id: 25, nombre: 'Metroplaza', latitud: 14.660728, longitud: -90.001026, orden: 2 },
  ],
  trazado: [],
};

/** Fuera del mock para que la referencia sea estable entre renders. */
const RUTAS = [RUTA, RUTA_METROPLAZA];

const ubicacion = { latitud: 14.6323, longitud: -89.9871 };
const { solicitarUbicacion, refrescar, bus, etaActual } = vi.hoisted(() => ({
  solicitarUbicacion: vi.fn(),
  refrescar: vi.fn(),
  bus: { posicion: null as null | Record<string, unknown>, recibidoEn: null as Date | null },
  etaActual: { valor: null as null | Record<string, unknown> },
}));

vi.mock('../hooks/useRutas', () => ({
  useRutas: () => ({ rutas: RUTAS, rutaActiva: RUTA, cargando: false, error: null, reintentar: () => {} }),
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
vi.mock('../hooks/useEtaRuta', () => ({
  useEtaRuta: () => etaActual.valor,
}));
vi.mock('../hooks/useUbicacion', () => ({
  useUbicacion: () => ({ ubicacion: null, solicitando: false, error: null, solicitarUbicacion }),
}));
vi.mock('../core/registroDemanda', async (original) => ({
  ...(await original<typeof import('../core/registroDemanda')>()),
  registrarDemanda: vi.fn(),
  cancelarReserva: vi.fn(),
  renovarReserva: vi.fn(),
  // La sincronizacion con el servidor no cambia nada en estas pruebas.
  consultarReserva: vi.fn(async () => null),
}));

function DelQr() {
  const { paradaId } = useParams();
  return <Navigate to={`/?parada=${paradaId}`} replace />;
}

function abrir(ruta = '/') {
  render(
    <RutaElegidaProvider>
      <ReservaProvider>
        <SelectorDeRuta />
        <MemoryRouter initialEntries={[ruta]}>
          <Routes>
            <Route path="/" element={<Mapa />} />
            <Route path="/registro/:paradaId" element={<DelQr />} />
          </Routes>
        </MemoryRouter>
      </ReservaProvider>
    </RutaElegidaProvider>,
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
  etaActual.valor = null;
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
    expect(cancelarReserva).toHaveBeenCalledTimes(1);
    expect(cancelarReserva).toHaveBeenCalledWith(9, expect.any(String));
    expect(localStorage.getItem('ecoruta_reserva')).toBeNull();
    expect(refrescar).toHaveBeenCalled();
  });

  it('mientras el DELETE está pendiente, un toque repetido no genera dos peticiones', async () => {
    guardarReservaVigente();
    let liberar!: () => void;
    vi.mocked(cancelarReserva).mockImplementation(
      () =>
        new Promise((resolver) => {
          liberar = () => resolver();
        }),
    );
    abrir();
    const boton = screen.getByRole('button', { name: 'Ya no voy a esperar' });
    fireEvent.click(boton);
    fireEvent.click(boton);
    fireEvent.click(screen.getByRole('button', { name: 'Avisando…' }));

    expect(cancelarReserva).toHaveBeenCalledTimes(1);
    liberar();
    await screen.findByText('¿En qué parada vas a esperar?');
  });

  it('ante 422/ABORDO no elimina la reserva y muestra un aviso accesible', async () => {
    guardarReservaVigente();
    vi.mocked(cancelarReserva).mockRejectedValue(
      new ErrorApi(422, 'Esta reserva ya fue marcada como abordada.'),
    );
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Ya no voy a esperar' }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText('Ya avisamos que estás esperando')).toBeTruthy();
    expect(localStorage.getItem('ecoruta_reserva')).not.toBeNull();
    expect(screen.queryByText('¿En qué parada vas a esperar?')).toBeNull();
    expect(
      (screen.getByRole('button', { name: 'Ya no voy a esperar' }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it('ante 403 conserva la reserva y permite reintentar', async () => {
    guardarReservaVigente();
    vi.mocked(cancelarReserva).mockRejectedValue(new ErrorApi(403, 'Forbidden'));
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Ya no voy a esperar' }));

    const aviso = await screen.findByRole('alert');
    expect(aviso.textContent).not.toMatch(/ApiError|403|Forbidden/i);
    expect(localStorage.getItem('ecoruta_reserva')).not.toBeNull();
    expect(
      (screen.getByRole('button', { name: 'Ya no voy a esperar' }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it('ante falla de red conserva la reserva y muestra un mensaje claro', async () => {
    guardarReservaVigente();
    vi.mocked(cancelarReserva).mockRejectedValue(new ErrorApi(0, 'Failed to fetch'));
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Ya no voy a esperar' }));

    const aviso = await screen.findByRole('alert');
    expect(aviso.textContent).toMatch(/conexion|conexión|datos nuevos/i);
    expect(localStorage.getItem('ecoruta_reserva')).not.toBeNull();
    expect(
      (screen.getByRole('button', { name: 'Ya no voy a esperar' }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it('ante 5xx conserva la reserva y no muestra códigos técnicos', async () => {
    guardarReservaVigente();
    vi.mocked(cancelarReserva).mockRejectedValue(new ErrorApi(503, 'Service Unavailable'));
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Ya no voy a esperar' }));

    const aviso = await screen.findByRole('alert');
    expect(aviso.textContent).not.toMatch(/ApiError|503|Service Unavailable/i);
    expect(localStorage.getItem('ecoruta_reserva')).not.toBeNull();
    expect(
      (screen.getByRole('button', { name: 'Ya no voy a esperar' }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it('ante 404 limpia la copia local obsoleta, refresca y no afirma éxito', async () => {
    guardarReservaVigente();
    vi.mocked(cancelarReserva).mockRejectedValue(new ErrorApi(404, 'Not Found'));
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Ya no voy a esperar' }));

    await screen.findByText('¿En qué parada vas a esperar?');
    expect(localStorage.getItem('ecoruta_reserva')).toBeNull();
    expect(refrescar).toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText(/cancelaci[oó]n realizada/i)).toBeNull();
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

describe('Pantalla del pasajero: minutos para que llegue el bus (QA 5.1)', () => {
  it('con la parada elegida muestra cuanto falta y si el calculo es confiable', () => {
    etaActual.valor = {
      rutaId: 1,
      vehiculoId: 1,
      calculadoEn: new Date().toISOString(),
      estado: 'EN_RUTA',
      desvio: null,
      paradas: [{ paradaId: 2, orden: 2, minutos: 7, confiable: false }],
    };
    guardarReservaVigente();
    abrir();
    expect(screen.getByText('Llega a tu parada en')).toBeTruthy();
    expect(screen.getByText('≈ 7 min')).toBeTruthy();
    expect(screen.getByText('cálculo aproximado')).toBeTruthy();
  });

  it('sin parada elegida no muestra el ETA', () => {
    abrir();
    expect(screen.queryByText('Llega a tu parada en')).toBeNull();
  });
});

describe('Pantalla del pasajero: correcciones de QA 4.1', () => {
  it('el boton de ubicacion va en dos toques: primero donde estoy, despues la parada mas cercana', async () => {
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Ver mi ubicación' }));
    // Primer toque: solo te ubica. No elige parada.
    await screen.findByText('Tocá otra vez: parada más cercana');
    expect(solicitarUbicacion).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Parada elegida')).toBeNull();

    // Segundo toque: la parada mas cercana a (14.6323, -89.9871) es el Mercado.
    fireEvent.click(screen.getByRole('button', { name: 'Ir a la parada más cercana' }));
    await screen.findByText('Parada elegida');
    expect(screen.getByRole('heading', { name: '1a Calle - Mercado' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ver mi ubicación' })).toBeTruthy();
  });

  it('la hoja se achica a una linea y se vuelve a abrir', () => {
    guardarReservaVigente();
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Achicar para ver el mapa' }));
    expect(screen.queryByRole('button', { name: 'Ya no voy a esperar' })).toBeNull();
    const resumen = screen.getByRole('button', { name: /Esperando en 1a Calle - Mercado\s*5 min/ });
    fireEvent.click(resumen);
    expect(screen.getByRole('button', { name: 'Ya no voy a esperar' })).toBeTruthy();
  });

  it('con la hoja achicada, el aviso por vencer la vuelve a abrir', () => {
    guardarReservaVigente(enMs(90_000));
    abrir();
    // Quedan menos de dos minutos: ya esta preguntando, aunque se intente achicar.
    expect(screen.getByText('¿Seguís esperando?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Achicar para ver el mapa' }));
    expect(screen.getByRole('button', { name: 'Sigo esperando' })).toBeTruthy();
    expect(screen.getByText(/Tu aviso vence en 1 min/)).toBeTruthy();
  });

  it('avisa por vencer con dos minutos de margen y vibra una sola vez', () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    guardarReservaVigente(enMs(110_000));
    abrir();
    expect(screen.getByText('¿Seguís esperando?')).toBeTruthy();
    expect(vibrate).toHaveBeenCalledTimes(1);
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

describe('Pantalla del pasajero: el bus llega a tu parada (HU-57/HU-58 sin push)', () => {
  function busEn(latitud: number, longitud: number) {
    bus.posicion = { latitud, longitud, velocidadKmh: 0, timestamp: new Date().toISOString(), vehiculo: 'BUS-01' };
    bus.recibidoEn = new Date();
  }

  it('a menos de 250 m avisa que el bus ya viene', () => {
    guardarReservaVigente();
    busEn(14.6339, -89.9873); // unos 160 m al norte del Mercado
    abrir();
    expect(screen.getByText('El bus ya viene para tu parada')).toBeTruthy();
    expect(screen.queryByText('¿Lograste subir?')).toBeNull();
  });

  it('en la parada pregunta si logro subir, aunque no haya llegado ningun push', () => {
    guardarReservaVigente();
    busEn(14.63245, -89.987308); // en el Mercado
    abrir();
    expect(screen.getByText('¿Lograste subir?')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Sí subí/ })).toBeTruthy();
  });

  it('lejos no avisa nada', () => {
    guardarReservaVigente();
    busEn(14.634878, -89.981202); // Parque Central, a unos 700 m
    abrir();
    expect(screen.queryByText('El bus ya viene para tu parada')).toBeNull();
    expect(screen.queryByText('¿Lograste subir?')).toBeNull();
  });
});

describe('Pantalla del pasajero: selector de rutas', () => {
  const selector = () => screen.getByRole('combobox', { name: 'Ruta' }) as HTMLSelectElement;

  it('ofrece las rutas activas con su nombre corto', () => {
    abrir();
    const opciones = Array.from(selector().options).map((o) => o.textContent);
    expect(opciones).toEqual(['Ruta de ejemplo', 'Parque Central a Metroplaza']);
    expect(selector().value).toBe('1');
  });

  it('al elegir otra ruta muestra sus paradas y lo recuerda', () => {
    abrir();
    fireEvent.change(selector(), { target: { value: '2' } });

    expect(screen.getByRole('button', { name: 'Metroplaza' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '1a Calle - Mercado' })).toBeNull();
    expect(localStorage.getItem('ecoruta_ruta_elegida')).toBe('2');
  });

  it('cambiar de ruta suelta la parada elegida en la otra', () => {
    abrir();
    fireEvent.click(screen.getByRole('button', { name: '1a Calle - Mercado' }));
    expect(screen.getByText('Parada elegida')).toBeTruthy();

    fireEvent.change(selector(), { target: { value: '2' } });

    expect(screen.getByText('¿En qué parada vas a esperar?')).toBeTruthy();
  });

  it('el QR de una parada de la otra ruta abre esa ruta con la parada elegida', async () => {
    abrir('/registro/25');
    await waitFor(() => expect(selector().value).toBe('2'));
    expect(screen.getByRole('heading', { name: 'Metroplaza' })).toBeTruthy();
  });

  it('con un aviso vigente el selector queda fijo en la ruta de la reserva', async () => {
    localStorage.setItem(
      'ecoruta_reserva',
      JSON.stringify({ id: 9, paradaId: 25, estado: 'ACTIVA', expiraEn: enMs(5 * 60_000) }),
    );
    abrir();
    await waitFor(() => expect(selector().value).toBe('2'));
    expect(selector().disabled).toBe(true);
    expect(screen.getByText('Ya avisamos que estás esperando')).toBeTruthy();
  });

  it('con una sola ruta activa no se muestra el selector', () => {
    RUTAS.splice(1, 1);
    try {
      abrir();
      expect(screen.queryByRole('combobox', { name: 'Ruta' })).toBeNull();
    } finally {
      RUTAS.push(RUTA_METROPLAZA);
    }
  });
});
