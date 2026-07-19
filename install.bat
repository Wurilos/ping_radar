@echo off
setlocal EnableExtensions

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

echo Aguardando a API concluir migracoes e inicializacao...
set /a WAIT_ATTEMPTS=0

:wait_backend
set /a WAIT_ATTEMPTS+=1
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3001/health' -TimeoutSec 3; if ($response.StatusCode -eq 200) { exit 0 }; exit 1 } catch { exit 1 }" >nul 2>nul
if %errorlevel% equ 0 goto backend_ready
if %WAIT_ATTEMPTS% geq 60 goto backend_failed
timeout /t 2 /nobreak >nul
goto wait_backend

:backend_failed
echo.
echo Erro: o backend nao ficou pronto dentro do tempo esperado.
docker compose ps
docker compose logs backend --tail=200
pause
exit /b 1

:backend_ready
echo API pronta. Validando o login inicial...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$payload = @{ email = 'admin@pingalert.pro'; password = 'admin123' } ^| ConvertTo-Json; try { $result = Invoke-RestMethod -Uri 'http://localhost:3001/api/auth/login' -Method Post -ContentType 'application/json' -Body $payload -TimeoutSec 10; if ($result.token) { exit 0 }; exit 1 } catch { Write-Host $_.Exception.Message; exit 1 }"
if %errorlevel% neq 0 goto login_failed

echo ===========================================
echo Instalacao concluida e login validado.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:3001
echo Login inicial: admin@pingalert.pro / admin123
echo.
echo IMPORTANTE SOBRE VPN:
echo Se os IPs privados nao responderem pelo Docker, execute o backend
echo diretamente no Windows conforme a secao VPN do README.
pause
exit /b 0

:login_failed
echo.
echo Erro: a API iniciou, mas o login inicial nao foi validado.
docker compose logs backend --tail=200
pause
exit /b 1
