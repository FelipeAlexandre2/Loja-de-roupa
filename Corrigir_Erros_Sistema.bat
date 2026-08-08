@echo off
chcp 65001 > nul
title TT Store - Ferramenta de Correção de Erros e Restauração

echo ===================================================
echo   TT STORE & BARBEARIA - REPARO AUTOMÁTICO DO SISTEMA
echo ===================================================
echo.
echo [1/4] Liberando porta 8080 e porta 5173 (Finalizando processos antigos)...

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080 ^| findstr LISTENING') do (
    echo Encerrando processo na porta 8080 (PID: %%a)...
    taskkill /F /PID %%a 2>nul
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    echo Encerrando processo na porta 5173 (PID: %%a)...
    taskkill /F /PID %%a 2>nul
)

taskkill /F /IM java.exe 2>nul
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/4] Limpando arquivos de cache e travas do banco...
if exist "%USERPROFILE%\.ttstore\data\loja-db.lock.db" (
    del /f /q "%USERPROFILE%\.ttstore\data\loja-db.lock.db" 2>nul
)
if exist "frontend\node_modules\.vite" (
    rmdir /s /q "frontend\node_modules\.vite" 2>nul
)
echo.

echo [3/4] Recompilando módulos do sistema...
cd backend
call mvnw.cmd compile
if %errorlevel% neq 0 (
    echo [AVISO] Falha ao compilar backend. Verifique os arquivos.
)
cd ..

echo.
echo [4/4] Reiniciando os servidores limpos...
start "TT Store Backend (Porta 8080)" cmd /k "cd /d %~dp0backend && mvnw.cmd spring-boot:run"
start "TT Store Frontend (Porta 5173)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ===================================================
echo   SISTEMA REPARADO E REINICIADO COM SUCESSO!
echo   Aguarde alguns segundos e acesse: http://localhost:5173
echo ===================================================
echo.
pause
