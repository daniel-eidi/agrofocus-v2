# AgroFocus v2.0 - Memória Estruturada

## 📋 Sistema de Memória

Este diretório contém a memória organizada do projeto AgroFocus, dividida por tópicos e datas.

## 📁 Estrutura

```
memory/
├── README.md                 # Este arquivo
├── 2026-02-09.md            # Resumo do dia (hoje)
├── topics/                  # Memória por tópico
│   ├── gee-python.md       # Google Earth Engine (serviço Python)
│   ├── postgres.md         # Banco de dados PostgreSQL
│   ├── mobile-pwa.md       # PWA e funcionalidades mobile
│   ├── notificacoes.md     # Sistema de push notifications
│   └── autenticacao.md     # JWT e permissões
└── decisions/              # Decisões arquiteturais (ADRs)
    ├── ADR-001-geee-python.md
    ├── ADR-002-postgres-migration.md
    └── ADR-003-pwa-offline.md
```

## 🔄 Como Usar

### Adicionar nova memória diária:
```bash
# Criar arquivo YYYY-MM-DD.md em /memory/
```

### Adicionar contexto de tópico:
```bash
# Editar arquivo em /memory/topics/{topico}.md
```

### Registrar decisão arquitetural:
```bash
# Criar ADR em /memory/decisions/ADR-XXX-titulo.md
```

## 📊 Status Atual

- **Versão:** 2.0.0
- **Status Deploy:** ✅ Online (modo degradado - PostgreSQL pendente)
- **Último Deploy:** 2026-02-09
- **Serviços Ativos:** Backend API, GEE Python

## 🔗 Links

- **Produção:** https://agrofocus.agvant.com.br
- **Repositório:** https://github.com/daniel-eidi/agrofocus-v2
- **Documentação:** Ver arquivos em /docs
