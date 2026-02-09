import { useState, useEffect } from 'react'

interface Operador {
  id: string
  nome: string
  funcao: string
  telefone: string
  ativo: boolean
}

export default function Operadores() {
  const [operadores, setOperadores] = useState<Operador[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOperadores()
  }, [])

  const fetchOperadores = async () => {
    try {
      const res = await fetch('/api/operadores')
      const data = await res.json()
      setOperadores(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div style={{padding: 20}}>Carregando...</div>

  return (
    <div style={{padding: 20}}>
      <h1>👷 Operadores</h1>

      <div style={{display: 'grid', gap: 15, marginTop: 20}}>
        {operadores.map(o => (
          <div key={o.id} style={{background: 'white', padding: 15, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h3>{o.nome}</h3>
              <span style={{
                background: o.ativo ? '#22c55e' : '#ef4444', 
                color: 'white', 
                padding: '4px 12px', 
                borderRadius: 20,
                fontSize: 12
              }}>
                {o.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <p style={{color: '#666', margin: '5px 0'}}>🔧 Função: {o.funcao}</p>
            <p style={{color: '#666', margin: '5px 0'}}>📞 {o.telefone}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
