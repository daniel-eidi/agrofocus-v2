/**
 * Serviço de IndexedDB para AgroFocus
 * Gerencia inspeções pendentes e fotos offline
 */

const DB_NAME = 'AgroFocusDB';
const DB_VERSION = 1;

interface InspecaoPendente {
  id?: string;
  tipo: string;
  categoria: string;
  titulo: string;
  descricao: string;
  severidade: string;
  latitude: number | null;
  longitude: number | null;
  fotos: string[];
  talhao_id: string;
  fazenda_id: string;
  fazenda_nome?: string;
  talhao_nome?: string;
  token?: string;
  timestamp?: number;
  status?: string;
  tentativas?: number;
}

interface FotoPendente {
  id?: number;
  inspecao_id: string;
  foto_base64: string;
  ordem: number;
  status: string;
  timestamp: number;
}

class IndexedDBService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store para inspeções pendentes
        if (!db.objectStoreNames.contains('inspecoes_pendentes')) {
          const inspecoesStore = db.createObjectStore('inspecoes_pendentes', {
            keyPath: 'id'
          });
          inspecoesStore.createIndex('status', 'status', { unique: false });
          inspecoesStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Store para fotos pendentes
        if (!db.objectStoreNames.contains('fotos_pendentes')) {
          const fotosStore = db.createObjectStore('fotos_pendentes', {
            keyPath: 'id',
            autoIncrement: true
          });
          fotosStore.createIndex('inspecao_id', 'inspecao_id', { unique: false });
          fotosStore.createIndex('status', 'status', { unique: false });
        }

        // Store para cache de API
        if (!db.objectStoreNames.contains('cache_api')) {
          const cacheStore = db.createObjectStore('cache_api', { keyPath: 'url' });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // ============================================
  // INSPEÇÕES PENDENTES
  // ============================================

  async salvarInspecaoPendente(inspecao: InspecaoPendente): Promise<InspecaoPendente> {
    if (!this.db) await this.init();

    const inspecaoComId = {
      ...inspecao,
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pendente',
      timestamp: Date.now(),
      tentativas: 0
    };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('inspecoes_pendentes', 'readwrite');
      const store = tx.objectStore('inspecoes_pendentes');
      const request = store.add(inspecaoComId);

      request.onsuccess = () => {
        console.log('[IndexedDB] Inspeção salva:', inspecaoComId.id);
        resolve(inspecaoComId);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getInspecoesPendentes(): Promise<InspecaoPendente[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('inspecoes_pendentes', 'readonly');
      const store = tx.objectStore('inspecoes_pendentes');
      const index = store.index('status');
      const request = index.getAll('pendente');

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getTodasInspecoes(): Promise<InspecaoPendente[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('inspecoes_pendentes', 'readonly');
      const store = tx.objectStore('inspecoes_pendentes');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removerInspecaoPendente(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['inspecoes_pendentes', 'fotos_pendentes'], 'readwrite');
      
      // Remove inspeção
      tx.objectStore('inspecoes_pendentes').delete(id);
      
      // Remove fotos associadas
      const fotosStore = tx.objectStore('fotos_pendentes');
      const fotosIndex = fotosStore.index('inspecao_id');
      const fotosRequest = fotosIndex.openCursor(IDBKeyRange.only(id));
      
      fotosRequest.onsuccess = () => {
        const cursor = fotosRequest.result;
        if (cursor) {
          fotosStore.delete(cursor.primaryKey);
          cursor.continue();
        }
      };

      tx.oncomplete = () => {
        console.log('[IndexedDB] Inspeção removida:', id);
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  async atualizarStatusInspecao(id: string, status: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('inspecoes_pendentes', 'readwrite');
      const store = tx.objectStore('inspecoes_pendentes');
      const request = store.get(id);

      request.onsuccess = () => {
        const inspecao = request.result;
        if (inspecao) {
          inspecao.status = status;
          inspecao.timestamp = Date.now();
          store.put(inspecao);
        }
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async incrementarTentativa(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('inspecoes_pendentes', 'readwrite');
      const store = tx.objectStore('inspecoes_pendentes');
      const request = store.get(id);

      request.onsuccess = () => {
        const inspecao = request.result;
        if (inspecao) {
          inspecao.tentativas = (inspecao.tentativas || 0) + 1;
          store.put(inspecao);
        }
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ============================================
  // FOTOS PENDENTES
  // ============================================

  async salvarFotoPendente(foto: Omit<FotoPendente, 'id'>): Promise<number> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('fotos_pendentes', 'readwrite');
      const store = tx.objectStore('fotos_pendentes');
      const request = store.add(foto);

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getFotosPendentes(inspecaoId: string): Promise<FotoPendente[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('fotos_pendentes', 'readonly');
      const store = tx.objectStore('fotos_pendentes');
      const index = store.index('inspecao_id');
      const request = index.getAll(inspecaoId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ============================================
  // CACHE DE API
  // ============================================

  async salvarCacheAPI(url: string, data: any): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('cache_api', 'readwrite');
      const store = tx.objectStore('cache_api');
      const request = store.put({
        url,
        data,
        timestamp: Date.now()
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCacheAPI(url: string): Promise<any | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('cache_api', 'readonly');
      const store = tx.objectStore('cache_api');
      const request = store.get(url);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          // Verifica expiração (24 horas)
          const age = Date.now() - result.timestamp;
          if (age > 24 * 60 * 60 * 1000) {
            resolve(null); // Expirado
            // Remove do cache
            this.removerCacheAPI(url);
          } else {
            resolve(result.data);
          }
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async removerCacheAPI(url: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('cache_api', 'readwrite');
      const store = tx.objectStore('cache_api');
      const request = store.delete(url);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ============================================
  // LIMPEZA
  // ============================================

  async limparTudo(): Promise<void> {
    if (!this.db) await this.init();

    const stores = ['inspecoes_pendentes', 'fotos_pendentes', 'cache_api'];
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(stores, 'readwrite');
      
      stores.forEach(storeName => {
        tx.objectStore(storeName).clear();
      });

      tx.oncomplete = () => {
        console.log('[IndexedDB] Todos os dados limpos');
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  async getEstatisticas(): Promise<{
    inspecoesPendentes: number;
    fotosPendentes: number;
    cacheEntries: number;
  }> {
    if (!this.db) await this.init();

    const [inspecoes, fotos, cache] = await Promise.all([
      this.getTodasInspecoes(),
      new Promise<any[]>((resolve, reject) => {
        const tx = this.db!.transaction('fotos_pendentes', 'readonly');
        const store = tx.objectStore('fotos_pendentes');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
      new Promise<any[]>((resolve, reject) => {
        const tx = this.db!.transaction('cache_api', 'readonly');
        const store = tx.objectStore('cache_api');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      })
    ]);

    return {
      inspecoesPendentes: inspecoes.length,
      fotosPendentes: fotos.length,
      cacheEntries: cache.length
    };
  }
}

// Singleton
export const dbService = new IndexedDBService();
export default dbService;
