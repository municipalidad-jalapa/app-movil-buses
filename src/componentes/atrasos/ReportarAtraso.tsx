import { useEffect, useRef, useState } from 'react';

import {
  COMENTARIO_MAXIMO,
  DEMORA_MAXIMA,
  DEMORA_MINIMA,
  TEXTO_DEL_MOTIVO,
  atrasoVigente,
  reportarAtraso,
  retirarAtraso,
  textoPlano,
  type AvisoDeAtraso,
  type MotivoDeAtraso,
} from '../../core/atrasos';
import { ErrorApi } from '../../core/errores';
import './ReportarAtraso.css';

/**
 * SCRUM-26, bloque E.2. El piloto avisa que viene demorado.
 *
 * Va en su panel, que se usa con el bus detenido y con una sola mano: dos
 * botones grandes para el motivo, tres demoras frecuentes y un comentario
 * opcional. La ruta no se elige: es la que tiene asignada su cuenta.
 */

const DEMORAS_FRECUENTES = [5, 10, 20] as const;

type Estado = 'cargando' | 'sin-aviso' | 'con-aviso' | 'enviando' | 'error';

export function ReportarAtraso() {
  const [estado, setEstado] = useState<Estado>('cargando');
  const [aviso, setAviso] = useState<AvisoDeAtraso | null>(null);
  const [motivo, setMotivo] = useState<MotivoDeAtraso>('TRAFICO');
  const [minutos, setMinutos] = useState<number>(10);
  const [comentario, setComentario] = useState('');
  const [error, setError] = useState('');
  const enviando = useRef(false);

  useEffect(() => {
    let vigente = true;
    void (async () => {
      try {
        const actual = await atrasoVigente();
        if (!vigente) return;
        setAviso(actual);
        setEstado(actual ? 'con-aviso' : 'sin-aviso');
      } catch (fallo) {
        if (!vigente) return;
        setError(mensajeDeFallo(fallo));
        setEstado('error');
      }
    })();
    return () => {
      vigente = false;
    };
  }, []);

  const enviar = async () => {
    if (enviando.current) return;
    enviando.current = true;
    setEstado('enviando');
    setError('');
    try {
      const creado = await reportarAtraso({
        motivo: motivo === 'TRAFICO' ? 'trafico' : 'incidente',
        demoraMinutos: minutos,
        comentario: comentario.trim() || undefined,
      });
      setAviso(creado);
      setComentario('');
      setEstado('con-aviso');
    } catch (fallo) {
      setError(mensajeDeFallo(fallo));
      setEstado('error');
    } finally {
      enviando.current = false;
    }
  };

  const retirar = async () => {
    if (enviando.current) return;
    enviando.current = true;
    setEstado('enviando');
    setError('');
    try {
      await retirarAtraso();
      setAviso(null);
      setEstado('sin-aviso');
    } catch (fallo) {
      setError(mensajeDeFallo(fallo));
      setEstado('error');
    } finally {
      enviando.current = false;
    }
  };

  if (estado === 'cargando') {
    return (
      <section className="atraso" aria-busy="true">
        <p className="atraso__cargando">Revisando si hay un atraso reportado…</p>
      </section>
    );
  }

  return (
    <section className="atraso">
      <h2 className="atraso__titulo">Aviso de atraso</h2>

      {aviso ? (
        <div className="atraso__vigente" role="status">
          <p className="atraso__vigente-texto">
            Avisaste {TEXTO_DEL_MOTIVO[aviso.motivo]}: unos {aviso.demoraMinutos} min de demora.
          </p>
          {aviso.comentario ? <p className="atraso__vigente-nota">{textoPlano(aviso.comentario)}</p> : null}
          <p className="atraso__vigente-nota">Los pasajeros lo están viendo junto al tiempo estimado.</p>
          <button
            type="button"
            className="atraso__boton atraso__boton--secundario"
            onClick={() => void retirar()}
            disabled={estado === 'enviando'}
          >
            Ya se normalizó
          </button>
        </div>
      ) : (
        <>
          <p className="atraso__ayuda">
            Avisa cuando vengas demorado. El pasajero lo ve junto al tiempo estimado.
          </p>

          <fieldset className="atraso__grupo">
            <legend className="atraso__etiqueta">Motivo</legend>
            <div className="atraso__opciones">
              {(['TRAFICO', 'INCIDENTE'] as const).map((valor) => (
                <button
                  key={valor}
                  type="button"
                  className="atraso__opcion"
                  aria-pressed={motivo === valor}
                  onClick={() => setMotivo(valor)}
                >
                  {valor === 'TRAFICO' ? 'Tráfico' : 'Incidente'}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="atraso__grupo">
            <legend className="atraso__etiqueta">Demora estimada</legend>
            <div className="atraso__opciones">
              {DEMORAS_FRECUENTES.map((valor) => (
                <button
                  key={valor}
                  type="button"
                  className="atraso__opcion"
                  aria-pressed={minutos === valor}
                  onClick={() => setMinutos(valor)}
                >
                  {valor} min
                </button>
              ))}
            </div>
            <label className="atraso__minutos">
              <span>Otra cantidad</span>
              <input
                type="number"
                inputMode="numeric"
                min={DEMORA_MINIMA}
                max={DEMORA_MAXIMA}
                value={minutos}
                onChange={(evento) => setMinutos(Number(evento.target.value))}
              />
            </label>
          </fieldset>

          <label className="atraso__comentario">
            <span className="atraso__etiqueta">Comentario (opcional)</span>
            <textarea
              value={comentario}
              maxLength={COMENTARIO_MAXIMO}
              rows={2}
              placeholder="Por ejemplo: cerrada la 1a Calle"
              onChange={(evento) => setComentario(evento.target.value)}
            />
            <span className="atraso__contador">{COMENTARIO_MAXIMO - comentario.length} caracteres</span>
          </label>

          <button
            type="button"
            className="atraso__boton"
            onClick={() => void enviar()}
            disabled={estado === 'enviando' || minutos < DEMORA_MINIMA || minutos > DEMORA_MAXIMA}
          >
            {estado === 'enviando' ? 'Avisando…' : 'Avisar atraso'}
          </button>
        </>
      )}

      {error ? (
        <p className="atraso__error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

/**
 * Nunca el error crudo de la API. `mensajeParaUsuario()` ya devuelve el texto
 * del backend en los 422, que son las reglas de negocio redactadas para la gente.
 */
function mensajeDeFallo(fallo: unknown): string {
  return fallo instanceof ErrorApi
    ? fallo.mensajeParaUsuario()
    : 'No pudimos registrar el aviso. Inténtalo de nuevo.';
}
