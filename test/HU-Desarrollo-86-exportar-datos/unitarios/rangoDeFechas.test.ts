// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { diasDelRango, exportarDatosDelServicio, MAXIMO_DIAS_EXPORTACION } from '../../../src/core/panelAdmin/panelAdminApi';
import { hoyEnGuatemala, validarRango } from '../../../src/paginas/admin/ExportarDatos';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('diasDelRango (ambos extremos inclusivos)', () => {
  it.each([
    ['2026-09-01', '2026-09-01', 1],
    ['2026-09-01', '2026-09-02', 2],
    ['2026-02-27', '2026-03-02', 4],
    ['2024-02-28', '2024-03-01', 3], // 2024 es bisiesto
    ['2025-01-01', '2025-12-31', 365],
    ['2024-01-01', '2024-12-31', 366],
    ['2025-01-01', '2026-01-01', 366],
    ['2025-01-01', '2026-01-02', 367],
  ])('%s → %s = %i dias', (desde, hasta, esperado) => {
    expect(diasDelRango(desde, hasta)).toBe(esperado);
  });
});

describe('validarRango (mismas reglas que el backend)', () => {
  it('el maximo es 366', () => expect(MAXIMO_DIAS_EXPORTACION).toBe(366));

  it.each([
    ['2026-09-01', '2026-09-01'],
    ['2026-09-01', '2026-09-15'],
    ['2025-01-01', '2026-01-01'], // exactamente 366 dias
    ['2024-01-01', '2024-12-31'], // anio bisiesto completo
  ])('acepta %s → %s', (desde, hasta) => {
    expect(validarRango(desde, hasta)).toBeNull();
  });

  it.each([
    ['', '2026-09-15'],
    ['2026-09-01', ''],
    ['', ''],
    ['01/09/2026', '2026-09-15'],
    ['2026-9-1', '2026-09-15'],
  ])('pide elegir ambas fechas: "%s" → "%s"', (desde, hasta) => {
    expect(validarRango(desde, hasta)).toBe('Elige la fecha de inicio y la fecha final.');
  });

  it('rechaza un rango invertido', () => {
    expect(validarRango('2026-09-15', '2026-09-01')).toBe('La fecha final no puede ser anterior a la fecha de inicio.');
  });

  it('rechaza 367 dias', () => {
    expect(validarRango('2025-01-01', '2026-01-02')).toBe('El rango puede abarcar como máximo 366 días.');
  });
});

describe('hoyEnGuatemala (UTC-6, no UTC)', () => {
  it('a las 03:00 UTC todavia es el dia anterior en Guatemala', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-21T03:00:00Z'));
    expect(hoyEnGuatemala()).toBe('2026-09-20');
  });

  it('a las 06:00 UTC ya es el dia nuevo en Guatemala', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-21T06:00:00Z'));
    expect(hoyEnGuatemala()).toBe('2026-09-21');
  });

  it('a las 05:59 UTC sigue siendo el dia anterior', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-21T05:59:59Z'));
    expect(hoyEnGuatemala()).toBe('2026-09-20');
  });

  it('cambio de anio', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2027-01-01T04:00:00Z'));
    expect(hoyEnGuatemala()).toBe('2026-12-31');
  });
});

describe('nombre del archivo (Content-Disposition)', () => {
  async function nombreCon(cabecera: string | null) {
    const headers: Record<string, string> = cabecera ? { 'Content-Disposition': cabecera } : {};
    vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 200, headers })));
    return (await exportarDatosDelServicio('t', '2026-09-01', '2026-09-02')).nombre;
  }

  it('con comillas', async () => {
    expect(await nombreCon('attachment; filename="a.xlsx"')).toBe('a.xlsx');
  });
  it('sin comillas', async () => {
    expect(await nombreCon('attachment; filename=b.xlsx')).toBe('b.xlsx');
  });
  it('con filename* en UTF-8', async () => {
    expect(await nombreCon("attachment; filename*=UTF-8''informe%20d%C3%ADas.xlsx")).toBe('informe días.xlsx');
  });
  it('sin cabecera usa el nombre de respaldo con el rango', async () => {
    expect(await nombreCon(null)).toBe('exportacion-servicio_2026-09-01_2026-09-02.xlsx');
  });
  it('cabecera sin filename usa el respaldo', async () => {
    expect(await nombreCon('attachment')).toBe('exportacion-servicio_2026-09-01_2026-09-02.xlsx');
  });
});
