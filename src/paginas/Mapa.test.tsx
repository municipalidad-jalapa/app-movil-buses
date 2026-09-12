// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import { Mapa } from './Mapa';

import { useEta } from '../hooks/useEta';
import { useFrescuraPosicion } from '../hooks/useFrescuraPosicion';
import { usePosicionBus } from '../hooks/usePosicionBus';
import { usePrefiereOscuro } from '../hooks/usePrefiereOscuro';
import { useRutas } from '../hooks/useRutas';

import type {
  Posicion,
  Ruta,
} from '../core/tipos';

/**
 * Simulamos los hooks para probar solamente
 * el comportamiento visual de Mapa.tsx.
 */
vi.mock('../hooks/useEta', () => ({
  useEta: vi.fn(),
}));

vi.mock('../hooks/useFrescuraPosicion', () => ({
  useFrescuraPosicion: vi.fn(),
}));

vi.mock('../hooks/usePosicionBus', () => ({
  usePosicionBus: vi.fn(),
}));

vi.mock('../hooks/usePrefiereOscuro', () => ({
  usePrefiereOscuro: vi.fn(),
}));

vi.mock('../hooks/useRutas', () => ({
  useRutas: vi.fn(),
}));

/**
 * No necesitamos arrancar MapLibre durante
 * estas pruebas.
 *
 * El mapa falso crea un boton por cada parada
 * de la ruta que recibe.
 *
 * Esto tambien permite demostrar HU-74
 * utilizando rutas diferentes sin IDs fijos.
 */
vi.mock('../componentes/MapaJalapa', () => ({
  MapaJalapa: ({
    ruta,
    onSeleccionarParada,
  }: {
    ruta: Ruta | null;
    onSeleccionarParada?: (
      paradaId: number,
    ) => void;
  }) => (
    <div>
      {ruta?.paradas.map((parada) => (
        <button
          key={parada.id}
          type="button"
          onClick={() =>
            onSeleccionarParada?.(
              parada.id,
            )
          }
        >
          Seleccionar {parada.nombre}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('../componentes/BannerConexion', () => ({
  BannerConexion: () => (
    <div>Conexion simulada</div>
  ),
}));

vi.mock('../componentes/EstadoSinPosicion', () => ({
  EstadoSinPosicion: () => (
    <div>Sin posicion</div>
  ),
}));

vi.mock('../componentes/HoraUltimoDato', () => ({
  HoraUltimoDato: () => (
    <div>Ultimo dato</div>
  ),
}));

vi.mock('../componentes/MensajeError', () => ({
  MensajeError: () => (
    <div>Error simulado</div>
  ),
}));

/**
 * Primera ruta.
 *
 * Utilizamos IDs diferentes de los reales
 * para comprobar que la funcionalidad
 * no depende de numeros escritos a mano.
 */
const RUTA: Ruta = {
  id: 77,
  nombre: 'Ruta de prueba',
  activa: true,

  paradas: [
    {
      id: 101,
      nombre: 'Parada A',
      latitud: 14.63,
      longitud: -89.98,
      orden: 1,
    },
    {
      id: 205,
      nombre: 'Parada B',
      latitud: 14.63,
      longitud: -89.97,
      orden: 2,
    },
    {
      id: 999,
      nombre: 'Parada C',
      latitud: 14.64,
      longitud: -89.97,
      orden: 3,
    },
  ],

  trazado: [
    {
      latitud: 14.63,
      longitud: -89.98,
    },
    {
      latitud: 14.63,
      longitud: -89.97,
    },
    {
      latitud: 14.64,
      longitud: -89.97,
    },
  ],
};

/**
 * Segunda ruta completamente diferente.
 *
 * Esta ruta usa:
 * rutaId = 88
 * paradaId = 301 y 450
 *
 * Sirve para comprobar que HU-74
 * funciona con cualquier ruta del catalogo.
 */
const RUTA_DOS: Ruta = {
  id: 88,
  nombre: 'Ruta secundaria',
  activa: true,

  paradas: [
    {
      id: 301,
      nombre: 'Parada Ruta 2 A',
      latitud: 14.64,
      longitud: -89.99,
      orden: 1,
    },
    {
      id: 450,
      nombre: 'Parada Ruta 2 B',
      latitud: 14.645,
      longitud: -89.985,
      orden: 2,
    },
  ],

  trazado: [
    {
      latitud: 14.64,
      longitud: -89.99,
    },
    {
      latitud: 14.645,
      longitud: -89.985,
    },
  ],
};

const POSICION: Posicion = {
  latitud: 14.63,
  longitud: -89.975,
  velocidadKmh: 20,
  timestamp: '2026-09-11T19:00:00Z',
  vehiculo: 'BUS-PRUEBA',
};

afterEach(() => {
  cleanup();
});

describe('HU-74 - pantalla de ETA', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    /**
     * Por defecto consideramos
     * que el dato del bus es reciente.
     */
    vi.mocked(
      useFrescuraPosicion,
    ).mockReturnValue({
      datoReciente: true,
      segundosSinDato: 10,
    });

    vi.mocked(
      usePrefiereOscuro,
    ).mockReturnValue(false);

    vi.mocked(
      useRutas,
    ).mockReturnValue({
      rutas: [RUTA],
      rutaActiva: RUTA,
      cargando: false,
      error: null,
      reintentar: vi.fn(),
    });

    vi.mocked(
      usePosicionBus,
    ).mockReturnValue({
      posicion: POSICION,
      estadoConexion: 'en-vivo',
      recibidoEn: new Date(
        '2026-09-11T19:00:00Z',
      ),
      error: null,
      cargaInicialLista: true,
    });

    vi.mocked(
      useEta,
    ).mockReturnValue({
      estadoEta: {
        tipo: 'llegada',
        minutos: 5,
        confiable: true,
      },
      cargando: false,
    });
  });

  it('muestra el ETA de la parada seleccionada', () => {
    render(<Mapa />);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Seleccionar Parada B',
      }),
    );

    expect(
      screen.getByText('Parada B'),
    ).toBeTruthy();

    expect(
      screen.getByText('Llega en'),
    ).toBeTruthy();

    expect(
      screen.getByText('5 min'),
    ).toBeTruthy();
  });

  it('muestra aprox cuando el ETA no es confiable', () => {
    vi.mocked(
      useEta,
    ).mockReturnValue({
      estadoEta: {
        tipo: 'llegada',
        minutos: 8,
        confiable: false,
      },
      cargando: false,
    });

    render(<Mapa />);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Seleccionar Parada B',
      }),
    );

    expect(
      screen.getByText(
        'Llegada aproximada',
      ),
    ).toBeTruthy();

    expect(
      screen.getByText(
        'aprox. 8 min',
      ),
    ).toBeTruthy();
  });

  it('muestra la proxima salida cuando el recorrido no ha iniciado', () => {
    vi.mocked(
      usePosicionBus,
    ).mockReturnValue({
      posicion: null,
      estadoConexion: 'en-vivo',
      recibidoEn: null,
      error: null,
      cargaInicialLista: true,
    });

    vi.mocked(
      useFrescuraPosicion,
    ).mockReturnValue({
      datoReciente: false,
      segundosSinDato: null,
    });

    vi.mocked(
      useEta,
    ).mockReturnValue({
      estadoEta: {
        tipo: 'proxima-salida',
        hora: '07:30 p. m.',
      },
      cargando: false,
    });

    render(<Mapa />);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Seleccionar Parada B',
      }),
    );

    expect(
      screen.getByText(
        'El recorrido todavía no inicia',
      ),
    ).toBeTruthy();

    expect(
      screen.getByText(
        /Próxima salida:/,
      ),
    ).toBeTruthy();

    expect(
      screen.getByText(
        /07:30 p\. m\./,
      ),
    ).toBeTruthy();
  });

  it('informa cuando no se conoce el tiempo de llegada', () => {
    vi.mocked(
      useEta,
    ).mockReturnValue({
      estadoEta: {
        tipo: 'sin-datos',
      },
      cargando: false,
    });

    render(<Mapa />);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Seleccionar Parada B',
      }),
    );

    expect(
      screen.getByText(
        'No se conoce el tiempo de llegada.',
      ),
    ).toBeTruthy();
  });

  it('usa la ruta de la parada seleccionada y la posicion actual del bus', async () => {
    render(<Mapa />);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Seleccionar Parada B',
      }),
    );

    await waitFor(() => {
      expect(
        useEta,
      ).toHaveBeenCalledWith(
        RUTA,
        205,
        POSICION,
      );
    });
  });

  it('deja de mostrar el ETA cuando la posicion esta desactualizada', async () => {
    vi.mocked(
      useFrescuraPosicion,
    ).mockReturnValue({
      datoReciente: false,
      segundosSinDato: 125,
    });

    render(<Mapa />);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Seleccionar Parada B',
      }),
    );

    expect(
      screen.getByText(
        'No se conoce el tiempo de llegada.',
      ),
    ).toBeTruthy();

    expect(
      screen.getByText(
        'Último dato recibido hace 2 min.',
      ),
    ).toBeTruthy();

    /**
     * La posicion existe en memoria,
     * pero como esta vieja no puede
     * utilizarse para calcular el ETA.
     */
    await waitFor(() => {
      expect(
        useEta,
      ).toHaveBeenCalledWith(
        RUTA,
        205,
        null,
      );
    });
  });

  it('funciona con una segunda ruta sin usar identificadores fijos', async () => {
    /**
     * Simulamos que ahora la pantalla
     * fue abierta con otra ruta del catalogo.
     */
    vi.mocked(
      useRutas,
    ).mockReturnValue({
      rutas: [
        RUTA,
        RUTA_DOS,
      ],
      rutaActiva: RUTA_DOS,
      cargando: false,
      error: null,
      reintentar: vi.fn(),
    });

    render(<Mapa />);

    /**
     * El mapa de la segunda ruta debe
     * mostrar sus propias paradas.
     */
    fireEvent.click(
      screen.getByRole('button', {
        name:
          'Seleccionar Parada Ruta 2 B',
      }),
    );

    expect(
      screen.getByText(
        'Parada Ruta 2 B',
      ),
    ).toBeTruthy();

    /**
     * Mapa.tsx debe descubrir que la
     * parada 450 pertenece a la ruta 88.
     *
     * No existe ningun rutaId fijo.
     */
    await waitFor(() => {
      expect(
        useEta,
      ).toHaveBeenCalledWith(
        RUTA_DOS,
        450,
        POSICION,
      );
    });
  });
});