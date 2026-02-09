# Decisões Arquiteturais - AgroFocus

Este diretório contém Architecture Decision Records (ADRs) do projeto AgroFocus.

## O que são ADRs?

ADRs documentam decisões arquiteturais importantes que afetam o projeto. Cada ADR segue o formato:

1. **Título** e número
2. **Status** (proposto/aceito/deprecado)
3. **Contexto** - Por que precisamos decidir?
4. **Decisão** - O que foi decidido?
5. **Consequências** - Positivas e negativas
6. **Alternativas** - O que foi considerado e rejeitado?

## ADRs Atuais

| ADR | Título | Status | Data |
|-----|--------|--------|------|
| [ADR-001](ADR-001-gee-python.md) | Uso de Python para GEE | ✅ Aceito | 2026-02-09 |
| [ADR-002](ADR-002-postgres-migration.md) | Migração para PostgreSQL | 🔄 Em Progresso | 2026-02-09 |
| [ADR-003](ADR-003-pwa-offline.md) | PWA com Offline | ✅ Aceito | 2026-02-09 |

## Como Criar Novo ADR

```bash
# Próximo número disponível
# Copiar template e preencher
# Commitar no git
```

## Template

```markdown
# ADR-XXX: Título

## Status
📝 Proposto | ✅ Aceito | ❌ Rejeitado | 🔄 Em Progresso

## Contexto
Descrição do problema.

## Decisão
O que foi decidido.

## Consequências
### Positivas:
- ✅ ...

### Negativas:
- ⚠️ ...

## Alternativas Consideradas
| Alternativa | Motivo |
|-------------|--------|
| Opção A | Rejeitada porque... |

## Implementação
Detalhes técnicos.
```
