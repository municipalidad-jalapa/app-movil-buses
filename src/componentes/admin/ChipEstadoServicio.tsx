import type { ComponentType } from 'react';
import type { EstadoDelServicio } from '../../core/panelAdmin/panelAdminApi';
import { IconoEnRuta, IconoSinBus, IconoSinDatos } from './IconosPanel';

const ESTADOS: Record<EstadoDelServicio, { texto: string; clase: string; Icono: ComponentType }> = {
  EN_RUTA: { texto: 'En ruta', clase: 'panel-chip--en-ruta', Icono: IconoEnRuta },
  SIN_DATOS_RECIENTES: { texto: 'Sin datos recientes', clase: 'panel-chip--sin-datos', Icono: IconoSinDatos },
  SIN_BUS: { texto: 'Sin bus asignado', clase: 'panel-chip--sin-bus', Icono: IconoSinBus },
};

/** Estado del bus: color + icono + texto, nunca solo color (DESIGN.md §3). */
export function ChipEstadoServicio({ estado }: { estado: EstadoDelServicio }) {
  const { texto, clase, Icono } = ESTADOS[estado];
  return (
    <span className={`panel-chip ${clase}`}>
      <Icono />
      {texto}
    </span>
  );
}
