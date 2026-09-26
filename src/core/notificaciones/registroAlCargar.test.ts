// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

describe('registrarAlCargar', () => {
  it('registra el worker al cargar la pagina, para poder instalar la app', async () => {
    const register = vi.fn().mockResolvedValue({});
    Object.defineProperty(navigator, 'serviceWorker', { value: { register }, configurable: true });
    const { registrarAlCargar } = await import('./mensajeria');

    registrarAlCargar(window);

    expect(register).toHaveBeenCalledTimes(1);
    expect(String(register.mock.calls[0][0])).toMatch(/^\/firebase-messaging-sw\.js/);
  });

  it('sin workers en el navegador no intenta nada', async () => {
    const sinWorkers = { navigator: {}, document: { readyState: 'complete' } } as unknown as Window;
    const { registrarAlCargar } = await import('./mensajeria');
    expect(() => registrarAlCargar(sinWorkers)).not.toThrow();
  });
});
