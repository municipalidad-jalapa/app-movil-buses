import './EstadoSinPosicion.css';

/**
 * Estado de primera clase (DESIGN.md §7): aun no hay datos del bus.
 * No es un error ni un mapa vacio.
 */
export function EstadoSinPosicion() {
  return (
    <div className="estado-sin-posicion" role="status">
      <svg
        className="estado-sin-posicion__icono"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <path
          fill="currentColor"
          d="M12 4a8 8 0 1 0 .01 16.01A8 8 0 0 0 12 4zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm.8 2.5v3.2l2.6 1.6-.8 1.3L11 12.2V8.5h1.8z"
        />
      </svg>
      <p>Aún no hay datos del bus. Cuando reporte, lo vas a ver acá.</p>
    </div>
  );
}
