import { Routes, Route, Link, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

// Páginas públicas
import Login from './pages/Login'
import Registro from './pages/Registro'

// Páginas protegidas
import MinhasFazendas from './pages/MinhasFazendas'
import Fazendas from './pages/cadastros/Fazendas'
import Safras from './pages/cadastros/Safras'
import Talhoes from './pages/cadastros/Talhoes'
import Operadores from './pages/cadastros/Operadores'
import Equipamentos from './pages/cadastros/Equipamentos'
import Monitoramento from './pages/Monitoramento'
import Atividades from './pages/Atividades'
import Ocorrencias from './pages/Ocorrencias'
import InspecaoCampo from './pages/InspecaoCampo'
import PainelEspecialista from './pages/PainelEspecialista'
import RastreamentoOperacoes from './pages/RastreamentoOperacoes'
import Estoque from './pages/Estoque'
import Financeiro from './pages/Financeiro'
import Meteorologia from './pages/Meteorologia'
import Produtividade from './pages/Produtividade'
import Delineamento from './pages/Delineamento'

// Componente para proteger rotas
function RotaProtegida({ children }: { children: React.ReactNode }) {
  const { usuario, loading } = useAuth()
  
  if (loading) {
    return <div style={{padding: 20}}>Carregando...</div>
  }
  
  if (!usuario) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

// Layout com navegação
function LayoutAutenticado() {
  const { usuario, logout } = useAuth()
  
  return (
    <div style={{
      fontFamily: 'system-ui, sans-serif', 
      minHeight: '100vh', 
      background: '#f3f4f6'
    }}>
      <nav style={{
        background: '#166534', 
        color: 'white', 
        padding: '15px 20px', 
        position: 'sticky', 
        top: 0, 
        zIndex: 100,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/" style={{color: 'white', textDecoration: 'none', fontSize: 24, fontWeight: 'bold'}}>
            🌱 AgroFocus
          </Link>
        </div>
        
        {usuario && (
          <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
            <span style={{fontSize: 14}}>👤 {usuario.nome}</span>
            <button 
              onClick={logout}
              style={{
                background: 'transparent',
                border: '1px solid white',
                color: 'white',
                padding: '6px 12px',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              Sair
            </button>
          </div>
        )}
      </nav>
      
      <RotaProtegida>
        <Dashboard />
      </RotaProtegida>
    </div>
  )
}

// Dashboard com menu
const Dashboard = () => (
  <div style={{padding: 20}}>
    <h1>🌱 Bem-vindo ao AgroFocus</h1>
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
      {[
        { path: '/minhas-fazendas', icon: '🏠', title: 'Minhas Fazendas', desc: 'Gerenciar fazendas' },
        { path: '/fazendas', icon: '🚜', title: 'Fazendas', desc: 'Cadastro' },
        { path: '/safras', icon: '🌾', title: 'Safras', desc: 'Gestão' },
        { path: '/talhoes', icon: '📐', title: 'Talhões', desc: 'Áreas' },
        { path: '/operadores', icon: '👷', title: 'Operadores', desc: 'Equipe' },
        { path: '/equipamentos', icon: '🚜', title: 'Equipamentos', desc: 'Frota' },
        { path: '/monitoramento', icon: '🛰️', title: 'Monitoramento', desc: 'NDVI' },
        { path: '/atividades', icon: '📅', title: 'Atividades', desc: 'Operações' },
        { path: '/ocorrencias', icon: '🔍', title: 'Ocorrências', desc: 'Pragas' },
        { path: '/inspecao', icon: '📸', title: 'Inspeção', desc: 'Fotos + IA' },
        { path: '/rastreamento', icon: '🛰️', title: 'Rastreamento', desc: 'GPS' },
        { path: '/estoque', icon: '📦', title: 'Estoque', desc: 'Insumos' },
        { path: '/financeiro', icon: '💰', title: 'Financeiro', desc: 'Despesas' },
        { path: '/meteorologia', icon: '🌡️', title: 'Meteorologia', desc: 'GDD' },
        { path: '/produtividade', icon: '🤖', title: 'Produtividade', desc: 'ML' },
        { path: '/delineamento', icon: '📐', title: 'Delineamento', desc: 'Zonas' },
      ].map(item => (
        <Link key={item.path} to={item.path} style={{textDecoration: 'none'}}>
          <div style={{
            background: 'white', 
            padding: 20, 
            borderRadius: 8, 
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}>
            <h3>{item.icon} {item.title}</h3>
            <p style={{color: '#666'}}>{item.desc}</p>
          </div>
        </Link>
      ))}
    </div>
  </div>
)

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/" element={<LayoutAutenticado />} />
        <Route path="/minhas-fazendas" element={<RotaProtegida><MinhasFazendas /></RotaProtegida>} />
        <Route path="/fazendas" element={<RotaProtegida><Fazendas /></RotaProtegida>} />
        <Route path="/safras" element={<RotaProtegida><Safras /></RotaProtegida>} />
        <Route path="/talhoes" element={<RotaProtegida><Talhoes /></RotaProtegida>} />
        <Route path="/operadores" element={<RotaProtegida><Operadores /></RotaProtegida>} />
        <Route path="/equipamentos" element={<RotaProtegida><Equipamentos /></RotaProtegida>} />
        <Route path="/monitoramento" element={<RotaProtegida><Monitoramento /></RotaProtegida>} />
        <Route path="/atividades" element={<RotaProtegida><Atividades /></RotaProtegida>} />
        <Route path="/ocorrencias" element={<RotaProtegida><Ocorrencias /></RotaProtegida>} />
        <Route path="/inspecao" element={<RotaProtegida><InspecaoCampo /></RotaProtegida>} />
        <Route path="/especialista" element={<RotaProtegida><PainelEspecialista /></RotaProtegida>} />
        <Route path="/rastreamento" element={<RotaProtegida><RastreamentoOperacoes /></RotaProtegida>} />
        <Route path="/estoque" element={<RotaProtegida><Estoque /></RotaProtegida>} />
        <Route path="/financeiro" element={<RotaProtegida><Financeiro /></RotaProtegida>} />
        <Route path="/meteorologia" element={<RotaProtegida><Meteorologia /></RotaProtegida>} />
        <Route path="/produtividade" element={<RotaProtegida><Produtividade /></RotaProtegida>} />
        <Route path="/delineamento" element={<RotaProtegida><Delineamento /></RotaProtegida>} />
      </Routes>
    </AuthProvider>
  )
}

export default App
