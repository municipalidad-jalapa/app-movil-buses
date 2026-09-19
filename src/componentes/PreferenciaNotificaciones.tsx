import { useState } from 'react';

import {
  marcarRechazado,
  sePuedeOfrecerAvisos,
  solicitarPermiso,
} from '../core/notificaciones/permisoNotificaciones';
import { obtenerTokenNotificacion } from '../core/notificaciones/mensajeria';
import { registrarTokenDelDispositivo } from '../core/notificaciones/registroDeToken';
import './PreferenciaNotificaciones.css';

type Estado = 'ofreciendo' | 'activando' | 'activado' | 'descartado';

/**
 * Invitacion a activar los avisos (HU-58).
 *
 * Explica para que sirven ANTES de pedir el permiso, nunca de golpe: es criterio
 * de aceptacion. El copy sale del canvas, pantalla "01 Bienvenida".
 *
 * Si el pasajero dice que no, se recuerda y no se vuelve a ofrecer. Y si algo
 * falla al registrar el token, no se muestra error: la reserva ya esta hecha y
 * los avisos son un extra, no un requisito.
 */
export function PreferenciaNotificaciones() {
  // Se decide una sola vez al montar: si cambiara en cada render, el componente
  // desapareceria a mitad de la interaccion.
  const [visible] = useState(() => sePuedeOfrecerAvisos());
  const [estado, setEstado] = useState<Estado>('ofreciendo');

  if (!visible || estado === 'descartado') {
    return null;
  }

  async function activar() {
    setEstado('activando');

    const permiso = await solicitarPermiso();

    if (permiso !== 'concedido') {
      setEstado('descartado');
      return;
    }

    try {
      const token = await obtenerTokenNotificacion();
      if (token) {
        await registrarTokenDelDispositivo(token);
      }
    } catch {
      // El pasajero dio el permiso pero no pudimos registrar el token: sin red,
      // sin Firebase configurado o el backend caido. No se le dice nada, porque
      // no hay nada que pueda hacer y su reserva sigue en pie.
    }

    setEstado('activado');
  }

  function rechazar() {
    marcarRechazado();
    setEstado('descartado');
  }

  if (estado === 'activado') {
    return (
      <div className="avisos avisos--activado" role="status" aria-live="polite">
        <IconoCampana />
        <p>Te avisamos cuando el bus ya viene para tu parada.</p>
      </div>
    );
  }

  return (
    <section className="avisos" aria-labelledby="avisos-titulo">
      <div className="avisos__encabezado">
        <IconoCampana />
        <h2 id="avisos-titulo">Avisos</h2>
      </div>

      <p>Te avisamos cuando el bus ya viene para tu parada.</p>

      <div className="avisos__acciones">
        <button
          type="button"
          className="avisos__boton-principal"
          onClick={() => void activar()}
          disabled={estado === 'activando'}
        >
          {estado === 'activando' ? 'Activando...' : 'Activar avisos'}
        </button>

        <button type="button" className="avisos__boton-secundario" onClick={rechazar}>
          Seguir sin dar permisos
        </button>
      </div>
    </section>
  );
}

function IconoCampana() {
  return (
    <svg className="avisos__icono" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 19a2.5 2.5 0 0 0 4 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
