import { useState, useEffect } from 'react'

interface Insumo {
  id: string
  nome: string
  tipo: string
  quantidade: number
  unidade: string
  preco_medio: number
  estoque_minimo: number
}

export default function Estoque() {
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInsumos()
  }, [])

  const fetchInsumos = async () => {
    try {
      const res = await fetch('/api/estoque/insumos')
      const data = await res.json()
      setInsumos(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div style={{padding: 20}}>Carregando...</div>

  return (
    <div style={{padding: 20}}>
      <h1>📦 Estoque</h1>

      <div style={{display: 'grid', gap: 15, marginTop: 20}}>
        {insumos.map(i => {
          const estoqueBaixo = i.quantidade < i.estoque_minimo
          return (
            <div key={i.id} style={{
              background: 'white', 
              padding: 15, 
              borderRadius: 8, 
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              borderLeft: estoqueBaixo ? '4px solid #ef4444' : '4px solid #22c55e'
            }}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h3>{i.nome}</h3>
                {estoqueBaixo && <span style={{background: '#ef4444', color: 'white', padding: '4px 12px', borderRadius: 20, fontSize: 12}}>Estoque Baixo</span>}
              </div>
              
              <p style={{color: '#666', margin: '5px 0'}}>🏷️ Tipo: {i.tipo}</p>
              
              <p style={{color: '#666', margin: '5px 0'}}>📊 Quantidade: {i.quantidade} {i.unidade}</p>
              
              <p style={{color: '#666', margin: '5px 0'}}>💰 Preço Médio: R$ {i.preco_medio?.toFixed(2)}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
