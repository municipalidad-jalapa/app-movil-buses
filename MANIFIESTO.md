# HU-24 — Documentación de arranque del proyecto

- **Dueño:** `owner-P2` (PMO)
- **Sprint:** 02 · **Puntos:** 3 · **Jira:** Por hacer
- **Rama sugerida:** `feature/hu-24-documentacion-arranque`
- **Orden:** independiente. Es un documento: no toca código ni afecta al build.
- **Repositorio:** el monorepo (`README.md` de la raíz).

## Historia y criterios de aceptación

> *Como* integrante nuevo del equipo
> *quiero* un documento que me deje trabajando en menos de una hora
> *para* no depender de que alguien me explique por chat
>
> Criterios de aceptación:
> * README con requisitos, pasos de arranque y solución de problemas comunes.
> * Estructura del repositorio explicada.
> * Probado con una persona que no participó en el setup.

## Qué cambia respecto al README actual

El README de la raíz ya existe y tiene material aprovechable —Postman, reglas de negocio,
endpoints—, pero tres cosas lo vuelven inservible para alguien que llega hoy:

| Problema | Corrección |
|---|---|
| **Dice que el frontend es Flutter**: `cd mobile && flutter run`, el truco de `10.0.2.2`, el flavor de conductor. Nada de eso existe y `mobile/` está vacío | Se reemplaza por la app web React, con `npm install && npm run dev` |
| **No menciona que el código está en tres repositorios** (monorepo en GitHub, backend y frontend en GitLab). Quien llega no sabe qué clonar ni dónde abrir su MR | Sección 1, con los tres repos y los comandos de clonado |
| **No tiene sección de problemas comunes**, que es un criterio explícito | Sección 8, con nueve problemas reales y su causa |

Además se agregan las convenciones de trabajo (ramas, commits, idioma) y una sección de estado
actual, para que nadie se confunda al clonar y no encontrar los módulos de negocio.

## Los problemas documentados son reales

No son hipotéticos: los nueve se encontraron trabajando en el proyecto. Entre ellos, el fallo de
Lombok con JDK 23+, Testcontainers cuando Docker está apagado, el 401 en todo salvo
`/actuator/health` hasta que entre HU-39, el rechazo de push por rama protegida, y la confusión de
usar variables `VITE_*` para una URL que debe cambiarse sin recompilar.

## Archivos

**Modifica:**

- `README.md` (raíz del monorepo)

No toca nada más.

## El tercer criterio no lo cierra quien escribe

*"Probado con una persona que no participó en el setup"* exige sentar a alguien —idealmente de QA o
un dev de otra pista— frente a una máquina limpia, darle solo este documento y cronometrar hasta
que tenga `/actuator/health` respondiendo. Cada tropiezo se anota y se corrige en el documento.
Sin ese paso, la historia no está terminada.

## Dependencia con HU-15 y HU-16

Este README dice que el frontend es React y que producción va en Docker Compose. `CLAUDE.md`
todavía dice Flutter con Android e iOS y menciona AKS, el `.gitignore` del monorepo tiene reglas de
Flutter, y `.github/workflows/ci.yml` conserva un job `mobile` que corre `flutter test` sobre una
carpeta vacía.

Si esto entra sin que D1 corrija lo suyo (**HU-15**), los documentos quedan contradiciéndose y el
recién llegado no sabe a cuál creerle. **HU-16** (los ADR) deja escrito el porqué de ambos cambios.
Conviene coordinar las tres.

## Cómo aplicarlo

```bash
git checkout develop && git pull
git checkout -b feature/hu-24-documentacion-arranque
cp -r qa/hu-24-documentacion-arranque/archivos/. .
git add -A && git commit -m "docs: documentacion de arranque del proyecto (HU-24)"
git push -u origin feature/hu-24-documentacion-arranque
```

Convención: Conventional Commits en español, corto, con la clave de la historia entre paréntesis.
Sin trailer de co-autoría.
