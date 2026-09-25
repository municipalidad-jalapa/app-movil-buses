# language: es

Característica: Variables de entorno de producción (SCRUM-11)

  Como equipo del proyecto
  Quiero que la aplicación apunte al backend de producción y no a direcciones locales
  Para que un despliegue nunca hable con "localhost"

  Escenario: Configuración válida de producción
    Dado que el build recibe "VITE_API_BASE_URL" con una URL https del backend
    Y las cuatro variables de Firebase
    Cuando la aplicación lee su configuración
    Entonces usa esa URL sin barra final
    Y la configuración queda congelada

  Esquema del escenario: Un build mal configurado no arranca
    Dado que "VITE_API_BASE_URL" está <estado>
    Cuando la aplicación lee su configuración
    Entonces falla con un mensaje que nombra la variable

    Ejemplos:
      | estado                 |
      | ausente                |
      | vacía                  |
      | sin protocolo          |
      | con el texto undefined |

  Escenario: Falta una variable de Firebase
    Dado que falta cualquiera de las variables "VITE_FIREBASE_*" obligatorias
    Cuando la aplicación lee su configuración
    Entonces falla con un mensaje que nombra la variable que falta

  Escenario: El simulador del conductor queda apagado
    Dado que el pipeline no define "VITE_AUTH_CONDUCTOR_SIMULADO"
    Entonces el simulador de login del conductor está apagado
    Y el Dockerfile ni siquiera menciona esa variable

  Escenario: El Dockerfile obliga a pasar las variables
    Dado el archivo "dockerfile"
    Entonces declara ARG y ENV para cada variable obligatoria
    Y ningún ARG trae un valor por defecto
    Y no fija ninguna dirección local

  Escenario: El bundle apunta a producción
    Dado un build hecho con la URL de producción
    Entonces el bundle contiene esa URL
    Y no contiene "localhost:8080" ni "127.0.0.1:8080"

  Escenario: Los secretos no viajan en el repositorio
    Dado el repositorio
    Entonces ".gitignore" ignora los ".env" pero versiona ".env.example"
    Y ".env.example" solo trae placeholders
    Y solo "config.ts" lee las variables de entorno
