import { useState, useEffect } from 'react'

interface Fazenda {
  id: string
  nome: string
  municipio: string
  estado: string
  area_total: number
  car: string
}

export default function Fazendas() {
  const [fazendas, setFazendas] = useState<Fazenda[]>([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({ nome: '', municipio: '', estado: '', car: '' })

  useEffect(() => {
    fetchFazendas()
  }, [])

  const fetchFazendas = async () => {
    try {
      const res = await fetch('/api/fazendas')
      const data = await res.json()
      setFazendas(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await fetch('/api/fazendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      setFormData({ nome: '', municipio: '', estado: '', car: '' })
      fetchFazendas()
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return <div style={{padding: 20}}>Carregando...</div>

  return (
    <div style={{padding: 20}}>
      <h1>🚜 Fazendas</h1>
      
      <form onSubmit={handleSubmit} style={{marginBottom: 30, display: 'flex', gap: 10, flexWrap: 'wrap'}}>
        <input 
          placeholder="Nome da Fazenda" 
          value={formData.nome} 
          onChange={e => setFormData({...formData, nome: e.target.value})}
          style={{padding: 10, borderRadius: 5, border: '1px solid #ccc'}}
        />
        <input 
          placeholder="Município" 
          value={formData.municipio} 
          onChange={e => setFormData({...formData, municipio: e.target.value})}
          style={{padding: 10, borderRadius: 5, border: '1px solid #ccc'}}
        />
        <input 
          placeholder="Estado" 
          value={formData.estado} 
          onChange={e => setFormData({...formData, estado: e.target.value})}
          style={{padding: 10, borderRadius: 5, border: '1px solid #ccc', width: 80}}
        />
        <input 
          placeholder="CAR" 
          value={formData.car} 
          onChange={e => setFormData({...formData, car: e.target.value})}
          style={{padding: 10, borderRadius: 5, border: '1px solid #ccc'}}
        />
        
        <button type="submit" style={{padding: '10px 20px', background: '#166534', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer'}}>
          ➕ Adicionar
        </button>
      </form>

      <div style={{display: 'grid', gap: 15}}>
        {fazendas.map(f => (
          <div key={f.id} style={{background: 'white', padding: 15, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
            <h3>{f.nome}</h3>
            <p style={{color: '#666', margin: '5px 0'}}>📍 {f.municipio} - {f.estado}</p>
            <p style={{color: '#666', margin: '5px 0'}}>📋 CAR: {f.car || 'Não informado'}</p>
            <p style={{color: '#666', margin: '5px 0'}}>📏 Área: {f.area_total?.toFixed(2)} ha</p>
          </div>
        ))}
      </div>
    </div>
  )
}
