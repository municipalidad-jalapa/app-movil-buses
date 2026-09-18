import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthAdmin } from '../../core/panelAdmin/AuthAdminContext';

/** Solo con sesion de administrador vigente; si no, al login del panel. */
export function RutaProtegidaAdmin({ children }: { children: ReactNode }) {
  const { estado, sesion } = useAuthAdmin();
  if (estado !== 'dentro' || !sesion || sesion.expiraEnMs <= Date.now()) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}
