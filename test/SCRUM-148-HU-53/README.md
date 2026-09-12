# Pruebas SCRUM-148 - HU-53

## Historia

Pantalla para reservar un lugar en la parada.

## Subhistorias cubiertas

- SCRUM-252: Pantalla y botón principal.
- SCRUM-253: Obtención de ubicación.
- SCRUM-254: Identificación persistente del dispositivo.
- SCRUM-255: Registro de demanda.
- SCRUM-256: Manejo de registro activo.

## Tipos de pruebas

Se incluyen:

- Tests unitarios con Vitest.
- Tests de componentes con Testing Library.
- Escenarios funcionales escritos utilizando sintaxis Gherkin.

## Ejecución

Desde la raíz del proyecto:

```bash
npm.cmd test

# Pruebas SCRUM-148 - HU-53

## Historia de usuario

**SCRUM-148 - HU-53: Pantalla para reservar un lugar en la parada**

La funcionalidad permite que un pasajero indique que se encuentra esperando
un bus en una parada, utilizando su ubicación y un identificador anónimo
del dispositivo.

## Subhistorias cubiertas

- SCRUM-252: Pantalla de registro y botón principal.
- SCRUM-253: Obtención de ubicación del navegador.
- SCRUM-254: Identificador persistente del dispositivo.
- SCRUM-255: Registro de demanda.
- SCRUM-256: Manejo de un registro activo existente.

## Estructura

La carpeta contiene dos tipos de evidencia:

### Pruebas unitarias

Ubicadas en:

test/SCRUM-148-HU-53/unitarios/

Archivos:

- identidadDispositivo.test.ts
- registroDemanda.test.ts
- PantallaRegistro.test.tsx

### Escenarios Gherkin

Ubicados en:

test/SCRUM-148-HU-53/gherkin/

Archivos:

- SCRUM-148-HU53.feature
- SCRUM-252.feature
- SCRUM-253.feature
- SCRUM-254.feature
- SCRUM-255.feature
- SCRUM-256.feature

## Pruebas unitarias agregadas

### SCRUM-254

Se valida:

- Generación de un identificador cuando todavía no existe.
- Persistencia del identificador.
- Reutilización del mismo identificador en llamadas posteriores.

Resultado:

2 pruebas aprobadas.

### SCRUM-255

Se valida que el registro de demanda envíe:

- dispositivoId
- paradaId
- latitud
- longitud

al endpoint correspondiente.

Resultado:

1 prueba aprobada.

### SCRUM-148 / SCRUM-252 / SCRUM-253 / SCRUM-256

Se valida:

- Visualización del botón principal.
- Explicación del uso de ubicación antes de solicitarla.
- Registro del pasajero utilizando parada, dispositivo y ubicación.
- Manejo del caso donde ya existe un registro activo.

Resultado:

4 pruebas aprobadas.

## Resultado de las pruebas nuevas

Test Files: 3 passed

Tests: 7 passed

## Validación completa del proyecto

Se ejecutó:

npm.cmd test

Resultado:

Test Files: 19 passed
Tests: 102 passed

Esto confirma que las nuevas pruebas y funcionalidades no afectan
las pruebas existentes del proyecto.

## Validación del build

Se ejecutó:

npm.cmd run build

Resultado:

Build completado correctamente.

157 módulos transformados.

## Conclusión

La HU-53 y sus subhistorias cuentan con pruebas unitarias y escenarios
funcionales en sintaxis Gherkin.

Todas las pruebas ejecutadas finalizaron correctamente y el proyecto
compila de forma satisfactoria.