/**
 * IndexedDB Manager para AgroFocus
 * Gerencia cache offline de dados críticos
 */

const DB_NAME = 'AgroFocusDB';
const DB_VERSION = 1;

// Nomes das stores
const STORES = {
  TALHOES: 'talhoes',
  INDICES: 'indices',
  PRODUTIVIDADE: 'produtividade',
  METEOROLOGIA: 'meteorologia',
  SYNC_QUEUE: 'syncQueue',
};

class OfflineDB {
  constructor() {
    this.db = null;
    this.initPromise = this.init();
  }

  /**
   * Inicializa o banco de dados
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[OfflineDB] Erro ao abrir banco de dados');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[OfflineDB] Banco de dados aberto');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store de talhões
        if (!db.objectStoreNames.contains(STORES.TALHOES)) {
          const talhoesStore = db.createObjectStore(STORES.TALHOES, { keyPath: 'id' });
          talhoesStore.createIndex('fazenda_id', 'fazenda_id', { unique: false });
          talhoesStore.createIndex('ultima_atualizacao', 'ultima_atualizacao', { unique: false });
        }

        // Store de índices (NDVI, NDRE, MSAVI)
        if (!db.objectStoreNames.contains(STORES.INDICES)) {
          const indicesStore = db.createObjectStore(STORES.INDICES, { keyPath: 'id', autoIncrement: true });
          indicesStore.createIndex('talhao_id', 'talhao_id', { unique: false });
          indicesStore.createIndex('data', 'data', { unique: false });
          indicesStore.createIndex('tipo', 'tipo', { unique: false });
        }

        // Store de produtividade
        if (!db.objectStoreNames.contains(STORES.PRODUTIVIDADE)) {
          const prodStore = db.createObjectStore(STORES.PRODUTIVIDADE, { keyPath: 'id', autoIncrement: true });
          prodStore.createIndex('talhao_id', 'talhao_id', { unique: false });
          prodStore.createIndex('safra', 'safra', { unique: false });
        }

        // Store de meteorologia (GDD)
        if (!db.objectStoreNames.contains(STORES.METEOROLOGIA)) {
          const meteoStore = db.createObjectStore(STORES.METEOROLOGIA, { keyPath: 'talhao_id' });
          meteoStore.createIndex('ultima_atualizacao', 'ultima_atualizacao', { unique: false });
        }

        // Fila de sincronização
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncStore.createIndex('tipo', 'tipo', { unique: false });
        }
      };
    });
  }

  /**
   * Aguarda inicialização
   */
  async ready() {
    return this.initPromise;
  }

  /**
   * Salva dados em uma store
   */
  async put(storeName, data) {
    await this.ready();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Busca dados por ID
   */
  async get(storeName, id) {
    await this.ready();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Busca todos os dados de uma store
   */
  async getAll(storeName) {
    await this.ready();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Busca por índice
   */
  async getByIndex(storeName, indexName, value) {
    await this.ready();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Remove dados
   */
  async delete(storeName, id) {
    await this.ready();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Limpa dados antigos (mantém apenas os últimos N dias)
   */
  async limparDadosAntigos(storeName, dias = 30) {
    await this.ready();
    
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - dias);
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.openCursor();
      
      let deletados = 0;

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        
        if (cursor) {
          const data = cursor.value;
          const dataRegistro = new Date(data.ultima_atualizacao || data.data || data.timestamp);
          
          if (dataRegistro < dataLimite) {
            cursor.delete();
            deletados++;
          }
          
          cursor.continue();
        } else {
          console.log(`[OfflineDB] ${deletados} registros antigos removidos de ${storeName}`);
          resolve(deletados);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // ============== Métodos específicos ==============

  /**
   * Salva dados de índices de vegetação
   */
  async salvarIndices(talhaoId, tipo, dados) {
    const registro = {
      talhao_id: talhaoId,
      tipo: tipo, // 'ndvi', 'ndre', 'msavi'
      dados: dados,
      data: new Date().toISOString(),
      ultima_atualizacao: new Date().toISOString(),
    };
    
    return this.put(STORES.INDICES, registro);
  }

  /**
   * Recupera últimos índices de um talhão
   */
  async getIndices(talhaoId, tipo = null) {
    const indices = await this.getByIndex(STORES.INDICES, 'talhao_id', talhaoId);
    
    if (tipo) {
      return indices.filter(i => i.tipo === tipo);
    }
    
    return indices;
  }

  /**
   * Salva dados de produtividade
   */
  async salvarProdutividade(talhaoId, safra, dados) {
    const registro = {
      talhao_id: talhaoId,
      safra: safra,
      dados: dados,
      ultima_atualizacao: new Date().toISOString(),
    };
    
    return this.put(STORES.PRODUTIVIDADE, registro);
  }

  /**
   * Salva dados meteorológicos (GDD)
   */
  async salvarMeteorologia(talhaoId, dados) {
    const registro = {
      talhao_id: talhaoId,
      ...dados,
      ultima_atualizacao: new Date().toISOString(),
    };
    
    return this.put(STORES.METEOROLOGIA, registro);
  }

  /**
   * Adiciona operação à fila de sincronização
   */
  async adicionarFilaSync(tipo, dados) {
    const operacao = {
      tipo: tipo,
      dados: dados,
      timestamp: new Date().toISOString(),
      tentativas: 0,
    };
    
    return this.put(STORES.SYNC_QUEUE, operacao);
  }

  /**
   * Recupera operações pendentes de sincronização
   */
  async getFilaSync() {
    return this.getAll(STORES.SYNC_QUEUE);
  }

  /**
   * Remove operação da fila
   */
  async removerFilaSync(id) {
    return this.delete(STORES.SYNC_QUEUE, id);
  }

  /**
   * Verifica se há dados suficientes para funcionar offline
   */
  async temDadosOffline(talhaoId) {
    const indices = await this.getIndices(talhaoId);
    const meteo = await this.get(STORES.METEOROLOGIA, talhaoId);
    
    return {
      temIndices: indices.length > 0,
      temMeteorologia: !!meteo,
      totalIndices: indices.length,
      ultimaAtualizacao: meteo?.ultima_atualizacao || indices[0]?.ultima_atualizacao,
    };
  }
}

// Instância singleton
const offlineDB = new OfflineDB();

export default offlineDB;
export { STORES };