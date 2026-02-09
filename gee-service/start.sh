#!/bin/bash
# Script de inicialização do serviço GEE Python
# Usa gunicorn para produção

cd "$(dirname "$0")"

# Verifica se as credenciais existem
if [ ! -f "/home/clawdbot_user/clawd/booster_agro/backend/config/gee-credentials.json" ]; then
    echo "ERRO: Arquivo de credenciais não encontrado!"
    exit 1
fi

echo "Iniciando serviço GEE Python na porta 5001..."
exec gunicorn -w 4 -b 0.0.0.0:5001 --timeout 120 --access-logfile - --error-logfile - app:app
