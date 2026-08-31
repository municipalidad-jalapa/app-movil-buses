// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ContadorDemanda } from './ContadorDemanda';
import { ErrorApi } from '../core/errores';

afterEach(cleanup);

describe('ContadorDemanda', () => {
  it('muestra el número de personas esperando en una tarjeta legible', () => {
    render(<ContadorDemanda totalEsperando={7} umbralSalida={10} />);

    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('personas esperando')).toBeTruthy();
    expect(screen.getByText(/Faltan 3 personas/)).toBeTruthy();
  });

  describe('variante: cargando', () => {
    it('marca la región como ocupada y no muestra un número', () => {
      const { container } = render(<ContadorDemanda cargando />);

      const seccion = container.querySelector('section');
      expect(seccion?.getAttribute('aria-busy')).toBe('true');
      expect(screen.getByText('Actualizando el conteo…')).toBeTruthy();
      expect(container.querySelector('.contador-demanda__valor')).toBeNull();
    });

    it('el esqueleto es decorativo y se oculta a lectores de pantalla', () => {
      const { container } = render(<ContadorDemanda cargando />);

      const esqueleto = container.querySelector('.contador-demanda__esqueleto');
      expect(esqueleto?.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('variante: error con reintento', () => {
    it('usa el traductor del cliente de API para el texto (sin código HTTP)', () => {
      render(
        <ContadorDemanda
          error={new ErrorApi(0, 'Failed to fetch')}
          onReintentar={() => undefined}
        />,
      );

      // Mensaje del traductor para fallo de red, no el message crudo ni "0".
      expect(
        screen.getByText('No pudimos conectar. Revisa tu conexion e intenta de nuevo.'),
      ).toBeTruthy();
      expect(screen.queryByText(/Failed to fetch/)).toBeNull();
    });

    it('traduce un 500 a un mensaje sin jerga', () => {
      render(<ContadorDemanda error={new ErrorApi(500, 'Internal Server Error')} />);

      expect(
        screen.getByText('El servicio no esta disponible en este momento. Intenta mas tarde.'),
      ).toBeTruthy();
    });

    it('el botón Reintentar dispara onReintentar', () => {
      const alReintentar = vi.fn();
      render(
        <ContadorDemanda error={new ErrorApi(503, 'x')} onReintentar={alReintentar} />,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
      expect(alReintentar).toHaveBeenCalledTimes(1);
    });

    it('sin onReintentar no se muestra botón', () => {
      render(<ContadorDemanda error={new ErrorApi(503, 'x')} />);
      expect(screen.queryByRole('button')).toBeNull();
    });

    it('el aviso de error tiene rol de alerta y un icono redundante al color', () => {
      const { container } = render(
        <ContadorDemanda error={new ErrorApi(500, 'x')} onReintentar={() => undefined} />,
      );

      expect(screen.getByRole('alert')).toBeTruthy();
      expect(container.querySelector('.aviso-error__icono')).toBeTruthy();
    });
  });

  describe('variante: umbral alcanzado', () => {
    it('cuando hay 10 o más personas anuncia que el bus ya puede salir', () => {
      const { container } = render(
        <ContadorDemanda totalEsperando={10} umbralSalida={10} faltanParaSalir={0} />,
      );

      expect(screen.getByText('Ya se puede ir.')).toBeTruthy();
      expect(
        screen.getByText('Hay suficientes personas para que el bus salga.'),
      ).toBeTruthy();
      // No se comunica solo por color: hay modificador de estado + icono + texto.
      expect(container.querySelector('.contador-demanda--alcanzado')).toBeTruthy();
      expect(container.querySelector('.contador-demanda__mensaje .contador-demanda__icono')).toBeTruthy();
      expect(screen.getByText('Listo')).toBeTruthy();
    });

    it('por debajo del umbral muestra cuántas personas faltan, en singular y plural', () => {
      const { rerender } = render(
        <ContadorDemanda totalEsperando={9} umbralSalida={10} faltanParaSalir={1} />,
      );
      expect(screen.getByText('Falta 1 persona')).toBeTruthy();

      rerender(
        <ContadorDemanda totalEsperando={6} umbralSalida={10} faltanParaSalir={4} />,
      );
      expect(screen.getByText('Faltan 4 personas')).toBeTruthy();
      expect(document.querySelector('.contador-demanda--alcanzado')).toBeNull();
    });

    it('no dice la palabra "umbral" al usuario (DESIGN.md §10)', () => {
      const { container } = render(
        <ContadorDemanda totalEsperando={4} umbralSalida={10} faltanParaSalir={6} />,
      );
      expect(container.textContent).not.toMatch(/umbral/i);
    });

    it('la barra de progreso expone su valor y su máximo', () => {
      render(<ContadorDemanda totalEsperando={4} umbralSalida={10} faltanParaSalir={6} />);

      const barra = screen.getByRole('progressbar');
      expect(barra.getAttribute('aria-valuenow')).toBe('4');
      expect(barra.getAttribute('aria-valuemax')).toBe('10');
    });
  });
});
