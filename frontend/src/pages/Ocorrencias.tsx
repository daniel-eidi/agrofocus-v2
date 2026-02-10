import { useState, useEffect } from 'react'
import { apiGet, ensureArray } from '../utils/api'

interface Ocorrencia {
  id: string
  tipo: string
  descricao: string
  severidade: string
  data_registro: string
  talhao_nome?: string
  status: string
}

export default function Ocorrencias() {
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOcorrencias()
  }, [])

  const fetchOcorrencias = async () => {
    try {
      const data = await apiGet('/api/ocorrencias')
      setOcorrencias(ensureArray(data))
    } catch (err) {
      console.error(err)
      setOcorrencias([])
    } finally {
      setLoading(false)
    }
  }

  const getSeveridadeColor = (sev: string) => {
    switch(sev) {
      case 'alta': return '#ef4444'
      case 'media': return '#f59e0b'
      case 'baixa': return '#22c55e'
      default: return '#6b7280'
    }
  }

  if (loading) return <div style={{padding: 20}}>Carregando...</div>

  return (
    <div style={{padding: 20}}>
      <h1>🔍 Ocorrências</h1>

      <div style={{display: 'grid', gap: 15, marginTop: 20}}>
        {ocorrencias.length === 0 && !loading && (
          <p style={{color: '#666', fontStyle: 'italic'}}>Nenhuma ocorrência registrada.</p>
        )}
        {ocorrencias.map(o => (
          <div key={o.id} style={{background: 'white', padding: 15, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h3>{o.tipo}</h3>
              <span style={{
                background: getSeveridadeColor(o.severidade), 
                color: 'white', 
                padding: '4px 12px', 
                borderRadius: 20,
                fontSize: 12,
                textTransform: 'uppercase'
              }}>
                {o.severidade || 'N/A'}
              </span>
            </div>
            <p style={{color: '#666', margin: '5px 0'}}>{o.descricao || '-'}</p>
            <p style={{color: '#666', margin: '5px 0'}}>📍 {o.talhao_nome || 'Sem talhão'}</p>
            <p style={{color: '#666', margin: '5px 0'}}>📅 {o.data_registro ? new Date(o.data_registro).toLocaleDateString('pt-BR') : '-'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
