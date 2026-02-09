# Tópico: Notificações Push

## 🎯 Objetivo
Implementar sistema de notificações push para alertar usuários sobre análises.

---

## 📁 Arquivos

```
backend/src/
├── routes/
│   └── notificacoes.routes.js      # Endpoints push
├── routes/
│   └── inspecao-especialista.routes.js  # Integração
└── database/
    └── notificacoes_schema.sql     # Tabela subscriptions

frontend/src/
├── hooks/
│   └── usePushNotifications.ts     # Hook React
├── components/
│   └── NotificationBadge.tsx       # Badge no header
└── context/
    └── AuthContext.tsx             # Registro ao logar
```

---

## 🔌 Endpoints

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/notificacoes/vapid-public-key` | GET | Chave pública VAPID |
| `/api/notificacoes/subscribe` | POST | Registrar subscription |
| `/api/notificacoes/send` | POST | Enviar notificação |
| `/api/notificacoes/historico` | GET | Histórico de notificações |

---

## 📨 Fluxo de Notificação

### Quando especialista analisa:
```javascript
// 1. Especialista submete análise
POST /api/inspecoes/:id/analisar

// 2. Backend envia push
webpush.sendNotification(subscription, {
  title: "🔬 Análise Pronta!",
  body: "Seu diagnóstico está disponível",
  url: "/inspecao"
});

// 3. Operador recebe no celular
// 4. Clica e abre o app
```

---

## 🔐 VAPID Keys

**Configuração em `.env`:**
```
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@agrofocus.com
```

**Geração:**
```bash
npx web-push generate-vapid-keys
```

---

## 🔄 Status

- **Backend:** ✅ Implementado
- **Frontend:** ✅ Implementado
- **Integração:** ✅ Com inspeções
- **Testes:** ⚠️ Pendentes

---

## 🧪 Testar

```bash
# 1. Obter subscription do navegador
# Chrome DevTools → Application → Service Workers

# 2. Enviar notificação via curl
curl -X POST http://localhost:3002/api/notificacoes/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "titulo": "🔬 Análise Pronta!",
    "corpo": "Seu diagnóstico está disponível",
    "url": "/inspecao",
    "usuario_ids": ["1"]
  }'
```

---

## 🔗 Relacionado

- Data: 2026-02-09
- Agent: Agent-Backend-Notifications
- Integração: Painel Especialista (/especialista)
