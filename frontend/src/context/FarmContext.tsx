import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { apiGet, ensureArray } from '../utils/api'

interface Fazenda {
  id: string
  nome: string
}

interface Safra {
  id: string
  nome: string
  ano_inicio: number
  ano_fim: number
}

interface FarmContextType {
  fazendas: Fazenda[]
  safras: Safra[]
  selectedFazendaId: string
  selectedSafraId: string
  setSelectedFazendaId: (id: string) => void
  setSelectedSafraId: (id: string) => void
  loading: boolean
  refresh: () => Promise<void>
}

const FarmContext = createContext<FarmContextType | undefined>(undefined)

export function FarmProvider({ children }: { children: ReactNode }) {
  const [fazendas, setFazendas] = useState<Fazenda[]>([])
  const [safras, setSafras] = useState<Safra[]>([])
  const [selectedFazendaId, setSelectedFazendaIdState] = useState<string>('')
  const [selectedSafraId, setSelectedSafraIdState] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // Carregar seleção do localStorage
  useEffect(() => {
    const savedFazenda = localStorage.getItem('agrofocus_selected_fazenda')
    const savedSafra = localStorage.getItem('agrofocus_selected_safra')
    if (savedFazenda) setSelectedFazendaIdState(savedFazenda)
    if (savedSafra) setSelectedSafraIdState(savedSafra)
  }, [])

  // Função para carregar dados
  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('agrofocus_token')
    if (!token) {
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      const [fazData, safData] = await Promise.all([
        apiGet('/api/fazendas'),
        apiGet('/api/safras')
      ])
      
      const fazArray = ensureArray(fazData)
      const safArray = ensureArray(safData)
      
      setFazendas(fazArray)
      setSafras(safArray)
      
      // Validar seleções salvas
      const savedFazenda = localStorage.getItem('agrofocus_selected_fazenda')
      const savedSafra = localStorage.getItem('agrofocus_selected_safra')
      
      // Se a fazenda salva não existe mais, limpar
      if (savedFazenda && !fazArray.find((f: Fazenda) => f.id === savedFazenda)) {
        localStorage.removeItem('agrofocus_selected_fazenda')
        setSelectedFazendaIdState('')
      }
      
      // Se a safra salva não existe mais, limpar
      if (savedSafra && !safArray.find((s: Safra) => s.id === savedSafra)) {
        localStorage.removeItem('agrofocus_selected_safra')
        setSelectedSafraIdState('')
      }
      
    } catch (err) {
      console.error('Erro ao carregar contexto:', err)
      setFazendas([])
      setSafras([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Carregar dados inicialmente
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Função refresh para ser chamada externamente
  const refresh = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  const setSelectedFazendaId = useCallback((id: string) => {
    setSelectedFazendaIdState(id)
    if (id) {
      localStorage.setItem('agrofocus_selected_fazenda', id)
    } else {
      localStorage.removeItem('agrofocus_selected_fazenda')
    }
  }, [])

  const setSelectedSafraId = useCallback((id: string) => {
    setSelectedSafraIdState(id)
    if (id) {
      localStorage.setItem('agrofocus_selected_safra', id)
    } else {
      localStorage.removeItem('agrofocus_selected_safra')
    }
  }, [])

  return (
    <FarmContext.Provider value={{
      fazendas,
      safras,
      selectedFazendaId,
      selectedSafraId,
      setSelectedFazendaId,
      setSelectedSafraId,
      loading,
      refresh
    }}>
      {children}
    </FarmContext.Provider>
  )
}

export function useFarmContext() {
  const context = useContext(FarmContext)
  if (context === undefined) {
    throw new Error('useFarmContext deve ser usado dentro de FarmProvider')
  }
  return context
}
