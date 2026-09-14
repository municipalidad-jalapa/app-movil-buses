import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { IconoAlerta, IconoReloj } from '../../componentes/admin/IconosPanel';
import { PantallaDeIdentidad } from '../../componentes/admin/PantallaDeIdentidad';
import { useAuthAdmin } from '../../core/panelAdmin/AuthAdminContext';
import { AccesoDenegado } from './AccesoDenegado';

export const MENSAJE_CIERRE_INACTIVIDAD = 'Cerramos tu sesión por inactividad. Entra de nuevo para seguir.';
export const MENSAJE_CIERRE_CADUCADA = 'Tu sesión terminó. Entra de nuevo para seguir.';

/** Login del panel municipal (SCRUM-173). Canvas: 1, 1b y 3b. */
export function LoginAdmin() {
  const { estado, motivoCierre, iniciarSesion } = useAuthAdmin();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (estado === 'dentro') {
    return <Navigate to="/admin" replace />;
  }
  if (estado === 'denegado') {
    return <AccesoDenegado />;
  }

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await iniciarSesion(correo.trim(), contrasena);
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo iniciar sesión. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  const informativo =
    motivoCierre === 'inactividad' ? MENSAJE_CIERRE_INACTIVIDAD : motivoCierre === 'caducada' ? MENSAJE_CIERRE_CADUCADA : null;

  return (
    <PantallaDeIdentidad>
      <header className="panel-encabezado">
        <p className="panel-rotulo">Panel municipal</p>
        <h1 className="panel-h1">Iniciar sesión</h1>
        <p className="panel-apoyo">Entra con tu cuenta de administrador de la municipalidad.</p>
      </header>

      {error ? (
        <p className="panel-aviso panel-aviso--error" role="alert">
          <IconoAlerta />
          <span>{error}</span>
        </p>
      ) : (
        informativo && (
          <p className="panel-aviso panel-aviso--informativo" role="alert">
            <IconoReloj />
            <span>{informativo}</span>
          </p>
        )
      )}

      <form className="panel-formulario" onSubmit={alEnviar}>
        <label className="panel-campo">
          Correo
          <input
            type="email"
            name="correo"
            autoComplete="username"
            required
            value={correo}
            onChange={(evento) => setCorreo(evento.target.value)}
          />
        </label>
        <label className="panel-campo">
          Contraseña
          <input
            type="password"
            name="contrasena"
            autoComplete="current-password"
            required
            value={contrasena}
            onChange={(evento) => setContrasena(evento.target.value)}
          />
        </label>
        <button type="submit" className="panel-boton panel-boton--primario panel-boton--ancho" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <p className="panel-ayuda">
        ¿Olvidaste tu contraseña o no tienes cuenta? Pídela a la Unidad de Informática de la municipalidad.
      </p>
    </PantallaDeIdentidad>
  );
}
