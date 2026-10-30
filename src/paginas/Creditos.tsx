import { Link } from 'react-router-dom';
import './Creditos.css';

interface Persona {
  nombre: string;
  papel: string;
}

const EQUIPOS: { nombre: string; personas: Persona[] }[] = [
  {
    nombre: 'PMO',
    personas: [
      { nombre: 'Diego José Sierra Cárcamo', papel: 'Scrum Master y Product Owner' },
      { nombre: 'Juana Yessenia Ramírez Santiago', papel: 'Product Owner' },
      { nombre: 'José Andrés Álvarez Cardona', papel: 'Product Owner' },
      { nombre: 'Gabriel Alejandro Granados Marroquín', papel: 'Product Owner' },
    ],
  },
  {
    nombre: 'Desarrollo',
    personas: [
      { nombre: 'Walter Samuel Gómez Monroy', papel: 'Desarrollador' },
      { nombre: 'Jorge Alberto Ortiz Medina', papel: 'Desarrollador' },
      { nombre: 'Marlon Guillermo Ruano Marroquín', papel: 'Desarrollador' },
      { nombre: 'José Carlos Cabrera Sandoval', papel: 'Desarrollador' },
      { nombre: 'Carlos Roberto Reyes González', papel: 'Desarrollador' },
      { nombre: 'Diego José Méndez Choj', papel: 'Desarrollador' },
    ],
  },
  {
    nombre: 'DevOps',
    personas: [
      { nombre: 'Evan Jesús Tejada Duarte', papel: 'Infraestructura y despliegue' },
      { nombre: 'Marta Marina Bonilla Lémus', papel: 'Infraestructura y despliegue' },
      { nombre: 'Víctor Abel Vásquez Morales', papel: 'Infraestructura y despliegue' },
      { nombre: 'Joseph Isaac Asencio Ortiz', papel: 'Infraestructura y despliegue' },
    ],
  },
  {
    nombre: 'Firmware',
    personas: [{ nombre: 'Allan Gabriel Aguilar Reyes', papel: 'Equipo a bordo y rastreador GPS' }],
  },
  {
    nombre: 'Aseguramiento de la calidad (QA)',
    personas: [
      { nombre: 'Jonathan Ramiro Elías Vásquez', papel: 'Líder de QA, verificación y pruebas' },
      { nombre: 'Melvin Gustavo Cortez y Cortez', papel: 'Verificación y pruebas' },
      { nombre: 'William Ricardo Castañaza Romero', papel: 'Verificación y pruebas' },
    ],
  },
  {
    nombre: 'Logística',
    personas: [
      { nombre: 'José Alejandro Morales Carrillo', papel: 'Coordinación del evento del Seminario' },
      { nombre: 'Josué Estuardo Ola Ordóñez', papel: 'Coordinación del evento del Seminario' },
      { nombre: 'Christian Xavier Reyes Valenzuela', papel: 'Coordinación del evento del Seminario' },
      { nombre: 'Diana Paola Rivas Arana', papel: 'Coordinación del evento del Seminario' },
    ],
  },
];

/** Quienes hicieron Mi Bus Jalapa. Canvas «Créditos Mi Bus Jalapa». Se llega desde el pie. */
export function Creditos() {
  return (
    <article className="creditos">
      <header className="creditos__identidad">
        <div className="creditos__identidad-contenido">
          <div className="creditos__presentacion">
            <Link className="creditos__volver" to="/">
              Volver al mapa
            </Link>
            <h1>Créditos</h1>
            <p>
              Mi Bus Jalapa es un proyecto de Seminario de la Universidad Mariano Gálvez, Centro
              Universitario de Jalapa, hecho para la Municipalidad de Jalapa.
            </p>
          </div>
          <svg className="creditos__volcanes" viewBox="0 0 390 150" aria-hidden="true" focusable="false">
            <path d="M0 150 L70 70 L110 104 L170 38 L230 100 L270 66 L390 150 Z" fill="var(--verde-jumay-fuerte)" />
            <path d="M150 60 L170 38 L190 60 L178 56 L170 62 L162 56 Z" fill="var(--amarillo-volcan)" />
          </svg>
        </div>
      </header>

      <div className="creditos__equipos">
        {EQUIPOS.map((equipo) => (
          <section key={equipo.nombre} className="creditos__equipo">
            <h2>{equipo.nombre}</h2>
            <ul>
              {equipo.personas.map((persona) => (
                <li key={persona.nombre}>
                  <span className="creditos__nombre">{persona.nombre}</span>
                  <span className="creditos__papel">{persona.papel}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </article>
  );
}
