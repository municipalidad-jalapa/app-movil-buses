import { IconoCandado } from '../../componentes/admin/IconosPanel';
import { PantallaDeIdentidad } from '../../componentes/admin/PantallaDeIdentidad';
import { useAuthAdmin } from '../../core/panelAdmin/AuthAdminContext';

/** Cuenta valida sin rol de administrador: el backend respondio 403 (SCRUM-173, criterio 4). Canvas: 4. */
export function AccesoDenegado() {
  const { correoDenegado, usarOtraCuenta } = useAuthAdmin();

  return (
    <PantallaDeIdentidad anchoContenido={440}>
      <span className="panel-icono-cuadro panel-icono-cuadro--neutro">
        <IconoCandado tamano={28} />
      </span>
      <header className="panel-encabezado">
        <p className="panel-rotulo">Panel municipal</p>
        <h1 className="panel-h1">Esta cuenta no tiene permiso para el panel</h1>
        <p className="panel-apoyo">
          {correoDenegado ? (
            <>
              Entraste como <strong className="panel-destacado">{correoDenegado}</strong>.{' '}
            </>
          ) : null}
          Esa cuenta no es de administrador y el panel municipal es solo para administradores.
        </p>
      </header>
      <p className="panel-nota">
        <IconoCandado />
        <span>Si necesitas acceso, pide a la Unidad de Informática que le asigne el rol de administrador a tu cuenta.</span>
      </p>
      <button type="button" className="panel-boton panel-boton--primario panel-boton--ancho" onClick={usarOtraCuenta}>
        Usar otra cuenta
      </button>
    </PantallaDeIdentidad>
  );
}
