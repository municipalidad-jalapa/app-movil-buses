// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { ErrorApi } from '../core/errores';
import { consultarReserva } from '../core/registroDemanda';
import { useReserva } from '../hooks/useReserva';
import { ReservaProvider } from './ReservaProvider';

vi.mock('../core/registroDemanda', async (original) => ({
  ...(await original<typeof import('../core/registroDemanda')>()),
  consultarReserva: vi.fn(),
}));

const EXPIRA = new Date(Date.now() + 5 * 60_000).toISOString();

function conReservaGuardada() {
  localStorage.setItem('ecoruta_reserva', JSON.stringify({ id: 9, paradaId: 2, estado: 'ACTIVA', expiraEn: EXPIRA }));
}

const envoltorio = ({ children }: { children: ReactNode }) => <ReservaProvider>{children}</ReservaProvider>;

beforeEach(() => {
  localStorage.clear();
  vi.mocked(consultarReserva).mockReset();
});
afterEach(cleanup);

describe('ReservaProvider: sincronizacion con el servidor (QA, ronda 2)', () => {
  it('si el conductor marco la parada atendida, la reserva pasa a ABORDO', async () => {
    conReservaGuardada();
    vi.mocked(consultarReserva).mockResolvedValue({ id: 9, paradaId: 2, estado: 'ABORDO', expiraEn: EXPIRA });

    const { result } = renderHook(() => useReserva(), { wrapper: envoltorio });

    await waitFor(() => expect(result.current.reserva?.estado).toBe('ABORDO'));
    expect(consultarReserva).toHaveBeenCalledWith(9, expect.any(String));
    expect(JSON.parse(localStorage.getItem('ecoruta_reserva') ?? '{}').estado).toBe('ABORDO');
  });

  it('toma el vencimiento del servidor si cambio (renovada en otra pestana o acortada)', async () => {
    conReservaGuardada();
    const nuevo = new Date(Date.now() + 90_000).toISOString();
    vi.mocked(consultarReserva).mockResolvedValue({ id: 9, paradaId: 2, estado: 'RENOVADA', expiraEn: nuevo });

    const { result } = renderHook(() => useReserva(), { wrapper: envoltorio });

    await waitFor(() => expect(result.current.reserva).toMatchObject({ estado: 'RENOVADA', expiraEn: nuevo }));
  });

  it('si el servidor ya no la tiene (404) la da por vencida', async () => {
    conReservaGuardada();
    vi.mocked(consultarReserva).mockRejectedValue(new ErrorApi(404, 'No existe'));

    const { result } = renderHook(() => useReserva(), { wrapper: envoltorio });

    await waitFor(() => expect(result.current.reserva?.estado).toBe('EXPIRADA'));
  });

  it('sin red conserva lo guardado', async () => {
    conReservaGuardada();
    vi.mocked(consultarReserva).mockRejectedValue(new ErrorApi(0, 'sin red'));

    const { result } = renderHook(() => useReserva(), { wrapper: envoltorio });

    await waitFor(() => expect(consultarReserva).toHaveBeenCalled());
    expect(result.current.reserva?.estado).toBe('ACTIVA');
  });

  it('sin reserva vigente no consulta nada', () => {
    renderHook(() => useReserva(), { wrapper: envoltorio });
    expect(consultarReserva).not.toHaveBeenCalled();
  });
});
