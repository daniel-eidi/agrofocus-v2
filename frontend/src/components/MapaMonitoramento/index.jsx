/**
 * Componente MapaMonitoramento
 * Mapa interativo com seletor de índices de vegetação
 */

import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, LayersControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import IndiceSelector from '../IndiceSelector';
import api from '../../services/api';
import './styles.css';

const { BaseLayer, Overlay } = LayersControl;

// Posição padrão (centro do Brasil)
const POSICAO_PADRAO = [-15.77972, -47.92972];
const ZOOM_PADRAO = 13;

/**
 * Componente de controle de camadas customizado
 */
const ControleIndice = ({ indice, talhao, onIndiceChange }) => {
  const map = useMap();
  
  useEffect(() => {
    const controle = L.control({ position: 'topright' });
    
    controle.onAdd = () => {
      const div = L.DomUtil.create('div', 'controle-indice-leaflet');
      div.innerHTML = `<div id="indice-selector-mount"></div>`;
      return div;
    };
    
    controle.addTo(map);
    
    return () => {
      controle.remove();
    };
  }, [map]);
  
  return null;
};

/**
 * Componente principal do mapa
 */
const MapaMonitoramento = ({ 
  talhaoId = 'demo',
  talhaoGeoJSON = null,
  dataInicio = '2024-01-01',
  dataFim = '2024-01-31',
  cloudCoverage = 20
}) => {
  const [indiceAtual, setIndiceAtual] = useState('NDVI');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [layerUrl, setLayerUrl] = useState(null);
  const [estatisticas, setEstatisticas] = useState(null);
  const [tilesRGB, setTilesRGB] = useState(null);

  // GeoJSON padrão para demo
  const talhaoPadrao = talhaoGeoJSON || {
    type: 'Feature',
    properties: { nome: 'Talhão Demo', area: 12.5 },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-47.935, -15.785],
        [-47.925, -15.785],
        [-47.925, -15.775],
        [-47.935, -15.775],
        [-47.935, -15.785]
      ]]
    }
  };

  /**
   * Busca o índice selecionado na API
   */
  const buscarIndice = useCallback(async (indice) => {
    if (indice === 'RGB') {
      // Para RGB, usamos tiles padrão do Sentinel
      setTilesRGB('https://services.sentinel-hub.com/ogc/wmts/{variant}?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=TRUE_COLOR&STYLE=default&FORMAT=image/jpeg&TILEMATRIXSET=PopularWebMercator256&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}');
      setLayerUrl(null);
      setEstatisticas(null);
      return;
    }

    setCarregando(true);
    setErro(null);

    try {
      const endpoint = `/api/${indice.toLowerCase()}/${talhaoId}`;
      const params = {
        data_inicio: dataInicio,
        data_fim: dataFim,
        cloud_coverage: cloudCoverage
      };

      const response = await api.get(endpoint, { params });
      
      if (response.data.sucesso) {
        const { url, estatisticas } = response.data.data;
        setLayerUrl(url);
        setEstatisticas(estatisticas);
        setTilesRGB(null);
      } else {
        setErro(response.data.erro || 'Erro ao carregar índice');
      }
    } catch (error) {
      console.error('Erro ao buscar índice:', error);
      setErro(error.response?.data?.erro || 'Erro de conexão com a API');
      
      // Fallback: URL de exemplo para demonstração
      setLayerUrl(`https://earthengine.googleapis.com/demo/tiles/${indice.toLowerCase()}/{z}/{x}/{y}`);
    } finally {
      setCarregando(false);
    }
  }, [talhaoId, dataInicio, dataFim, cloudCoverage]);

  // Carrega o índice inicial
  useEffect(() => {
    buscarIndice(indiceAtual);
  }, [buscarIndice, indiceAtual]);

  /**
   * Estilo do polígono do talhão
   */
  const estiloTalhao = {
    color: '#ffffff',
    weight: 3,
    opacity: 1,
    fillColor: '#10b981',
    fillOpacity: 0.1
  };

  /**
   * Estilo do polígono em hover
   */
  const estiloTalhaoHover = {
    color: '#ffffff',
    weight: 4,
    opacity: 1,
    fillColor: '#10b981',
    fillOpacity: 0.3
  };

  return (
    <div className="mapa-monitoramento">
      {/* Header com informações */}
      <div className="mapa-header">
        <div className="mapa-titulo">
          <h2>🛰️ Monitoramento de Talhão</h2>
          <span className="mapa-subtitulo">
            {talhaoPadrao.properties.nome} • {talhaoPadrao.properties.area} ha
          </span>
        </div>
        
        {carregando && (
          <div className="mapa-loading">
            <span className="spinner">⏳</span>
            Carregando {indiceAtual}...
          </div>
        )}
      </div>

      <div className="mapa-container">
        {/* Seletor de Índices (Sidebar) */}
        <div className="mapa-sidebar">
          <IndiceSelector 
            indiceAtual={indiceAtual}
            onChange={setIndiceAtual}
            mostrarLegenda={true}
          />

          {/* Painel de Estatísticas */}
          {estatisticas && (
            <div className="estatisticas-panel">
              <h4>📊 Estatísticas {indiceAtual}</h4>
              <div className="estatisticas-grid">
                <div className="estatistica-item">
                  <span className="estatistica-label">Média</span>
                  <span className="estatistica-valor">{estatisticas.media?.toFixed(3)}</span>
                </div>
                <div className="estatistica-item">
                  <span className="estatistica-label">Mínimo</span>
                  <span className="estatistica-valor min">{estatisticas.minimo?.toFixed(3)}</span>
                </div>
                <div className="estatistica-item">
                  <span className="estatistica-label">Máximo</span>
                  <span className="estatistica-valor max">{estatisticas.maximo?.toFixed(3)}</span>
                </div>
                <div className="estatistica-item">
                  <span className="estatistica-label">Desvio Padrão</span>
                  <span className="estatistica-valor">{estatisticas.desvioPadrao?.toFixed(3)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Erro */}
          {erro && (
            <div className="mapa-erro">
              <span>⚠️</span>
              <p>{erro}</p>
              <button onClick={() => buscarIndice(indiceAtual)}>
                Tentar novamente
              </button>
            </div>
          )}

          {/* Dicas */}
          <div className="mapa-dicas">
            <h4>💡 Dicas de Uso</h4>
            <ul>
              <li><strong>NDVI:</strong> Melhor para monitoramento geral</li>
              <li><strong>NDRE:</strong> Use em estágios avançados (R3-R6)</li>
              <li><strong>MSAVI:</strong> Ideal para início de safra (V2-V6)</li>
            </ul>          
          </div>
        </div>

        {/* Mapa */}
        <div className="mapa-visualizacao">
          <MapContainer
            center={POSICAO_PADRAO}
            zoom={ZOOM_PADRAO}
            scrollWheelZoom={true}
            className="mapa-leaflet"
          >
            <LayersControl position="bottomright">
              {/* Base Layer - OpenStreetMap */}
              <BaseLayer checked={!layerUrl && !tilesRGB} name="🗺️ OpenStreetMap">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              </BaseLayer>

              {/* Base Layer - Satélite */}
              <BaseLayer checked={false} name="🛰️ Satélite">
                <TileLayer
                  attribution='&copy; <a href="https://www.esri.com">Esri</a>'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
              </BaseLayer>

              {/* Layer do Índice (se disponível) */}
              {layerUrl && (
                <Overlay checked={true} name={`🌿 ${indiceAtual}`}>
                  <TileLayer
                    url={layerUrl}
                    attribution="Google Earth Engine - Sentinel-2"
                    opacity={0.8}
                  />
                </Overlay>
              )}

              {/* Layer RGB (se selecionado) */}
              {tilesRGB && indiceAtual === 'RGB' && (
                <Overlay checked={true} name="📷 RGB">
                  <TileLayer
                    url="https://services.sentinel-hub.com/ogc/wms/{variant}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS=TRUE_COLOR&STYLE=default&FORMAT=image/jpeg&TRANSPARENT=true&HEIGHT=256&WIDTH=256&SRS=EPSG:3857&BBOX={bbox}"
                    attribution="Sentinel-2"
                    opacity={1}
                  />
                </Overlay>
              )}

              {/* Overlay do talhão */}
              <Overlay checked={true} name="📍 Limite do Talhão">
                <GeoJSON
                  data={talhaoPadrao}
                  style={estiloTalhao}
                  eventHandlers={{
                    mouseover: (e) => {
                      e.target.setStyle(estiloTalhaoHover);
                    },
                    mouseout: (e) => {
                      e.target.setStyle(estiloTalhao);
                    }
                  }}
                />
              </Overlay>
            </LayersControl>

            {/* Controle de índice customizado */}
            <ControleIndice 
              indice={indiceAtual}
              talhao={talhaoPadrao}
              onIndiceChange={setIndiceAtual}
            />
          </MapContainer>

          {/* Overlay de carregamento */}
          {carregando && (
            <div className="mapa-overlay-loading">
              <div className="loading-content">
                <div className="loading-spinner"></div>
                <p>Carregando {indiceAtual}...⏳</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapaMonitoramento;
