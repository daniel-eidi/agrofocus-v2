import { useState, useEffect } from 'react'
import { apiGet, apiPost, apiDelete, ensureArray } from '../../utils/api'
import { useFarmContext } from '../../context/FarmContext'

interface Safra {
  id: string
  nome: string
  cultura?: string
  ano_inicio: number
  ano_fim: number
  status: string
  fazenda_id?: string
  fazenda_nome?: string
}

export default function Safras() {
  const [safras, setSafras] = useState<Safra[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    cultura: '',
    ano_inicio: new Date().getFullYear(),
    ano_fim: new Date().getFullYear() + 1,
    status: 'planejada'
  })
  const { refresh } = useFarmContext()

  useEffect(() => {
    fetchSafras()
  }, [])

  const fetchSafras = async () => {
    try {
      const data = await apiGet('/api/safras')
      setSafras(ensureArray(data))
    } catch (err) {
      console.error(err)
      setSafras([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nome.trim()) {
      alert('Nome da safra é obrigatório')
      return
    }
    
    setSubmitting(true)
    try {
      const payload = {
        nome: formData.nome.trim(),
        cultura: formData.cultura || null,
        ano_inicio: Number(formData.ano_inicio) || new Date().getFullYear(),
        ano_fim: Number(formData.ano_fim) || new Date().getFullYear() + 1,
        status: formData.status || 'planejada'
      }
      
      const result = await apiPost('/api/safras', payload)
      
      if (result.sucesso || result.safra) {
        setShowForm(false)
        setFormData({
          nome: '',
          cultura: '',
          ano_inicio: new Date().getFullYear(),
          ano_fim: new Date().getFullYear() + 1,
          status: 'planejada'
        })
        fetchSafras()
        refresh()
      } else {
        alert(result.erro || 'Erro ao salvar safra')
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao salvar safra')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta safra?')) return
    try {
      const result = await apiDelete(`/api/safras/${id}`)
      if (result.erro) {
        alert(result.erro)
      } else {
        fetchSafras()
        refresh()
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao excluir safra')
    }
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'em_andamento': return '#22c55e'
      case 'planejada': return '#3b82f6'
      case 'finalizada': return '#6b7280'
      default: return '#f59e0b'
    }
  }

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'em_andamento': return 'Em Andamento'
      case 'planejada': return 'Planejada'
      case 'finalizada': return 'Finalizada'
      default: return status || 'Planejada'
    }
  }

  if (loading) return <div style={{padding: 20}}>Carregando...</div>

  return (
    <div style={{padding: 20}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h1>🌾 Safras</h1>
        <button 
          onClick={() => setShowForm(!showForm)}
          style={{
            background: '#166534', 
            color: 'white', 
            border: 'none', 
            padding: '10px 20px', 
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          {showForm ? 'Cancelar' : '+ Nova Safra'}
        </button>
      </div>

      {showForm && (
        <div style={{background: 'white', padding: 20, borderRadius: 8, marginTop: 20, boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}}>
          <h3>Nova Safra</h3>
          <form onSubmit={handleSubmit} style={{display: 'grid', gap: 15}}>
            <div>
              <label style={{display: 'block', marginBottom: 5}}>Nome da Safra *</label>
              <input 
                type="text" 
                placeholder="Ex: Safra 2024/2025"
                value={formData.nome}
                onChange={e => setFormData({...formData, nome: e.target.value})}
                style={{width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd', boxSizing: 'border-box'}}
                required
              />
            </div>
            <div>
              <label style={{display: 'block', marginBottom: 5}}>Cultura (opcional)</label>
              <select 
                value={formData.cultura}
                onChange={e => setFormData({...formData, cultura: e.target.value})}
                style={{width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd', boxSizing: 'border-box'}}
              >
                <option value="">Não especificada</option>
                <option value="Soja">Soja</option>
                <option value="Milho">Milho</option>
                <option value="Trigo">Trigo</option>
                <option value="Algodão">Algodão</option>
                <option value="Café">Café</option>
                <option value="Cana">Cana-de-açúcar</option>
                <option value="Feijão">Feijão</option>
                <option value="Arroz">Arroz</option>
              </select>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15}}>
              <div>
                <label style={{display: 'block', marginBottom: 5}}>Ano Início *</label>
                <input 
                  type="number" 
                  value={formData.ano_inicio}
                  onChange={e => setFormData({...formData, ano_inicio: Number(e.target.value)})}
                  style={{width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd', boxSizing: 'border-box'}}
                  required
                />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: 5}}>Ano Fim *</label>
                <input 
                  type="number" 
                  value={formData.ano_fim}
                  onChange={e => setFormData({...formData, ano_fim: Number(e.target.value)})}
                  style={{width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd', boxSizing: 'border-box'}}
                  required
                />
              </div>
            </div>
            <div>
              <label style={{display: 'block', marginBottom: 5}}>Status</label>
              <select 
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
                style={{width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd', boxSizing: 'border-box'}}
              >
                <option value="planejada">Planejada</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="finalizada">Finalizada</option>
              </select>
            </div>
            <button 
              type="submit" 
              disabled={submitting}
              style={{
                background: submitting ? '#9ca3af' : '#2563eb', 
                color: 'white', 
                border: 'none', 
                padding: '10px', 
                borderRadius: 6,
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                marginTop: 10
              }}
            >
              {submitting ? 'Salvando...' : 'Salvar Safra'}
            </button>
          </form>
        </div>
      )}

      <div style={{display: 'grid', gap: 15, marginTop: 20}}>
        {safras.length === 0 && !loading && (
          <p style={{color: '#666', fontStyle: 'italic'}}>Nenhuma safra cadastrada.</p>
        )}
        {safras.map(s => (
          <div key={s.id} style={{background: 'white', padding: 15, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h3>{s.nome}</h3>
              <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
                <span style={{
                  background: getStatusColor(s.status), 
                  color: 'white', 
                  padding: '4px 12px', 
                  borderRadius: 20,
                  fontSize: 12,
                  textTransform: 'uppercase'
                }}>
                  {getStatusLabel(s.status)}
                </span>
                <button 
                  onClick={() => handleDelete(s.id)}
                  style={{background: '#ef4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12}}
                >
                  🗑️
                </button>
              </div>
            </div>
            {s.cultura && <p style={{color: '#666', margin: '5px 0'}}>🌱 Cultura: {s.cultura}</p>}
            <p style={{color: '#666', margin: '5px 0'}}>📅 Período: {s.ano_inicio}/{s.ano_fim}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
