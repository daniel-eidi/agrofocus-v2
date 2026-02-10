import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import './DelineamentoAuto.css';

/**
 * Componente principal de Auto-Delineamento
 * Permite: detectar talhões automaticamente, visualizar preview, 
 * ajustar boundaries manualmente e exportar
 */
const DelineamentoAuto = ({ fazendaId, onSave }) => {
    const [loading, setLoading] = useState(false);
    const [talhoes, setTalhoes] = useState([]);
    const [algoritmo, setAlgoritmo] = useState('watershed');
    const [previewMode, setPreviewMode] = useState(false);
    const [selectedTalhao, setSelectedTalhao] = useState(null);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState(null);
    const [zonas, setZonas] = useState(null);
    const [algoritmosDisponiveis, setAlgoritmosDisponiveis] = useState([]);

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

    // Carregar algoritmos disponíveis
    useEffect(() => {
        fetchAlgoritmos();
    }, []);

    const fetchAlgoritmos = async () => {
        try {
            const response = await fetch(`${API_URL}/talhoes/algoritmos`);
            const data = await response.json();
            if (data.success) {
                setAlgoritmosDisponiveis(data.algoritmos);
            }
        } catch (err) {
            console.error('Erro ao carregar algoritmos:', err);
            // Fallback
            setAlgoritmosDisponiveis([
                { id: 'watershed', nome: 'Watershed Algorithm', iou_estimado: 0.75 },
                { id: 'edge', nome: 'Edge Detection', iou_estimado: 0.70 },
                { id: 'sam', nome: 'Segment Anything Model', iou_estimado: 0.85 }
            ]);
        }
    };

    // Executar delineamento automático
    const handleDelinear = async (isPreview = false) => {
        setLoading(true);
        setError(null);

        try {
            const imagemUrl = document.getElementById('imagem-satelite-url')?.value || 
                'https://example.com/satelite.jpg'; // Fallback para teste

            const endpoint = isPreview ? '/talhoes/preview' : '/talhoes/delinear-auto';
            
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fazenda_id: fazendaId,
                    imagem_satelite_url: imagemUrl,
                    algoritmo: algoritmo,
                    opcoes: {
                        minArea: 10000,
                        simplifyTolerance: 5.0
                    }
                })
            });

            const data = await response.json();

            if (data.success) {
                setTalhoes(data.talhoes);
                setStats(data.metadata);
                setPreviewMode(isPreview);
                
                if (!isPreview && onSave) {
                    onSave(data.talhoes);
                }
            } else {
                setError(data.error || 'Erro no delineamento');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Classificar zonas de produtividade
    const handleClassificarZonas = async () => {
        if (talhoes.length === 0) {
            setError('Execute o delineamento primeiro');
            return;
        }

        setLoading(true);
        try {
            // Simular histórico NDVI (em produção, virá do backend)
            const historicoNDVI = Array(6).fill(null).map(() => 
                Array(100).fill(null).map(() => Math.random() * 0.8 + 0.2)
            );

            const response = await fetch(`${API_URL}/talhoes/classificar-zonas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    historico_ndvi: historicoNDVI,
                    geometrias_talhoes: talhoes
                })
            });

            const data = await response.json();
            if (data.success) {
                setZonas(data.zonas);
            }
        } catch (err) {
            console.error('Erro ao classificar zonas:', err);
        } finally {
            setLoading(false);
        }
    };

    // Exportar talhões
    const handleExportar = async (formato) => {
        if (talhoes.length === 0) {
            setError('Nenhum talhão para exportar');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/talhoes/exportar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    talhoes: talhoes,
                    formato: formato
                })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `talhoes.${formato === 'geojson' ? 'geojson' : formato}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
        } catch (err) {
            setError('Erro ao exportar: ' + err.message);
        }
    };

    // Ajustar boundary manualmente
    const handleAjustarBoundary = async (talhaoId, novaGeometria) => {
        try {
            const response = await fetch(`${API_URL}/talhoes/ajustar-boundary`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    talhao_id: talhaoId,
                    nova_geometria: novaGeometria,
                    opcoes: { iouManual: 0.95 }
                })
            });

            const data = await response.json();
            if (data.success) {
                // Atualizar talhão na lista
                setTalhoes(prev => prev.map(t => 
                    t.properties.id === talhaoId 
                        ? { ...t, geometry: novaGeometria, properties: { ...t.properties, ajustado: true } }
                        : t
                ));
            }
        } catch (err) {
            setError('Erro ao ajustar boundary: ' + err.message);
        }
    };

    // Estilo para cada talhão baseado na zona
    const getTalhaoStyle = (feature) => {
        const zona = feature.properties?.zona_produtividade;
        const colors = {
            low: '#FF6B6B',
            medium: '#FFD93D',
            high: '#6BCB77'
        };

        return {
            fillColor: colors[zona] || '#3388ff',
            weight: 2,
            opacity: 1,
            color: '#666',
            fillOpacity: 0.5
        };
    };

    // Evento de clique no talhão
    const onTalhaoClick = (e) => {
        const layer = e.target;
        const feature = layer.feature;
        setSelectedTalhao(feature);
        
        layer.setStyle({
            weight: 4,
            color: '#ff7800',
            fillOpacity: 0.7
        });
    };

    return (
        <div className="delineamento-auto-container">
            <div className="delineamento-header">
                <h2>🌾 Auto-Delineamento de Talhões</h2>
                <p className="meta-info">
                    Meta de precisão: 0.75 IoU (inicial) → 0.90 IoU (com treinamento)
                </p>
            </div>

            <div className="delineamento-controls">
                <div className="control-group">
                    <label>URL da Imagem de Satélite:</label>
                    <input 
                        id="imagem-satelite-url"
                        type="text" 
                        placeholder="https://..."
                        className="url-input"
                    />
                </div>

                <div className="control-group">
                    <label>Algoritmo:</label>
                    <select 
                        value={algoritmo} 
                        onChange={(e) => setAlgoritmo(e.target.value)}
                        className="algoritmo-select"
                    >
                        {algoritmosDisponiveis.map(alg => (
                            <option key={alg.id} value={alg.id}>
                                {alg.nome} (IoU ~{alg.iou_estimado})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="button-group">
                    <button 
                        onClick={() => handleDelinear(true)}
                        disabled={loading}
                        className="btn-preview"
                    >
                        {loading ? '⏳ Processando...' : '👁️ Preview'}
                    </button>
                    
                    <button 
                        onClick={() => handleDelinear(false)}
                        disabled={loading}
                        className="btn-delinear"
                    >
                        {loading ? '⏳ Processando...' : '🤖 Delinear Automaticamente'}
                    </button>
                </div>

                <div className="button-group secondary">
                    <button 
                        onClick={handleClassificarZonas}
                        disabled={talhoes.length === 0 || loading}
                        className="btn-zonas"
                    >
                        📊 Classificar Zonas (NDVI)
                    </button>
                    
                    <button 
                        onClick={() => handleExportar('geojson')}
                        disabled={talhoes.length === 0}
                        className="btn-export"
                    >
                        📥 Exportar GeoJSON
                    </button>
                    
                    <button 
                        onClick={() => handleExportar('kml')}
                        disabled={talhoes.length === 0}
                        className="btn-export"
                    >
                        📥 Exportar KML
                    </button>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    ❌ {error}
                </div>
            )}

            {stats && (
                <div className="stats-panel">
                    <h4>📈 Estatísticas</h4>
                    <div className="stats-grid">
                        <div className="stat-item">
                            <span className="stat-value">{talhoes.length}</span>
                            <span className="stat-label">Talhões</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">{(Number(stats.area_total_ha) || 0).toFixed(2)}</span>
                            <span className="stat-label">Área Total (ha)</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">{(Number(stats.area_media_ha) || 0).toFixed(2)}</span>
                            <span className="stat-label">Área Média (ha)</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">{stats.iou_estimado || 0.75}</span>
                            <span className="stat-label">IoU Estimado</span>
                        </div>
                    </div>
                </div>
            )}

            {zonas && (
                <div className="zonas-panel">
                    <h4>🎯 Zonas de Produtividade</h4>
                    <div className="zonas-legend">
                        <div className="zona-item low">
                            <span className="zona-color"></span>
                            <span>Baixa (&lt; 0.4): {zonas.low.length} talhões</span>
                        </div>
                        <div className="zona-item medium">
                            <span className="zona-color"></span>
                            <span>Média (0.4-0.7): {zonas.medium.length} talhões</span>
                        </div>
                        <div className="zona-item high">
                            <span className="zona-color"></span>
                            <span>Alta (&gt; 0.7): {zonas.high.length} talhões</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="map-container">
                <MapContainer 
                    center={[-15.0, -55.0]} 
                    zoom={10} 
                    style={{ height: '500px', width: '100%' }}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />
                    
                    {talhoes.length > 0 && (
                        <GeoJSON 
                            data={{ type: 'FeatureCollection', features: talhoes }}
                            style={getTalhaoStyle}
                            onEachFeature={(feature, layer) => {
                                layer.on({
                                    click: onTalhaoClick
                                });
                                layer.bindPopup(`
                                    <b>${feature.properties.id}</b><br/>
                                    Área: ${(Number(feature.properties.area_hectares) || 0).toFixed(2)} ha<br/>
                                    Score: ${(Number(feature.properties.score || 0) * 100).toFixed(1)}%
                                    ${feature.properties.zona_produtividade ? `<br/>Zona: ${feature.properties.zona_produtividade}` : ''}
                                `);
                            }}
                        />
                    )}
                </MapContainer>
            </div>

            {selectedTalhao && (
                <div className="talhao-detail-panel">
                    <h4>✏️ Ajustar Talhão</h4>
                    <p><b>ID:</b> {selectedTalhao.properties.id}</p>
                    <p><b>Área:</b> {(Number(selectedTalhao.properties.area_hectares) || 0).toFixed(2)} ha</p>
                    <button 
                        className="btn-ajustar"
                        onClick={() => {
                            // Abrir modal de edição
                            alert('Funcionalidade de edição manual - integrar com Leaflet.Draw');
                        }}
                    >
                        ✏️ Editar Boundary
                    </button>
                </div>
            )}

            {previewMode && (
                <div className="preview-banner">
                    🔄 Modo Preview - Revise os talhões antes de salvar
                    <button 
                        className="btn-salvar"
                        onClick={() => {
                            setPreviewMode(false);
                            if (onSave) onSave(talhoes);
                        }}
                    >
                        ✅ Salvar Talhões
                    </button>
                </div>
            )}
        </div>
    );
};

export default DelineamentoAuto;