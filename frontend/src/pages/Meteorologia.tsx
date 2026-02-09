import { useState } from 'react'

export default function Meteorologia() {
  const [talhaoId, setTalhaoId] = useState('')
  const [cultura, setCultura] = useState('soja')
  const [resultado, setResultado] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const culturas = ['soja', 'milho', 'trigo', 'algodao', 'cafe', 'cana', 'arroz', 'feijao']

  const consultarGDD = async () => {
    if (!talhaoId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/meteorologia/gdd/${talhaoId}?cultura=${cultura}`)
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
      <h1>🌡️ Meteorologia - GDD</h1>

      <div style={{background: 'white', padding: 20, borderRadius: 8, marginBottom: 20}}>
        <div style={{display: 'flex', gap: 10, marginBottom: 15}}>
          <select 
            value={cultura} 
            onChange={e => setCultura(e.target.value)}
            style={{padding: 10, borderRadius: 5, border: '1px solid #ccc'}}
          >
            {culturas.map(c => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>

          <input 
            placeholder="ID do Talhão" 
            value={talhaoId} 
            onChange={e => setTalhaoId(e.target.value)}
            style={{padding: 10, borderRadius: 5, border: '1px solid #ccc', flex: 1}}
          />

          <button 
            onClick={consultarGDD}
            disabled={loading || !talhaoId}
            style={{padding: '10px 20px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer'}}
          >
            {loading ? 'Consultando...' : 'Consultar GDD'}
          </button>
        </div>
      </div>

      {resultado && (
        <div style={{background: 'white', padding: 20, borderRadius: 8}}>
          <h3>Resultado GDD - {cultura.charAt(0).toUpperCase() + cultura.slice(1)}</h3>
          
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 15, marginTop: 15}}>
            <div style={{background: '#dbeafe', padding: 15, borderRadius: 8}}>
              <p style={{color: '#666', margin: 0}}>GDD Acumulado</p>
              <p style={{fontSize: 24, fontWeight: 'bold', color: '#1e40af', margin: '5px 0'}}>{resultado.gdd_acumulado?.toFixed(1)}°C</p>
            </div>
            
            <div style={{background: '#dcfce7', padding: 15, borderRadius: 8}}>
              <p style={{color: '#666', margin: 0}}>Dias Acumulados</p>
              <p style={{fontSize: 24, fontWeight: 'bold', color: '#166534', margin: '5px 0'}}>{resultado.dias_acumulados}</p>
            </div>
            
            <div style={{background: '#fef3c7', padding: 15, borderRadius: 8}}>
              <p style={{color: '#666', margin: 0}}>Estádio Atual</p>
              <p style={{fontSize: 18, fontWeight: 'bold', color: '#92400e', margin: '5px 0'}}>{resultado.estadio_atual}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
