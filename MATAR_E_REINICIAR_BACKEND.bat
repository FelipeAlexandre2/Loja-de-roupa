@echo off
title REINICIAR BACKEND - TT Store
color 0A

echo.
echo  ===================================================
echo    REINICIANDO BACKEND TT Store
echo  ===================================================
echo.

:: Mata qualquer processo Java na porta 8080
echo [1/4] Encerrando backend antigo...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":8080" ^| findstr "LISTENING"') do (
    echo     Matando PID %%a...
    taskkill /F /PID %%a >nul 2>&1
)

:: Mata tambem pelo nome java.exe caso reste
taskkill /F /IM java.exe >nul 2>&1
echo     Processos Java encerrados!
timeout /t 3 /nobreak >nul

:: Verifica se a porta esta livre
netstat -ano | findstr ":8080" | findstr "LISTENING" >nul 2>&1
if %errorlevel% == 0 (
    echo.
    echo  AVISO: Porta 8080 ainda ocupada. Tentando novamente...
    taskkill /F /IM java.exe >nul 2>&1
    timeout /t 5 /nobreak >nul
)

echo.
echo [2/4] Iniciando novo backend atualizado...
set BACKEND_DIR=%~dp0backend
set JAR_PATH=%BACKEND_DIR%target\backend-0.0.1-SNAPSHOT.jar

if not exist "%JAR_PATH%" (
    echo  ERRO: JAR nao encontrado em %JAR_PATH%
    echo  Execute o Maven para compilar primeiro.
    pause
    exit /b 1
)

echo     JAR encontrado: %JAR_PATH%
start "TT Store Backend" cmd /k "java -jar "%JAR_PATH%""
echo     Backend iniciando...

echo.
echo [3/4] Aguardando backend subir (20 segundos)...
timeout /t 20 /nobreak >nul

echo.
echo [4/4] Verificando se esta rodando...
netstat -ano | findstr ":8080" | findstr "LISTENING" >nul 2>&1
if %errorlevel% == 0 (
    echo     SUCESSO! Backend rodando na porta 8080!
) else (
    echo     Backend ainda iniciando, aguarde mais alguns segundos...
)

echo.
echo  ===================================================
echo    PRONTO! 
echo    - Acesse: http://localhost:5173
echo    - Login: admin / admin123
echo    - As atividades agora aparecerao corretamente
echo  ===================================================
echo.
pause
