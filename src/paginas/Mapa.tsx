import { useMemo, useState } from 'react';

import { useEta } from '../hooks/useEta';
import { useFrescuraPosicion } from '../hooks/useFrescuraPosicion';
import { usePosicionBus } from '../hooks/usePosicionBus';
import { usePrefiereOscuro } from '../hooks/usePrefiereOscuro';
import { useRutas } from '../hooks/useRutas';

import { MapaJalapa } from '../componentes/MapaJalapa';
import { BannerConexion } from '../componentes/BannerConexion';
import { EstadoSinPosicion } from '../componentes/EstadoSinPosicion';
import { HoraUltimoDato } from '../componentes/HoraUltimoDato';
import { MensajeError } from '../componentes/MensajeError';

import './Mapa.css';

/**
 * Pantalla principal del pasajero.
 *
 * HU-50 + HU-51:
 * muestra el mapa, la ruta y la posicion del bus.
 *
 * HU-74:
 * permite seleccionar una parada y muestra
 * el tiempo estimado de llegada del bus.
 */
export function Mapa() {
  const {
    rutas,
    rutaActiva,
    cargando,
    error,
    reintentar,
  } = useRutas();

  const {
    posicion,
    estadoConexion,
    recibidoEn,
    cargaInicialLista,
  } = usePosicionBus();

  const oscuro =
    usePrefiereOscuro();

  /**
   * HU-74:
   * determina si la ultima posicion del bus
   * todavia se puede considerar reciente.
   */
  const {
    datoReciente,
    segundosSinDato,
  } = useFrescuraPosicion(
    recibidoEn,
  );

  const [
    paradaSeleccionadaId,
    setParadaSeleccionadaId,
  ] = useState<number | null>(
    null,
  );

  /**
   * La parada determina la ruta.
   *
   * No utilizamos un rutaId fijo.
   */
  const rutaSeleccionada =
    useMemo(() => {
      if (
        paradaSeleccionadaId === null ||
        rutas === null
      ) {
        return null;
      }

      return (
        rutas.find((ruta) =>
          ruta.paradas.some(
            (parada) =>
              parada.id ===
              paradaSeleccionadaId,
          ),
        ) ?? null
      );
    }, [
      rutas,
      paradaSeleccionadaId,
    ]);

  /**
   * Recuperamos la parada completa
   * para mostrar su nombre.
   */
  const paradaSeleccionada =
    useMemo(() => {
      if (
        !rutaSeleccionada ||
        paradaSeleccionadaId === null
      ) {
        return null;
      }

      return (
        rutaSeleccionada.paradas.find(
          (parada) =>
            parada.id ===
            paradaSeleccionadaId,
        ) ?? null
      );
    }, [
      rutaSeleccionada,
      paradaSeleccionadaId,
    ]);

  /**
   * Existe una posicion, pero lleva demasiado
   * tiempo sin actualizarse.
   */
  const datoDesactualizado =
    posicion !== null &&
    recibidoEn !== null &&
    !datoReciente;

  /**
   * Una posicion desactualizada no debe utilizarse
   * para presentar un ETA como si fuera vigente.
   */
  const posicionParaEta =
    datoDesactualizado
      ? null
      : posicion;

  const {
    estadoEta,
    cargando: cargandoEta,
  } = useEta(
    rutaSeleccionada,
    paradaSeleccionadaId,
    posicionParaEta,
  );

  // Sin red se usa el croquis.
  const capa =
    cargando
      ? 'cargando'
      : estadoConexion ===
          'reconectando'
        ? 'croquis'
        : 'mapa';

  return (
    <div className="pantalla-mapa">
      <MapaJalapa
        ruta={rutaActiva}
        posicionBus={posicion}
        capa={capa}
        modo={
          oscuro
            ? 'oscuro'
            : 'claro'
        }
        paradaTuyaId={
          paradaSeleccionadaId
        }
        onSeleccionarParada={
          setParadaSeleccionadaId
        }
      />

      <div className="pantalla-mapa__encima">
        <BannerConexion
          estadoConexion={
            estadoConexion
          }
        />

        {error && (
          <div className="pantalla-mapa__aviso">
            <MensajeError
              error={error}
              onReintentar={
                reintentar
              }
            />
          </div>
        )}

        {cargaInicialLista &&
          posicion === null &&
          !error && (
            <div className="pantalla-mapa__aviso">
              <EstadoSinPosicion />
            </div>
          )}

        {paradaSeleccionada && (
          <div className="pantalla-mapa__eta">
            <p className="pantalla-mapa__eta-etiqueta">
              Tu parada
            </p>

            <h2>
              {
                paradaSeleccionada.nombre
              }
            </h2>

            {/*
             * Si teniamos una posicion pero ya esta
             * desactualizada, este estado tiene prioridad
             * sobre cualquier ETA.
             */}
            {datoDesactualizado ? (
              <>
                <p className="pantalla-mapa__eta-sin-datos">
                  No se conoce el tiempo
                  de llegada.
                </p>

                <p className="pantalla-mapa__eta-texto">
                  Último dato recibido{' '}
                  {describirAntiguedad(
                    segundosSinDato,
                  )}
                  .
                </p>
              </>
            ) : (
              <>
                {cargandoEta && (
                  <p>
                    Calculando llegada...
                  </p>
                )}

                {!cargandoEta &&
                  estadoEta?.tipo ===
                    'llegada' &&
                  estadoEta.confiable && (
                    <>
                      <p className="pantalla-mapa__eta-texto">
                        Llega en
                      </p>

                      <strong className="pantalla-mapa__eta-minutos">
                        {
                          estadoEta.minutos
                        }{' '}
                        min
                      </strong>
                    </>
                  )}

                {!cargandoEta &&
                  estadoEta?.tipo ===
                    'llegada' &&
                  !estadoEta.confiable && (
                    <>
                      <p className="pantalla-mapa__eta-texto">
                        Llegada aproximada
                      </p>

                      <strong className="pantalla-mapa__eta-minutos">
                        aprox.{' '}
                        {
                          estadoEta.minutos
                        }{' '}
                        min
                      </strong>
                    </>
                  )}

                {!cargandoEta &&
                  estadoEta?.tipo ===
                    'proxima-salida' && (
                    <>
                      <p className="pantalla-mapa__eta-texto">
                        El recorrido todavía
                        no inicia
                      </p>

                      <strong className="pantalla-mapa__eta-salida">
                        Próxima salida:{' '}
                        {
                          estadoEta.hora
                        }
                      </strong>
                    </>
                  )}

                {!cargandoEta &&
                  estadoEta?.tipo ===
                    'sin-datos' && (
                    <p className="pantalla-mapa__eta-sin-datos">
                      No se conoce el tiempo
                      de llegada.
                    </p>
                  )}
              </>
            )}
          </div>
        )}
      </div>

      {posicion &&
        recibidoEn && (
          <div className="pantalla-mapa__pie">
            <HoraUltimoDato
              recibidoEn={
                recibidoEn
              }
            />
          </div>
        )}
    </div>
  );
}

/**
 * Convierte la antiguedad del ultimo dato
 * en un mensaje facil de leer.
 */
function describirAntiguedad(
  segundos: number | null,
): string {
  if (segundos === null) {
    return 'hace un momento';
  }

  if (segundos < 60) {
    return `hace ${segundos} s`;
  }

  const minutos =
    Math.floor(
      segundos / 60,
    );

  if (minutos < 60) {
    return minutos === 1
      ? 'hace 1 min'
      : `hace ${minutos} min`;
  }

  const horas =
    Math.floor(
      minutos / 60,
    );

  return horas === 1
    ? 'hace 1 h'
    : `hace ${horas} h`;
}
