// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ReservaProvider } from '../estado/ReservaProvider';
import { TarjetaAbordaje } from './TarjetaAbordaje';
import { confirmarAbordaje } from '../core/reservas';
import type { Reserva } from '../core/tipos';

vi.mock('../core/reservas', () => ({
  confirmarAbordaje: vi.fn(),
}));

const RESERVA_ACTIVA: Reserva = {
  id: 7,
  paradaId: 3,
  estado: 'ACTIVA',
  expiraEn: '2026-08-27T18:00:00Z',
};

/** Mismo patron que `identidadDispositivo.test.ts`: localStorage respaldado por un Map. */
const almacenamiento = new Map<string, string>();

function montar(reserva: Reserva | null, preguntando = true) {
  if (reserva) {
    almacenamiento.set('ecoruta_reserva', JSON.stringify(reserva));
  }

  return render(
    <ReservaProvider>
      <TarjetaAbordaje preguntando={preguntando} />
    </ReservaProvider>,
  );
}

beforeEach(() => {
  almacenamiento.clear();
  vi.clearAllMocks();

  vi.stubGlobal('localStorage', {
    getItem: (clave: string) => almacenamiento.get(clave) ?? null,
    setItem: (clave: string, valor: string) => almacenamiento.set(clave, valor),
    removeItem: (clave: string) => almacenamiento.delete(clave),
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('TarjetaAbordaje', () => {
  it('no muestra nada si el pasajero no tiene reserva', () => {
    montar(null);

    expect(screen.queryByText('¿Lograste subir?')).not.toBeTruthy();
  });

  it('no pregunta hasta que llega el aviso de que el bus llego', async () => {
    montar(RESERVA_ACTIVA, false);

    await waitFor(() => {
      expect(screen.queryByText('¿Lograste subir?')).not.toBeTruthy();
    });
  });

  it('pregunta con las dos respuestas cuando llego el aviso', async () => {
    montar(RESERVA_ACTIVA);

    expect(await screen.findByText('¿Lograste subir?')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Sí subí/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /No subí/ })).toBeTruthy();
  });

  it('responde subio true y refleja ABORDO sin recargar', async () => {
    vi.mocked(confirmarAbordaje).mockResolvedValue({ id: 7, estado: 'ABORDO' });

    montar(RESERVA_ACTIVA);

    fireEvent.click(await screen.findByRole('button', { name: /Sí subí/ }));

    await waitFor(() => {
      expect(confirmarAbordaje).toHaveBeenCalledWith(7, true);
    });
    expect(await screen.findByText(/Buen viaje/)).toBeTruthy();
  });

  it('responde subio false y refleja CANCELADA sin recargar', async () => {
    vi.mocked(confirmarAbordaje).mockResolvedValue({ id: 7, estado: 'CANCELADA' });

    montar(RESERVA_ACTIVA);

    fireEvent.click(await screen.findByRole('button', { name: /No subí/ }));

    await waitFor(() => {
      expect(confirmarAbordaje).toHaveBeenCalledWith(7, false);
    });
    expect(await screen.findByText(/no lograste subir/)).toBeTruthy();
  });

  it('deja reintentar y no pierde la reserva si falla el envio', async () => {
    vi.mocked(confirmarAbordaje).mockRejectedValue(new Error('sin red'));

    montar(RESERVA_ACTIVA);

    fireEvent.click(await screen.findByRole('button', { name: /Sí subí/ }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    // La pregunta sigue en pantalla: el pasajero puede volver a responder.
    expect(screen.getByRole('button', { name: /Sí subí/ })).toBeTruthy();
  });

  it('muestra el resultado aunque no haya llegado el aviso, si ya fue respondida', async () => {
    montar({ ...RESERVA_ACTIVA, estado: 'ABORDO' }, false);

    expect(await screen.findByText(/Buen viaje/)).toBeTruthy();
  });
});
