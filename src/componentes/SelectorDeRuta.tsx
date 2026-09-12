import { estaVigente } from '../estado/ReservaProvider';
import { nombreCortoDeRuta } from '../estado/RutaElegidaProvider';
import { useReserva } from '../hooks/useReserva';
import { useRutaElegida } from '../hooks/useRutaElegida';
import './SelectorDeRuta.css';

/**
 * Selector de la ruta, en la cabecera.
 *
 * <p>Va donde el canvas pone su pastilla de estado (MapaOSM): arriba a la
 * derecha, en amarillo, con el mismo tamano. El canvas no dibuja un selector de
 * rutas, asi que la forma sale de esa pastilla y queda para revision de diseno.
 *
 * <p>Es un {@code select} nativo a proposito: en el telefono abre la lista del
 * sistema, grande y accesible, sin escribir un menu propio.
 *
 * <p>Con una sola ruta no se muestra: no hay nada que elegir. Con una reserva
 * vigente queda fijo en la ruta de esa reserva, para que la hoja, el bus y los
 * avisos no se muden a otra ruta mientras el pasajero espera.
 */
export function SelectorDeRuta() {
  const { rutas, rutaActiva, elegirRuta } = useRutaElegida();
  const { reserva } = useReserva();

  if (rutas.length < 2 || !rutaActiva) {
    return null;
  }

  const fija = reserva !== null && estaVigente(reserva);

  return (
    <label className="selector-ruta" title={fija ? 'Tenés un aviso activo en esta ruta' : undefined}>
      <span className="selector-ruta__rotulo">Ruta</span>
      <select
        className="selector-ruta__lista"
        value={rutaActiva.id}
        disabled={fija}
        onChange={(evento) => elegirRuta(Number(evento.target.value))}
      >
        {rutas.map((ruta) => (
          <option key={ruta.id} value={ruta.id}>
            {nombreCortoDeRuta(ruta.nombre)}
          </option>
        ))}
      </select>
    </label>
  );
}
