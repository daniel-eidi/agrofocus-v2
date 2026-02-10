import { useState, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Layers, Calendar, ChevronLeft, ChevronRight, Loader2, 
  RefreshCw, Grid3X3, Map as MapIcon
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
  geometria: any;
  status?: string;
}

interface ImagemNDVI {
  id: string;
  data: string;
  cobertura_nuvens: number;
  tile_url: string | null;
}

interface DadosFazenda {
  fazenda_id: number;
  talhoes: Talhao[];
  ndvi: {
    imagens: ImagemNDVI[];
    modo: string;
  };
  total_talhoes: number;
  area_total_ha: number;
}

// ============================================
// PALETA DE CORES NDVI
// ============================================
const NDVI_PALETTE = [
  { value: -0.1, color: '#d73027', label: 'Solo/Água' },
  { value: 0.0, color: '#fc8d59', label: 'Baixo' },
  { value: 0.2, color: '#fee08b', label: 'Moderado' },
  { value: 0.4, color: '#d9ef8b', label: 'Bom' },
  { value: 0.6, color: '#91cf60', label: 'Muito Bom' },
  { value: 0.8, color: '#1a9850', label: 'Excelente' }
];

// ============================================
// COMPONENTE: LEGENDA NDVI
// ============================================
function NDVILegend() {
  return (
    <div className="absolute bottom-32 left-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-3 z-[1000] border border-gray-100">
      <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
        <div className="w-2 h-2 rounded-full bg-green-500"></div>
        NDVI - Saúde Vegetal
      </h4>
      <div className="space-y-1.5">
        {NDVI_PALETTE.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div 
              className="w-4 h-3 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[10px] text-gray-600">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE: BOUNDS DO MAPA
// ============================================
function MapBounds({ geometrias }: { geometrias: any[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (geometrias.length === 0) return;
    
    // Calcular bounds de todas as geometrias
    const allCoords: [number, number][] = [];
    geometrias.forEach(geom => {
      if (geom?.coordinates?.[0]) {
        const coords = geom.coordinates[0].map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
        allCoords.push(...coords);
      }
    });
    
    if (allCoords.length > 0) {
      map.fitBounds(allCoords, { padding: [50, 50] });
    }
  }, [geometrias, map]);
  
  return null;
}

// ============================================
// COMPONENTE: HEADER DO MAPA
// ============================================
function MapHeader({ 
  titulo, 
  subtitulo, 
  onRefresh, 
  loading,
  viewMode,
  onToggleView
}: { 
  titulo: string;
  subtitulo: string;
  onRefresh: () => void;
  loading: boolean;
  viewMode: 'todos' | 'individual';
  onToggleView: () => void;
}) {
  return (
    <div className="bg-white shadow-sm p-4 z-10 border-b">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Título */}
        <div>
          <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Layers className="text-green-600 w-5 h-5" />
            {titulo}
          </h1>
          <p className="text-sm text-gray-500">{subtitulo}</p>
        </div>
        
        {/* Controles */}
        <div className="flex items-center gap-2">
          {/* Toggle de Visualização */}
          <button
            onClick={onToggleView}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            {viewMode === 'todos' ? (
              <><MapIcon className="w-3.5 h-3.5" /> Ver Individual</>
            ) : (
              <><Grid3X3 className="w-3.5 h-3.5" /> Ver Todos</>
            )}
          </button>
          
          {/* Refresh */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE: TIMELINE SIMPLIFICADA
// ============================================
function Timeline({ 
  imagens, 
  selectedIndex, 
  onSelect 
}: { 
  imagens: ImagemNDVI[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  if (imagens.length === 0) return null;
  
  return (
    <div className="bg-white border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-10">
      <div className="p-3 border-b flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Linha do Tempo ({imagens.length} imagens)
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onSelect(Math.max(0, selectedIndex - 1))}
            disabled={selectedIndex === 0}
            className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-600 min-w-[50px] text-center">
            {selectedIndex + 1} / {imagens.length}
          </span>
          <button
            onClick={() => onSelect(Math.min(imagens.length - 1, selectedIndex + 1))}
            disabled={selectedIndex === imagens.length - 1}
            className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto p-3 flex gap-2" style={{ scrollbarWidth: 'thin' }}>
        {imagens.map((img, idx) => {
          const isSelected = idx === selectedIndex;
          const dateObj = parseISO(img.data);
          
          return (
            <button
              key={img.id}
              onClick={() => onSelect(idx)}
              className={`
                flex-shrink-0 w-20 h-16 rounded-lg border-2 transition-all relative overflow-hidden
                ${isSelected 
                  ? 'border-green-500 ring-2 ring-green-200 shadow-md' 
                  : 'border-gray-200 hover:border-gray-400'
                }
              `}
            >
              {/* Indicador de cor baseado na cobertura de nuvens */}
              <div 
                className="absolute inset-0 opacity-30"
                style={{ 
                  background: img.cobertura_nuvens > 30 
                    ? '#ef4444' 
                    : img.cobertura_nuvens > 10 
                      ? '#eab308' 
                      : '#22c55e'
                }} 
              />
              
              <div className="relative z-10 p-1.5 flex flex-col justify-between h-full">
                <div className={`font-bold text-xs ${isSelected ? 'text-green-800' : 'text-gray-700'}`}>
                  {format(dateObj, 'dd/MM', { locale: ptBR })}
                </div>
                <div className="text-[9px] text-gray-500">
                  {format(dateObj, 'yyyy')}
                </div>
                <div className="text-[9px] text-gray-600 bg-white/80 rounded px-1 w-fit">
                  {Math.round(img.cobertura_nuvens)}% ☁️
                </div>
              </div>
              
              {isSelected && (
                <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-green-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function Monitoramento() {
  // Estados
  const [selectedTalhaoId, setSelectedTalhaoId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'todos' | 'individual'>('todos');
  const [dadosFazenda, setDadosFazenda] = useState<DadosFazenda | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTalhoes, setLoadingTalhoes] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // NDVI Estados
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [ndviTileUrl, setNdviTileUrl] = useState<string | null>(null);
  const [loadingNdvi, setLoadingNdvi] = useState(false);
  const [showNdvi, setShowNdvi] = useState(true);

  // Carregar lista de talhões
  useEffect(() => {
    const fetchTalhoes = async () => {
      setLoadingTalhoes(true);
      try {
        const response = await apiGet('/api/monitoramento/talhoes');
        if (response.sucesso && response.talhoes) {
          // Se há talhões, selecionar o primeiro e carregar a fazenda
          if (response.talhoes.length > 0) {
            const primeiro = response.talhoes[0];
            setSelectedTalhaoId(primeiro.id);
            carregarDadosFazenda(primeiro.fazenda_id);
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

  // Carregar dados da fazenda (todos os talhões)
  const carregarDadosFazenda = useCallback(async (fazendaId: number) => {
    if (!fazendaId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiGet(`/api/monitoramento/fazenda/${fazendaId}`);
      if (response.sucesso) {
        setDadosFazenda(response);
        setSelectedImageIndex(0);
        
        // Se tiver imagens NDVI, carregar a primeira
        if (response.ndvi?.imagens?.length > 0) {
          carregarNdviEspecifico(response.ndvi.imagens[0], response.talhoes);
        }
      } else {
        setError(response.erro || 'Erro ao carregar dados');
      }
    } catch (err) {
      console.error('Erro ao carregar dados da fazenda:', err);
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar NDVI específico
  const carregarNdviEspecifico = async (imagem: ImagemNDVI, talhoesList: Talhao[]) => {
    if (talhoesList.length === 0) return;
    
    setLoadingNdvi(true);
    try {
      // Se estiver em modo individual, usar o talhão selecionado
      // Se estiver em modo todos, usar o primeiro talhão como referência
      const talhaoId = viewMode === 'individual' && selectedTalhaoId 
        ? selectedTalhaoId 
        : talhoesList[0].id;
        
      const response = await apiGet(
        `/api/monitoramento/ndvi/${talhaoId}?imageId=${encodeURIComponent(imagem.id)}&date=${imagem.data}`
      );
      if (response.sucesso) {
        console.log('🗺️ TILE URL RECEBIDA:', response.tile_url);
        setNdviTileUrl(response.tile_url);
      }
    } catch (err) {
      console.error('Erro ao carregar NDVI:', err);
      setNdviTileUrl(null);
    } finally {
      setLoadingNdvi(false);
    }
  };

  // Alternar modo de visualização
  const toggleViewMode = () => {
    setViewMode(prev => prev === 'todos' ? 'individual' : 'todos');
  };

  // Geometrias para o mapa
  const geometriasVisiveis = useMemo(() => {
    if (!dadosFazenda?.talhoes) return [];
    
    if (viewMode === 'individual' && selectedTalhaoId) {
      const talhao = dadosFazenda.talhoes.find(t => t.id === selectedTalhaoId);
      return talhao?.geometria ? [talhao.geometria] : [];
    }
    
    return dadosFazenda.talhoes
      .filter(t => t.geometria)
      .map(t => t.geometria);
  }, [dadosFazenda, viewMode, selectedTalhaoId]);

  // Centro do mapa
  const mapCenter = useMemo(() => {
    if (dadosFazenda?.talhoes?.[0]?.centroide) {
      return [dadosFazenda.talhoes[0].centroide.lat, dadosFazenda.talhoes[0].centroide.lng];
    }
    return [-22.10, -51.15];
  }, [dadosFazenda]);

  // Título e subtítulo
  const titulo = viewMode === 'todos' 
    ? 'Todos os Campos'
    : dadosFazenda?.talhoes?.find(t => t.id === selectedTalhaoId)?.nome || 'Super Mapa';
    
  const subtitulo = dadosFazenda?.talhoes?.[0]?.fazenda_nome 
    ? `${dadosFazenda.talhoes[0].fazenda_nome} • ${dadosFazenda.total_talhoes} talhões • ${Number(dadosFazenda.area_total_ha || 0).toFixed(1)} ha`
    : 'Carregando...';

  return (
    <div className="flex flex-col h-screen bg-gray-100" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <MapHeader 
        titulo={titulo}
        subtitulo={subtitulo}
        onRefresh={() => dadosFazenda && carregarDadosFazenda(dadosFazenda.fazenda_id)}
        loading={loading}
        viewMode={viewMode}
        onToggleView={toggleViewMode}
      />

      {/* Conteúdo Principal */}
      <div className="flex-1 relative flex flex-col overflow-hidden">
        {/* Loading */}
        {(loading || loadingTalhoes) && (
          <div className="absolute inset-0 bg-white/80 z-[1001] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
              <span className="text-gray-600">Carregando dados...</span>
            </div>
          </div>
        )}

        {/* Erro */}
        {error && !loading && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1001] bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg shadow-lg">
            {error}
          </div>
        )}

        {/* Mapa */}
        <div className="flex-1 relative z-0">
          <MapContainer
            center={mapCenter as [number, number]}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
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

            {/* Polígonos dos Talhões */}
            {dadosFazenda?.talhoes?.map((talhao) => {
              if (!talhao.geometria) return null;
              
              // Em modo individual, destacar o selecionado
              const isSelected = viewMode === 'individual' && talhao.id === selectedTalhaoId;
              const isVisible = viewMode === 'todos' || isSelected;
              
              if (!isVisible) return null;
              
              const positions = talhao.geometria.coordinates[0].map((coord: number[]) => [coord[1], coord[0]]);
              
              return (
                <Polygon
                  key={talhao.id}
                  positions={positions}
                  pathOptions={{
                    color: isSelected ? '#ffffff' : '#10b981',
                    weight: isSelected ? 3 : 2,
                    fillOpacity: 0,
                    dashArray: isSelected ? '5, 5' : undefined
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <strong>{talhao.nome}</strong>
                      <div className="text-gray-600">{Number(talhao.area_hectares || 0).toFixed(1)} ha</div>
                      {talhao.cultura && <div className="text-green-600">{talhao.cultura}</div>}
                    </div>
                  </Popup>
                </Polygon>
              );
            })}

            {/* Ajustar bounds */}
            {geometriasVisiveis.length > 0 && (
              <MapBounds geometrias={geometriasVisiveis} />
            )}
          </MapContainer>

          {/* Legenda NDVI */}
          {showNdvi && <NDVILegend />}

          {/* Loading NDVI */}
          {loadingNdvi && (
            <div className="absolute top-4 right-4 bg-white shadow-lg rounded-lg px-3 py-2 flex items-center gap-2 z-[1000]">
              <Loader2 className="w-4 h-4 animate-spin text-green-600" />
              <span className="text-sm text-gray-600">Carregando NDVI...</span>
            </div>
          )}

          {/* Toggle NDVI */}
          <button
            onClick={() => setShowNdvi(!showNdvi)}
            className={`absolute top-4 left-4 z-[1000] px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium transition-colors ${
              showNdvi 
                ? 'bg-green-100 text-green-700 border border-green-200' 
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {showNdvi ? '✓ NDVI Ativo' : 'NDVI Inativo'}
          </button>
        </div>

        {/* Timeline */}
        {dadosFazenda?.ndvi?.imagens && dadosFazenda.ndvi.imagens.length > 0 && (
          <Timeline
            imagens={dadosFazenda.ndvi.imagens}
            selectedIndex={selectedImageIndex}
            onSelect={(idx) => {
              setSelectedImageIndex(idx);
              carregarNdviEspecifico(dadosFazenda.ndvi.imagens[idx], dadosFazenda.talhoes);
            }}
          />
        )}
      </div>
    </div>
  );
}
