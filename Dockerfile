FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Copia o JAR compilado unificado (Backend + Frontend embutido)
COPY backend/target/backend-0.0.1-SNAPSHOT.jar app.jar

# Expõe a porta 8080
EXPOSE 8080

# Flags de boot otimizado para produção
ENV JAVA_OPTS="-XX:+TieredCompilation -XX:TieredStopAtLevel=1 -noverify"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
