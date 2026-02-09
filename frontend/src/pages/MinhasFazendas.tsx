import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

interface Fazenda {
  id: string
  nome: string
  municipio: string
  estado: string
  area_total: number
  car: string
  minha_permissao: string
  compartilhada: boolean
}

export default function MinhasFazendas() {
  const [fazendas, setFazendas] = useState<Fazenda[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showCompartilhar, setShowCompartilhar] = useState<string | null>(null)
  const [compartilhamentos, setCompartilhamentos] = useState<any[]>([])
  const [buscaEmail, setBuscaEmail] = useState('')
  const [usuariosEncontrados, setUsuariosEncontrados] = useState<any[]>([])
  const [permissaoSelecionada, setPermissaoSelecionada] = useState('operador')
  const { token } = useAuth()

  const [novaFazenda, setNovaFazenda] = useState({
    nome: '',
    municipio: '',
    estado: '',
    area_total: '',
    car: ''
  })

  useEffect(() => {
    fetchFazendas()
  }, [])

  const fetchFazendas = async () => {
    try {
      const res = await fetch('/api/fazendas', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setFazendas(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCompartilhamentos = async (fazendaId: string) => {
    try {
      const res = await fetch(`/api/auth/fazendas/${fazendaId}/compartilhamentos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.sucesso) {
        setCompartilhamentos(data.compartilhamentos)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const buscarUsuarios = async () => {
    if (buscaEmail.length < 3) return
    try {
      const res = await fetch(`/api/auth/usuarios/buscar?email=${buscaEmail}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.sucesso) {
        setUsuariosEncontrados(data.usuarios)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const compartilharFazenda = async (fazendaId: string, usuarioId: string) => {
    try {
      const res = await fetch(`/api/auth/fazendas/${fazendaId}/compartilhar`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          email_usuario: usuariosEncontrados.find(u => u.id === usuarioId)?.email,
          permissao: permissaoSelecionada 
        })
      })
      const data = await res.json()
      if (data.sucesso) {
        fetchCompartilhamentos(fazendaId)
        setBuscaEmail('')
        setUsuariosEncontrados([])
      }
    } catch (err) {
      console.error(err)
    }
  }

  const removerCompartilhamento = async (fazendaId: string, usuarioId: string) => {
    try {
      const res = await fetch(`/api/auth/fazendas/${fazendaId}/compartilhar/${usuarioId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.sucesso) {
        fetchCompartilhamentos(fazendaId)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const criarFazenda = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/fazendas', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...novaFazenda,
          area_total: parseFloat(novaFazenda.area_total) || 0
        })
      })
      if (res.ok) {
        setNovaFazenda({ nome: '', municipio: '', estado: '', area_total: '', car: '' })
        setShowForm(false)
        fetchFazendas()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const getPermissaoColor = (permissao: string) => {
    switch(permissao) {
      case 'dono': return '#166534'
      case 'gerente': return '#3b82f6'
      case 'operador': return '#f59e0b'
      case 'visualizador': return '#6b7280'
      default: return '#6b7280'
    }
  }

  const podeGerenciar = (fazenda: Fazenda) => {
    return fazenda.minha_permissao === 'dono' || fazenda.minha_permissao === 'gerente'
  }

  if (loading) return <div style={{padding: 20}}>Carregando...</div>

  return (
    <div style={{padding: 20}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
        <h1>🚜 Minhas Fazendas</h1>
        <button 
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '10px 20px',
            background: '#166534',
            color: 'white',
            border: 'none',
            borderRadius: 5,
            cursor: 'pointer'
          }}
        >
          {showForm ? 'Cancelar' : '➕ Nova Fazenda'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={criarFazenda} style={{background: 'white', padding: 20, borderRadius: 8, marginBottom: 20}}>
          <h3>Nova Fazenda</h3>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 15, marginTop: 15}}>
            <input 
              placeholder="Nome da Fazenda *" 
              value={novaFazenda.nome}
              onChange={e => setNovaFazenda({...novaFazenda, nome: e.target.value})}
              required
              style={{padding: 10, borderRadius: 5, border: '1px solid #ccc'}}
            />
            <input 
              placeholder="Município" 
              value={novaFazenda.municipio}
              onChange={e => setNovaFazenda({...novaFazenda, municipio: e.target.value})}
              style={{padding: 10, borderRadius: 5, border: '1px solid #ccc'}}
            />
            <input 
              placeholder="Estado (UF)" 
              value={novaFazenda.estado}
              onChange={e => setNovaFazenda({...novaFazenda, estado: e.target.value})}
              style={{padding: 10, borderRadius: 5, border: '1px solid #ccc'}}
            />
            <input 
              placeholder="Área Total (ha)" 
              type="number"
              value={novaFazenda.area_total}
              onChange={e => setNovaFazenda({...novaFazenda, area_total: e.target.value})}
              style={{padding: 10, borderRadius: 5, border: '1px solid #ccc'}}
            />
            <input 
              placeholder="CAR" 
              value={novaFazenda.car}
              onChange={e => setNovaFazenda({...novaFazenda, car: e.target.value})}
              style={{padding: 10, borderRadius: 5, border: '1px solid #ccc'}}
            />
          </div>
          <button type="submit" style={{marginTop: 15, padding: '10px 20px', background: '#166534', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer'}}>
            Criar Fazenda
          </button>
        </form>
      )}

      <div style={{display: 'grid', gap: 15}}>
        {fazendas.map(fazenda => (
          <div key={fazenda.id} style={{background: 'white', padding: 20, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
              <div>
                <h3 style={{margin: 0}}>
                  {fazenda.nome}
                  {fazenda.compartilhada && <span style={{fontSize: 12, color: '#666', marginLeft: 10}}>(compartilhada)</span>}
                </h3>
                <p style={{color: '#666', margin: '5px 0'}}>📍 {fazenda.municipio} - {fazenda.estado}</p>
                <p style={{color: '#666', margin: '5px 0'}}>📏 Área: {fazenda.area_total} ha | 📋 CAR: {fazenda.car}</p>
                <span style={{
                  background: getPermissaoColor(fazenda.minha_permissao),
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  textTransform: 'uppercase'
                }}>
                  {fazenda.minha_permissao}
                </span>
              </div>
              
              {podeGerenciar(fazenda) && (
                <button
                  onClick={() => {
                    setShowCompartilhar(showCompartilhar === fazenda.id ? null : fazenda.id)
                    if (showCompartilhar !== fazenda.id) {
                      fetchCompartilhamentos(fazenda.id)
                    }
                  }}
                  style={{
                    padding: '8px 16px',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: 5,
                    cursor: 'pointer',
                    fontSize: 14
                  }}
                >
                  👥 Compartilhar
                </button>
              )}
            </div>

            {showCompartilhar === fazenda.id && (
              <div style={{marginTop: 20, padding: 15, background: '#f3f4f6', borderRadius: 8}}>
                <h4>Compartilhar Fazenda</h4>
                
                <div style={{display: 'flex', gap: 10, marginBottom: 15}}>
                  <input
                    placeholder="Buscar por email..."
                    value={buscaEmail}
                    onChange={e => setBuscaEmail(e.target.value)}
                    style={{flex: 1, padding: 10, borderRadius: 5, border: '1px solid #ccc'}}
                  />
                  <select
                    value={permissaoSelecionada}
                    onChange={e => setPermissaoSelecionada(e.target.value)}
                    style={{padding: 10, borderRadius: 5, border: '1px solid #ccc'}}
                  >
                    <option value="gerente">Gerente</option>
                    <option value="operador">Operador</option>
                    <option value="visualizador">Visualizador</option>
                  </select>
                  
                  <button
                    onClick={buscarUsuarios}
                    style={{padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer'}}
                  >
                    Buscar
                  </button>
                </div>

                {usuariosEncontrados.length > 0 && (
                  <div style={{marginBottom: 15}}>
                    {usuariosEncontrados.map(u => (
                      <div key={u.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, background: 'white', borderRadius: 5, marginBottom: 5}}>
                        <span>{u.nome} ({u.email})</span>
                        <button
                          onClick={() => compartilharFazenda(fazenda.id, u.id)}
                          style={{padding: '5px 15px', background: '#166534', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12}}
                        >
                          Adicionar
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <h5>Pessoas com Acesso:</h5>
                {compartilhamentos.length === 0 ? (
                  <p style={{color: '#666'}}>Apenas você tem acesso</p>
                ) : (
                  <div>
                    {compartilhamentos.map(c => (
                      <div key={c.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, background: 'white', borderRadius: 5, marginBottom: 5}}>
                        <div>
                          <strong>{c.usuario?.nome}</strong>
                          <span style={{color: '#666', marginLeft: 10}}>{c.usuario?.email}</span>
                          <span style={{
                            background: getPermissaoColor(c.permissao),
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: 10,
                            fontSize: 11,
                            marginLeft: 10
                          }}>
                            {c.permissao}
                          </span>
                        </div>
                        <button
                          onClick={() => removerCompartilhamento(fazenda.id, c.usuario?.id)}
                          style={{padding: '5px 15px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12}}
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}