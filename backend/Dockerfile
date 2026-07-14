FROM maven:3.9.9-eclipse-temurin-21-alpine AS build
WORKDIR /workspace
COPY pom.xml ./
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B -DskipTests package

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S app && adduser -S -G app -u 10001 app
WORKDIR /app
COPY --from=build /workspace/target/backend-*.jar /app/application.jar
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod 0500 /app/docker-entrypoint.sh && chown -R app:app /app
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["/app/docker-entrypoint.sh"]
