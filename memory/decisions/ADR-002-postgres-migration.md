# ADR-002: Migração para PostgreSQL/PostGIS

## Status
🔄 **Em Progresso** - 2026-02-09

## Contexto
O AgroFocus atualmente usa dados mockados (arrays em memória). Para produção real, precisamos:
- Persistência de dados
- Geoprocessamento (cálculos de área, interseções)
- Multi-tenant (várias fazendas)
- Relacionamentos complexos

## Decisão
Migrar para **PostgreSQL 15** com extensão **PostGIS**.

## Consequências

### Positivas:
- ✅ Banco relacional robusto e open-source
- ✅ PostGIS = funcionalidades GIS completas
- ✅ Suporte a JSON/GeoJSON nativo
- ✅ Boa integração com Node.js (`pg`)
- ✅ Dockerizado para fácil deploy

### Negativas:
- ⚠️ Curva de aprendizado PostGIS
- ⚠️ Schema mais complexo
- ⚠️ Necessita migrations

## Schema

**12 tabelas principais:**
- `usuarios`, `fazendas`, `talhoes`, `safras`
- `ocorrencias`, `inspecoes`
- `atividades`, `operadores`, `equipamentos`
- `insumos`, `despesas`, `permissoes_fazendas`

## Tipos Geoespaciais

```sql
-- Geometria dos talhões
coordenadas geometry(Polygon, 4326)

-- Cálculos espaciais
SELECT ST_Area(geometria) FROM talhoes;
SELECT ST_Centroid(geometria) FROM talhoes;
```

## Implementação

**Schema:** `/database/schema-completo.sql`
**Models:** `/backend/src/models/db.models.js`
**Connection:** `/backend/src/config/database.js`

## Próximos Passos
- [ ] Corrigir erro de tipo GEOJSON → geometry
- [ ] Ativar em produção
- [ ] Migrar dados mockados
