import type { EtaRuta } from '../core/tipos';
import './TarjetaEta.css';

/**
 * "Llega a tu parada en" (QA 5.1, HU-74 / SCRUM-169).
 *
 * <p>Calco de la caja "ETA con nivel de confianza" de `design/EcoRuta.dc.html`:
 * el numero grande y tres barritas como unico indicador de confianza. Nunca
 * dicen "error"; dicen cuanto sabemos:
 *
 * <ul>
 *   <li>3 barras, "cálculo confiable": velocidad observada del propio bus.</li>
 *   <li>2 barras, "cálculo aproximado": velocidad promedio del recorrido, o el
 *       bus va por un desvio.</li>
 *   <li>1 barra: todavia no se puede calcular, con el motivo.</li>
 * </ul>
 *
 * <p>Los minutos los calcula el backend siguiendo el trazado de la ruta, no en
 * linea recta.
 */
interface Props {
  eta: EtaRuta | null;
  paradaId: number;
}

type Nivel = 1 | 2 | 3;

export function TarjetaEta({ eta, paradaId }: Props) {
  const lectura = leerEta(eta, paradaId);
  return (
    <div className="tarjeta-eta" role="status" aria-live="polite" data-testid="eta" data-nivel={lectura.nivel}>
      <span className="tarjeta-eta__rotulo">{lectura.rotulo}</span>
      <span className={lectura.esNumero ? 'tarjeta-eta__valor tabular' : 'tarjeta-eta__valor tarjeta-eta__valor--texto'}>
        {lectura.valor}
      </span>
      <span className="tarjeta-eta__confianza">
        <Barras nivel={lectura.nivel} />
        <span>{lectura.confianza}</span>
      </span>
    </div>
  );
}

export interface LecturaEta {
  rotulo: string;
  valor: string;
  esNumero: boolean;
  nivel: Nivel;
  confianza: string;
}

export function leerEta(eta: EtaRuta | null, paradaId: number): LecturaEta {
  if (!eta) {
    return { rotulo: 'Llega a tu parada en', valor: '…', esNumero: false, nivel: 1, confianza: 'calculando' };
  }
  const deLaParada = eta.paradas.find((p) => p.paradaId === paradaId);
  if (deLaParada && deLaParada.minutos !== null) {
    const enDesvio = eta.estado === 'EN_DESVIO';
    const aproximado = !deLaParada.confiable || enDesvio;
    const llegando = deLaParada.minutos <= 0;
    const texto = llegando ? 'llegando' : `${deLaParada.minutos} min`;
    return {
      rotulo: 'Llega a tu parada en',
      valor: aproximado && !llegando ? `≈ ${texto}` : texto,
      esNumero: true,
      nivel: aproximado ? 2 : 3,
      confianza: enDesvio
        ? 'cálculo aproximado · el bus va por un desvío'
        : aproximado
          ? 'cálculo aproximado'
          : 'cálculo confiable',
    };
  }
  return {
    rotulo: 'Todavía no podemos calcularlo',
    valor: motivo(eta, deLaParada === undefined),
    esNumero: false,
    nivel: 1,
    confianza: 'sin estimación por ahora',
  };
}

function motivo(eta: EtaRuta, paradaFueraDelCalculo: boolean): string {
  switch (eta.estado) {
    case 'SIN_DATOS':
      return eta.vehiculoId === null ? 'La ruta no tiene bus asignado' : 'El bus no está enviando su ubicación';
    case 'DETENIDO_FUERA_DE_PARADA':
      return 'El bus está detenido';
    default:
      return paradaFueraDelCalculo ? 'El bus ya pasó por aquí en esta vuelta' : 'Sin datos suficientes';
  }
}

function Barras({ nivel }: { nivel: Nivel }) {
  return (
    <span className={`tarjeta-eta__barras tarjeta-eta__barras--${nivel}`} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}
