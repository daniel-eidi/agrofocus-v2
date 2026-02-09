#!/bin/bash
# AgroFocus - Script de inicialização rápida com Docker

echo "🌾 AgroFocus - Inicialização com Docker"
echo "========================================"

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não encontrado. Instale o Docker primeiro:"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose não encontrado. Instale o Docker Compose:"
    echo "   https://docs.docker.com/compose/install/"
    exit 1
fi

# Criar arquivo .env se não existir
if [ ! -f backend/.env ]; then
    echo "📝 Criando arquivo .env..."
    cp backend/.env.example backend/.env
    echo "✅ Arquivo .env criado. Edite-o com suas configurações."
fi

# Subir os serviços
echo "🚀 Iniciando serviços..."
docker-compose up -d

# Aguardar banco estar pronto
echo "⏳ Aguardando banco de dados..."
sleep 5

# Executar setup do banco
echo "🗄️  Configurando banco de dados..."
docker-compose exec -T db psql -U postgres -d agrofocus -f /docker-entrypoint-initdb.d/01-schema.sql 2>/dev/null || true
docker-compose exec -T db psql -U postgres -d agrofocus -f /docker-entrypoint-initdb.d/02-seed.sql 2>/dev/null || true

echo ""
echo "✅ AgroFocus iniciado!"
echo ""
echo "📍 Acessos:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:3002"
echo "   Health:    http://localhost:3002/health"
echo ""
echo "📝 Comandos úteis:"
echo "   Logs:      docker-compose logs -f"
echo "   Parar:     docker-compose down"
echo "   Banco:     docker-compose exec db psql -U postgres -d agrofocus"
echo ""
echo "🔑 Usuários de teste:"
echo "   admin@agrofocus.com / admin123"
echo "   gerente@agrofocus.com / admin123"
echo "   operador@agrofocus.com / admin123"
