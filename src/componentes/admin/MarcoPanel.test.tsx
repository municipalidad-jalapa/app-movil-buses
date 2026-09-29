// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthAdminContext, type EstadoAuthAdmin } from '../../core/panelAdmin/AuthAdminContext';
import { MarcoPanel } from './MarcoPanel';

vi.mock('../../hooks/useInactividad', () => ({ useInactividad: () => ({ segundosRestantes: null, seguir: vi.fn() }) }));

const cerrarSesion = vi.fn();
const AUTH = {
  estado: 'dentro',
  sesion: { token: 't', correo: 'admin@jalapa.gob.gt', expiraEnMs: Date.now() + 3_600_000 },
  cerrarSesion,
  renovarSesion: vi.fn(),
} as unknown as EstadoAuthAdmin;

function abrir(ruta = '/admin/rutas') {
  render(
    <AuthAdminContext.Provider value={AUTH}>
      <MemoryRouter initialEntries={[ruta]}>
        <MarcoPanel>
          <p>Contenido</p>
        </MarcoPanel>
      </MemoryRouter>
    </AuthAdminContext.Provider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Menú del panel municipal (responsive)', () => {
  it('en la cabecera cada sección aparece una sola vez, con «Más» para las secundarias', () => {
    abrir();
    const cabecera = screen.getByRole('navigation', { name: 'Secciones del panel' });
    for (const nombre of ['Estado del servicio', 'Opiniones', 'Rutas', 'Vehículos', 'Pasajeros subidos', 'Exportar datos']) {
      expect(within(cabecera).getAllByRole('link', { name: nombre })).toHaveLength(1);
    }
    const mas = within(cabecera).getByRole('button', { name: 'Más' });
    expect(mas.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(mas);
    expect(mas.getAttribute('aria-expanded')).toBe('true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mas.getAttribute('aria-expanded')).toBe('false');
  });

  it('en el teléfono la hamburguesa abre el cajón con la sección actual marcada', () => {
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir el menú' }));

    const cajon = screen.getByRole('dialog', { name: 'Menú del panel municipal' });
    expect(within(cajon).getByRole('link', { name: 'Rutas' }).getAttribute('aria-current')).toBe('page');
    expect(within(cajon).getByText('admin@jalapa.gob.gt')).toBeTruthy();

    // Elegir una sección cierra el cajón.
    fireEvent.click(within(cajon).getByRole('link', { name: 'Vehículos' }));
    expect(screen.queryByRole('dialog', { name: 'Menú del panel municipal' })).toBeNull();
  });

  it('el cajón se cierra con Escape y desde él se cierra sesión', () => {
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir el menú' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Abrir el menú' }));
    const cajon = screen.getByRole('dialog', { name: 'Menú del panel municipal' });
    fireEvent.click(within(cajon).getByRole('button', { name: 'Cerrar sesión' }));
    expect(cerrarSesion).toHaveBeenCalled();
  });

  it('la hamburguesa aparece justo donde las secciones dejan la cabecera (sin hueco ni choque)', () => {
    // jsdom no calcula el layout: se revisan los cortes del CSS. A 768 px la
    // cabecera no alcanza para las secciones y «Cerrar sesión» (informe de QA).
    const corte = (ruta: string, selector: string) => {
      const css = readFileSync(ruta, 'utf8');
      const bloques = [...css.matchAll(/@media \(max-width: (\d+)px\) \{([\s\S]*?)\n\}/g)];
      return bloques.filter(([, , cuerpo]) => cuerpo.includes(selector)).map(([, px]) => Number(px));
    };
    const seOcultanSecciones = corte('src/componentes/admin/NavegacionPanel.css', '.panel-navegacion {');
    const apareceHamburguesa = corte('src/paginas/admin/PanelMunicipal.css', '.panel-cabecera__menu {');
    expect(seOcultanSecciones).toEqual([1023]);
    expect(apareceHamburguesa).toEqual([1023]);
  });
});
