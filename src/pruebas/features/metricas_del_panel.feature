# language: es
@SCRUM-26 @HU-146 @bloque-F @frontend
Característica: Métricas del panel y valoraciones por dimensión

  Como municipalidad
  quiero ver cuántos pasajeros suben y cómo califican cada cosa
  para saber qué mejorar y no quedarme con una sola nota general

  @F2-criterio-2
  Escenario: El pasajero puntúa las tres cosas por separado
    Dado que abro la hoja para opinar
    Cuando califico la calidad con 4, la limpieza con 2 y la conducción con 5
    Y envío la opinión
    Entonces la opinión se envía con las tres valoraciones

  @F2-criterio-2
  Escenario: Puntuar una sola dimensión ya es contenido suficiente
    Dado que abro la hoja para opinar
    Cuando califico solo la limpieza con 3
    Y envío la opinión
    Entonces la opinión se envía solo con la limpieza

  @F3-criterio-3
  Escenario: El panel muestra cada dimensión por separado
    Dado que el panel tiene promedios de calidad 4.5, limpieza 2.5 y conducción 4.5
    Cuando abro las opiniones del panel
    Entonces veo el promedio de "Calidad del servicio" en 4.5
    Y veo el promedio de "Limpieza de la unidad" en 2.5
    Y veo el promedio de "Conducción prudente" en 4.5

  @F3-criterio-3
  Escenario: Una dimensión sin datos no se muestra como cero
    Dado que el panel tiene promedio de calidad 4.0 y ninguna otra dimensión puntuada
    Cuando abro las opiniones del panel
    Entonces la limpieza y la conducción dicen "Sin datos"

  @F1-criterio-1
  Escenario: El panel muestra los pasajeros subidos por ruta y por periodo
    Dado que el piloto marcó 128 abordajes en el periodo
    Cuando abro los pasajeros subidos del panel
    Entonces veo el total de 128 pasajeros subidos
    Y veo el desglose por ruta y por vehículo
    Y la pantalla aclara que se cuenta lo que marcó el piloto

  @F1-criterio-1
  Escenario: Sin abordajes en el periodo se explica el vacío
    Dado que no hay abordajes en el periodo
    Cuando abro los pasajeros subidos del panel
    Entonces veo "No hay abordajes con estos filtros"
