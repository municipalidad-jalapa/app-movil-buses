import { useState } from 'react';
import type { EstadoDelBusEta } from '../../core/tipos';
import { textoEstado, textoLlegada, type ParadaDelPanel } from '../../core/panelConductor';
import './FilaParadaConductor.css';

interface Props {
  parada: ParadaDelPanel;
  estadoBus: EstadoDelBusEta;
  /** La proxima parada pendiente: se resalta. */
  proxima: boolean;
  marcando: boolean;
  onMarcar: () => void;
}

/**
 * Una parada del recorrido en el panel del conductor (HU-62, HU-75, HU-76).
 *
 * <p>DESIGN.md §11 [DURA]: sin mapa, sin ornamento, alto contraste, legible a
 * un metro. Atendida/pendiente nunca depende solo del color (§12): siempre
 * lleva texto. Marcar atendida cierra las reservas de la parada, asi que pide
 * un segundo toque: con el bus en marcha un roce no puede cerrarlas.
 */
export function FilaParadaConductor({ parada, estadoBus, proxima, marcando, onMarcar }: Props) {
  const [confirmando, setConfirmando] = useState(false);
  const atendida = parada.atendidaEn !== null;
  const clases = ['fila-conductor'];
  if (atendida) clases.push('fila-conductor--atendida');
  if (proxima) clases.push('fila-conductor--proxima');

  return (
    <li className={clases.join(' ')} aria-current={proxima ? 'step' : undefined}>
      <div className="fila-conductor__orden tabular" aria-hidden="true">
        {parada.orden}
      </div>

      <div className="fila-conductor__identidad">
        {proxima && <span className="fila-conductor__proxima">Próxima parada</span>}
        <p className="fila-conductor__nombre">{parada.nombre}</p>
        <p className="fila-conductor__estado">{textoEstado(parada)}</p>
      </div>

      <p className="fila-conductor__llegada tabular" data-numero={parada.minutos !== null && !atendida}>
        {textoLlegada(parada, estadoBus)}
      </p>

      <p className="fila-conductor__esperando">
        <span className="fila-conductor__numero tabular">{atendida ? '–' : parada.reservasActivas}</span>
        <span className="fila-conductor__rotulo">esperando</span>
      </p>

      {!atendida && (
        <div className="fila-conductor__accion">
          {confirmando ? (
            <>
              <button
                type="button"
                className="fila-conductor__boton fila-conductor__boton--confirmar"
                onClick={() => {
                  setConfirmando(false);
                  onMarcar();
                }}
                disabled={marcando}
              >
                Sí, ya subieron
              </button>
              <button
                type="button"
                className="fila-conductor__boton fila-conductor__boton--volver"
                onClick={() => setConfirmando(false)}
              >
                Volver
              </button>
            </>
          ) : (
            <button
              type="button"
              className="fila-conductor__boton"
              onClick={() => setConfirmando(true)}
              disabled={marcando}
            >
              {marcando ? 'Marcando…' : 'Marcar atendida'}
            </button>
          )}
        </div>
      )}
    </li>
  );
}
