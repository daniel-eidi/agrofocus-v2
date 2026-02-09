# AgroFocus - Sistema de Gestão Agrícola Inteligente

Sistema completo para gestão de fazendas com monitoramento por satélite, controle financeiro, gestão de atividades e predição de produtividade usando Machine Learning.

## Módulos

### 1. Cadastros
- Fazendas (com polígonos GeoJSON)
- Safras (períodos de cultivo)
- Talhões (áreas com geometria PostGIS)
- Operadores (funcionários)
- Equipamentos (frota)

### 2. Monitoramento
- Mapas de NDVI, NDRE, MSAVI
- Timeline de imagens de satélite
- Integração com Google Earth Engine

### 3. Controle Financeiro
- Despesas por categoria
- Receitas
- Dashboard financeiro

### 4. Atividades
- Calendário de operações
- Apontamento de produtividade
- Controle de mão de obra e equipamentos

### 5. Ocorrências
- Registro de pragas/doenças
- Fotos com geolocalização
- Análise por IA

### 6. Estoque
- Controle de insumos
- Movimentações de entrada/saída
- Alertas de estoque baixo

### 7. Meteorologia
- Previsão do tempo
- GDD acumulado
- Dados climáticos

### 8. Produtividade
- Predição ML
- Delineamento de zonas
- Mapas de prescrição

## Tecnologias

### Backend
- Python 3.11
- FastAPI
- SQLAlchemy
- PostgreSQL + PostGIS
- Google Earth Engine
- Scikit-learn

### Frontend
- React 18
- TypeScript
- Vite
- Leaflet (mapas)
- Chart.js
- FullCalendar

## Instalação

```bash
# Subir o banco de dados
docker-compose up -d db

# Instalar dependências do backend
cd backend
pip install -r requirements.txt

# Rodar o backend
uvicorn src.main:app --reload

# Instalar dependências do frontend
cd frontend
npm install

# Rodar o frontend
npm run dev
```

## Variáveis de Ambiente

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agrofocus
OPENWEATHER_API_KEY=sua_chave_aqui
GEE_PROJECT_ID=seu_projeto_gee
```
