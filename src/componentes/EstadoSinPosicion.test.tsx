// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

afterEach(cleanup);
import { EstadoSinPosicion } from './EstadoSinPosicion';

describe('EstadoSinPosicion', () => {
  it('explica que aun no hay datos, sin tono de error', () => {
    const { container } = render(<EstadoSinPosicion />);

    expect(screen.getByRole('status').textContent).toContain('Aún no hay datos del bus');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
