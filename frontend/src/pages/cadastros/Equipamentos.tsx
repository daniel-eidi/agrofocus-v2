import { useState, useEffect } from 'react'

interface Equipamento {
  id: string
  nome: string
  tipo: string
  marca: string
  ano: number
  status: string
}

export default function Equipamentos() {
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEquipamentos()
  }, [])

  const fetchEquipamentos = async () => {
    try {
      const res = await fetch('/api/equipamentos')
      const data = await res.json()
      setEquipamentos(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'disponivel': return '#22c55e'
      case 'em_uso': return '#3b82f6'
      case 'manutencao': return '#f59e0b'
      case 'indisponivel': return '#ef4444'
      default: return '#6b7280'
    }
  }

  if (loading) return <div style={{padding: 20}}>Carregando...</div>

  return (
    <div style={{padding: 20}}>
      <h1>🚜 Equipamentos</h1>

      <div style={{display: 'grid', gap: 15, marginTop: 20}}>
        {equipamentos.map(e => (
          <div key={e.id} style={{background: 'white', padding: 15, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h3>{e.nome}</h3>
              <span style={{
                background: getStatusColor(e.status), 
                color: 'white', 
                padding: '4px 12px', 
                borderRadius: 20,
                fontSize: 12,
                textTransform: 'uppercase'
              }}>
                {e.status.replace('_', ' ')}
              </span>
            </div>
            <p style={{color: '#666', margin: '5px 0'}}>⚙️ Tipo: {e.tipo}</p>
            <p style={{color: '#666', margin: '5px 0'}}>🏷️ Marca: {e.marca}</p>
            <p style={{color: '#666', margin: '5px 0'}}>📅 Ano: {e.ano}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
