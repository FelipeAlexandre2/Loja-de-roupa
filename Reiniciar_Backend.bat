@echo off
title Reiniciar Backend - TT Store

:: Pede elevacao de admin se necessario
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Solicitando permissao de administrador...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo.
echo  =====================================================
echo    Reiniciando Backend TT Store (Java/Spring Boot)
echo  =====================================================
echo.

:: Para o processo Java na porta 8080
echo [1/3] Parando backend antigo na porta 8080...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8080" ^| findstr "LISTENING"') do (
    echo     Terminando processo PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 3 /nobreak >nul
echo     OK - Backend antigo encerrado!

echo.
echo [2/3] Iniciando novo Backend (JAR atualizado)...
set BACKEND_DIR=%~dp0backend
start "TT Store Backend (NOVO)" cmd /k "java -jar "%BACKEND_DIR%\target\backend-0.0.1-SNAPSHOT.jar""
echo     OK - Backend iniciando... aguarde ~15 segundos

echo.
echo [3/3] Aguardando backend subir...
timeout /t 20 /nobreak >nul

echo.
echo  =====================================================
echo    Backend reiniciado com sucesso!
echo    Acesse: http://localhost:8080
echo    Login padrao: admin / admin123
echo  =====================================================
echo.
pause
