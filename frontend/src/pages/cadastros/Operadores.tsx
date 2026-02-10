import { useState, useEffect } from 'react'
import { apiGet, apiPost, apiDelete, ensureArray } from '../../utils/api'

interface Operador {
  id: string
  nome: string
  funcao: string
  telefone: string
  status: string
}

export default function Operadores() {
  const [operadores, setOperadores] = useState<Operador[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({ nome: '', funcao: '', telefone: '' })

  useEffect(() => {
    fetchOperadores()
  }, [])

  const fetchOperadores = async () => {
    try {
      const data = await apiGet('/api/operadores')
      setOperadores(ensureArray(data))
    } catch (err) {
      console.error(err)
      setOperadores([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nome.trim()) {
      alert('Nome é obrigatório')
      return
    }
    
    setSubmitting(true)
    try {
      const result = await apiPost('/api/operadores', {
        nome: formData.nome.trim(),
        funcao: formData.funcao || null,
        telefone: formData.telefone || null
      })
      
      if (result.sucesso || result.operador) {
        setFormData({ nome: '', funcao: '', telefone: '' })
        fetchOperadores()
      } else {
        alert(result.erro || 'Erro ao salvar operador')
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao salvar operador')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este operador?')) return
    
    try {
      const result = await apiDelete(`/api/operadores/${id}`)
      if (result.sucesso) {
        fetchOperadores()
      } else {
        alert(result.erro || 'Erro ao excluir')
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao excluir operador')
    }
  }

  if (loading) return <div style={{padding: 20}}>Carregando...</div>

  return (
    <div style={{padding: 20}}>
      <h1>👷 Operadores</h1>
      
      <form onSubmit={handleSubmit} style={{marginBottom: 30, display: 'flex', gap: 10, flexWrap: 'wrap', background: 'white', padding: 20, borderRadius: 8}}>
        <input 
          placeholder="Nome *" 
          value={formData.nome} 
          onChange={e => setFormData({...formData, nome: e.target.value})}
          style={{padding: 10, borderRadius: 5, border: '1px solid #ccc', flex: '1 1 200px'}}
          required
        />
        <input 
          placeholder="Função" 
          value={formData.funcao} 
          onChange={e => setFormData({...formData, funcao: e.target.value})}
          style={{padding: 10, borderRadius: 5, border: '1px solid #ccc', flex: '1 1 150px'}}
        />
        <input 
          placeholder="Telefone" 
          value={formData.telefone} 
          onChange={e => setFormData({...formData, telefone: e.target.value})}
          style={{padding: 10, borderRadius: 5, border: '1px solid #ccc', flex: '1 1 150px'}}
        />
        <button 
          type="submit" 
          disabled={submitting}
          style={{
            padding: '10px 20px', 
            background: submitting ? '#9ca3af' : '#166534', 
            color: 'white', 
            border: 'none', 
            borderRadius: 5, 
            cursor: submitting ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {submitting ? 'Salvando...' : '➕ Adicionar'}
        </button>
      </form>

      <div style={{display: 'grid', gap: 15}}>
        {operadores.length === 0 && !loading && (
          <p style={{color: '#666', fontStyle: 'italic'}}>Nenhum operador cadastrado.</p>
        )}
        {operadores.map(o => (
          <div key={o.id} style={{background: 'white', padding: 15, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
              <div>
                <h3>{o.nome}</h3>
                <p style={{color: '#666', margin: '5px 0'}}>🔧 {o.funcao || 'Função não definida'}</p>
                <p style={{color: '#666', margin: '5px 0'}}>📞 {o.telefone || '-'}</p>
              </div>
              <button 
                onClick={() => handleDelete(o.id)}
                style={{background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12}}
              >
                🗑️ Excluir
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
