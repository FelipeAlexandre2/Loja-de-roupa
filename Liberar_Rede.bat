@echo off
:: Solicita permissão de administrador automaticamente
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Solicitando permissao de administrador...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo ================================================
echo   TT Store - Liberando Firewall do Windows
echo ================================================
echo.

echo [1/4] Removendo regras antigas (se existirem)...
netsh advfirewall firewall delete rule name="TT Store Frontend" >nul 2>&1
netsh advfirewall firewall delete rule name="TT Store Backend"  >nul 2>&1

echo [2/4] Liberando porta 5173 (Frontend)...
netsh advfirewall firewall add rule name="TT Store Frontend" dir=in action=allow protocol=TCP localport=5173
if errorlevel 1 (
    echo ERRO ao liberar porta 5173!
) else (
    echo OK - Porta 5173 liberada!
)

echo.
echo [3/4] Liberando porta 8080 (Backend)...
netsh advfirewall firewall add rule name="TT Store Backend" dir=in action=allow protocol=TCP localport=8080
if errorlevel 1 (
    echo ERRO ao liberar porta 8080!
) else (
    echo OK - Porta 8080 liberada!
)

echo.
echo [4/4] Configurando rede como Privada (mais permissiva)...
powershell -Command "Set-NetConnectionProfile -NetworkCategory Private" >nul 2>&1
echo OK!

echo.
echo ================================================
echo   PRONTO! Firewall configurado com sucesso.
echo.
echo   Acesse de outro computador:
echo   http://ti01:5173
echo.
echo   Celular (mesmo Wi-Fi):
echo   http://ti01:5173/instalar.html
echo ================================================
echo.
pause
