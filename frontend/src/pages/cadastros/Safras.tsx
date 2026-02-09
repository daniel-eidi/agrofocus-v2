import { useState, useEffect } from 'react'

interface Safra {
  id: string
  nome: string
  cultura: string
  ano_inicio: number
  ano_fim: number
  status: string
}

export default function Safras() {
  const [safras, setSafras] = useState<Safra[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSafras()
  }, [])

  const fetchSafras = async () => {
    try {
      const res = await fetch('/api/safras')
      const data = await res.json()
      setSafras(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'em_andamento': return '#22c55e'
      case 'planejada': return '#3b82f6'
      case 'finalizada': return '#6b7280'
      default: return '#f59e0b'
    }
  }

  if (loading) return <div style={{padding: 20}}>Carregando...</div>

  return (
    <div style={{padding: 20}}>
      <h1>🌾 Safras</h1>

      <div style={{display: 'grid', gap: 15, marginTop: 20}}>
        {safras.map(s => (
          <div key={s.id} style={{background: 'white', padding: 15, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h3>{s.nome}</h3>
              <span style={{
                background: getStatusColor(s.status), 
                color: 'white', 
                padding: '4px 12px', 
                borderRadius: 20,
                fontSize: 12,
                textTransform: 'uppercase'
              }}>
                {s.status.replace('_', ' ')}
              </span>
            </div>
            <p style={{color: '#666', margin: '5px 0'}}>🌱 Cultura: {s.cultura}</p>
            <p style={{color: '#666', margin: '5px 0'}}>📅 Período: {s.ano_inicio}/{s.ano_fim}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
