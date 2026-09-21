import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Prueba SIMULADA de punta a punta de la capa de red: un servidor HTTP de verdad
 * (puerto local) imita el endpoint del backend de la HU-86 y la funcion real
 * `exportarDatosDelServicio` le habla con `fetch` de verdad (sin stubs de fetch).
 *
 * El servidor aplica las mismas reglas que documenta el backend:
 *   - solo administrador (Bearer valido), 401 sin sesion, 403 con rol distinto
 *   - `desde` y `hasta` obligatorios y `AAAA-MM-DD`  -> 400
 *   - rango invertido o de mas de 366 dias            -> 422
 *   - respuesta: .xlsx (ZIP) con Content-Disposition, sin cache
 */

const TOKEN_ADMIN = 'jwt-admin-simulado';
const TOKEN_CONDUCTOR = 'jwt-conductor-simulado';
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Cabecera minima de un .xlsx: es un ZIP ("PK\x03\x04"). */
const CABECERA_XLSX = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

interface PeticionVista {
  metodo: string;
  ruta: string;
  parametros: Record<string, string>;
  cabeceras: IncomingMessage['headers'];
}

let servidor: Server;
let vistas: PeticionVista[] = [];
let demoraMs = 0;
let cuerpoXlsx = Buffer.concat([CABECERA_XLSX, Buffer.from('contenido-simulado')]);
let fallar500 = false;

function json(res: import('node:http').ServerResponse, status: number, message: string) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ timestamp: '2026-09-20T10:00:00Z', status, error: 'x', message, path: '/api' }));
}

function diasInclusivos(desde: string, hasta: string) {
  return Math.round((Date.parse(hasta) - Date.parse(desde)) / 86_400_000) + 1;
}

beforeAll(async () => {
  servidor = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const parametros = Object.fromEntries(url.searchParams);
    vistas.push({ metodo: req.method ?? '', ruta: url.pathname, parametros, cabeceras: req.headers });

    const responder = () => {
      if (url.pathname !== '/api/v1/admin/exportaciones/servicio') return json(res, 404, 'No existe');
      if (fallar500) return json(res, 500, 'Internal Server Error');
      const auth = req.headers.authorization;
      if (auth !== `Bearer ${TOKEN_ADMIN}` && auth !== `Bearer ${TOKEN_CONDUCTOR}`) return json(res, 401, 'Sesion invalida');
      if (auth === `Bearer ${TOKEN_CONDUCTOR}`) return json(res, 403, 'Solo el administrador municipal');
      const { desde, hasta } = parametros;
      if (!desde || !hasta || !FECHA.test(desde) || !FECHA.test(hasta)) return json(res, 400, 'Fechas invalidas');
      if (hasta < desde) return json(res, 422, 'La fecha final no puede ser anterior a la inicial');
      if (diasInclusivos(desde, hasta) > 366) return json(res, 422, 'El rango no puede superar 366 dias');
      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="servicio_${desde}_${hasta}.xlsx"`,
        'Cache-Control': 'no-store',
      });
      res.end(cuerpoXlsx);
    };
    if (demoraMs > 0) setTimeout(responder, demoraMs);
    else responder();
  });
  await new Promise<void>((ok) => servidor.listen(0, '127.0.0.1', ok));
});

afterAll(async () => {
  await new Promise<void>((ok) => servidor.close(() => ok()));
});

beforeEach(() => {
  vistas = [];
  demoraMs = 0;
  fallar500 = false;
  cuerpoXlsx = Buffer.concat([CABECERA_XLSX, Buffer.from('contenido-simulado')]);
});

/** Carga el cliente apuntando al servidor simulado (config.ts lee el entorno al cargarse). */
async function cargarCliente(baseUrl?: string) {
  const { port } = servidor.address() as AddressInfo;
  vi.stubEnv('VITE_API_BASE_URL', baseUrl ?? `http://127.0.0.1:${port}`);
  vi.resetModules();
  const api = await import('../../../src/core/panelAdmin/panelAdminApi');
  const { ErrorApi } = await import('../../../src/core/errores');
  return { ...api, ErrorApi };
}

describe('HU-86 · servidor simulado · descarga correcta', () => {
  it('descarga un .xlsx real por HTTP: bytes intactos, nombre del servidor', async () => {
    const { exportarDatosDelServicio } = await cargarCliente();
    const archivo = await exportarDatosDelServicio(TOKEN_ADMIN, '2026-09-01', '2026-09-15');
    expect(archivo.nombre).toBe('servicio_2026-09-01_2026-09-15.xlsx');
    const bytes = Buffer.from(await archivo.blob.arrayBuffer());
    expect(bytes.subarray(0, 4).equals(CABECERA_XLSX)).toBe(true);
    expect(bytes.equals(cuerpoXlsx)).toBe(true);
  });

  it('un archivo grande (5 MB) llega completo', async () => {
    cuerpoXlsx = Buffer.concat([CABECERA_XLSX, Buffer.alloc(5 * 1024 * 1024, 7)]);
    const { exportarDatosDelServicio } = await cargarCliente();
    const archivo = await exportarDatosDelServicio(TOKEN_ADMIN, '2026-01-01', '2026-06-30');
    expect(archivo.blob.size).toBe(cuerpoXlsx.length);
  });

  it('acepta el rango maximo de 366 dias y un solo dia', async () => {
    const { exportarDatosDelServicio } = await cargarCliente();
    await expect(exportarDatosDelServicio(TOKEN_ADMIN, '2025-01-01', '2026-01-01')).resolves.toBeTruthy();
    await expect(exportarDatosDelServicio(TOKEN_ADMIN, '2026-09-01', '2026-09-01')).resolves.toBeTruthy();
  });
});

describe('HU-86 · servidor simulado · lo que sale del navegador (criterio 3, lado cliente)', () => {
  it('es un GET con Bearer y SOLO los parametros desde y hasta', async () => {
    const { exportarDatosDelServicio } = await cargarCliente();
    await exportarDatosDelServicio(TOKEN_ADMIN, '2026-09-01', '2026-09-15');
    expect(vistas).toHaveLength(1);
    const [vista] = vistas;
    expect(vista.metodo).toBe('GET');
    expect(vista.ruta).toBe('/api/v1/admin/exportaciones/servicio');
    expect(Object.keys(vista.parametros).sort()).toEqual(['desde', 'hasta']);
    expect(vista.cabeceras.authorization).toBe(`Bearer ${TOKEN_ADMIN}`);
  });

  it('no envia identificadores de dispositivo, cookies ni cuerpo', async () => {
    const { exportarDatosDelServicio } = await cargarCliente();
    await exportarDatosDelServicio(TOKEN_ADMIN, '2026-09-01', '2026-09-15');
    const cabeceras = vistas[0].cabeceras;
    expect(cabeceras['x-dispositivo-id']).toBeUndefined();
    expect(cabeceras.cookie).toBeUndefined();
    expect(cabeceras['content-length'] ?? '0').toBe('0');
  });

  it('el token no viaja en la URL (no es un enlace <a href>)', async () => {
    const { exportarDatosDelServicio } = await cargarCliente();
    await exportarDatosDelServicio(TOKEN_ADMIN, '2026-09-01', '2026-09-15');
    expect(JSON.stringify(vistas[0].parametros)).not.toContain(TOKEN_ADMIN);
  });
});

describe('HU-86 · servidor simulado · errores', () => {
  it.each([
    ['401 sin sesion valida', 'token-vencido', 401, '2026-09-01', '2026-09-15'],
    ['403 con cuenta de conductor', TOKEN_CONDUCTOR, 403, '2026-09-01', '2026-09-15'],
    ['400 fecha con formato invalido', TOKEN_ADMIN, 400, '01/09/2026', '2026-09-15'],
    ['400 falta una fecha', TOKEN_ADMIN, 400, '', '2026-09-15'],
    ['422 rango invertido', TOKEN_ADMIN, 422, '2026-09-15', '2026-09-01'],
    ['422 mas de 366 dias', TOKEN_ADMIN, 422, '2025-01-01', '2026-01-02'],
  ])('%s', async (_nombre, token, status, desde, hasta) => {
    const { exportarDatosDelServicio, ErrorApi } = await cargarCliente();
    const error = await exportarDatosDelServicio(token, desde, hasta).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorApi);
    expect((error as InstanceType<typeof ErrorApi>).status).toBe(status);
  });

  it('un 500 del servidor llega como ErrorApi 500', async () => {
    fallar500 = true;
    const { exportarDatosDelServicio, ErrorApi } = await cargarCliente();
    const error = await exportarDatosDelServicio(TOKEN_ADMIN, '2026-09-01', '2026-09-02').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorApi);
    expect((error as InstanceType<typeof ErrorApi>).status).toBe(500);
  });

  it('servidor caido: ErrorApi de red (estado 0), no una excepcion cruda', async () => {
    const { exportarDatosDelServicio, ErrorApi } = await cargarCliente('http://127.0.0.1:1');
    const error = await exportarDatosDelServicio(TOKEN_ADMIN, '2026-09-01', '2026-09-02').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorApi);
    expect((error as InstanceType<typeof ErrorApi>).esFallaDeRed).toBe(true);
  });

  it('cancelar con AbortSignal corta la descarga', async () => {
    demoraMs = 500;
    const { exportarDatosDelServicio, ErrorApi } = await cargarCliente();
    const control = new AbortController();
    const pendiente = exportarDatosDelServicio(TOKEN_ADMIN, '2026-09-01', '2026-09-02', control.signal);
    setTimeout(() => control.abort(), 50);
    const error = await pendiente.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorApi);
    expect((error as InstanceType<typeof ErrorApi>).message).toBe('Peticion cancelada');
  });

  it('ningun mensaje para el usuario expone codigos HTTP ni jerga tecnica', async () => {
    const { exportarDatosDelServicio, ErrorApi } = await cargarCliente();
    fallar500 = true;
    const casos: Array<[string, string, string]> = [
      ['token-vencido', '2026-09-01', '2026-09-02'],
      [TOKEN_ADMIN, '01/09/2026', '2026-09-02'],
      [TOKEN_ADMIN, '2026-09-01', '2026-09-02'],
    ];
    for (const [t, d, h] of casos) {
      const error = (await exportarDatosDelServicio(t, d, h).catch((e: unknown) => e)) as InstanceType<typeof ErrorApi>;
      const texto = error.mensajeParaUsuario();
      expect(texto).not.toMatch(/\b(40\d|50\d|HTTP|ApiError|TypeError|fetch|exception)\b/i);
      expect(texto.length).toBeGreaterThan(10);
    }
  });
});
