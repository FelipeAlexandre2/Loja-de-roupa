Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "powershell -ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File ""c:\PROJETOS\loja-roupas\iniciar_silencioso.ps1""", 0, False
