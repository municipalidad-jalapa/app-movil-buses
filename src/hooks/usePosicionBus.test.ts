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


  it('actualiza con cada posicion que llega por el flujo', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respuestaFalsa(204)));
    const fuente = new FuenteFalsa();

    const { result } = renderHook(() => usePosicionBus(() => fuente));

    act(() => fuente.emitir(unaPosicion({ latitud: 14.64, timestamp: '2026-08-19T10:05:00Z' })));

    await waitFor(() => expect(result.current.posicion?.latitud).toBe(14.64));
    expect(result.current.estadoConexion).toBe('en-vivo');
  });


  it('registra cuando llego el dato al cliente', async () => {
    // La marca de tiempo del ultimo dato es obligatoria en pantalla (DESIGN.md
    // seccion 7). El hook la entrega; presentarla es SCRUM-247.
    const fuente = new FuenteFalsa();
    const { result } = renderHook(() => usePosicionBus(() => fuente));

    act(() => fuente.emitir(unaPosicion()));

    await waitFor(() => expect(result.current.recibidoEn).toBeInstanceOf(Date));
  });


  it('cierra el flujo al desmontar el componente', async () => {
    // SCRUM-243 lo pide explicitamente: sin esto queda una conexion colgada por
    // cada visita a la pantalla.
    vi.stubGlobal('fetch', vi.fn(async () => respuestaFalsa(204)));
    const fuente = new FuenteFalsa();

    const { unmount, result } = renderHook(() => usePosicionBus(() => fuente));
    act(() => fuente.emitir(unaPosicion()));
    await waitFor(() => expect(result.current.posicion).not.toBeNull());

    unmount();

    expect(fuente.cerrada).toBe(true);
  });
});
