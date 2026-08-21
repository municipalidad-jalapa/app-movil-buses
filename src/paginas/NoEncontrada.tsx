import { Link } from 'react-router-dom';

export function NoEncontrada() {
  return (
    <>
      <h1>Pagina no encontrada</h1>
      <p>La direccion que abriste no existe.</p>
      <p>
        <Link to="/">Volver al inicio</Link>
      </p>
    </>
  );
}
