# Sistema de Estimativa de Produtividade - AgroFocus

Sistema de Machine Learning para estimar produtividade agrícola baseado em NDVI, dados climáticos (GDD e precipitação) e histórico do talhão.

## 📁 Estrutura de Arquivos

```
/booster_agro/
├── backend/src/
│   ├── services/
│   │   └── produtividade.service.js      # Lógica de negócio e integração com ML
│   ├── routes/
│   │   └── produtividade.routes.js       # Endpoints da API
│   └── ml/
│       └── modelo_estimativa.py          # Modelo Python de ML
├── frontend/src/
│   ├── pages/Produtividade/
│   │   ├── ProdutividadeDashboard.jsx    # Dashboard principal
│   │   ├── components/
│   │   │   ├── ProdutividadeCard.jsx     # Card de estimativa
│   │   │   ├── TendenciaChart.jsx        # Gráfico de tendência
│   │   │   ├── ComparativoReal.jsx       # Comparativo estimativa vs real
│   │   │   └── AlertasPanel.jsx          # Painel de alertas
│   │   └── ProdutividadeDashboard.css
│   └── services/
│       └── produtividade.api.js          # Cliente API
```

## 🚀 Endpoints da API

### 1. Estimar Produtividade
```
GET /api/produtividade/estimar/:talhaoId?safra=2023/2024&cultura_id=1
```

**Parâmetros:**
- `talhaoId` (path): ID do talhão
- `safra` (query): Ano da safra (formato: AAAA/AAAA)
- `cultura_id` (query): 1=Milho, 2=Soja, 3=Trigo, 4=Algodão

**Resposta:**
```json
{
  "sucesso": true,
  "talhaoId": "talhao-001",
  "safra": "2023/2024",
  "cultura": { "id": "1", "nome": "Milho" },
  "estimativa": {
    "produtividade_ton_ha": 11.5,
    "intervalo_confianca": {
      "min": 10.2,
      "max": 12.8,
      "nivel": "95%"
    },
    "metodo": "modelo_ml",
    "features_utilizadas": {
      "ndvi_mean": 0.82,
      "gdd_total": 1850,
      "precip_total": 520
    }
  },
  "comparativos": {
    "media_historica": {
      "estimativa_atual": 11.5,
      "media_historica": 10.8,
      "diferenca_percentual": 6.48,
      "status": "acima",
      "alertas": []
    },
    "ano_anterior": {
      "safra_anterior": "2022/2023",
      "estimativa_ano_anterior": 10.2,
      "variacao_percentual": 12.75,
      "tendencia": "melhora"
    }
  },
  "tendencia": {
    "tendencia": "crescente",
    "variacao_percentual": 8.5,
    "produtividades_historicas": [9.8, 10.5, 11.2],
    "media_historica": 10.5
  },
  "produtividade_real": {
    "disponivel": false,
    "mensagem": "Dados de produtividade real ainda não disponíveis"
  },
  "alertas": [],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 2. Listar Culturas
```
GET /api/produtividade/culturas
```

### 3. Histórico do Talhão
```
GET /api/produtividade/historico/:talhaoId?cultura_id=1&anos=3
```

### 4. Comparar Safras
```
GET /api/produtividade/comparar/:talhaoId?safra1=2022/2023&safra2=2023/2024&cultura_id=1
```

### 5. Gerar Dados de Exemplo
```
GET /api/produtividade/exemplo/milho
```

## 🧠 Modelo de Machine Learning

### Features Utilizadas:
1. **NDVI Mean** (0-1): Índice médio de vegetação do talhão
2. **GDD Total** (°C): Graus-dia acumulados na safra
3. **Precip Total** (mm): Precipitação acumulada no período

### Target:
- **Produtividade** (ton/ha)

### Algoritmo:
- Regressão Linear Múltipla (baseline)
- Com fallback para tabela de calibração quando modelo não treinado

### Tabela de Calibração (Fallback):

**Milho:**
- NDVI 0.8+ → 12-14 t/ha (Excelente)
- NDVI 0.6-0.8 → 8-12 t/ha (Bom)
- NDVI 0.4-0.6 → 5-8 t/ha (Médio)
- NDVI < 0.4 → <5 t/ha (Baixo)

**Soja:**
- NDVI 0.8+ → 4-5 t/ha (Excelente)
- NDVI 0.6-0.8 → 2.5-4 t/ha (Bom)
- NDVI 0.4-0.6 → 1.5-2.5 t/ha (Médio)
- NDVI < 0.4 → <1.5 t/ha (Baixo)

## 🧪 Como Testar

### Teste Rápido (via curl):
```bash
# Listar culturas
curl http://localhost:3001/api/produtividade/culturas

# Estimar produtividade para milho
curl "http://localhost:3001/api/produtividade/estimar/talhao-001?safra=2023/2024&cultura_id=1"

# Estimar produtividade para soja
curl "http://localhost:3001/api/produtividade/estimar/talhao-001?safra=2023/2024&cultura_id=2"

# Buscar histórico
curl "http://localhost:3001/api/produtividade/historico/talhao-001?anos=3"
```

### Teste do Modelo Python:
```bash
cd /booster_agro/backend/src/ml

# Treinar modelo com dados de exemplo
python3 modelo_estimativa.py --exemplo

# Fazer predição individual
python3 modelo_estimativa.py --cultura milho --predict '{"ndvi_mean":0.82,"gdd_total":1850,"precip_total":520}'
```

### Teste do Frontend:
Acesse o dashboard em:
```
http://localhost:3000/produtividade
```

## 📊 Dashboard Frontend

O dashboard exibe:

1. **Card de Estimativa**: Valor principal com intervalo de confiança
2. **Comparativo Real**: Comparação entre estimativa ML e dados reais (quando disponíveis)
3. **Gráfico de Tendência**: Evolução histórica da produtividade
4. **Alertas**: Notificações quando estimativa < média histórica -20%

## 🔧 Integração com React Router

Adicione ao seu App.js:
```javascript
import { ProdutividadeDashboard } from './pages/Produtividade';

// ...
<Route path="/produtividade" element={<ProdutividadeDashboard />} />
```

## 📈 Calibração do Modelo

Para treinar o modelo com dados reais:

1. Colete dados históricos com produtividade real conhecida
2. Prepare arquivo JSON no formato:
```json
[
  {"ndvi_mean": 0.82, "gdd_total": 1800, "precip_total": 500, "produtividade": 12.5},
  {"ndvi_mean": 0.75, "gdd_total": 1750, "precip_total": 450, "produtividade": 11.2}
]
```
3. Execute treinamento:
```bash
python3 modelo_estimativa.py --train dados.json --cultura milho
```

## 📝 Dependências

### Backend:
```bash
npm install express-validator
```

### ML (Python):
```bash
pip install scikit-learn numpy
```

### Frontend:
```bash
npm install react-router-dom
```
