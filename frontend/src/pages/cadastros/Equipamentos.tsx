import { useState, useEffect } from 'react'
import { apiGet, apiPost, apiDelete, ensureArray } from '../../utils/api'

interface Equipamento {
  id: string
  nome: string
  tipo: string
  placa: string
  status: string
}

export default function Equipamentos() {
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({ nome: '', tipo: '', placa: '' })

  useEffect(() => {
    fetchEquipamentos()
  }, [])

  const fetchEquipamentos = async () => {
    try {
      const data = await apiGet('/api/equipamentos')
      setEquipamentos(ensureArray(data))
    } catch (err) {
      console.error(err)
      setEquipamentos([])
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
      const result = await apiPost('/api/equipamentos', {
        nome: formData.nome.trim(),
        tipo: formData.tipo || null,
        placa: formData.placa || null
      })
      
      if (result.sucesso || result.equipamento) {
        setFormData({ nome: '', tipo: '', placa: '' })
        fetchEquipamentos()
      } else {
        alert(result.erro || 'Erro ao salvar equipamento')
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao salvar equipamento')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este equipamento?')) return
    
    try {
      const result = await apiDelete(`/api/equipamentos/${id}`)
      if (result.sucesso) {
        fetchEquipamentos()
      } else {
        alert(result.erro || 'Erro ao excluir')
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao excluir equipamento')
    }
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'disponivel': return '#22c55e'
      case 'em_uso': return '#f59e0b'
      case 'manutencao': return '#ef4444'
      default: return '#9ca3af'
    }
  }

  if (loading) return <div style={{padding: 20}}>Carregando...</div>

  return (
    <div style={{padding: 20}}>
      <h1>🚜 Equipamentos</h1>
      
      <form onSubmit={handleSubmit} style={{marginBottom: 30, display: 'flex', gap: 10, flexWrap: 'wrap', background: 'white', padding: 20, borderRadius: 8}}>
        <input 
          placeholder="Nome *" 
          value={formData.nome} 
          onChange={e => setFormData({...formData, nome: e.target.value})}
          style={{padding: 10, borderRadius: 5, border: '1px solid #ccc', flex: '1 1 200px'}}
          required
        />
        <input 
          placeholder="Tipo (Trator, Colheitadeira...)" 
          value={formData.tipo} 
          onChange={e => setFormData({...formData, tipo: e.target.value})}
          style={{padding: 10, borderRadius: 5, border: '1px solid #ccc', flex: '1 1 200px'}}
        />
        <input 
          placeholder="Placa" 
          value={formData.placa} 
          onChange={e => setFormData({...formData, placa: e.target.value.toUpperCase()})}
          style={{padding: 10, borderRadius: 5, border: '1px solid #ccc', flex: '1 1 120px'}}
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
        {equipamentos.length === 0 && !loading && (
          <p style={{color: '#666', fontStyle: 'italic'}}>Nenhum equipamento cadastrado.</p>
        )}
        {equipamentos.map(e => (
          <div key={e.id} style={{background: 'white', padding: 15, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
              <div>
                <h3>{e.nome}</h3>
                <p style={{color: '#666', margin: '5px 0'}}>🏷️ {e.tipo || 'Tipo não definido'}</p>
                <p style={{color: '#666', margin: '5px 0'}}>🚗 Placa: {e.placa || '-'}</p>
                {e.status && (
                  <span style={{
                    background: getStatusColor(e.status),
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: 11,
                    textTransform: 'uppercase'
                  }}>
                    {e.status.replace('_', ' ')}
                  </span>
                )}
              </div>
              <button 
                onClick={() => handleDelete(e.id)}
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
