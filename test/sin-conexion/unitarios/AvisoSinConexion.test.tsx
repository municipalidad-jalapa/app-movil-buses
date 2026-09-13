// @vitest-environment jsdom
//
// Historia "zona sin señal" (artboard 09, DESIGN.md §7 `sin-conexion`).
// Prueba src/componentes/AvisoSinConexion.tsx: pantalla de primera clase, no
// una pantalla de error (sin iconos de fallo ni disculpas).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { AvisoSinConexion } from '../../../src/componentes/AvisoSinConexion';
import { formatearMomento } from '../../../src/componentes/HoraUltimoDato';

afterEach(cleanup);

describe('AvisoSinConexion', () => {
  it('muestra "Sin internet" como titulo', () => {
    render(<AvisoSinConexion recibidoEn={null} onReintentar={() => {}} />);
    expect(screen.getByRole('heading', { name: 'Sin internet' })).not.toBeNull();
  });

  it('sin ningun dato previo, lo dice sin sonar a error', () => {
    render(<AvisoSinConexion recibidoEn={null} onReintentar={() => {}} />);
    expect(screen.getByText('Todavía no recibimos datos del bus.')).not.toBeNull();
  });

  it('con un dato previo, muestra la hora de lo ultimo que se supo', () => {
    const recibidoEn = new Date();
    render(<AvisoSinConexion recibidoEn={recibidoEn} onReintentar={() => {}} />);
    const hora = formatearMomento(recibidoEn);
    expect(screen.getByText(new RegExp(`Esto es lo último que sabemos, de las ${hora}`))).not.toBeNull();
  });

  it('avisa que los numeros pueden haber cambiado y que se van a actualizar solos', () => {
    render(<AvisoSinConexion recibidoEn={null} onReintentar={() => {}} />);
    expect(
      screen.getByText(/Los números pueden haber cambiado\. Cuando vuelva la señal se actualizan solos\./),
    ).not.toBeNull();
  });

  it('el boton "Intentar de nuevo" dispara onReintentar', () => {
    const onReintentar = vi.fn();
    render(<AvisoSinConexion recibidoEn={null} onReintentar={onReintentar} />);

    fireEvent.click(screen.getByRole('button', { name: 'Intentar de nuevo' }));
    expect(onReintentar).toHaveBeenCalledTimes(1);
  });

  it('es una pantalla de primera clase, no un error: nada de role="alert"', () => {
    render(<AvisoSinConexion recibidoEn={null} onReintentar={() => {}} />);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('status')).not.toBeNull();
  });
});
