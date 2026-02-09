# Tópico: PostgreSQL / PostGIS

## 🎯 Objetivo
Migrar dados mockados para PostgreSQL real com suporte geoespacial.

---

## 📁 Arquivos

```
database/
├── schema-completo.sql    # Schema completo (12 tabelas)
├── schema.sql            # Schema original (backup)
├── seed.sql              # Dados iniciais
└── setup.js              # Script de setup

backend/src/
├── config/database.js    # Configuração de conexão
└── models/db.models.js   # Models para PostgreSQL
```

---

## 🗄️ Schema (12 Tabelas)

| Tabela | Descrição |
|--------|-----------|
| `usuarios` | Autenticação JWT |
| `fazendas` | Propriedades rurais |
| `talhoes` | Áreas com geometria PostGIS |
| `safras` | Períodos de cultivo |
| `ocorrencias` | Registros de pragas/doenças |
| `inspecoes` | Inspeções de campo |
| `permissoes_fazendas` | ACL (Access Control List) |
| `atividades` | Atividades agrícolas |
| `operadores` | Funcionários |
| `equipamentos` | Máquinas e implementos |
| `insumos` | Estoque de insumos |
| `despesas` | Controle financeiro |

---

## 🔌 Endpoints PostgreSQL

### Fazendas:
```
GET    /api/fazendas
POST   /api/fazendas
GET    /api/fazendas/:id
PUT    /api/fazendas/:id
DELETE /api/fazendas/:id
GET    /api/fazendas/:id/talhoes
GET    /api/fazendas/:id/resumo
```

### Talhões (com GeoJSON):
```
GET    /api/talhoes-db
POST   /api/talhoes-db
GET    /api/talhoes-db/:id
GET    /api/talhoes-db/:id/geojson
GET    /api/talhoes-db/geojson/todos
PUT    /api/talhoes-db/:id
DELETE /api/talhoes-db/:id
```

### Ocorrências:
```
GET    /api/ocorrencias
POST   /api/ocorrencias
GET    /api/ocorrencias/:id
PUT    /api/ocorrencias/:id
DELETE /api/ocorrencias/:id
```

---

## 🚨 Problema Atual

**Status:** ⚠️ Schema com erro de tipo

**Erro:**
```sql
ERROR: type "geojson" does not exist
LINE 10: coordenadas GEOJSON,
```

**Causa:** Tipo `GEOJSON` não existe no PostGIS

**Solução:** Usar `geometry(Polygon, 4326)`

```sql
-- Correção:
coordenadas geometry(Polygon, 4326),
```

---

## 🔄 Status

- **Schema:** ✅ Criado (12 tabelas)
- **Models:** ✅ Implementados
- **Rotas:** ✅ Criadas
- **Docker:** ✅ Configurado
- **Ativação:** ⚠️ Bloqueado (erro de tipo)

---

## 📊 Dados

**Seed inclui:**
- 2 fazendas de exemplo
- 5 talhões com geometria
- 1 usuário admin

---

## 🔗 Relacionado

- ADR: `decisions/ADR-002-postgres-migration.md`
- Data: 2026-02-09
- Agent: Agent-DB-Postgres
