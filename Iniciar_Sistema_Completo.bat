@echo off
chcp 65001 > nul
title TT Store - Inicializador Completo do Sistema

echo ===================================================
echo    INICIANDO TT STORE & BARBEARIA (SISTEMA COMPLETO)
echo ===================================================
echo.
echo Liberando portas 8080 e 5173...

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080 ^| findstr LISTENING') do (
    taskkill /F /PID %%a 2>nul
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    taskkill /F /PID %%a 2>nul
)

echo [1/2] Iniciando Servidor Backend (Porta 8080)...
start "TT Store Backend (Porta 8080)" cmd /k "cd /d %~dp0backend && mvnw.cmd spring-boot:run"

echo [2/2] Iniciando Interface Frontend (Porta 5173)...
start "TT Store Frontend (Porta 5173)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ===================================================
echo   SISTEMA INICIADO!
echo   Acesse no navegador: http://localhost:5173
echo ===================================================
echo.
pause
