// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  estadoDelPermiso,
  marcarRechazado,
  olvidarRechazo,
  sePuedeOfrecerAvisos,
  solicitarPermiso,
  yaFueRechazado,
} from './permisoNotificaciones';

/**
 * jsdom no trae la API de Notification: se monta a mano para cada caso.
 * `permission` es de solo lectura en el navegador, de ahi el defineProperty.
 */
function montarNotification(permiso: NotificationPermission, respuesta = permiso) {
  const requestPermission = vi.fn().mockResolvedValue(respuesta);

  Object.defineProperty(window, 'Notification', {
    configurable: true,
    writable: true,
    value: { permission: permiso, requestPermission },
  });

  return requestPermission;
}

function desmontarNotification() {
  Reflect.deleteProperty(window, 'Notification');
}

/** Mismo patron que `identidadDispositivo.test.ts`: localStorage respaldado por un Map. */
const almacenamiento = new Map<string, string>();

beforeEach(() => {
  almacenamiento.clear();

  vi.stubGlobal('localStorage', {
    getItem: (clave: string) => almacenamiento.get(clave) ?? null,
    setItem: (clave: string, valor: string) => almacenamiento.set(clave, valor),
    removeItem: (clave: string) => almacenamiento.delete(clave),
  });

  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { register: vi.fn() },
  });
});

afterEach(() => {
  desmontarNotification();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('estadoDelPermiso', () => {
  it('informa no-soportado cuando el navegador no expone Notification', () => {
    desmontarNotification();

    expect(estadoDelPermiso()).toBe('no-soportado');
  });

  it('traduce los tres valores del navegador', () => {
    montarNotification('granted');
    expect(estadoDelPermiso()).toBe('concedido');

    montarNotification('denied');
    expect(estadoDelPermiso()).toBe('denegado');

    montarNotification('default');
    expect(estadoDelPermiso()).toBe('sin-responder');
  });
});

describe('memoria del rechazo', () => {
  it('recuerda la negativa entre visitas', () => {
    expect(yaFueRechazado()).toBe(false);

    marcarRechazado();

    expect(yaFueRechazado()).toBe(true);
  });

  it('olvida la negativa cuando el permiso termina concedido', () => {
    marcarRechazado();
    olvidarRechazo();

    expect(yaFueRechazado()).toBe(false);
  });
});

describe('solicitarPermiso', () => {
  it('guarda el rechazo para no volver a insistir en cada visita', async () => {
    montarNotification('default', 'denied');

    await expect(solicitarPermiso()).resolves.toBe('denegado');
    expect(yaFueRechazado()).toBe(true);
  });

  it('trata como rechazo que el pasajero cierre el dialogo sin elegir', async () => {
    montarNotification('default', 'default');

    await expect(solicitarPermiso()).resolves.toBe('sin-responder');
    expect(yaFueRechazado()).toBe(true);
  });

  it('limpia el rechazo previo cuando finalmente lo concede', async () => {
    marcarRechazado();
    montarNotification('default', 'granted');

    await expect(solicitarPermiso()).resolves.toBe('concedido');
    expect(yaFueRechazado()).toBe(false);
  });
});

describe('sePuedeOfrecerAvisos', () => {
  it('no ofrece nada si el pasajero ya dijo que no', () => {
    montarNotification('default');
    marcarRechazado();

    expect(sePuedeOfrecerAvisos()).toBe(false);
  });

  it('no vuelve a ofrecer cuando el permiso ya esta resuelto', () => {
    montarNotification('granted');
    expect(sePuedeOfrecerAvisos()).toBe(false);

    montarNotification('denied');
    expect(sePuedeOfrecerAvisos()).toBe(false);
  });

  it('ofrece los avisos en un navegador que los soporta y todavia no decide', () => {
    montarNotification('default');

    expect(sePuedeOfrecerAvisos()).toBe(true);
  });
});
