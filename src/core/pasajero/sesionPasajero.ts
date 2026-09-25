import { apiClient } from '../apiClient';

/**
 * Sesion OPCIONAL del pasajero (SCRUM-26, bloque B). Separada de la del
 * conductor y de la del panel: otra clave, otro rol, y el JWT viaja explicito
 * solo donde hace falta.
 */

export const CLAVE_MODO = 'ecoruta_modo_pasajero';
export const CLAVE_SESION = 'ecoruta_jwt_pasajero';

/** `null`: todavia no eligio como entrar (se muestra la pantalla de entrada). */
export type ModoPasajero = 'invitado' | 'cuenta';

export interface SesionPasajero {
  token: string;
  expiraEnMs: number;
  correo: string | null;
}

export interface Vinculacion {
  reservasVinculadas: number;
  opinionesVinculadas: number;
}

function almacenamiento(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function leerModo(): ModoPasajero | null {
  const valor = almacenamiento()?.getItem(CLAVE_MODO);
  return valor === 'invitado' || valor === 'cuenta' ? valor : null;
}

export function guardarModo(modo: ModoPasajero | null): void {
  if (modo) almacenamiento()?.setItem(CLAVE_MODO, modo);
  else almacenamiento()?.removeItem(CLAVE_MODO);
}

export function leerSesionPasajero(ahoraMs = Date.now()): SesionPasajero | null {
  const crudo = almacenamiento()?.getItem(CLAVE_SESION);
  if (!crudo) return null;
  try {
    const s = JSON.parse(crudo) as Partial<SesionPasajero>;
    if (typeof s.token !== 'string' || typeof s.expiraEnMs !== 'number' || s.expiraEnMs <= ahoraMs) return null;
    return { token: s.token, expiraEnMs: s.expiraEnMs, correo: typeof s.correo === 'string' ? s.correo : null };
  } catch {
    return null;
  }
}

export function guardarSesionPasajero(sesion: SesionPasajero | null): void {
  if (sesion) almacenamiento()?.setItem(CLAVE_SESION, JSON.stringify(sesion));
  else almacenamiento()?.removeItem(CLAVE_SESION);
}

interface RespuestaSesion {
  token: string;
  expiraEn: string | number;
  correo: string | null;
}

function aMs(valor: string | number): number {
  if (typeof valor === 'number') return valor < 1e12 ? valor * 1000 : valor;
  const ms = Date.parse(valor);
  return Number.isNaN(ms) ? 0 : ms;
}

export async function intercambiarTokenPasajero(idToken: string): Promise<SesionPasajero> {
  const r = await apiClient.post<RespuestaSesion>('/api/v1/sesion/pasajero', { idToken }, { intentos: 1 });
  if (!r?.token) throw new Error('Respuesta de sesion incompleta.');
  return { token: r.token, expiraEnMs: aMs(r.expiraEn), correo: r.correo };
}

/** Idempotente: repetirla no duplica ni reasigna lo que es de otra cuenta. */
export async function vincularNavegador(token: string, dispositivoId: string): Promise<Vinculacion> {
  const r = await apiClient.post<Vinculacion>('/api/v1/sesion/pasajero/vincular', { dispositivoId }, { token });
  return r ?? { reservasVinculadas: 0, opinionesVinculadas: 0 };
}
