/**
 * Componente IndiceSelector
 * Dropdown para seleção de índices de vegetação
 */

import React, { useState } from 'react';
import './styles.css';

const INDICES = [
  {
    id: 'NDVI',
    nome: 'NDVI',
    descricao: 'Índice de Vegetação Normalizado',
    aplicacao: 'Uso geral',
    icone: '🌿',
    cores: '🔴🟡🟢',
    melhorPara: 'Monitoramento contínuo'
  },
  {
    id: 'NDRE',
    nome: 'NDRE',
    descricao: 'Normalized Difference Red Edge',
    aplicacao: 'Borda Vermelha',
    icone: '🌾',
    cores: '🟤🟡🟢',
    melhorPara: 'Culturas densas (R3-R6)'
  },
  {
    id: 'MSAVI',
    nome: 'MSAVI',
    descricao: 'Modified Soil Adjusted VI',
    aplicacao: 'Ajustado ao Solo',
    icone: '🌱',
    cores: '🔴🟠🟢',
    melhorPara: 'Estágios iniciais (V2-V6)'
  },
  {
    id: 'RGB',
    nome: 'RGB',
    descricao: 'Imagem Colorida',
    aplicacao: 'Visualização',
    icone: '📷',
    cores: '🔴🟢🔵',
    melhorPara: 'Inspeção visual'
  }
];

const LEGENDAS = {
  NDVI: {
    titulo: 'NDVI - Vegetação',
    faixas: [
      { cor: '#8B0000', valor: '-1 a 0', descricao: 'Água/Nuvem/Sombra' },
      { cor: '#FF0000', valor: '0 a 0.2', descricao: 'Solo exposto/Concreto' },
      { cor: '#FFFF00', valor: '0.2 a 0.4', descricao: 'Vegetação rala/Escassa' },
      { cor: '#7CFC00', valor: '0.4 a 0.6', descricao: 'Vegetação moderada' },
      { cor: '#006400', valor: '0.6 a 1.0', descricao: 'Vegetação densa/Saudável' }
    ]
  },
  NDRE: {
    titulo: 'NDRE - Red Edge',
    faixas: [
      { cor: '#8B4513', valor: '-1 a 0', descricao: 'Solo/Água' },
      { cor: '#D2691E', valor: '0 a 0.2', descricao: 'Estresse severo' },
      { cor: '#FFD700', valor: '0.2 a 0.4', descricao: 'Estresse moderado' },
      { cor: '#9ACD32', valor: '0.4 a 0.6', descricao: 'Saudável' },
      { cor: '#006400', valor: '0.6 a 1.0', descricao: 'Muito saudável/Denso' }
    ]
  },
  MSAVI: {
    titulo: 'MSAVI - Solo Ajustado',
    faixas: [
      { cor: '#FF0000', valor: '-1 a 0', descricao: 'Não-vegetação' },
      { cor: '#FF4500', valor: '0 a 0.2', descricao: 'Solo exposto' },
      { cor: '#FFA500', valor: '0.2 a 0.4', descricao: 'Início cultura' },
      { cor: '#9ACD32', valor: '0.4 a 0.6', descricao: 'Desenvolvimento' },
      { cor: '#228B22', valor: '0.6 a 1.0', descricao: 'Cobertura total' }
    ]
  },
  RGB: {
    titulo: 'RGB - Visual',
    faixas: [
      { cor: '#4169E1', valor: 'Banda 2', descricao: 'Azul' },
      { cor: '#32CD32', valor: 'Banda 3', descricao: 'Verde' },
      { cor: '#DC143C', valor: 'Banda 4', descricao: 'Vermelho' }
    ]
  }
};

const IndiceSelector = ({ indiceAtual, onChange, mostrarLegenda = true }) => {
  const [aberto, setAberto] = useState(false);
  const [infoVisivel, setInfoVisivel] = useState(false);

  const indiceSelecionado = INDICES.find(i => i.id === indiceAtual) || INDICES[0];
  const legenda = LEGENDAS[indiceAtual] || LEGENDAS.NDVI;

  const handleSelect = (indice) => {
    onChange(indice.id);
    setAberto(false);
  };

  return (
    <div className="indice-selector-container">
      {/* Dropdown de Seleção */}
      <div className="indice-selector">
        <label className="indice-label">
          <span className="indice-label-icone">🛰️</span>
          Índice de Vegetação
        </label>
        
        <div className="indice-dropdown" onClick={() => setAberto(!aberto)}>
          <div className="indice-selecionado">
            <span className="indice-icone">{indiceSelecionado.icone}</span>
            <div className="indice-info">
              <span className="indice-nome">{indiceSelecionado.nome}</span>
              <span className="indice-descricao-curta">{indiceSelecionado.aplicacao}</span>
            </div>
            <span className={`indice-seta ${aberto ? 'aberto' : ''}`}>▼</span>
          </div>

          {aberto && (
            <div className="indice-opcoes">
              {INDICES.map((indice) => (
                <div
                  key={indice.id}
                  className={`indice-opcao ${indice.id === indiceAtual ? 'ativo' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(indice);
                  }}
                >
                  <span className="indice-opcao-icone">{indice.icone}</span>
                  <div className="indice-opcao-info">
                    <span className="indice-opcao-nome">{indice.nome}</span>
                    <span className="indice-opcao-descricao">{indice.descricao}</span>
                    <span className="indice-opcao-melhor">💡 {indice.melhorPara}</span>
                  </div>
                  <span className="indice-opcao-cores">{indice.cores}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botão de Informações */}
        <button 
          className="btn-info"
          onClick={() => setInfoVisivel(!infoVisivel)}
          title="Ver informações do índice"
        >
          ℹ️
        </button>
      </div>

      {/* Painel de Informações */}
      {infoVisivel && (
        <div className="indice-info-panel">
          <h4>📊 Quando usar cada índice?</h4>
          <div className="indice-cards">
            {INDICES.filter(i => i.id !== 'RGB').map(indice => (
              <div key={indice.id} className={`indice-card ${indice.id === indiceAtual ? 'destaque' : ''}`}>
                <span className="indice-card-icone">{indice.icone}</span>
                <strong>{indice.nome}</strong>
                <p>{indice.melhorPara}</p>
                <small>{indice.descricao}</small>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legenda */}
      {mostrarLegenda && (
        <div className="indice-legenda">
          <h4>{legenda.titulo}</h4>
          <div className="legenda-itens">
            {legenda.faixas.map((faixa, idx) => (
              <div key={idx} className="legenda-item">
                <span 
                  className="legenda-cor" 
                  style={{ backgroundColor: faixa.cor }}
                />
                <span className="legenda-valor">{faixa.valor}</span>
                <span className="legenda-descricao">{faixa.descricao}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default IndiceSelector;
export { INDICES, LEGENDAS };
