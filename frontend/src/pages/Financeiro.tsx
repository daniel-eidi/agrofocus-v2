import { useState, useEffect } from 'react'
import { apiGet, ensureArray } from '../utils/api'

interface Despesa {
  id: string
  descricao: string
  valor: number
  data: string
  categoria: string
  fazenda_nome?: string
}

export default function Financeiro() {
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDespesas()
  }, [])

  const fetchDespesas = async () => {
    try {
      const data = await apiGet('/api/despesas')
      setDespesas(ensureArray(data))
    } catch (err) {
      console.error(err)
      setDespesas([])
    } finally {
      setLoading(false)
    }
  }

  const total = despesas.reduce((acc, d) => acc + (Number(d.valor) || 0), 0)

  if (loading) return <div style={{padding: 20}}>Carregando...</div>

  return (
    <div style={{padding: 20}}>
      <h1>💰 Financeiro</h1>

      <div style={{background: '#166534', color: 'white', padding: 20, borderRadius: 8, marginBottom: 20}}>
        <h3>Total de Despesas</h3>
        <p style={{fontSize: 32, margin: 0}}>R$ {total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
      </div>

      <div style={{display: 'grid', gap: 15}}>
        {despesas.length === 0 && !loading && (
          <p style={{color: '#666', fontStyle: 'italic'}}>Nenhuma despesa registrada.</p>
        )}
        {despesas.map(d => (
          <div key={d.id} style={{background: 'white', padding: 15, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h3>{d.descricao || 'Despesa'}</h3>
              <span style={{color: '#ef4444', fontWeight: 'bold', fontSize: 18}}>
                R$ {Number(d.valor || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
              </span>
            </div>
            <p style={{color: '#666', margin: '5px 0'}}>🏷️ {d.categoria || 'Geral'}</p>
            <p style={{color: '#666', margin: '5px 0'}}>📅 {d.data ? new Date(d.data).toLocaleDateString('pt-BR') : '-'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
