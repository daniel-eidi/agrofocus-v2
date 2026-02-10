import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvent } from 'react-leaflet';
import { Crosshair, Layers, X, Navigation, Maximize2, Minimize2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Interfaces
type NDVILevel = 'excellent' | 'good' | 'moderate' | 'poor' | 'very-poor';

interface NDVIPolygon {
  id: string;
  bounds: L.LatLngBoundsExpression;
  level: NDVILevel;
  value: number;
}

interface MapaNDVIMobileProps {
  fazendaId?: string;
  talhaoId?: string;
  ndviPolygons?: NDVIPolygon[];
  onPolygonClick?: (polygon: NDVIPolygon) => void;
  className?: string;
}

// Configurações de cores NDVI
const NDVI_COLORS: Record<NDVILevel, { color: string; bg: string; label: string }> = {
  'excellent': { color: '#166534', bg: 'bg-green-800', label: 'Excelente (0.8-1.0)' },
  'good': { color: '#22c55e', bg: 'bg-green-500', label: 'Bom (0.6-0.8)' },
  'moderate': { color: '#eab308', bg: 'bg-yellow-500', label: 'Moderado (0.4-0.6)' },
  'poor': { color: '#f97316', bg: 'bg-orange-500', label: 'Ruim (0.2-0.4)' },
  'very-poor': { color: '#dc2626', bg: 'bg-red-600', label: 'Muito Ruim (0.0-0.2)' },
};

// Posição padrão (centro do Brasil - Goiânia)
const DEFAULT_CENTER: [number, number] = [-16.6869, -49.2648];
const DEFAULT_ZOOM = 14;
const MIN_ZOOM = 10;
const MAX_ZOOM = 20;

// Componente: Controle de Zoom Customizado (Touch)
function TouchZoomController() {
  const map = useMap();
  const touchStartRef = useRef<{ distance: number; center: L.Point } | null>(null);
  const lastTapRef = useRef<number>(0);
  const touchCountRef = useRef<number>(0);

  // Double tap para zoom in
  useMapEvent('click', (e) => {
    const now = Date.now();
    const timeDiff = now - lastTapRef.current;
    
    if (timeDiff < 300) {
      // Double tap detectado - Zoom in
      map.setZoom(Math.min(map.getZoom() + 1, MAX_ZOOM));
    }
    lastTapRef.current = now;
  });

  // Controles touch via eventos DOM
  useEffect(() => {
    const mapContainer = map.getContainer();
    
    const getDistance = (touches: TouchList): number => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getCenter = (touches: TouchList): L.Point => {
      return L.point(
        (touches[0].clientX + touches[1].clientX) / 2,
        (touches[0].clientY + touches[1].clientY) / 2
      );
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchCountRef.current = e.touches.length;
      
      if (e.touches.length === 2) {
        touchStartRef.current = {
          distance: getDistance(e.touches),
          center: getCenter(e.touches)
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchStartRef.current) {
        e.preventDefault();
        
        const currentDistance = getDistance(e.touches);
        const scale = currentDistance / touchStartRef.current.distance;
        
        if (Math.abs(scale - 1) > 0.1) {
          const newZoom = map.getZoom() + (scale > 1 ? 0.5 : -0.5);
          map.setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom)));
          touchStartRef.current.distance = currentDistance;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      // Two finger tap para zoom out
      if (touchCountRef.current === 2 && e.touches.length === 0) {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          map.setZoom(Math.max(map.getZoom() - 1, MIN_ZOOM));
        }
      }
      touchCountRef.current = 0;
      touchStartRef.current = null;
    };

    // Adicionar listeners
    mapContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
    mapContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
    mapContainer.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      mapContainer.removeEventListener('touchstart', handleTouchStart);
      mapContainer.removeEventListener('touchmove', handleTouchMove);
      mapContainer.removeEventListener('touchend', handleTouchEnd);
    };
  }, [map]);

  return null;
}

// Componente: Localização do Usuário
function UserLocationMarker({ onLocationFound }: { onLocationFound?: (pos: [number, number]) => void }) {
  const map = useMap();
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState<number>(0);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  const locateUser = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocalização não suportada neste dispositivo');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy: acc } = pos.coords;
        const newPos: [number, number] = [latitude, longitude];
        
        setPosition(newPos);
        setAccuracy(acc);
        
        // Centralizar mapa
        map.setView(newPos, 16);
        
        // Callback
        onLocationFound?.(newPos);

        // Adicionar/Atualizar marcador
        if (markerRef.current) {
          markerRef.current.setLatLng(newPos);
        } else {
          markerRef.current = L.circleMarker(newPos, {
            radius: 8,
            fillColor: '#3b82f6',
            color: '#ffffff',
            weight: 3,
            opacity: 1,
            fillOpacity: 0.9
          }).addTo(map);
        }

        // Adicionar/Atualizar círculo de precisão
        if (circleRef.current) {
          circleRef.current.setLatLng(newPos);
          circleRef.current.setRadius(acc);
        } else {
          circleRef.current = L.circle(newPos, {
            radius: acc,
            fillColor: '#3b82f6',
            color: '#3b82f6',
            weight: 1,
            opacity: 0.3,
            fillOpacity: 0.1
          }).addTo(map);
        }
      },
      (error) => {
        console.error('Erro ao obter localização:', error);
        alert('Não foi possível obter sua localização. Verifique as permissões.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }, [map, onLocationFound]);

  // Expor função via ref do mapa
  useEffect(() => {
    (map as any).locateUser = locateUser;
  }, [map, locateUser]);

  return null;
}

// Componente: Overlay NDVI
function NDVIOverlay({ 
  polygons, 
  visible,
  onPolygonClick 
}: { 
  polygons?: NDVIPolygon[]; 
  visible: boolean;
  onPolygonClick?: (polygon: NDVIPolygon) => void;
}) {
  const map = useMap();
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!visible || !polygons) {
      if (layerGroupRef.current) {
        layerGroupRef.current.clearLayers();
      }
      return;
    }

    // Criar ou limpar layer group
    if (!layerGroupRef.current) {
      layerGroupRef.current = L.layerGroup().addTo(map);
    } else {
      layerGroupRef.current.clearLayers();
    }

    // Adicionar polígonos NDVI
    polygons.forEach((polygon) => {
      const color = NDVI_COLORS[polygon.level].color;
      
      const rect = L.rectangle(polygon.bounds, {
        color: color,
        weight: 2,
        opacity: 0.8,
        fillColor: color,
        fillOpacity: 0.4
      });

      rect.bindTooltip(`NDVI: ${(Number(polygon.value) || 0).toFixed(2)}`, {
        permanent: false,
        direction: 'top'
      });

      if (onPolygonClick) {
        rect.on('click', () => onPolygonClick(polygon));
      }

      layerGroupRef.current?.addLayer(rect);
    });

    return () => {
      if (layerGroupRef.current) {
        layerGroupRef.current.clearLayers();
      }
    };
  }, [map, polygons, visible, onPolygonClick]);

  return null;
}

// Componente Principal
export default function MapaNDVIMobile({
  fazendaId,
  talhaoId,
  ndviPolygons,
  onPolygonClick,
  className = ''
}: MapaNDVIMobileProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [showNDVI, setShowNDVI] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [statusMessage, setStatusMessage] = useState<string>('Pronto');

  // Simular dados NDVI para exemplo
  const [demoPolygons] = useState<NDVIPolygon[]>(() => {
    const center = DEFAULT_CENTER;
    const polygons: NDVIPolygon[] = [];
    const levels: NDVILevel[] = ['excellent', 'good', 'moderate', 'poor', 'very-poor'];
    
    for (let i = 0; i < 9; i++) {
      const lat = center[0] + (Math.floor(i / 3) - 1) * 0.01;
      const lng = center[1] + (i % 3 - 1) * 0.01;
      const level = levels[Math.floor(Math.random() * levels.length)];
      const value = level === 'excellent' ? 0.85 : 
                    level === 'good' ? 0.7 : 
                    level === 'moderate' ? 0.5 : 
                    level === 'poor' ? 0.3 : 0.1;
      
      polygons.push({
        id: `poly-${i}`,
        bounds: [[lat, lng], [lat + 0.008, lng + 0.008]],
        level,
        value
      });
    }
    return polygons;
  });

  const polygons = ndviPolygons || demoPolygons;

  // Handlers
  const handleLocateUser = () => {
    setIsLocating(true);
    setStatusMessage('Obtendo localização...');
    
    if (mapRef.current) {
      (mapRef.current as any).locateUser?.();
    }

    setTimeout(() => {
      setIsLocating(false);
      setStatusMessage('Localização atualizada');
      setLastUpdate(new Date());
    }, 1500);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {
        // Fallback: apenas expandir visualmente
        setIsFullscreen(true);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => {
        setIsFullscreen(false);
      });
    }
  };

  const toggleNDVI = () => {
    setShowNDVI(!showNDVI);
    setStatusMessage(showNDVI ? 'NDVI desligado' : 'NDVI ativado');
  };

  // Atualizar status
  useEffect(() => {
    const timer = setTimeout(() => {
      setStatusMessage(showNDVI ? `NDVI ativo • ${polygons.length} áreas` : 'Camada base');
    }, 2000);
    return () => clearTimeout(timer);
  }, [showNDVI, polygons.length]);

  // Efeito de vibração em ações
  const triggerHaptic = () => {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  return (
    <div 
      className={`relative flex flex-col bg-gray-900 overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50' : 'h-[100dvh] w-full'
      } ${className}`}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-[1000] flex items-center justify-between p-3 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center shadow-lg">
            <Navigation size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm leading-tight">Mapa NDVI</h1>
            <p className="text-white/70 text-xs">{fazendaId || 'Fazenda Demo'}</p>
          </div>
        </div>
        
        <button
          onClick={() => {
            triggerHaptic();
            toggleFullscreen();
          }}
          className="w-10 h-10 bg-black/40 backdrop-blur-sm rounded-xl flex items-center justify-center text-white active:scale-95 transition-transform"
        >
          {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
        </button>
      </div>

      {/* Mapa */}
      <div className="flex-1 relative">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          zoomControl={false}
          attributionControl={false}
          className="h-full w-full"
          ref={mapRef}
        >
          {/* Camada Base - Satélite */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; Esri'
          />
          
          {/* Camada de Labels */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; Esri'
            opacity={0.5}
          />

          {/* Controles Touch */}
          <TouchZoomController />
          
          {/* Localização do Usuário */}
          <UserLocationMarker />
          
          {/* Overlay NDVI */}
          <NDVIOverlay 
            polygons={polygons} 
            visible={showNDVI}
            onPolygonClick={onPolygonClick}
          />
        </MapContainer>

        {/* Botão Minha Localização */}
        <button
          onClick={() => {
            triggerHaptic();
            handleLocateUser();
          }}
          disabled={isLocating}
          className={`absolute top-20 right-3 z-[1000] w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 ${
            isLocating 
              ? 'bg-blue-500 text-white animate-pulse' 
              : 'bg-white text-blue-600 hover:bg-blue-50'
          }`}
          style={{ touchAction: 'manipulation' }}
        >
          <Crosshair size={24} className={isLocating ? 'animate-spin' : ''} />
        </button>

        {/* Botão Toggle NDVI */}
        <button
          onClick={() => {
            triggerHaptic();
            toggleNDVI();
          }}
          className={`absolute top-36 right-3 z-[1000] w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 ${
            showNDVI 
              ? 'bg-green-500 text-white' 
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
          style={{ touchAction: 'manipulation' }}
        >
          <Layers size={24} />
        </button>

        {/* Indicador de Zoom (simplificado) */}
        <div className="absolute bottom-32 left-3 z-[1000] flex flex-col gap-2">
          <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-xs">
            <span className="font-mono">{isLocating ? '●●●' : '●'}</span> GPS
          </div>
        </div>
      </div>

      {/* Painel Inferior - Legenda e Status */}
      <div className="bg-white rounded-t-2xl shadow-2xl z-[1001]">
        {/* Handle para arrastar */}
        <div className="w-full flex justify-center pt-2 pb-1">
          <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
        </div>

        {/* Status */}
        <div className="px-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${showNDVI ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="text-sm font-medium text-gray-700">{statusMessage}</span>
            </div>
            <span className="text-xs text-gray-400">
              {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Legenda NDVI */}
        {showNDVI && (
          <div className="px-4 pb-4 pt-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Legenda NDVI</p>
            <div className="grid grid-cols-5 gap-2">
              {(Object.keys(NDVI_COLORS) as NDVILevel[]).map((level) => (
                <div key={level} className="flex flex-col items-center gap-1">
                  <div 
                    className={`w-full h-8 rounded-lg ${NDVI_COLORS[level].bg} shadow-sm`}
                    style={{ minWidth: '48px', minHeight: '32px' }}
                  ></div>
                  <span className="text-[10px] text-gray-500 text-center leading-tight">
                    {level === 'excellent' && 'Excel.'}
                    {level === 'good' && 'Bom'}
                    {level === 'moderate' && 'Mod.'}
                    {level === 'poor' && 'Ruim'}
                    {level === 'very-poor' && 'M. Ruim'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ações Rápidas */}
        <div className="px-4 pb-6 pt-2 border-t border-gray-100">
          <div className="flex gap-3">
            <button
              onClick={() => triggerHaptic()}
              className="flex-1 bg-green-600 text-white py-3 px-4 rounded-xl font-semibold text-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
              style={{ minHeight: '48px' }}
            >
              <Navigation size={18} />
              Nova Inspeção
            </button>
            <button
              onClick={() => triggerHaptic()}
              className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold text-sm active:scale-95 transition-transform"
              style={{ minHeight: '48px' }}
            >
              Detalhes
            </button>
          </div>
        </div>
      </div>

      {/* Dica de uso (aparece uma vez) */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="bg-black/70 text-white text-xs px-4 py-2 rounded-full backdrop-blur-sm opacity-0 animate-fade-out">
          Toque 2x para zoom • 2 dedos para zoom out
        </div>
      </div>

      {/* Estilos adicionais */}
      <style>{`
        @keyframes fade-out {
          0% { opacity: 1; }
          70% { opacity: 1; }
          100% { opacity: 0; }
        }
        .animate-fade-out {
          animation: fade-out 4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

// Exportar tipos
export type { NDVIPolygon, NDVILevel, MapaNDVIMobileProps };
