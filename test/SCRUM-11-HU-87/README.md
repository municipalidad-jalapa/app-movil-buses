# Pruebas SCRUM-11 - HU-87

## Historia de usuario

**SCRUM-11 - HU-87: Build de producción de la aplicación web**

> Como equipo del proyecto quiero un build de producción de la aplicación web
> empaquetado como imagen Docker para poder desplegarla fuera del entorno de
> desarrollo.

**Parte de Desarrollo (Frontend):** build optimizado de React generado con
`npm run build`, con ícono, título del sitio y pantalla de carga definitivos, y
variables de entorno apuntando al backend de producción (no a direcciones
locales).

## Qué se entregó

| Criterio | Cambio | Dónde |
|---|---|---|
| A1 Build optimizado | Ya existía; se verifica con un build real | `package.json`, `vite.config.ts` |
| A2 Imagen Docker | Ya existía; se verifica archivo por archivo y construyéndola | `dockerfile`, `nginx.conf`, `.dockerignore` |
| A3 Ícono definitivo | **Nuevo:** favicon SVG, íconos PNG (192, 512, maskable, iOS) y manifest | `public/` |
| A4 Título definitivo | Título con acentos y descripción corregida | `index.html` |
| A5 Pantalla de carga | **Nueva:** dentro de `#raiz`, se ve antes de que baje el JavaScript | `index.html` |
| A6 Variables de producción | Verificadas; `MenuAcceso` dejó de leer `import.meta.env` directo; se corrigió el comentario obsoleto de `.env.example` | `src/core/config.ts`, `src/componentes/MenuAcceso.tsx`, `.env.example` |

Además, la prueba real de la imagen encontró un defecto que se corrigió: Nginx
servía `manifest.webmanifest` como `application/octet-stream` (`nginx.conf`).

## Subhistorias cubiertas

- A1: Build optimizado de React con `npm run build`.
- A2: Empaquetado como imagen Docker.
- A3: Ícono del sitio.
- A4: Título del sitio.
- A5: Pantalla de carga.
- A6: Variables de entorno apuntando al backend de producción.

## Tipos de pruebas

Se incluyen:

- Tests unitarios con Vitest sobre los archivos reales (`index.html`, `public/`, `dockerfile`, `nginx.conf`, `config.ts`).
- Tests de integración con Vitest: `tsc` y `vite build` reales, sobre una carpeta temporal.
- Escenarios funcionales escritos con sintaxis Gherkin.
- Herramientas para pruebas con datos simulados y reales (imagen Docker, navegador).
- Manual con pasos para todo lo anterior y para dispositivos reales.

## Estructura

```
test/SCRUM-11-HU-87/
├── README.md                 este archivo
├── manual.md                 cómo probar: real, simulado, manual y automático
├── resultados.txt            estado de cada prueba (PASO / FALLO)
├── utilidades.ts             ayudas compartidas por las pruebas
├── unitarios/
│   ├── iconoYTitulo.test.ts          A3 y A4 (22 pruebas)
│   ├── pantallaDeCarga.test.ts       A5 (21 pruebas)
│   ├── variablesDeEntorno.test.ts    A6 (41 pruebas)
│   └── imagenDocker.test.ts          A1 y A2 (28 pruebas)
├── integracion/
│   └── buildProduccion.test.ts       A1, A3, A5 y A6 con un build real (24 pruebas)
├── gherkin/
│   ├── SCRUM-11-HU87.feature
│   ├── 01-build-optimizado.feature
│   ├── 02-imagen-docker.feature
│   ├── 03-icono-y-titulo.feature
│   ├── 04-pantalla-de-carga.feature
│   └── 05-variables-de-produccion.feature
├── herramientas/
│   ├── backend-simulado.mjs          backend falso para ver la app montada
│   ├── verificar-imagen.mjs          revisa una imagen/despliegue en marcha
│   ├── verificar-navegador.mjs       revisa en Edge/Chrome real (opcional)
│   └── generar-resultados.mjs        escribe resultados.txt
└── evidencias/                       capturas de pantalla reales
```

## Ejecución

Desde la raíz del proyecto:

```bash
npm ci
npm run test:hu87              # solo las pruebas de esta HU (~20 s)
npm test                       # toda la batería del proyecto
npm run test:hu87:resultados   # corre todo y reescribe resultados.txt
```

Las pruebas de integración hacen un build de verdad en una carpeta temporal:
no tocan tu `dist/` ni tu `.env`.

Las pruebas que necesitan Docker o un navegador no corren dentro de `npm test`
(no todos los equipos los tienen). Se corren a mano con las herramientas; ver
`manual.md`.

## Resultado de la última corrida

Ver `resultados.txt`. Ahí queda una línea `[PASO]` o `[FALLO]` por cada prueba.

## Conclusión

Las 136 pruebas automáticas de la HU-87 pasan, la imagen Docker construye y
responde, y en un navegador real la app monta, reemplaza la pantalla de carga y
habla solo con el backend configurado. Lo que falta por probar con dispositivos y
datos de producción reales está en `manual.md`, secciones 5 y 6, y en la tabla
de registro de la sección 7.
