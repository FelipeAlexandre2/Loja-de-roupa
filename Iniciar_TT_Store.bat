@echo off
title TT Store - Iniciando Sistema
color 0A

:: Pede permissao de admin se necessario
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Solicitando permissao de administrador...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo.
echo  =====================================================
echo    TT Store ^& Barbearia - Inicializador Silencioso
echo  =====================================================
echo.

echo [1/3] Limpando processos antigos e configurando rede...
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0iniciar_silencioso.ps1"

echo.
echo  =====================================================
echo    SISTEMA PRONTO E ONLINE!
echo    - Servidores ativos (Backend: 8080 | Frontend: 5173)
echo    - Navegador aberto automaticamente em http://localhost:5173
echo  =====================================================
echo.
timeout /t 3 >nul
exit
