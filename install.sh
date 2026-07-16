#!/bin/bash

echo "Iniciando o instalador do PingAlert Pro..."
echo "==========================================="

# Verifica se o Docker está instalado
if ! command -v docker &> /dev/null
then
    echo "Erro: O Docker não está instalado."
    echo "Instale o Docker usando o comando: curl -fsSL https://get.docker.com | bash"
    exit 1
fi

# Verifica se é docker compose ou docker-compose
DOCKER_COMPOSE_CMD="docker compose"
if ! $DOCKER_COMPOSE_CMD version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
    if ! command -v $DOCKER_COMPOSE_CMD &> /dev/null; then
        echo "Erro: O Docker Compose não está instalado."
        exit 1
    fi
fi

# Executa o docker-compose
echo "Subindo os serviços (Banco de Dados, API e Frontend)..."
$DOCKER_COMPOSE_CMD up -d --build

if [ $? -ne 0 ]; then
    echo "Ocorreu um erro ao tentar subir os contêineres."
    exit 1
fi

echo "==========================================="
echo "Instalação concluída com sucesso!"
echo "O backend estará disponível em: http://localhost:3001"
echo "O frontend estará disponível em: http://localhost:3000"
