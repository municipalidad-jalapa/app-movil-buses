import type { ReactNode } from 'react';

/**
 * Iconos del canvas «EcoRuta · Opiniones» (SCRUM-26). Decorativos: el
 * significado va siempre en el texto que los acompaña.
 */
function Icono({ tamano = 20, grosor = 2, children }: { tamano?: number; grosor?: number; children: ReactNode }) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={grosor}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

interface P {
  tamano?: number;
}

export const IconoOpinar = (p: P) => (
  <Icono {...p}>
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
  </Icono>
);

export const IconoQueja = (p: P) => (
  <Icono {...p}>
    <path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <path d="M12 9v4M12 17h.01" />
  </Icono>
);

export const IconoEstrella = ({ tamano, llena = false }: P & { llena?: boolean }) => (
  <svg
    width={tamano ?? 20}
    height={tamano ?? 20}
    viewBox="0 0 24 24"
    fill={llena ? 'var(--amarillo-volcan)' : 'none'}
    stroke={llena ? 'var(--amarillo-volcan-tinta)' : 'currentColor'}
    strokeWidth={1.6}
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
  </svg>
);

export const IconoCheck = (p: P) => (
  <Icono grosor={2.5} {...p}>
    <path d="M5 12l5 5L20 7" />
  </Icono>
);

export const IconoError = (p: P) => (
  <Icono {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5M12 16.5h.01" />
  </Icono>
);

export const IconoReloj = (p: P) => (
  <Icono {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icono>
);

export const IconoCerrar = (p: P) => (
  <Icono {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icono>
);

export const IconoBus = (p: P) => (
  <Icono {...p}>
    <path d="M6 17V6a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v11M6 12h12M8 20v-3M16 20v-3" />
  </Icono>
);

export const IconoReintentar = (p: P) => (
  <Icono {...p}>
    <path d="M20 11a8 8 0 1 0-2.3 5.7" />
    <path d="M20 4v7h-7" />
  </Icono>
);

export const IconoGirando = (p: P) => (
  <span className="opinion-girando">
    <Icono grosor={2.5} {...p}>
      <path d="M12 3a9 9 0 1 1-9 9" />
    </Icono>
  </span>
);

export const IconoIzquierda = (p: P) => (
  <Icono {...p}>
    <path d="M15 6l-6 6 6 6" />
  </Icono>
);

export const IconoDerecha = (p: P) => (
  <Icono {...p}>
    <path d="M9 6l6 6-6 6" />
  </Icono>
);

export const IconoVacio = (p: P) => (
  <Icono {...p}>
    <path d="M4 13l3-8h10l3 8v6H4z" />
    <path d="M4 13h5l1 2h4l1-2h5" />
  </Icono>
);
