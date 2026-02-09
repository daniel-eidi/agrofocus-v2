import { useState, useEffect } from 'react'

interface Despesa {
  id: string
  descricao: string
  valor: number
  data: string
  categoria: string
  talhao_nome?: string
}

export default function Financeiro() {
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetchDespesas()
  }, [])

  const fetchDespesas = async () => {
    try {
      const res = await fetch('/api/financeiro/despesas')
      const data = await res.json()
      setDespesas(data)
      const sum = data.reduce((acc: number, d: Despesa) => acc + d.valor, 0)
      setTotal(sum)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div style={{padding: 20}}>Carregando...</div>

  return (
    <div style={{padding: 20}}>
      <h1>💰 Financeiro</h1>

      <div style={{background: '#166534', color: 'white', padding: 20, borderRadius: 8, marginBottom: 20}}>
        <h3>Total em Despesas</h3>
        <p style={{fontSize: 36, margin: 0}}>R$ {total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
      </div>

      <div style={{display: 'grid', gap: 15}}>
        {despesas.map(d => (
          <div key={d.id} style={{background: 'white', padding: 15, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h3>{d.descricao}</h3>
              <span style={{fontWeight: 'bold', color: '#ef4444'}}>R$ {d.valor.toFixed(2)}</span>
            </div>
            <p style={{color: '#666', margin: '5px 0'}}>🏷️ {d.categoria}</p>
            <p style={{color: '#666', margin: '5px 0'}}>📍 {d.talhao_nome || 'Geral'}</p>
            <p style={{color: '#666', margin: '5px 0'}}>📅 {new Date(d.data).toLocaleDateString('pt-BR')}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
