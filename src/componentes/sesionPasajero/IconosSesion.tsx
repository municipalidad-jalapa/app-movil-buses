import type { ReactNode } from 'react';

/** Iconos del canvas «EcoRuta · Sesión del pasajero» (SCRUM-26, bloque B). Decorativos. */
function Trazo({ tamano = 22, grosor = 2.2, children }: { tamano?: number; grosor?: number; children: ReactNode }) {
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

export const IconoPersona = (p: P) => (
  <Trazo {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
  </Trazo>
);

export const IconoCandado = (p: P) => (
  <Trazo grosor={2} {...p}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Trazo>
);

export const IconoSalirCuenta = (p: P) => (
  <Trazo {...p}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" />
  </Trazo>
);

export const IconoAlertaSesion = (p: P) => (
  <Trazo grosor={2.4} {...p}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M12 7v6M12 16.5v.5" />
  </Trazo>
);

export const IconoVinculado = (p: P) => (
  <Trazo grosor={2.6} {...p}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M7.5 12.5l3 3 6-6.5" />
  </Trazo>
);

export function IconoEspera({ tamano = 22 }: P) {
  return (
    <svg className="sesion-girando" width={tamano} height={tamano} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" fill="none" stroke="var(--verde-jumay-suave)" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="var(--verde-jumay)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** La «G» de Google en sus cuatro colores. */
export function LogoGoogle({ tamano = 22 }: P) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
