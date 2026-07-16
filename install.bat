@echo off
setlocal

echo Iniciando o instalador do PingAlert Pro...
echo ===========================================

REM Verifica se o Docker esta instalado
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo Erro: O Docker nao esta instalado ou nao esta no PATH.
    echo Por favor, instale o Docker Desktop: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

REM Executa o docker-compose
echo Subindo os servicos (Banco de Dados, API e Frontend)...
docker compose up -d --build

if %errorlevel% neq 0 (
    echo Ocorreu um erro ao tentar subir os contêineres.
    pause
    exit /b 1
)

echo ===========================================
echo Instalacao concluida com sucesso!
echo O backend estara disponivel em: http://localhost:3001
echo O frontend estara disponivel em: http://localhost:3000
pause
