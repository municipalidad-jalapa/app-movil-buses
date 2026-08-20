import { afterEach, describe, expect, it } from 'vitest';
import { obtenerConfiguracion } from './config';

describe('obtenerConfiguracion', () => {
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  function simularConfigDeRuntime(apiUrl?: string) {
    (globalThis as { window?: unknown }).window = {
      __ECORUTA__: apiUrl === undefined ? undefined : { apiUrl },
    };
  }

  it('usa la configuracion de runtime cuando esta definida', () => {
    simularConfigDeRuntime('https://api.ecoruta.gob.gt');
    expect(obtenerConfiguracion().apiUrl).toBe('https://api.ecoruta.gob.gt');
  });

  it('quita la barra final para no duplicarla al concatenar rutas', () => {
    simularConfigDeRuntime('https://api.ecoruta.gob.gt/');
    expect(obtenerConfiguracion().apiUrl).toBe('https://api.ecoruta.gob.gt');
  });

  it('cae al valor por defecto si no hay configuracion de runtime', () => {
    simularConfigDeRuntime(undefined);
    expect(obtenerConfiguracion().apiUrl).toBe('http://localhost:8080');
  });

  it('respeta una cadena vacia en runtime para permitir rutas relativas', () => {
    simularConfigDeRuntime('');
    expect(obtenerConfiguracion().apiUrl).toBe('');
  });
});
