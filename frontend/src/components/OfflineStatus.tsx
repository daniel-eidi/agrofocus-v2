import { useState } from 'react';
import { usePWA } from '../hooks/usePWA';

/**
 * Componente de status offline
 * Mostra banner quando está offline e contador de inspeções pendentes
 */
export default function OfflineStatus() {
  const { state, syncInspecoes } = usePWA();
  const [showDetails, setShowDetails] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Mostra banner quando está offline ou tem inspeções pendentes
  const showBanner = state.isOffline || state.inspecoesPendentes > 0;

  if (!showBanner && !showDetails) return null;

  const handleSync = async () => {
    setIsSyncing(true);
    await syncInspecoes();
    setTimeout(() => setIsSyncing(false), 1000);
  };

  // Modo offline
  if (state.isOffline) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          background: '#f59e0b',
          color: 'white',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          zIndex: 1001,
          fontSize: 14
        }}
      >
        <span>📡 Modo Offline</span>
        {state.inspecoesPendentes > 0 && (
          <span>• {state.inspecoesPendentes} inspeção(ões) pendente(s)</span>
        )}
        <button
          onClick={() => setShowDetails(!showDetails)}
          style={{
            marginLeft: 10,
            padding: '4px 12px',
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: 'white',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 12
          }}
        >
          {showDetails ? 'Ocultar' : 'Detalhes'}
        </button>

        {showDetails && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'white',
              color: '#333',
              padding: 16,
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              minWidth: 280,
              marginTop: 8,
              textAlign: 'center'
            }}
          >
            <p style={{ margin: '0 0 12px 0', fontSize: 13 }}>
              🔄 As inspeções serão sincronizadas automaticamente quando você voltar online.
            </p>
            <button
              onClick={() => setShowDetails(false)}
              style={{
                padding: '6px 16px',
                background: '#f3f4f6',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 13
              }}
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    );
  }

  // Online mas com inspeções pendentes
  if (state.inspecoesPendentes > 0) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          background: '#3b82f6',
          color: 'white',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          zIndex: 1001,
          fontSize: 14
        }}
      >
        <span>📝 {state.inspecoesPendentes} inspeção(ões) para sincronizar</span>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          style={{
            padding: '6px 16px',
            background: 'white',
            border: 'none',
            color: '#3b82f6',
            borderRadius: 4,
            cursor: isSyncing ? 'wait' : 'pointer',
            fontSize: 13,
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          {isSyncing ? (
            <>
              <span style={{ animation: 'spin 1s linear infinite' }}>🔄</span>
              Sincronizando...
            </>
          ) : (
            'Sincronizar Agora'
          )}
        </button>

        <style>{
          `@keyframes spin { to { transform: rotate(360deg); } }`
        }</style>
      </div>
    );
  }

  return null;
}
