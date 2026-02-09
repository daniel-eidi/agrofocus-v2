import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface PontoGPS {
  id: string
  latitude: number
  longitude: number
  timestamp: string
  velocidade?: number
}

interface MapaRastreamentoProps {
  pontos: PontoGPS[]
  posicaoAtual?: { lat: number; lng: number } | null
  rastreando: boolean
}

export default function MapaRastreamento({ pontos, posicaoAtual, rastreando }: MapaRastreamentoProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMap = useRef<L.Map | null>(null)
  const polylineRef = useRef<L.Polyline | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const posicaoAtualMarker = useRef<L.Marker | null>(null)
  const [tipoMapa, setTipoMapa] = useState<'satellite' | 'street' | 'terrain'>('satellite')

  // Inicializar mapa
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return

    // Criar mapa
    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true
    })

    // Adicionar camada base (satélite por padrão)
    const satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Esri',
        maxZoom: 19
      }
    )

    const streetLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19
      }
    )

    const terrainLayer = L.tileLayer(
      'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      {
        attribution: 'OpenTopoMap',
        maxZoom: 17
      }
    )

    // Camada ativa
    if (tipoMapa === 'satellite') satelliteLayer.addTo(map)
    else if (tipoMapa === 'street') streetLayer.addTo(map)
    else terrainLayer.addTo(map)

    // Salvar referências
    leafletMap.current = map

    // Cleanup
    return () => {
      map.remove()
      leafletMap.current = null
    }
  }, [])

  // Atualizar camada base quando tipo muda
  useEffect(() => {
    if (!leafletMap.current) return

    leafletMap.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        leafletMap.current?.removeLayer(layer)
      }
    })

    let newLayer: L.TileLayer
    if (tipoMapa === 'satellite') {
      newLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: 'Esri', maxZoom: 19 }
      )
    } else if (tipoMapa === 'street') {
      newLayer = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { attribution: '&copy; OpenStreetMap', maxZoom: 19 }
      )
    } else {
      newLayer = L.tileLayer(
        'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        { attribution: 'OpenTopoMap', maxZoom: 17 }
      )
    }

    newLayer.addTo(leafletMap.current)
  }, [tipoMapa])

  // Atualizar polilinha e marcadores quando pontos mudam
  useEffect(() => {
    if (!leafletMap.current || pontos.length === 0) return

    // Remover polyline anterior
    if (polylineRef.current) {
      leafletMap.current.removeLayer(polylineRef.current)
    }

    // Remover marcadores anteriores (exceto início/fim)
    markersRef.current.forEach(marker => {
      leafletMap.current?.removeLayer(marker)
    })
    markersRef.current = []

    // Criar array de coordenadas
    const latLngs = pontos.map(p => [p.latitude, p.longitude] as [number, number])

    // Adicionar polyline
    polylineRef.current = L.polyline(latLngs, {
      color: '#166534',
      weight: 4,
      opacity: 0.8,
      dashArray: pontos.length > 1 ? undefined : '5, 10'
    }).addTo(leafletMap.current)

    // Marcador de início (verde)
    const inicioMarker = L.marker([pontos[0].latitude, pontos[0].longitude], {
      icon: L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          background: #22c55e;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })
    }).addTo(leafletMap.current)
    inicioMarker.bindPopup('<b>Início</b><br/>' + new Date(pontos[0].timestamp).toLocaleString('pt-BR'))
    markersRef.current.push(inicioMarker)

    // Marcador de fim (vermelho) - apenas se houver mais de 1 ponto
    if (pontos.length > 1) {
      const ultimo = pontos[pontos.length - 1]
      const fimMarker = L.marker([ultimo.latitude, ultimo.longitude], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: `<div style="
            background: #ef4444;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          "></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        })
      }).addTo(leafletMap.current)
      fimMarker.bindPopup('<b>Posição Atual</b><br/>' + new Date(ultimo.timestamp).toLocaleString('pt-BR'))
      markersRef.current.push(fimMarker)
    }

    // Ajustar zoom para mostrar toda a trilha
    leafletMap.current.fitBounds(polylineRef.current.getBounds(), { padding: [50, 50] })
  }, [pontos])

  // Atualizar marcador de posição atual
  useEffect(() => {
    if (!leafletMap.current || !posicaoAtual) return

    // Remover marcador anterior
    if (posicaoAtualMarker.current) {
      leafletMap.current.removeLayer(posicaoAtualMarker.current)
    }

    // Criar novo marcador com pulso
    const marker = L.marker([posicaoAtual.lat, posicaoAtual.lng], {
      icon: L.divIcon({
        className: 'current-position',
        html: `
          <div style="
            position: relative;
            width: 20px;
            height: 20px;
          ">
            <div style="
              position: absolute;
              width: 20px;
              height: 20px;
              background: #3b82f6;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.4);
              z-index: 2;
            "></div>
            ${rastreando ? `
            <div style="
              position: absolute;
              width: 30px;
              height: 30px;
              background: rgba(59, 130, 246, 0.3);
              border-radius: 50%;
              top: -5px;
              left: -5px;
              animation: pulse 1.5s infinite;
              z-index: 1;
            "></div>
            ` : ''}
          </div>
          <style>
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.3); opacity: 0.5; }
            }
          </style>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })
    }).addTo(leafletMap.current)

    posicaoAtualMarker.current = marker
  }, [posicaoAtual, rastreando])

  return (
    <div style={{ position: 'relative' }}>
      {/* Controles de tipo de mapa */}
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 1000,
        background: 'white',
        borderRadius: 8,
        padding: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
          Tipo de Mapa
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setTipoMapa('satellite')}
            style={{
              padding: '6px 12px',
              background: tipoMapa === 'satellite' ? '#166534' : '#f3f4f6',
              color: tipoMapa === 'satellite' ? 'white' : '#374151',
              border: 'none',
              borderRadius: 4,
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            🛰️ Satélite
          </button>
          <button
            onClick={() => setTipoMapa('street')}
            style={{
              padding: '6px 12px',
              background: tipoMapa === 'street' ? '#166534' : '#f3f4f6',
              color: tipoMapa === 'street' ? 'white' : '#374151',
              border: 'none',
              borderRadius: 4,
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            🗺️ Ruas
          </button>
          <button
            onClick={() => setTipoMapa('terrain')}
            style={{
              padding: '6px 12px',
              background: tipoMapa === 'terrain' ? '#166534' : '#f3f4f6',
              color: tipoMapa === 'terrain' ? 'white' : '#374151',
              border: 'none',
              borderRadius: 4,
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            ⛰️ Terreno
          </button>
        </div>
      </div>

      {/* Legenda */}
      {pontos.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          zIndex: 1000,
          background: 'white',
          borderRadius: 8,
          padding: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          fontSize: 12
        }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Legenda</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <div style={{ width: 12, height: 12, background: '#22c55e', borderRadius: '50%' }}></div>
            <span>Início</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <div style={{ width: 12, height: 12, background: '#ef4444', borderRadius: '50%' }}></div>
            <span>Posição Atual</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 20, height: 3, background: '#166534' }}></div>
            <span>Trilha ({pontos.length} pontos)</span>
          </div>
        </div>
      )}

      {/* Container do mapa */}
      <div 
        ref={mapRef}
        style={{
          width: '100%',
          height: 400,
          borderRadius: 12,
          overflow: 'hidden'
        }}
      />
    </div>
  )
}