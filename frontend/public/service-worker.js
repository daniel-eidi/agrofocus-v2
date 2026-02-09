/**
 * Service Worker para AgroFocus
 * Proporciona cache offline para dados críticos
 */

const CACHE_NAME = 'agrofocus-v1.2.0';
const STATIC_CACHE = 'agrofocus-static-v1';
const API_CACHE = 'agrofocus-api-v1';

// Arquivos estáticos para cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/static/js/main.chunk.js',
  '/static/js/0.chunk.js',
  '/static/js/bundle.js',
  '/manifest.json',
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Cache estático aberto');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((err) => {
        console.error('[SW] Erro ao cachear arquivos estáticos:', err);
      })
  );
  
  // Ativa imediatamente
  self.skipWaiting();
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando Service Worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name.startsWith('agrofocus-') && 
                   name !== STATIC_CACHE && 
                   name !== API_CACHE;
          })
          .map((name) => {
            console.log('[SW] Removendo cache antigo:', name);
            return caches.delete(name);
          })
      );
    })
  );
  
  self.clients.claim();
});

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignora requisições não-GET
  if (request.method !== 'GET') {
    return;
  }
  
  // Estratégia para API - Network First, then Cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }
  
  // Estratégia para arquivos estáticos - Cache First
  event.respondWith(cacheFirst(request));
});

/**
 * Estratégia Network First
 * Tenta buscar da rede primeiro, se falhar usa o cache
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Se a resposta for válida, atualiza o cache
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Falha na rede, buscando no cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      // Adiciona header indicando que veio do cache
      const headers = new Headers(cachedResponse.headers);
      headers.append('X-From-Cache', 'true');
      
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: headers,
      });
    }
    
    // Se não tem no cache, retorna erro offline
    return new Response(
      JSON.stringify({
        erro: 'Você está offline e este dado não está disponível em cache',
        offline: true,
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Estratégia Cache First
 * Tenta buscar do cache primeiro, se não tiver vai na rede
 */
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    // Se for uma resposta válida de mesmo origem, cacheia
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Falha ao buscar recurso:', request.url);
    
    // Se for uma página HTML, retorna a página offline
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match('/index.html');
    }
    
    throw error;
  }
}

// Sincronização em background
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-dados-agrofocus') {
    event.waitUntil(syncDadosPendentes());
  }
});

/**
 * Sincroniza dados pendentes quando volta online
 */
async function syncDadosPendentes() {
  console.log('[SW] Sincronizando dados pendentes...');
  
  // Notifica a aplicação para sincronizar
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({
      type: 'SYNC_REQUIRED',
      message: 'Sincronização de dados pendentes necessária',
    });
  });
}

// Notificações push (para alertas de clima/estágio)
self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  const options = {
    body: data.message || 'Novo alerta do AgroFocus',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: data.tag || 'agrofocus-alert',
    requireInteraction: data.requireInteraction || false,
    data: data.data || {},
  };
  
  event.waitUntil(
    self.registration.showNotification('AgroFocus', options)
  );
});

// Clique na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const notificationData = event.notification.data;
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Se já tem uma janela aberta, foca nela
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Se não tem, abre uma nova
      if (clients.openWindow) {
        return clients.openWindow(notificationData.url || '/');
      }
    })
  );
});