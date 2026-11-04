@echo off
title Eva Flights
cd /d "%~dp0"

if not exist .env (
    echo Arquivo .env nao encontrado: abrindo em modo demo, com precos ficticios.
    echo Para usar dados reais, copie .env.example para .env e preencha as chaves.
    set "DEMO_MODE=true"
)

if not exist node_modules (
    echo Instalando dependencias...
    call npm install --no-audit --no-fund
)

echo Iniciando Eva Flights...
start "" http://localhost:5173
call npm run dev
pause
