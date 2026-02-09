import { Routes, Route, Link } from 'react-router-dom'

// Páginas
import Fazendas from './pages/cadastros/Fazendas'
import Safras from './pages/cadastros/Safras'
import Talhoes from './pages/cadastros/Talhoes'
import Operadores from './pages/cadastros/Operadores'
import Equipamentos from './pages/cadastros/Equipamentos'
import Monitoramento from './pages/Monitoramento'
import Atividades from './pages/Atividades'
import Ocorrencias from './pages/Ocorrencias'
import Estoque from './pages/Estoque'
import Financeiro from './pages/Financeiro'
import Meteorologia from './pages/Meteorologia'
import Produtividade from './pages/Produtividade'
import Delineamento from './pages/Delineamento'

const Dashboard = () => (
  <div style={{padding: 20}}>
    <h1>🌱 AgroFocus</h1>
    <p>Sistema de Gestão Agrícola Inteligente</p>
    
    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginTop: 30}}>
      <div style={{background: '#166534', color: 'white', padding: 20, borderRadius: 8}}>
        <h3>NDVI Médio</h3>
        <p style={{fontSize: 32, margin: 0}}>0.53</p>
      </div>
      <div style={{background: '#3b82f6', color: 'white', padding: 20, borderRadius: 8}}>
        <h3>GDD</h3>
        <p style={{fontSize: 32, margin: 0}}>1,250°C</p>
      </div>
      <div style={{background: '#f59e0b', color: 'white', padding: 20, borderRadius: 8}}>
        <h3>Produtividade</h3>
        <p style={{fontSize: 32, margin: 0}}>8.7 t/ha</p>
      </div>
    </div>

    <h2 style={{marginTop: 40, marginBottom: 20}}>📦 Módulos</h2>
    
    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 15}}>
      <Link to="/fazendas" style={{textDecoration: 'none'}}>
        <div style={{background: 'white', padding: 20, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
          <h3>🚜 Fazendas</h3>
          <p style={{color: '#666'}}>Cadastro de fazendas e propriedades</p>
        </div>
      </Link>
      
      <Link to="/safras" style={{textDecoration: 'none'}}>
        <div style={{background: 'white', padding: 20, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
          <h3>🌾 Safras</h3>
          <p style={{color: '#666'}}>Gestão de safras e períodos</p>
        </div>
      </Link>
      
      <Link to="/talhoes" style={{textDecoration: 'none'}}>
        <div style={{background: 'white', padding: 20, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
          <h3>📐 Talhões</h3>
          <p style={{color: '#666'}}>Áreas de plantio e geometria</p>
        </div>
      </Link>
      
      <Link to="/operadores" style={{textDecoration: 'none'}}>
        <div style={{background: 'white', padding: 20, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
          <h3>👷 Operadores</h3>
          <p style={{color: '#666'}}>Equipe e funcionários</p>
        </div>
      </Link>
      
      <Link to="/equipamentos" style={{textDecoration: 'none'}}>
        <div style={{background: 'white', padding: 20, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
          <h3>🚜 Equipamentos</h3>
          <p style={{color: '#666'}}>Frota e máquinas</p>
        </div>
      </Link>
      
      <Link to="/monitoramento" style={{textDecoration: 'none'}}>
        <div style={{background: 'white', padding: 20, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
          <h3>🛰️ Monitoramento</h3>
          <p style={{color: '#666'}}>NDVI, NDRE, MSAVI</p>
        </div>
      </Link>
      
      <Link to="/atividades" style={{textDecoration: 'none'}}>
        <div style={{background: 'white', padding: 20, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
          <h3>📅 Atividades</h3>
          <p style={{color: '#666'}}>Operações de campo</p>
        </div>
      </Link>
      
      <Link to="/ocorrencias" style={{textDecoration: 'none'}}>
        <div style={{background: 'white', padding: 20, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
          <h3>🔍 Ocorrências</h3>
          <p style={{color: '#666'}}>Pragas e doenças</p>
        </div>
      </Link>
      
      <Link to="/estoque" style={{textDecoration: 'none'}}>
        <div style={{background: 'white', padding: 20, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
          <h3>📦 Estoque</h3>
          <p style={{color: '#666'}}>Insumos e produtos</p>
        </div>
      </Link>
      
      <Link to="/financeiro" style={{textDecoration: 'none'}}>
        <div style={{background: 'white', padding: 20, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
          <h3>💰 Financeiro</h3>
          <p style={{color: '#666'}}>Despesas e custos</p>
        </div>
      </Link>
      
      <Link to="/meteorologia" style={{textDecoration: 'none'}}>
        <div style={{background: 'white', padding: 20, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
          <h3>🌡️ Meteorologia</h3>
          <p style={{color: '#666'}}>GDD e previsão</p>
        </div>
      </Link>
      
      <Link to="/produtividade" style={{textDecoration: 'none'}}>
        <div style={{background: 'white', padding: 20, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
          <h3>🤖 Produtividade</h3>
          <p style={{color: '#666'}}>Estimativa ML</p>
        </div>
      </Link>
      
      <Link to="/delineamento" style={{textDecoration: 'none'}}>
        <div style={{background: 'white', padding: 20, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
          <h3>📐 Delineamento</h3>
          <p style={{color: '#666'}}>Zonas de manejo</p>
        </div>
      </Link>
    </div>
  </div>
)

function App() {
  return (
    <div style={{fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#f3f4f6'}}>
      <nav style={{background: '#166534', color: 'white', padding: '15px 20px', position: 'sticky', top: 0, zIndex: 100}}>
        <Link to="/" style={{color: 'white', textDecoration: 'none', fontSize: 24, fontWeight: 'bold'}}>
          🌱 AgroFocus
        </Link>
      </nav>
      
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/fazendas" element={<Fazendas />} />
        <Route path="/safras" element={<Safras />} />
        <Route path="/talhoes" element={<Talhoes />} />
        <Route path="/operadores" element={<Operadores />} />
        <Route path="/equipamentos" element={<Equipamentos />} />
        <Route path="/monitoramento" element={<Monitoramento />} />
        <Route path="/atividades" element={<Atividades />} />
        <Route path="/ocorrencias" element={<Ocorrencias />} />
        <Route path="/estoque" element={<Estoque />} />
        <Route path="/financeiro" element={<Financeiro />} />
        <Route path="/meteorologia" element={<Meteorologia />} />
        <Route path="/produtividade" element={<Produtividade />} />
        <Route path="/delineamento" element={<Delineamento />} />
      </Routes>
    </div>
  )
}

export default App