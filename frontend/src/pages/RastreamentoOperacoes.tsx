import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import useLocalizacao from '../hooks/useLocalizacao'
import MapaRastreamento from '../components/MapaRastreamento'

interface PontoGPS {
  id: string
  latitude: number
  longitude: number
  timestamp: string
  velocidade?: number
  accuracy?: number
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
  const [bufferOffline, setBufferOffline] = useState<PontoGPS[]>([])
  const [showMapa, setShowMapa] = useState(true)
  const [horaInicio, setHoraInicio] = useState<Date | null>(null)
  
  const { usuario } = useAuth()
  const { 
    localizacao, 
    error: gpsError, 
    loading: gpsLoading, 
    permissao,
    solicitarLocalizacao,
    watchLocalizacao,
    calcularDistancia,
    temSuporte 
  } = useLocalizacao({ enableHighAccuracy: true })
  
  const stopWatchRef = useRef<(() => void) | null>(null)

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

  // Callback para receber novas posições
  const onNovaPosicao = useCallback((loc: { lat: number; lng: number; speed: number | null; accuracy: number; timestamp: number }) => {
    const novoPonto: PontoGPS = {
      id: Date.now().toString(),
      latitude: loc.lat,
      longitude: loc.lng,
      timestamp: new Date(loc.timestamp).toISOString(),
      velocidade: loc.speed ? loc.speed * 3.6 : 0, // m/s para km/h
      accuracy: loc.accuracy
    }

    setPontosGPS(prev => [...prev, novoPonto])

    // Se há buffer offline, tentar sincronizar
    if (bufferOffline.length > 0 && navigator.onLine) {
      sincronizarBuffer()
    }
  }, [bufferOffline])

  const iniciarRastreamento = async (operacao: Operacao) => {
    if (!temSuporte) {
      alert('Geolocalização não suportada neste navegador')
      return
    }

    if (permissao === 'denied') {
      alert('Permissão de localização negada. Verifique as configurações do navegador.')
      return
    }

    try {
      // Solicitar permissão primeiro
      await solicitarLocalizacao()
      
      setOperacaoAtiva(operacao)
      setRastreando(true)
      setHoraInicio(new Date())
      
      // Iniciar watch
      const stop = watchLocalizacao(onNovaPosicao)
      stopWatchRef.current = stop
      
    } catch (err) {
      alert('Erro ao iniciar rastreamento: ' + (err as Error).message)
    }
  }

  const pausarRastreamento = () => {
    if (stopWatchRef.current) {
      stopWatchRef.current()
      stopWatchRef.current = null
    }
    setRastreando(false)
    setOperacaoAtiva(prev => prev ? { ...prev, status: 'pausada' } : null)
  }

  const finalizarOperacao = () => {
    if (stopWatchRef.current) {
      stopWatchRef.current()
      stopWatchRef.current = null
    }
    setRastreando(false)
    setOperacaoAtiva(null)
    setHoraInicio(null)
    
    // Limpar buffer
    localStorage.removeItem('rastreamento_buffer')
    setBufferOffline([])
  }

  const sincronizarBuffer = () => {
    if (bufferOffline.length === 0) return
    console.log(`Sincronizando ${bufferOffline.length} pontos...`)
    setBufferOffline([])
    localStorage.removeItem('rastreamento_buffer')
  }

  const calcularDistanciaTotal = (): string => {
    if (pontosGPS.length < 2) return '0.00'
    
    let distancia = 0
    for (let i = 1; i < pontosGPS.length; i++) {
      const p1 = pontosGPS[i - 1]
      const p2 = pontosGPS[i]
      distancia += calcularDistancia(p1.latitude, p1.longitude, p2.latitude, p2.longitude)
    }
    
    return distancia.toFixed(2)
  }

  const calcularAreaTrabalhada = () => {
    const largura = 20 // metros
    const distancia = parseFloat(calcularDistanciaTotal()) * 1000
    const area = (distancia * largura) / 10000
    return area.toFixed(2)
  }

  const tempoOperacao = () => {
    if (!horaInicio) return '00:00'
    const agora = new Date()
    const diff = Math.floor((agora.getTime() - horaInicio.getTime()) / 1000)
    const horas = Math.floor(diff / 3600)
    const minutos = Math.floor((diff % 3600) / 60)
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`
  }

  const getStatusGPS = () => {
    if (gpsLoading) return 'aguardando'
    if (gpsError) return 'erro'
    if (localizacao) return 'ok'
    return 'aguardando'
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'ok': return '#22c55e'
      case 'erro': return '#ef4444'
      case 'aguardando': return '#f59e0b'
      default: return '#6b7280'
    }
  }

  return (
    <div style={{padding: 20}}>
      <h1>🚜 Rastreamento de Operações</h1>

      {!temSuporte && (
        <div style={{background: '#fee2e2', color: '#dc2626', padding: 16, borderRadius: 8, marginBottom: 20}}>
          ⚠️ Geolocalização não suportada neste navegador. Use um navegador moderno como Chrome ou Safari.
        </div>
      )}

      {/* Status Panel */}
      <div style={{
        background: rastreando ? '#dcfce7' : '#f3f4f6',
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
        borderLeft: rastreando ? '4px solid #22c55e' : '4px solid #6b7280'
      }}
      >
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 15}}>
          <div>
            <h3 style={{margin: 0}}>
              {rastreando ? '🟢 Rastreamento Ativo' : '⚪ Rastreamento Parado'}
            </h3>            
            {operacaoAtiva && (
              <div style={{marginTop: 8, color: '#666'}}>
                <div>📝 {operacaoAtiva.tipo} - {operacaoAtiva.talhao_nome}</div>
                <div>⏱️ Tempo: {tempoOperacao()}</div>
                <div>📏 Distância: {calcularDistanciaTotal()} km</div>
                <div>📐 Área: {calcularAreaTrabalhada()} ha</div>
                <div>📍 Pontos: {pontosGPS.length}</div>
                {localizacao && (
                  <div style={{fontSize: 12, marginTop: 4}}>
                    🎯 Precisão: {localizacao.accuracy.toFixed(0)}m
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
            <span style={{
              background: getStatusColor(getStatusGPS()),
              color: 'white',
              padding: '4px 12px',
              borderRadius: 20,
              fontSize: 12
            }}>
              {getStatusGPS() === 'ok' ? '📡 GPS OK' : getStatusGPS() === 'erro' ? '📡 GPS Erro' : '📡 Aguardando...'}
            </span>
            
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

        {gpsError && (
          <div style={{marginTop: 15, padding: 12, background: '#fee2e2', color: '#dc2626', borderRadius: 8}}>
            Erro GPS: {gpsError}
          </div>
        )}

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
                      disabled={!temSuporte || gpsLoading}
                      style={{
                        padding: '12px 24px',
                        background: temSuporte ? '#166534' : '#9ca3af',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        cursor: temSuporte ? 'pointer' : 'not-allowed',
                        fontWeight: 600
                      }}
                    >
                      {gpsLoading ? '⏳ Aguardando GPS...' : '▶️ Iniciar Rastreamento'}
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
            <MapaRastreamento 
              pontos={pontosGPS}
              posicaoAtual={localizacao ? { lat: localizacao.lat, lng: localizacao.lng } : null}
              rastreando={rastreando}
            />
          ) : (
            <div style={{background: 'white', padding: 20, borderRadius: 12, maxHeight: 400, overflow: 'auto'}}>
              <table style={{width: '100%', borderCollapse: 'collapse'}}>
                <thead>
                  <tr>
                    <th style={{textAlign: 'left', padding: 10, borderBottom: '1px solid #ddd'}}>Hora</th>
                    <th style={{textAlign: 'left', padding: 10, borderBottom: '1px solid #ddd'}}>Latitude</th>
                    <th style={{textAlign: 'left', padding: 10, borderBottom: '1px solid #ddd'}}>Longitude</th>
                    <th style={{textAlign: 'left', padding: 10, borderBottom: '1px solid #ddd'}}>Velocidade</th>
                    <th style={{textAlign: 'left', padding: 10, borderBottom: '1px solid #ddd'}}>Precisão</th>
                  </tr>
                </thead>
                <tbody>
                  {[...pontosGPS].reverse().map(ponto => (
                    <tr key={ponto.id}>
                      <td style={{padding: 10, borderBottom: '1px solid #eee'}}>{new Date(ponto.timestamp).toLocaleTimeString('pt-BR')}</td>
                      <td style={{padding: 10, borderBottom: '1px solid #eee'}}>{ponto.latitude.toFixed(6)}</td>
                      <td style={{padding: 10, borderBottom: '1px solid #eee'}}>{ponto.longitude.toFixed(6)}</td>
                      <td style={{padding: 10, borderBottom: '1px solid #eee'}}>{(ponto.velocidade || 0).toFixed(1)} km/h</td>
                      <td style={{padding: 10, borderBottom: '1px solid #eee'}}>{(ponto.accuracy || 0).toFixed(0)}m</td>
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