import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Raiz del proyecto (test/SCRUM-11-HU-87/ -> ../..). */
export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export function ruta(...partes: string[]): string {
  return path.join(RAIZ, ...partes);
}

export function existe(...partes: string[]): boolean {
  return existsSync(ruta(...partes));
}

export function leer(...partes: string[]): string {
  return readFileSync(ruta(...partes), 'utf8');
}

export function leerBinario(...partes: string[]): Buffer {
  return readFileSync(ruta(...partes));
}

/** Dimensiones de un PNG leidas de su cabecera IHDR (sin dependencias). */
export function dimensionesPng(archivo: Buffer): { ancho: number; alto: number } | null {
  const FIRMA = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (archivo.length < 24 || !archivo.subarray(0, 8).equals(FIRMA)) return null;
  return { ancho: archivo.readUInt32BE(16), alto: archivo.readUInt32BE(20) };
}

function luminancia(hex: string): number {
  const limpio = hex.replace('#', '');
  const canales = [0, 2, 4].map((i) => parseInt(limpio.slice(i, i + 2), 16) / 255);
  const [r, g, b] = canales.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Relacion de contraste WCAG 2.x entre dos colores `#rrggbb`. */
export function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

/** Valor de un token `--nombre: #hex;` de src/estilos/tema.css. */
export function tokenDeTema(nombre: string): string {
  const coincidencia = leer('src', 'estilos', 'tema.css').match(
    new RegExp(`${nombre}:\\s*(#[0-9a-fA-F]{6})`),
  );
  if (!coincidencia) throw new Error(`No se encontro el token ${nombre} en tema.css`);
  return coincidencia[1].toLowerCase();
}
