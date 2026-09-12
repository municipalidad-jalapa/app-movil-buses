// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { HojaReserva, type FaseHoja } from './HojaReserva';

afterEach(cleanup);

function pintar(fase: FaseHoja, extra: Partial<Parameters<typeof HojaReserva>[0]> = {}) {
  const manejadores = {
    onUsarCercana: vi.fn(),
    onConfirmar: vi.fn(),
    onElegirOtra: vi.fn(),
    onCancelar: vi.fn(),
  };
  render(<HojaReserva fase={fase} nombreParada="1a Calle - Mercado" {...manejadores} {...extra} />);
  return manejadores;
}

describe('HojaReserva (MapaOSM, R1–R3)', () => {
  it('R1: sin parada pregunta donde va a esperar y ofrece la mas cercana', () => {
    const { onUsarCercana } = pintar('vacia');
    expect(screen.getByText('¿En qué parada vas a esperar?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Usar la parada más cercana' }));
    expect(onUsarCercana).toHaveBeenCalled();
  });

  it('buscando: explica por que se pide la ubicacion y no deja confirmar', () => {
    pintar('buscando');
    expect(screen.getByText('Buscando dónde estás…')).toBeTruthy();
    expect(screen.getByText(/Si no da permiso/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Estoy esperando aquí' })).toBeNull();
  });

  it('R2: muestra la parada, la distancia y cuantos esperan', () => {
    const { onConfirmar, onElegirOtra } = pintar('elegida', { esperando: 4, distancia: 'a 3 min a pie · 240 m' });
    expect(screen.getByText('Parada elegida')).toBeTruthy();
    expect(screen.getByText('1a Calle - Mercado')).toBeTruthy();
    expect(screen.getByText('a 3 min a pie · 240 m')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Estoy esperando aquí' }));
    fireEvent.click(screen.getByRole('button', { name: 'Elegir otra parada' }));
    expect(onConfirmar).toHaveBeenCalled();
    expect(onElegirOtra).toHaveBeenCalled();
  });

  it('R2: mientras se envia, el boton no se puede tocar dos veces', () => {
    pintar('elegida', { enviando: true });
    expect((screen.getByRole('button', { name: 'Avisando…' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('R2: no inventa el tiempo de llegada (SCRUM-167 es del sprint 6)', () => {
    pintar('elegida');
    expect(screen.queryByText(/Llega a esta parada/)).toBeNull();
    expect(screen.queryByText(/cálculo aproximado/)).toBeNull();
  });

  it('R3: confirma, muestra los minutos de aviso y deja soltar la reserva', () => {
    const { onCancelar } = pintar('confirmada', { esperando: 5, minutosDeAviso: 4 });
    expect(screen.getByText('Ya avisamos que estás esperando')).toBeTruthy();
    expect(screen.getByText('MIN DE AVISO')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Ya no voy a esperar' }));
    expect(onCancelar).toHaveBeenCalled();
  });

  it('un aviso se anuncia al lector de pantalla', () => {
    pintar('elegida', { aviso: 'Debes acercarte más a la parada.' });
    expect(screen.getByRole('alert').textContent).toBe('Debes acercarte más a la parada.');
  });
});
