# Testes de Notificações Push - AgroFocus

## 1. Obter chave VAPID (público)
```bash
curl -s http://localhost:3002/api/notificacoes/vapid-public-key
```

## 2. Login (obter token)
```bash
curl -s -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@agrofocus.com","senha":"admin123"}'
```

## 3. Registrar Subscription (após login)
```bash
TOKEN="SEU_TOKEN_AQUI"
curl -s -X POST http://localhost:3002/api/notificacoes/subscribe \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "subscription": {
      "endpoint": "https://fcm.googleapis.com/fcm/send/EXEMPLO_DE_ENDPOINT",
      "keys": {
        "p256dh": "BDcAVxBz...",
        "auth": "auth_token..."
      }
    },
    "usuario_id": "1"
  }'
```

## 4. Enviar Notificação Push
```bash
TOKEN="SEU_TOKEN_AQUI"
curl -s -X POST http://localhost:3002/api/notificacoes/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "titulo": "🔬 Análise Pronta!",
    "corpo": "Seu diagnóstico está disponível",
    "icone": "/logo192.png",
    "url": "/inspecao",
    "usuario_ids": ["1"]
  }'
```

## 5. Listar Subscriptions
```bash
TOKEN="SEU_TOKEN_AQUI"
curl -s http://localhost:3002/api/notificacoes/subscriptions \
  -H "Authorization: Bearer $TOKEN"
```

## 6. Listar Histórico de Notificações
```bash
TOKEN="SEU_TOKEN_AQUI"
curl -s "http://localhost:3002/api/notificacoes/historico?limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

## 7. Criar Inspeção Pendentecurl -s -X POST http://localhost:3002/api/inspecoes/pendentes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "fotos": ["data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD..."],
    "cultura": "Soja",
    "talhao_id": "1",
    "talhao_nome": "Talhão A1",
    "fazenda_id": "1",
    "fazenda_nome": "Fazenda São João",
    "latitude": -21.123456,
    "longitude": -47.123456,
    "observacoes": "Manchas nas folhas observadas"
  }'
```

## 8. Analisar Inspeção (dispara notificação push)
```bash
curl -s -X POST http://localhost:3002/api/inspecoes/pendentes/123456/analisar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "tipo": "Ferrugem Asiática",
    "categoria": "doenca",
    "severidade": "media",
    "confianca": 0.92,
    "descricao": "Detectado: Ferrugem Asiática em estágio inicial",
    "recomendacao": "Aplicar fungicida nas próximas 48h",
    "sintomas": ["Manchas castanhas", "Pústulas amarelas"],
    "produtosSugeridos": ["Fungicida X", "Fungicida Y"],
    "prazoAcao": "48 horas"
  }'
```

## Teste Completo Manual

1. Abra o Chrome DevTools (F12)
2. Vá para Application > Service Workers
3. Verifique se há um service worker registrado
4. Vá para Application > Push
5. Simule uma notificação push

## Teste via Frontend

1. Faça login no sistema
2. Clique no ícone de sino no header
3. Permita notificações quando solicitado
4. Verifique se o status muda para verde
5. Crie uma inspeção em /inspecao
6. Vá para /especialista e analise a inspeção
7. A notificação push deve aparecer

## Payload de Notificação

```json
{
  "notification": {
    "title": "🔬 Análise Pronta!",
    "body": "Seu diagnóstico está disponível",
    "icon": "/logo192.png",
    "badge": "/badge-72x72.png",
    "data": {
      "url": "/inspecao/123/resultado",
      "inspecao_id": "123",
      "tipo": "analise_pronta"
    },
    "actions": [
      { "action": "open", "title": "Ver Análise" },
      { "action": "dismiss", "title": "Fechar" }
    ],
    "requireInteraction": true,
    "tag": "analise-123",
    "renotify": true
  }
}
```

## Configuração do .env

```env
VAPID_PUBLIC_KEY=BLsYzBJnYZBLew2KMXGrkIRHQcGbo8RsNWzps1H15YPaIvTqK9m-eWqEhVrdOJGD9vqoN5yNLa3JIDCXDBSXZUU
VAPID_PRIVATE_KEY=jmfchDJQliLkyWsF1yPhQj1azTVMkXhD2w2DtOlVYpI
VAPID_SUBJECT=mailto:admin@agrofocus.com
```

## Arquivos Criados/Modificados

### Backend
- `src/routes/notificacoes.routes.js` - Rotas de notificações push
- `src/routes/inspecao-especialista.routes.js` - Atualizado para enviar notificações
- `src/server.js` - Adicionadas rotas de notificações
- `.env` - Adicionadas variáveis VAPID

### Frontend
- `public/service-worker.js` - Service worker para push
- `public/manifest.json` - Manifesto PWA
- `src/hooks/usePushNotifications.ts` - Hook para gerenciar push
- `src/components/NotificationBadge.tsx` - Componente de badge
- `src/context/AuthContext.tsx` - Registra subscription ao logar
- `src/App.tsx` - Integrado badge no header
- `index.html` - Adicionado manifest e theme-color
