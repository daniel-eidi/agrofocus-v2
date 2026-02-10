import { Routes, Route, Link, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { FarmProvider, useFarmContext } from './context/FarmContext'

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

// Filtros Globais no Header
function GlobalFilters() {
  const { fazendas, safras, selectedFazendaId, selectedSafraId, setSelectedFazendaId, setSelectedSafraId } = useFarmContext()
  
  const selectStyle = {
    padding: '6px 10px',
    borderRadius: 4,
    border: 'none',
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    fontSize: 13,
    cursor: 'pointer',
    maxWidth: 150
  }
  
  return (
    <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
      <select 
        value={selectedFazendaId} 
        onChange={e => setSelectedFazendaId(e.target.value)}
        style={selectStyle}
      >
        <option value="" style={{color: '#333'}}>🚜 Todas Fazendas</option>
        {fazendas.map(f => (
          <option key={f.id} value={f.id} style={{color: '#333'}}>{f.nome}</option>
        ))}
      </select>
      
      <select 
        value={selectedSafraId} 
        onChange={e => setSelectedSafraId(e.target.value)}
        style={selectStyle}
      >
        <option value="" style={{color: '#333'}}>🌾 Todas Safras</option>
        {safras.map(s => (
          <option key={s.id} value={s.id} style={{color: '#333'}}>{s.nome}</option>
        ))}
      </select>
    </div>
  )
}

// Layout com navegação
function LayoutAutenticado({ children }: { children?: React.ReactNode }) {
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
        padding: '10px 20px', 
        position: 'sticky', 
        top: 0, 
        zIndex: 100
      }}>
        {/* Linha superior: Logo + Filtros + Usuário */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
            <Link to="/" style={{color: 'white', textDecoration: 'none', fontSize: 20, fontWeight: 'bold'}}>
              🌱 AgroFocus
            </Link>
            <Link to="/" style={{
              color: 'white', 
              textDecoration: 'none', 
              fontSize: 14,
              background: 'rgba(255,255,255,0.1)',
              padding: '5px 10px',
              borderRadius: 4
            }}>
              🏠 Início
            </Link>
          </div>
          
          {/* Filtros Globais (centro) */}
          <GlobalFilters />
          
          {/* Usuário (direita) */}
          {usuario && (
            <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
              <span style={{fontSize: 13}}>👤 {usuario.nome}</span>
              <button 
                onClick={logout}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.5)',
                  color: 'white',
                  padding: '5px 10px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 13
                }}
              >
                Sair
              </button>
            </div>
          )}
        </div>
      </nav>
      
      <div style={{padding: 20}}>
        {children || <Dashboard />}
      </div>
    </div>
  )
}

// Dashboard com menu
const Dashboard = () => (
  <div>
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

function AppContent() {
  return (
    <FarmProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        
        <Route path="/" element={
          <RotaProtegida>
            <LayoutAutenticado />
          </RotaProtegida>
        } />
        
        <Route path="/minhas-fazendas" element={
          <RotaProtegida>
            <LayoutAutenticado>
              <MinhasFazendas />
            </LayoutAutenticado>
          </RotaProtegida>
        } />
        
        <Route path="/fazendas" element={
          <RotaProtegida>
            <LayoutAutenticado>
              <Fazendas />
            </LayoutAutenticado>
          </RotaProtegida>
        } />
        
        <Route path="/safras" element={
          <RotaProtegida>
            <LayoutAutenticado>
              <Safras />
            </LayoutAutenticado>
          </RotaProtegida>
        } />
        
        <Route path="/talhoes" element={
          <RotaProtegida>
            <LayoutAutenticado>
              <Talhoes />
            </LayoutAutenticado>
          </RotaProtegida>
        } />
        
        <Route path="/operadores" element={
          <RotaProtegida>
            <LayoutAutenticado>
              <Operadores />
            </LayoutAutenticado>
          </RotaProtegida>
        } />
        
        <Route path="/equipamentos" element={
          <RotaProtegida>
            <LayoutAutenticado>
              <Equipamentos />
            </LayoutAutenticado>
          </RotaProtegida>
        } />
        
        <Route path="/monitoramento" element={
          <RotaProtegida>
            <LayoutAutenticado>
              <Monitoramento />
            </LayoutAutenticado>
          </RotaProtegida>
        } />
        
        <Route path="/atividades" element={
          <RotaProtegida>
            <LayoutAutenticado>
              <Atividades />
            </LayoutAutenticado>
          </RotaProtegida>
        } />
        
        <Route path="/ocorrencias" element={
          <RotaProtegida>
            <LayoutAutenticado>
              <Ocorrencias />
            </LayoutAutenticado>
          </RotaProtegida>
        } />
        
        <Route path="/inspecao" element={
          <RotaProtegida>
            <LayoutAutenticado>
              <InspecaoCampo />
            </LayoutAutenticado>
          </RotaProtegida>
        } />
        
        <Route path="/especialista" element={
          <RotaProtegida>
            <LayoutAutenticado>
              <PainelEspecialista />
            </LayoutAutenticado>
          </RotaProtegida>
        } />
        
        <Route path="/rastreamento" element={
          <RotaProtegida>
            <LayoutAutenticado>
              <RastreamentoOperacoes />
            </LayoutAutenticado>
          </RotaProtegida>
        } />
        
        <Route path="/estoque" element={
          <RotaProtegida>
            <LayoutAutenticado>
              <Estoque />
            </LayoutAutenticado>
          </RotaProtegida>
        } />
        
        <Route path="/financeiro" element={
          <RotaProtegida>
            <LayoutAutenticado>
              <Financeiro />
            </LayoutAutenticado>
          </RotaProtegida>
        } />
        
        <Route path="/meteorologia" element={
          <RotaProtegida>
            <LayoutAutenticado>
              <Meteorologia />
            </LayoutAutenticado>
          </RotaProtegida>
        } />
        
        <Route path="/produtividade" element={
          <RotaProtegida>
            <LayoutAutenticado>
              <Produtividade />
            </LayoutAutenticado>
          </RotaProtegida>
        } />
        
        <Route path="/delineamento" element={
          <RotaProtegida>
            <LayoutAutenticado>
              <Delineamento />
            </LayoutAutenticado>
          </RotaProtegida>
        } />
      </Routes>
    </FarmProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
