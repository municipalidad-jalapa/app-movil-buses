# language: es

Característica: Criterio 6 - Un ETA no confiable no se disfraza de número exacto

  Como conductor
  Quiero que el panel me avise cuando no puede confiar en el ETA
  Para no tomar decisiones con un número inventado

  Contexto de negocio:
    La redacción anterior de esta historia mostraba el tiempo estimado junto
    al conteo de pasajeros hacia un umbral de diez. Esa regla no existe: lo
    que se muestra son las reservas activas de la parada. Este criterio cubre
    la parte del ETA, no el conteo.

  Escenario: Confianza baja sin próxima salida conocida
    Dado que el backend informa confianza "baja" sin próxima salida
    Cuando el conductor mira el panel
    Entonces la parada indica que el tiempo no está disponible
    Y no se muestra ningún número de minutos

  Escenario: Confianza baja con próxima salida conocida
    Dado que el backend informa confianza "baja" con próxima salida "10:15"
    Cuando el conductor mira el panel
    Entonces la parada muestra "Próxima salida 10:15"
    Y no muestra un rango ni un número de minutos

  Escenario: Dato desactualizado suspende el ETA aunque el backend diga confianza alta
    Dado que el último dato recibido tiene más de 5 minutos de antigüedad
    Cuando el conductor mira el panel
    Entonces ninguna parada pendiente muestra un ETA en minutos
    Y se sigue mostrando la hora del último dato recibido

  Escenario: La marca de tiempo del último dato siempre está visible
    Dado que el panel ya recibió al menos una respuesta del backend
    Cuando el conductor mira el panel
    Entonces ve la hora del último dato recibido
