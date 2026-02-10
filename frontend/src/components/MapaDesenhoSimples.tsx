import { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix para ícones do Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface GeoJSONPolygon {
  type: 'Polygon'
  coordinates: number[][][]
}

interface Props {
  onPolygonComplete: (geojson: GeoJSONPolygon, areaHectares: number) => void
}

export default function MapaDesenhoSimples({ onPolygonComplete }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const [pontos, setPontos] = useState<L.LatLng[]>([])
  const [areaCalculada, setAreaCalculada] = useState<number | null>(null)
  const [modo, setModo] = useState<'idle' | 'drawing'>('idle')
  const [erro, setErro] = useState<string | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const polygonRef = useRef<L.Polygon | null>(null)
  const markersRef = useRef<L.CircleMarker[]>([])

  // Calcular área em hectares usando fórmula esférica
  const calcularArea = useCallback((latlngs: L.LatLng[]): number => {
    if (latlngs.length < 3) return 0
    let area = 0
    const n = latlngs.length
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      const lat1 = latlngs[i].lat * Math.PI / 180
      const lat2 = latlngs[j].lat * Math.PI / 180
      const lng1 = latlngs[i].lng * Math.PI / 180
      const lng2 = latlngs[j].lng * Math.PI / 180
      area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2))
    }
    return Math.abs(area * 6371000 * 6371000 / 2) / 10000
  }, [])

  // Atualizar polígono visual
  const atualizarPoligono = useCallback((pts: L.LatLng[]) => {
    const map = mapInstanceRef.current
    if (!map) return

    // Remover polígono anterior
    if (polygonRef.current) {
      map.removeLayer(polygonRef.current)
      polygonRef.current = null
    }

    // Remover marcadores anteriores
    markersRef.current.forEach(m => {
      try { map.removeLayer(m) } catch (e) { /* ignore */ }
    })
    markersRef.current = []

    if (pts.length >= 1) {
      // Adicionar marcadores nos vértices
      pts.forEach((pt, i) => {
        const marker = L.circleMarker(pt, {
          radius: 10,
          color: i === 0 ? '#ef4444' : '#22c55e',
          fillColor: i === 0 ? '#ef4444' : '#22c55e',
          fillOpacity: 0.8,
          weight: 3
        }).addTo(map)
        markersRef.current.push(marker)
      })
    }

    if (pts.length >= 3) {
      // Desenhar polígono
      polygonRef.current = L.polygon(pts, {
        color: '#22c55e',
        fillColor: '#22c55e',
        fillOpacity: 0.3,
        weight: 3
      }).addTo(map)

      const areaHa = calcularArea(pts)
      setAreaCalculada(areaHa)
    } else {
      setAreaCalculada(null)
    }
  }, [calcularArea])

  // Finalizar polígono
  const finalizarPoligono = useCallback(() => {
    if (pontos.length < 3) {
      alert('Desenhe pelo menos 3 pontos para formar um polígono')
      return
    }

    const areaHa = calcularArea(pontos)
    const coords = pontos.map(pt => [pt.lng, pt.lat])
    coords.push(coords[0]) // Fechar o polígono

    onPolygonComplete({
      type: 'Polygon',
      coordinates: [coords]
    }, areaHa)

    setModo('idle')
  }, [pontos, calcularArea, onPolygonComplete])

  // Limpar desenho
  const limparDesenho = useCallback(() => {
    setPontos([])
    setAreaCalculada(null)
    setModo('idle')
    onPolygonComplete({ type: 'Polygon', coordinates: [] }, 0)
    
    const map = mapInstanceRef.current
    if (map) {
      if (polygonRef.current) {
        try { map.removeLayer(polygonRef.current) } catch (e) { /* ignore */ }
      }
      markersRef.current.forEach(m => {
        try { map.removeLayer(m) } catch (e) { /* ignore */ }
      })
      markersRef.current = []
      polygonRef.current = null
    }
  }, [onPolygonComplete])

  // Desfazer último ponto
  const desfazerPonto = useCallback(() => {
    if (pontos.length > 0) {
      const novosPontos = pontos.slice(0, -1)
      setPontos(novosPontos)
      atualizarPoligono(novosPontos)
    }
  }, [pontos, atualizarPoligono])

  // Inicializar mapa
  useEffect(() => {
    if (!mapRef.current) return
    
    // Evitar re-inicialização
    if (mapInstanceRef.current) return

    // Delay para garantir que o container está renderizado (importante para mobile)
    const initTimeout = setTimeout(() => {
      try {
        if (!mapRef.current) return
        
        const map = L.map(mapRef.current, {
          // @ts-expect-error tap is a valid Leaflet option but not in types
          tap: true,
          tapTolerance: 15,
          touchZoom: true,
          dragging: true,
          scrollWheelZoom: true
        }).setView([-22.0, -51.0], 13)
        
        mapInstanceRef.current = map

        // Camada de satélite
        L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          { maxZoom: 19, attribution: '&copy; Esri' }
        ).addTo(map)

        // Labels
        L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
          { maxZoom: 19 }
        ).addTo(map)

        // Invalidar tamanho após inicialização (fix para containers responsivos)
        setTimeout(() => {
          map.invalidateSize()
          setMapReady(true)
          setErro(null)
        }, 100)

      } catch (e) {
        console.error('Erro ao inicializar mapa:', e)
        setErro('Erro ao carregar o mapa. Tente recarregar a página.')
      }
    }, 50)

    return () => {
      clearTimeout(initTimeout)
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove()
        } catch (e) { /* ignore */ }
        mapInstanceRef.current = null
        setMapReady(false)
      }
    }
  }, [])

  // Handler de clique/tap no mapa
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !mapReady) return

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (modo !== 'drawing') return
      
      const novosPontos = [...pontos, e.latlng]
      setPontos(novosPontos)
      atualizarPoligono(novosPontos)
    }

    map.on('click', handleMapClick)
    
    return () => {
      map.off('click', handleMapClick)
    }
  }, [modo, pontos, mapReady, atualizarPoligono])

  // Atualizar visual quando pontos mudam
  useEffect(() => {
    if (mapReady) {
      atualizarPoligono(pontos)
    }
  }, [pontos, mapReady, atualizarPoligono])

  // Renderizar erro
  if (erro) {
    return (
      <div style={{
        background: '#fef2f2',
        border: '1px solid #ef4444',
        borderRadius: 8,
        padding: 20,
        textAlign: 'center',
        color: '#991b1b'
      }}>
        <p>⚠️ {erro}</p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            marginTop: 10,
            padding: '8px 16px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer'
          }}
        >
          Recarregar
        </button>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Controles */}
      <div style={{
        display: 'flex',
        gap: 10,
        marginBottom: 10,
        flexWrap: 'wrap'
      }}>
        {modo === 'idle' ? (
          <button
            type="button"
            onClick={() => { limparDesenho(); setModo('drawing'); }}
            disabled={!mapReady}
            style={{
              padding: '10px 20px',
              background: mapReady ? '#22c55e' : '#9ca3af',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: mapReady ? 'pointer' : 'not-allowed',
              fontWeight: 'bold'
            }}
          >
            ✏️ Iniciar Desenho
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={finalizarPoligono}
              disabled={pontos.length < 3}
              style={{
                padding: '10px 20px',
                background: pontos.length >= 3 ? '#2563eb' : '#9ca3af',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: pontos.length >= 3 ? 'pointer' : 'not-allowed',
                fontWeight: 'bold'
              }}
            >
              ✓ Finalizar ({pontos.length} pontos)
            </button>
            <button
              type="button"
              onClick={desfazerPonto}
              disabled={pontos.length === 0}
              style={{
                padding: '10px 20px',
                background: pontos.length > 0 ? '#f59e0b' : '#9ca3af',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: pontos.length > 0 ? 'pointer' : 'not-allowed'
              }}
            >
              ↩️ Desfazer
            </button>
            <button
              type="button"
              onClick={limparDesenho}
              style={{
                padding: '10px 20px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer'
              }}
            >
              🗑️ Limpar
            </button>
          </>
        )}
      </div>

      {/* Mapa */}
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: '350px', 
          borderRadius: '8px',
          border: '2px solid #e5e7eb',
          cursor: modo === 'drawing' ? 'crosshair' : 'grab',
          touchAction: 'none' // Importante para touch em mobile
        }} 
      />
      
      {/* Loading overlay */}
      {!mapReady && (
        <div style={{
          position: 'absolute',
          top: 70,
          left: 0,
          right: 0,
          bottom: 80,
          background: 'rgba(255,255,255,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          zIndex: 1000
        }}>
          <span>Carregando mapa...</span>
        </div>
      )}
      
      {/* Indicador de área */}
      {areaCalculada !== null && (
        <div style={{
          position: 'absolute',
          bottom: '90px',
          left: '10px',
          background: 'rgba(255,255,255,0.95)',
          padding: '8px 12px',
          borderRadius: '6px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          zIndex: 1000
        }}>
          <strong>📐 Área:</strong> {areaCalculada.toFixed(2)} ha
        </div>
      )}
      
      {/* Instruções */}
      <div style={{
        marginTop: '10px',
        padding: '10px',
        background: modo === 'drawing' ? '#fef3c7' : '#f0fdf4',
        borderRadius: '6px',
        fontSize: '14px',
        color: modo === 'drawing' ? '#92400e' : '#166534'
      }}>
        {modo === 'drawing' ? (
          <><strong>👆 Toque no mapa</strong> para adicionar pontos. O primeiro ponto fica vermelho. Mínimo 3 pontos.</>
        ) : (
          <><strong>💡 Dica:</strong> Clique em "Iniciar Desenho" e depois toque no mapa para marcar os vértices do talhão.</>
        )}
      </div>
    </div>
  )
}
