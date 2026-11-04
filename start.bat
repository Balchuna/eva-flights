@echo off
title Eva Flights
cd /d "%~dp0"

if not exist .env (
    echo [ERRO] Arquivo .env nao encontrado.
    echo Copie .env.example para .env e preencha TRAVELPAYOUTS_TOKEN.
    pause
    exit /b 1
)

if not exist node_modules (
    echo Instalando dependencias...
    call npm install --no-audit --no-fund
)

echo Iniciando Eva Flights...
start "" http://localhost:5173
call npm run dev
pause
