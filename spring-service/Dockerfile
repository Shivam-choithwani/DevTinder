# Use official Java 17 image
FROM eclipse-temurin:17-jdk-jammy

# Set the working directory inside the container
WORKDIR /app

# Copy all your files into the container
COPY . .

# Build the Spring Boot app
RUN chmod +x ./mvnw
RUN ./mvnw clean package -DskipTests

# Expose the port
EXPOSE 8081

# Command to run the application
CMD java -Dspring.mongodb.uri=$MONGODB_URI -jar target/*.jar

