import { useContext } from 'react';
import { AuthContext, type EstadoAuth } from './AuthContext';

export function useAuth(): EstadoAuth {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth debe usarse dentro de AuthProvider.');
  }
  return contexto;
}
