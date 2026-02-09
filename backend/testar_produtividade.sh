#!/bin/bash
# Script de teste para API de Produtividade
# AgroFocus

echo "🌾 Testando API de Produtividade - AgroFocus"
echo "============================================="
echo ""

BASE_URL="http://localhost:3001/api"

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}1. Listando culturas disponíveis:${NC}"
curl -s "${BASE_URL}/produtividade/culturas" | python3 -m json.tool 2>/dev/null || curl -s "${BASE_URL}/produtividade/culturas"
echo ""
echo ""

echo -e "${BLUE}2. Estimando produtividade para milho (talhao-001):${NC}"
curl -s "${BASE_URL}/produtividade/estimar/talhao-001?safra=2023/2024&cultura_id=1" | python3 -m json.tool 2>/dev/null || curl -s "${BASE_URL}/produtividade/estimar/talhao-001?safra=2023/2024&cultura_id=1"
echo ""
echo ""

echo -e "${BLUE}3. Estimando produtividade para soja (talhao-001):${NC}"
curl -s "${BASE_URL}/produtividade/estimar/talhao-001?safra=2023/2024&cultura_id=2" | python3 -m json.tool 2>/dev/null || curl -s "${BASE_URL}/produtividade/estimar/talhao-001?safra=2023/2024&cultura_id=2"
echo ""
echo ""

echo -e "${BLUE}4. Buscando histórico do talhão:${NC}"
curl -s "${BASE_URL}/produtividade/historico/talhao-001?cultura_id=1&anos=3" | python3 -m json.tool 2>/dev/null || curl -s "${BASE_URL}/produtividade/historico/talhao-001?cultura_id=1&anos=3"
echo ""
echo ""

echo -e "${BLUE}5. Comparando safras:${NC}"
curl -s "${BASE_URL}/produtividade/comparar/talhao-001?safra1=2022/2023&safra2=2023/2024&cultura_id=1" | python3 -m json.tool 2>/dev/null || curl -s "${BASE_URL}/produtividade/comparar/talhao-001?safra1=2022/2023&safra2=2023/2024&cultura_id=1"
echo ""
echo ""

echo -e "${BLUE}6. Gerando dados de exemplo para milho:${NC}"
curl -s "${BASE_URL}/produtividade/exemplo/milho" | python3 -m json.tool 2>/dev/null || curl -s "${BASE_URL}/produtividade/exemplo/milho"
echo ""
echo ""

echo -e "${GREEN}✅ Testes concluídos!${NC}"
