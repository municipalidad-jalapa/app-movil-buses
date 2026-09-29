// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { textoPlano } from './textoPlano';

describe('texto que escribio una persona, tal como lo escribio', () => {
  it('deshace los acentos y la ñ que el backend escapaba con ISO-8859-1', () => {
    expect(textoPlano('M&aacute;s trabajo en este apartado, &iquest;por qu&eacute;? A&ntilde;o')).toBe(
      'Más trabajo en este apartado, ¿por qué? Año',
    );
  });

  it('deshace las cinco basicas y las numericas, y deja las etiquetas como texto', () => {
    expect(textoPlano('&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt; &amp; &quot;gracias&quot; &#128512;')).toBe(
      `<script>alert('x')</script> & "gracias" 😀`,
    );
  });

  it('un texto sin entidades o vacio queda igual', () => {
    expect(textoPlano('Buen servicio 😀\n  hoy')).toBe('Buen servicio 😀\n  hoy');
    expect(textoPlano(null)).toBe('');
    expect(textoPlano('')).toBe('');
  });
});
