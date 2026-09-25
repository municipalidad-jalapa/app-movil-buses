import { Link } from 'react-router-dom';
import './PieLegal.css';

export function PieLegal() {
  return (
    <footer className="pie-legal">
      <nav
        className="pie-legal__enlaces"
        aria-label="Información legal"
      >
        <Link to="/privacidad">
          Política de privacidad
        </Link>

        <span aria-hidden="true">·</span>

        <Link to="/aviso-legal">
          Aviso legal
        </Link>
      </nav>

      <p className="pie-legal__municipalidad">
        Municipalidad de Jalapa
      </p>
    </footer>
  );
}