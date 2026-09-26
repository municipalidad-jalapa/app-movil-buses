import { afterEach, describe, expect, it } from 'vitest';
import { DESCANSO_MS, descartadaHaceUnRato, descartar, plataformaDe } from './instalacion';

describe('instalar la app', () => {
  afterEach(() => localStorage.clear());

  it('reconoce el telefono por su navegador', () => {
    expect(plataformaDe('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/128 Mobile')).toBe('android');
    expect(plataformaDe('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Safari/604.1')).toBe('ios');
    // iPadOS se presenta como Mac, pero es tactil.
    expect(plataformaDe('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1', 5)).toBe('ios');
    expect(plataformaDe('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128')).toBe('otra');
  });

  it('"Ahora no" la oculta una semana', () => {
    const ahora = Date.parse('2026-09-25T12:00:00Z');
    expect(descartadaHaceUnRato(ahora)).toBe(false);
    descartar(ahora);
    expect(descartadaHaceUnRato(ahora + 60_000)).toBe(true);
    expect(descartadaHaceUnRato(ahora + DESCANSO_MS + 1)).toBe(false);
  });
});
