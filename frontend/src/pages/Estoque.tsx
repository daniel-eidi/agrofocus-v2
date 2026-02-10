import { useState, useEffect } from 'react'
import { apiGet, ensureArray } from '../utils/api'

interface Insumo {
  id: string
  nome: string
  quantidade: number
  unidade: string
  categoria: string
  estoque_minimo?: number
}

export default function Estoque() {
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInsumos()
  }, [])

  const fetchInsumos = async () => {
    try {
      const data = await apiGet('/api/insumos')
      setInsumos(ensureArray(data))
    } catch (err) {
      console.error(err)
      setInsumos([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div style={{padding: 20}}>Carregando...</div>

  return (
    <div style={{padding: 20}}>
      <h1>📦 Estoque</h1>

      <div style={{display: 'grid', gap: 15, marginTop: 20}}>
        {insumos.length === 0 && !loading && (
          <p style={{color: '#666', fontStyle: 'italic'}}>Nenhum insumo cadastrado.</p>
        )}
        {insumos.map(i => (
          <div key={i.id} style={{background: 'white', padding: 15, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h3>{i.nome}</h3>
              <span style={{
                background: (i.estoque_minimo && i.quantidade < i.estoque_minimo) ? '#ef4444' : '#22c55e',
                color: 'white', 
                padding: '4px 12px', 
                borderRadius: 20,
                fontSize: 14
              }}>
                {i.quantidade} {i.unidade}
              </span>
            </div>
            <p style={{color: '#666', margin: '5px 0'}}>🏷️ {i.categoria || 'Geral'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
