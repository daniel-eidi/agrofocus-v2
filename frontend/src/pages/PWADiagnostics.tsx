import { useEffect, useState } from 'react';
import { dbService } from '../services/indexedDB';
import { usePWA } from '../hooks/usePWA';

/**
 * Página de diagnóstico e status do PWA
 * Mostra informações sobre cache, IndexedDB e service worker
 */
export default function PWADiagnostics() {
  const { state, syncInspecoes } = usePWA();
  const [dbStats, setDbStats] = useState<any>(null);
  const [cacheInfo, setCacheInfo] = useState<any[]>([]);
  const [swStatus, setSwStatus] = useState<string>('Verificando...');
  const [active, setActive] = useState(false);

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const loadDiagnostics = async () => {
    // Estatísticas do IndexedDB
    const stats = await dbService.getEstatisticas();
    setDbStats(stats);

    // Info do Service Worker
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      setSwStatus(registration.active ? 'Ativo ✅' : 'Inativo ❌');
      
      // Cache info
      const cacheNames = await caches.keys();
      const cachesInfo = await Promise.all(
        cacheNames.map(async (name) => {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          return { name, entries: keys.length };
        })
      );
      setCacheInfo(cachesInfo);
    } else {
      setSwStatus('Não suportado ❌');
    }

    setActive(true);
  };

  const clearAllData = async () => {
    if (confirm('Tem certeza que deseja limpar todos os dados offline?')) {
      await dbService.limparTudo();
      
      // Limpa caches
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      
      alert('Dados limpos! Recarregue a página.');
      loadDiagnostics();
    }
  };

  const forceSync = async () => {
    await syncInspecoes();
    alert('Sincronização forçada!');
    loadDiagnostics();
  };

  if (!active) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 20 }}>📲</div>
        <p>Carregando diagnósticos...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
      <h1>📲 Diagnóstico PWA</h1>
      
      {/* Status Geral */}
      <div style={{ 
        background: 'white', 
        padding: 20, 
        borderRadius: 12, 
        marginBottom: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2>Status Geral</h2>
        
        <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
            <span>Conexão</span>
            <span style={{ color: state.isOnline ? '#22c55e' : '#ef4444' }}>
              {state.isOnline ? '🟢 Online' : '🔴 Offline'}
            </span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
            <span>Service Worker</span>
            <span>{swStatus}</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
            <span>Modo Instalado</span>
            <span>{state.isInstalled ? '✅ Sim' : '❌ Não'}</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
            <span>Background Sync</span>
            <span>{'sync' in (window as any).ServiceWorkerRegistration.prototype ? '✅ Suportado' : '❌ Não suportado'}</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
            <span>Inspeções Pendentes</span>
            <span style={{ fontWeight: 'bold', color: dbStats?.inspecoesPendentes > 0 ? '#f59e0b' : '#22c55e' }}>
              {dbStats?.inspecoesPendentes || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Estatísticas IndexedDB */}
      <div style={{ 
        background: 'white', 
        padding: 20, 
        borderRadius: 12, 
        marginBottom: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2>📦 IndexedDB</h2>
        
        <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
            <span>Inspeções Pendentes</span>
            <span>{dbStats?.inspecoesPendentes || 0}</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
            <span>Fotos Pendentes</span>
            <span>{dbStats?.fotosPendentes || 0}</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
            <span>Cache API</span>
            <span>{dbStats?.cacheEntries || 0} entradas</span>
          </div>
        </div>
      </div>

      {/* Cache Info */}
      <div style={{ 
        background: 'white', 
        padding: 20, 
        borderRadius: 12, 
        marginBottom: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2>🗄️ Caches</h2>
        
        <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          {cacheInfo.map((cache) => (
            <div key={cache.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
              <span>{cache.name}</span>
              <span>{cache.entries} itens</span>
            </div>
          ))}
          {cacheInfo.length === 0 && (
            <p style={{ color: '#666', textAlign: 'center' }}>Nenhum cache encontrado</p>
          )}
        </div>
      </div>

      {/* Ações */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button
          onClick={forceSync}
          style={{
            padding: '12px 24px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 'bold'
          }}
        >
          🔄 Forçar Sincronização
        </button>
        
        <button
          onClick={loadDiagnostics}
          style={{
            padding: '12px 24px',
            background: '#f3f4f6',
            color: '#374151',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14
          }}
        >
          🔄 Atualizar
        </button>
        
        <button
          onClick={clearAllData}
          style={{
            padding: '12px 24px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14
          }}
        >
          🗑️ Limpar Todos os Dados
        </button>
      </div>

      {/* Instruções iOS */}
      <div style={{ 
        background: '#f0fdf4', 
        padding: 20, 
        borderRadius: 12, 
        marginTop: 20,
        border: '1px solid #bbf7d0'
      }}>
        <h3>📱 Instalar no iOS</h3>
        <ol style={{ marginTop: 12, paddingLeft: 20 }}>
          <li>Abra o Safari e navegue para o AgroFocus</li>
          <li>Toque no botão "Compartilhar" (Share)</li>
          <li>Role para baixo e toque em "Adicionar à Tela de Início"</li>
          <li>Toque em "Adicionar"</li>
        </ol>
        
        <p style={{ marginTop: 12, fontSize: 14, color: '#166534' }}>
          O app ficará disponível como um ícone nativo na sua tela inicial!
        </p>
      </div>

      {/* Instruções Android */}
      <div style={{ 
        background: '#eff6ff', 
        padding: 20, 
        borderRadius: 12, 
        marginTop: 20,
        border: '1px solid #bfdbfe'
      }}>
        <h3>🤖 Instalar no Android</h3>
        <ol style={{ marginTop: 12, paddingLeft: 20 }}>
          <li>Abra o Chrome e navegue para o AgroFocus</li>
          <li>Toque no menu (⋮) ou aguarde o prompt de instalação</li>
          <li>Toque em "Adicionar à tela inicial" ou "Instalar app"</li>
          <li>Confirme a instalação</li>
        </ol>
      </div>
    </div>
  );
}
