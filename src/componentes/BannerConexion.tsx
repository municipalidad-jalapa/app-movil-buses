import type { EstadoConexion } from '../core/flujoDePosiciones';
import './BannerConexion.css';

interface Props {
  estadoConexion: EstadoConexion;
}

const TEXTOS: Record<EstadoConexion, string> = {
  conectando: 'Buscando al bus',
  'en-vivo': 'En vivo',
  reconectando: 'Sin datos nuevos. Se está reconectando.',
};

/**
 * Aviso de degradacion (DESIGN.md §8): informa, no alarma.
 * Color + icono + texto siempre (DESIGN.md §3.1 [DURA]).
 */
export function BannerConexion({ estadoConexion }: Props) {
  return (
    <div
      className={`banner-conexion banner-conexion--${estadoConexion}`}
      role="status"
      aria-live="polite"
    >
      <IconoEstado estado={estadoConexion} />
      <p>{TEXTOS[estadoConexion]}</p>
    </div>
  );
}

function IconoEstado({ estado }: { estado: EstadoConexion }) {
  return (
    <svg
      className="banner-conexion__icono"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {estado === 'reconectando' ? (
        <path
          fill="currentColor"
          d="M12 4a8 8 0 1 0 7.5 10.6l-1.9-.6A6 6 0 1 1 12 6V4zm.8 4v4.2l3.2 1.9-.8 1.4-4-2.4V8h1.6z"
        />
      ) : estado === 'en-vivo' ? (
        <path
          fill="currentColor"
          d="M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0-4.8 1.4 3.2A7.8 7.8 0 0 1 19.6 12l3.2 1.4L19.6 14.8A7.8 7.8 0 0 1 13.4 20.6L12 24l-1.4-3.4A7.8 7.8 0 0 1 4.4 14.8L1.2 13.4 4.4 12A7.8 7.8 0 0 1 10.6 5.4L12 2.2z"
        />
      ) : (
        <path
          fill="currentColor"
          d="M12 6a6 6 0 0 1 6 6h2a8 8 0 0 0-8-8v2zm0 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm-8 2h2a6 6 0 0 1 6-6V4a8 8 0 0 0-8 8z"
        />
      )}
    </svg>
  );
}
