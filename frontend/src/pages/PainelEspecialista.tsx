import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

interface InspecaoPendente {
  id: string
  cultura: string
  talhao_nome: string
  fazenda_nome: string
  operador_nome: string
  data_criacao: string
  foto_preview: string
  observacoes: string
  latitude?: number
  longitude?: number
}

interface AnaliseForm {
  tipo: string
  categoria: 'praga' | 'doenca' | 'deficiencia' | 'outro' | 'saudavel'
  severidade: 'baixa' | 'media' | 'alta' | 'critica'
  confianca: number
  descricao: string
  recomendacao: string
  sintomas: string
  estagio: string
  danos: string
  produtosSugeridos: string
  prazoAcao: string
  observacoesEspecialista: string
}

export default function PainelEspecialista() {
  const [inspecoes, setInspecoes] = useState<InspecaoPendente[]>([])
  const [loading, setLoading] = useState(true)
  const [inspecaoSelecionada, setInspecaoSelecionada] = useState<InspecaoPendente | null>(null)
  const [detalhes, setDetalhes] = useState<any>(null)
  const { token } = useAuth()

  const [analise, setAnalise] = useState<AnaliseForm>({
    tipo: '',
    categoria: 'praga',
    severidade: 'media',
    confianca: 0.95,
    descricao: '',
    recomendacao: '',
    sintomas: '',
    estagio: '',
    danos: '',
    produtosSugeridos: '',
    prazoAcao: 'Monitorar',
    observacoesEspecialista: ''
  })

  useEffect(() => {
    fetchInspecoesPendentes()
    const interval = setInterval(fetchInspecoesPendentes, 10000)
    return () => clearInterval(interval)
  }, [])

  const fetchInspecoesPendentes = async () => {
    try {
      const res = await fetch('/api/inspecoes/pendentes', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.sucesso) {
        setInspecoes(data.inspecoes)
      }
    } catch (err) {
      console.error('Erro ao carregar inspecoes:', err)
    } finally {
      setLoading(false)
    }
  }

  const abrirAnalise = async (inspecao: InspecaoPendente) => {
    setInspecaoSelecionada(inspecao)
    try {
      const res = await fetch(`/api/inspecoes/pendentes/${inspecao.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.sucesso) {
        setDetalhes(data.inspecao)
      }
    } catch (err) {
      console.error('Erro ao carregar detalhes:', err)
    }
  }

  const submeterAnalise = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inspecaoSelecionada) return

    try {
      const res = await fetch(`/api/inspecoes/pendentes/${inspecaoSelecionada.id}/analisar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...analise,
          sintomas: analise.sintomas.split(',').map(s => s.trim()).filter(Boolean),
          produtosSugeridos: analise.produtosSugeridos.split(',').map(s => s.trim()).filter(Boolean)
        })
      })

      const data = await res.json()
      if (data.sucesso) {
        alert('Analise submetida com sucesso!')
        setInspecaoSelecionada(null)
        setDetalhes(null)
        fetchInspecoesPendentes()
        setAnalise({
          tipo: '',
          categoria: 'praga',
          severidade: 'media',
          confianca: 0.95,
          descricao: '',
          recomendacao: '',
          sintomas: '',
          estagio: '',
          danos: '',
          produtosSugeridos: '',
          prazoAcao: 'Monitorar',
          observacoesEspecialista: ''
        })
      } else {
        alert('Erro: ' + data.erro)
      }
    } catch (err) {
      alert('Erro ao submeter analise')
    }
  }

  const rejeitarInspecao = async () => {
    if (!inspecaoSelecionada) return
    const motivo = prompt('Motivo da rejeicao:')
    if (!motivo) return

    try {
      const res = await fetch(`/api/inspecoes/pendentes/${inspecaoSelecionada.id}/rejeitar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ motivo })
      })

      if (res.ok) {
        alert('Inspecao rejeitada')
        setInspecaoSelecionada(null)
        fetchInspecoesPendentes()
      }
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return <div style={{padding: 20}}>Carregando...</div>

  return (
    <div style={{padding: 20}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
        <div>
          <h1>Painel do Especialista</h1>
          <p style={{color: '#666', marginTop: 5}}>Analise de inspecoes pendentes</p>
        </div>
        <div style={{background: '#166534', color: 'white', padding: '12px 24px', borderRadius: 8}}>
          <strong>{inspecoes.length}</strong> pendente{inspecoes.length !== 1 ? 's' : ''}
        </div>
      </div>

      {inspecoes.length === 0 ? (
        <div style={{textAlign: 'center', padding: 60, background: '#f3f4f6', borderRadius: 12}}>
          <div style={{fontSize: 48}}>✅</div>
          <h3>Nenhuma inspecao pendente</h3>
          <p style={{color: '#666'}}>Todas as inspecoes foram analisadas!</p>
        </div>
      ) : (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16}}>
          {inspecoes.map(inspecao => (
            <div 
              key={inspecao.id}
              onClick={() => abrirAnalise(inspecao)}
              style={{
                background: 'white',
                padding: 16,
                borderRadius: 12,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                border: inspecaoSelecionada?.id === inspecao.id ? '2px solid #166534' : '2px solid transparent'
              }}
            >
              <div style={{display: 'flex', gap: 12}}>
                {inspecao.foto_preview && (
                  <img 
                    src={inspecao.foto_preview} 
                    alt="Preview"
                    style={{width: 80, height: 80, objectFit: 'cover', borderRadius: 8}}
                  />
                )}
                <div style={{flex: 1}}>
                  <div style={{fontWeight: 600, marginBottom: 4}}>Cultura: {inspecao.cultura}</div>
                  <div style={{fontSize: 14, color: '#666', marginBottom: 4}}>Talhao: {inspecao.talhao_nome}</div>
                  <div style={{fontSize: 14, color: '#666', marginBottom: 4}}>Fazenda: {inspecao.fazenda_nome}</div>
                  <div style={{fontSize: 12, color: '#999'}}>Operador: {inspecao.operador_nome}</div>
                  <div style={{fontSize: 12, color: '#999', marginTop: 4}}>
                    {new Date(inspecao.data_criacao).toLocaleString('pt-BR')}
                  </div>
                </div>
              </div>
              {inspecao.observacoes && (
                <div style={{marginTop: 12, padding: 8, background: '#f3f4f6', borderRadius: 4, fontSize: 13}}>
                  Obs: {inspecao.observacoes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {inspecaoSelecionada && detalhes && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            maxWidth: 900,
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: 24
          }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
              <h2>Analise da Inspecao #{inspecaoSelecionada.id.slice(-4)}</h2>
              <button 
                onClick={() => setInspecaoSelecionada(null)}
                style={{background: 'none', border: 'none', fontSize: 24, cursor: 'pointer'}}
              >
                X
              </button>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20}}>
              <div>
                <h3>Fotos</h3>
                <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
                  {detalhes.fotos?.map((foto: string, idx: number) => (
                    <img 
                      key={idx}
                      src={foto} 
                      alt={`Foto ${idx + 1}`}
                      style={{width: '100%', borderRadius: 8, cursor: 'pointer'}}
                      onClick={() => window.open(foto, '_blank')}
                    />
                  ))}
                </div>

                <div style={{marginTop: 20, padding: 16, background: '#f0fdf4', borderRadius: 8}}>
                  <strong>Informacoes:</strong>
                  <div style={{marginTop: 8, fontSize: 14}}>
                    <div>Cultura: {detalhes.cultura}</div>
                    <div>Fazenda: {detalhes.fazenda_nome}</div>
                    <div>Talhao: {detalhes.talhao_nome}</div>
                    <div>Operador: {detalhes.operador_nome}</div>
                    {detalhes.latitude && (
                      <div>GPS: {detalhes.latitude.toFixed(6)}, {detalhes.longitude?.toFixed(6)}</div>
                    )}
                    <div>Enviado: {new Date(detalhes.data_criacao).toLocaleString('pt-BR')}</div>
                  </div>
                </div>
              </div>

              <form onSubmit={submeterAnalise}>
                <h3>Laudo Tecnico</h3>
                
                <div style={{display: 'grid', gap: 12}}>
                  <div>
                    <label style={{display: 'block', marginBottom: 4, fontWeight: 600}}>Tipo do Problema *</label>
                    <input
                      type="text"
                      value={analise.tipo}
                      onChange={e => setAnalise(prev => ({ ...prev, tipo: e.target.value }))}
                      placeholder="Ex: Lagarta Helicoverpa armigera"
                      required
                      style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd'}}
                    />
                  </div>

                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
                    <div>
                      <label style={{display: 'block', marginBottom: 4, fontWeight: 600}}>Categoria *</label>
                      <select
                        value={analise.categoria}
                        onChange={e => setAnalise(prev => ({ ...prev, categoria: e.target.value as any }))}
                        style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd'}}
                      >
                        <option value="praga">Praga</option>
                        <option value="doenca">Doenca</option>
                        <option value="deficiencia">Deficiencia</option>
                        <option value="outro">Outro</option>
                        <option value="saudavel">Saudavel</option>
                      </select>
                    </div>

                    <div>
                      <label style={{display: 'block', marginBottom: 4, fontWeight: 600}}>Severidade *</label>
                      <select
                        value={analise.severidade}
                        onChange={e => setAnalise(prev => ({ ...prev, severidade: e.target.value as any }))}
                        style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd'}}
                      >
                        <option value="baixa">Baixa</option>
                        <option value="media">Media</option>
                        <option value="alta">Alta</option>
                        <option value="critica">Critica</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{display: 'block', marginBottom: 4, fontWeight: 600}}>Descricao do Diagnostico *</label>
                    <textarea
                      value={analise.descricao}
                      onChange={e => setAnalise(prev => ({ ...prev, descricao: e.target.value }))}
                      placeholder="Descreva o que foi observado na imagem..."
                      rows={3}
                      required
                      style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd', resize: 'vertical'}}
                    />
                  </div>

                  <div>
                    <label style={{display: 'block', marginBottom: 4, fontWeight: 600}}>Recomendacao Tecnica</label>
                    <textarea
                      value={analise.recomendacao}
                      onChange={e => setAnalise(prev => ({ ...prev, recomendacao: e.target.value }))}
                      placeholder="Produtos, dosagens, prazo de aplicacao..."
                      rows={2}
                      style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd', resize: 'vertical'}}
                    />
                  </div>

                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
                    <div>
                      <label style={{display: 'block', marginBottom: 4, fontWeight: 600}}>Sintomas (virgula)</label>
                      <input
                        type="text"
                        value={analise.sintomas}
                        onChange={e => setAnalise(prev => ({ ...prev, sintomas: e.target.value }))}
                        placeholder="Folhas com orificios, excrementos..."
                        style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd'}}
                      />
                    </div>

                    <div>
                      <label style={{display: 'block', marginBottom: 4, fontWeight: 600}}>Estagio</label>
                      <input
                        type="text"
                        value={analise.estagio}
                        onChange={e => setAnalise(prev => ({ ...prev, estagio: e.target.value }))}
                        placeholder="Inicial, Moderado, Avancado"
                        style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd'}}
                      />
                    </div>
                  </div>

                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
                    <div>
                      <label style={{display: 'block', marginBottom: 4, fontWeight: 600}}>Danos Estimados</label>
                      <input
                        type="text"
                        value={analise.danos}
                        onChange={e => setAnalise(prev => ({ ...prev, danos: e.target.value }))}
                        placeholder="Reducao de 15-25% na produtividade"
                        style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd'}}
                      />
                    </div>

                    <div>
                      <label style={{display: 'block', marginBottom: 4, fontWeight: 600}}>Prazo de Acao</label>
                      <select
                        value={analise.prazoAcao}
                        onChange={e => setAnalise(prev => ({ ...prev, prazoAcao: e.target.value }))}
                        style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd'}}
                      >
                        <option value="Imediato">Imediato</option>
                        <option value="24h">24 horas</option>
                        <option value="48h">48 horas</option>
                        <option value="7 dias">7 dias</option>
                        <option value="Monitorar">Monitorar</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{display: 'block', marginBottom: 4, fontWeight: 600}}>Produtos Sugeridos (virgula)</label>
                    <input
                      type="text"
                      value={analise.produtosSugeridos}
                      onChange={e => setAnalise(prev => ({ ...prev, produtosSugeridos: e.target.value }))}
                      placeholder="Clorantraniliprole, Bacillus thuringiensis..."
                      style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd'}}
                    />
                  </div>

                  <div>
                    <label style={{display: 'block', marginBottom: 4, fontWeight: 600}}>Observacoes do Especialista</label>
                    <textarea
                      value={analise.observacoesEspecialista}
                      onChange={e => setAnalise(prev => ({ ...prev, observacoesEspecialista: e.target.value }))}
                      placeholder="Informacoes adicionais, duvidas, contexto..."
                      rows={2}
                      style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd', resize: 'vertical'}}
                    />
                  </div>

                  <div style={{display: 'flex', gap: 12, marginTop: 20}}>
                    <button
                      type="submit"
                      style={{
                        flex: 1,
                        padding: 14,
                        background: '#166534',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 16,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Submeter Analise
                    </button>
                    
                    <button
                      type="button"
                      onClick={rejeitarInspecao}
                      style={{
                        padding: 14,
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 16,
                        cursor: 'pointer'
                      }}
                    >
                      Rejeitar
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}