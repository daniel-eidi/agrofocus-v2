/**
 * Comparativo entre Estimativa e Produtividade Real
 * Mostra diferença quando dados reais estão disponíveis
 */

import React from 'react';
import './ComparativoReal.css';

const ComparativoReal = ({ estimativa, produtividadeReal, comparativo }) => {
  const temDadosReais = produtividadeReal && produtividadeReal.disponivel;
  
  const calcularDiferenca = () => {
    if (!temDadosReais) return null;
    const diff = estimativa.produtividade_ton_ha - produtividadeReal.produtividade_ton_ha;
    const percentual = (diff / produtividadeReal.produtividade_ton_ha) * 100;
    return { diff, percentual };
  };

  const diferenca = calcularDiferenca();

  return (
    <div className="comparativo-real-card">
      <div className="card-header">
        <span className="icon">📊</span>
        <h3>Comparativo</h3>
      </div>

      <div className="card-body">
        {temDadosReais ? (
          <>
            <div className="comparacao-grid">
              <div className="comparacao-item">
                <span className="label">Estimativa (ML)</span>
                <span className="valor">{estimativa.produtividade_ton_ha} t/ha</span>
              </div>
              
              <div className="diferenca-indicator">
                <span className={`arrow ${diferenca.percentual > 0 ? 'positivo' : 'negativo'}`}>
                  {diferenca.percentual > 0 ? '↑' : '↓'}
                </span>
                <span className={`percentual ${diferenca.percentual > 0 ? 'positivo' : 'negativo'}`}>
                  {Math.abs(diferenca.percentual).toFixed(1)}%
                </span>
              </div>
              
              <div className="comparacao-item real">
                <span className="label">Produtividade Real</span>
                <span className="valor">{produtividadeReal.produtividade_ton_ha} t/ha</span>
                <span className="data">
                  Colhido: {new Date(produtividadeReal.data_colheita).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>

            <div className="precisao-badge">
              <span className="label">Precisão do modelo:</span>
              <span className={`valor ${Math.abs(diferenca.percentual) < 10 ? 'excelente' : Math.abs(diferenca.percentual) < 20 ? 'boa' : 'regular'}`}>
                {Math.abs(diferenca.percentual) < 10 ? '🎯 Excelente' : 
                 Math.abs(diferenca.percentual) < 20 ? '✅ Boa' : '⚡ Regular'}
              </span>
            </div>
          </>
        ) : (
          <div className="sem-dados-reais">
            <span className="icon">📭</span>
            <p>{produtividadeReal?.mensagem || 'Dados de produtividade real ainda não disponíveis'}</p>
            <span className="subtexto">
              A estimativa será comparada automaticamente quando os dados de colheita forem inseridos.
            </span>
          </div>
        )}

        {/* Comparativo com média histórica sempre aparece */}
        {comparativo && (
          <div className="comparativo-historico">
            <hr />
            <h4>Comparativo com Média Histórica</h4>
            
            <div className="metricas-historico">
              <div className="metrica">
                <span className="label">Média Histórica:</span>
                <span className="valor">{comparativo.media_historica} t/ha</span>
              </div>
              
              <div className="metrica">
                <span className="label">Diferença:</span>
                <span className={`valor ${comparativo.diferenca_percentual >= 0 ? 'positivo' : 'negativo'}`}>
                  {comparativo.diferenca_percentual >= 0 ? '+' : ''}
                  {comparativo.diferenca_percentual}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComparativoReal;
