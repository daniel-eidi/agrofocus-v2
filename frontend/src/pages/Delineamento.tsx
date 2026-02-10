import { useState, useEffect } from 'react'
import { apiGet, apiPost, ensureArray } from '../utils/api'

interface Talhao {
  id: string
  nome: string
  area_hectares: number
}

interface ZonaManejo {
  id: string
  nome: string
  talhao_id: string
  area_hectares: number
  tipo: string
}

export default function Delineamento() {
  const [talhoes, setTalhoes] = useState<Talhao[]>([])
  const [zonas, setZonas] = useState<ZonaManejo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTalhao, setSelectedTalhao] = useState<string>('')

  useEffect(() => {
    fetchTalhoes()
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

  const handleAutoDelineamento = async () => {
    if (!selectedTalhao) {
      alert('Selecione um talhão primeiro')
      return
    }
    
    try {
      const result = await apiPost('/api/delineamento/auto', { talhao_id: selectedTalhao })
      if (result.zonas) {
        setZonas(result.zonas)
        alert(`${result.zonas.length} zonas de manejo identificadas!`)
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao processar delineamento automático')
    }
  }

  if (loading) return <div style={{padding: 20}}>Carregando...</div>

  return (
    <div style={{padding: 20}}>
      <h1>📐 Delineamento de Zonas de Manejo</h1>

      <div style={{background: 'white', padding: 20, borderRadius: 8, marginBottom: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
        <h3>Delineamento Automático</h3>
        <p style={{color: '#666', marginBottom: 15}}>
          Utilize algoritmos de Machine Learning para identificar zonas de manejo automaticamente 
          baseado em dados de NDVI, topografia e histórico de produtividade.
        </p>
        
        <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
          <select 
            value={selectedTalhao}
            onChange={e => setSelectedTalhao(e.target.value)}
            style={{padding: 10, borderRadius: 5, border: '1px solid #ccc', flex: 1}}
          >
            <option value="">Selecione um talhão...</option>
            {talhoes.map(t => (
              <option key={t.id} value={t.id}>{t.nome} ({(Number(t.area_hectares) || 0).toFixed(2)} ha)</option>
            ))}
          </select>
          
          <button 
            onClick={handleAutoDelineamento}
            style={{padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer'}}
          >
            🤖 Processar
          </button>
        </div>
      </div>

      {zonas.length > 0 && (
        <div style={{display: 'grid', gap: 15}}>
          <h3>Zonas Identificadas</h3>
          {zonas.map(z => (
            <div key={z.id} style={{background: 'white', padding: 15, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
              <h4>{z.nome}</h4>
              <p style={{color: '#666', margin: '5px 0'}}>📏 Área: {(Number(z.area_hectares) || 0).toFixed(2)} ha</p>
              <p style={{color: '#666', margin: '5px 0'}}>🏷️ Tipo: {z.tipo}</p>
            </div>
          ))}
        </div>
      )}

      {talhoes.length === 0 && !loading && (
        <p style={{color: '#666', fontStyle: 'italic'}}>Cadastre talhões primeiro para usar o delineamento automático.</p>
      )}
    </div>
  )
}
