@echo off
title TT Store - Iniciando Sistema
color 0A

:: Executa a inicialização ultrarrápida silenciosa em segundo plano
powershell -ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File "%~dp0iniciar_silencioso.ps1"
exit
