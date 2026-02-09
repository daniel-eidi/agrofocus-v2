import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area,
  ReferenceLine
} from 'recharts';
import './Meteorologia.css';

// Mapeamento de códigos WMO para descrições
const WMO_CODES = {
  0: 'Céu limpo',
  1: 'Principalmente limpo',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Nevoeiro',
  48: 'Nevoeiro com deposição',
  51: 'Chuvisco leve',
  53: 'Chuvisco moderado',
  55: 'Chuvisco intenso',
  61: 'Chuva leve',
  63: 'Chuva moderada',
  65: 'Chuva forte',
  80: 'Pancadas de chuva',
  95: 'Trovoada',
};

// Estágios fenológicos para exibição
const ESTAGIOS_FENOLOGICOS = {
  milho: [
    { estagio: 'Emergência', gdd: 100, descricao: 'Plântulas emergindo do solo' },
    { estagio: 'V3 (3 folhas)', gdd: 200, descricao: 'Estádio vegetativo inicial' },
    { estagio: 'V6 (6 folhas)', gdd: 350, descricao: 'Crescimento vegetativo' },
    { estagio: 'Floração (R1)', gdd: 800, descricao: 'Início da floração - crítico para irrigação' },
    { estagio: 'Enchimento de grãos (R3)', gdd: 1100, descricao: 'Fase de enchimento dos grãos' },
    { estagio: 'Maturação fisiológica (R6)', gdd: 1400, descricao: 'Pronto para colheita' },
  ],
  soja: [
    { estagio: 'Emergência (VE)', gdd: 70, descricao: 'Plântulas emergindo' },
    { estagio: 'V3 (3 trifólios)', gdd: 150, descricao: 'Estádio vegetativo' },
    { estagio: 'V6 (6 trifólios)', gdd: 300, descricao: 'Crescimento vegetativo' },
    { estagio: 'Floração (R1)', gdd: 600, descricao: 'Primeira flor aberta' },
    { estagio: 'Vagem cheia (R3)', gdd: 900, descricao: 'Vagem com sementes visíveis' },
    { estagio: 'Início maturação (R7)', gdd: 1200, descricao: 'Sementes amarelas' },
  ],
  trigo: [
    { estagio: 'Emergência', gdd: 80, descricao: 'Plântulas emergindo' },
    { estagio: 'Afihamento', gdd: 250, descricao: 'Início do afihamento' },
    { estagio: 'Emborrachamento', gdd: 400, descricao: 'Alongamento do colmo' },
    { estagio: 'Floração', gdd: 550, descricao: 'Floração - sensível ao frio' },
    { estagio: 'Enchimento', gdd: 800, descricao: 'Formação do grão' },
    { estagio: 'Maturação', gdd: 1100, descricao: 'Pronto para colheita' },
  ],
};

const Meteorologia = () => {
  // Estados
  const [talhaoId, setTalhaoId] = useState('talhao-001');
  const [dataPlantio, setDataPlantio] = useState('2025-10-15');
  const [culturaId, setCulturaId] = useState('milho');
  const [latitude, setLatitude] = useState('-23.5505');
  const [longitude, setLongitude] = useState('-46.6333');
  
  const [gddData, setGddData] = useState(null);
  const [climaAtual, setClimaAtual] = useState(null);
  const [previsao, setPrevisao] = useState([]);
  const [culturas, setCulturas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('gdd');

  // Carrega culturas suportadas
  useEffect(() => {
    fetch('/api/gdd/culturas')
      .then(res => res.json())
      .then(data => setCulturas(data.culturas || []))
      .catch(err => console.error('Erro ao carregar culturas:', err));
  }, []);

  // Calcula GDD
  const calcularGDD = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const url = `/api/gdd/${talhaoId}?data_plantio=${dataPlantio}&cultura_id=${culturaId}&lat=${latitude}&lng=${longitude}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.erro || 'Erro ao calcular GDD');
      }
      
      const data = await response.json();
      setGddData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Carrega clima atual
  const carregarClima = async () => {
    try {
      const response = await fetch(`/api/meteorologia/clima-atual?lat=${latitude}&lng=${longitude}`);
      if (response.ok) {
        const data = await response.json();
        setClimaAtual(data.dados_atuais);
      }
    } catch (err) {
      console.error('Erro ao carregar clima:', err);
    }
  };

  // Carrega previsão
  const carregarPrevisao = async () => {
    try {
      const response = await fetch(`/api/meteorologia/previsao?lat=${latitude}&lng=${longitude}&dias=7`);
      if (response.ok) {
        const data = await response.json();
        setPrevisao(data.previsao || []);
      }
    } catch (err) {
      console.error('Erro ao carregar previsão:', err);
    }
  };

  // Carrega dados iniciais
  useEffect(() => {
    calcularGDD();
    carregarClima();
    carregarPrevisao();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prepara dados para o gráfico
  const prepararDadosGrafico = () => {
    if (!gddData) return [];
    
    const historico = gddData.gdd_diario.map(d => ({
      data: new Date(d.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      gdd_dia: d.gdd_dia,
      gdd_acumulado: d.gdd_acumulado,
      tmax: d.tmax,
      tmin: d.tmin,
      tipo: 'histórico'
    }));
    
    const previsoes = gddData.previsao_7dias.map(d => ({
      data: new Date(d.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      gdd_dia: d.gdd_dia,
      gdd_acumulado: d.gdd_acumulado_previsto,
      tmax: d.tmax,
      tmin: d.tmin,
      tipo: 'previsão'
    }));
    
    return [...historico, ...previsoes];
  };

  // Verifica alertas de estágio
  const getAlertas = () => {
    if (!gddData || !gddData.alertas) return [];
    return gddData.alertas;
  };

  // Renderiza ícone do tempo
  const getWeatherIcon = (code) => {
    if (code <= 1) return '☀️';
    if (code <= 3) return '⛅';
    if (code <= 48) return '🌫️';
    if (code <= 55) return '🌧️';
    if (code <= 65) return '🌧️';
    if (code <= 80) return '⛈️';
    return '⛈️';
  };

  return (
    <div className="meteorologia-container">
      <header className="meteo-header">
        <h1>🌡️ Meteorologia & GDD</h1>
        <p>Growing Degree Days - Previsão de estágios fenológicos</p>
      </header>

      {/* Formulário de entrada */}
      <div className="form-card">
        <h3>📍 Configurar Talhão</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>ID do Talhão</label>
            <input 
              type="text" 
              value={talhaoId} 
              onChange={(e) => setTalhaoId(e.target.value)}
              placeholder="talhao-001"
            />
          </div>
          
          <div className="form-group">
            <label>Cultura</label>
            <select value={culturaId} onChange={(e) => setCulturaId(e.target.value)}>
              {culturas.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nome} (Tbase: {c.temperatura_base}°C)
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>Data de Plantio</label>
            <input 
              type="date" 
              value={dataPlantio} 
              onChange={(e) => setDataPlantio(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label>Latitude</label>
            <input 
              type="number" 
              step="0.0001"
              value={latitude} 
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="-23.5505"
            />
          </div>
          
          <div className="form-group">
            <label>Longitude</label>
            <input 
              type="number" 
              step="0.0001"
              value={longitude} 
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="-46.6333"
            />
          </div>
        </div>
        
        <button 
          className="btn-primary" 
          onClick={calcularGDD}
          disabled={loading}
        >
          {loading ? '🔄 Calculando...' : '📊 Calcular GDD'}
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={activeTab === 'gdd' ? 'active' : ''}
          onClick={() => setActiveTab('gdd')}
        >
          📈 GDD Acumulado
        </button>
        <button 
          className={activeTab === 'clima' ? 'active' : ''}
          onClick={() => setActiveTab('clima')}
        >
          🌤️ Clima Atual
        </button>
        <button 
          className={activeTab === 'previsao' ? 'active' : ''}
          onClick={() => setActiveTab('previsao')}
        >
          📅 Previsão 7 Dias
        </button>
      </div>

      {/* Mensagens de erro */}
      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {/* Conteúdo da aba GDD */}
      {activeTab === 'gdd' && gddData && (
        <div className="tab-content">
          {/* Cards de resumo */}
          <div className="cards-grid">
            <div className="card highlight">
              <div className="card-icon">🌡️</div>
              <div className="card-content">
                <span className="card-label">GDD Acumulado</span>
                <span className="card-value">{gddData.gdd_acumulado}°C</span>
                <span className="card-sublabel">Desde o plantio</span>
              </div>
            </div>
            
            <div className="card">
              <div className="card-icon">📅</div>
              <div className="card-content">
                <span className="card-label">Dias desde Plantio</span>
                <span className="card-value">{gddData.dias_desde_plantio}</span>
                <span className="card-sublabel">{new Date(gddData.data_plantio).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
            
            <div className="card">
              <div className="card-icon">🌱</div>
              <div className="card-content">
                <span className="card-label">Estágio Atual</span>
                <span className="card-value">
                  {gddData.estagio_atual ? gddData.estagio_atual.nome : 'Emergência'}
                </span>
                <span className="card-sublabel">
                  {gddData.estagio_atual ? gddData.estagio_atual.descricao : 'Início do ciclo'}
                </span>
              </div>
            </div>
            
            {gddData.proximo_estagio && (
              <div className="card alert">
                <div className="card-icon">🎯</div>
                <div className="card-content">
                  <span className="card-label">Próximo Estágio</span>
                  <span className="card-value">{gddData.proximo_estagio.nome}</span>
                  <span className="card-sublabel">
                    Faltam {gddData.proximo_estagio.gdd_faltante}°C
                  </span>
                </div>
              </div>
            )}
            
            {gddData.estimativa_colheita && (
              <div className="card success">
                <div className="card-icon">🌾</div>
                <div className="card-content">
                  <span className="card-label">Estimativa Colheita</span>
                  <span className="card-value">{gddData.estimativa_colheita.dias_estimados} dias</span>
                  <span className="card-sublabel">
                    ~{new Date(gddData.estimativa_colheita.data_estimada).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Alertas */}
          {getAlertas().length > 0 && (
            <div className="alertas-section">
              <h3>🔔 Alertas</h3>
              {getAlertas().map((alerta, idx) => (
                <div key={idx} className={`alerta alerta-${alerta.nivel}`}>
                  <strong>{alerta.estagio}</strong>
                  <p>{alerta.mensagem}</p>
                  <small>GDD faltante: {alerta.gdd_faltante}°C</small>
                </div>
              ))}
            </div>
          )}

          {/* Gráfico GDD */}
          <div className="chart-card">
            <h3>📈 Evolução do GDD</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={prepararDadosGrafico()}>
                  <defs>
                    <linearGradient id="colorGDD" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" />
                  <YAxis yAxisId="left" label={{ value: 'GDD Acumulado', angle: -90, position: 'insideLeft' }} />
                  <YAxis yAxisId="right" orientation="right" label={{ value: 'GDD Diário', angle: 90, position: 'insideRight' }} />
                  <Tooltip 
                    formatter={(value, name) => [value.toFixed(1), name]}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <Legend />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="gdd_acumulado" 
                    stroke="#22c55e" 
                    fillOpacity={1} 
                    fill="url(#colorGDD)" 
                    name="GDD Acumulado"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="gdd_dia" 
                    stroke="#f59e0b" 
                    dot={false}
                    name="GDD Diário"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabela de estágios */}
          <div className="table-card">
            <h3>📋 Estágios Fenológicos - {culturas.find(c => c.id === culturaId)?.nome}</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Estágio</th>
                  <th>GDD Necessário</th>
                  <th>Status</th>
                  <th>Descrição</th>
                </tr>
              </thead>
              <tbody>
                {(ESTAGIOS_FENOLOGICOS[culturaId] || []).map((estagio, idx) => {
                  const atingido = gddData.gdd_acumulado >= estagio.gdd;
                  const emAndamento = gddData.proximo_estagio && 
                    gddData.gdd_acumulado < estagio.gdd &&
                    gddData.proximo_estagio.nome === estagio.estagio;
                  
                  return (
                    <tr key={idx} className={atingido ? 'completed' : emAndamento ? 'active' : ''}>
                      <td>{estagio.estagio}</td>
                      <td>{estagio.gdd}°C</td>
                      <td>
                        {atingido && '✅ Atingido'}
                        {emAndamento && '🔄 Em andamento'}
                        {!atingido && !emAndamento && '⏳ Pendente'}
                      </td>
                      <td>{estagio.descricao}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Conteúdo da aba Clima */}
      {activeTab === 'clima' && (
        <div className="tab-content">
          {climaAtual ? (
            <div className="clima-atual">
              <div className="clima-card principal">
                <div className="temperatura-principal">
                  {getWeatherIcon(climaAtual.weather_code)}
                  <span className="temp-valor">{Math.round(climaAtual.temperature_2m)}°C</span>
                </div>
                <div className="clima-descricao">
                  {WMO_CODES[climaAtual.weather_code] || 'Céu parcialmente nublado'}
                </div>
              </div>
              
              <div className="clima-detalhes">
                <div className="clima-item">
                  <span className="clima-label">💧 Umidade</span>
                  <span className="clima-valor">{climaAtual.relative_humidity_2m}%</span>
                </div>
                <div className="clima-item">
                  <span className="clima-label">💨 Vento</span>
                  <span className="clima-valor">{climaAtual.wind_speed_10m} km/h</span>
                </div>
                <div className="clima-item">
                  <span className="clima-label">🌧️ Precipitação</span>
                  <span className="clima-valor">{climaAtual.precipitation} mm</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="loading">Carregando dados do clima...</div>
          )}
        </div>
      )}

      {/* Conteúdo da aba Previsão */}
      {activeTab === 'previsao' && (
        <div className="tab-content">
          <div className="previsao-grid">
            {previsao.map((dia, idx) => (
              <div key={idx} className="previsao-card">
                <div className="previsao-data">
                  {new Date(dia.data).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
                </div>
                <div className="previsao-icone">
                  {getWeatherIcon(dia.codigo_tempo)}
                </div>
                <div className="previsao-temps">
                  <span className="tmax">{Math.round(dia.tmax)}°</span>
                  <span className="tmin">{Math.round(dia.tmin)}°</span>
                </div>
                <div className="previsao-precip">
                  🌧️ {dia.precipitacao} mm
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Calculando GDD...</p>
        </div>
      )}
    </div>
  );
};

export default Meteorologia;