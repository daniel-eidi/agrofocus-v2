import os
import random
from typing import Optional, Dict, Any, List

class GEEService:
    """Serviço para integração com Google Earth Engine"""
    
    def __init__(self):
        self.project_id = os.getenv("GEE_PROJECT_ID", "")
        self.initialized = False
        
        try:
            import ee
            if self.project_id:
                ee.Initialize(project=self.project_id)
                self.initialized = True
        except Exception as e:
            print(f"GEE não inicializado (modo simulação): {e}")
    
    def processar_imagem(self, talhao_id: str, geometry: Any, data: str) -> Dict[str, Any]:
        """Processa imagem de satélite para um talhão"""
        
        if not self.initialized:
            # Modo simulação
            return {
                "image_id": f"COPERNICUS/S2_SR_HARMONIZED/{data.replace('-', '')}",
                "ndvi_mean": round(random.uniform(0.3, 0.85), 4),
                "ndre_mean": round(random.uniform(0.2, 0.75), 4),
                "msavi_mean": round(random.uniform(0.15, 0.70), 4),
                "cloud_cover": round(random.uniform(0, 20), 2),
                "fonte": "sentinel-2-simulado"
            }
        
        # Implementação real com GEE
        try:
            import ee
            
            # Criar geometria a partir do GeoJSON
            if geometry:
                ee_geometry = ee.Geometry(geometry)
            else:
                # Placeholder para testes
                ee_geometry = ee.Geometry.Point([-46.5, -23.5])
            
            # Coleção Sentinel-2
            collection = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED") \
                .filterBounds(ee_geometry) \
                .filterDate(data, ee.Date(data).advance(1, 'day')) \
                .filter(ee.Lt('CLOUDY_PIXEL_PERCENTAGE', 20)) \
                .first()
            
            if collection:
                # Calcular índices
                ndvi = collection.normalizedDifference(['B8', 'B4']).rename('NDVI')
                ndre = collection.normalizedDifference(['B8', 'B5']).rename('NDRE')
                
                # MSAVI
                nir = collection.select('B8')
                red = collection.select('B4')
                msavi = nir.multiply(2).add(1).subtract(
                    nir.multiply(2).add(1).pow(2).subtract(
                        nir.subtract(red).multiply(8)
                    ).sqrt()
                ).divide(2).rename('MSAVI')
                
                # Estatísticas
                stats = ndvi.reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=ee_geometry,
                    scale=10
                ).getInfo()
                
                return {
                    "image_id": collection.get('system:id').getInfo(),
                    "ndvi_mean": stats.get('NDVI', 0),
                    "ndre_mean": 0,  # Calcular similarmente
                    "msavi_mean": 0,  # Calcular similarmente
                    "cloud_cover": collection.get('CLOUDY_PIXEL_PERCENTAGE').getInfo(),
                    "fonte": "sentinel-2"
                }
        except Exception as e:
            print(f"Erro ao processar imagem GEE: {e}")
            return self._fallback_simulado()
        
        return self._fallback_simulado()
    
    def gerar_tile_url(self, talhao_id: str, indice: str, data: str) -> Optional[str]:
        """Gera URL para tiles de visualização"""
        
        if not self.initialized:
            # URL de tiles simulada
            return f"https://tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png?indice={indice}&talhao={talhao_id}"
        
        try:
            import ee
            # Gerar map ID para visualização
            # Implementação real aqui
            pass
        except:
            pass
        
        return None
    
    def _fallback_simulado(self) -> Dict[str, Any]:
        return {
            "image_id": "SIMULADO/001",
            "ndvi_mean": round(random.uniform(0.3, 0.85), 4),
            "ndre_mean": round(random.uniform(0.2, 0.75), 4),
            "msavi_mean": round(random.uniform(0.15, 0.70), 4),
            "cloud_cover": round(random.uniform(0, 20), 2),
            "fonte": "simulado"
        }
    
    def obter_serie_temporal(
        self, 
        geometry: Any, 
        data_inicio: str, 
        data_fim: str,
        indice: str = "NDVI"
    ) -> List[Dict[str, Any]]:
        """Obtém série temporal de índices de vegetação"""
        
        if not self.initialized:
            # Gerar dados simulados
            from datetime import datetime, timedelta
            import random
            
            resultados = []
            data_atual = datetime.strptime(data_inicio, "%Y-%m-%d")
            data_final = datetime.strptime(data_fim, "%Y-%m-%d")
            
            while data_atual <= data_final:
                resultados.append({
                    "data": data_atual.strftime("%Y-%m-%d"),
                    "valor": round(random.uniform(0.3, 0.85), 4),
                    "indice": indice
                })
                data_atual += timedelta(days=5)
            
            return resultados
        
        # Implementação real com GEE
        return []
