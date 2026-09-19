import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Cargando } from './Cargando';
import { Layout } from './Layout';
import { useAuth } from '../core/autenticacion/useAuth';

interface Props {
  children: ReactNode;
}

/**
 * Protege las rutas del conductor (placeholder de HU-126).
 * Sin sesion redirige al login. Mientras arranca, muestra Cargando.
 */
export function RutaProtegida({ children }: Props) {
  const { usuario, cargando } = useAuth();

  if (cargando) {
    return (
      <Layout>
        <Cargando texto="Comprobando sesión…" />
      </Layout>
    );
  }

  if (!usuario) {
    return <Navigate to="/conductor/login" replace />;
  }

  return children;
}
