import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Cargando } from '../../componentes/Cargando';
import { Layout } from '../../componentes/Layout';
import { useAuth } from '../../core/autenticacion/useAuth';
import './LoginConductor.css';

export function LoginConductor() {
  const { usuario, cargando, mensajeSesion, iniciarSesion } = useAuth();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null);

  if (cargando) {
    return (
      <Layout>
        <Cargando texto="Comprobando sesión…" />
      </Layout>
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
    <Layout>
      <section className="login-conductor">
        <header className="login-conductor__encabezado">
          <p className="login-conductor__etiqueta">Conductor</p>
          <h1>Iniciar sesión</h1>
          <p>Entrá con tu cuenta de la municipalidad.</p>
        </header>

        {aviso && (
          <p className="login-conductor__aviso" role="alert">
            {aviso}
          </p>
        )}

        <form className="login-conductor__formulario" onSubmit={alEnviar}>
          <label className="login-conductor__campo">
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
          <label className="login-conductor__campo">
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
          <button type="submit" className="login-conductor__enviar" disabled={enviando}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </section>
    </Layout>
  );
}
