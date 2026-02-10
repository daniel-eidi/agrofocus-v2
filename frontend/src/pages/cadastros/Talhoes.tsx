import { useState, useEffect, lazy, Suspense } from 'react'
import { apiGet, apiPost, apiDelete, ensureArray } from '../../utils/api'

// Lazy load dos mapas
const MapaVisualizacaoTalhoes = lazy(() => import('../../components/MapaVisualizacaoTalhoes'))
const MapaDesenhoSimples = lazy(() => import('../../components/MapaDesenhoSimples'))

interface Talhao {
  id: string
  nome: string
  area_hectares: number | string
  tipo_solo?: string
  fazenda_id?: string
  fazenda_nome?: string
  safra_id?: string
  safra_nome?: string
  status?: string
  centroide?: { coordinates: number[] }
}

interface Fazenda {
  id: string
  nome: string
}

interface Safra {
  id: string
  nome: string
  cultura?: string
}

export default function Talhoes() {
  const [talhoes, setTalhoes] = useState<Talhao[]>([])
  const [fazendas, setFazendas] = useState<Fazenda[]>([])
  const [safras, setSafras] = useState<Safra[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    area_hectares: 0,
    tipo_solo: '',
    fazenda_id: '',
    safra_id: '',
    status: 'ativo',
    geometria: null as any
  })

  useEffect(() => {
    fetchTalhoes()
    fetchFazendas()
    fetchSafras()
  }, [])

  const fetchTalhoes = async () => {
    try {
      const data = await apiGet('/api/talhoes-db')
      setTalhoes(ensureArray(data))
    } catch (err) {
      console.error(err)
      setTalhoes([])
    } finally {
      setLoading(false)
    }
  }

  const fetchFazendas = async () => {
    try {
      const data = await apiGet('/api/fazendas')
      setFazendas(ensureArray(data))
    } catch (err) {
      console.error(err)
    }
  }

  const fetchSafras = async () => {
    try {
      const data = await apiGet('/api/safras')
      setSafras(ensureArray(data))
    } catch (err) {
      console.error(err)
    }
  }

  const handlePolygonComplete = (geojson: any, areaHa: number) => {
    setFormData(prev => ({
      ...prev,
      geometria: geojson,
      area_hectares: Math.round(areaHa * 100) / 100
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nome.trim()) {
      alert('Nome do talhão é obrigatório')
      return
    }
    
    if (!formData.fazenda_id) {
      alert('Selecione uma fazenda')
      return
    }
    
    setSubmitting(true)
    try {
      const payload = {
        nome: formData.nome.trim(),
        area_hectares: Number(formData.area_hectares) || 0,
        tipo_solo: formData.tipo_solo || null,
        fazenda_id: formData.fazenda_id,
        safra_id: formData.safra_id || null,
        status: formData.status || 'ativo',
        geometria: formData.geometria
      }
      
      const result = await apiPost('/api/talhoes-db', payload)
      
      if (result.sucesso || result.talhao) {
        await fetchTalhoes()
        setShowForm(false)
        setFormData({
          nome: '',
          area_hectares: 0,
          tipo_solo: '',
          fazenda_id: '',
          safra_id: '',
          status: 'ativo',
          geometria: null
        })
      } else {
        alert(result.erro || 'Erro ao salvar talhão')
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao salvar talhão')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este talhão?')) return
    try {
      const result = await apiDelete(`/api/talhoes-db/${id}`)
      if (result.sucesso) {
        setTalhoes(talhoes.filter(t => t.id !== id))
      } else {
        alert(result.erro || 'Erro ao excluir')
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao excluir talhão')
    }
  }

  const getStatusColor = (status?: string) => {
    switch(status) {
      case 'ativo': 
      case 'plantado': return '#22c55e'
      case 'em_preparo': return '#f59e0b'
      case 'colhido': return '#3b82f6'
      case 'inativo': return '#6b7280'
      default: return '#9ca3af'
    }
  }

  if (loading) return <div style={{padding: 20}}>Carregando...</div>

  return (
    <div style={{padding: 20}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
        <h1>📐 Talhões</h1>
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
          {showForm ? 'Cancelar' : '+ Novo Talhão'}
        </button>
      </div>

      {/* Mapa de Visualização */}
      {!showForm && talhoes.length > 0 && (
        <div style={{marginBottom: 20}}>
          <Suspense fallback={<div style={{height: 300, background: '#f3f4f6', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>Carregando mapa...</div>}>
            <MapaVisualizacaoTalhoes talhoes={talhoes} />
          </Suspense>
        </div>
      )}

      {/* Formulário de Cadastro */}
      {showForm && (
        <div style={{background: 'white', padding: 20, borderRadius: 8, marginBottom: 20, boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}}>
          <h3>Novo Talhão</h3>
          <form onSubmit={handleSubmit} style={{display: 'grid', gap: 15}}>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15}}>
              <div>
                <label style={{display: 'block', marginBottom: 5}}>Fazenda *</label>
                <select 
                  value={formData.fazenda_id}
                  onChange={e => setFormData({...formData, fazenda_id: e.target.value})}
                  style={{width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd', boxSizing: 'border-box'}}
                  required
                >
                  <option value="">Selecione...</option>
                  {fazendas.map(f => (
                    <option key={f.id} value={f.id}>{f.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{display: 'block', marginBottom: 5}}>Safra</label>
                <select 
                  value={formData.safra_id}
                  onChange={e => setFormData({...formData, safra_id: e.target.value})}
                  style={{width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd', boxSizing: 'border-box'}}
                >
                  <option value="">Selecione...</option>
                  {safras.map(s => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15}}>
              <div>
                <label style={{display: 'block', marginBottom: 5}}>Nome do Talhão *</label>
                <input 
                  type="text" 
                  value={formData.nome}
                  onChange={e => setFormData({...formData, nome: e.target.value})}
                  placeholder="Ex: Talhão A1"
                  style={{width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd', boxSizing: 'border-box'}}
                  required
                />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: 5}}>Status</label>
                <select 
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value})}
                  style={{width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd', boxSizing: 'border-box'}}
                >
                  <option value="ativo">Ativo</option>
                  <option value="em_preparo">Em Preparo</option>
                  <option value="plantado">Plantado</option>
                  <option value="colhido">Colhido</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{display: 'block', marginBottom: 5}}>Área (hectares)</label>
              <input 
                type="number" 
                step="0.01"
                min="0"
                value={formData.area_hectares}
                onChange={e => setFormData({...formData, area_hectares: parseFloat(e.target.value) || 0})}
                style={{width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd', boxSizing: 'border-box'}}
                readOnly={formData.geometria !== null && formData.geometria?.coordinates?.length > 0}
              />
              {formData.geometria?.coordinates?.length > 0 && (
                <small style={{color: '#22c55e'}}>✓ Calculada pelo polígono</small>
              )}
            </div>

            <div>
              <label style={{display: 'block', marginBottom: 10, fontWeight: 'bold'}}>🗺️ Desenhar Limites do Talhão</label>
              <Suspense fallback={<div style={{height: 400, background: '#f3f4f6', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>Carregando mapa...</div>}>
                <MapaDesenhoSimples onPolygonComplete={handlePolygonComplete} />
              </Suspense>
            </div>

            <button 
              type="submit" 
              disabled={submitting}
              style={{
                background: submitting ? '#9ca3af' : '#2563eb', 
                color: 'white', 
                border: 'none', 
                padding: '12px', 
                borderRadius: 6,
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: 16
              }}
            >
              {submitting ? 'Salvando...' : '💾 Salvar Talhão'}
            </button>
          </form>
        </div>
      )}

      {/* Lista de Talhões */}
      <div style={{display: 'grid', gap: 15}}>
        {talhoes.length === 0 && !loading && (
          <p style={{color: '#666', fontStyle: 'italic'}}>Nenhum talhão cadastrado.</p>
        )}
        {talhoes.map(t => (
          <div key={t.id} style={{
            background: 'white', 
            padding: 15, 
            borderRadius: 8, 
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            borderLeft: `4px solid ${getStatusColor(t.status)}`
          }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
              <div>
                <h3 style={{margin: 0}}>{t.nome}</h3>
                {t.fazenda_nome && <p style={{color: '#666', margin: '5px 0'}}>🚜 {t.fazenda_nome}</p>}
                {t.safra_nome && <p style={{color: '#666', margin: '5px 0'}}>🌾 {t.safra_nome}</p>}
                <p style={{color: '#666', margin: '5px 0'}}>📏 {Number(t.area_hectares || 0).toFixed(2)} ha</p>
                {t.status && (
                  <span style={{
                    background: getStatusColor(t.status),
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: 11,
                    textTransform: 'uppercase'
                  }}>
                    {t.status.replace('_', ' ')}
                  </span>
                )}
              </div>
              <button 
                onClick={() => handleDelete(t.id)}
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
