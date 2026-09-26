import { afterEach, describe, expect, it, vi } from 'vitest';

const { initializeApp } = vi.hoisted(() => ({ initializeApp: vi.fn(() => ({ name: 'prueba' })) }));

vi.mock('firebase/app', () => ({ initializeApp, getApps: () => [] }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn() }));

const base = {
  firebaseApiKey: 'clave',
  firebaseAuthDomain: 'proyecto.firebaseapp.com',
  firebaseProjectId: 'proyecto',
  firebaseAppId: '1:848636628685:web:abc',
};

afterEach(() => {
  vi.resetModules();
  initializeApp.mockClear();
});

describe('app de Firebase', () => {
  it('con avisos configurados lleva el remitente: getMessaging lo exige', async () => {
    vi.doMock('./config', () => ({
      config: {
        ...base,
        mensajeria: { messagingSenderId: '848636628685', storageBucket: '', vapidKey: 'vapid' },
      },
    }));
    await import('./firebase');
    expect(initializeApp).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'proyecto', messagingSenderId: '848636628685' }),
    );
  });

  it('sin avisos arranca solo con lo que pide la sesion', async () => {
    vi.doMock('./config', () => ({ config: { ...base, mensajeria: null } }));
    await import('./firebase');
    const [opciones] = initializeApp.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(opciones).not.toHaveProperty('messagingSenderId');
  });
});
