import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { AvisoInactividad } from '../../componentes/admin/AvisoInactividad';
import { CabeceraPanel } from '../../componentes/admin/CabeceraPanel';
import { ErrorApi } from '../../core/errores';
import { useAuthAdmin } from '../../core/panelAdmin/AuthAdminContext';
import {
  diasDelRango,
  exportarDatosDelServicio,
  MAXIMO_DIAS_EXPORTACION,
} from '../../core/panelAdmin/panelAdminApi';
import { useInactividad } from '../../hooks/useInactividad';
import './PanelMunicipal.css';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Hoy en Guatemala (UTC-6), en `AAAA-MM-DD`: el backend cuenta los dias asi. */
export function hoyEnGuatemala(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala' }).format(new Date());
}

/** Mensaje si el rango no se puede pedir; `null` si esta bien. Refleja las reglas del backend. */
export function validarRango(desde: string, hasta: string): string | null {
  if (!FECHA.test(desde) || !FECHA.test(hasta)) return 'Elige la fecha de inicio y la fecha final.';
  if (hasta < desde) return 'La fecha final no puede ser anterior a la fecha de inicio.';
  if (diasDelRango(desde, hasta) > MAXIMO_DIAS_EXPORTACION) {
    return `El rango puede abarcar como máximo ${MAXIMO_DIAS_EXPORTACION} días.`;
  }
  return null;
}

/** Guarda el archivo con el navegador, sin enlaces con el token. */
function guardarArchivo(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** HU-86: descarga de demanda y recorridos en hoja de calculo, por rango de fechas. */
export function ExportarDatos() {
  const { sesion, renovarSesion, cerrarSesion } = useAuthAdmin();
  const hoy = hoyEnGuatemala();
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState(hoy);
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<string | null>(null);
  const control = useRef<AbortController | null>(null);

  useEffect(() => () => control.current?.abort(), []);

  const alCerrarPorInactividad = useCallback(() => cerrarSesion('inactividad'), [cerrarSesion]);
  const { segundosRestantes, seguir } = useInactividad({
    expiraEnMs: sesion?.expiraEnMs ?? 0,
    alRenovar: () => void renovarSesion(),
    alCerrar: alCerrarPorInactividad,
  });

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    setListo(null);
    const problema = validarRango(desde, hasta);
    if (problema) {
      setError(problema);
      return;
    }
    if (!sesion) return;
    setError(null);
    setDescargando(true);
    const actual = new AbortController();
    control.current = actual;
    try {
      const archivo = await exportarDatosDelServicio(sesion.token, desde, hasta, actual.signal);
      guardarArchivo(archivo.blob, archivo.nombre);
      setListo(archivo.nombre);
    } catch (causa) {
      if (actual.signal.aborted) return;
      if (causa instanceof ErrorApi && (causa.status === 401 || causa.status === 403)) {
        cerrarSesion('caducada');
        return;
      }
      setError(causa instanceof ErrorApi ? causa.mensajeParaUsuario() : 'No pudimos generar la exportación.');
    } finally {
      setDescargando(false);
    }
  }

  return (
    <div className="panel-escritorio">
      <CabeceraPanel />

      <main className="panel-principal">
        <div>
          <h1 className="panel-h1">Exportar datos del servicio</h1>
          <p className="panel-apoyo">Descarga la demanda y los recorridos en una hoja de cálculo para tus informes.</p>
        </div>

        <form className="panel-exportar" onSubmit={alEnviar} noValidate>
          <div className="panel-exportar__fechas">
            <label className="panel-campo">
              Desde
              <input type="date" value={desde} max={hasta || hoy} onChange={(e) => setDesde(e.target.value)} required />
            </label>
            <label className="panel-campo">
              Hasta
              <input type="date" value={hasta} max={hoy} onChange={(e) => setHasta(e.target.value)} required />
            </label>
          </div>
          <p className="panel-ayuda">
            Ambas fechas se incluyen, contadas en hora de Guatemala. Máximo {MAXIMO_DIAS_EXPORTACION} días.
          </p>

          {error && (
            <p className="panel-aviso panel-aviso--error" role="alert">
              <span>{error}</span>
            </p>
          )}
          {listo && (
            <p className="panel-aviso panel-aviso--exito" role="status">
              <span>Listo: se descargó {listo}.</span>
            </p>
          )}

          <button type="submit" className="panel-boton panel-boton--primario" disabled={descargando}>
            {descargando ? 'Generando archivo…' : 'Descargar hoja de cálculo'}
          </button>
        </form>

        <div className="panel-exportar__incluye">
          <h2 className="panel-h2">Qué incluye el archivo</h2>
          <ul className="panel-exportar__contenido">
            <li>Resumen: periodo, totales y cómo leer el archivo.</li>
            <li>Demanda: por día, ruta y parada (reservas creadas, abordaron, canceladas, expiradas y vigentes).</li>
            <li>Recorridos: por día y bus (lecturas GPS, distancia estimada, velocidad promedio y paradas atendidas).</li>
          </ul>
          <p className="panel-ayuda">
            Solo contiene datos agregados: no incluye información que identifique a ningún pasajero. La distancia es una
            estimación a partir del GPS, no un odómetro.
          </p>
        </div>
      </main>

      {segundosRestantes !== null && (
        <AvisoInactividad segundos={segundosRestantes} onSeguir={seguir} onCerrarSesion={() => cerrarSesion()} />
      )}
    </div>
  );
}
