import type { EstadoSesionPasajero } from '../../core/pasajero/SesionPasajeroContext';
import { IconoAlertaSesion, IconoCandado, IconoEspera, IconoPersona, LogoGoogle } from './IconosSesion';
import './SesionPasajero.css';

/**
 * Pantalla de entrada del pasajero (SCRUM-26, B.1). Canvas «EcoRuta · Sesión
 * del pasajero», pantallas 1 a 3. Superficie de identidad (DESIGN.md §6).
 *
 * Los dos botones son deliberadamente iguales —mismo ancho, alto, peso y
 * estilo—: entrar como invitado no es la opcion "menor".
 */
export function EntradaPasajero({ sesion }: { sesion: EstadoSesionPasajero }) {
  const { iniciando, error, entrarComoInvitado, iniciarConGoogle } = sesion;

  return (
    <div className="entrada">
      <section className="entrada__identidad">
        <svg className="entrada__voluta" width="170" height="170" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
          <path
            d="M14 48c0-16 10-28 24-28 7 0 12 5 12 12s-5 11-11 11-10-4-10-10 4-8 8-8"
            fill="none"
            stroke="var(--verde-jumay-suave)"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
        <span className="entrada__marca">
          <svg width="44" height="44" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
            <circle cx="32" cy="32" r="31" fill="#FBF7F0" />
            <path
              d="M14 48c0-16 10-28 24-28 7 0 12 5 12 12s-5 11-11 11-10-4-10-10 4-8 8-8"
              fill="none"
              stroke="#10402A"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </svg>
          EcoRuta
        </span>
        <h1 className="entrada__titulo">Mira dónde viene el bus eléctrico de Jalapa</h1>
        <p className="entrada__bajada">No necesitas cuenta. Elige cómo quieres entrar.</p>
        <svg className="entrada__volcanes" viewBox="0 0 390 150" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path d="M0 150 L70 70 L110 104 L170 38 L230 100 L270 66 L390 150 Z" fill="var(--verde-jumay-fuerte)" />
          <path d="M150 60 L170 38 L190 60 L178 56 L170 62 L162 56 Z" fill="var(--amarillo-volcan)" opacity=".92" />
          <rect x="0" y="144" width="390" height="6" fill="var(--rojo-santa-marta)" />
        </svg>
      </section>

      <section className="entrada__hoja">
        {error && (
          <div className="entrada__error" role="alert">
            <IconoAlertaSesion tamano={22} />
            <div>
              <p className="entrada__error-titulo">No se inició la sesión</p>
              <p className="entrada__error-texto">{error}</p>
            </div>
          </div>
        )}

        <button type="button" className="entrada__opcion" onClick={entrarComoInvitado}>
          <IconoPersona />
          {error ? 'Continuar como invitado' : 'Ingresar como invitado'}
        </button>
        <button
          type="button"
          className="entrada__opcion"
          onClick={() => void iniciarConGoogle()}
          disabled={iniciando}
          aria-busy={iniciando}
        >
          {iniciando ? <IconoEspera /> : <LogoGoogle />}
          {iniciando ? 'Abriendo Google…' : error ? 'Intentar de nuevo' : 'Iniciar sesión'}
        </button>

        {iniciando && (
          <p className="entrada__estado" role="status">
            Elige tu cuenta en la ventana de Google. Si cambias de idea, puedes entrar como invitado.
          </p>
        )}

        <ul className="entrada__beneficios">
          <li>
            <strong>Como invitado</strong> funciona todo: mapa, seguimiento, tiempo estimado, reserva y opinión.
          </li>
          <li>
            <strong>Con cuenta</strong> conservas tus reservas y opiniones en cualquier dispositivo.
          </li>
        </ul>
        <p className="entrada__privacidad">
          <IconoCandado tamano={18} />
          Tu contraseña nunca se escribe en EcoRuta: la pide Google.
        </p>
      </section>
    </div>
  );
}
