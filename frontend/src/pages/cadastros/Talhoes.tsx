import { useState, useEffect } from 'react'

interface Talhao {
  id: string
  nome: string
  area_hectares: number
  tipo_solo: string
  fazenda_nome?: string
}

export default function Talhoes() {
  const [talhoes, setTalhoes] = useState<Talhao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTalhoes()
  }, [])

  const fetchTalhoes = async () => {
    try {
      const res = await fetch('/api/talhoes')
      const data = await res.json()
      setTalhoes(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div style={{padding: 20}}>Carregando...</div>

  return (
    <div style={{padding: 20}}>
      <h1>📐 Talhões</h1>

      <div style={{display: 'grid', gap: 15, marginTop: 20}}>
        {talhoes.map(t => (
          <div key={t.id} style={{background: 'white', padding: 15, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
            <h3>{t.nome}</h3>
            {t.fazenda_nome && <p style={{color: '#666', margin: '5px 0'}}>🚜 Fazenda: {t.fazenda_nome}</p>}
            <p style={{color: '#666', margin: '5px 0'}}>📏 Área: {t.area_hectares?.toFixed(2)} ha</p>
            <p style={{color: '#666', margin: '5px 0'}}>🌍 Solo: {t.tipo_solo || 'Não classificado'}</p>
            <div style={{marginTop: 10, display: 'flex', gap: 10}}>
              <a href={`/api/ndvi/${t.id}`} style={{padding: '5px 10px', background: '#166534', color: 'white', textDecoration: 'none', borderRadius: 4, fontSize: 12}}>NDVI</a>
              <a href={`/api/produtividade/estimar/${t.id}`} style={{padding: '5px 10px', background: '#3b82f6', color: 'white', textDecoration: 'none', borderRadius: 4, fontSize: 12}}>Produtividade</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
