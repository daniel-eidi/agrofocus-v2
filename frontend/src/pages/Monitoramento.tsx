import { useState } from 'react'

export default function Monitoramento() {
  const [talhaoId, setTalhaoId] = useState('')
  const [indice, setIndice] = useState('ndvi')
  const [resultado, setResultado] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const consultar = async () => {
    if (!talhaoId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/${indice}/${talhaoId}`)
      const data = await res.json()
      setResultado(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{padding: 20}}>
      <h1>🛰️ Monitoramento NDVI</h1>

      <div style={{background: 'white', padding: 20, borderRadius: 8, marginBottom: 20}}>
        <div style={{display: 'flex', gap: 10, marginBottom: 15}}>
          <select 
            value={indice} 
            onChange={e => setIndice(e.target.value)}
            style={{padding: 10, borderRadius: 5, border: '1px solid #ccc'}}
          >
            <option value="ndvi">NDVI</option>
            <option value="ndre">NDRE</option>
            <option value="msavi">MSAVI</option>
          </select>

          <input 
            placeholder="ID do Talhão" 
            value={talhaoId} 
            onChange={e => setTalhaoId(e.target.value)}
            style={{padding: 10, borderRadius: 5, border: '1px solid #ccc', flex: 1}}
          />

          <button 
            onClick={consultar}
            disabled={loading || !talhaoId}
            style={{padding: '10px 20px', background: '#166534', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer'}}
          >
            {loading ? 'Consultando...' : 'Consultar'}
          </button>
        </div>
      </div>

      {resultado && (
        <div style={{background: 'white', padding: 20, borderRadius: 8}}>
          <h3>Resultado {indice.toUpperCase()}</h3>
          <pre style={{background: '#f3f4f6', padding: 15, borderRadius: 5, overflow: 'auto'}}>{JSON.stringify(resultado, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
