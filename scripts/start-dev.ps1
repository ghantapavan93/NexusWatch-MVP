Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
& "C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run dev -- --hostname 127.0.0.1 --port 3000
