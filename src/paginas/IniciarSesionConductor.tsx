import { Link } from 'react-router-dom';

/**
 * Destino de "Iniciar sesión" desde el panel del conductor (HU-62, criterio 6).
 *
 * La autenticación real del conductor es HU-129 y todavía no existe: esta
 * pantalla solo informa por qué llegó acá, sin inventar un formulario que
 * no tiene backend contra el cual funcionar.
 */
export function IniciarSesionConductor() {
  return (
    <>
      <h1>Inicio de sesión de conductor</h1>
      <p>
        Todavía no está disponible el inicio de sesión del conductor. Se habilita cuando esté
        lista la autenticación.
      </p>
      <p>
        <Link to="/">Volver al inicio</Link>
      </p>
    </>
  );
}
