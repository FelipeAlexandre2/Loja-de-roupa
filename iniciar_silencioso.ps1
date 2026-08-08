# ============================================================
# TT Store & Barbearia - Launcher & Restarter Silencioso Ultra-Rápido
# ============================================================

$ErrorActionPreference = "SilentlyContinue"
$workDir = "c:\PROJETOS\loja-roupas"

# 1. Elevação de Administrador Silenciosa
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File `"$PSCommandPath`"" -Verb RunAs -WindowStyle Hidden
    exit
}

# 2. Encerrar todos os processos antigos (Reinicialização limpa)
Get-Process java, node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
foreach ($port in @(8080, 5173)) {
    $lines = netstat -ano 2>$null | findstr ":$port" | findstr "LISTENING"
    foreach ($line in $lines) {
        $parts = $line.Trim() -split '\s+'
        $pidToKill = $parts[-1]
        if ($pidToKill -and $pidToKill -ne "0") {
            taskkill /F /PID $pidToKill /T >$null 2>&1
        }
    }
}

Start-Sleep -Seconds 1

# 3. Recompilar o Backend se necessário
$backendDir = "$workDir\backend"
$jarPath = "$backendDir\target\backend-0.0.1-SNAPSHOT.jar"

# Copia a versão de produção do frontend (dist) para a pasta de arquivos estáticos do Spring Boot
$distDir = "$workDir\frontend\dist"
$staticDir = "$backendDir\src\main\resources\static"
if (Test-Path $distDir) {
    Remove-Item "$staticDir\*" -Recurse -Force -ErrorAction SilentlyContinue
    Copy-Item "$distDir\*" -Destination $staticDir -Recurse -Force
}

# Compila o JAR único
Set-Location $backendDir
& ".\mvnw.cmd" package -DskipTests -q >$null 2>&1

# 4. Liberar Firewall Silenciosamente
netsh advfirewall firewall delete rule name="TT Store Frontend" >$null 2>&1
netsh advfirewall firewall delete rule name="TT Store Backend" >$null 2>&1
netsh advfirewall firewall add rule name="TT Store Frontend" dir=in action=allow protocol=TCP localport=5173 profile=any >$null 2>&1
netsh advfirewall firewall add rule name="TT Store Backend" dir=in action=allow protocol=TCP localport=8080 profile=any >$null 2>&1
Set-NetConnectionProfile -NetworkCategory Private -ErrorAction SilentlyContinue >$null 2>&1

# 5. Iniciar Backend (Java) com Otimização Ultra-Rápida de Boot (-XX:+TieredCompilation -XX:TieredStopAtLevel=1 -noverify)
if (Test-Path $jarPath) {
    Start-Process -FilePath "java" -ArgumentList "-XX:+TieredCompilation -XX:TieredStopAtLevel=1 -noverify -jar `"$jarPath`"" -WindowStyle Hidden -WorkingDirectory $backendDir
}

# 6. Também inicia o Frontend Vite de dev em background (porta 5173) para suporte a conexões de dev se necessário
$frontendDir = "$workDir\frontend"
Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -WindowStyle Hidden -WorkingDirectory $frontendDir

# 7. Sondagem Ultra-Rápida (a cada 150ms) para abrir no navegador assim que responder
$backendReady = $false

for ($i = 0; $i -lt 100; $i++) {
    Start-Sleep -Milliseconds 150

    try {
        $req = [System.Net.WebRequest]::Create("http://localhost:8080/api/auth/me")
        $req.Timeout = 400
        $res = $req.GetResponse()
        if ($res) { $backendReady = $true; $res.Close(); break }
    } catch { }
}

# 8. Abrir navegador na porta 8080 (Servidor de Produção Ultra-Rápido)
Start-Process "http://localhost:8080"
