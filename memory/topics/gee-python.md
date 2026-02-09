# Tópico: Google Earth Engine (GEE) - Serviço Python

## 🎯 Objetivo
Substituir o serviço Node.js @google/earthengine (bug v1.7.12) por um serviço Python estável.

---

## 📁 Localização

```
/home/clawdbot_user/clawd/booster_agro/gee-service/
├── app.py                 # API Flask principal
├── requirements.txt       # Dependências Python
├── Dockerfile            # Container
├── docker-compose.yml    # Orquestração
├── start.sh              # Script de inicialização
├── test_examples.sh      # Exemplos de teste
├── README.md             # Documentação
└── TROUBLESHOOTING.md    # Guia de problemas
```

---

## 🔌 Endpoints

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/health` | GET | Health check |
| `/ndvi` | POST | Calcular NDVI para área |
| `/ndre` | POST | Calcular NDRE para área |
| `/msavi` | POST | Calcular MSAVI para área |

### Exemplo de uso:
```bash
curl -X POST http://localhost:5001/ndvi \
  -H "Content-Type: application/json" \
  -d '{
    "geojson": {
      "type": "Polygon",
      "coordinates": [[[-46.6413,-23.5505],[-46.6313,-23.5505],[-46.6313,-23.5405],[-46.6413,-23.5405],[-46.6413,-23.5505]]]
    },
    "startDate": "2024-01-01",
    "endDate": "2024-02-01",
    "cloudCover": 20
  }'
```

---

## ⚙️ Configuração

### Variáveis de Ambiente:
- `GEE_PROJECT_ID`
- `GEE_CLIENT_EMAIL`
- `GEE_PRIVATE_KEY`

### Credenciais:
Arquivo: `/backend/config/gee-credentials.json`

---

## 🚨 Problema Atual

**Status:** ⚠️ Credenciais em formato incorreto

**Erro:**
```
Could not deserialize key data. The data may be in an incorrect format
```

**Solução:**
1. Acessar https://console.cloud.google.com/iam-admin/serviceaccounts
2. Criar nova chave JSON
3. Substituir arquivo em `/backend/config/gee-credentials.json`

---

## 🔄 Status

- **Implementação:** ✅ 100%
- **Testes:** ⚠️ Bloqueado (credenciais)
- **Deploy:** ✅ Online (porta 5001)

---

## 📝 Decisões

**Decisão:** Usar Python ao invés de Node.js
- **Motivo:** Bug na biblioteca @google/earthengine v1.7.12
- **Impacto:** Node.js 25 incompatível
- **Alternativa:** Aguardar correção Google (incerto)

---

## 🔗 Relacionado

- ADR: `decisions/ADR-001-gee-python.md`
- Data: 2026-02-09
- Agent: Agent-GEE-Python
