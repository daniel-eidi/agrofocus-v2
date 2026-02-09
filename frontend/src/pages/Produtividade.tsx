import { useState } from 'react'

export default function Produtividade() {
  const [talhaoId, setTalhaoId] = useState('')
  const [resultado, setResultado] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const estimar = async () => {
    if (!talhaoId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/produtividade/estimar/${talhaoId}`)
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
      <h1>🤖 Produtividade ML</h1>

      <p style={{color: '#666', marginBottom: 20}}>Estimativa de produtividade usando Machine Learning (NDVI + GDD + Precipitação)</p>

      <div style={{background: 'white', padding: 20, borderRadius: 8, marginBottom: 20}}>
        <div style={{display: 'flex', gap: 10}}>
          <input 
            placeholder="ID do Talhão" 
            value={talhaoId} 
            onChange={e => setTalhaoId(e.target.value)}
            style={{padding: 10, borderRadius: 5, border: '1px solid #ccc', flex: 1}}
          />

          <button 
            onClick={estimar}
            disabled={loading || !talhaoId}
            style={{padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer'}}
          >
            {loading ? 'Estimando...' : 'Estimar Produtividade'}
          </button>
        </div>
      </div>

      {resultado && (
        <div style={{background: 'white', padding: 20, borderRadius: 8}}>
          <h3>Resultado da Estimativa</h3>
          
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 15, marginTop: 15}}>
            <div style={{background: '#dbeafe', padding: 20, borderRadius: 8, textAlign: 'center'}}>
              <p style={{color: '#666', margin: 0}}>Produtividade Estimada</p>
              <p style={{fontSize: 36, fontWeight: 'bold', color: '#1e40af', margin: '10px 0'}}>{resultado.produtividade_estimada?.toFixed(2)}</p>
              <p style={{color: '#666', margin: 0}}>ton/ha</p>
            </div>
            
            <div style={{background: '#f3e8ff', padding: 20, borderRadius: 8, textAlign: 'center'}}>
              <p style={{color: '#666', margin: 0}}>Confiança</p>
              <p style={{fontSize: 36, fontWeight: 'bold', color: '#7c3aed', margin: '10px 0'}}>{(resultado.confidence * 100)?.toFixed(0)}%</p>
            </div>
            
            <div style={{background: '#fef3c7', padding: 20, borderRadius: 8, textAlign: 'center'}}>
              <p style={{color: '#666', margin: 0}}>Método</p>
              <p style={{fontSize: 24, fontWeight: 'bold', color: '#92400e', margin: '10px 0'}}>{resultado.metodo}</p>
            </div>
          </div>
          
          <div style={{marginTop: 20, padding: 15, background: '#f3f4f6', borderRadius: 8}}>
            <h4>Variáveis Utilizadas</h4>
            <pre style={{margin: 0, overflow: 'auto'}}>{JSON.stringify(resultado.variaveis, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
