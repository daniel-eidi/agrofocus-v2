/**
 * SyncQueue - Gerenciador de fila de operações offline
 * 
 * Responsável por:
 * - Enfileirar operações pendentes
 * - Sincronizar quando online
 * - Retry automático com backoff
 * - Feedback visual de status
 */

import { getOfflineDB } from './offlineDB';

// Estados possíveis
export const SyncStatus = {
  PENDING: 'pending',
  SYNCING: 'syncing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  RETRYING: 'retrying',
};

// Tipos de operações
export const OperationType = {
  INSPECAO: 'inspecao',
  OPERACAO: 'operacao',
  TALHAO_UPDATE: 'talhao_update',
  FAZENDA_UPDATE: 'fazenda_update',
  IMAGEM_UPLOAD: 'imagem_upload',
  NDVI_REQUEST: 'ndvi_request',
};

class SyncQueue {
  constructor() {
    this.db = getOfflineDB();
    this.isProcessing = false;
    this.listeners = [];
    this.retryDelays = [5000, 10000, 30000, 60000]; // Delays entre tentativas (ms)
    this.maxRetries = 3;
    this.processingTimeout = null;
  }

  /**
   * Adiciona um listener para eventos de sync
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
  notify(event, data) {
    this.listeners.forEach((callback) => {
      try {
        callback(event, data);
      } catch (e) {
        console.error('[SyncQueue] Erro no listener:', e);
      }
    });
  }

  /**
   * Adiciona uma operação à fila
   */
  async enqueue(tipo, dados, opcoes = {}) {
    const item = {
      tipo,
      dados,
      prioridade: opcoes.prioridade || 1,
      dependencia: opcoes.dependencia || null, // ID de item que deve ser processado primeiro
      metadata: {
        ...opcoes.metadata,
        criadoEm: new Date().toISOString(),
        origem: opcoes.origem || 'app',
      },
    };

    const id = await this.db.addToSyncQueue(item);
    
    console.log(`[SyncQueue] Operação enfileirada: ${tipo} (ID: ${id})`);
    
    this.notify('enqueued', { id, tipo, dados });
    
    // Tentar processar se estiver online
    if (navigator.onLine && !this.isProcessing) {
      this.processQueue();
    }
    
    return id;
  }

  /**
   * Processa a fila de operações pendentes
   */
  async processQueue() {
    if (this.isProcessing || !navigator.onLine) {
      return;
    }

    this.isProcessing = true;
    this.notify('processing', { timestamp: new Date().toISOString() });

    try {
      const pendentes = await this.db.getSyncQueuePriorizada();
      
      if (pendentes.length === 0) {
        console.log('[SyncQueue] Fila vazia');
        this.notify('empty', {});
        return;
      }

      console.log(`[SyncQueue] Processando ${pendentes.length} operações...`);
      
      for (const item of pendentes) {
        if (!navigator.onLine) {
          console.log('[SyncQueue] Conexão perdida, pausando...');
          break;
        }

        await this.processItem(item);
      }

      // Atualizar timestamp de última sincronização
      await this.db.setLastSync();
      
    } catch (error) {
      console.error('[SyncQueue] Erro ao processar fila:', error);
      this.notify('error', { error: error.message });
    } finally {
      this.isProcessing = false;
      this.notify('completed', { timestamp: new Date().toISOString() });
      
      // Verificar se há mais itens para processar
      const stats = await this.db.getSyncQueueStats();
      if (stats.pending > 0 && navigator.onLine) {
        this.processingTimeout = setTimeout(() => this.processQueue(), 1000);
      }
    }
  }

  /**
   * Processa um item individual da fila
   */
  async processItem(item) {
    console.log(`[SyncQueue] Processando: ${item.tipo} (ID: ${item.id})`);
    
    // Verificar dependências
    if (item.dependencia) {
      const dependencia = await this.db.getSyncQueue(item.dependencia);
      if (dependencia && dependencia.status !== 'completed') {
        console.log(`[SyncQueue] Aguardando dependência: ${item.dependencia}`);
        return; // Pular, será processado depois
      }
    }

    // Marcar como processando
    await this.db.updateSyncQueueItem(item.id, { status: SyncStatus.SYNCING });
    this.notify('item-start', { id: item.id, tipo: item.tipo });

    try {
      const resultado = await this.executeOperation(item);
      
      // Sucesso
      await this.db.updateSyncQueueItem(item.id, {
        status: SyncStatus.COMPLETED,
        resultado,
        processadoEm: new Date().toISOString(),
      });
      
      // Remover da fila após completar (opcional - manter para histórico)
      await this.db.removeFromSyncQueue(item.id);
      
      console.log(`[SyncQueue] Sucesso: ${item.tipo} (ID: ${item.id})`);
      this.notify('item-success', { id: item.id, tipo: item.tipo, resultado });
      
    } catch (error) {
      console.error(`[SyncQueue] Falha: ${item.tipo} (ID: ${item.id}):`, error);
      
      await this.db.incrementarTentativa(item.id);
      
      const itemAtualizado = await this.db.get(item.db.stores.SYNC_QUEUE, item.id);
      
      if (itemAtualizado.tentativas >= this.maxRetries) {
        // Máximo de tentativas atingido
        await this.db.updateSyncQueueItem(item.id, {
          status: SyncStatus.FAILED,
          erro: error.message,
          ultimaTentativa: new Date().toISOString(),
        });
        
        this.notify('item-failed', { id: item.id, tipo: item.tipo, error: error.message });
      } else {
        // Agendar retry
        const delay = this.retryDelays[Math.min(itemAtualizado.tentativas - 1, this.retryDelays.length - 1)];
        
        await this.db.updateSyncQueueItem(item.id, {
          status: SyncStatus.RETRYING,
          proximaTentativa: new Date(Date.now() + delay).toISOString(),
        });
        
        this.notify('item-retry', { id: item.id, tipo: item.tipo, tentativa: itemAtualizado.tentativas, delay });
        
        // Agendar retry
        setTimeout(() => {
          if (navigator.onLine) {
            this.processQueue();
          }
        }, delay);
      }
    }
  }

  /**
   * Executa a operação específica
   */
  async executeOperation(item) {
    const { tipo, dados } = item;
    
    switch (tipo) {
      case OperationType.INSPECAO:
        return this.syncInspecao(dados);
        
      case OperationType.OPERACAO:
        return this.syncOperacao(dados);
        
      case OperationType.TALHAO_UPDATE:
        return this.syncTalhaoUpdate(dados);
        
      case OperationType.FAZENDA_UPDATE:
        return this.syncFazendaUpdate(dados);
        
      case OperationType.IMAGEM_UPLOAD:
        return this.syncImagemUpload(dados);
        
      case OperationType.NDVI_REQUEST:
        return this.syncNDVIRequest(dados);
        
      default:
        throw new Error(`Tipo de operação desconhecido: ${tipo}`);
    }
  }

  // ==========================================
  // SINCRONIZAÇÃO ESPECÍFICA
  // ==========================================

  async syncInspecao(dados) {
    const response = await fetch('/api/inspecoes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Offline-Sync': 'true',
      },
      body: JSON.stringify(dados),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const resultado = await response.json();
    
    // Atualizar no IndexedDB
    const inspecao = await this.db.getInspecao(dados.id);
    if (inspecao) {
      await this.db.marcarInspecaoSync(dados.id);
    }
    
    return resultado;
  }

  async syncOperacao(dados) {
    const response = await fetch('/api/operacoes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Offline-Sync': 'true',
      },
      body: JSON.stringify(dados),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const resultado = await response.json();
    
    // Atualizar no IndexedDB
    await this.db.marcarOperacaoSync(dados.id);
    
    return resultado;
  }

  async syncTalhaoUpdate(dados) {
    const response = await fetch(`/api/talhoes/${dados.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Offline-Sync': 'true',
      },
      body: JSON.stringify(dados),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    return response.json();
  }

  async syncFazendaUpdate(dados) {
    const response = await fetch(`/api/fazendas/${dados.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Offline-Sync': 'true',
      },
      body: JSON.stringify(dados),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    return response.json();
  }

  async syncImagemUpload(dados) {
    // Upload de imagem pode ser maior, usar FormData
    const formData = new FormData();
    
    if (dados.imagemBlob) {
      formData.append('imagem', dados.imagemBlob, dados.nomeArquivo || 'imagem.jpg');
    }
    
    formData.append('talhaoId', dados.talhaoId);
    formData.append('inspecaoId', dados.inspecaoId);
    formData.append('metadata', JSON.stringify(dados.metadata || {}));

    const response = await fetch('/api/imagens', {
      method: 'POST',
      headers: {
        'X-Offline-Sync': 'true',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    return response.json();
  }

  async syncNDVIRequest(dados) {
    const response = await fetch(`/api/ndvi?talonId=${dados.talhaoId}&data=${dados.data}`, {
      method: 'GET',
      headers: {
        'X-Offline-Sync': 'true',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const ndviData = await response.json();
    
    // Salvar no IndexedDB
    await this.db.saveNDVI({
      ...ndviData,
      talhaoId: dados.talhaoId,
    });
    
    return ndviData;
  }

  // ==========================================
  // API PÚBLICA
  // ==========================================

  /**
   * Obtém estatísticas da fila
   */
  async getStats() {
    return this.db.getSyncQueueStats();
  }

  /**
   * Obtém operações pendentes
   */
  async getPending() {
    return this.db.getSyncQueue(SyncStatus.PENDING);
  }

  /**
   * Obtém operações falhadas
   */
  async getFailed() {
    return this.db.getSyncQueue(SyncStatus.FAILED);
  }

  /**
   * Retenta operações falhadas
   */
  async retryFailed() {
    const failed = await this.getFailed();
    
    for (const item of failed) {
      await this.db.updateSyncQueueItem(item.id, {
        status: SyncStatus.PENDING,
        tentativas: 0,
      });
    }
    
    this.notify('retry-all', { count: failed.length });
    
    if (navigator.onLine) {
      this.processQueue();
    }
    
    return failed.length;
  }

  /**
   * Cancela uma operação
   */
  async cancel(id) {
    await this.db.removeFromSyncQueue(id);
    this.notify('cancelled', { id });
  }

  /**
   * Limpa operações completadas/falhadas
   */
  async cleanup() {
    const all = await this.db.getAll(this.db.stores.SYNC_QUEUE);
    const toRemove = all.filter((item) => 
      item.status === SyncStatus.COMPLETED || item.status === SyncStatus.FAILED
    );
    
    for (const item of toRemove) {
      await this.db.removeFromSyncQueue(item.id);
    }
    
    console.log(`[SyncQueue] ${toRemove.length} operações removidas`);
    return toRemove.length;
  }

  /**
   * Registra handlers de eventos online/offline
   */
  registerOnlineHandlers() {
    window.addEventListener('online', () => {
      console.log('[SyncQueue] Conexão restabelecida');
      this.notify('online', {});
      this.processQueue();
      
      // Registrar sync em background se disponível
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.sync.register('sync-pending-operations');
        });
      }
    });

    window.addEventListener('offline', () => {
      console.log('[SyncQueue] Conexão perdida');
      this.notify('offline', {});
      
      if (this.processingTimeout) {
        clearTimeout(this.processingTimeout);
        this.processingTimeout = null;
      }
    });
  }

  /**
   * Inicializa a fila
   */
  async init() {
    await this.db.init();
    this.registerOnlineHandlers();
    
    // Processar fila se estiver online
    if (navigator.onLine) {
      this.processQueue();
    }
    
    console.log('[SyncQueue] Inicializado');
  }
}

// Singleton
let syncQueueInstance = null;

export function getSyncQueue() {
  if (!syncQueueInstance) {
    syncQueueInstance = new SyncQueue();
  }
  return syncQueueInstance;
}

export default SyncQueue;
