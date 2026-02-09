/**
 * Gráfico de Tendência de Produtividade
 * Exibe histórico e tendência ao longo das safras
 */

import React from 'react';
import './TendenciaChart.css';

const TendenciaChart = ({ dados, tendencia, estimativaAtual }) => {
  if (!dados || dados.length === 0) {
    return <div className="sem-dados">Sem dados históricos disponíveis</div>;
  }

  // Calcular valores para o gráfico
  const valores = [...dados.map(d => d.produtividade_real || d.produtividade_estimada), estimativaAtual];
  const max = Math.max(...valores) * 1.1;
  const min = Math.min(...valores) * 0.9;
  const range = max - min;

  const getPosicaoY = (valor) => {
    return 100 - ((valor - min) / range) * 100;
  };

  // Criar path para linha
  const criarPath = () => {
    const anos = dados.length + 1;
    const stepX = 100 / (anos - 1);
    
    let path = '';
    
    // Dados históricos
    dados.forEach((d, i) => {
      const x = i * stepX;
      const y = getPosicaoY(d.produtividade_real || d.produtividade_estimada);
      path += `${i === 0 ? 'M' : 'L'} ${x} ${y} `;
    });
    
    // Estimativa atual
    const xAtual = dados.length * stepX;
    const yAtual = getPosicaoY(estimativaAtual);
    path += `L ${xAtual} ${yAtual}`;
    
    return path;
  };

  const getTendenciaIcon = () => {
    switch (tendencia.tendencia) {
      case 'crescente': return '📈';
      case 'decrescente': return '📉';
      default: return '➡️';
    }
  };

  return (
    <div className="tendencia-chart">
      <div className="chart-header">
        <span className="tendencia-badge">
          {getTendenciaIcon()} Tendência: {tendencia.tendencia}
        </span>
        {tendencia.variacao_percentual && (
          <span className={`variacao ${tendencia.variacao_percentual >= 0 ? 'positiva' : 'negativa'}`}>
            {tendencia.variacao_percentual >= 0 ? '+' : ''}
            {tendencia.variacao_percentual}% (últimos {dados.length} anos)
          </span>
        )}
      </div>

      <div className="chart-container">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Grid horizontal */}
          {[0, 25, 50, 75, 100].map(pos => (
            <line
              key={pos}
              x1="0"
              y1={pos}
              x2="100"
              y2={pos}
              stroke="#eee"
              strokeWidth="0.5"
            />
          ))}
          
          {/* Linha de tendência */}
          <path
            d={criarPath()}
            fill="none"
            stroke={tendencia.tendencia === 'crescente' ? '#4CAF50' : tendencia.tendencia === 'decrescente' ? '#f44336' : '#2196F3'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Pontos */}
          {dados.map((d, i) => {
            const stepX = 100 / dados.length;
            const x = i * stepX;
            const y = getPosicaoY(d.produtividade_real || d.produtividade_estimada);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="3"
                fill={d.produtividade_real ? '#4CAF50' : '#FFC107'}
                stroke="white"
                strokeWidth="1"
              />
            );
          })}
          
          {/* Ponto da estimativa atual */}
          <circle
            cx={100}
            cy={getPosicaoY(estimativaAtual)}
            r="4"
            fill="#2196F3"
            stroke="white"
            strokeWidth="2"
          />
        </svg>

        {/* Labels dos anos */}
        <div className="anos-labels">
          {dados.map((d, i) => (
            <span key={i} className="ano-label">{d.safra}</span>
          ))}
          <span className="ano-label atual">Atual</span>
        </div>
      </div>

      <div className="legenda">
        <div className="legenda-item">
          <span className="dot real"></span>
          <span>Produtividade Real</span>
        </div>
        <div className="legenda-item">
          <span className="dot estimada"></span>
          <span>Produtividade Estimada</span>
        </div>
        <div className="legenda-item">
          <span className="dot atual"></span>
          <span>Estimativa Atual</span>
        </div>
      </div>
    </div>
  );
};

export default TendenciaChart;
