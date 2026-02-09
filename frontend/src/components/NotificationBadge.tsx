import { useState } from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';

interface NotificationBadgeProps {
  onClick?: () => void;
}

export function NotificationBadge({ onClick }: NotificationBadgeProps) {
  const { 
    isSupported, 
    isSubscribed, 
    permission, 
    subscribe, 
    unsubscribe, 
    loading 
  } = usePushNotifications();
  
  const [showTooltip, setShowTooltip] = useState(false);

  // Se não é suportado, não mostra nada
  if (!isSupported) {
    return null;
  }

  const getStatusColor = () => {
    if (permission === 'denied') return '#ef4444'; // vermelho
    if (isSubscribed) return '#22c55e'; // verde
    if (permission === 'default') return '#f59e0b'; // amarelo
    return '#9ca3af'; // cinza
  };

  const getStatusText = () => {
    if (permission === 'denied') return 'Notificações bloqueadas';
    if (isSubscribed) return 'Notificações ativadas';
    if (permission === 'default') return 'Clique para ativar notificações';
    return 'Status desconhecido';
  };

  const handleClick = async () => {
    if (onClick) {
      onClick();
      return;
    }

    if (isSubscribed) {
      const confirm = window.confirm('Deseja desativar as notificações?');
      if (confirm) {
        await unsubscribe();
      }
    } else if (permission !== 'denied') {
      await subscribe();
    } else {
      alert('Você bloqueou as notificações. Para ativar, vá nas configurações do navegador.');
    }
  };

  return (
    <div 
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: permission === 'denied' ? 'not-allowed' : 'pointer',
          padding: '8px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: loading ? 0.6 : 1,
          transition: 'all 0.2s',
        }}
        title={getStatusText()}
      >
        {/* Ícone de sino */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke={getStatusColor()}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          {isSubscribed && <circle cx="18" cy="6" r="3" fill="#22c55e" stroke="none" />}
        </svg>
        
        {/* Indicador de status */}
        <span
          style={{
            position: 'absolute',
            bottom: '4px',
            right: '4px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: getStatusColor(),
            border: '2px solid #166534',
          }}
        />
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            padding: '8px 12px',
            backgroundColor: '#1f2937',
            color: 'white',
            borderRadius: '6px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          }}
        >
          {getStatusText()}
        </div>
      )}
    </div>
  );
}

export default NotificationBadge;
