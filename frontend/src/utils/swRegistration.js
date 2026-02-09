/**
 * Service Worker Registration
 * 
 * Registra o Service Worker e gerencia atualizações
 */

export function register() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          console.log('[SW] Registrado:', registration.scope);

          // Verificar atualizações periodicamente
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000); // A cada hora

          // Novo SW disponível
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Novo SW instalado mas aguardando ativação
                console.log('[SW] Nova versão disponível');
                
                // Disparar evento para a aplicação
                window.dispatchEvent(new CustomEvent('swUpdateAvailable', {
                  detail: { registration }
                }));
              }
            });
          });
        })
        .catch((error) => {
          console.error('[SW] Erro ao registrar:', error);
        });

      // Ouvir mensagens do SW
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, data } = event.data;
        
        switch (type) {
          case 'DATA_UPDATED':
            window.dispatchEvent(new CustomEvent('swDataUpdated', { detail: data }));
            break;
          case 'TRIGGER_SYNC':
            window.dispatchEvent(new CustomEvent('swTriggerSync', { detail: data }));
            break;
          default:
            console.log('[SW] Mensagem recebida:', type, data);
        }
      });
    });
  }
}

/**
 * Atualiza o Service Worker para nova versão
 */
export function updateServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
    });
  }
}

/**
 * Verifica se há uma nova versão do SW
 */
export function checkForUpdates() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.update();
    });
  }
}

/**
 * Obtém a versão do Service Worker
 */
export async function getSWVersion() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        resolve(event.data?.version || 'unknown');
      };
      
      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_VERSION' },
        [channel.port2]
      );
    });
  }
  return null;
}

/**
 * Limpa todo o cache
 */
export async function clearAllCaches() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        resolve(event.data?.success || false);
      };
      
      navigator.serviceWorker.controller.postMessage(
        { type: 'CLEAR_CACHE' },
        [channel.port2]
      );
    });
  }
  return false;
}

/**
 * Pré-cacheia talhões específicos
 */
export async function precacheTalhoes(talhoes) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        resolve(event.data);
      };
      
      navigator.serviceWorker.controller.postMessage(
        { type: 'PRECACHE_TALHOES', data: { talhoes } },
        [channel.port2]
      );
    });
  }
  return { success: false, error: 'SW não disponível' };
}

/**
 * Desregistra todos os Service Workers
 */
export async function unregister() {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
    console.log('[SW] Todos os SW desregistrados');
  }
}
