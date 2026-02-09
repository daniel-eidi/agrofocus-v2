/**
 * Offline Manager para AgroFocus
 * Gerencia estado de conectividade e sincronização
 */

import offlineDB from './offlineDB';

class OfflineManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.listeners = [];
    this.syncInProgress = false;
    
    this.init();
  }

  init() {
    // Event listeners para mudança de conectividade
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Registra o service worker
    this.registerServiceWorker();
    
    // Ouve mensagens do service worker
    navigator.serviceWorker?.addEventListener('message', (event) => {
      if (event.data.type === 'SYNC_REQUIRED') {
        this.syncDadosPendentes();
      }
    });
  }

  /**
   * Registra o Service Worker
   */
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('[OfflineManager] Service Worker registrado:', registration);
        
        // Solicita permissão para notificações
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
      } catch (error) {
        console.error('[OfflineManager] Erro ao registrar Service Worker:', error);
      }
    }
  }

  /**
   * Handler quando fica online
   */
  handleOnline() {
    this.isOnline = true;
    console.log('[OfflineManager] Conexão restaurada');
    
    this.notifyListeners({ type: 'ONLINE' });
    
    // Dispara sincronização em background
    if ('sync' in navigator.serviceWorker?.ready) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.sync.register('sync-dados-agrofocus');
      });
    }
    
    // Sincroniza dados pendentes
    this.syncDadosPendentes();
  }

  /**
   * Handler quando fica offline
   */
  handleOffline() {
    this.isOnline = false;
    console.log('[OfflineManager] Conexão perdida - Modo offline ativado');
    
    this.notifyListeners({ type: 'OFFLINE' });
  }

  /**
   * Sincroniza dados pendentes
   */
  async syncDadosPendentes() {
    if (this.syncInProgress || !this.isOnline) return;
    
    this.syncInProgress = true;
    console.log('[OfflineManager] Iniciando sincronização...');
    
    try {
      const fila = await offlineDB.getFilaSync();
      
      if (fila.length === 0) {
        console.log('[OfflineManager] Nenhum dado pendente para sincronizar');
        return;
      }
      
      console.log(`[OfflineManager] ${fila.length} operações pendentes`);
      
      for (const operacao of fila) {
        try {
          await this.processarOperacao(operacao);
          await offlineDB.removerFilaSync(operacao.id);
          console.log(`[OfflineManager] Operação ${operacao.id} sincronizada`);
        } catch (error) {
          console.error(`[OfflineManager] Falha ao sincronizar operação ${operacao.id}:`, error);
          
          // Incrementa tentativas
          operacao.tentativas++;
          if (operacao.tentativas < 3) {
            await offlineDB.put('syncQueue', operacao);
          } else {
            // Remove após 3 tentativas falhas
            await offlineDB.removerFilaSync(operacao.id);
            console.log(`[OfflineManager] Operação ${operacao.id} descartada após 3 tentativas`);
          }
        }
      }
      
      this.notifyListeners({ type: 'SYNC_COMPLETE', sincronizados: fila.length });
    } catch (error) {
      console.error('[OfflineManager] Erro na sincronização:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Processa uma operação da fila
   */
  async processarOperacao(operacao) {
    const { tipo, dados } = operacao;
    
    switch (tipo) {
      case 'ATUALIZAR_TALHAO':
        return fetch(`/api/talhoes/${dados.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados),
        });
        
      case 'CRIAR_TALHAO':
        return fetch('/api/talhoes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados),
        });
        
      case 'ATUALIZAR_GDD':
        // GDD é calculado no servidor, apenas atualiza
        return Promise.resolve();
        
      default:
        console.warn(`[OfflineManager] Tipo de operação desconhecido: ${tipo}`);
        return Promise.resolve();
    }
  }

  /**
   * Adiciona listener para mudanças de estado
   */
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * Notifica todos os listeners
   */
  notifyListeners(evento) {
    this.listeners.forEach((callback) => callback(evento));
  }

  /**
   * Retorna estado atual
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
    };
  }

  /**
   * Força sincronização
   */
  async forceSync() {
    if (!this.isOnline) {
      throw new Error('Não é possível sincronizar offline');
    }
    
    return this.syncDadosPendentes();
  }

  /**
   * Limpa cache antigo
   */
  async limparCache(dias = 30) {
    await offlineDB.limparDadosAntigos('indices', dias);
    await offlineDB.limparDadosAntigos('produtividade', dias);
    await offlineDB.limparDadosAntigos('meteorologia', dias);
    console.log(`[OfflineManager] Cache de ${dias} dias atrás removido`);
  }
}

// Instância singleton
const offlineManager = new OfflineManager();

export default offlineManager;
export { OfflineManager };