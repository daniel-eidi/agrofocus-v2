import { useMemo } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  addMonths,
  subMonths,
  isToday
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Atividade {
  id: string
  descricao: string
  data: string
  tipo: string
  status: string
  talhao_nome?: string
}

interface Props {
  atividades: Atividade[]
  onDiaClick: (data: Date) => void
  onAtividadeClick: (atividade: Atividade) => void
  mesAtual: Date
  onMesChange: (data: Date) => void
}

// Cores por tipo de atividade
const getTipoColor = (tipo: string): { bg: string; text: string } => {
  switch (tipo?.toUpperCase()) {
    case 'PLANTIO':
      return { bg: '#22c55e', text: '#fff' }
    case 'COLHEITA':
      return { bg: '#eab308', text: '#000' }
    case 'APLICACAO':
      return { bg: '#3b82f6', text: '#fff' }
    case 'IRRIGACAO':
      return { bg: '#06b6d4', text: '#fff' }
    case 'MANUTENCAO':
      return { bg: '#6b7280', text: '#fff' }
    default:
      return { bg: '#9ca3af', text: '#fff' }
  }
}

// Emoji por tipo
const getTipoEmoji = (tipo: string): string => {
  switch (tipo?.toUpperCase()) {
    case 'PLANTIO': return '🌱'
    case 'COLHEITA': return '🌾'
    case 'APLICACAO': return '💧'
    case 'IRRIGACAO': return '🚿'
    case 'MANUTENCAO': return '🔧'
    default: return '📋'
  }
}

export default function CalendarioAtividades({
  atividades,
  onDiaClick,
  onAtividadeClick,
  mesAtual,
  onMesChange
}: Props) {
  // Gerar dias do calendário (inclui dias do mês anterior/próximo para completar semanas)
  const diasCalendario = useMemo(() => {
    const inicioMes = startOfMonth(mesAtual)
    const fimMes = endOfMonth(mesAtual)
    const inicioCalendario = startOfWeek(inicioMes, { weekStartsOn: 0 })
    const fimCalendario = endOfWeek(fimMes, { weekStartsOn: 0 })
    
    return eachDayOfInterval({ start: inicioCalendario, end: fimCalendario })
  }, [mesAtual])

  // Mapear atividades por data
  const atividadesPorDia = useMemo(() => {
    const mapa: Record<string, Atividade[]> = {}
    
    atividades.forEach(a => {
      if (!a.data) return
      const dataStr = format(new Date(a.data), 'yyyy-MM-dd')
      if (!mapa[dataStr]) mapa[dataStr] = []
      mapa[dataStr].push(a)
    })
    
    return mapa
  }, [atividades])

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
      {/* Header com navegação */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 20 
      }}>
        <button
          onClick={() => onMesChange(subMonths(mesAtual, 1))}
          style={{
            background: '#f3f4f6',
            border: 'none',
            borderRadius: 8,
            padding: '10px 16px',
            cursor: 'pointer',
            fontSize: 18,
            fontWeight: 'bold',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#e5e7eb'}
          onMouseOut={(e) => e.currentTarget.style.background = '#f3f4f6'}
        >
          ←
        </button>
        
        <h2 style={{ 
          margin: 0, 
          fontSize: 22, 
          fontWeight: 600,
          color: '#1f2937',
          textTransform: 'capitalize'
        }}>
          {format(mesAtual, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        
        <button
          onClick={() => onMesChange(addMonths(mesAtual, 1))}
          style={{
            background: '#f3f4f6',
            border: 'none',
            borderRadius: 8,
            padding: '10px 16px',
            cursor: 'pointer',
            fontSize: 18,
            fontWeight: 'bold',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#e5e7eb'}
          onMouseOut={(e) => e.currentTarget.style.background = '#f3f4f6'}
        >
          →
        </button>
      </div>

      {/* Cabeçalho dias da semana */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(7, 1fr)', 
        gap: 4, 
        marginBottom: 8 
      }}>
        {diasSemana.map(dia => (
          <div
            key={dia}
            style={{
              textAlign: 'center',
              padding: '8px 0',
              fontWeight: 600,
              fontSize: 13,
              color: '#6b7280',
              textTransform: 'uppercase'
            }}
          >
            {dia}
          </div>
        ))}
      </div>

      {/* Grid de dias */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(7, 1fr)', 
        gap: 4 
      }}>
        {diasCalendario.map(dia => {
          const dataStr = format(dia, 'yyyy-MM-dd')
          const atividadesDoDia = atividadesPorDia[dataStr] || []
          const eMesAtual = isSameMonth(dia, mesAtual)
          const eHoje = isToday(dia)
          
          return (
            <div
              key={dataStr}
              onClick={() => onDiaClick(dia)}
              style={{
                minHeight: 90,
                padding: 6,
                background: eHoje ? '#fef3c7' : eMesAtual ? '#f9fafb' : '#f3f4f6',
                borderRadius: 8,
                cursor: 'pointer',
                border: eHoje ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                opacity: eMesAtual ? 1 : 0.5,
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                if (eMesAtual) e.currentTarget.style.background = eHoje ? '#fef3c7' : '#e5e7eb'
              }}
              onMouseOut={(e) => {
                if (eMesAtual) e.currentTarget.style.background = eHoje ? '#fef3c7' : '#f9fafb'
              }}
            >
              {/* Número do dia */}
              <div style={{ 
                fontWeight: eHoje ? 700 : 500, 
                fontSize: 14,
                color: eHoje ? '#b45309' : eMesAtual ? '#1f2937' : '#9ca3af',
                marginBottom: 4
              }}>
                {format(dia, 'd')}
              </div>
              
              {/* Atividades do dia (máximo 3 visíveis) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {atividadesDoDia.slice(0, 3).map(a => {
                  const cor = getTipoColor(a.tipo)
                  return (
                    <div
                      key={a.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onAtividadeClick(a)
                      }}
                      style={{
                        background: cor.bg,
                        color: cor.text,
                        fontSize: 10,
                        padding: '2px 4px',
                        borderRadius: 4,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2
                      }}
                      title={a.descricao}
                    >
                      <span>{getTipoEmoji(a.tipo)}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {a.descricao.length > 10 ? a.descricao.substring(0, 10) + '...' : a.descricao}
                      </span>
                    </div>
                  )
                })}
                
                {/* Indicador de mais atividades */}
                {atividadesDoDia.length > 3 && (
                  <div style={{ 
                    fontSize: 10, 
                    color: '#6b7280', 
                    textAlign: 'center',
                    fontWeight: 500
                  }}>
                    +{atividadesDoDia.length - 3} mais
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legenda */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap',
        gap: 12, 
        marginTop: 20, 
        paddingTop: 16,
        borderTop: '1px solid #e5e7eb'
      }}>
        <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Legenda:</span>
        {['PLANTIO', 'COLHEITA', 'APLICACAO', 'IRRIGACAO', 'MANUTENCAO'].map(tipo => {
          const cor = getTipoColor(tipo)
          return (
            <div key={tipo} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ 
                width: 12, 
                height: 12, 
                background: cor.bg, 
                borderRadius: 3 
              }}></span>
              <span style={{ fontSize: 11, color: '#4b5563' }}>
                {getTipoEmoji(tipo)} {tipo.charAt(0) + tipo.slice(1).toLowerCase()}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
