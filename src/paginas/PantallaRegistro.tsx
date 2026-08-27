import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { MensajeError } from '../componentes/MensajeError';
import { obtenerIdDispositivo } from '../core/identidadDispositivo';
import { registrarDemanda } from '../core/registroDemanda';
import type { RegistroCreadoResponse } from '../core/tipos';
import { useUbicacion } from '../hooks/useUbicacion';
import { ErrorApi } from '../core/errores';

import './PantallaRegistro.css';

type EstadoRegistro = 'inactivo' | 'enviando' | 'registrado';

function esRegistroActivo(causa: unknown): boolean {
  if (!(causa instanceof ErrorApi) || causa.status !== 422) {
    return false;
  }

  const mensaje = causa.mensajeParaUsuario().toLowerCase();

  return (
    mensaje.includes('registro activo') ||
    mensaje.includes('ya existe un registro') ||
    mensaje.includes('registro duplicado') ||
    mensaje.includes('ya estás anotado')
  );
}

export function PantallaRegistro() { 
  const { paradaId: paradaIdTexto } = useParams();
  const paradaId = Number(paradaIdTexto);

  const [estado, setEstado] = useState<EstadoRegistro>('inactivo');
  const [mostrarExplicacion, setMostrarExplicacion] = useState(false);

  const [registroCreado, setRegistroCreado] =
    useState<RegistroCreadoResponse | null>(null);

  const [errorRegistro, setErrorRegistro] = useState<unknown>(null);

  const {
    solicitando,
    error: errorUbicacion,
    solicitarUbicacion,
  } = useUbicacion();

  function comenzarRegistro() {
    setErrorRegistro(null);
    setMostrarExplicacion(true);
  }

  async function continuarConUbicacion() {
    setEstado('enviando');
    setErrorRegistro(null);

    const ubicacion = await solicitarUbicacion();

    if (!ubicacion) {
      setEstado('inactivo');
      return;
    }

    try {
      const respuesta = await registrarDemanda({
        dispositivoId: obtenerIdDispositivo(),
        paradaId,
        latitud: ubicacion.latitud,
        longitud: ubicacion.longitud,
      });

      setRegistroCreado(respuesta);
      setEstado('registrado');
      setMostrarExplicacion(false);
   } catch (causa) {
  if (esRegistroActivo(causa)) {
    setRegistroCreado(null);
    setErrorRegistro(null);
    setEstado('registrado');
    setMostrarExplicacion(false);
    return;
  }

  setErrorRegistro(causa);
  setEstado('inactivo');
 } 
}

  return (
    <section className="registro">
      <div className="registro__encabezado">
        <p className="registro__etiqueta">Reserva tu lugar</p>

        <h1>¿Estás esperando el bus?</h1>

        <p>
          Avísale al conductor que estás en esta parada para que sepa que debe
          detenerse por ti.
        </p>
      </div>

      {!mostrarExplicacion && estado !== 'registrado' && (
        <button
          type="button"
          className="registro__boton-principal"
          onClick={comenzarRegistro}
          disabled={estado === 'enviando'}
        >
          Estoy esperando el bus
        </button>
      )}

      {mostrarExplicacion && estado !== 'registrado' && (
        <div className="registro__permiso">
          <h2>Necesitamos tu ubicación</h2>

          <p>
            La usamos únicamente para comprobar que estás cerca de la parada
            antes de registrar tu solicitud.
          </p>

          {errorUbicacion && (
            <p className="registro__error" role="alert">
              {errorUbicacion}
            </p>
          )}

      {errorRegistro !== null && (
  <MensajeError
    error={errorRegistro}
    onReintentar={() => {
      void continuarConUbicacion();
    }}
  />
)}
          <button
            type="button"
            className="registro__boton-principal"
            onClick={continuarConUbicacion}
            disabled={solicitando || estado === 'enviando'}
          >
            {solicitando || estado === 'enviando'
              ? 'Registrando...'
              : 'Continuar'}
          </button>
        </div>
      )}

      {estado === 'registrado' && (
  <div className="registro__confirmacion">
    <h2>Ya estás anotado</h2>

    {registroCreado ? (
      <>
        <p>
          Tu lugar en la parada {registroCreado.paradaId} fue registrado
          correctamente.
        </p>

        <p>
          La reserva estará activa hasta: {registroCreado.expiraEn}
        </p>
      </>
    ) : (
      <p>
        Ya tienes un registro activo para esta parada. No es necesario
        registrarte nuevamente.
      </p>
    )}
  </div>  
   )}
</section>
  );
}