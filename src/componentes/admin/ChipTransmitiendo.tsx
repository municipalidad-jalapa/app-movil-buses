import type { ComponentType } from 'react';
import { IconoEnRuta, IconoSinDatos } from './IconosPanel';

const ESTADOS: Record<'si' | 'no', { texto: string; clase: string; Icono: ComponentType }> = {
  si: { texto: 'Transmitiendo', clase: 'panel-chip--en-ruta', Icono: IconoEnRuta },
  no: { texto: 'Sin transmitir', clase: 'panel-chip--sin-datos', Icono: IconoSinDatos },
};

/** Transmisión del bus: color + icono + texto. Sin bus asignado cuenta como sin transmitir. */
export function ChipTransmitiendo({ transmitiendo }: { transmitiendo: boolean }) {
  const { texto, clase, Icono } = ESTADOS[transmitiendo ? 'si' : 'no'];
  return (
    <span className={`panel-chip ${clase}`}>
      <Icono />
      {texto}
    </span>
  );
}
