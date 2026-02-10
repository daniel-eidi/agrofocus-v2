import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface Usuario {
  id: string
  email: string
  nome: string
  perfil: string
  avatar_url?: string
}

interface AuthContextType {
  usuario: Usuario | null
  token: string | null
  login: (email: string, senha: string) => Promise<{ sucesso: boolean; erro?: string }>
  registro: (dados: { email: string; senha: string; nome: string; telefone?: string }) => Promise<{ sucesso: boolean; erro?: string }>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const API_URL = ''

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar se há token salvo
    const tokenSalvo = localStorage.getItem('agrofocus_token')
    const usuarioSalvo = localStorage.getItem('agrofocus_usuario')
    
    if (tokenSalvo && usuarioSalvo) {
      setToken(tokenSalvo)
      setUsuario(JSON.parse(usuarioSalvo))
    }
    
    setLoading(false)
  }, [])

  const registrarPushSubscription = async (userId: string, token: string) => {
    try {
      // Verificar se service worker está disponível e pronto (com timeout)
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length === 0) {
        console.log('🔔 Nenhum service worker registrado, pulando push subscription');
        return;
      }
      
      // Usar timeout para evitar travamento
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 3000)
      );
      
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        timeoutPromise
      ]) as ServiceWorkerRegistration;
      
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        // Enviar subscription existente para o backend
        await fetch(`${API_URL}/api/notificacoes/subscribe`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            subscription: existingSubscription.toJSON(),
            usuario_id: userId
          })
        });
        console.log('🔔 Subscription push registrada para usuário:', userId);
      }
    } catch (err) {
      console.error('Erro ao registrar push subscription:', err);
      // Não bloqueia o login se falhar
    }
  };

  const login = async (email: string, senha: string) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
      })
      
      const data = await res.json()
      
      if (data.sucesso) {
        setUsuario(data.usuario)
        setToken(data.token)
        localStorage.setItem('agrofocus_token', data.token)
        localStorage.setItem('agrofocus_usuario', JSON.stringify(data.usuario))
        
        // Registrar subscription push após login bem-sucedido
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          await registrarPushSubscription(data.usuario.id, data.token);
        }
        
        return { sucesso: true }
      } else {
        return { sucesso: false, erro: data.erro || 'Erro ao fazer login' }
      }
    } catch (err) {
      return { sucesso: false, erro: 'Erro de conexão' }
    }
  }

  const registro = async (dados: { email: string; senha: string; nome: string; telefone?: string }) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      })
      
      const data = await res.json()
      
      if (data.sucesso) {
        setUsuario(data.usuario)
        setToken(data.token)
        localStorage.setItem('agrofocus_token', data.token)
        localStorage.setItem('agrofocus_usuario', JSON.stringify(data.usuario))
        return { sucesso: true }
      } else {
        return { sucesso: false, erro: data.erro || 'Erro ao criar conta' }
      }
    } catch (err) {
      return { sucesso: false, erro: 'Erro de conexão' }
    }
  }

  const logout = () => {
    setUsuario(null)
    setToken(null)
    localStorage.removeItem('agrofocus_token')
    localStorage.removeItem('agrofocus_usuario')
  }

  return (
    <AuthContext.Provider value={{ usuario, token, login, registro, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}