FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build/backend
COPY backend/pom.xml .
RUN mvn -B dependency:go-offline
COPY backend/src src
COPY content /build/content
COPY docs/openapi.json /build/docs/openapi.json
RUN mvn -B package
FROM eclipse-temurin:17-jre-jammy
RUN groupadd --gid 10001 app && useradd --uid 10001 --gid app --create-home app && mkdir -p /app/data/uploads && chown -R app:app /app
WORKDIR /app
COPY --from=build /build/backend/target/interview-site-1.0.0.jar app.jar
USER app
EXPOSE 8080
ENTRYPOINT ["java","-XX:MaxRAMPercentage=65","-jar","app.jar"]
