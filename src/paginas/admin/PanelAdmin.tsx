import { useCallback, useEffect, useState } from 'react';
import { AvisoInactividad } from '../../componentes/admin/AvisoInactividad';
import { ChipTransmitiendo } from '../../componentes/admin/ChipTransmitiendo';
import { CabeceraPanel } from '../../componentes/admin/CabeceraPanel';
import { ErrorApi } from '../../core/errores';
import { useAuthAdmin } from '../../core/panelAdmin/AuthAdminContext';
import {
  consultarPanel,
  type PanelRuta,
  type PanelRutas,
  type PosicionPanel,
  type ReservaPorParada,
} from '../../core/panelAdmin/panelAdminApi';
import { useInactividad } from '../../hooks/useInactividad';
import './PanelMunicipal.css';

const REFRESCO_MS = 30_000;

const hora = new Intl.DateTimeFormat('es-GT', { hour: '2-digit', minute: '2-digit', hour12: false });

function haceCuanto(iso: string, ahoraMs: number): string {
  const minutos = Math.max(0, Math.round((ahoraMs - Date.parse(iso)) / 60_000));
  return minutos === 0 ? 'hace menos de 1 min' : `hace ${minutos} min`;
}

function totalReservasActivas(reservas: ReservaPorParada[]): number {
  return reservas.reduce((acumulado, reserva) => acumulado + reserva.activas, 0);
}

function paradasConReservas(reservas: ReservaPorParada[]): ReservaPorParada[] {
  return reservas.filter((reserva) => reserva.activas > 0);
}

/** Portada del panel municipal: rutas con transmisión y reservas (HU-79). Canvas: 2 y 3a. */
export function PanelAdmin() {
  const { sesion, renovarSesion, cerrarSesion } = useAuthAdmin();
  const [panel, setPanel] = useState<PanelRutas | null>(null);
  const [consultadoEn, setConsultadoEn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const alCerrarPorInactividad = useCallback(() => cerrarSesion('inactividad'), [cerrarSesion]);
  const { segundosRestantes, seguir } = useInactividad({
    expiraEnMs: sesion?.expiraEnMs ?? 0,
    alRenovar: () => void renovarSesion(),
    alCerrar: alCerrarPorInactividad,
  });

  const token = sesion?.token;
  useEffect(() => {
    if (!token) return;
    const control = new AbortController();
    const cargar = async () => {
      try {
        setPanel(await consultarPanel(token, control.signal));
        setConsultadoEn(new Date().toISOString());
        setError(null);
      } catch (causa) {
        if (control.signal.aborted) return;
        if (causa instanceof ErrorApi && (causa.status === 401 || causa.status === 403)) {
          cerrarSesion('caducada');
          return;
        }
        setError(causa instanceof ErrorApi ? causa.mensajeParaUsuario() : 'No pudimos cargar el estado del servicio.');
      }
    };
    void cargar();
    const intervalo = window.setInterval(() => void cargar(), REFRESCO_MS);
    return () => {
      control.abort();
      window.clearInterval(intervalo);
    };
  }, [token, cerrarSesion]);

  const rutas = panel?.rutas ?? [];
  const transmitiendo = rutas.filter((ruta) => ruta.transmitiendo).length;
  const sinTransmitir = rutas.filter((ruta) => !ruta.transmitiendo).length;
  const ahoraMs = consultadoEn ? Date.parse(consultadoEn) : Date.now();

  return (
    <div className="panel-escritorio">
      <CabeceraPanel />

      <main className="panel-principal">
        <div className="panel-principal__encabezado">
          <div>
            <h1 className="panel-h1">Estado del servicio</h1>
            <p className="panel-apoyo">Todas las rutas y sus buses. Se actualiza cada 30 segundos.</p>
          </div>
          {consultadoEn && (
            <p className="panel-ayuda tabular">Actualizado a las {hora.format(new Date(consultadoEn))}</p>
          )}
        </div>

        {error && (
          <p className="panel-aviso panel-aviso--informativo" role="alert">
            <span>{error}</span>
          </p>
        )}

        <div className="panel-resumen">
          <Cifra etiqueta="Rutas activas" valor={panel ? String(rutas.length) : '—'} />
          <Cifra etiqueta="Buses en ruta" valor={panel ? String(transmitiendo) : '—'} />
          <Cifra etiqueta="Buses sin datos recientes" valor={panel ? String(sinTransmitir) : '—'} />
        </div>

        <div className="panel-tabla-marco">
          <table className="panel-tabla">
            <thead>
              <tr>
                <th scope="col">Ruta</th>
                <th scope="col">Bus asignado</th>
                <th scope="col">Estado del bus</th>
                <th scope="col" className="panel-tabla__num">Última posición</th>
                <th scope="col">Reservas activas</th>
              </tr>
            </thead>
            <tbody>
              {rutas.map((ruta) => (
                <FilaRuta key={ruta.rutaId} ruta={ruta} ahoraMs={ahoraMs} />
              ))}
              {panel && rutas.length === 0 && (
                <tr>
                  <td colSpan={5} className="panel-tabla__vacia">
                    No hay rutas activas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="panel-ayuda">«Sin transmitir»: el bus no envía posición, o la ruta no tiene vehículo asignado.</p>
      </main>

      {segundosRestantes !== null && (
        <AvisoInactividad segundos={segundosRestantes} onSeguir={seguir} onCerrarSesion={() => cerrarSesion()} />
      )}
    </div>
  );
}

function Cifra({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="panel-cifra">
      <span className="panel-cifra__etiqueta">{etiqueta}</span>
      <span className="panel-cifra__valor tabular">{valor}</span>
    </div>
  );
}

function FilaRuta({ ruta, ahoraMs }: { ruta: PanelRuta; ahoraMs: number }) {
  return (
    <tr>
      <td className="panel-tabla__ruta">{ruta.nombre}</td>
      <td>
        <CeldaVehiculo vehiculoId={ruta.vehiculoId} />
      </td>
      <td>
        <ChipTransmitiendo transmitiendo={ruta.transmitiendo} />
      </td>
      <td className="panel-tabla__num tabular">
        <CeldaPosicion posicion={ruta.posicion} atrasada={!ruta.transmitiendo} ahoraMs={ahoraMs} />
      </td>
      <td>
        <CeldaReservas reservas={ruta.reservasPorParada} />
      </td>
    </tr>
  );
}

function CeldaVehiculo({ vehiculoId }: { vehiculoId: number | null }) {
  if (vehiculoId == null) {
    return <span className="panel-tabla__secundario">Sin vehículo asignado</span>;
  }
  return <span className="panel-tabla__principal">{vehiculoId}</span>;
}

function CeldaPosicion({
  posicion,
  atrasada,
  ahoraMs,
}: {
  posicion: PosicionPanel | null;
  atrasada: boolean;
  ahoraMs: number;
}) {
  if (!posicion) {
    return <span className="panel-tabla__secundario">Sin posiciones</span>;
  }
  return (
    <>
      <span className="panel-tabla__principal">{hora.format(new Date(posicion.registradaEn))}</span>
      <span className={atrasada ? 'panel-tabla__secundario panel-tabla__atrasada' : 'panel-tabla__secundario'}>
        {haceCuanto(posicion.registradaEn, ahoraMs)}
      </span>
    </>
  );
}

function CeldaReservas({ reservas }: { reservas: ReservaPorParada[] }) {
  const total = totalReservasActivas(reservas);
  const detalle = paradasConReservas(reservas);
  return (
    <>
      <span className="panel-tabla__principal">{total}</span>
      {detalle.length === 0 ? (
        <span className="panel-tabla__secundario">Sin reservas</span>
      ) : (
        detalle.map((reserva) => (
          <span key={reserva.paradaId} className="panel-tabla__secundario">
            Parada {reserva.paradaId}: {reserva.activas}
          </span>
        ))
      )}
    </>
  );
}
