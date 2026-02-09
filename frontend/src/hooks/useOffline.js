/**
 * useOffline - Hook para gerenciamento de estado offline
 * 
 * Provê:
 * - Status de conexão (online/offline)
 * - Contador de operações pendentes
 * - Controle de sync
 * - Dados de última sincronização
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getOfflineDB } from '../utils/offlineDB';
import { getSyncQueue, SyncStatus } from '../utils/syncQueue';

export function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [connectionQuality, setConnectionQuality] = useState('unknown');
  
  const db = useRef(getOfflineDB());
  const syncQueue = useRef(getSyncQueue());
  const intervalRef = useRef(null);

  // Atualizar contador de pendentes
  const updatePendingCount = useCallback(async () => {
    try {
      const stats = await db.current.getSyncQueueStats();
      setPendingCount(stats.pending + stats.syncing);
    } catch (error) {
      console.error('[useOffline] Erro ao obter stats:', error);
    }
  }, []);

  // Atualizar última sincronização
  const updateLastSync = useCallback(async () => {
    try {
      const last = await db.current.getLastSync();
      setLastSync(last);
    } catch (error) {
      console.error('[useOffline] Erro ao obter lastSync:', error);
    }
  }, []);

  // Verificar qualidade da conexão
  const checkConnectionQuality = useCallback(async () => {
    if (!navigator.onLine) {
      setConnectionQuality('offline');
      return;
    }

    // Usar Network Information API se disponível
    if ('connection' in navigator) {
      const conn = navigator.connection;
      if (conn.effectiveType) {
        setConnectionQuality(conn.effectiveType); // '4g', '3g', '2g', 'slow-2g'
        return;
      }
    }

    // Teste de ping simples
    const startTime = Date.now();
    try {
      await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      const latency = Date.now() - startTime;
      
      if (latency < 100) setConnectionQuality('excellent');
      else if (latency < 300) setConnectionQuality('good');
      else if (latency < 1000) setConnectionQuality('fair');
      else setConnectionQuality('poor');
    } catch {
      setConnectionQuality('poor');
    }
  }, []);

  // Iniciar sincronização manual
  const syncNow = useCallback(async () => {
    if (!navigator.onLine) {
      setSyncError('Sem conexão com a internet');
      return false;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      await syncQueue.current.processQueue();
      await updateLastSync();
      await updatePendingCount();
      return true;
    } catch (error) {
      setSyncError(error.message);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [updateLastSync, updatePendingCount]);

  // Cancelar uma operação pendente
  const cancelOperation = useCallback(async (id) => {
    try {
      await syncQueue.current.cancel(id);
      await updatePendingCount();
      return true;
    } catch (error) {
      console.error('[useOffline] Erro ao cancelar:', error);
      return false;
    }
  }, [updatePendingCount]);

  // Retentar operações falhadas
  const retryFailed = useCallback(async () => {
    try {
      const count = await syncQueue.current.retryFailed();
      return count;
    } catch (error) {
      console.error('[useOffline] Erro ao retry:', error);
      return 0;
    }
  }, []);

  // Limpar operações completadas
  const cleanup = useCallback(async () => {
    try {
      const count = await syncQueue.current.cleanup();
      return count;
    } catch (error) {
      console.error('[useOffline] Erro ao cleanup:', error);
      return 0;
    }
  }, []);

  // Efeito inicial
  useEffect(() => {
    const init = async () => {
      await db.current.init();
      await syncQueue.current.init();
      await updatePendingCount();
      await updateLastSync();
      await checkConnectionQuality();
    };

    init();

    // Registrar listener no SyncQueue
    const unsubscribe = syncQueue.current.addListener((event, data) => {
      switch (event) {
        case 'enqueued':
        case 'item-success':
        case 'item-failed':
        case 'cancelled':
          updatePendingCount();
          break;
        case 'processing':
          setIsSyncing(true);
          break;
        case 'completed':
          setIsSyncing(false);
          updateLastSync();
          break;
        case 'error':
          setSyncError(data.error);
          setIsSyncing(false);
          break;
        case 'online':
          setIsOnline(true);
          break;
        case 'offline':
          setIsOnline(false);
          break;
      }
    });

    // Listeners de conexão
    const handleOnline = () => {
      setIsOnline(true);
      checkConnectionQuality();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectionQuality('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Atualização periódica do contador
    intervalRef.current = setInterval(() => {
      updatePendingCount();
      if (navigator.onLine) {
        checkConnectionQuality();
      }
    }, 30000); // A cada 30 segundos

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [updatePendingCount, updateLastSync, checkConnectionQuality]);

  // Status completo
  const getStatus = () => {
    if (isOnline && pendingCount === 0) return 'online';
    if (isOnline && pendingCount > 0) return 'syncing';
    if (!isOnline && pendingCount === 0) return 'offline-clean';
    return 'offline-pending';
  };

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSync,
    syncError,
    connectionQuality,
    status: getStatus(),
    syncNow,
    cancelOperation,
    retryFailed,
    cleanup,
    refreshPending: updatePendingCount,
  };
}

export default useOffline;
