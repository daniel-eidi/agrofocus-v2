# AgroFocus - Migração PostgreSQL

Este documento descreve a migração do backend AgroFocus de dados mockados para PostgreSQL com PostGIS.

## 📁 Estrutura de Arquivos

```
booster_agro/
├── database/
│   ├── schema-completo.sql      # Schema completo do banco
│   ├── seed.sql                 # Dados iniciais
│   └── setup.js                 # Script de setup
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js      # Configuração de conexão
│   │   ├── models/
│   │   │   └── db.models.js     # Models PostgreSQL
│   │   ├── routes/
│   │   │   ├── auth.routes.js   # Autenticação (atualizado)
│   │   │   ├── fazendas.routes.js      # CRUD Fazendas
│   │   │   ├── talhoes-db.routes.js    # CRUD Talhões + GeoJSON
│   │   │   ├── ocorrencias.routes.js   # CRUD Ocorrências
│   │   │   └── inspecoes.routes.js     # CRUD Inspeções
│   │   └── server.js            # Server principal
│   ├── .env.example             # Exemplo de variáveis
│   └── Dockerfile
└── docker-compose.yml           # Stack completo
```

## 🚀 Setup Rápido

### Opção 1: Docker (Recomendado)

```bash
# Iniciar todos os serviços
docker-compose up -d

# Verificar logs
docker-compose logs -f backend

# Parar
docker-compose down
```

### Opção 2: PostgreSQL Local

```bash
# 1. Instalar PostgreSQL com PostGIS
# Ubuntu/Debian:
sudo apt-get install postgresql postgresql-contrib postgis

# 2. Criar banco de dados
sudo -u postgres createdb agrofocus
sudo -u postgres psql -d agrofocus -c "CREATE EXTENSION postgis;"

# 3. Configurar variável de ambiente
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/agrofocus"

# 4. Rodar setup
cd /home/clawdbot_user/clawd/booster_agro
node database/setup.js --seed

# 5. Iniciar backend
cd backend
npm install
npm run dev
```

## 📊 Schema do Banco

### Tabelas Principais

| Tabela | Descrição |
|--------|-----------|
| `usuarios` | Usuários do sistema |
| `fazendas` | Fazendas com geometria geoespacial |
| `talhoes` | Talhões com geometria Polygon |
| `safras` | Safras agrícolas |
| `ocorrencias` | Registro de pragas/doenças |
| `inspecoes` | Inspeções para especialista |
| `permissoes_fazendas` | Controle de acesso |
| `atividades` | Atividades operacionais |
| `operadores` | Operadores da fazenda |
| `equipamentos` | Equipamentos |
| `insumos` | Estoque de insumos |
| `despesas` | Controle financeiro |

### Views

- `v_fazendas_resumo` - Fazendas com contagem de talhões
- `v_talhoes_completos` - Talhões com dados relacionados
- `v_ocorrencias_completas` - Ocorrências com joins
- `v_inspecoes_pendentes` - Inspeções pendentes

## 🔌 Endpoints API

### Autenticação
```
POST   /api/auth/login
POST   /api/auth/registro
GET    /api/auth/minhas-fazendas
GET    /api/auth/perfil
```

### Fazendas
```
GET    /api/fazendas              # Listar
POST   /api/fazendas              # Criar
GET    /api/fazendas/:id          # Detalhes
PUT    /api/fazendas/:id          # Atualizar
DELETE /api/fazendas/:id          # Excluir
GET    /api/fazendas/:id/talhoes  # Talhões da fazenda
GET    /api/fazendas/:id/resumo   # Dashboard
```

### Talhões (PostgreSQL)
```
GET    /api/talhoes-db                    # Listar
POST   /api/talhoes-db                    # Criar
GET    /api/talhoes-db/:id                # Detalhes
GET    /api/talhoes-db/:id/geojson        # GeoJSON do talhão
PUT    /api/talhoes-db/:id                # Atualizar
DELETE /api/talhoes-db/:id                # Excluir
GET    /api/talhoes-db/proximos/pesquisar # Buscar próximos
GET    /api/talhoes-db/geojson/todos      # FeatureCollection
```

### Ocorrências
```
GET    /api/ocorrencias                    # Listar
POST   /api/ocorrencias                    # Criar
GET    /api/ocorrencias/:id                # Detalhes
PUT    /api/ocorrencias/:id                # Atualizar
DELETE /api/ocorrencias/:id                # Excluir
GET    /api/ocorrencias/estatisticas/resumo # Estatísticas
```

### Inspeções
```
GET    /api/inspecoes                    # Listar
POST   /api/inspecoes/pendentes          # Criar inspeção
GET    /api/inspecoes/pendentes          # Listar pendentes (especialista)
GET    /api/inspecoes/pendentes/:id      # Detalhes da inspeção
POST   /api/inspecoes/pendentes/:id/analisar  # Analisar (especialista)
POST   /api/inspecoes/pendentes/:id/rejeitar  # Rejeitar
GET    /api/inspecoes/:id/status         # Status para operador
```

## 🧪 Testes com curl

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@agrofocus.com","senha":"admin123"}' | jq -r '.token')

# 2. Listar fazendas
curl -s http://localhost:3002/api/fazendas \
  -H "Authorization: Bearer $TOKEN" | jq

# 3. Listar talhões com GeoJSON
curl -s http://localhost:3002/api/talhoes-db \
  -H "Authorization: Bearer $TOKEN" | jq

# 4. Criar talhão com geometria
curl -s -X POST http://localhost:3002/api/talhoes-db \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Talhão Novo",
    "area_hectares": 25.5,
    "tipo_solo": "Latossolo",
    "fazenda_id": 1,
    "geometria": {
      "type": "Polygon",
      "coordinates": [[[-47.14,-21.14],[-47.12,-21.14],[-47.12,-21.12],[-47.14,-21.12],[-47.14,-21.14]]]
    }
  }' | jq

# 5. Listar ocorrências
curl -s http://localhost:3002/api/ocorrencias \
  -H "Authorization: Bearer $TOKEN" | jq

# 6. Criar ocorrência
curl -s -X POST http://localhost:3002/api/ocorrencias \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "Lagarta",
    "categoria": "praga",
    "titulo": "Infestação detectada",
    "descricao": "Presença de lagartas na área norte",
    "severidade": "alta",
    "talhao_id": 1,
    "latitude": -21.13,
    "longitude": -47.13
  }' | jq
```

## 🔍 Comandos psql Úteis

```bash
# Conectar ao banco
psql -U postgres -d agrofocus

# Listar tabelas
\dt

# Ver schema de uma tabela
\d talhoes

# Consultar fazendas com geometria
SELECT id, nome, ST_AsGeoJSON(geometria) as geojson FROM fazendas;

# Buscar talhões em um raio de 10km
SELECT t.nome, ST_Distance(t.centroide::geography, 
  ST_SetSRID(ST_MakePoint(-47.13, -21.13), 4326)::geography) as distancia
FROM talhoes t
WHERE ST_DWithin(t.centroide::geography, 
  ST_SetSRID(ST_MakePoint(-47.13, -21.13), 4326)::geography, 10000);

# Contar ocorrências por status
SELECT status, COUNT(*) FROM ocorrencias GROUP BY status;
```

## ⚙️ Variáveis de Ambiente

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `DATABASE_URL` | URL de conexão PostgreSQL | ✅ |
| `JWT_SECRET` | Chave secreta para tokens | ✅ |
| `GEE_PROJECT_ID` | Google Earth Engine Project | ❌ |
| `GEE_CLIENT_EMAIL` | GEE Service Account | ❌ |
| `GEE_PRIVATE_KEY` | GEE Private Key | ❌ |
| `OPENAI_API_KEY` | OpenAI API Key | ❌ |
| `PORT` | Porta do servidor (padrão: 3002) | ❌ |

## 📝 Notas de Migração

1. **Autenticação JWT mantida** - O sistema de tokens JWT continua o mesmo
2. **Rotas originais preservadas** - `/api/talhoes` continua funcionando (GEE)
3. **Novas rotas em paralelo** - `/api/talhoes-db` para CRUD com PostgreSQL
4. **GeoJSON nativo** - Suporte completo a geometria espacial
5. **Triggers automáticos** - `updated_at` atualizado automaticamente

## 🐛 Troubleshooting

### Erro: "PostGIS não encontrado"
```sql
-- Habilitar extensão
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Erro: "Conexão recusada"
- Verifique se PostgreSQL está rodando: `sudo service postgresql status`
- Verifique DATABASE_URL no .env
- Verifique firewall/porta 5432

### Erro: "Permissão negada"
- Verifique usuário/senha no DATABASE_URL
- Verifique se o banco "agrofocus" existe

## 🔄 Próximos Passos

- [ ] Implementar migrações automatizadas (node-pg-migrate)
- [ ] Adicionar cache Redis para queries frequentes
- [ ] Implementar replicação para leituras
- [ ] Adicionar índices adicionais conforme necessário
