@echo off
echo ================================================
echo   TT Store - Build Mobile (Android)
echo ================================================
echo.

cd /d "%~dp0frontend"

echo [1/3] Fazendo build do app web...
call npm run build:web
if errorlevel 1 (
    echo ERRO no build web!
    pause
    exit /b 1
)

echo.
echo [2/3] Sincronizando com Android...
call npx cap sync android
if errorlevel 1 (
    echo ERRO no sync!
    pause
    exit /b 1
)

echo.
echo [3/3] Abrindo Android Studio...
echo Quando abrir, clique em: Build ^> Build Bundle/APK ^> Build APK
call npx cap open android

echo.
echo ================================================
echo   Pronto! Android Studio vai abrir.
echo   Para gerar o APK:
echo   Build > Build Bundle/APK > Build APK(s)
echo ================================================
pause
