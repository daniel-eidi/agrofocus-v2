import React, { useState, useEffect } from 'react';
import { useOffline } from '../../hooks/useOffline';
import './OfflineStatus.css';

/**
 * Componente de Indicador de Status Offline
 * 
 * Estados visuais:
 * - 🟢 Online: Conectado, todos os dados sincronizados
 * - 🟡 Offline: Sem conexão, usando dados locais
 * - 🔴 Offline com pendentes: Operações aguardando sync
 */

export function OfflineStatus({ 
  compact = false, 
  showDetails = true,
  className = '' 
}) {
  const {
    isOnline,
    pendingCount,
    isSyncing,
    lastSync,
    syncError,
    connectionQuality,
    status,
    syncNow,
  } = useOffline();

  const [expanded, setExpanded] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Mostrar toast quando voltar online com pendentes
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingCount]);

  const handleSync = async () => {
    await syncNow();
    setExpanded(false);
  };

  const formatLastSync = (dateString) => {
    if (!dateString) return 'Nunca sincronizado';
    
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'Agora mesmo';
    if (diff < 3600) return `Há ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Há ${Math.floor(diff / 3600)}h`;
    return date.toLocaleDateString('pt-BR');
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'online':
        return '🟢';
      case 'syncing':
        return '🔄';
      case 'offline-clean':
        return '🟡';
      case 'offline-pending':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const getStatusText = () => {
    if (isSyncing) return 'Sincronizando...';
    if (!isOnline && pendingCount > 0) return `${pendingCount} operações pendentes`;
    if (!isOnline) return 'Offline - Dados locais';
    if (pendingCount > 0) return `${pendingCount} operações pendentes`;
    return 'Online';
  };

  const getStatusClass = () => {
    if (isSyncing) return 'syncing';
    if (!isOnline && pendingCount > 0) return 'offline-pending';
    if (!isOnline) return 'offline';
    if (pendingCount > 0) return 'pending';
    return 'online';
  };

  const getConnectionQualityIcon = () => {
    switch (connectionQuality) {
      case '4g':
      case 'excellent':
        return '📶📶📶📶';
      case '3g':
      case 'good':
        return '📶📶📶';
      case '2g':
      case 'fair':
        return '📶📶';
      case 'slow-2g':
      case 'poor':
        return '📶';
      case 'offline':
        return '📵';
      default:
        return '📶?';
    }
  };

  // Versão compacta (ícone apenas)
  if (compact) {
    return (
      <div 
        className={`offline-status compact ${getStatusClass()} ${className}`}
        onClick={() => setExpanded(!expanded)}
        title={getStatusText()}
      >
        <span className="status-icon">{getStatusIcon()}</span>
        {pendingCount > 0 && (
          <span className="pending-badge">{pendingCount}</span>
        )}
        
        {expanded && (
          <div className="status-tooltip">
            <p>{getStatusText()}</p>
            {lastSync && <p className="last-sync">Último sync: {formatLastSync(lastSync)}</p>}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Toast de notificação */}
      {showToast && (
        <div className="sync-toast">
          <span>🔄 Conexão restabelecida! {pendingCount} operações pendentes.</span>
          <button onClick={handleSync}>Sincronizar agora</button>
          <button onClick={() => setShowToast(false)}>✕</button>
        </div>
      )}

      {/* Componente principal */}
      <div className={`offline-status ${getStatusClass()} ${className}`}>
        <div 
          className="status-header"
          onClick={() => showDetails && setExpanded(!expanded)}
        >
          <span className="status-icon">{getStatusIcon()}</span>
          <span className="status-text">{getStatusText()}</span>
          
          {!isOnline && (
            <span className="connection-quality" title={`Qualidade: ${connectionQuality}`}>
              {getConnectionQualityIcon()}
            </span>
          )}
          
          {showDetails && (
            <span className={`expand-icon ${expanded ? 'expanded' : ''}`}>▼</span>
          )}
        </div>

        {/* Detalhes expandidos */}
        {expanded && showDetails && (
          <div className="status-details">
            <div className="detail-item">
              <span className="detail-label">Status:</span>
              <span className="detail-value">
                {isOnline ? '🟢 Online' : '🔴 Offline'}
              </span>
            </div>
            
            <div className="detail-item">
              <span className="detail-label">Qualidade:</span>
              <span className="detail-value">{connectionQuality}</span>
            </div>
            
            <div className="detail-item">
              <span className="detail-label">Pendentes:</span>
              <span className={`detail-value ${pendingCount > 0 ? 'warning' : ''}`}>
                {pendingCount} {pendingCount === 1 ? 'operação' : 'operações'}
              </span>
            </div>
            
            <div className="detail-item">
              <span className="detail-label">Último sync:</span>
              <span className="detail-value">{formatLastSync(lastSync)}</span>
            </div>

            {syncError && (
              <div className="detail-item error">
                <span className="detail-label">Erro:</span>
                <span className="detail-value">{syncError}</span>
              </div>
            )}

            {isOnline && pendingCount > 0 && (
              <button 
                className="sync-button"
                onClick={handleSync}
                disabled={isSyncing}
              >
                {isSyncing ? '🔄 Sincronizando...' : '📤 Sincronizar agora'}
              </button>
            )}

            {!isOnline && pendingCount > 0 && (
              <p className="offline-hint">
                📴 Conecte-se à internet para sincronizar as operações pendentes.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default OfflineStatus;
