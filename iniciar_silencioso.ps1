# ============================================================
# TT Store & Barbearia - Launcher Ultra-Rápido (~2 segundos)
# ============================================================

$ErrorActionPreference = "SilentlyContinue"
$workDir = "c:\PROJETOS\loja-roupas"

# 1. Encerrar processos antigos nas portas 8080 e 5173
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
Get-Process java -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# 2. Localizar java.exe
$javaCmd = (Get-Command java -ErrorAction SilentlyContinue).Source
if (-not $javaCmd) { $javaCmd = "C:\Program Files\Common Files\Oracle\Java\javapath\java.exe" }

# 3. Path do JAR do Backend
$backendDir = "$workDir\backend"
$jarPath = "$backendDir\target\backend-0.0.1-SNAPSHOT.jar"

if (-not (Test-Path $jarPath)) {
    Set-Location $backendDir
    & ".\mvnw.cmd" package -DskipTests -q >$null 2>&1
}

# 4. Iniciar Backend Java diretamente via JAR (boot em ~2s)
Start-Process -FilePath $javaCmd -ArgumentList "-XX:+TieredCompilation -XX:TieredStopAtLevel=1 -noverify -jar `"$jarPath`"" -WindowStyle Hidden -WorkingDirectory $backendDir

# 5. Iniciar Frontend Vite em background (porta 5173)
$frontendDir = "$workDir\frontend"
Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -WindowStyle Hidden -WorkingDirectory $frontendDir

# 6. Aguarda o servidor responder para abrir o navegador
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 150
    try {
        $req = [System.Net.WebRequest]::Create("http://localhost:8080/api/auth/me")
        $req.Timeout = 300
        $res = $req.GetResponse()
        if ($res) { $res.Close(); break }
    } catch {
        if ($_.Exception.Response) { break }
    }
}

# 7. Abrir navegador na porta 5173
Start-Process "http://localhost:5173"
