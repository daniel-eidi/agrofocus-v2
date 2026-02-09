# Tópico: PWA (Progressive Web App)

## 🎯 Objetivo
Transformar o AgroFocus em PWA completo com funcionalidades offline.

---

## 📁 Arquivos Criados

```
frontend/
├── public/
│   ├── service-worker.js      # 581 linhas - cache completo
│   └── manifest.json          # Atualizado
├── src/
│   ├── hooks/
│   │   ├── usePWA.ts         # Gerenciamento PWA
│   │   └── usePushNotifications.ts  # Push API
│   ├── components/
│   │   ├── InstallButton.tsx      # Botão instalar
│   │   └── OfflineStatus.tsx      # Banner offline
│   ├── services/
│   │   └── indexedDB.ts          # Operações offline
│   └── pages/
│       └── PWADiagnostics.tsx    # Página diagnóstico
└── index.html                  # Meta tags PWA
```

---

## 🚀 Funcionalidades

| Feature | Status | Descrição |
|---------|--------|-----------|
| Cache de assets | ✅ | CSS, JS, HTML em cache |
| Cache de API | ✅ | Dados da API em cache |
| Cache de fotos | ✅ | Fotos da inspeção offline |
| IndexedDB | ✅ | Inspeções pendentes |
| Background Sync | ✅ | Sincronização automática |
| Install Prompt | ✅ | Botão "Adicionar à tela" |
| iOS Install | ✅ | Guia para Safari iOS |
| Offline Status | ✅ | Banner visual |
| Push Notifications | ✅ | Integrado |

---

## 📱 Service Worker

### Estratégias:
- **Cache First:** Assets estáticos
- **Network First:** API calls
- **Background Sync:** Inspeções pendentes

### Eventos:
```javascript
self.addEventListener('install', ...);
self.addEventListener('fetch', ...);
self.addEventListener('sync', ...);
self.addEventListener('push', ...);
```

---

## 📲 Manifest.json

```json
{
  "theme_color": "#166534",
  "background_color": "#ffffff",
  "display": "standalone",
  "orientation": "portrait",
  "scope": "/",
  "start_url": "/"
}
```

---

## 🔧 IndexedDB

### Stores:
- `inspecoes-pendentes` - Inspeções para sincronizar
- `fotos-cache` - Cache de fotos
- `api-cache` - Respostas da API

### Fluxo offline:
1. Usuário cria inspeção offline
2. Dados salvos no IndexedDB
3. Background sync agenda envio
4. Quando online, sincroniza automaticamente

---

## 🔄 Status

- **Implementação:** ✅ 100%
- **Build:** ✅ Passou
- **Testes:** ⚠️ Pendentes em dispositivo real
- **Lighthouse:** ⚠️ Ainda não auditado

---

## 🧪 Testar

```bash
# Build
npm run build

# Teste offline
# Chrome DevTools → Network → Offline

# Lighthouse
# Chrome DevTools → Lighthouse → PWA
```

---

## 🔗 Relacionado

- ADR: `decisions/ADR-003-pwa-offline.md`
- Data: 2026-02-09
- Agent: Agent-Mobile-PWA
