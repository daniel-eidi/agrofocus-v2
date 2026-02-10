import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface Talhao {
  id: string
  nome: string
  area_hectares?: number | string
  centroide?: { coordinates: number[] }
  status?: string
}

interface MapaVisualizacaoTalhoesProps {
  talhoes: Talhao[]
  onTalhaoClick?: (id: string) => void
}

export default function MapaVisualizacaoTalhoes({ 
  talhoes,
  onTalhaoClick 
}: MapaVisualizacaoTalhoesProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  const getStatusColor = (status?: string) => {
    switch(status) {
      case 'ativo': 
      case 'plantado': return '#22c55e'
      case 'em_preparo': return '#f59e0b'
      case 'colhido': return '#3b82f6'
      case 'inativo': return '#6b7280'
      default: return '#166534'
    }
  }

  useEffect(() => {
    if (!mapRef.current) return

    // Limpar mapa anterior se existir
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    // Centro padrão (Brasil)
    let center: [number, number] = [-15.79, -47.88]
    let zoom = 4

    // Se houver talhões com centróide, centralizar neles
    const talhoesComCentroide = talhoes.filter(t => t.centroide?.coordinates)
    if (talhoesComCentroide.length > 0) {
      const lats = talhoesComCentroide.map(t => t.centroide!.coordinates[1])
      const lngs = talhoesComCentroide.map(t => t.centroide!.coordinates[0])
      center = [
        lats.reduce((a, b) => a + b, 0) / lats.length,
        lngs.reduce((a, b) => a + b, 0) / lngs.length
      ]
      zoom = 13
    }

    const map = L.map(mapRef.current).setView(center, zoom)
    mapInstanceRef.current = map

    // Camada de satélite
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '&copy; Esri',
        maxZoom: 19
      }
    ).addTo(map)

    // Labels
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19
      }
    ).addTo(map)

    // Adicionar marcadores para cada talhão
    const markers: L.CircleMarker[] = []
    talhoes.forEach(talhao => {
      if (talhao.centroide?.coordinates) {
        const [lng, lat] = talhao.centroide.coordinates
        const color = getStatusColor(talhao.status)
        
        const marker = L.circleMarker([lat, lng], {
          radius: 15,
          color: color,
          fillColor: color,
          fillOpacity: 0.6,
          weight: 3
        })

        marker.bindPopup(`
          <div style="min-width: 150px;">
            <strong>${talhao.nome}</strong><br/>
            📏 ${Number(talhao.area_hectares || 0).toFixed(2)} ha<br/>
            ${talhao.status ? `<span style="color: ${color}">● ${talhao.status}</span>` : ''}
          </div>
        `)

        marker.bindTooltip(talhao.nome, {
          permanent: false,
          direction: 'top'
        })

        if (onTalhaoClick) {
          marker.on('click', () => onTalhaoClick(talhao.id))
        }

        marker.addTo(map)
        markers.push(marker)
      }
    })

    // Ajustar bounds para mostrar todos os marcadores
    if (markers.length > 0) {
      const group = L.featureGroup(markers)
      map.fitBounds(group.getBounds().pad(0.1))
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [talhoes])

  if (talhoes.length === 0) {
    return (
      <div style={{
        background: '#f3f4f6',
        padding: 40,
        borderRadius: 8,
        textAlign: 'center',
        color: '#666'
      }}>
        <p>📍 Cadastre talhões para visualizá-los no mapa</p>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: '300px', 
          borderRadius: '8px',
          border: '2px solid #e5e7eb'
        }} 
      />
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        background: 'rgba(255,255,255,0.95)',
        padding: '6px 10px',
        borderRadius: '6px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        zIndex: 1000,
        fontSize: 12
      }}>
        <strong>🗺️ {talhoes.length} talhão(ões)</strong>
      </div>
    </div>
  )
}
