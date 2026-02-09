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
  talhao_id?: string
  talhao_nome?: string
  fazenda_id?: string
  fazenda_nome?: string
  operador_nome?: string
  ia_analise?: string
  ia_confianca?: number
  metodo_analise?: 'automatica' | 'especialista'
}

interface Talhao {
  id: string
  nome: string
  fazenda_id: string
  fazenda_nome: string
  area_hectares: number
  latitude?: number
  longitude?: number
}

// Tipos de ocorrência expandidos (PlantVillage + Brasileiros)
const TIPOS_OCORRENCIAS = [
  // Pragas
  { categoria: 'praga', tipo: 'Lagarta Helicoverpa', icone: '🐛', culturas: ['milho', 'algodao', 'soja'] },
  { categoria: 'praga', tipo: 'Lagarta Falsa Medideira', icone: '🐛', culturas: ['soja', 'milho'] },
  { categoria: 'praga', tipo: 'Broca do Cafe', icone: '🐛', culturas: ['cafe'] },
  { categoria: 'praga', tipo: 'Pulgao', icone: '🦟', culturas: ['soja', 'milho', 'trigo'] },
  { categoria: 'praga', tipo: 'Acaro Rajado', icone: '🕷️', culturas: ['soja', 'milho', 'feijao'] },
  { categoria: 'praga', tipo: 'Acaro Branco', icone: '🕷️', culturas: ['cafe', 'citros'] },
  { categoria: 'praga', tipo: 'Percevejo Marrom', icone: '🐞', culturas: ['soja', 'milho'] },
  { categoria: 'praga', tipo: 'Percevejo Verde', icone: '🐞', culturas: ['soja', 'milho'] },
  { categoria: 'praga', tipo: 'Bicho Mineiro', icone: '🪰', culturas: ['cafe', 'citros'] },
  { categoria: 'praga', tipo: 'Mosca Minadora', icone: '🪰', culturas: ['tomate', 'melancia'] },
  { categoria: 'praga', tipo: 'Trips', icone: '🦟', culturas: ['tomate', 'pimentao', 'melao'] },
  { categoria: 'praga', tipo: 'Cochonilha', icone: '🐜', culturas: ['cafe', 'citros', 'mamao'] },
  { categoria: 'praga', tipo: 'Vaquinha', icone: '🪲', culturas: ['milho', 'soja'] },
  { categoria: 'praga', tipo: 'Nematoides', icone: '🪱', culturas: ['soja', 'cafe', 'batata'] },
  
  // Doencas
  { categoria: 'doenca', tipo: 'Ferrugem Asiatica Soja', icone: '🍂', culturas: ['soja'] },
  { categoria: 'doenca', tipo: 'Ferrugem Tropical Milho', icone: '🍂', culturas: ['milho'] },
  { categoria: 'doenca', tipo: 'Requeima Batata/Tomate', icone: '🔴', culturas: ['batata', 'tomate'] },
  { categoria: 'doenca', tipo: 'Septoriose Soja', icone: '🔴', culturas: ['soja'] },
  { categoria: 'doenca', tipo: 'Cercosporiose Milho', icone: '🟤', culturas: ['milho'] },
  { categoria: 'doenca', tipo: 'Mancha Parda Soja', icone: '🟤', culturas: ['soja'] },
  { categoria: 'doenca', tipo: 'Oidio', icone: '⚪', culturas: ['soja', 'feijao', 'melao'] },
  { categoria: 'doenca', tipo: 'Mancha Angular Algodao', icone: '🔴', culturas: ['algodao'] },
  { categoria: 'doenca', tipo: 'Mosaico Comum Milho', icone: '🟡', culturas: ['milho'] },
  { categoria: 'doenca', tipo: 'Antracnose', icone: '⚫', culturas: ['soja', 'feijao', 'mamao'] },
  { categoria: 'doenca', tipo: 'Podridao Radicular', icone: '🟤', culturas: ['soja', 'algodao', 'milho'] },
  { categoria: 'doenca', tipo: 'Verrugose Cafe', icone: '⚫', culturas: ['cafe'] },
  { categoria: 'doenca', tipo: 'Ferrugem Laranja', icone: '🍂', culturas: ['citros'] },
  { categoria: 'doenca', tipo: 'Cancro Citros', icone: '⚫', culturas: ['citros'] },
  
  // Deficiencias
  { categoria: 'deficiencia', tipo: 'Deficiencia Nitrogenio', icone: '🌱', culturas: ['todas'] },
  { categoria: 'deficiencia', tipo: 'Deficiencia Fosforo', icone: '🌱', culturas: ['todas'] },
  { categoria: 'deficiencia', tipo: 'Deficiencia Potassio', icone: '🌱', culturas: ['todas'] },
  { categoria: 'deficiencia', tipo: 'Deficiencia Magnesio', icone: '🌱', culturas: ['todas'] },
  { categoria: 'deficiencia', tipo: 'Deficiencia Calcio', icone: '🌱', culturas: ['tomate', 'pimentao', 'melao'] },
  { categoria: 'deficiencia', tipo: 'Deficiencia Enxofre', icone: '🌱', culturas: ['soja', 'milho'] },
  { categoria: 'deficiencia', tipo: 'Deficiencia Boro', icone: '🌱', culturas: ['algodao', 'citros'] },
  { categoria: 'deficiencia', tipo: 'Deficiencia Ferro', icone: '🌱', culturas: ['citros', 'mamao'] },
  { categoria: 'deficiencia', tipo: 'Deficiencia Zinc', icone: '🌱', culturas: ['milho', 'citros'] },
  
  // Outros
  { categoria: 'outro', tipo: 'Estresse Hidrico', icone: '💧', culturas: ['todas'] },
  { categoria: 'outro', tipo: 'Estrese Termico', icone: '🌡️', culturas: ['todas'] },
  { categoria: 'outro', tipo: 'Dano Granizo', icone: '🧊', culturas: ['todas'] },
  { categoria: 'outro', tipo: 'Dano Mecanico', icone: '⚙️', culturas: ['todas'] },
  { categoria: 'outro', tipo: 'Toxicidade Herbicida', icone: '☠️', culturas: ['todas'] },
  { categoria: 'outro', tipo: 'Desenvolvimento Normal', icone: '✅', culturas: ['todas'] },
  { categoria: 'outro', tipo: 'Outro', icone: '📝', culturas: ['todas'] }
]

const CULTURAS = [
  { id: 'soja', nome: 'Soja', icone: '🌱' },
  { id: 'milho', nome: 'Milho', icone: '🌽' },
  { id: 'algodao', nome: 'Algodão', icone: '🧶' },
  { id: 'cafe', nome: 'Café', icone: '☕' },
  { id: 'cana', nome: 'Cana-de-açúcar', icone: '🎋' },
  { id: 'citros', nome: 'Citros', icone: '🍊' },
  { id: 'feijao', nome: 'Feijão', icone: '🫘' },
  { id: 'trigo', nome: 'Trigo', icone: '🌾' },
  { id: 'tomate', nome: 'Tomate', icone: '🍅' },
  { id: 'batata', nome: 'Batata', icone: '🥔' },
  { id: 'pimentao', nome: 'Pimentão', icone: '🫑' },
  { id: 'melao', nome: 'Melão', icone: '🍈' },
  { id: 'melancia', nome: 'Melancia', icone: '🍉' },
  { id: 'mamao', nome: 'Mamão', icone: '🥭' },
  { id: 'outra', nome: 'Outra', icone: '🌿' }
]

export default function InspecaoCampo() {
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([])
  const [talhoes, setTalhoes] = useState<Talhao[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [capturandoGPS, setCapturandoGPS] = useState(false)
  const [analisandoIA, setAnalisandoIA] = useState(false)
  const [culturaSelecionada, setCulturaSelecionada] = useState('soja')
  const [modoAnalise, setModoAnalise] = useState<'automatica' | 'especialista'>('automatica')
  const { token } = useAuth()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const albumInputRef = useRef<HTMLInputElement>(null)

  const [novaOcorrencia, setNovaOcorrencia] = useState({
    tipo: '',
    categoria: '',
    titulo: '',
    descricao: '',
    severidade: 'media',
    latitude: null as number | null,
    longitude: null as number | null,
    fotos: [] as string[],
    talhao_id: '',
    fazenda_id: '',
    area_afetada: ''
  })

  useEffect(() => {
    fetchOcorrencias()
    fetchTalhoes()
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

  const fetchTalhoes = async () => {
    try {
      const res = await fetch('/api/talhoes', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setTalhoes(data.map((t: any) => ({
        id: t.id,
        nome: t.nome,
        fazenda_id: t.fazenda_id || '1',
        fazenda_nome: t.fazenda_nome || 'Fazenda',
        area_hectares: t.area_hectares || 0,
        latitude: t.centroide?.lat,
        longitude: t.centroide?.lng
      })))
    } catch (err) {
      console.error('Erro ao carregar talhões:', err)
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
        
        // Auto-selecionar talhão mais próximo
        autoSelecionarTalhao(position.coords.latitude, position.coords.longitude)
        
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

  const autoSelecionarTalhao = (lat: number, lng: number) => {
    // Calcular distância para cada talhão e selecionar o mais próximo
    let talhaoMaisProximo: Talhao | null = null
    let menorDistancia = Infinity
    
    talhoes.forEach(t => {
      if (t.latitude && t.longitude) {
        const dist = calcularDistancia(lat, lng, t.latitude, t.longitude)
        if (dist < menorDistancia && dist < 2) { // máximo 2km
          menorDistancia = dist
          talhaoMaisProximo = t
        }
      }
    })
    
    if (talhaoMaisProximo) {
      setNovaOcorrencia(prev => ({
        ...prev,
        talhao_id: talhaoMaisProximo!.id,
        fazenda_id: talhaoMaisProximo!.fazenda_id
      }))
    }
  }

  const calcularDistancia = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371 // km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2)
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach(file => {
      // Compressão antes de salvar
      compressImage(file, 0.7, 1024).then(compressed => {
        setNovaOcorrencia(prev => ({
          ...prev,
          fotos: [...prev.fotos, compressed].slice(0, 3)
        }))
      })
    })
  }

  const compressImage = (file: File, quality: number, maxWidth: number): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
          
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', quality))
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  const analisarIA = async () => {
    if (novaOcorrencia.fotos.length === 0) {
      alert('Adicione pelo menos uma foto para análise')
      return
    }

    if (modoAnalise === 'especialista') {
      // Notificar especialista (mim) via sistema de notificações
      await solicitarAnaliseEspecialista()
      return
    }

    setAnalisandoIA(true)
    
    try {
      const res = await fetch('/api/ia/analisar-imagem', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imagemBase64: novaOcorrencia.fotos[0],
          tipoCultura: culturaSelecionada
        })
      })
      
      const data = await res.json()
      
      if (data.sucesso) {
        if (data.simulacao) {
          // Análise simulada
          const analise = data.analise
          const textoAnalise = `Detectado: ${analise.tipo} (${(analise.confianca * 100).toFixed(0)}% confiança)
Recomendação: ${analise.recomendacao}
Sintomas: ${analise.sintomas?.join(', ') || 'N/A'}
Estágio: ${analise.estagio}
Danos: ${analise.danos}`
          
          setNovaOcorrencia(prev => ({
            ...prev,
            descricao: textoAnalise,
            tipo: analise.tipo,
            categoria: analise.categoria,
            severidade: analise.severidade
          }))
          
          alert('⚠️ Análise em modo simulação. Configure OPENAI_API_KEY para análise real com GPT-4o.')
        } else {
          // Análise real GPT-4o
          const analise = data.analise
          setNovaOcorrencia(prev => ({
            ...prev,
            descricao: analise.descricao + '\n\nRecomendação: ' + analise.recomendacao,
            tipo: analise.tipo,
            categoria: analise.categoria,
            severidade: analise.severidade
          }))
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

  const solicitarAnaliseEspecialista = async () => {
    setAnalisandoIA(true)
    
    try {
      const talhao = talhoes.find(t => t.id === novaOcorrencia.talhao_id)
      
      // Usar o novo endpoint de inspeção por especialista
      const res = await fetch('/api/inspecoes/pendentes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fotos: novaOcorrencia.fotos,
          cultura: culturaSelecionada,
          talhao_id: novaOcorrencia.talhao_id,
          talhao_nome: talhao?.nome,
          fazenda_id: novaOcorrencia.fazenda_id || talhao?.fazenda_id,
          fazenda_nome: talhao?.fazenda_nome,
          latitude: novaOcorrencia.latitude,
          longitude: novaOcorrencia.longitude,
          observacoes: novaOcorrencia.descricao || novaOcorrencia.titulo
        })
      })

      const data = await res.json()

      if (data.sucesso) {
        alert(`✅ Análise solicitada ao especialista!\n\nID: ${data.inspecao.id}\nTalhão: ${data.inspecao.talhao_nome}\n\nVocê será notificado quando o especialista (Jarvis) analisar as fotos. O resultado aparecerá automaticamente na lista de ocorrências.`)
        
        // Resetar formulário
        setNovaOcorrencia({
          tipo: '',
          categoria: '',
          titulo: '',
          descricao: '',
          severidade: 'media',
          latitude: null,
          longitude: null,
          fotos: [],
          talhao_id: '',
          fazenda_id: '',
          area_afetada: ''
        })
        setShowForm(false)
        fetchOcorrencias()
        
        // Iniciar polling para verificar quando a análise estiver pronta
        iniciarPollingStatus(data.inspecao.id)
      } else {
        alert('Erro ao solicitar análise: ' + data.erro)
      }
    } catch (err) {
      console.error('Erro ao solicitar análise:', err)
      alert('Erro ao conectar com servidor. Tente novamente.')
    } finally {
      setAnalisandoIA(false)
    }
  }

  // Polling para verificar status da análise do especialista
  const iniciarPollingStatus = (inspecaoId: string) => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/inspecoes/${inspecaoId}/status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        
        if (data.sucesso && data.status === 'analisada') {
          // Análise pronta! Recarregar ocorrências
          fetchOcorrencias()
          alert(`🎉 Análise do especialista pronta!\n\nDiagnóstico: ${data.analise.tipo}\nSeveridade: ${data.analise.severidade}\n\nConfira os detalhes na lista de ocorrências.`)
          return // Parar polling
        }
        
        // Continuar polling se ainda estiver pendente
        if (data.status === 'pendente') {
          setTimeout(checkStatus, 30000) // Verificar a cada 30 segundos
        }
      } catch (err) {
        console.error('Erro ao verificar status:', err)
      }
    }
    
    // Iniciar após 5 segundos
    setTimeout(checkStatus, 5000)
  }

  const salvarOcorrencia = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!novaOcorrencia.tipo || !novaOcorrencia.titulo) {
      alert('Preencha o tipo e título da ocorrência')
      return
    }

    try {
      const talhao = talhoes.find(t => t.id === novaOcorrencia.talhao_id)
      
      const res = await fetch('/api/ocorrencias', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...novaOcorrencia,
          talhao_nome: talhao?.nome,
          fazenda_nome: talhao?.fazenda_nome,
          data: new Date().toISOString(),
          status: 'aberta',
          metodo_analise: modoAnalise
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
          fotos: [],
          talhao_id: '',
          fazenda_id: '',
          area_afetada: ''
        })
        setShowForm(false)
        fetchOcorrencias()
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Filtrar tipos por cultura selecionada
  const tiposFiltrados = TIPOS_OCORRENCIAS.filter(t => 
    t.culturas.includes(culturaSelecionada) || t.culturas.includes('todas')
  )

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
      case 'pendente_analise': return '#8b5cf6'
      case 'em_tratamento': return '#3b82f6'
      case 'resolvida': return '#22c55e'
      default: return '#6b7280'
    }
  }

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'aberta': return 'Aberta'
      case 'pendente_analise': return 'Pendente Análise'
      case 'em_tratamento': return 'Em Tratamento'
      case 'resolvida': return 'Resolvida'
      default: return status
    }
  }

  if (loading) return <div style={{padding: 20}}>Carregando...</div>

  return (
    <div style={{padding: 20}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10}}>
        <div>
          <h1>🔍 Inspeção de Campo</h1>
          <p style={{color: '#666', marginTop: 5}}>Diagnóstico com IA + GPS + Vinculação a Talhões</p>
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
          
          {/* Seleção de Cultura */}
          <div style={{marginBottom: 20}}>
            <label style={{display: 'block', marginBottom: 8, fontWeight: 600}}>Cultura</label>
            <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
              {CULTURAS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCulturaSelecionada(c.id)}
                  style={{
                    padding: '8px 16px',
                    background: culturaSelecionada === c.id ? '#166534' : '#f3f4f6',
                    color: culturaSelecionada === c.id ? 'white' : '#374151',
                    border: 'none',
                    borderRadius: 20,
                    cursor: 'pointer',
                    fontSize: 14
                  }}
                >
                  {c.icone} {c.nome}
                </button>
              ))}
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16}}>
            <div>
              <label style={{display: 'block', marginBottom: 8, fontWeight: 600}}>Talhão *</label>
              <select 
                value={novaOcorrencia.talhao_id}
                onChange={e => {
                  const talhao = talhoes.find(t => t.id === e.target.value)
                  setNovaOcorrencia(prev => ({
                    ...prev, 
                    talhao_id: e.target.value,
                    fazenda_id: talhao?.fazenda_id || ''
                  }))
                }}
                required
                style={{width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ddd'}}
              >
                <option value="">Selecione o talhão...</option>
                {talhoes.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.fazenda_nome} - {t.nome} ({t.area_hectares} ha)
                  </option>
                ))}
              </select>
              {novaOcorrencia.latitude && !novaOcorrencia.talhao_id && (
                <p style={{color: '#f59e0b', fontSize: 12, marginTop: 4}}>
                  ⚠️ Nenhum talhão próximo encontrado. Selecione manualmente.
                </p>
              )}
            </div>

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
                {tiposFiltrados.map(t => (
                  <option key={t.tipo} value={t.tipo}>
                    {t.icone} {t.tipo}
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
                <option value="baixa">🟢 Baixa (0-25%)</option>
                <option value="media">🟡 Média (25-50%)</option>
                <option value="alta">🔴 Alta (50-75%)</option>
                <option value="critica">⚫ Crítica (75-100%)</option>
              </select>
            </div>

            <div>
              <label style={{display: 'block', marginBottom: 8, fontWeight: 600}}>Área Afetada (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={novaOcorrencia.area_afetada}
                onChange={e => setNovaOcorrencia(prev => ({ ...prev, area_afetada: e.target.value }))}
                placeholder="Ex: 15"
                style={{width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ddd'}}
              />
            </div>
          </div>

          {/* GPS */}
          <div style={{marginTop: 20, padding: 16, background: '#f0fdf4', borderRadius: 8}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10}}>
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
                {capturandoGPS ? '📡 Capturando...' : novaOcorrencia.latitude ? '✓ GPS OK' : '📍 Capturar GPS'}
              </button>
            </div>
          </div>

          {/* Fotos */}
          <div style={{marginTop: 20}}>
            <label style={{display: 'block', marginBottom: 8, fontWeight: 600}}>📸 Fotos (máx 3)</label>
            
            {/* Input para Câmera */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFotoUpload}
              style={{display: 'none'}}
            />
            
            {/* Input para Álbum */}
            <input
              ref={albumInputRef}
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
                <div style={{display: 'flex', gap: 8}}>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    style={{
                      width: 120,
                      height: 120,
                      border: '2px dashed #166534',
                      borderRadius: 8,
                      background: '#f0fdf4',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24
                    }}
                  >
                    📷
                    <span style={{fontSize: 12, marginTop: 4, color: '#166534'}}>Câmera</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => albumInputRef.current?.click()}
                    style={{
                      width: 120,
                      height: 120,
                      border: '2px dashed #3b82f6',
                      borderRadius: 8,
                      background: '#eff6ff',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24
                    }}
                  >
                    🖼️
                    <span style={{fontSize: 12, marginTop: 4, color: '#3b82f6'}}>Álbum</span>
                  </button>
                </div>
              )}
            </div>

            {/* Modo de Análise */}
            {novaOcorrencia.fotos.length > 0 && (
              <div style={{marginTop: 16, padding: 16, background: '#f3e8ff', borderRadius: 8}}>
                <label style={{display: 'block', marginBottom: 8, fontWeight: 600}}>Modo de Análise</label>
                <div style={{display: 'flex', gap: 12}}>
                  <button
                    type="button"
                    onClick={() => setModoAnalise('automatica')}
                    style={{
                      flex: 1,
                      padding: 12,
                      background: modoAnalise === 'automatica' ? '#8b5cf6' : '#f3f4f6',
                      color: modoAnalise === 'automatica' ? 'white' : '#374151',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer'
                    }}
                  >
                    🤖 IA Automática
                    <div style={{fontSize: 12, marginTop: 4, opacity: 0.8}}>GPT-4o Vision</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoAnalise('especialista')}
                    style={{
                      flex: 1,
                      padding: 12,
                      background: modoAnalise === 'especialista' ? '#166534' : '#f3f4f6',
                      color: modoAnalise === 'especialista' ? 'white' : '#374151',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer'
                    }}
                  >
                    👨‍🌾 Especialista
                    <div style={{fontSize: 12, marginTop: 4, opacity: 0.8}}>Análise humana</div>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={analisarIA}
                  disabled={analisandoIA}
                  style={{
                    marginTop: 12,
                    width: '100%',
                    padding: 12,
                    background: modoAnalise === 'especialista' ? '#166534' : '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  {analisandoIA ? '⏳ Analisando...' : modoAnalise === 'especialista' ? '👨‍🌾 Solicitar Análise do Especialista' : '🤖 Analisar com IA'}
                </button>
              </div>
            )}
          </div>

          {/* Descrição */}
          <div style={{marginTop: 20}}>
            <label style={{display: 'block', marginBottom: 8, fontWeight: 600}}>Descrição / Diagnóstico</label>
            <textarea
              value={novaOcorrencia.descricao}
              onChange={e => setNovaOcorrencia(prev => ({ ...prev, descricao: e.target.value }))}
              placeholder="Descreva a ocorrência ou aguarde a análise da IA/especialista..."
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
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12}}>
              <div style={{flex: 1}}>
                <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap'}}>
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
                    {getStatusLabel(o.status)}
                  </span>
                  {o.metodo_analise === 'especialista' && (
                    <span style={{
                      background: '#166534',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: 12
                    }}>
                      👨‍🌾 Especialista
                    </span>
                  )}
                </div>
                
                <p style={{margin: '4px 0', fontWeight: 600}}>{o.titulo}</p>
                
                {o.descricao && !o.descricao.startsWith('[PENDENTE') && (
                  <p style={{margin: '4px 0', color: '#666', fontSize: 14}}>{o.descricao}</p>
                )}
                {o.descricao?.startsWith('[PENDENTE') && (
                  <p style={{margin: '4px 0', color: '#8b5cf6', fontSize: 14, fontStyle: 'italic'}}>
                    ⏳ Aguardando análise do especialista...
                  </p>
                )}
                
                <div style={{marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 14, color: '#666'}}>
                  <span>🏡 {o.fazenda_nome || 'Sem fazenda'}</span>
                  <span>📍 {o.talhao_nome || 'Sem talhão'}</span>
                  <span>📅 {new Date(o.data).toLocaleDateString('pt-BR')}</span>
                  {o.latitude && (
                    <span>🌐 GPS: {o.latitude.toFixed(4)}, {o.longitude?.toFixed(4)}</span>
                  )}
                  <span>👤 {o.operador_nome || 'Operador'}</span>
                </div>

                {o.ia_analise && (
                  <div style={{marginTop: 12, padding: 12, background: '#f3e8ff', borderRadius: 8}}>
                    <strong>🤖 Análise IA:</strong> {o.ia_analise}
                    {o.ia_confianca && (
                      <span style={{marginLeft: 8, fontSize: 12}}>
                        ({(o.ia_confianca * 100).toFixed(0)}% confiança)
                      </span>
                    )}
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