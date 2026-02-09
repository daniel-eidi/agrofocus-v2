/**
 * Dashboard de Produtividade - Componente Principal
 * AgroFocus Frontend
 * 
 * Funcionalidades:
 * - Visualizar estimativa de produtividade
 * - Comparar com dados reais (quando disponíveis)
 * - Gráfico de tendência histórica
 * - Alertas de produtividade abaixo da média
 */

import React, { useState, useEffect } from 'react';
import ProdutividadeCard from './components/ProdutividadeCard';
import TendenciaChart from './components/TendenciaChart';
import ComparativoReal from './components/ComparativoReal';
import AlertasPanel from './components/AlertasPanel';
import { produtividadeAPI } from '../../services/produtividade.api';
import './ProdutividadeDashboard.css';

const ProdutividadeDashboard = () => {
  const [talhaoSelecionado, setTalhaoSelecionado] = useState('talhao-001');
  const [safra, setSafra] = useState('2023/2024');
  const [cultura, setCultura] = useState('1');
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);

  const talhoesDisponiveis = [
    { id: 'talhao-001', nome: 'Talhão 1 - Norte', area: '45 ha' },
    { id: 'talhao-002', nome: 'Talhão 2 - Sul', area: '38 ha' },
    { id: 'talhao-003', nome: 'Talhão 3 - Leste', area: '52 ha' },
    { id: 'talhao-004', nome: 'Talhão 4 - Oeste', area: '41 ha' },
  ];

  const culturas = [
    { id: '1', nome: 'Milho' },
    { id: '2', nome: 'Soja' },
    { id: '3', nome: 'Trigo' },
    { id: '4', nome: 'Algodão' },
  ];

  const safras = ['2021/2022', '2022/2023', '2023/2024', '2024/2025'];

  useEffect(() => {
    carregarDados();
  }, [talhaoSelecionado, safra, cultura]);

  const carregarDados = async () => {
    setCarregando(true);
    setErro(null);
    
    try {
      const resultado = await produtividadeAPI.estimarProdutividade(
        talhaoSelecionado,
        safra,
        cultura
      );
      
      if (resultado.sucesso) {
        setDados(resultado);
      } else {
        setErro(resultado.erro || 'Erro ao carregar dados');
      }
    } catch (error) {
      setErro('Erro de conexão com o servidor');
      console.error(error);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="produtividade-dashboard">
      <header className="dashboard-header">
        <h1>🌾 Estimativa de Produtividade</h1>
        <p className="subtitle">
          Análise baseada em NDVI, dados climáticos e histórico do talhão
        </p>
      </header>

      <section className="filtros-section">
        <div className="filtro-grupo">
          <label>Talhão:</label>
          <select 
            value={talhaoSelecionado} 
            onChange={(e) => setTalhaoSelecionado(e.target.value)}
          >
            {talhoesDisponiveis.map(t => (
              <option key={t.id} value={t.id}>
                {t.nome} ({t.area})
              </option>
            ))}
          </select>
        </div>

        <div className="filtro-grupo">
          <label>Safra:</label>
          <select value={safra} onChange={(e) => setSafra(e.target.value)}>
            {safras.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="filtro-grupo">
          <label>Cultura:</label>
          <select value={cultura} onChange={(e) => setCultura(e.target.value)}>
            {culturas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>

        <button 
          className="btn-atualizar"
          onClick={carregarDados}
          disabled={carregando}
        >
          {carregando ? '🔄 Atualizando...' : '🔄 Atualizar'}
        </button>
      </section>

      {erro && (
        <div className="erro-mensagem">
          ⚠️ {erro}
        </div>
      )}

      {carregando && !dados && (
        <div className="carregando">
          <div className="spinner"></div>
          <p>Calculando estimativa de produtividade...</p>
        </div>
      )}

      {dados && (
        <>
          <section className="cards-section">
            <ProdutividadeCard 
              estimativa={dados.estimativa}
              cultura={dados.cultura}
              metodo={dados.estimativa.metodo}
            />

            <ComparativoReal 
              estimativa={dados.estimativa}
              produtividadeReal={dados.produtividade_real}
              comparativo={dados.comparativos.media_historica}
            />

            <AlertasPanel 
              alertas={dados.alertas}
              tendencia={dados.tendencia}
            />
          </section>

          <section className="graficos-section">
            <div className="grafico-card">
              <h3>📈 Tendência de Produtividade</h3>
              <TendenciaChart 
                dados={dados.dados_historicos.ultimas_3_safras}
                tendencia={dados.tendencia}
                estimativaAtual={dados.estimativa.produtividade_ton_ha}
              />
            </div>

            <div className="grafico-card">
              <h3>📊 Comparativo Ano a Ano</h3>
              <div className="comparativo-anos">
                <div className="ano-card">
                  <span className="ano-label">{ dados.comparativos.ano_anterior.safra_anterior }</span>
                  <span className="ano-valor">
                    { dados.comparativos.ano_anterior.estimativa_ano_anterior } t/ha
                  </span>
                </div>
                <div className="variacao-seta">
                  {dados.comparativos.ano_anterior.variacao_percentual >= 0 ? '⬆️' : '⬇️'}
                  <span className={dados.comparativos.ano_anterior.variacao_percentual >= 0 ? 'positivo' : 'negativo'}>
                    {Math.abs(dados.comparativos.ano_anterior.variacao_percentual).toFixed(1)}%
                  </span>
                </div>
                <div className="ano-card atual">
                  <span className="ano-label">{safra}</span>
                  <span className="ano-valor">
                    {dados.estimativa.produtividade_ton_ha} t/ha
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="dados-detalhados">
            <h3>📋 Dados Utilizados na Estimativa</h3>
            <div className="dados-grid">
              <div className="dado-item">
                <span className="dado-label">NDVI Médio</span>
                <span className="dado-valor">{dados.dados_historicos.ndvi_medio}</span>
                <span className="dado-desc">Índice de vegetação</span>
              </div>
              
              <div className="dado-item">
                <span className="dado-label">GDD Acumulado</span>
                <span className="dado-valor">{dados.dados_historicos.gdd_acumulado}</span>
                <span className="dado-desc">Graus-dia de crescimento</span>
              </div>
              
              <div className="dado-item">
                <span className="dado-label">Precipitação</span>
                <span className="dado-valor">{dados.dados_historicos.precipitacao_total} mm</span>
                <span className="dado-desc">Total no período</span>
              </div>
              
              <div className="dado-item">
                <span className="dado-label">Método</span>
                <span className="dado-valor metodo">
                  {dados.estimativa.metodo === 'modelo_ml' ? '🤖 ML' : '📊 Calibração'}
                </span>
                <span className="dado-desc">{ dados.estimativa.metodo === 'modelo_ml' ? 'Regressão Linear' : 'Tabela NDVI' }</span>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default ProdutividadeDashboard;
