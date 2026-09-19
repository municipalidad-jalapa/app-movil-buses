// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { usePosicionBus } from './usePosicionBus';
import { EVENTO_POSICION, type FuenteDeEventos } from '../core/flujoDePosiciones';
import type { Posicion } from '../core/tipos';

class FuenteFalsa implements FuenteDeEventos {
  onopen: ((este: unknown) => void) | null = null;
  onerror: ((este: unknown) => void) | null = null;
  cerrada = false;
  private escuchas = new Map<string, (evento: MessageEvent) => void>();

  addEventListener(tipo: string, escucha: (evento: MessageEvent) => void) {
    this.escuchas.set(tipo, escucha);
  }
  close() {
    this.cerrada = true;
  }
  emitir(posicion: Posicion) {
    this.escuchas.get(EVENTO_POSICION)?.({ data: JSON.stringify(posicion) } as MessageEvent);
  }
}

function unaPosicion(sobrescribir: Partial<Posicion> = {}): Posicion {
  return {
    latitud: 14.6335,
    longitud: -89.9885,
    velocidadKmh: 18,
    timestamp: '2026-08-19T10:00:00Z',
    vehiculo: 'BUS-01',
    ...sobrescribir,
  };
}

/** Imita lo que devuelve fetch, igual que en apiClient.test.ts. */
function respuestaFalsa(status: number, cuerpo?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: async () => {
      if (cuerpo === undefined) throw new Error('sin cuerpo');
      return cuerpo;
    },
  } as Response;
}

afterEach(() => vi.unstubAllGlobals());

describe('usePosicionBus', () => {
  it('pinta la ultima posicion conocida sin esperar al primer evento', async () => {
    // SCRUM-244: al abrir la pantalla el bus ya aparece.
    vi.stubGlobal('fetch', vi.fn(async () => respuestaFalsa(200, unaPosicion())));

    const { result } = renderHook(() => usePosicionBus(() => new FuenteFalsa()));

    await waitFor(() => expect(result.current.posicion?.latitud).toBe(14.6335));
    expect(result.current.posicion?.vehiculo).toBe('BUS-01');
  });

  it('un 204 significa que aun no hay posicion, no un error', async () => {
    // Criterio explicito de SCRUM-244.
    vi.stubGlobal('fetch', vi.fn(async () => respuestaFalsa(204)));

    const { result } = renderHook(() => usePosicionBus(() => new FuenteFalsa()));

    await waitFor(() => expect(result.current.cargaInicialLista).toBe(true));
    expect(result.current.posicion).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('actualiza con cada posicion que llega por el flujo', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respuestaFalsa(204)));
    const fuente = new FuenteFalsa();

    const { result } = renderHook(() => usePosicionBus(() => fuente));
    await waitFor(() => expect(result.current.cargaInicialLista).toBe(true));

    act(() => fuente.emitir(unaPosicion({ latitud: 14.64, timestamp: '2026-08-19T10:05:00Z' })));

    await waitFor(() => expect(result.current.posicion?.latitud).toBe(14.64));
    expect(result.current.estadoConexion).toBe('en-vivo');
  });

  it('la carga inicial no pisa una posicion mas nueva del flujo', async () => {
    // Carrera real: el evento llega antes de que responda la consulta inicial.
    let resolver!: (r: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((r) => (resolver = r))));
    const fuente = new FuenteFalsa();

    const { result } = renderHook(() => usePosicionBus(() => fuente));

    act(() => fuente.emitir(unaPosicion({ latitud: 14.99, timestamp: '2026-08-19T11:00:00Z' })));
    await waitFor(() => expect(result.current.posicion?.latitud).toBe(14.99));

    // Ahora responde la consulta inicial, con un dato mas viejo.
    await act(async () => {
      resolver(respuestaFalsa(200, unaPosicion({ latitud: 14.11, timestamp: '2026-08-19T09:00:00Z' })));
    });

    expect(result.current.posicion?.latitud).toBe(14.99);
  });

  it('registra cuando llego el dato al cliente', async () => {
    // La marca de tiempo del ultimo dato es obligatoria en pantalla (DESIGN.md
    // seccion 7). El hook la entrega; presentarla es SCRUM-247.
    vi.stubGlobal('fetch', vi.fn(async () => respuestaFalsa(200, unaPosicion())));

    const { result } = renderHook(() => usePosicionBus(() => new FuenteFalsa()));

    await waitFor(() => expect(result.current.recibidoEn).toBeInstanceOf(Date));
  });

  it('si falla la carga inicial, el flujo en vivo sigue funcionando', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respuestaFalsa(500, { message: 'caido' })));
    const fuente = new FuenteFalsa();

    const { result } = renderHook(() => usePosicionBus(() => fuente));
    await waitFor(() => expect(result.current.error).not.toBeNull());

    act(() => fuente.emitir(unaPosicion()));

    await waitFor(() => expect(result.current.posicion?.latitud).toBe(14.6335));
  });

  it('cierra el flujo al desmontar el componente', async () => {
    // SCRUM-243 lo pide explicitamente: sin esto queda una conexion colgada por
    // cada visita a la pantalla.
    vi.stubGlobal('fetch', vi.fn(async () => respuestaFalsa(204)));
    const fuente = new FuenteFalsa();

    const { unmount, result } = renderHook(() => usePosicionBus(() => fuente));
    await waitFor(() => expect(result.current.cargaInicialLista).toBe(true));

    unmount();

    expect(fuente.cerrada).toBe(true);
  });

  it('mientras el flujo reconecta, sigue pidiendo la posicion por la ruta de respaldo (HU-61)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      let llamadas = 0;
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          llamadas += 1;
          return respuestaFalsa(200, unaPosicion({ timestamp: `2026-08-19T10:00:0${llamadas}Z`, latitud: 14.6 + llamadas / 1000 }));
        }),
      );
      const fuente = new FuenteFalsa();
      const { result } = renderHook(() => usePosicionBus(() => fuente));
      await waitFor(() => expect(result.current.cargaInicialLista).toBe(true));
      expect(llamadas).toBe(1);

      // Sin corte, no se consulta de mas.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(25_000);
      });
      expect(llamadas).toBe(1);

      act(() => fuente.onerror?.(null));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });
      expect(llamadas).toBe(2);
      expect(result.current.posicion?.latitud).toBeCloseTo(14.602);

      // Vuelve el flujo: se deja de consultar.
      act(() => fuente.onopen?.(null));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });
      expect(llamadas).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
