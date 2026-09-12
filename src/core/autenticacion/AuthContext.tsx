import { createContext } from 'react';

export interface UsuarioConductor {
  correo: string;
}

export interface EstadoAuth {
  usuario: UsuarioConductor | null;
  token: string | null;
  rol: string | null;
  cargando: boolean;
  mensajeSesion: string | null;
  iniciarSesion: (correo: string, contrasena: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
}

export const AuthContext = createContext<EstadoAuth | null>(null);
