import { createContext, useContext } from 'react';
import type { SesionAdmin } from './sesionAdmin';

/** `denegado`: la cuenta de Firebase es valida pero no tiene rol de administrador (403). */
export type EstadoAccesoAdmin = 'fuera' | 'dentro' | 'denegado';

export type MotivoCierre = 'inactividad' | 'caducada' | null;

export interface EstadoAuthAdmin {
  estado: EstadoAccesoAdmin;
  sesion: SesionAdmin | null;
  /** Correo con el que se intento entrar, para la pantalla de acceso denegado. */
  correoDenegado: string | null;
  motivoCierre: MotivoCierre;
  iniciarSesion(correo: string, contrasena: string): Promise<void>;
  renovarSesion(): Promise<void>;
  cerrarSesion(motivo?: MotivoCierre): void;
  usarOtraCuenta(): void;
}

export const AuthAdminContext = createContext<EstadoAuthAdmin | null>(null);

export function useAuthAdmin(): EstadoAuthAdmin {
  const valor = useContext(AuthAdminContext);
  if (!valor) {
    throw new Error('useAuthAdmin debe usarse dentro de AuthAdminProvider');
  }
  return valor;
}
