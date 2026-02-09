import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setLoading(true)

    const resultado = await login(email, senha)
    
    if (resultado.sucesso) {
      navigate('/')
    } else {
      setErro(resultado.erro || 'Erro ao fazer login')
    }
    
    setLoading(false)
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #166534 0%, #15803d 100%)',
      padding: '20px'
    }}>
      <div style={{ 
        background: 'white', 
        borderRadius: '12px', 
        padding: '40px', 
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>🌱</div>
          <h1 style={{ color: '#166534', margin: 0 }}>AgroFocus</h1>
          <p style={{ color: '#666', marginTop: '8px' }}>Entre na sua conta</p>
        </div>

        {erro && (
          <div style={{ 
            background: '#fee2e2', 
            color: '#dc2626', 
            padding: '12px', 
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#374151', fontWeight: 500 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#374151', fontWeight: 500 }}>
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: '#166534',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <p style={{ color: '#666', fontSize: '14px' }}>
            Não tem uma conta?{' '}
            <Link to="/registro" style={{ color: '#166534', textDecoration: 'none', fontWeight: 600 }}>
              Cadastre-se
            </Link>
          </p>
        </div>

        <div style={{ 
          marginTop: '20px', 
          padding: '12px', 
          background: '#f3f4f6', 
          borderRadius: '8px',
          fontSize: '12px',
          color: '#666'
        }}>
          <strong>Dados de teste:</strong><br/>
          Email: admin@agrofocus.com<br/>
          Senha: admin123
        </div>
      </div>
    </div>
  )
}