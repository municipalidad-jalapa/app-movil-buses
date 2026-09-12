/*
 * Node 25 trae un `localStorage` propio que, sin la bandera
 * `--localstorage-file`, existe pero no funciona: `clear`, `getItem` y
 * compania no son funciones. Como es un global de Node, le gana al de jsdom y
 * cualquier prueba que toque el almacenamiento falla con
 * "localStorage.clear is not a function" (asi fallaban las 9 de AuthProvider).
 *
 * Si el global no sirve, se reemplaza por un Storage en memoria con la misma
 * interfaz. Donde el entorno ya trae uno que funciona, no se toca.
 */
class AlmacenamientoEnMemoria implements Storage {
  private datos = new Map<string, string>();

  get length(): number {
    return this.datos.size;
  }

  clear(): void {
    this.datos.clear();
  }

  getItem(clave: string): string | null {
    return this.datos.has(clave) ? (this.datos.get(clave) as string) : null;
  }

  key(indice: number): string | null {
    return [...this.datos.keys()][indice] ?? null;
  }

  removeItem(clave: string): void {
    this.datos.delete(clave);
  }

  setItem(clave: string, valor: string): void {
    this.datos.set(clave, String(valor));
  }
}

for (const nombre of ['localStorage', 'sessionStorage'] as const) {
  const actual = (globalThis as Record<string, unknown>)[nombre] as Storage | undefined;
  if (typeof actual?.clear !== 'function') {
    Object.defineProperty(globalThis, nombre, {
      value: new AlmacenamientoEnMemoria(),
      configurable: true,
      writable: true,
    });
  }
}
