/**
 * Sesion del panel municipal (SCRUM-173). Vive aparte de la del conductor:
 * otra clave, otro rol, y el JWT viaja explicito en cada peticion para no
 * pisar el proveedor de token global que usa el conductor.
 */
export const CLAVE_SESION_ADMIN = 'ecoruta_jwt_admin';

export interface SesionAdmin {
  token: string;
  /** Instante de vencimiento en milisegundos epoch. */
  expiraEnMs: number;
  inactividadMinutos: number;
  correo: string;
}

function almacenamiento(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function leerSesionAdmin(): SesionAdmin | null {
  const crudo = almacenamiento()?.getItem(CLAVE_SESION_ADMIN);
  if (!crudo) return null;
  try {
    const posible = JSON.parse(crudo) as Partial<SesionAdmin>;
    if (typeof posible.token !== 'string' || typeof posible.expiraEnMs !== 'number') return null;
    return {
      token: posible.token,
      expiraEnMs: posible.expiraEnMs,
      inactividadMinutos: typeof posible.inactividadMinutos === 'number' ? posible.inactividadMinutos : 30,
      correo: typeof posible.correo === 'string' ? posible.correo : '',
    };
  } catch {
    return null;
  }
}

export function guardarSesionAdmin(sesion: SesionAdmin): void {
  almacenamiento()?.setItem(CLAVE_SESION_ADMIN, JSON.stringify(sesion));
}

export function borrarSesionAdmin(): void {
  almacenamiento()?.removeItem(CLAVE_SESION_ADMIN);
}

export function sesionAdminVigente(sesion: SesionAdmin | null, ahoraMs = Date.now()): sesion is SesionAdmin {
  return sesion !== null && sesion.expiraEnMs > ahoraMs;
}

/** El backend serializa `expiraEn` como ISO-8601; se acepta tambien epoch en segundos o ms. */
export function aMilisegundos(expiraEn: string | number): number {
  if (typeof expiraEn === 'number') {
    return expiraEn < 1e12 ? expiraEn * 1000 : expiraEn;
  }
  const ms = Date.parse(expiraEn);
  return Number.isNaN(ms) ? 0 : ms;
}
