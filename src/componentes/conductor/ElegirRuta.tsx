import { useEffect, useState } from 'react';
import { ErrorApi } from '../../core/errores';
import { elegirRutaConductor, obtenerRutaConductor, type RutaDelConductor } from '../../core/panelConductor';
import { Cargando } from '../Cargando';

/**
 * Las rutas publicadas como botones grandes: el conductor toca la que va a
 * manejar. La que ya tiene queda marcada. Se usa al entrar al panel y desde la
 * barra, para cambiar de ruta en la jornada.
 */
export function ElegirRuta({ onElegida }: { onElegida: (ruta: RutaDelConductor) => void }) {
  const [datos, setDatos] = useState<RutaDelConductor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eligiendo, setEligiendo] = useState<number | null>(null);

  useEffect(() => {
    const control = new AbortController();
    obtenerRutaConductor(control.signal)
      .then((respuesta) => respuesta && setDatos(respuesta))
      .catch((causa) => {
        if (control.signal.aborted) return;
        setError(causa instanceof ErrorApi ? causa.mensajeParaUsuario() : 'No pudimos cargar las rutas.');
      });
    return () => control.abort();
  }, []);

  async function elegir(rutaId: number) {
    setEligiendo(rutaId);
    setError(null);
    try {
      const respuesta = await elegirRutaConductor(rutaId);
      if (respuesta) onElegida(respuesta);
    } catch (causa) {
      setError(causa instanceof ErrorApi ? causa.mensajeParaUsuario() : 'No pudimos cambiar la ruta. Probá de nuevo.');
    } finally {
      setEligiendo(null);
    }
  }

  if (!datos) {
    return error ? (
      <p className="conductor__fallo" role="alert">
        {error}
      </p>
    ) : (
      <Cargando texto="Cargando rutas…" />
    );
  }

  if (datos.rutas.length === 0) {
    return <p className="conductor__apoyo">Todavía no hay rutas publicadas. Avisale a la Municipalidad.</p>;
  }

  return (
    <div className="conductor__elegir">
      <ul className="conductor__rutas" aria-label="Rutas publicadas">
        {datos.rutas.map((r) => {
          const actual = r.id === datos.rutaId;
          return (
            <li key={r.id}>
              <button
                type="button"
                className={actual ? 'conductor__opcion conductor__opcion--actual' : 'conductor__opcion'}
                aria-pressed={actual}
                disabled={eligiendo !== null}
                onClick={() => void elegir(r.id)}
              >
                <strong>{r.nombre}</strong>
                <span>{eligiendo === r.id ? 'Cambiando…' : actual ? 'La que manejás' : 'Manejar esta'}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {error && (
        <p className="conductor__fallo" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
