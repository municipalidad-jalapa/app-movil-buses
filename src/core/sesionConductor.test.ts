// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import {
  CLAVE_JWT_CONDUCTOR,
  configurarProveedorDeToken,
  proveedorDeTokenLocalStorage,
} from './apiClient';
import { haySesionConductor } from './sesionConductor';

afterEach(() => {
  localStorage.removeItem(CLAVE_JWT_CONDUCTOR);
  configurarProveedorDeToken(proveedorDeTokenLocalStorage);
});

describe('haySesionConductor', () => {
  it('es falso sin token guardado', () => {
    expect(haySesionConductor()).toBe(false);
  });

  it('es verdadero cuando hay un JWT de conductor en localStorage', () => {
    localStorage.setItem(CLAVE_JWT_CONDUCTOR, 'un-jwt-cualquiera');

    expect(haySesionConductor()).toBe(true);
  });

  it('respeta el proveedor de token activo, no solo localStorage', () => {
    configurarProveedorDeToken({ obtenerToken: () => 'token-de-prueba' });

    expect(haySesionConductor()).toBe(true);
  });
});
