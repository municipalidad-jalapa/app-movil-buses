import { Layout } from '../../componentes/Layout';
import { useAuth } from '../../core/autenticacion/useAuth';
import './PanelConductor.css';

/**
 * Placeholder de HU-126: cuando esa historia agregue las pantallas reales del
 * conductor, solo se añaden mas rutas hijas dentro del mismo RutaProtegida.
 */
export function PanelConductor() {
  const { usuario, rol, cerrarSesion } = useAuth();

  return (
    <Layout>
      <section className="panel-conductor">
        <h1>Pantalla del conductor</h1>
        <p>
          Sesión de {usuario?.correo}
          {rol ? ` · ${rol}` : ''}.
        </p>
        <button type="button" className="panel-conductor__salir" onClick={() => void cerrarSesion()}>
          Cerrar sesión
        </button>
      </section>
    </Layout>
  );
}
