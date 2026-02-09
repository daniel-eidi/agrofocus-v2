import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

interface Ocorrencia {
  id: string
  tipo: string
  categoria: string
  titulo: string
  descricao: string
  data: string
  severidade: string
  status: string
  latitude?: number
  longitude?: number
  foto_url_1?: string
  foto_url_2?: string
  foto_url_3?: string
  talhao_nome?: string
  operador_nome?: string
  ia_analise?: string
}

const TIPOS_OCORRENCIAS = [
  { categoria: 'praga', tipo: 'Lagarta', icone: '🐛' },
  { categoria: 'praga', tipo: 'Pulgao', icone: '🦟' },
  { categoria: 'praga', tipo: 'Acaro', icone: '🕷️' },
  { categoria: 'praga', tipo: 'Percevejo', icone: '🐞' },
  { categoria: 'doenca', tipo: 'Ferrugem', icone: '🍂' },
  { categoria: 'doenca', tipo: 'Mancha', icone: '🔴' },
  { categoria: 'doenca', tipo: 'Mofo', icone: '🍄' },
  { categoria: 'doenca', tipo: 'Bacteria', icone: '🦠' },
  { categoria: 'outro', tipo: 'Deficiencia Nutricional', icone: '🌱' },
  { categoria: 'outro', tipo: 'Estresse Hidrico', icone: '💧' },
  { categoria: 'outro', tipo: 'Dano Mecanico', icone: '⚙️' },
  { categoria: 'outro', tipo: 'Outro', icone: '📝' }
]

export default function InspecaoCampo() {
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [capturandoGPS, setCapturandoGPS] = useState(false)
  const [analisandoIA, setAnalisandoIA] = useState(false)
  const { token } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [novaOcorrencia, setNovaOcorrencia] = useState({
    tipo: '',
    categoria: '',
    titulo: '',
    descricao: '',
    severidade: 'media',
    latitude: null as number | null,
    longitude: null as number | null,
    fotos: [] as string[]
  })

  useEffect(() => {
    fetchOcorrencias()
  }, [])

  const fetchOcorrencias = async () => {
    try {
      const res = await fetch('/api/ocorrencias', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setOcorrencias(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const capturarGPS = () => {
    setCapturandoGPS(true)
    
    if (!navigator.geolocation) {
      alert('Geolocalização não suportada neste navegador')
      setCapturandoGPS(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNovaOcorrencia(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }))
        setCapturandoGPS(false)
      },
      (error) => {
        console.error('Erro ao obter GPS:', error)
        alert('Erro ao capturar GPS. Verifique as permissões.')
        setCapturandoGPS(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    // Simular upload - em produção seria upload real para S3/storage
    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setNovaOcorrencia(prev => ({
          ...prev,
          fotos: [...prev.fotos, reader.result as string].slice(0, 3)
        }))
      }
      reader.readAsDataURL(file)
    })
  }

  const analisarIA = async () => {
    if (novaOcorrencia.fotos.length === 0) {
      alert('Adicione pelo menos uma foto para análise')
      return
    }

    setAnalisandoIA(true)
    
    try {
      // Chamar API real de análise de imagem
      const res = await fetch('/api/ia/analisar-imagem', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imagemBase64: novaOcorrencia.fotos[0],
          tipoCultura: 'soja' // Pode ser dinâmico no futuro
        })
      })
      
      const data = await res.json()
      
      if (data.sucesso) {
        const analise = data.analise
        const textoAnalise = `Detectado: ${analise.tipo} (${(analise.confianca * 100).toFixed(0)}% confiança). 
Recomendação: ${analise.recomendacao}
Sintomas: ${analise.sintomas?.join(', ') || 'N/A'}
Estágio: ${analise.estagio}
Danos: ${analise.danos}`
        
        setNovaOcorrencia(prev => ({
          ...prev,
          descricao: prev.descricao || textoAnalise,
          tipo: prev.tipo || analise.tipo,
          categoria: prev.categoria || analise.categoria,
          severidade: analise.severidade || prev.severidade
        }))
        
        if (data.simulacao) {
          alert('⚠️ Análise em modo simulação. Configure OPENAI_API_KEY no servidor para análise real.')
        }
      } else {
        alert('Erro na análise: ' + data.erro)
      }
    } catch (err) {
      console.error('Erro ao analisar:', err)
      alert('Erro ao conectar com servidor de IA')
    } finally {
      setAnalisandoIA(false)
    }
  }

  const salvarOcorrencia = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!novaOcorrencia.tipo || !novaOcorrencia.titulo) {
      alert('Preencha o tipo e título da ocorrência')
      return
    }

    try {
      const res = await fetch('/api/ocorrencias', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...novaOcorrencia,
          data: new Date().toISOString(),
          status: 'aberta'
        })
      })

      if (res.ok) {
        // Resetar formulário
        setNovaOcorrencia({
          tipo: '',
          categoria: '',
          titulo: '',
          descricao: '',
          severidade: 'media',
          latitude: null,
          longitude: null,
          fotos: []
        })
        setShowForm(false)
        fetchOcorrencias()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const getGravidadeColor = (gravidade: string) => {
    switch(gravidade) {
      case 'baixa': return '#22c55e'
      case 'media': return '#f59e0b'
      case 'alta': return '#ef4444'
      case 'critica': return '#7c2d12'
      default: return '#6b7280'
    }
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'aberta': return '#f59e0b'
      case 'em_tratamento': return '#3b82f6'
      case 'resolvida': return '#22c55e'
      default: return '#6b7280'
    }
  }

  if (loading) return <div style={{padding: 20}}>Carregando...</div>

  return (
    <div style={{padding: 20}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
        <div>
          <h1>🔍 Inspeção de Campo</h1>
          <p style={{color: '#666', marginTop: 5}}>Registre ocorrências com fotos e GPS</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '12px 24px',
            background: '#166534',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 600
          }}
        >
          {showForm ? 'Cancelar' : '➕ Nova Ocorrência'}
        </button>
      </div>

      {/* Formulário de Nova Ocorrência */}
      {showForm && (
        <form onSubmit={salvarOcorrencia} style={{background: 'white', padding: 24, borderRadius: 12, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.1)'}}>
          <h3 style={{marginTop: 0}}>📸 Registrar Ocorrência</h3>
          
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16}}>
            <div>
              <label style={{display: 'block', marginBottom: 8, fontWeight: 600}}>Tipo de Ocorrência *</label>
              <select 
                value={novaOcorrencia.tipo}
                onChange={e => {
                  const tipo = TIPOS_OCORRENCIAS.find(t => t.tipo === e.target.value)
                  setNovaOcorrencia(prev => ({
                    ...prev, 
                    tipo: e.target.value,
                    categoria: tipo?.categoria || ''
                  }))
                }}
                required
                style={{width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ddd'}}
              >
                <option value="">Selecione...</option>
                {TIPOS_OCORRENCIAS.map(t => (
                  <option key={t.tipo} value={t.tipo}>
                    {t.icone} {t.tipo} ({t.categoria})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{display: 'block', marginBottom: 8, fontWeight: 600}}>Título *</label>
              <input
                type="text"
                value={novaOcorrencia.titulo}
                onChange={e => setNovaOcorrencia(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="Ex: Infestação leve na área norte"
                required
                style={{width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ddd'}}
              />
            </div>

            <div>
              <label style={{display: 'block', marginBottom: 8, fontWeight: 600}}>Severidade</label>
              <select 
                value={novaOcorrencia.severidade}
                onChange={e => setNovaOcorrencia(prev => ({ ...prev, severidade: e.target.value }))}
                style={{width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ddd'}}
              >
                <option value="baixa">🟢 Baixa</option>
                <option value="media">🟡 Média</option>
                <option value="alta">🔴 Alta</option>
                <option value="critica">⚫ Crítica</option>
              </select>
            </div>
          </div>

          {/* GPS */}
          <div style={{marginTop: 20, padding: 16, background: '#f0fdf4', borderRadius: 8}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div>
                <strong>📍 Localização GPS</strong>
                {novaOcorrencia.latitude && (
                  <p style={{margin: '4px 0', color: '#166534', fontSize: 14}}>
                    Lat: {novaOcorrencia.latitude.toFixed(6)}, 
                    Lng: {novaOcorrencia.longitude?.toFixed(6)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={capturarGPS}
                disabled={capturandoGPS}
                style={{
                  padding: '10px 20px',
                  background: novaOcorrencia.latitude ? '#22c55e' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer'
                }}
              >
                {capturandoGPS ? '📡 Capturando...' : novaOcorrencia.latitude ? '✓ GPS Capturado' : '📍 Capturar GPS'}
              </button>
            </div>
          </div>

          {/* Fotos */}
          <div style={{marginTop: 20}}>
            <label style={{display: 'block', marginBottom: 8, fontWeight: 600}}>📸 Fotos (máx 3)</label>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFotoUpload}
              style={{display: 'none'}}
            />

            <div style={{display: 'flex', gap: 12, flexWrap: 'wrap'}}>
              {novaOcorrencia.fotos.map((foto, idx) => (
                <div key={idx} style={{position: 'relative'}}>
                  <img 
                    src={foto} 
                    alt={`Foto ${idx + 1}`}
                    style={{width: 120, height: 120, objectFit: 'cover', borderRadius: 8}}
                  />
                  <button
                    type="button"
                    onClick={() => setNovaOcorrencia(prev => ({
                      ...prev,
                      fotos: prev.fotos.filter((_, i) => i !== idx)
                    }))}
                    style={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: 24,
                      height: 24,
                      cursor: 'pointer'
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              
              {novaOcorrencia.fotos.length < 3 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: 120,
                    height: 120,
                    border: '2px dashed #ccc',
                    borderRadius: 8,
                    background: '#f9fafb',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24
                  }}
                >
                  📷
                </button>
              )}
            </div>

            {novaOcorrencia.fotos.length > 0 && (
              <button
                type="button"
                onClick={analisarIA}
                disabled={analisandoIA}
                style={{
                  marginTop: 12,
                  padding: '10px 20px',
                  background: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer'
                }}
              >
                {analisandoIA ? '🤖 Analisando...' : '🤖 Analisar com IA'}
              </button>
            )}
          </div>

          {/* Descrição */}
          <div style={{marginTop: 20}}>
            <label style={{display: 'block', marginBottom: 8, fontWeight: 600}}>Descrição / Análise</label>
            <textarea
              value={novaOcorrencia.descricao}
              onChange={e => setNovaOcorrencia(prev => ({ ...prev, descricao: e.target.value }))}
              placeholder="Descreva a ocorrência ou use a análise da IA..."
              rows={4}
              style={{width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ddd', resize: 'vertical'}}
            />
          </div>

          <button
            type="submit"
            style={{
              marginTop: 24,
              width: '100%',
              padding: 16,
              background: '#166534',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            ✅ Salvar Ocorrência
          </button>
        </form>
      )}

      {/* Lista de Ocorrências */}
      <h2 style={{marginTop: 30}}>📋 Ocorrências Registradas</h2>
      
      <div style={{display: 'grid', gap: 16}}>
        {ocorrencias.map(o => (
          <div key={o.id} style={{background: 'white', padding: 20, borderRadius: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
              <div>
                <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8}}>
                  <h3 style={{margin: 0}}>{o.tipo}</h3>
                  <span style={{
                    background: getGravidadeColor(o.severidade),
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    textTransform: 'uppercase'
                  }}>
                    {o.severidade}
                  </span>
                  <span style={{
                    background: getStatusColor(o.status),
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: 12
                  }}>
                    {o.status}
                  </span>
                </div>
                
                <p style={{margin: '4px 0', fontWeight: 600}}>{o.titulo || o.descricao?.substring(0, 50)}</p>
                
                {o.descricao && o.descricao.length > 50 && (
                  <p style={{margin: '4px 0', color: '#666', fontSize: 14}}>{o.descricao}</p>
                )}
                
                <div style={{marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 14, color: '#666'}}>
                  <span>📍 {o.talhao_nome || 'Sem talhão'}</span>
                  <span>📅 {new Date(o.data).toLocaleDateString('pt-BR')}</span>
                  {o.latitude && (
                    <span>🌐 GPS: {o.latitude.toFixed(4)}, {o.longitude?.toFixed(4)}</span>
                  )}
                </div>

                {o.ia_analise && (
                  <div style={{marginTop: 12, padding: 12, background: '#f3e8ff', borderRadius: 8}}>
                    <strong>🤖 Análise IA:</strong> {o.ia_analise}
                  </div>
                )}
              </div>

              {o.foto_url_1 && (
                <img 
                  src={o.foto_url_1} 
                  alt="Ocorrência"
                  style={{width: 100, height: 100, objectFit: 'cover', borderRadius: 8}}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}