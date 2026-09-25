import type { ReactNode } from 'react';
import { useSesionPasajero } from '../../core/pasajero/SesionPasajeroContext';
import { EntradaPasajero } from './EntradaPasajero';
import { IconoVinculado } from './IconosSesion';
import './SesionPasajero.css';

/**
 * La primera vez muestra la pantalla de entrada; despues, la app del pasajero.
 * La eleccion se recuerda entre visitas (SCRUM-26, B.1).
 */
export function PuertaDelPasajero({ children }: { children: ReactNode }) {
  const sesion = useSesionPasajero();
  if (!sesion) return children;
  if (sesion.modo === null) return <EntradaPasajero sesion={sesion} />;

  const { vinculacion, descartarVinculacion } = sesion;
  return (
    <>
      {children}
      {vinculacion && (
        <div className="vinculado-velo">
          <section className="vinculado-hoja" aria-labelledby="vinculado-titulo">
            <div className="vinculado-manija" aria-hidden="true">
              <span />
            </div>
            <div className="vinculado-aviso" role="status">
              <IconoVinculado />
              <div>
                <p id="vinculado-titulo" className="vinculado-titulo">
                  Sesión iniciada
                </p>
                <p className="vinculado-texto">{textoVinculacion(vinculacion.reservasVinculadas, vinculacion.opinionesVinculadas)}</p>
              </div>
            </div>
            <button type="button" className="vinculado-entendido" onClick={descartarVinculacion}>
              Entendido
            </button>
          </section>
        </div>
      )}
    </>
  );
}

export function textoVinculacion(reservas: number, opiniones: number): string {
  const partes = [
    reservas > 0 ? `${reservas} ${reservas === 1 ? 'reserva' : 'reservas'}` : null,
    opiniones > 0 ? `${opiniones} ${opiniones === 1 ? 'opinión' : 'opiniones'}` : null,
  ].filter(Boolean);
  return `Guardamos en tu cuenta ${partes.join(' y ')} de este teléfono.`;
}
