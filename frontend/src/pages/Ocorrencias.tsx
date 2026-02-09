import { useState, useEffect } from 'react'

interface Ocorrencia {
  id: string
  tipo: string
  descricao: string
  data: string
  gravidade: string
  status: string
  talhao_nome?: string
}

export default function Ocorrencias() {
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOcorrencias()
  }, [])

  const fetchOcorrencias = async () => {
    try {
      const res = await fetch('/api/ocorrencias')
      const data = await res.json()
      setOcorrencias(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
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

  if (loading) return <div style={{padding: 20}}>Carregando...</div>

  return (
    <div style={{padding: 20}}>
      <h1>🔍 Ocorrências</h1>

      <div style={{display: 'grid', gap: 15, marginTop: 20}}>
        {ocorrencias.map(o => (
          <div key={o.id} style={{background: 'white', padding: 15, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h3>{o.tipo}</h3>
              <span style={{
                background: getGravidadeColor(o.gravidade), 
                color: 'white', 
                padding: '4px 12px', 
                borderRadius: 20,
                fontSize: 12,
                textTransform: 'uppercase'
              }}>
                {o.gravidade}
              </span>
            </div>
            <p style={{color: '#333', margin: '10px 0'}}>{o.descricao}</p>
            <p style={{color: '#666', margin: '5px 0'}}>📍 {o.talhao_nome || 'Sem talhão'}</p>
            <p style={{color: '#666', margin: '5px 0'}}>📅 {new Date(o.data).toLocaleDateString('pt-BR')}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
