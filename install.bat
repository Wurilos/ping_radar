@echo off
setlocal

echo Iniciando o instalador do PingAlert Pro...
echo ===========================================

where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo Erro: Docker Desktop nao esta instalado ou nao esta no PATH.
    echo Instale e inicie o Docker Desktop antes de continuar.
    pause
    exit /b 1
)

docker info >nul 2>nul
if %errorlevel% neq 0 (
    echo Erro: Docker Desktop esta instalado, mas nao esta em execucao.
    pause
    exit /b 1
)

echo Construindo e iniciando Backend, Frontend e banco SQLite...
docker compose up -d --build

if %errorlevel% neq 0 (
    echo Ocorreu um erro ao subir os containers.
    echo Execute: docker compose logs --tail=200
    pause
    exit /b 1
)

echo ===========================================
echo Instalacao concluida.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:3001
echo Login inicial: admin@pingalert.pro / admin123
echo.
echo IMPORTANTE SOBRE VPN:
echo Se os IPs privados nao responderem pelo Docker, execute o backend
 echo diretamente no Windows conforme a secao VPN do README.
pause
