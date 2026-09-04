import { CLAVE_JWT_CONDUCTOR, configurarProveedorDeToken } from '../apiClient';

export interface SesionConductor {
  token: string;
  expiraEn: number;
  rol: string;
}

function almacenamientoDisponible(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function leerSesion(): SesionConductor | null {
  const memoria = almacenamientoDisponible();
  const crudo = memoria?.getItem(CLAVE_JWT_CONDUCTOR);
  if (!crudo) return null;

  try {
    const posible = JSON.parse(crudo) as Partial<SesionConductor>;
    if (typeof posible.token !== 'string' || posible.token.trim() === '') {
      return null;
    }
    return {
      token: posible.token,
      expiraEn: typeof posible.expiraEn === 'number' ? posible.expiraEn : 0,
      rol: typeof posible.rol === 'string' ? posible.rol : '',
    };
  } catch {
    return { token: crudo, expiraEn: 0, rol: '' };
  }
}

export function guardarSesion(sesion: SesionConductor): void {
  almacenamientoDisponible()?.setItem(CLAVE_JWT_CONDUCTOR, JSON.stringify(sesion));
}

export function borrarSesion(): void {
  almacenamientoDisponible()?.removeItem(CLAVE_JWT_CONDUCTOR);
}

export function sesionSigueVigente(sesion: SesionConductor, ahoraMs = Date.now()): boolean {
  return sesion.expiraEn * 1000 > ahoraMs;
}

configurarProveedorDeToken({
  obtenerToken() {
    return leerSesion()?.token ?? null;
  },
});
