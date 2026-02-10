import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw'
import 'leaflet-draw/dist/leaflet.draw.css'

// Fix para os ícones do Leaflet
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

interface TalhaoExistente {
  id: string
  nome: string
  geometria?: any
  centroide?: { coordinates: number[] }
}

interface MapaDesenhoTalhaoProps {
  onPolygonComplete: (geojson: GeoJSONPolygon, areaHectares: number) => void
  initialGeometry?: GeoJSONPolygon | null
  centro?: { lat: number; lng: number }
  existingTalhoes?: TalhaoExistente[]
}

export default function MapaDesenhoTalhao({ 
  onPolygonComplete, 
  initialGeometry,
  centro = { lat: -21.13, lng: -47.13 },
  existingTalhoes = []
}: MapaDesenhoTalhaoProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null)
  const [areaCalculada, setAreaCalculada] = useState<number | null>(null)

  // Calcular área do polígono em hectares
  const calcularAreaHectares = (latlngs: L.LatLng[]): number => {
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
    
    area = Math.abs(area * 6371000 * 6371000 / 2)
    return area / 10000
  }

  const calcularAreaComLeaflet = (layer: L.Polygon): number => {
    const latlngs = layer.getLatLngs()[0] as L.LatLng[]
    
    if ((L as any).GeometryUtil && (L as any).GeometryUtil.geodesicArea) {
      const areaM2 = (L as any).GeometryUtil.geodesicArea(latlngs)
      return areaM2 / 10000
    }
    
    return calcularAreaHectares(latlngs)
  }

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Determinar centro inicial baseado nos talhões existentes
    let initialCenter = centro
    if (existingTalhoes.length > 0) {
      const firstWithCentroid = existingTalhoes.find(t => t.centroide?.coordinates)
      if (firstWithCentroid?.centroide?.coordinates) {
        initialCenter = {
          lng: firstWithCentroid.centroide.coordinates[0],
          lat: firstWithCentroid.centroide.coordinates[1]
        }
      }
    }

    const map = L.map(mapRef.current).setView([initialCenter.lat, initialCenter.lng], 14)
    mapInstanceRef.current = map

    // Camadas base
    const satelite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '&copy; Esri',
        maxZoom: 19
      }
    )

    const osm = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '&copy; OpenStreetMap'
      }
    )

    satelite.addTo(map)

    const baseMaps = {
      'Satélite': satelite,
      'Mapa': osm
    }
    L.control.layers(baseMaps).addTo(map)

    // Grupo para talhões existentes (referência visual)
    const existingLayer = new L.FeatureGroup()
    map.addLayer(existingLayer)

    // Adicionar talhões existentes como referência
    const bounds: L.LatLngBounds[] = []
    existingTalhoes.forEach(talhao => {
      if (talhao.centroide?.coordinates) {
        const [lng, lat] = talhao.centroide.coordinates
        
        // Criar um círculo no centroide como placeholder visual
        const circle = L.circleMarker([lat, lng], {
          radius: 20,
          color: '#6b7280',
          fillColor: '#9ca3af',
          fillOpacity: 0.4,
          weight: 2
        })
        
        circle.bindTooltip(talhao.nome, {
          permanent: false,
          direction: 'top'
        })
        
        existingLayer.addLayer(circle)
        bounds.push(L.latLngBounds([lat, lng], [lat, lng]))
      }
    })

    // Ajustar zoom para mostrar todos os talhões existentes
    if (bounds.length > 0) {
      let allBounds = bounds[0]
      for (let i = 1; i < bounds.length; i++) {
        allBounds = allBounds.extend(bounds[i])
      }
      map.fitBounds(allBounds.pad(0.2))
    }

    // Grupo para itens desenhados pelo usuário
    const drawnItems = new L.FeatureGroup()
    map.addLayer(drawnItems)
    drawnItemsRef.current = drawnItems

    // Configurar controles de desenho
    const drawControl = new (L as any).Control.Draw({
      position: 'topright',
      draw: {
        polyline: false,
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false,
        polygon: {
          allowIntersection: false,
          drawError: {
            color: '#e1e100',
            message: '<strong>Erro!</strong> Polígono não pode ter interseções.'
          },
          shapeOptions: {
            color: '#22c55e',
            fillColor: '#22c55e',
            fillOpacity: 0.3,
            weight: 3
          },
          showArea: true,
          metric: true
        }
      },
      edit: {
        featureGroup: drawnItems,
        remove: true,
        edit: true
      }
    })
    map.addControl(drawControl)

    // Evento quando polígono é criado
    map.on((L as any).Draw.Event.CREATED, (event: any) => {
      const layer = event.layer as L.Polygon
      
      drawnItems.clearLayers()
      drawnItems.addLayer(layer)

      const latlngs = layer.getLatLngs()[0] as L.LatLng[]
      const areaHa = calcularAreaComLeaflet(layer)
      setAreaCalculada(areaHa)

      const coordinates = latlngs.map(ll => [ll.lng, ll.lat])
      if (coordinates.length > 0) {
        coordinates.push(coordinates[0])
      }

      const geojson: GeoJSONPolygon = {
        type: 'Polygon',
        coordinates: [coordinates]
      }

      onPolygonComplete(geojson, areaHa)
    })

    // Evento quando polígono é editado
    map.on((L as any).Draw.Event.EDITED, (event: any) => {
      const layers = event.layers
      layers.eachLayer((layer: L.Polygon) => {
        const latlngs = layer.getLatLngs()[0] as L.LatLng[]
        const areaHa = calcularAreaComLeaflet(layer)
        setAreaCalculada(areaHa)

        const coordinates = latlngs.map(ll => [ll.lng, ll.lat])
        if (coordinates.length > 0) {
          coordinates.push(coordinates[0])
        }

        const geojson: GeoJSONPolygon = {
          type: 'Polygon',
          coordinates: [coordinates]
        }

        onPolygonComplete(geojson, areaHa)
      })
    })

    // Evento quando polígono é deletado
    map.on((L as any).Draw.Event.DELETED, () => {
      setAreaCalculada(null)
      onPolygonComplete({ type: 'Polygon', coordinates: [] }, 0)
    })

    // Carregar geometria inicial se fornecida
    if (initialGeometry && initialGeometry.coordinates.length > 0) {
      const coords = initialGeometry.coordinates[0]
      const latlngs = coords.map(c => L.latLng(c[1], c[0]))
      const polygon = L.polygon(latlngs, {
        color: '#22c55e',
        fillColor: '#22c55e',
        fillOpacity: 0.3,
        weight: 3
      })
      drawnItems.addLayer(polygon)
      
      const areaHa = calcularAreaComLeaflet(polygon)
      setAreaCalculada(areaHa)
      
      map.fitBounds(polygon.getBounds())
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [centro.lat, centro.lng, existingTalhoes])

  return (
    <div style={{ position: 'relative' }}>
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: '400px', 
          borderRadius: '8px',
          border: '2px solid #e5e7eb'
        }} 
      />
      
      {areaCalculada !== null && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          background: 'rgba(255,255,255,0.95)',
          padding: '8px 12px',
          borderRadius: '6px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          zIndex: 1000
        }}>
          <strong>📐 Área:</strong> {(Number(areaCalculada) || 0).toFixed(2)} ha
        </div>
      )}
      
      {existingTalhoes.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'rgba(255,255,255,0.95)',
          padding: '8px 12px',
          borderRadius: '6px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          zIndex: 1000,
          fontSize: 12
        }}>
          <strong>📍 Talhões existentes:</strong> {existingTalhoes.length}
          <br />
          <span style={{color: '#666'}}>Círculos cinza = referência</span>
        </div>
      )}
      
      <div style={{
        marginTop: '10px',
        padding: '10px',
        background: '#f0fdf4',
        borderRadius: '6px',
        fontSize: '14px',
        color: '#166534'
      }}>
        <strong>💡 Dica:</strong> Clique no ícone do polígono (⬡) no canto superior direito para desenhar os limites do talhão.
        {existingTalhoes.length > 0 && ' Os círculos cinza mostram os talhões já cadastrados como referência.'}
      </div>
    </div>
  )
}
