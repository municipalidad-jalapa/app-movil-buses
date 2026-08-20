import { describe, expect, it, vi } from 'vitest';
import {
  EVENTO_POSICION,
  esMasReciente,
  suscribirseAPosiciones,
  type FuenteDeEventos,
} from './flujoDePosiciones';
import type { Posicion } from './tipos';

/** Doble de EventSource: en Node no existe, y asi las pruebas son deterministas. */
class FuenteFalsa implements FuenteDeEventos {
  onopen: ((este: unknown) => void) | null = null;
  onerror: ((este: unknown) => void) | null = null;
  cerrada = false;
  private escuchas = new Map<string, (evento: MessageEvent) => void>();

  constructor(readonly url: string) {}

  addEventListener(tipo: string, escucha: (evento: MessageEvent) => void) {
    this.escuchas.set(tipo, escucha);
  }

  close() {
    this.cerrada = true;
  }

  /** Simula un evento del servidor con el cuerpo tal cual llega. */
  emitir(datos: string, tipo = EVENTO_POSICION) {
    this.escuchas.get(tipo)?.({ data: datos } as MessageEvent);
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

describe('suscribirseAPosiciones', () => {
  it('se conecta a la ruta del stream del backend', () => {
    let creada: FuenteFalsa | null = null;

    suscribirseAPosiciones(
      { onPosicion: vi.fn(), onEstado: vi.fn() },
      (url) => (creada = new FuenteFalsa(url)),
    );

    expect(creada!.url).toContain('/api/v1/telemetria/stream');
  });

  it('entrega la posicion que llega en el evento', () => {
    const onPosicion = vi.fn();
    let fuente!: FuenteFalsa;
    suscribirseAPosiciones({ onPosicion, onEstado: vi.fn() }, (url) => (fuente = new FuenteFalsa(url)));

    fuente.emitir(JSON.stringify(unaPosicion()));

    expect(onPosicion).toHaveBeenCalledWith(expect.objectContaining({ latitud: 14.6335 }));
  });

  it('pasa de conectando a en-vivo cuando abre la conexion', () => {
    const onEstado = vi.fn();
    let fuente!: FuenteFalsa;
    suscribirseAPosiciones({ onPosicion: vi.fn(), onEstado }, (url) => (fuente = new FuenteFalsa(url)));

    expect(onEstado).toHaveBeenCalledWith('conectando');
    fuente.onopen?.(null);
    expect(onEstado).toHaveBeenCalledWith('en-vivo');
  });

  it('un corte del flujo se reporta como reconectando, no como error', () => {
    // EventSource reintenta solo (ADR-008): no es un fallo terminal.
    const onEstado = vi.fn();
    let fuente!: FuenteFalsa;
    suscribirseAPosiciones({ onPosicion: vi.fn(), onEstado }, (url) => (fuente = new FuenteFalsa(url)));

    fuente.onerror?.(null);

    expect(onEstado).toHaveBeenLastCalledWith('reconectando');
  });

  it('un evento con JSON roto se descarta sin tumbar la pantalla', () => {
    const onPosicion = vi.fn();
    let fuente!: FuenteFalsa;
    suscribirseAPosiciones({ onPosicion, onEstado: vi.fn() }, (url) => (fuente = new FuenteFalsa(url)));

    fuente.emitir('{ esto no es json');
    fuente.emitir(JSON.stringify({ vehiculo: 'BUS-01' })); // sin coordenadas

    expect(onPosicion).not.toHaveBeenCalled();
  });

  it('el latido del servidor no llega como posicion', () => {
    // El backend manda ":latido" como comentario SSE cada 25 s; EventSource ni
    // siquiera lo entrega como evento, pero conviene fijar la expectativa.
    const onPosicion = vi.fn();
    let fuente!: FuenteFalsa;
    suscribirseAPosiciones({ onPosicion, onEstado: vi.fn() }, (url) => (fuente = new FuenteFalsa(url)));

    fuente.emitir('cualquier cosa', 'message');

    expect(onPosicion).not.toHaveBeenCalled();
  });

  it('cerrar la suscripcion cierra la fuente', () => {
    let fuente!: FuenteFalsa;
    const cerrar = suscribirseAPosiciones(
      { onPosicion: vi.fn(), onEstado: vi.fn() },
      (url) => (fuente = new FuenteFalsa(url)),
    );

    cerrar();

    expect(fuente.cerrada).toBe(true);
  });
});

describe('esMasReciente', () => {
  it('cualquier posicion gana cuando no hay ninguna', () => {
    expect(esMasReciente(unaPosicion(), null)).toBe(true);
  });

  it('una posicion mas nueva reemplaza a la actual', () => {
    const actual = unaPosicion({ timestamp: '2026-08-19T10:00:00Z' });
    const nueva = unaPosicion({ timestamp: '2026-08-19T10:05:00Z' });

    expect(esMasReciente(nueva, actual)).toBe(true);
  });

  it('una posicion vieja NO reemplaza a la actual', () => {
    // Pasa de verdad: la carga inicial puede llegar despues del primer evento.
    const actual = unaPosicion({ timestamp: '2026-08-19T10:05:00Z' });
    const vieja = unaPosicion({ timestamp: '2026-08-19T10:00:00Z' });

    expect(esMasReciente(vieja, actual)).toBe(false);
  });
});
