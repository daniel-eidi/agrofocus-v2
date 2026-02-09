import { useState } from 'react'

export default function Delineamento() {
  const [talhaoId, setTalhaoId] = useState('')
  const [algoritmo, setAlgoritmo] = useState('watershed')
  const [resultado, setResultado] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const algoritmos = [
    { id: 'watershed', nome: 'Watershed' },
    { id: 'edge', nome: 'Edge Detection' },
    { id: 'sam', nome: 'SAM (Segment Anything)' }
  ]

  const delineamento = async () => {
    if (!talhaoId) return
    setLoading(true)
    try {
      const res = await fetch('/api/talhoes/delinear-auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ talhao_id: talhaoId, algoritmo })
      })
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
      <h1>📐 Delineamento Automático</h1>

      <p style={{color: '#666', marginBottom: 20}}>Delineamento de zonas de manejo usando algoritmos de visão computacional (IoU ≥ 0.75)</p>

      <div style={{background: 'white', padding: 20, borderRadius: 8, marginBottom: 20}}>
        <div style={{display: 'flex', gap: 10, marginBottom: 15}}>
          <select 
            value={algoritmo} 
            onChange={e => setAlgoritmo(e.target.value)}
            style={{padding: 10, borderRadius: 5, border: '1px solid #ccc'}}
          >
            {algoritmos.map(a => (
              <option key={a.id} value={a.id}>{a.nome}</option>
            ))}
          </select>

          <input 
            placeholder="ID do Talhão" 
            value={talhaoId} 
            onChange={e => setTalhaoId(e.target.value)}
            style={{padding: 10, borderRadius: 5, border: '1px solid #ccc', flex: 1}}
          />

          <button 
            onClick={delineamento}
            disabled={loading || !talhaoId}
            style={{padding: '10px 20px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer'}}
          >
            {loading ? 'Processando...' : 'Delinear'}
          </button>
        </div>
      </div>

      {resultado && (
        <div style={{background: 'white', padding: 20, borderRadius: 8}}>
          <h3>Resultado do Delineamento</h3>
          
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 15, marginTop: 15}}>
            <div style={{background: '#dbeafe', padding: 15, borderRadius: 8, textAlign: 'center'}}>
              <p style={{color: '#666', margin: 0}}>Zonas Identificadas</p>
              <p style={{fontSize: 32, fontWeight: 'bold', color: '#1e40af', margin: '5px 0'}}>{resultado.zonas?.length || 0}</p>
            </div>
            
            <div style={{background: '#dcfce7', padding: 15, borderRadius: 8, textAlign: 'center'}}>
              <p style={{color: '#666', margin: 0}}>IoU Médio</p>
              <p style={{fontSize: 32, fontWeight: 'bold', color: '#166534', margin: '5px 0'}}>{(resultado.iou_medio * 100)?.toFixed(1)}%</p>
            </div>
            
            <div style={{background: '#f3e8ff', padding: 15, borderRadius: 8, textAlign: 'center'}}>
              <p style={{color: '#666', margin: 0}}>Tempo de Processamento</p>
              <p style={{fontSize: 24, fontWeight: 'bold', color: '#7c3aed', margin: '5px 0'}}>{resultado.tempo_ms}ms</p>
            </div>
          </div>
          
          {resultado.zonas && resultado.zonas.length > 0 && (
            <div style={{marginTop: 20}}>
              <h4>Zonas de Manejo</h4>
              <div style={{display: 'grid', gap: 10, marginTop: 10}}>
                {resultado.zonas.map((zona: any, idx: number) => (
                  <div key={idx} style={{padding: 10, background: '#f3f4f6', borderRadius: 5}}>
                    <strong>Zona {idx + 1}: {zona.classificacao}</strong>
                    <p style={{margin: '5px 0', color: '#666'}}>Área: {zona.area_hectares?.toFixed(2)} ha | Produtividade Est.: {zona.produtividade_estimada?.toFixed(2)} t/ha</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
