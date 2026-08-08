@echo off
title TT Store - Backend (Java / Spring Boot)
color 0A
echo.
echo =====================================================
echo   Iniciando Backend (Spring Boot - Porta 8080)...
echo =====================================================
echo.
cd /d "%~dp0backend"

if exist "mvnw.cmd" (
    mvnw.cmd spring-boot:run
) else if exist "target\backend-0.0.1-SNAPSHOT.jar" (
    java -jar target\backend-0.0.1-SNAPSHOT.jar
) else (
    echo [ERRO] Maven wrapper ou JAR nao encontrados!
    echo Verifique a pasta backend.
    pause
)
