/**
 * Exemplo de uso do sistema offline
 * 
 * Demonstra:
 * - Uso do hook useOffline
 * - Salvar dados offline
 * - Gerenciar operações pendentes
 * - Preload de talhões
 */

import React, { useState, useEffect } from 'react';
import { OfflineStatus } from './components/OfflineStatus';
import { useOffline } from './hooks/useOffline';
import { getOfflineManager } from './utils/offlineManager';
import { getOfflineDB } from './utils/offlineDB';

const offlineManager = getOfflineManager();
const db = getOfflineDB();

function App() {
  const offline = useOffline();
  const [talhoes, setTalhoes] = useState([]);
  const [inspecoes, setInspecoes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Inicializar
  useEffect(() => {
    const init = async () => {
      await offlineManager.init();
      await carregarDados();
      setLoading(false);
    };
    init();
  }, []);

  // Carregar dados locais ou da API
  const carregarDados = async () => {
    try {
      // Tentar carregar da API se online
      if (navigator.onLine) {
        const response = await fetch('/api/talhoes');
        if (response.ok) {
          const data = await response.json();
          setTalhoes(data);
          // Salvar no IndexedDB
          await db.syncTalhoes(data);
          return;
        }
      }

      // Fallback para cache local
      const cached = await db.getAllTalhoes();
      setTalhoes(cached);
    } catch (error) {
      console.error('Erro ao carregar talhões:', error);
      // Tentar cache
      const cached = await db.getAllTalhoes();
      setTalhoes(cached);
    }
  };

  // Criar inspeção offline
  const criarInspecao = async (talhaoId) => {
    const inspecao = {
      talhaoId,
      data: new Date().toISOString(),
      observacoes: document.getElementById('obs').value,
      avaliacao: parseInt(document.getElementById('nota').value),
    };

    try {
      await offlineManager.addInspecao(inspecao);
      alert('Inspeção salva! Será sincronizada quando houver conexão.');
      
      // Atualizar lista
      const todas = await db.getAllInspecoes();
      setInspecoes(todas);
    } catch (error) {
      alert('Erro ao salvar: ' + error.message);
    }
  };

  // Preload de talhões próximos
  const preloadProximos = async () => {
    setLoading(true);
    const result = await offlineManager.preloadNearby();
    setLoading(false);
    
    if (result.success) {
      alert(`${result.count} talhões pré-carregados!`);
    } else {
      alert('Erro: ' + result.error);
    }
  };

  // Sincronizar manualmente
  const syncManual = async () => {
    const success = await offline.syncNow();
    if (success) {
      alert('Sincronização completa!');
      carregarDados();
    } else {
      alert('Falha na sincronização: ' + offline.syncError);
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="app">
      {/* Header com indicador de status */}
      <header className="app-header">
        <h1>🌾 Booster Agro</h1>
        <OfflineStatus compact={false} showDetails={true} />
      </header>

      {/* Status detalhado */}
      <section className="status-section">
        <h2>Status da Conexão</h2>
        <div className="status-grid">
          <div className="status-item">
            <span className="label">Conexão:</span>
            <span className={`value ${offline.isOnline ? 'online' : 'offline'}`}>
              {offline.isOnline ? '🟢 Online' : '🔴 Offline'}
            </span>
          </div>
          
          <div className="status-item">
            <span className="label">Qualidade:</span>
            <span className="value">{offline.connectionQuality}</span>
          </div>
          
          <div className="status-item">
            <span className="label">Pendentes:</span>
            <span className={`value ${offline.pendingCount > 0 ? 'warning' : ''}`}>
              {offline.pendingCount}
            </span>
          </div>
          
          <div className="status-item">
            <span className="label">Último Sync:</span>
            <span className="value">
              {offline.lastSync 
                ? new Date(offline.lastSync).toLocaleString('pt-BR')
                : 'Nunca'}
            </span>
          </div>
        </div>

        {offline.pendingCount > 0 && offline.isOnline && (
          <button 
            onClick={syncManual}
            disabled={offline.isSyncing}
            className="sync-btn"
          >
            {offline.isSyncing ? '🔄 Sincronizando...' : '📤 Sincronizar Agora'}
          </button>
        )}
      </section>

      {/* Lista de Talhões */}
      <section className="talhoes-section">
        <h2>Talhões ({talhoes.length})</h2>
        
        <button onClick={preloadProximos} className="preload-btn">
          📍 Pré-carregar Talhões Próximos
        </button>

        <div className="talhoes-list">
          {talhoes.map((talhao) => (
            <div key={talhao.id} className="talhao-card">
              <h3>{talhao.nome || talhao.id}</h3>
              <p>Área: {talhao.areaHa} ha</p>
              <p>Cultura: {talhao.cultura}</p>
              
              <div className="inspecao-form">
                <input 
                  type="text" 
                  id="obs" 
                  placeholder="Observações"
                  defaultValue=""
                />
                <select id="nota" defaultValue="5">
                  {[1,2,3,4,5].map(n => (
                    <option key={n} value={n}>Nota {n}</option>
                  ))}
                </select>
                
                <button onClick={() => criarInspecao(talhao.id)}>
                  💾 Salvar Inspeção
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Inspeções Pendentes */}
      {inspecoes.length > 0 && (
        <section className="inspecoes-section">
          <h2>Inspeções Salvas ({inspecoes.length})</h2>
          
          <ul>
            {inspecoes.map((insp) => (
              <li key={insp.id} className={insp.syncStatus}>
                <strong>{insp.talhaoId}</strong>: {insp.observacoes}
                <span className="badge">{insp.syncStatus}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Debug Info */}
      <section className="debug-section">
        <h2>Debug</h2>
        <button onClick={async () => {
          const info = await db.getStorageInfo();
          console.table(info);
          alert('Ver console para info do storage');
        }>
          ℹ️ Info do Storage
        </button>
        
        <button onClick={async () => {
          await db.clearAllData();
          alert('Dados limpos!');
        }>
          🗑️ Limpar Todos os Dados
        </button>
      </section>
    </div>
  );
}

export default App;
