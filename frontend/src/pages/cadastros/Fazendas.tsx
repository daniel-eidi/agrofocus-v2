import { useState, useEffect } from 'react'
import { apiGet, apiPost, apiDelete, ensureArray } from '../../utils/api'
import { useFarmContext } from '../../context/FarmContext'

interface Fazenda {
  id: string
  nome: string
  municipio: string
  estado: string
  area_total: number | string
  car: string
}

export default function Fazendas() {
  const [fazendas, setFazendas] = useState<Fazenda[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({ nome: '', municipio: '', estado: '', car: '', area_total: '' })
  const { refresh } = useFarmContext()

  useEffect(() => {
    fetchFazendas()
  }, [])

  const fetchFazendas = async () => {
    try {
      const data = await apiGet('/api/fazendas')
      setFazendas(ensureArray(data))
    } catch (err) {
      console.error(err)
      setFazendas([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nome.trim()) {
      alert('Nome da fazenda é obrigatório')
      return
    }
    
    setSubmitting(true)
    try {
      const result = await apiPost('/api/fazendas', {
        ...formData,
        area_total: formData.area_total ? parseFloat(formData.area_total) : 0
      })
      
      if (result.sucesso || result.id) {
        setFormData({ nome: '', municipio: '', estado: '', car: '', area_total: '' })
        fetchFazendas()
        refresh() // Atualizar contexto global
      } else {
        alert(result.erro || 'Erro ao salvar fazenda')
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao salvar fazenda')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta fazenda?')) return
    
    try {
      const result = await apiDelete(`/api/fazendas/${id}`)
      if (result.sucesso) {
        fetchFazendas()
        refresh()
      } else {
        alert(result.erro || 'Erro ao excluir')
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao excluir fazenda')
    }
  }

  if (loading) return <div style={{padding: 20}}>Carregando...</div>

  return (
    <div style={{padding: 20}}>
      <h1>🚜 Fazendas</h1>
      
      <form onSubmit={handleSubmit} style={{marginBottom: 30, display: 'flex', gap: 10, flexWrap: 'wrap', background: 'white', padding: 20, borderRadius: 8}}>
        <input 
          placeholder="Nome da Fazenda *" 
          value={formData.nome} 
          onChange={e => setFormData({...formData, nome: e.target.value})}
          style={{padding: 10, borderRadius: 5, border: '1px solid #ccc', flex: '1 1 200px'}}
          required
        />
        <input 
          placeholder="Município" 
          value={formData.municipio} 
          onChange={e => setFormData({...formData, municipio: e.target.value})}
          style={{padding: 10, borderRadius: 5, border: '1px solid #ccc', flex: '1 1 150px'}}
        />
        <input 
          placeholder="Estado (UF)" 
          value={formData.estado} 
          onChange={e => setFormData({...formData, estado: e.target.value.toUpperCase()})}
          style={{padding: 10, borderRadius: 5, border: '1px solid #ccc', width: 80}}
          maxLength={2}
        />
        <input 
          placeholder="Área Total (ha)" 
          type="number"
          step="0.01"
          min="0"
          value={formData.area_total} 
          onChange={e => setFormData({...formData, area_total: e.target.value})}
          style={{padding: 10, borderRadius: 5, border: '1px solid #ccc', width: 120}}
        />
        <input 
          placeholder="CAR" 
          value={formData.car} 
          onChange={e => setFormData({...formData, car: e.target.value})}
          style={{padding: 10, borderRadius: 5, border: '1px solid #ccc', flex: '1 1 200px'}}
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
        {fazendas.length === 0 && !loading && (
          <p style={{color: '#666', fontStyle: 'italic'}}>Nenhuma fazenda cadastrada.</p>
        )}
        {fazendas.map(f => (
          <div key={f.id} style={{background: 'white', padding: 15, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
              <div>
                <h3>{f.nome}</h3>
                <p style={{color: '#666', margin: '5px 0'}}>📍 {f.municipio || '-'} - {f.estado || '-'}</p>
                <p style={{color: '#666', margin: '5px 0'}}>📋 CAR: {f.car || 'Não informado'}</p>
                <p style={{color: '#666', margin: '5px 0'}}>📏 Área: {Number(f.area_total || 0).toFixed(2)} ha</p>
              </div>
              <button 
                onClick={() => handleDelete(f.id)}
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
