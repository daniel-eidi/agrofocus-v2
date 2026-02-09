# 📱 Sistema de Notificações Push - AgroFocus

## ✅ Implementação Concluída

Sistema de notificações push para alertar usuários sobre análises de inspeção em tempo real.

---

## 🏗️ Estrutura Implementada

### Backend (Node.js)

| Arquivo | Descrição |
|---------|-----------|
| `src/routes/notificacoes.routes.js` | Rotas de notificações push (subscribe, send, historico) |
| `src/routes/inspecao-especialista.routes.js` | Atualizado para enviar notificação ao analisar |
| `src/server.js` | Integração das rotas de notificações |
| `src/database/notificacoes_schema.sql` | Schema PostgreSQL para subscriptions |
| `.env` | Variáveis VAPID configuradas |

### Frontend (React)

| Arquivo | Descrição |
|---------|-----------|
| `public/service-worker.js` | Service worker para receber push |
| `public/manifest.json` | Manifesto PWA |
| `src/hooks/usePushNotifications.ts` | Hook para gerenciar notificações |
| `src/components/NotificationBadge.tsx` | Badge de status no header |
| `src/context/AuthContext.tsx` | Registra subscription ao logar |
| `src/App.tsx` | Integração do badge |
| `index.html` | Manifest e theme-color |

---

## 🔧 Endpoints Criados

```
GET  /api/notificacoes/vapid-public-key  → Chave pública VAPID
POST /api/notificacoes/subscribe         → Registrar subscription
POST /api/notificacoes/unsubscribe       → Remover subscription
POST /api/notificacoes/send              → Enviar notificação
GET  /api/notificacoes/historico         → Histórico de envios
GET  /api/notificacoes/subscriptions     → Listar subscriptions (admin)
```

---

## 🔄 Fluxo de Funcionamento

### 1. Login do Usuário
```
Usuário faz login 
  ↓
AuthContext.registrarPushSubscription()
  ↓
Se já existe subscription → Envia para backend
```

### 2. Ativar Notificações (manual)
```
Usuário clica no badge de sino
  ↓
Solicita permissão do navegador
  ↓
Registra service worker
  ↓
Obtém VAPID key do backend
  ↓
Cria subscription no PushManager
  ↓
Envia subscription para /api/notificacoes/subscribe
  ↓
Badge fica verde ✅
```

### 3. Especialista Analisa
```
POST /api/inspecoes/:id/analisar
  ↓
Salva análise
  ↓
enviarNotificacaoAnalise()
  ↓
Busca subscriptions do operador
  ↓
Enviar notificação push via web-push
  ↓
Usuário recebe notificação nativa
```

---

## 📋 Variáveis de Ambiente

```env
VAPID_PUBLIC_KEY=BLsYzBJnYZBLew2KMXGrkIRHQcGbo8RsNWzps1H15YPaIvTqK9m-eWqEhVrdOJGD9vqoN5yNLa3JIDCXDBSXZUU
VAPID_PRIVATE_KEY=jmfchDJQliLkyWsF1yPhQj1azTVMkXhD2w2DtOlVYpI
VAPID_SUBJECT=mailto:admin@agrofocus.com
```

---

## 🧪 Testes

### Exemplo de curl para enviar notificação:
```bash
TOKEN="seu_token"
curl -s -X POST http://localhost:3002/api/notificacoes/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "titulo": "🔬 Análise Pronta!",
    "corpo": "Seu diagnóstico está disponível",
    "url": "/inspecao",
    "usuario_ids": ["1"]
  }'
```

### Teste no Chrome DevTools:
1. Abra Chrome → F12 → Application → Service Workers
2. Verifique se há um SW registrado em `/service-worker.js`
3. Vá para Application → Push
4. Simule uma notificação push

---

## 🚀 Próximos Passos (Opcionais)

1. **Persistência no PostgreSQL**: Substituir Map() por tabela real
2. **Notificações não lidas**: Adicionar badge com contador
3. **Notificações agendadas**: Agendar lembretes de ações
4. **Notificações em massa**: Enviar para todos os usuários de uma fazenda
5. **Logs de entrega**: Rastrear se notificação foi entregue/aberta

---

## 📝 Resumo dos Arquivos

```
booster_agro/
├── backend/
│   ├── .env                           (+ VAPID keys)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── notificacoes.routes.js       (NOVO)
│   │   │   └── inspecao-especialista.routes.js  (ATUALIZADO)
│   │   ├── database/
│   │   │   └── notificacoes_schema.sql      (NOVO)
│   │   └── server.js                        (ATUALIZADO)
│   └── node_modules/web-push                (INSTALADO)
│
├── frontend/
│   ├── index.html                           (ATUALIZADO)
│   ├── public/
│   │   ├── manifest.json                    (EXISTENTE)
│   │   └── service-worker.js                (NOVO)
│   └── src/
│       ├── hooks/
│       │   └── usePushNotifications.ts      (NOVO)
│       ├── components/
│       │   └── NotificationBadge.tsx        (NOVO)
│       ├── context/
│       │   └── AuthContext.tsx              (ATUALIZADO)
│       └── App.tsx                          (ATUALIZADO)
│
└── TESTES_NOTIFICACOES.md                   (NOVO)
```

---

## 🎉 Conclusão

✅ Backend configurado com web-push  
✅ VAPID keys geradas e configuradas  
✅ Service worker criado para push  
✅ Hook usePushNotifications implementado  
✅ Badge de notificações no header  
✅ Integração automática ao logar  
✅ Notificação enviada ao analisar inspeção  
✅ Schema PostgreSQL para persistência  

**O sistema está pronto para uso!** 🚀
