# ---------- Etapa 1: Build ----------
# Compila el proyecto con Maven dentro de un contenedor temporal.
# Esta etapa NO forma parte de la imagen final (reduce el tamano).
# Cambio 2 :) 
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# ---------- Etapa 2: Runtime ----------
# Imagen final, liviana, basada en Ubuntu 22.04 LTS (Jammy),
# coherente con "Ubuntu Server LTS" definido en la ficha tecnica
# del proyecto. Solo contiene el JRE y el .jar ya compilado.
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
