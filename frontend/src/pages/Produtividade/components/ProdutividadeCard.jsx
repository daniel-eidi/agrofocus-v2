/**
 * Card de Estimativa de Produtividade
 * Exibe a estimativa principal com intervalo de confiança
 */

import React from 'react';
import './ProdutividadeCard.css';

const ProdutividadeCard = ({ estimativa, cultura, metodo }) => {
  const { produtividade_ton_ha, intervalo_confianca } = estimativa;
  
  // Determinar cor baseada na produtividade
  const getCorProdutividade = (valor) => {
    if (cultura.nome === 'Milho') {
      if (valor >= 12) return 'excelente';
      if (valor >= 8) return 'bom';
      if (valor >= 5) return 'medio';
      return 'baixo';
    } else if (cultura.nome === 'Soja') {
      if (valor >= 4) return 'excelente';
      if (valor >= 2.5) return 'bom';
      if (valor >= 1.5) return 'medio';
      return 'baixo';
    }
    return 'bom';
  };

  const corClasse = getCorProdutividade(produtividade_ton_ha);

  return (
    <div className={`produtividade-card ${corClasse}`}>
      <div className="card-header">
        <span className="icon">🎯</span>
        <h3>Estimativa de Produtividade</h3>
        <span className="metodo-badge" title={metodo === 'modelo_ml' ? 'Modelo de Machine Learning' : 'Tabela de calibração NDVI'}>
          {metodo === 'modelo_ml' ? '🤖 ML' : '📊 Tabela'}
        </span>
      </div>

      <div className="card-body">
        <div className="valor-principal">
          <span className="numero">{produtividade_ton_ha}</span>
          <span className="unidade">{t/ha}</span>
        </div>

        <div className="intervalo-confianca">
          <span className="label">Intervalo de confiança ({intervalo_confianca.nivel}):</span>
          <span className="valores">
            {intervalo_confianca.min} - {intervalo_confianca.max} t/ha
          </span>
        </div>

        <div className={`classificacao ${corClasse}`}>
          <span className="classificacao-label">
            {corClasse === 'excelente' && '⭐ Excelente'}
            {corClasse === 'bom' && '✅ Bom'}
            {corClasse === 'medio' && '⚡ Médio'}
            {corClasse === 'baixo' && '⚠️ Baixo'}
          </span>
        </div>
      </div>

      <div className="card-footer">
        <span className="cultura-tag">
          {cultura.nome}
        </span>
        <span className="atualizacao">
          Atualizado: {new Date().toLocaleDateString('pt-BR')}
        </span>
      </div>
    </div>
  );
};

export default ProdutividadeCard;
