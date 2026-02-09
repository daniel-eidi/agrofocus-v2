import { useState, useEffect, useCallback } from 'react';

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  isOnline: boolean;
  inspecoesPendentes: number;
  deferredPrompt: any | null;
  updateAvailable: boolean;
}

interface UsePWA {
  state: PWAState;
  installApp: () => Promise<void>;
  dismissInstall: () => void;
  syncInspecoes: () => Promise<void>;
  getInspecoesPendentes: () => Promise<any[]>;
}

/**
 * Hook para gerenciar funcionalidades PWA
 * - Detecta disponibilidade de instalação
 * - Gerencia estado online/offline
 * - Controla inspeções pendentes offline
 */
export function usePWA(): UsePWA {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOffline: !navigator.onLine,
    isOnline: navigator.onLine,
    inspecoesPendentes: 0,
    deferredPrompt: null,
    updateAvailable: false
  });

  // Detecta se o app está instalado
  useEffect(() => {
    const checkInstalled = () => {
      const isStandalone = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      
      setState(prev => ({ ...prev, isInstalled: isStandalone }));
    };

    checkInstalled();
    window.matchMedia('(display-mode: standalone)').addEventListener('change', checkInstalled);
    
    return () => {
      window.matchMedia('(display-mode: standalone)').removeEventListener('change', checkInstalled);
    };
  }, []);

  // Listener para beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setState(prev => ({
        ...prev,
        deferredPrompt: e,
        isInstallable: true
      }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Listeners para online/offline
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true, isOffline: false }));
      // Tenta sincronizar quando volta online
      syncInspecoes();
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false, isOffline: true }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Comunicação com Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const handleMessage = (event: MessageEvent) => {
        const { type, message } = event.data;
        
        switch (type) {
          case 'INSPECAO_SALVA_LOCAL':
            console.log('[PWA] Inspeção salva localmente:', message);
            refreshInspecoesPendentes();
            break;
          case 'INSPECAO_SINCRONIZADA':
            console.log('[PWA] Inspeção sincronizada:', message);
            refreshInspecoesPendentes();
            break;
          case 'SINCRONIZACAO_FALHOU':
            console.error('[PWA] Falha na sincronização:', message);
            break;
          case 'ONLINE':
            console.log('[PWA] Conexão restaurada');
            break;
          case 'OFFLINE':
            console.log('[PWA] Modo offline ativado');
            break;
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);
      
      // Pega inspeções pendentes iniciais
      refreshInspecoesPendentes();

      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, []);

  // Atualiza contagem de inspeções pendentes
  const refreshInspecoesPendentes = useCallback(async () => {
    const pendentes = await getInspecoesPendentes();
    setState(prev => ({ ...prev, inspecoesPendentes: pendentes.length }));
  }, []);

  // Instalar o app
  const installApp = async () => {
    if (!state.deferredPrompt) return;

    state.deferredPrompt.prompt();
    const { outcome } = await state.deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('[PWA] App instalado com sucesso');
      setState(prev => ({ 
        ...prev, 
        isInstalled: true, 
        isInstallable: false,
        deferredPrompt: null 
      }));
    } else {
      console.log('[PWA] Instalação rejeitada');
    }
  };

  // Dispensar prompt de instalação
  const dismissInstall = () => {
    setState(prev => ({ ...prev, isInstallable: false }));
  };

  // Sincronizar inspeções pendentes
  const syncInspecoes = async () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'FORCAR_SINCRONIZACAO' });
    }
    
    // Também usa Background Sync se disponível
    try {
      const registration = await navigator.serviceWorker.ready;
      if ('sync' in registration) {
        await (registration as any).sync.register('sync-inspecoes-agrofocus');
      }
    } catch (error) {
      console.error('[PWA] Erro ao registrar sync:', error);
    }
    
    await refreshInspecoesPendentes();
  };

  // Obter inspeções pendentes do Service Worker
  const getInspecoesPendentes = async (): Promise<any[]> => {
    return new Promise((resolve) => {
      if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
        resolve([]);
        return;
      }

      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        if (event.data.type === 'INSPECOES_PENDENTES') {
          resolve(event.data.data);
        }
      };

      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_INSPECOES_PENDENTES' },
        [channel.port2]
      );

      // Timeout após 3 segundos
      setTimeout(() => resolve([]), 3000);
    });
  };

  return {
    state,
    installApp,
    dismissInstall,
    syncInspecoes,
    getInspecoesPendentes
  };
}

export default usePWA;
