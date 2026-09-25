/**
 * Graficos del panel municipal, tomados del canvas «EcoRuta · Panel municipal»
 * (SCRUM-173). Decorativos: aria-hidden, el significado va siempre en texto.
 */

interface PropsIcono {
  tamano?: number;
}

export function SimboloEcoRuta({ tamano = 30, conPuntos = false }: PropsIcono & { conPuntos?: boolean }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <circle cx="32" cy="32" r="31" fill="#FBF7F0" />
      <path
        d="M14 48c0-16 10-28 24-28 7 0 12 5 12 12s-5 11-11 11-10-4-10-10 4-8 8-8"
        fill="none"
        stroke="#10402A"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {conPuntos && (
        <>
          <circle cx="14" cy="48" r="6" fill="#8C2B22" />
          <circle cx="37" cy="43" r="5" fill="#F2B705" />
        </>
      )}
    </svg>
  );
}

function Trazo({ tamano = 20, grosor = 2.6, children }: PropsIcono & { grosor?: number; children: React.ReactNode }) {
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

export const IconoAlerta = (p: PropsIcono) => (
  <Trazo {...p}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M12 7v6M12 16.5v.5" />
  </Trazo>
);

export const IconoReloj = (p: PropsIcono) => (
  <Trazo {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Trazo>
);

export const IconoCandado = (p: PropsIcono) => (
  <Trazo grosor={2.4} {...p}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
    <path d="M8 10.5V7.5a4 4 0 018 0v3" />
  </Trazo>
);

export const IconoSalir = (p: PropsIcono) => (
  <Trazo grosor={2.4} tamano={18} {...p}>
    <path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 16l-4-4 4-4M6 12h10" />
  </Trazo>
);

export const IconoEnRuta = (p: PropsIcono) => (
  <Trazo grosor={2.8} tamano={16} {...p}>
    <path d="M4 12l5 5L20 6" />
  </Trazo>
);

export const IconoSinDatos = (p: PropsIcono) => (
  <Trazo grosor={2.8} tamano={16} {...p}>
    <path d="M3 3l18 18M5 12a12 12 0 0114 0" />
  </Trazo>
);

export const IconoSinBus = (p: PropsIcono) => (
  <Trazo grosor={2.8} tamano={16} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12h8" />
  </Trazo>
);

/** Patron de volutas de la ceramica de Jalapa. Solo en superficies de identidad. */
export function PatronVoluta() {
  return (
    <svg className="panel-identidad__voluta" width="100%" height="100%" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="panel-voluta" width="76" height="76" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="#FBF7F0" strokeWidth="2.5" strokeLinecap="round">
            <path d="M8 66c0-30 22-52 48-52" />
            <path d="M56 14c10 0 18 8 18 18s-8 17-17 17-16-7-16-16 6-14 14-14" />
            <path d="M22 26c7-5 14-2 16 5" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#panel-voluta)" />
    </svg>
  );
}

export function Volcanes() {
  return (
    <svg width="210" height="58" viewBox="0 0 210 58" aria-hidden="true" focusable="false">
      <path d="M0 58 L46 12 L74 40 L102 16 L132 46 L160 18 L210 58 Z" fill="#F2B705" opacity=".92" />
      <path d="M0 58 L210 58" stroke="#F2B705" strokeWidth="3" />
    </svg>
  );
}
