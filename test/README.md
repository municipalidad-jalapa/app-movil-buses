# Carpeta `test/` — Contador de demanda

Pruebas de las cuatro subhistorias de la HU del contador (hook `useEstadoDemanda`,
componente `ContadorDemanda`, polling de 15 s y variantes de carga/error/umbral).

## Empezar acá

```bash
node test/correr-todo.mjs
```

Corre todo lo automático y escribe **`RESULTADOS.txt`** con el veredicto
(PASÓ / FALLÓ / PENDIENTE) por bloque y el checklist manual al final.

Después, para lo que hay que ver a ojo, seguir **`MANUAL.md`** (sección PM‑1…PM‑11).

## Contenido

| Archivo | Qué es |
|---|---|
| **`MANUAL.md`** | Manual completo: cómo correr lo automático y las 11 pruebas manuales con su resultado esperado |
| **`correr-todo.mjs`** | Ejecuta tests + suite + build + contrato y genera `RESULTADOS.txt` |
| **`contrato-demanda.mjs`** | Verifica `GET /api/v1/demanda/estado` contra el backend real |
| **`stub-demanda.mjs`** | Backend falso que cicla las variantes cada 15 s (para las pruebas manuales) |
| **`RESULTADOS.txt`** | Salida de la última corrida de `correr-todo.mjs` |

Los tests automáticos (`*.test.ts` / `*.test.tsx`) están al lado del código, en
`src/` — es donde el proyecto los tiene y donde los busca Vitest. `MANUAL.md`
lista cuáles son.

## Estado de la última corrida

- Capa A (tests + build): **PASÓ** — 23/23 del contador, 106/106 la suite.
- Capa B (contrato backend real): **PENDIENTE** — el backend aún responde 404 en
  `/api/v1/demanda/estado`; el frontend usa `DEMANDA_SIMULADA` mientras tanto.
- Capa C (manual): pendiente de hacer a mano con el stub — ver `MANUAL.md`.
