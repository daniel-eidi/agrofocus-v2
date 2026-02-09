import { useState, useEffect } from 'react'

interface Atividade {
  id: string
  descricao: string
  data: string
  tipo: string
  status: string
  talhao_nome?: string
}

export default function Atividades() {
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAtividades()
  }, [])

  const fetchAtividades = async () => {
    try {
      const res = await fetch('/api/atividades')
      const data = await res.json()
      setAtividades(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'concluida': return '#22c55e'
      case 'em_andamento': return '#3b82f6'
      case 'pendente': return '#f59e0b'
      default: return '#6b7280'
    }
  }

  if (loading) return <div style={{padding: 20}}>Carregando...</div>

  return (
    <div style={{padding: 20}}>
      <h1>📅 Atividades</h1>

      <div style={{display: 'grid', gap: 15, marginTop: 20}}>
        {atividades.map(a => (
          <div key={a.id} style={{background: 'white', padding: 15, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h3>{a.descricao}</h3>
              <span style={{
                background: getStatusColor(a.status), 
                color: 'white', 
                padding: '4px 12px', 
                borderRadius: 20,
                fontSize: 12,
                textTransform: 'uppercase'
              }}>
                {a.status.replace('_', ' ')}
              </span>
            </div>
            <p style={{color: '#666', margin: '5px 0'}}>📍 {a.talhao_nome || 'Sem talhão'}</p>
            <p style={{color: '#666', margin: '5px 0'}}>📅 {new Date(a.data).toLocaleDateString('pt-BR')}</p>
            <p style={{color: '#666', margin: '5px 0'}}>🏷️ Tipo: {a.tipo}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
