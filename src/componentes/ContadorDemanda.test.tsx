import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ContadorDemanda } from './ContadorDemanda';

describe('ContadorDemanda', () => {
  it('muestra el número de personas esperando en una tarjeta legible', () => {
    const html = renderToStaticMarkup(
      <ContadorDemanda totalEsperando={7} umbralSalida={10} />,
    );

    expect(html).toContain('Tu parada');
    expect(html).toContain('7');
    expect(html).toContain('personas esperando');
  });

  it('muestra un estado de error con acción de reintento', () => {
    const html = renderToStaticMarkup(
      <ContadorDemanda error="Sin datos nuevos" onReintentar={() => undefined} />,
    );

    expect(html).toContain('Sin datos nuevos');
    expect(html).toContain('Reintentar');
  });
});
