/**
 * Service Worker para AgroFocus PWA
 * 
 * Funcionalidades:
 * - Cache de assets estáticos (Cache First)
 * - Cache de API (Network First)
 * - IndexedDB para inspeções offline
 * - Background Sync para sincronização automática
 * - Cache de fotos da inspeção
 * 
 * @version 2.0.0
 */

const CACHE_VERSION = 'v2.0.0';
const STATIC_CACHE = `agrofocus-static-${CACHE_VERSION}`;
const API_CACHE = `agrofocus-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `agrofocus-images-${CACHE_VERSION}`;

// Assets estáticos para cache inicial
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png',
  '/favicon.ico'
];

// ============================================
// INDEXEDDB PARA INSPEÇÕES OFFLINE
// ============================================

const DB_NAME = 'AgroFocusDB';
const DB_VERSION = 1;
const STORES = {
  INSPECOES_PENDENTES: 'inspecoes_pendentes',
  FOTOS_PENDENTES: 'fotos_pendentes',
  SYNC_QUEUE: 'sync_queue',
  CACHE_API: 'cache_api'
};

// Abrir conexão com IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Store para inspeções pendentes
      if (!db.objectStoreNames.contains(STORES.INSPECOES_PENDENTES)) {
        const inspecoesStore = db.createObjectStore(STORES.INSPECOES_PENDENTES, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        inspecoesStore.createIndex('status', 'status', { unique: false });
        inspecoesStore.createIndex('timestamp', 'timestamp', { unique: false });
        inspecoesStore.createIndex('talhao_id', 'talhao_id', { unique: false });
      }
      
      // Store para fotos pendentes
      if (!db.objectStoreNames.contains(STORES.FOTOS_PENDENTES)) {
        const fotosStore = db.createObjectStore(STORES.FOTOS_PENDENTES, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        fotosStore.createIndex('inspecao_id', 'inspecao_id', { unique: false });
        fotosStore.createIndex('status', 'status', { unique: false });
      }
      
      // Store para fila de sincronização
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        syncStore.createIndex('tipo', 'tipo', { unique: false });
        syncStore.createIndex('status', 'status', { unique: false });
      }
      
      // Store para cache de API
      if (!db.objectStoreNames.contains(STORES.CACHE_API)) {
        const cacheStore = db.createObjectStore(STORES.CACHE_API, { keyPath: 'url' });
        cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// Salvar inspeção pendente no IndexedDB
async function salvarInspecaoPendente(dados) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.INSPECOES_PENDENTES, 'readwrite');
    const store = tx.objectStore(STORES.INSPECOES_PENDENTES);
    
    const inspecao = {
      ...dados,
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pendente',
      timestamp: Date.now(),
      tentativas: 0
    };
    
    await store.add(inspecao);
    
    // Salvar fotos separadamente
    if (dados.fotos && dados.fotos.length > 0) {
      await salvarFotosPendentes(inspecao.id, dados.fotos);
    }
    
    console.log('[SW] Inspeção salva localmente:', inspecao.id);
    return inspecao;
  } catch (error) {
    console.error('[SW] Erro ao salvar inspeção:', error);
    throw error;
  }
}

// Salvar fotos pendentes
async function salvarFotosPendentes(inspecaoId, fotos) {
  const db = await openDB();
  const tx = db.transaction(STORES.FOTOS_PENDENTES, 'readwrite');
  const store = tx.objectStore(STORES.FOTOS_PENDENTES);
  
  for (let i = 0; i < fotos.length; i++) {
    await store.add({
      inspecao_id: inspecaoId,
      foto_base64: fotos[i],
      ordem: i,
      status: 'pendente',
      timestamp: Date.now()
    });
  }
}

// Obter inspeções pendentes
async function getInspecoesPendentes() {
  const db = await openDB();
  const tx = db.transaction(STORES.INSPECOES_PENDENTES, 'readonly');
  const store = tx.objectStore(STORES.INSPECOES_PENDENTES);
  const index = store.index('status');
  
  return new Promise((resolve, reject) => {
    const request = index.getAll('pendente');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Remover inspeção sincronizada
async function removerInspecaoPendente(id) {
  const db = await openDB();
  const tx = db.transaction([STORES.INSPECOES_PENDENTES, STORES.FOTOS_PENDENTES], 'readwrite');
  
  // Remover inspeção
  await tx.objectStore(STORES.INSPECOES_PENDENTES).delete(id);
  
  // Remover fotos associadas
  const fotosStore = tx.objectStore(STORES.FOTOS_PENDENTES);
  const fotosIndex = fotosStore.index('inspecao_id');
  const fotosRequest = fotosIndex.getAll(id);
  
  fotosRequest.onsuccess = () => {
    fotosRequest.result.forEach(foto => {
      fotosStore.delete(foto.id);
    });
  };
  
  console.log('[SW] Inspeção removida após sincronização:', id);
}

// ============================================
// INSTALAÇÃO E ATIVAÇÃO
// ============================================

self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker v2.0.0...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Cache estático aberto');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Assets estáticos cacheados');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] Erro ao cachear assets:', err);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando Service Worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name.startsWith('agrofocus-') && 
                   !name.includes(CACHE_VERSION);
          })
          .map((name) => {
            console.log('[SW] Removendo cache antigo:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Service Worker ativado');
      return self.clients.claim();
    })
  );
});

// ============================================
// FETCH - INTERCEPTAÇÃO DE REQUISIÇÕES
// ============================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignora requisições não-GET para API
  if (request.method !== 'GET' && !url.pathname.startsWith('/api/')) {
    return;
  }
  
  // Estratégia para API - Network First, then Cache
  if (url.pathname.startsWith('/api/')) {
    // API de inspeções - suporte offline
    if (url.pathname.includes('/ocorrencias') && request.method === 'POST') {
      event.respondWith(handleInspecaoOffline(request));
      return;
    }
    
    event.respondWith(networkFirst(request));
    return;
  }
  
  // Estratégia para imagens - Cache First with expiration
  if (request.destination === 'image' || url.pathname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    event.respondWith(imageCacheStrategy(request));
    return;
  }
  
  // Estratégia para arquivos estáticos - Cache First
  event.respondWith(cacheFirst(request));
});

// ============================================
// ESTRATÉGIAS DE CACHE
// ============================================

/**
 * Network First - Tenta rede primeiro, falhou? Usa cache
 * Ideal para dados da API
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      // Atualiza o cache
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Falha na rede, buscando no cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Retorna erro offline
    return new Response(
      JSON.stringify({
        erro: 'Você está offline e este dado não está disponível em cache',
        offline: true
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Cache First - Tenta cache primeiro, não tem? Vai na rede
 * Ideal para assets estáticos
 */
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Falha ao buscar recurso:', request.url);
    
    // Se for uma rota SPA, retorna index.html
    if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
      const cache = await caches.open(STATIC_CACHE);
      const cachedIndex = await cache.match('/index.html');
      if (cachedIndex) {
        return cachedIndex;
      }
    }
    
    throw error;
  }
}

/**
 * Image Cache Strategy - Cache First com expiração
 */
async function imageCacheStrategy(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// ============================================
// HANDLING DE INSPEÇÕES OFFLINE
// ============================================

async function handleInspecaoOffline(request) {
  try {
    // Tenta enviar normalmente
    const response = await fetch(request);
    if (response.ok) {
      return response;
    }
  } catch (error) {
    console.log('[SW] Offline detectado, salvando inspeção localmente');
  }
  
  // Se falhou, salva localmente
  try {
    const body = await request.clone().json();
    const inspecao = await salvarInspecaoPendente(body);
    
    // Registra para sincronização em background
    if ('sync' in self.registration) {
      await self.registration.sync.register('sync-inspecoes-agrofocus');
    }
    
    // Notifica o cliente
    notificarClientes({
      type: 'INSPECAO_SALVA_LOCAL',
      message: 'Inspeção salva localmente. Será sincronizada quando voltar online.',
      inspecaoId: inspecao.id
    });
    
    return new Response(
      JSON.stringify({
        sucesso: true,
        offline: true,
        mensagem: 'Inspeção salva localmente',
        id_local: inspecao.id
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[SW] Erro ao salvar inspeção offline:', error);
    return new Response(
      JSON.stringify({
        sucesso: false,
        erro: 'Erro ao salvar inspeção offline'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// ============================================
// BACKGROUND SYNC
// ============================================

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-inspecoes-agrofocus') {
    event.waitUntil(sincronizarInspecoesPendentes());
  }
  
  if (event.tag === 'sync-dados-agrofocus') {
    event.waitUntil(sincronizarDadosPendentes());
  }
});

/**
 * Sincroniza inspeções pendentes quando volta online
 */
async function sincronizarInspecoesPendentes() {
  console.log('[SW] Iniciando sincronização de inspeções...');
  
  try {
    const inspecoes = await getInspecoesPendentes();
    console.log(`[SW] ${inspecoes.length} inspeções pendentes`);
    
    for (const inspecao of inspecoes) {
      try {
        // Tenta enviar para o servidor
        const response = await fetch('/api/ocorrencias', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': inspecao.token || ''
          },
          body: JSON.stringify(inspecao)
        });
        
        if (response.ok) {
          await removerInspecaoPendente(inspecao.id);
          console.log('[SW] Inspeção sincronizada:', inspecao.id);
          
          // Notifica sucesso
          notificarClientes({
            type: 'INSPECAO_SINCRONIZADA',
            message: 'Inspeção sincronizada com sucesso!',
            inspecaoId: inspecao.id
          });
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        console.error('[SW] Falha ao sincronizar inspeção:', inspecao.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Erro na sincronização:', error);
  }
}

async function sincronizarDadosPendentes() {
  console.log('[SW] Sincronizando dados pendentes...');
  notificarClientes({
    type: 'SYNC_REQUIRED',
    message: 'Sincronização de dados pendentes necessária'
  });
}

// ============================================
// NOTIFICAÇÕES E MENSAGENS
// ============================================

async function notificarClientes(message) {
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage(message);
  });
}

// Receber mensagens do cliente
self.addEventListener('message', (event) => {
  if (event.data.type === 'GET_INSPECOES_PENDENTES') {
    getInspecoesPendentes().then(inspecoes => {
      event.ports[0].postMessage({
        type: 'INSPECOES_PENDENTES',
        data: inspecoes
      });
    });
  }
  
  if (event.data.type === 'FORCAR_SINCRONIZACAO') {
    sincronizarInspecoesPendentes();
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    });
  }
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ============================================
// PUSH NOTIFICATIONS
// ============================================

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  
  const options = {
    body: data.message || 'Novo alerta do AgroFocus',
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: data.tag || 'agrofocus-alert',
    requireInteraction: data.requireInteraction || false,
    data: data.data || {},
    actions: data.actions || [],
    vibrate: [200, 100, 200]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'AgroFocus', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const data = event.notification.data;
  const action = event.action;
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Foca em janela existente
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          
          // Envia mensagem para o cliente
          if (action) {
            client.postMessage({
              type: 'NOTIFICATION_ACTION',
              action: action,
              data: data
            });
          }
          
          return;
        }
      }
      
      // Abre nova janela
      if (clients.openWindow) {
        const url = data.url || '/';
        return clients.openWindow(url);
      }
    })
  );
});

console.log('[SW] Service Worker AgroFocus v2.0.0 carregado');
