# language: es
@HU-86 @frontend
Característica: Exportar los datos del servicio

  Como administrador municipal
  quiero descargar los datos de demanda y recorridos
  para usarlos en informes propios de la Municipalidad

  @criterio-1 @criterio-2
  Escenario: Descargo la hoja de cálculo de un rango de fechas
    Dado que tengo una sesión de administrador en la pantalla de exportar datos
    Cuando elijo del "2026-09-01" al "2026-09-15" y descargo
    Entonces se pide el archivo de ese rango con mi sesión
    Y se guarda el archivo "exportacion-servicio_2026-09-01_2026-09-15.xlsx"

  @criterio-2
  Escenario: Un rango invertido no se envía
    Dado que tengo una sesión de administrador en la pantalla de exportar datos
    Cuando elijo del "2026-09-15" al "2026-09-01" y descargo
    Entonces veo el aviso "La fecha final no puede ser anterior a la fecha de inicio."
    Y no se pide ningún archivo

  @criterio-2
  Escenario: Un rango de más de 366 días no se envía
    Dado que tengo una sesión de administrador en la pantalla de exportar datos
    Cuando elijo del "2025-01-01" al "2026-09-15" y descargo
    Entonces veo el aviso "El rango puede abarcar como máximo 366 días."
    Y no se pide ningún archivo

  @criterio-2
  Escenario: El backend rechaza el rango
    Dado que tengo una sesión de administrador en la pantalla de exportar datos
    Y que el servicio rechaza el rango con "El rango no puede superar 366 días"
    Cuando elijo del "2026-09-01" al "2026-09-15" y descargo
    Entonces veo el aviso "El rango no puede superar 366 días"

  @criterio-3
  Escenario: La pantalla avisa que no hay datos de pasajeros
    Dado que tengo una sesión de administrador en la pantalla de exportar datos
    Entonces veo que el archivo no incluye información que identifique a ningún pasajero
