import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorApi } from '../errores';
import { diasDelRango, exportarDatosDelServicio } from './panelAdminApi';

function responder(respuesta: Response) {
  const fetchFalso = vi.fn(async () => respuesta);
  vi.stubGlobal('fetch', fetchFalso);
  return fetchFalso;
}

afterEach(() => vi.unstubAllGlobals());

describe('diasDelRango', () => {
  it('cuenta ambos extremos', () => {
    expect(diasDelRango('2026-09-01', '2026-09-01')).toBe(1);
    expect(diasDelRango('2026-09-01', '2026-09-15')).toBe(15);
    expect(diasDelRango('2025-01-01', '2025-12-31')).toBe(365);
  });
});

describe('exportarDatosDelServicio', () => {
  it('pide el rango con Bearer y toma el nombre de Content-Disposition', async () => {
    const fetchFalso = responder(
      new Response('xlsx', { status: 200, headers: { 'Content-Disposition': 'attachment; filename="servicio.xlsx"' } }),
    );
    const archivo = await exportarDatosDelServicio('jwt', '2026-09-01', '2026-09-15');
    const [url, init] = fetchFalso.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/api/v1/admin/exportaciones/servicio?desde=2026-09-01&hasta=2026-09-15');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt');
    expect(archivo.nombre).toBe('servicio.xlsx');
    expect(await archivo.blob.text()).toBe('xlsx');
  });

  it('usa un nombre por defecto sin Content-Disposition', async () => {
    responder(new Response('x', { status: 200 }));
    expect((await exportarDatosDelServicio('jwt', '2026-09-01', '2026-09-15')).nombre).toBe(
      'exportacion-servicio_2026-09-01_2026-09-15.xlsx',
    );
  });

  it.each([400, 401, 403, 422])('lanza ErrorApi con el estado %i', async (status) => {
    responder(new Response(JSON.stringify({ status, message: 'motivo' }), { status }));
    await expect(exportarDatosDelServicio('jwt', 'a', 'b')).rejects.toMatchObject({ status, message: 'motivo' });
  });

  it('una falla de red es ErrorApi con estado 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const error = await exportarDatosDelServicio('jwt', 'a', 'b').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorApi);
    expect((error as ErrorApi).esFallaDeRed).toBe(true);
  });
});
