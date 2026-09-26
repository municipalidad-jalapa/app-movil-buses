// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/128 Mobile';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Safari/604.1';

function comoTelefono(agente: string) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(agente);
  window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as never;
}

async function montar() {
  vi.resetModules();
  const instalacion = await import('../core/instalacion');
  instalacion.escucharInstalacion(window);
  const { InstalarApp } = await import('./InstalarApp');
  render(<InstalarApp />);
  return instalacion;
}

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('InstalarApp', () => {
  it('en Android, cuando el navegador lo permite, ofrece instalar con un toque', async () => {
    comoTelefono(ANDROID);
    await montar();
    expect(screen.getByText(/no vas a tener todas las funciones/)).toBeTruthy();

    const prompt = vi.fn().mockResolvedValue(undefined);
    const evento = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    });
    act(() => {
      window.dispatchEvent(evento);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Instalar' }));
    expect(prompt).toHaveBeenCalled();
  });

  it('en iPhone explica como agregarla al inicio', async () => {
    comoTelefono(IPHONE);
    await montar();
    expect(screen.getByText(/Tocá Compartir/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Instalar' })).toBeNull();
  });

  it('en la computadora no aparece', async () => {
    comoTelefono('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128');
    await montar();
    expect(screen.queryByText(/Instalá EcoRuta/)).toBeNull();
  });

  it('"Ahora no" la cierra', async () => {
    comoTelefono(ANDROID);
    await montar();
    fireEvent.click(screen.getByRole('button', { name: 'Ahora no' }));
    expect(screen.queryByText(/Instalá EcoRuta/)).toBeNull();
  });
});
