/**
 * Painel de Alertas de Produtividade
 * Exibe alertas quando estimativa está abaixo da média histórica
 */

import React from 'react';
import './AlertasPanel.css';

const AlertasPanel = ({ alertas, tendencia }) => {
  // Filtrar apenas alertas críticos e de atenção
  const alertasImportantes = alertas?.filter(a => 
    a.tipo === 'critico' || a.tipo === 'atencao'
  ) || [];

  // Verificar tendência decrescente
  const temTendenciaDecrescente = tendencia?.tendencia === 'decrescente';

  if (alertasImportantes.length === 0 && !temTendenciaDecrescente) {
    return (
      <div className="alertas-panel sucesso">
        <div className="alerta-item positivo">
          <span className="icon">✅</span>
          <div className="conteudo">
            <span className="titulo">Produtividade dentro do esperado</span>
            <span className="mensagem">
              Não há alertas. A estimativa está alinhada com a média histórica.
            </span>
          </div>
        </div>
      </div>
    );
  }

  const getIconPorTipo = (tipo) => {
    switch (tipo) {
      case 'critico': return '🔴';
      case 'atencao': return '⚠️';
      case 'positivo': return '✅';
      default: return 'ℹ️';
    }
  };

  const getClassePorTipo = (tipo) => {
    switch (tipo) {
      case 'critico': return 'critico';
      case 'atencao': return 'atencao';
      case 'positivo': return 'positivo';
      default: return 'info';
    }
  };

  return (
    <div className="alertas-panel">
      <div className="panel-header">
        <span className="icon">🚨</span>
        <h3>Alertas & Recomendações</h3>
        {alertasImportantes.length > 0 && (
          <span className="badge">{alertasImportantes.length}</span>
        )}
      </div>

      <div className="alertas-lista">
        {alertasImportantes.map((alerta, index) => (
          <div key={index} className={`alerta-item ${getClassePorTipo(alerta.tipo)}`}>
            <span className="icon">{alerta.icone || getIconPorTipo(alerta.tipo)}</span>
            <div className="conteudo">
              <span className="titulo">
                {alerta.tipo === 'critico' && 'Alerta Crítico'}
                {alerta.tipo === 'atencao' && 'Atenção'}
                {alerta.tipo === 'positivo' && 'Bom'}
              </span>
              <span className="mensagem">{alerta.mensagem}</span>
              
              {alerta.acao_sugerida && (
                <span className="acao">
                  <strong>Ação sugerida:</strong> {alerta.acao_sugerida}
                </span>
              )}
            </div>
          </div>
        ))}

        {temTendenciaDecrescente && (
          <div className="alerta-item atencao">
            <span className="icon">📉</span>
            <div className="conteudo">
              <span className="titulo">Tendência Decrescente</span>
              <span className="mensagem">
                A produtividade apresenta queda de {Math.abs(tendencia.variacao_percentual)}% 
                nos últimos {tendencia.anos?.length || 3} anos.
              </span>
              <span className="acao">
                <strong>Ação sugerida:</strong> Revisar práticas de manejo, 
                análise de solo e adubação.
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="panel-footer">
        <span className="info">
          ℹ️ Alertas baseados na comparação com média histórica -20%
        </span>
      </div>
    </div>
  );
};

export default AlertasPanel;
