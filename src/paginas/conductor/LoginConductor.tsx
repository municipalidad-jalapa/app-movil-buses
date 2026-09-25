import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { IconoAlerta } from '../../componentes/admin/IconosPanel';
import { PantallaDeIdentidad } from '../../componentes/admin/PantallaDeIdentidad';
import { Cargando } from '../../componentes/Cargando';
import { useAuth } from '../../core/autenticacion/useAuth';

/** Login del conductor. Reusa el estilo del panel municipal (PantallaDeIdentidad). */
export function LoginConductor() {
  const { usuario, cargando, mensajeSesion, iniciarSesion } = useAuth();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null);

  if (cargando) {
    return (
      <PantallaDeIdentidad titulo="Acceso del conductor">
        <Cargando texto="Comprobando sesión…" />
      </PantallaDeIdentidad>
    );
  }

  if (usuario) {
    return <Navigate to="/conductor" replace />;
  }

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErrorFormulario(null);
    setEnviando(true);
    try {
      await iniciarSesion(correo.trim(), contrasena);
    } catch (causa) {
      setErrorFormulario(
        causa instanceof Error ? causa.message : 'No se pudo iniciar sesión. Intenta de nuevo.',
      );
    } finally {
      setEnviando(false);
    }
  }

  const aviso = errorFormulario ?? mensajeSesion;

  return (
    <PantallaDeIdentidad titulo="Acceso del conductor">
      <header className="panel-encabezado">
        <p className="panel-rotulo">Conductor</p>
        <h1 className="panel-h1">Iniciar sesión</h1>
        <p className="panel-apoyo">Entrá con tu cuenta de la municipalidad.</p>
      </header>

      {aviso && (
        <p className="panel-aviso panel-aviso--error" role="alert">
          <IconoAlerta />
          <span>{aviso}</span>
        </p>
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
    </PantallaDeIdentidad>
  );
}
