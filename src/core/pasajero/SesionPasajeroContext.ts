import { createContext, useContext } from 'react';
import type { ModoPasajero, SesionPasajero, Vinculacion } from './sesionPasajero';

export interface EstadoSesionPasajero {
  /** null: todavia no eligio (pantalla de entrada). */
  modo: ModoPasajero | null;
  sesion: SesionPasajero | null;
  iniciando: boolean;
  /** Mensaje entendible si fallo el inicio con Google. */
  error: string | null;
  /** Lo que se asocio a la cuenta al iniciar sesion, para confirmarlo una vez. */
  vinculacion: Vinculacion | null;
  entrarComoInvitado(): void;
  iniciarConGoogle(): Promise<void>;
  /** Cierra la sesion y vuelve a modo invitado. */
  cerrarSesion(): void;
  descartarVinculacion(): void;
}

export const SesionPasajeroContext = createContext<EstadoSesionPasajero | null>(null);

/** Null fuera del proveedor: las pantallas de conductor y panel no lo necesitan. */
export function useSesionPasajero(): EstadoSesionPasajero | null {
  return useContext(SesionPasajeroContext);
}
