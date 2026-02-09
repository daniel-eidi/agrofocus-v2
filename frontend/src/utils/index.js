/**
 * Offline System - Booster Agro
 * 
 * Exporta todos os módulos do sistema offline
 */

// Core
export { getOfflineDB, default as OfflineDB } from './offlineDB';
export { getSyncQueue, default as SyncQueue, SyncStatus, OperationType } from './syncQueue';
export { getOfflineManager, default as OfflineManager, ImageCompressor, LazyLoader, LocationPreloader } from './offlineManager';

// Service Worker
export { 
  register, 
  updateServiceWorker, 
  checkForUpdates, 
  getSWVersion, 
  clearAllCaches, 
  precacheTalhoes, 
  unregister 
} from './swRegistration';

// Hooks
export { useOffline, default as useOfflineHook } from '../hooks/useOffline';

// Components
export { OfflineStatus, default as OfflineStatusComponent } from '../components/OfflineStatus';
