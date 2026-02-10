import { useState, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Layers, Activity, Bug, AlertTriangle, Tractor, Eye, EyeOff,
  ChevronLeft, ChevronRight, Loader2, MapPin, CloudRain,
  RefreshCw, Info, Calendar
} from 'lucide-react';
import { apiGet } from '../utils/api';

// ============================================
// TIPOS
// ============================================
interface Talhao {
  id: number;
  nome: string;
  area_hectares: number;
  fazenda_id: number;
  fazenda_nome: string;
  cultura?: string;
  centroide: { lat: number; lng: number };
  tem_geometria: boolean;
}

interface ImagemNDVI {
  id: string;
  data: string;
  cobertura_nuvens: number;
  tile_url: string | null;
}

interface Inspecao {
  id: number;
  tipo: string;
  categoria: string;
  latitude: number;
  longitude: number;
  data: string;
  severidade: string;
  status: string;
  cultura: string;
}

interface EquipamentoAtivo {
  id: number;
  nome: string;
  tipo: string;
  lat: number;
  lng: number;
  ultima_atualizacao: string;
  velocidade: number;
}

interface RastroDia {
  equipamento_id: number;
  coordenadas: [number, number, number][];
}

interface DadosMonitoramento {
  talhao: {
    id: number;
    nome: string;
    area_hectares: number;
    fazenda_nome: string;
    centroide: { lat: number; lng: number };
    geometria: any;
  };
  ndvi: {
    imagens: ImagemNDVI[];
    modo: string;
  };
  inspecoes: Inspecao[];
  maquinario: {
    ativos: EquipamentoAtivo[];
    rastro_dia: RastroDia[];
  };
}

// ============================================
// ÍCONES CUSTOMIZADOS
// ============================================
const createCustomIcon = (color: string, iconType: 'bug' | 'alert' | 'leaf' | 'tractor') => {
  const iconSvg = {
    bug: `<path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 0 2h-1v1a7 7 0 0 1-7 7h-4a7 7 0 0 1-7-7v-1H2a1 1 0 0 1 0-2h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2zm0 7H8a5 5 0 0 0-5 5v1a5 5 0 0 0 5 5h4a5 5 0 0 0 5-5v-1a5 5 0 0 0-5-5h-4z"/>`,
    alert: `<path d="M12 2L2 22h20L12 2zm0 4l7.53 14H4.47L12 6zm-1 5v4h2v-4h-2zm0 6v2h2v-2h-2z"/>`,
    leaf: `<path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"/>`,
    tractor: `<circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="3.5"/><path d="M5.5 17.5H3V14l2-4h8l1.5 4h2V10h2v4.5l1 3"/>`
  };

  return L.divIcon({
    html: `
      <div style="
        background: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      ">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="18" height="18">
          ${iconSvg[iconType]}
        </svg>
      </div>
    `,
    className: 'custom-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

const severidadeColors: Record<string, string> = {
  baixa: '#22c55e',
  media: '#eab308',
  alta: '#f97316',
  critica: '#ef4444'
};

const categoriaIcons: Record<string, 'bug' | 'alert' | 'leaf'> = {
  praga: 'bug',
  doenca: 'leaf',
  nutricional: 'alert',
  fisiologico: 'alert',
  mecanico: 'alert',
  climatico: 'alert',
  outro: 'alert',
  geral: 'leaf'
};

// ============================================
// COMPONENTES AUXILIARES
// ============================================
function MapBounds({ geometry, centroide }: { geometry: any; centroide: { lat: number; lng: number } | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (geometry?.coordinates?.[0]) {
      const coords = geometry.coordinates[0].map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
      map.fitBounds(coords, { padding: [50, 50] });
    } else if (centroide && centroide.lat != null && centroide.lng != null) {
      map.setView([centroide.lat, centroide.lng], 15);
    }
  }, [geometry, centroide, map]);
  
  return null;
}

function NDVILegend() {
  return (
    <div className="absolute bottom-24 left-4 bg-white rounded-lg shadow-lg p-3 z-[1000]">
      <h4 className="text-xs font-semibold text-gray-700 mb-2">NDVI</h4>
      <div className="flex items-center gap-1">
        <div className="w-24 h-3 rounded" style={{
          background: 'linear-gradient(to right, #ef4444, #eab308, #22c55e)'
        }} />
      </div>
      <div className="flex justify-between text-[10px] text-gray-500 mt-1">
        <span>Baixo</span>
        <span>Médio</span>
        <span>Alto</span>
      </div>
    </div>
  );
}

function InspecoesLegend() {
  return (
    <div className="absolute bottom-24 right-4 bg-white rounded-lg shadow-lg p-3 z-[1000]">
      <h4 className="text-xs font-semibold text-gray-700 mb-2">Inspeções</h4>
      <div className="space-y-1">
        {Object.entries(severidadeColors).map(([sev, color]) => (
          <div key={sev} className="flex items-center gap-2 text-[10px]">
            <div className="w-3 h-3 rounded-full" style={{ background: color }} />
            <span className="capitalize">{sev}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function Monitoramento() {
  // Estados
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);
  const [selectedTalhaoId, setSelectedTalhaoId] = useState<number | null>(null);
  const [dados, setDados] = useState<DadosMonitoramento | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTalhoes, setLoadingTalhoes] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Camadas visíveis
  const [showNdvi, setShowNdvi] = useState(true);
  const [showInspecoes, setShowInspecoes] = useState(true);
  const [showMaquinario, setShowMaquinario] = useState(true);
  
  // NDVI Timeline
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [ndviTileUrl, setNdviTileUrl] = useState<string | null>(null);
  const [ndviStats, setNdviStats] = useState<any>(null);
  const [loadingNdvi, setLoadingNdvi] = useState(false);

  // Carregar lista de talhões
  useEffect(() => {
    const fetchTalhoes = async () => {
      setLoadingTalhoes(true);
      try {
        const response = await apiGet('/api/monitoramento/talhoes');
        if (response.sucesso && response.talhoes) {
          setTalhoes(response.talhoes);
          // Auto-selecionar primeiro talhão com geometria
          const comGeometria = response.talhoes.find((t: Talhao) => t.tem_geometria);
          if (comGeometria) {
            setSelectedTalhaoId(comGeometria.id);
          } else if (response.talhoes.length > 0) {
            setSelectedTalhaoId(response.talhoes[0].id);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar talhões:', err);
        setError('Erro ao carregar talhões');
      } finally {
        setLoadingTalhoes(false);
      }
    };
    
    fetchTalhoes();
  }, []);

  // Carregar dados do talhão selecionado
  const carregarDados = useCallback(async () => {
    if (!selectedTalhaoId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiGet(`/api/monitoramento/camadas/${selectedTalhaoId}`);
      if (response.sucesso) {
        setDados(response);
        setSelectedImageIndex(0);
        
        // Se tiver imagens NDVI, carregar a primeira
        if (response.ndvi?.imagens?.length > 0) {
          carregarNdviEspecifico(response.ndvi.imagens[0]);
        }
      } else {
        setError(response.erro || 'Erro ao carregar dados');
      }
    } catch (err) {
      console.error('Erro ao carregar dados de monitoramento:', err);
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  }, [selectedTalhaoId]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Carregar NDVI específico para uma imagem
  const carregarNdviEspecifico = async (imagem: ImagemNDVI) => {
    if (!selectedTalhaoId) return;
    
    setLoadingNdvi(true);
    try {
      const response = await apiGet(
        `/api/monitoramento/ndvi/${selectedTalhaoId}?imageId=${encodeURIComponent(imagem.id)}&date=${imagem.data}`
      );
      if (response.sucesso) {
        setNdviTileUrl(response.tile_url);
        setNdviStats(response.stats);
      }
    } catch (err) {
      console.error('Erro ao carregar NDVI:', err);
      setNdviTileUrl(null);
    } finally {
      setLoadingNdvi(false);
    }
  };

  // Navegar na timeline
  const navegarTimeline = (direcao: 'prev' | 'next') => {
    if (!dados?.ndvi?.imagens?.length) return;
    
    let novoIndex = selectedImageIndex;
    if (direcao === 'prev' && selectedImageIndex > 0) {
      novoIndex = selectedImageIndex - 1;
    } else if (direcao === 'next' && selectedImageIndex < dados.ndvi.imagens.length - 1) {
      novoIndex = selectedImageIndex + 1;
    }
    
    if (novoIndex !== selectedImageIndex) {
      setSelectedImageIndex(novoIndex);
      carregarNdviEspecifico(dados.ndvi.imagens[novoIndex]);
    }
  };

  // Geometria formatada para Leaflet
  const polygonPositions = useMemo(() => {
    if (!dados?.talhao?.geometria?.coordinates?.[0]) return null;
    return dados.talhao.geometria.coordinates[0].map((coord: number[]) => [coord[1], coord[0]]);
  }, [dados]);

  // Rastro do maquinário
  const rastroPositions = useMemo(() => {
    if (!dados?.maquinario?.rastro_dia?.[0]?.coordenadas) return [];
    return dados.maquinario.rastro_dia[0].coordenadas.map(
      (coord: [number, number, number]) => [coord[0], coord[1]] as [number, number]
    );
  }, [dados]);

  return (
    <div className="flex flex-col h-screen bg-gray-100" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <div className="bg-white shadow-sm p-3 z-10 border-b">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Título e Seletor de Talhão */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Layers className="text-green-600 w-5 h-5" />
              <h1 className="text-lg font-bold text-gray-800">Super Mapa</h1>
            </div>
            
            <select
              value={selectedTalhaoId || ''}
              onChange={(e) => setSelectedTalhaoId(Number(e.target.value))}
              disabled={loadingTalhoes}
              className="px-3 py-1.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Selecione um talhão...</option>
              {talhoes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fazenda_nome} - {t.nome} ({Number(t.area_hectares || 0).toFixed(1)} ha)
                </option>
              ))}
            </select>
            
            <button
              onClick={carregarDados}
              disabled={loading || !selectedTalhaoId}
              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Controles de Camadas */}
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
            <button
              onClick={() => setShowNdvi(!showNdvi)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                showNdvi 
                  ? 'bg-green-100 text-green-700 border border-green-200' 
                  : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              {showNdvi ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              NDVI
            </button>
            
            <button
              onClick={() => setShowInspecoes(!showInspecoes)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                showInspecoes 
                  ? 'bg-orange-100 text-orange-700 border border-orange-200' 
                  : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              {showInspecoes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              Inspeções ({dados?.inspecoes?.length || 0})
            </button>
            
            <button
              onClick={() => setShowMaquinario(!showMaquinario)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                showMaquinario 
                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                  : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              {showMaquinario ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              Maquinário ({dados?.maquinario?.ativos?.length || 0})
            </button>
          </div>

          {/* Stats NDVI */}
          {ndviStats && showNdvi && (
            <div className="flex gap-3 text-sm bg-gray-50 p-2 rounded-lg border">
              <div className="px-2 border-r border-gray-200">
                <span className="block text-gray-400 text-[10px] uppercase">Média</span>
                <span className="font-bold text-green-700">{Number(ndviStats.mean || ndviStats.NDVI_mean || 0).toFixed(2)}</span>
              </div>
              <div className="px-2 border-r border-gray-200">
                <span className="block text-gray-400 text-[10px] uppercase">Máx</span>
                <span className="font-bold text-green-600">{Number(ndviStats.max || ndviStats.NDVI_max || 0).toFixed(2)}</span>
              </div>
              <div className="px-2">
                <span className="block text-gray-400 text-[10px] uppercase">Min</span>
                <span className="font-bold text-red-500">{Number(ndviStats.min || ndviStats.NDVI_min || 0).toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 relative flex flex-col overflow-hidden">
        {/* Estado de carregamento */}
        {(loading || loadingTalhoes) && (
          <div className="absolute inset-0 bg-white/80 z-[1001] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
              <span className="text-gray-600">Carregando dados de monitoramento...</span>
            </div>
          </div>
        )}

        {/* Erro */}
        {error && !loading && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1001] bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Mapa */}
        <div className="flex-1 relative z-0">
          <MapContainer
            center={dados?.talhao?.centroide 
              ? [dados.talhao.centroide.lat, dados.talhao.centroide.lng] 
              : [-22.10, -51.15]}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            {/* Layer Base: Satélite Esri */}
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles © Esri"
            />

            {/* Layer NDVI (quando ativo e disponível) */}
            {showNdvi && ndviTileUrl && !loadingNdvi && (
              <TileLayer
                key={ndviTileUrl}
                url={ndviTileUrl}
                opacity={0.75}
              />
            )}

            {/* Polígono do Talhão */}
            {polygonPositions && (
              <Polygon
                positions={polygonPositions}
                pathOptions={{
                  color: 'white',
                  weight: 2,
                  fillOpacity: 0,
                  dashArray: '5, 5'
                }}
              />
            )}

            {/* Ajustar bounds do mapa */}
            {dados?.talhao && (
              <MapBounds 
                geometry={dados.talhao.geometria} 
                centroide={dados.talhao.centroide}
              />
            )}

            {/* Markers de Inspeções */}
            {showInspecoes && dados?.inspecoes?.map((insp) => (
              <Marker
                key={`insp-${insp.id}`}
                position={[insp.latitude, insp.longitude]}
                icon={createCustomIcon(
                  severidadeColors[insp.severidade] || '#6b7280',
                  categoriaIcons[insp.categoria] || 'alert'
                )}
              >
                <Popup>
                  <div className="text-sm min-w-[200px]">
                    <div className="font-bold text-gray-800 flex items-center gap-2 mb-2">
                      <Bug className="w-4 h-4" />
                      {insp.tipo}
                    </div>
                    <div className="space-y-1 text-gray-600">
                      <div className="flex justify-between">
                        <span>Categoria:</span>
                        <span className="capitalize font-medium">{insp.categoria}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Severidade:</span>
                        <span 
                          className="capitalize font-medium px-2 py-0.5 rounded text-white text-xs"
                          style={{ background: severidadeColors[insp.severidade] }}
                        >
                          {insp.severidade}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Data:</span>
                        <span className="font-medium">
                          {format(parseISO(insp.data), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span className="capitalize font-medium">{insp.status}</span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Rastro do Maquinário */}
            {showMaquinario && rastroPositions.length > 0 && (
              <Polyline
                positions={rastroPositions}
                pathOptions={{
                  color: '#3b82f6',
                  weight: 3,
                  opacity: 0.7,
                  dashArray: '10, 5'
                }}
              />
            )}

            {/* Markers de Maquinário */}
            {showMaquinario && dados?.maquinario?.ativos?.map((eq) => (
              <Marker
                key={`eq-${eq.id}`}
                position={[eq.lat, eq.lng]}
                icon={createCustomIcon('#3b82f6', 'tractor')}
              >
                <Popup>
                  <div className="text-sm min-w-[180px]">
                    <div className="font-bold text-gray-800 flex items-center gap-2 mb-2">
                      <Tractor className="w-4 h-4" />
                      {eq.nome}
                    </div>
                    <div className="space-y-1 text-gray-600">
                      <div className="flex justify-between">
                        <span>Tipo:</span>
                        <span className="font-medium">{eq.tipo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Velocidade:</span>
                        <span className="font-medium">{eq.velocidade} km/h</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Atualizado:</span>
                        <span className="font-medium">
                          {format(parseISO(eq.ultima_atualizacao), "HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Legendas */}
          {showNdvi && <NDVILegend />}
          {showInspecoes && (dados?.inspecoes?.length ?? 0) > 0 && <InspecoesLegend />}

          {/* Indicador de modo Mock */}
          {dados?.ndvi?.modo === 'mock' && showNdvi && (
            <div className="absolute top-4 left-4 bg-yellow-100 border border-yellow-300 text-yellow-800 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 z-[1000]">
              <Info className="w-4 h-4" />
              Modo simulado (GEE offline)
            </div>
          )}

          {/* Loading NDVI */}
          {loadingNdvi && (
            <div className="absolute top-4 right-4 bg-white shadow-lg rounded-lg px-3 py-2 flex items-center gap-2 z-[1000]">
              <Loader2 className="w-4 h-4 animate-spin text-green-600" />
              <span className="text-sm text-gray-600">Carregando NDVI...</span>
            </div>
          )}
        </div>

        {/* Timeline de NDVI */}
        {showNdvi && dados?.ndvi?.imagens && dados.ndvi.imagens.length > 0 && (
          <div className="bg-white border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-10">
            <div className="p-2 border-b flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Linha do Tempo NDVI ({dados.ndvi.imagens.length} imagens)
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navegarTimeline('prev')}
                  disabled={selectedImageIndex === 0}
                  className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-600 min-w-[60px] text-center">
                  {selectedImageIndex + 1} / {dados.ndvi.imagens.length}
                </span>
                <button
                  onClick={() => navegarTimeline('next')}
                  disabled={selectedImageIndex === dados.ndvi.imagens.length - 1}
                  className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto p-3 flex gap-3 items-center" style={{ scrollbarWidth: 'thin' }}>
              {dados.ndvi.imagens.map((img, idx) => {
                const isSelected = idx === selectedImageIndex;
                const dateObj = parseISO(img.data);
                
                return (
                  <button
                    key={img.id}
                    onClick={() => {
                      setSelectedImageIndex(idx);
                      carregarNdviEspecifico(img);
                    }}
                    className={`
                      flex-shrink-0 w-28 h-20 rounded-lg border-2 transition-all relative overflow-hidden text-left
                      ${isSelected 
                        ? 'border-green-500 ring-2 ring-green-200 shadow-md' 
                        : 'border-gray-200 hover:border-gray-400'
                      }
                    `}
                  >
                    {/* Fundo com gradiente baseado na cobertura de nuvens */}
                    <div 
                      className="absolute inset-0"
                      style={{ 
                        background: `linear-gradient(135deg, 
                          ${img.cobertura_nuvens > 30 ? '#fecaca' : (img.cobertura_nuvens > 10 ? '#fef3c7' : '#dcfce7')} 0%, 
                          ${img.cobertura_nuvens > 30 ? '#fca5a5' : (img.cobertura_nuvens > 10 ? '#fde68a' : '#86efac')} 100%)`
                      }} 
                    />
                    
                    <div className="absolute inset-0 flex items-center justify-center opacity-10">
                      <Activity size={28} />
                    </div>

                    {/* Info */}
                    <div className="relative z-10 p-2 flex flex-col justify-between h-full">
                      <div>
                        <div className={`font-bold text-sm ${isSelected ? 'text-green-800' : 'text-gray-700'}`}>
                          {format(dateObj, 'dd MMM', { locale: ptBR })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(dateObj, 'yyyy')}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs text-gray-600 bg-white/70 rounded px-1.5 py-0.5 w-fit">
                        <CloudRain className="w-3 h-3" /> 
                        {Math.round(Number(img.cobertura_nuvens || 0))}%
                      </div>
                    </div>

                    {/* Indicador de seleção */}
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Mensagem quando não há dados */}
        {!loading && !loadingTalhoes && !dados && selectedTalhaoId && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80 z-[500]">
            <div className="text-center text-gray-500">
              <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="font-medium">Nenhum dado disponível</p>
              <p className="text-sm">Selecione outro talhão ou tente novamente</p>
            </div>
          </div>
        )}

        {/* Mensagem quando nenhum talhão selecionado */}
        {!loading && !loadingTalhoes && !selectedTalhaoId && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80 z-[500]">
            <div className="text-center text-gray-500">
              <Layers className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="font-medium">Selecione um talhão</p>
              <p className="text-sm">Use o seletor acima para escolher um talhão</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
