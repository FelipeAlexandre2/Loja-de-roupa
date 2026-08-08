@echo off
title TT Store - Frontend (Vite / React)
color 0B
echo.
echo =====================================================
echo   Iniciando Frontend (Vite / React - Porta 5173)...
echo =====================================================
echo.
cd /d "%~dp0frontend"

if exist "package.json" (
    npm run dev
) else (
    echo [ERRO] package.json nao encontrado!
    echo Verifique a pasta frontend.
    pause
)
