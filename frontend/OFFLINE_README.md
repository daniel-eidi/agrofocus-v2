# Sistema de Cache Offline - Booster Agro

Sistema completo de funcionalidade offline para uso em campo por produtores rurais.

## 📁 Estrutura de Arquivos

```
/booster_agro/frontend/src/
├── service-worker.js              # Service Worker principal
├── utils/
│   ├── offlineDB.js               # IndexedDB wrapper
│   ├── syncQueue.js               # Gerenciador de fila de sync
│   ├── swRegistration.js          # Registro do SW
│   └── offlineManager.js          # API unificada
├── hooks/
│   └── useOffline.js              # Hook React para estado offline
└── components/OfflineStatus/
    ├── OfflineStatus.jsx          # Componente de indicador
    ├── OfflineStatus.css          # Estilos
    └── index.js                   # Export
```

## 🚀 Como Integrar

### 1. Registrar o Service Worker (index.js)

```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { register } from './utils/swRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Registrar Service Worker
register();
```

### 2. Adicionar Indicador de Status

```javascript
import { OfflineStatus } from './components/OfflineStatus';

function App() {
  return (
    <div className="app">
      <header>
        <OfflineStatus showDetails={true} />
      </header>
      {/* ... */}
    </div>
  );
}
```

### 3. Usar o Hook useOffline

```javascript
import { useOffline } from './hooks/useOffline';

function MinhaPagina() {
  const { 
    isOnline, 
    pendingCount, 
    isSyncing, 
    syncNow 
  } = useOffline();

  return (
    <div>
      {isOnline ? '🟢 Online' : '🔴 Offline'}
      {pendingCount > 0 && (
        <button onClick={syncNow}>
          Sincronizar ({pendingCount})
        </button>
      )}
    </div>
  );
}
```

### 4. Salvar Dados Offline

```javascript
import { getOfflineManager } from './utils/offlineManager';

const manager = getOfflineManager();
await manager.init();

// Adicionar inspeção offline
await manager.addInspecao({
  talhaoId: '123',
  data: new Date().toISOString(),
  observacoes: 'Plantio em bom estado',
  problemas: [],
}, [imagemFile]);

// Adicionar operação
await manager.addOperacao({
  talhaoId: '123',
  tipo: 'APLICACAO_FERTILIZANTE',
  data: new Date().toISOString(),
  produto: 'Uréia',
  quantidade: 200,
});
```

---

## 🧪 Como Testar

### Testando Modo Offline (Chrome DevTools)

#### Método 1: Network Tab
1. Abra o Chrome DevTools (`F12` ou `Ctrl+Shift+I`)
2. Vá na aba **Network**
3. Clique no dropdown que mostra "No throttling"
4. Selecione **"Offline"**
5. A página agora está offline!

#### Método 2: Application Tab
1. Vá na aba **Application** (ou Application/APLICAÇÃO)
2. No menu lateral, selecione **Service Workers**
3. Marque a checkbox **"Offline"**
4. Recarregue a página

#### Método 3: Device Toolbar
1. Clique no ícone de device (📱) ou `Ctrl+Shift+M`
2. No menu de throttling, selecione **"Offline"**

### Verificando o Cache

1. Abra o Chrome DevTools
2. Vá na aba **Application**
3. No menu lateral, expanda **Cache Storage**
4. Você verá:
   - `static-v2.0.0` - Assets da aplicação
   - `api-v2.0.0` - Respostas de API
   - `tiles-v2.0.0` - Tiles de mapa
   - `images-v2.0.0` - Imagens

5. Clique em cada cache para ver o conteúdo

### Verificando IndexedDB

1. DevTools → **Application**
2. No menu lateral, expanda **IndexedDB**
3. Selecione **BoosterAgroDB**
4. Explore as stores:
   - `fazendas` - Dados das fazendas
   - `talhoes` - Dados dos talhões
   - `ndvi` - Dados NDVI
   - `inspecoes` - Inspeções pendentes
   - `operacoes` - Operações pendentes
   - `syncQueue` - Fila de sincronização

### Simulando Sincronização

#### Cenário 1: Criar Operação Offline
```javascript
// 1. Colocar em modo offline
// 2. Executar no console:
const manager = getOfflineManager();
await manager.addInspecao({
  talhaoId: 'test-123',
  observacoes: 'Teste offline',
});

// 3. Verificar na store 'syncQueue' (Application → IndexedDB)
```

#### Cenário 2: Sincronizar ao Voltar Online
```javascript
// 1. Verificar operações pendentes
const db = getOfflineDB();
await db.getSyncQueueStats();

// 2. Voltar online (desmarcar "Offline" no DevTools)
// 3. O sync deve iniciar automaticamente

// 4. Verificar se foi removido da fila
await db.getSyncQueueStats();
```

#### Cenário 3: Retry Automático
```javascript
// 1. Criar uma operação que vai falhar (servidor off)
// 2. Tentar sync - vai falhar
// 3. Verificar status 'retrying' na syncQueue
// 4. Aguardar - o retry é automático (5s, 10s, 30s)
```

### Testes de Cenários

#### Teste: Cache First para Assets
```
1. Online: Carregue a aplicação
2. Offline: Desconecte
3. Recarregue: A página deve carregar do cache
4. Verifique: Console deve mostrar "[SW] Service from cache"
```

#### Teste: Network First para API
```
1. Online: Faça uma requisição à API
2. Offline: Desconecte
3. Refaça: Deve retornar dados do cache (se disponíveis)
4. Verifique: Header "X-Served-From-Cache: true"
```

#### Teste: Tiles de Mapa
```
1. Online: Navegue no mapa para carregar tiles
2. Offline: Desconecte
3. Navegue na mesma área: Tiles devem aparecer do cache
4. Nova área: Tiles mostram placeholder "Offline"
```

#### Teste: Limpeza de Dados NDVI
```javascript
// Adicionar dados antigos (simulando)
const db = getOfflineDB();
await db.saveNDVI({
  talhaoId: '123',
  data: '2024-01-01', // Mais de 30 dias atrás
  valor: 0.75,
});

// Executar limpeza
await db.cleanupNDVIOldData();

// Verificar: Registro antigo deve ser removido
```

---

## 📊 Métricas de Debug

### Console do Service Worker
1. DevTools → **Application**
2. Service Workers → Selecione o SW ativo
3. Clique em **"Inspect"** para abrir console dedicado

### Comandos Úteis no Console

```javascript
// Verificar status do SW
navigator.serviceWorker.ready.then(r => console.log(r.scope));

// Listar todos os caches
caches.keys().then(keys => console.log(keys));

// Limpar todos os caches
caches.keys().then(keys => 
  Promise.all(keys.map(k => caches.delete(k)))
);

// Verificar espaço usado (estimativa)
navigator.storage.estimate().then(estimate => {
  console.log(`Usado: ${(estimate.usage / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Quota: ${(estimate.quota / 1024 / 1024).toFixed(2)} MB`);
});

// Persistir storage (evitar limpeza automática)
navigator.storage.persist().then(granted => {
  console.log(`Persistência: ${granted ? 'concedida' : 'negada'}`);
});
```

---

## 🔧 Configurações Avançadas

### Limite de Dados NDVI

```javascript
// Em offlineDB.js, método cleanupNDVIOldData
const limiteDias = 30; // Alterar conforme necessidade
```

### Tamanho Máximo de Imagens

```javascript
// Em offlineManager.js, ImageCompressor
const compressor = new ImageCompressor({
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.8,
  maxSizeKB: 500, // Alterar limite
});
```

### Retry Configuration

```javascript
// Em syncQueue.js
this.retryDelays = [5000, 10000, 30000, 60000]; // Em ms
this.maxRetries = 3;
```

---

## 🐛 Troubleshooting

### Problema: Service Worker não atualiza
**Solução:**
1. DevTools → Application → Service Workers
2. Clique **"Unregister"**
3. Recarregue a página

### Problema: Dados antigos no cache
**Solução:**
```javascript
// No console
caches.keys().then(keys => 
  Promise.all(keys.map(k => caches.delete(k)))
).then(() => location.reload());
```

### Problema: IndexedDB cheio
**Solução:**
```javascript
const db = getOfflineDB();
await db.clearAllData();
```

### Problema: Sync não inicia automaticamente
**Verifique:**
1. DevTools → Application → Service Workers
2. Verifique se "Update on reload" está marcado (para desenvolvimento)
3. Verifique console por erros no SW

---

## 📱 Testes em Dispositivos Móveis

### Chrome DevTools - Remote Debugging
1. Conecte o celular via USB
2. Chrome no PC: `chrome://inspect/#devices`
3. Selecione o dispositivo e a aba
4. Use as mesmas ferramentas de DevTools

### Simular Offline no Celular
- **Android:** Modo Avião
- **iOS:** Modo Avião
- Ou use o throttling no DevTools remoto

### Instalar como PWA
1. Abra a aplicação no celular
2. Chrome Menu → "Adicionar à tela inicial"
3. O app agora funciona como app nativo offline

---

## ✅ Checklist de Validação

- [ ] Service Worker registrado
- [ ] Assets cacheados (ver em Cache Storage)
- [ ] API responde offline (dados do cache)
- [ ] Tiles de mapa cacheados
- [ ] IndexedDB criada com stores
- [ ] Operações enfileiradas offline
- [ ] Sincronização automática ao online
- [ ] Retry em caso de falha
- [ ] Indicador visual funciona
- [ ] Toast de notificação aparece
- [ ] Compressão de imagens
- [ ] Lazy loading de talhões
- [ ] Preload de talhões próximos
