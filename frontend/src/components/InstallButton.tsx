import { usePWA } from '../hooks/usePWA';

interface InstallButtonProps {
  variant?: 'button' | 'banner' | 'minimal';
}

/**
 * Botão de instalação do PWA
 * Detecta beforeinstallprompt e permite instalar o app
 * 
 * Variantes:
 * - button: Botão padrão no header
 * - banner: Banner de instalação
 * - minimal: Ícone pequeno
 */
export default function InstallButton({ variant = 'button' }: InstallButtonProps) {
  const { state, installApp, dismissInstall } = usePWA();

  // Não mostra se não for instalável ou já estiver instalado
  if (!state.isInstallable || state.isInstalled) {
    return null;
  }

  // Detecta iOS (não suporta beforeinstallprompt)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (isIOS && variant !== 'banner') {
    return (
      <button
        onClick={() => {
          alert(
            '📱 Para instalar no iOS:\n\n' +
            '1. Toque no botão "Compartilhar" (Share)\n' +
            '2. Role para baixo\n' +
            '3. Toque em "Adicionar à Tela de Início"\n\n' +
            'O app ficará disponível como um ícone nativo!'
          );
          dismissInstall();
        }}
        style={{
          padding: '8px 16px',
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.5)',
          color: 'white',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}
      >
        📱 iOS
      </button>
    );
  }

  if (variant === 'banner') {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#166534',
          color: 'white',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          zIndex: 1000,
          boxShadow: '0 -2px 10px rgba(0,0,0,0.2)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 32 }}>🌱</div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: 16 }}>Instalar AgroFocus</div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>
              Acesse mais rápido e use offline!
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={dismissInstall}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.5)',
              color: 'white',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            Depois
          </button>
          <button
            onClick={installApp}
            style={{
              padding: '10px 20px',
              background: 'white',
              border: 'none',
              color: '#166534',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 'bold'
            }}
          >
            Instalar
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <button
        onClick={installApp}
        title="Instalar App"
        style={{
          padding: '8px',
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        📲
      </button>
    );
  }

  // Botão padrão (button)
  return (
    <button
      onClick={installApp}
      style={{
        padding: '8px 16px',
        background: 'rgba(255,255,255,0.15)',
        border: '1px solid rgba(255,255,255,0.3)',
        color: 'white',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        transition: 'all 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
      }}
    >
      📲 Instalar
    </button>
  );
}
