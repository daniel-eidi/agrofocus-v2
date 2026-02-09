import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

interface PontoGPS {
  id: string
  latitude: number
  longitude: number
  timestamp: string
  velocidade?: number
  operacao_id: string
}

interface Operacao {
  id: string
  tipo: string
  talhao_nome: string
  operador_nome: string
  equipamento_nome: string
  data_inicio: string
  status: 'ativa' | 'pausada' | 'finalizada'
}

export default function RastreamentoOperacoes() {
  const [operacoes, setOperacoes] = useState<Operacao[]>([])
  const [operacaoAtiva, setOperacaoAtiva] = useState<Operacao | null>(null)
  const [pontosGPS, setPontosGPS] = useState<PontoGPS[]>([])
  const [rastreando, setRastreando] = useState(false)
  const [gpsStatus, setGpsStatus] = useState<'ok' | 'erro' | 'aguardando'>('aguardando')
  const [bufferOffline, setBufferOffline] = useState<PontoGPS[]>([])
  const [showMapa, setShowMapa] = useState(true)
  const watchId = useRef<number | null>(null)
  const { usuario } = useAuth()

  // Dados mockados de operações
  useEffect(() => {
    setOperacoes([
      {
        id: '1',
        tipo: 'Pulverização',
        talhao_nome: 'Talhão A1',
        operador_nome: usuario?.nome || 'Operador',
        equipamento_nome: 'Pulverizador Autopropelido',
        data_inicio: new Date().toISOString(),
        status: 'ativa'
      },
      {
        id: '2',
        tipo: 'Plantio',
        talhao_nome: 'Talhão B2',
        operador_nome: usuario?.nome || 'Operador',
        equipamento_nome: 'Trator John Deere',
        data_inicio: new Date(Date.now() - 3600000).toISOString(),
        status: 'finalizada'
      }
    ])
  }, [usuario])

  // Carregar buffer do localStorage
  useEffect(() => {
    const bufferSalvo = localStorage.getItem('rastreamento_buffer')
    if (bufferSalvo) {
      setBufferOffline(JSON.parse(bufferSalvo))
    }
  }, [])

  // Salvar buffer no localStorage
  useEffect(() => {
    if (bufferOffline.length > 0) {
      localStorage.setItem('rastreamento_buffer', JSON.stringify(bufferOffline))
    }
  }, [bufferOffline])

  const iniciarRastreamento = (operacao: Operacao) => {
    setOperacaoAtiva(operacao)
    setRastreando(true)
    setGpsStatus('aguardando')
    
    if (!navigator.geolocation) {
      alert('Geolocalização não suportada')
      setRastreando(false)
      return
    }

    // Iniciar watchPosition para rastreamento contínuo
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const novoPonto: PontoGPS = {
          id: Date.now().toString(),
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: new Date().toISOString(),
          velocidade: position.coords.speed || 0,
          operacao_id: operacao.id
        }

        setPontosGPS(prev => [...prev, novoPonto])
        setGpsStatus('ok')

        // Se há buffer offline, tentar sincronizar
        if (bufferOffline.length > 0 && navigator.onLine) {
          sincronizarBuffer()
        }
      },
      (error) => {
        console.error('Erro GPS:', error)
        setGpsStatus('erro')
        
        // Salvar no buffer offline
        const pontoErro: PontoGPS = {
          id: Date.now().toString(),
          latitude: 0,
          longitude: 0,
          timestamp: new Date().toISOString(),
          operacao_id: operacao.id
        }
        setBufferOffline(prev => [...prev, pontoErro])
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  const pausarRastreamento = () => {
    if (watchId.current) {
      navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }
    setRastreando(false)
    setOperacaoAtiva(prev => prev ? { ...prev, status: 'pausada' } : null)
  }

  const finalizarOperacao = () => {
    if (watchId.current) {
      navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }
    setRastreando(false)
    setOperacaoAtiva(null)
    setPontosGPS([])
    
    // Limpar buffer
    localStorage.removeItem('rastreamento_buffer')
    setBufferOffline([])
  }

  const sincronizarBuffer = async () => {
    if (bufferOffline.length === 0) return
    
    // Simular sincronização com servidor
    console.log(`Sincronizando ${bufferOffline.length} pontos...`)
    
    // Limpar buffer após sincronização
    setBufferOffline([])
    localStorage.removeItem('rastreamento_buffer')
  }

  const calcularDistancia = (): string => {
    if (pontosGPS.length < 2) return '0.00'
    
    let distancia = 0
    for (let i = 1; i < pontosGPS.length; i++) {
      const p1 = pontosGPS[i - 1]
      const p2 = pontosGPS[i]
      distancia += calcularDistanciaEntrePontos(p1.latitude, p1.longitude, p2.latitude, p2.longitude)
    }
    
    return distancia.toFixed(2)
  }

  const calcularDistanciaEntrePontos = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371 // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  const calcularAreaTrabalhada = () => {
    // Simplificação: assumir largura de 20m para pulverizador
    const largura = 20 // metros
    const distancia = parseFloat(calcularDistancia()) * 1000 // converter para metros
    const area = (distancia * largura) / 10000 // hectares
    return area.toFixed(2)
  }

  const tempoOperacao = () => {
    if (!operacaoAtiva) return '00:00'
    const inicio = new Date(operacaoAtiva.data_inicio)
    const agora = new Date()
    const diff = Math.floor((agora.getTime() - inicio.getTime()) / 1000)
    const horas = Math.floor(diff / 3600)
    const minutos = Math.floor((diff % 3600) / 60)
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`
  }

  return (
    <div style={{padding: 20}}>
      <h1>🚜 Rastreamento de Operações</h1>

      {/* Status Panel */}
      <div style={{
        background: rastreando ? '#dcfce7' : '#f3f4f6',
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
        borderLeft: rastreando ? '4px solid #22c55e' : '4px solid #6b7280'
      }}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 15}}>
          <div>
            <h3 style={{margin: 0}}>
              {rastreando ? '🟢 Rastreamento Ativo' : '⚪ Rastreamento Parado'}
            </h3>            
            {operacaoAtiva && (
              <div style={{marginTop: 8, color: '#666'}}>
                <div>📝 {operacaoAtiva.tipo} - {operacaoAtiva.talhao_nome}</div>
                <div>⏱️ Tempo: {tempoOperacao()}</div>
                <div>📏 Distância: {calcularDistancia()} km</div>
                <div>📐 Área: {calcularAreaTrabalhada()} ha</div>
                <div>📍 Pontos: {pontosGPS.length}</div>
              </div>
            )}
          </div>

          <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
            {gpsStatus === 'ok' && <span style={{background: '#22c55e', color: 'white', padding: '4px 12px', borderRadius: 20, fontSize: 12}}>📡 GPS OK</span>}
            {gpsStatus === 'erro' && <span style={{background: '#ef4444', color: 'white', padding: '4px 12px', borderRadius: 20, fontSize: 12}}>📡 GPS Erro</span>}
            {gpsStatus === 'aguardando' && <span style={{background: '#f59e0b', color: 'white', padding: '4px 12px', borderRadius: 20, fontSize: 12}}>📡 Aguardando GPS...</span>}
            
            {navigator.onLine ? (
              <span style={{background: '#22c55e', color: 'white', padding: '4px 12px', borderRadius: 20, fontSize: 12}}>🌐 Online</span>
            ) : (
              <span style={{background: '#ef4444', color: 'white', padding: '4px 12px', borderRadius: 20, fontSize: 12}}>📴 Offline</span>
            )}
            
            {bufferOffline.length > 0 && (
              <span style={{background: '#f59e0b', color: 'white', padding: '4px 12px', borderRadius: 20, fontSize: 12}}>💾 Buffer: {bufferOffline.length}</span>
            )}
          </div>
        </div>

        {rastreando && (
          <div style={{marginTop: 15, display: 'flex', gap: 10}}>
            <button
              onClick={pausarRastreamento}
              style={{
                padding: '10px 20px',
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer'
              }}
            >
              ⏸️ Pausar
            </button>
            
            <button
              onClick={finalizarOperacao}
              style={{
                padding: '10px 20px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer'
              }}
            >
              ⏹️ Finalizar Operação
            </button>
          </div>
        )}
      </div>

      {/* Lista de Operações */}
      {!rastreando && (
        <div style={{marginBottom: 30}}>
          <h2>📋 Selecionar Operação</h2>
          
          <div style={{display: 'grid', gap: 15, marginTop: 15}}>
            {operacoes.map(op => (
              <div key={op.id} style={{background: 'white', padding: 20, borderRadius: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10}}>
                  <div>
                    <h3 style={{margin: 0}}>{op.tipo}</h3>
                    <p style={{margin: '5px 0', color: '#666'}}>📍 {op.talhao_nome} | 🚜 {op.equipamento_nome}</p>
                    <p style={{margin: '5px 0', color: '#666', fontSize: 14}}>👤 {op.operador_nome} | 📅 {new Date(op.data_inicio).toLocaleDateString('pt-BR')}</p>
                    
                    <span style={{
                      background: op.status === 'ativa' ? '#22c55e' : op.status === 'pausada' ? '#f59e0b' : '#6b7280',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: 12
                    }}>
                      {op.status === 'ativa' ? 'Ativa' : op.status === 'pausada' ? 'Pausada' : 'Finalizada'}
                    </span>
                  </div>
                  
                  {op.status !== 'finalizada' && (
                    <button
                      onClick={() => iniciarRastreamento(op)}
                      style={{
                        padding: '12px 24px',
                        background: '#166534',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      ▶️ Iniciar Rastreamento
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mapa de Trilha */}
      {pontosGPS.length > 0 && (
        <div style={{marginTop: 20}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
            <h2>🗺️ Trilha da Operação</h2>
            <button
              onClick={() => setShowMapa(!showMapa)}
              style={{
                padding: '8px 16px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer'
              }}
            >
              {showMapa ? '📋 Ver Lista' : '🗺️ Ver Mapa'}
            </button>
          </div>

          {showMapa ? (
            <div style={{
              background: '#e5e7eb',
              padding: 40,
              borderRadius: 12,
              textAlign: 'center',
              minHeight: 300
            }}>
              <p>🗺️ Mapa de Trilha</p>
              <p style={{color: '#666'}}>{pontosGPS.length} pontos registrados</p>
              <p style={{color: '#666', fontSize: 14}}>
                De: ({pontosGPS[0]?.latitude.toFixed(6)}, {pontosGPS[0]?.longitude.toFixed(6)})<br/>
                Até: ({pontosGPS[pontosGPS.length - 1]?.latitude.toFixed(6)}, {pontosGPS[pontosGPS.length - 1]?.longitude.toFixed(6)})
              </p>
              
              {/* Representação visual simples da trilha */}
              <div style={{
                marginTop: 20,
                padding: 20,
                background: 'white',
                borderRadius: 8,
                display: 'inline-block'
              }}>
                <svg width="300" height="200" style={{border: '1px solid #ddd'}}>
                  {pontosGPS.map((ponto, idx) => {
                    if (idx === 0) return null
                    const anterior = pontosGPS[idx - 1]
                    // Simplificação: normalizar para SVG
                    const x1 = 150 + (anterior.longitude - pontosGPS[0].longitude) * 10000
                    const y1 = 100 - (anterior.latitude - pontosGPS[0].latitude) * 10000
                    const x2 = 150 + (ponto.longitude - pontosGPS[0].longitude) * 10000
                    const y2 = 100 - (ponto.latitude - pontosGPS[0].latitude) * 10000
                    
                    return (
                      <line
                        key={ponto.id}
                        x1={Math.max(10, Math.min(290, x1))}
                        y1={Math.max(10, Math.min(190, y1))}
                        x2={Math.max(10, Math.min(290, x2))}
                        y2={Math.max(10, Math.min(190, y2))}
                        stroke="#166534"
                        strokeWidth="2"
                      />
                    )
                  })}
                  <circle cx="150" cy="100" r="5" fill="#22c55e" />
                  <text x="160" y="105" fontSize="10">Início</text>
                </svg>
              </div>
            </div>
          ) : (
            <div style={{background: 'white', padding: 20, borderRadius: 12, maxHeight: 400, overflow: 'auto'}}>
              <table style={{width: '100%', borderCollapse: 'collapse'}}>
                <thead>
                  <tr>
                    <th style={{textAlign: 'left', padding: 10, borderBottom: '1px solid #ddd'}}>Hora</th>
                    <th style={{textAlign: 'left', padding: 10, borderBottom: '1px solid #ddd'}}>Latitude</th>
                    <th style={{textAlign: 'left', padding: 10, borderBottom: '1px solid #ddd'}}>Longitude</th>
                    <th style={{textAlign: 'left', padding: 10, borderBottom: '1px solid #ddd'}}>Velocidade</th>
                  </tr>
                </thead>
                <tbody>
                  {[...pontosGPS].reverse().map(ponto => (
                    <tr key={ponto.id}>
                      <td style={{padding: 10, borderBottom: '1px solid #eee'}}>{new Date(ponto.timestamp).toLocaleTimeString('pt-BR')}</td>
                      <td style={{padding: 10, borderBottom: '1px solid #eee'}}>{ponto.latitude.toFixed(6)}</td>
                      <td style={{padding: 10, borderBottom: '1px solid #eee'}}>{ponto.longitude.toFixed(6)}</td>
                      <td style={{padding: 10, borderBottom: '1px solid #eee'}}>{(ponto.velocidade || 0).toFixed(1)} km/h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}