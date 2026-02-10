import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { apiGet, apiPost, apiDelete, ensureArray } from '../utils/api'
import CalendarioAtividades from '../components/CalendarioAtividades'
import toast from 'react-hot-toast'

interface Atividade {
  id: string
  descricao: string
  data: string
  tipo: string
  status: string
  talhao_id?: string
  talhao_nome?: string
}

interface Talhao {
  id: string
  nome: string
}

type ModalType = 'none' | 'nova' | 'detalhes'

const TIPOS_ATIVIDADE = [
  { value: 'PLANTIO', label: '🌱 Plantio' },
  { value: 'COLHEITA', label: '🌾 Colheita' },
  { value: 'APLICACAO', label: '💧 Aplicação' },
  { value: 'IRRIGACAO', label: '🚿 Irrigação' },
  { value: 'MANUTENCAO', label: '🔧 Manutenção' }
]

const STATUS_ATIVIDADE = [
  { value: 'planejada', label: 'Planejada' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'cancelada', label: 'Cancelada' }
]

export default function Atividades() {
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [talhoes, setTalhoes] = useState<Talhao[]>([])
  const [loading, setLoading] = useState(true)
  const [mesAtual, setMesAtual] = useState(new Date())
  
  // Modal state
  const [modalType, setModalType] = useState<ModalType>('none')
  const [atividadeSelecionada, setAtividadeSelecionada] = useState<Atividade | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    descricao: '',
    tipo: 'PLANTIO',
    data: '',
    status: 'pendente',
    talhao_id: ''
  })
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [atividadesData, talhoesData] = await Promise.all([
        apiGet('/api/atividades'),
        apiGet('/api/talhoes')
      ])
      setAtividades(ensureArray(atividadesData))
      setTalhoes(ensureArray(talhoesData))
    } catch (err) {
      console.error(err)
      setAtividades([])
      setTalhoes([])
    } finally {
      setLoading(false)
    }
  }

  const handleDiaClick = (data: Date) => {
    setFormData({
      descricao: '',
      tipo: 'PLANTIO',
      data: format(data, 'yyyy-MM-dd'),
      status: 'planejada',
      talhao_id: ''
    })
    setModalType('nova')
  }

  const handleAtividadeClick = (atividade: Atividade) => {
    setAtividadeSelecionada(atividade)
    setModalType('detalhes')
  }

  const handleNovaAtividade = () => {
    setFormData({
      descricao: '',
      tipo: 'PLANTIO',
      data: format(new Date(), 'yyyy-MM-dd'),
      status: 'planejada',
      talhao_id: ''
    })
    setModalType('nova')
  }

  const handleSalvar = async () => {
    if (!formData.descricao.trim()) {
      toast.error('Descrição é obrigatória')
      return
    }
    
    setSalvando(true)
    try {
      await apiPost('/api/atividades', formData)
      toast.success('Atividade criada com sucesso!')
      setModalType('none')
      fetchData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao criar atividade')
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async () => {
    if (!atividadeSelecionada) return
    
    if (!confirm('Deseja realmente excluir esta atividade?')) return
    
    try {
      await apiDelete(`/api/atividades/${atividadeSelecionada.id}`)
      toast.success('Atividade excluída!')
      setModalType('none')
      fetchData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao excluir atividade')
    }
  }

  const fecharModal = () => {
    setModalType('none')
    setAtividadeSelecionada(null)
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'concluida': return '#22c55e'
      case 'em_andamento': return '#3b82f6'
      case 'planejada': return '#f59e0b'
      case 'cancelada': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const getTipoLabel = (tipo: string) => {
    const t = TIPOS_ATIVIDADE.find(t => t.value === tipo)
    return t?.label || tipo
  }

  if (loading) {
    return (
      <div style={{ 
        padding: 40, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        <div style={{ 
          width: 40, 
          height: 40, 
          border: '4px solid #e5e7eb',
          borderTopColor: '#22c55e',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ padding: 20 }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 20 
      }}>
        <h1 style={{ margin: 0, fontSize: 28, color: '#1f2937' }}>📅 Atividades</h1>
        <button
          onClick={handleNovaAtividade}
          style={{
            background: '#22c55e',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: '12px 20px',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#16a34a'}
          onMouseOut={(e) => e.currentTarget.style.background = '#22c55e'}
        >
          ➕ Nova Atividade
        </button>
      </div>

      {/* Calendário */}
      <CalendarioAtividades
        atividades={atividades}
        onDiaClick={handleDiaClick}
        onAtividadeClick={handleAtividadeClick}
        mesAtual={mesAtual}
        onMesChange={setMesAtual}
      />

      {/* Modal de Nova Atividade */}
      {modalType === 'nova' && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: 20
          }}
          onClick={(e) => e.target === e.currentTarget && fecharModal()}
        >
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 24,
            width: '100%',
            maxWidth: 450,
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ margin: '0 0 20px', color: '#1f2937' }}>
              ➕ Nova Atividade
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Descrição */}
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: '#374151' }}>
                  Descrição *
                </label>
                <input
                  type="text"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Ex: Plantio de soja no talhão norte"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 15,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Tipo */}
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: '#374151' }}>
                  Tipo
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 15,
                    boxSizing: 'border-box',
                    background: 'white'
                  }}
                >
                  {TIPOS_ATIVIDADE.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Data */}
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: '#374151' }}>
                  Data
                </label>
                <input
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 15,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Status */}
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: '#374151' }}>
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 15,
                    boxSizing: 'border-box',
                    background: 'white'
                  }}
                >
                  {STATUS_ATIVIDADE.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Talhão */}
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: '#374151' }}>
                  Talhão
                </label>
                <select
                  value={formData.talhao_id}
                  onChange={(e) => setFormData({ ...formData, talhao_id: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 15,
                    boxSizing: 'border-box',
                    background: 'white'
                  }}
                >
                  <option value="">Selecione um talhão (opcional)</option>
                  {talhoes.map(t => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Botões */}
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button
                onClick={fecharModal}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  background: 'white',
                  color: '#374151',
                  fontSize: 15,
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvar}
                disabled={salvando}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  borderRadius: 8,
                  background: salvando ? '#9ca3af' : '#22c55e',
                  color: 'white',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: salvando ? 'not-allowed' : 'pointer'
                }}
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes */}
      {modalType === 'detalhes' && atividadeSelecionada && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: 20
          }}
          onClick={(e) => e.target === e.currentTarget && fecharModal()}
        >
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 24,
            width: '100%',
            maxWidth: 450,
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ margin: '0 0 20px', color: '#1f2937' }}>
              📋 Detalhes da Atividade
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Descrição */}
              <div style={{ 
                background: '#f9fafb', 
                padding: 16, 
                borderRadius: 8 
              }}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                  Descrição
                </div>
                <div style={{ fontSize: 16, fontWeight: 500, color: '#1f2937' }}>
                  {atividadeSelecionada.descricao}
                </div>
              </div>

              {/* Grid de detalhes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: '#f9fafb', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                    Tipo
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {getTipoLabel(atividadeSelecionada.tipo)}
                  </div>
                </div>

                <div style={{ background: '#f9fafb', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                    Status
                  </div>
                  <span style={{
                    display: 'inline-block',
                    background: getStatusColor(atividadeSelecionada.status),
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: 16,
                    fontSize: 12,
                    fontWeight: 500,
                    textTransform: 'capitalize'
                  }}>
                    {(atividadeSelecionada.status || 'pendente').replace('_', ' ')}
                  </span>
                </div>

                <div style={{ background: '#f9fafb', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                    📅 Data
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {atividadeSelecionada.data 
                      ? new Date(atividadeSelecionada.data).toLocaleDateString('pt-BR')
                      : '-'
                    }
                  </div>
                </div>

                <div style={{ background: '#f9fafb', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                    📍 Talhão
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {atividadeSelecionada.talhao_nome || 'Não definido'}
                  </div>
                </div>
              </div>
            </div>

            {/* Botões */}
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button
                onClick={handleExcluir}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  borderRadius: 8,
                  background: '#ef4444',
                  color: 'white',
                  fontSize: 15,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                🗑️ Excluir
              </button>
              <button
                onClick={fecharModal}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  background: 'white',
                  color: '#374151',
                  fontSize: 15,
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
