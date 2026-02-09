import random
import numpy as np
from typing import Dict, Any, List
from scipy import stats

class DelineamentoService:
    """Serviço para geração de delineamentos/zonas de manejo"""
    
    def __init__(self):
        pass
    
    def gerar_delineamento(
        self, 
        talhao_id: str, 
        indice_valor: float, 
        num_zonas: int = 3,
        metodo: str = "kmeans"
    ) -> Dict[str, Any]:
        """Gera zonas de manejo baseadas em índices de vegetação"""
        
        # Simulação de delineamento
        # Na implementação real, usar dados reais do talhão
        
        if metodo == "kmeans":
            return self._delineamento_kmeans(talhao_id, indice_valor, num_zonas)
        elif metodo == "quantil":
            return self._delineamento_quantil(talhao_id, indice_valor, num_zonas)
        else:
            return self._delineamento_kmeans(talhao_id, indice_valor, num_zonas)
    
    def _delineamento_kmeans(
        self, 
        talhao_id: str, 
        indice_valor: float, 
        num_zonas: int
    ) -> Dict[str, Any]:
        """Gera zonas usando método K-means (simulado)"""
        
        # Simular valores de NDVI para diferentes zonas
        # Na prática, isso viria de pixels reais da imagem
        
        zonas = []
        cores = ["#d73027", "#fee08b", "#1a9852"] if num_zonas == 3 else \
                ["#d73027", "#fc8d59", "#fee08b", "#91cf60", "#1a9852"][:num_zonas]
        
        # Dividir o índice em zonas
        faixa = 1.0 / num_zonas
        
        for i in range(num_zonas):
            limite_inf = i * faixa
            limite_sup = (i + 1) * faixa
            valor_medio = (limite_inf + limite_sup) / 2
            
            # Simular área da zona
            area_percentual = random.uniform(20, 40)
            
            zonas.append({
                "zona_id": i + 1,
                "nome": self._nomear_zona(i, num_zonas),
                "indice_min": round(limite_inf, 2),
                "indice_max": round(limite_sup, 2),
                "indice_medio": round(valor_medio, 2),
                "area_percentual": round(area_percentual, 1),
                "cor": cores[i] if i < len(cores) else "#808080",
                "recomendacao": self._gerar_recomendacao(i, num_zonas)
            })
        
        # Normalizar percentuais
        total = sum(z["area_percentual"] for z in zonas)
        for z in zonas:
            z["area_percentual"] = round((z["area_percentual"] / total) * 100, 1)
        
        estatisticas = {
            "indice_medio_geral": round(indice_valor, 4),
            "coeficiente_variacao": round(random.uniform(0.1, 0.3), 2),
            "zonas": zonas,
            "metodo": "kmeans"
        }
        
        return {
            "sucesso": True,
            "talhao_id": talhao_id,
            "zonas": zonas,
            "estatisticas": estatisticas
        }
    
    def _delineamento_quantil(
        self, 
        talhao_id: str, 
        indice_valor: float, 
        num_zonas: int
    ) -> Dict[str, Any]:
        """Gera zonas usando método de quantis"""
        
        zonas = []
        percentis = np.linspace(0, 100, num_zonas + 1)
        
        for i in range(num_zonas):
            p_inf = percentis[i]
            p_sup = percentis[i + 1]
            
            zonas.append({
                "zona_id": i + 1,
                "nome": f"Zona {i + 1} (P{p_inf:.0f}-P{p_sup:.0f})",
                "percentil_min": p_inf,
                "percentil_max": p_sup,
                "indice_estimado": round(indice_valor * (p_inf + p_sup) / 200, 2),
                "cor": self._cor_zona(i, num_zonas)
            })
        
        return {
            "sucesso": True,
            "talhao_id": talhao_id,
            "zonas": zonas,
            "estatisticas": {
                "metodo": "quantil",
                "num_zonas": num_zonas
            }
        }
    
    def _nomear_zona(self, indice: int, total: int) -> str:
        """Retorna nome descritivo para a zona"""
        if total == 3:
            nomes = ["Baixa Produtividade", "Média Produtividade", "Alta Produtividade"]
        elif total == 4:
            nomes = ["Muito Baixa", "Baixa", "Alta", "Muito Alta"]
        elif total == 5:
            nomes = ["Muito Baixa", "Baixa", "Média", "Alta", "Muito Alta"]
        else:
            nomes = [f"Zona {i + 1}" for i in range(total)]
        
        return nomes[indice] if indice < len(nomes) else f"Zona {indice + 1}"
    
    def _gerar_recomendacao(self, indice: int, total: int) -> str:
        """Gera recomendação de manejo para a zona"""
        if indice == 0:  # Baixa
            return "Aumentar adubação nitrogenada. Verificar compactação do solo."
        elif indice == total - 1:  # Alta
            return "Manter manejo atual. Considerar adubação de manutenção."
        else:  # Média
            return "Adubação balanceada. Monitorar desenvolvimento."
    
    def _cor_zona(self, indice: int, total: int) -> str:
        """Retorna cor para visualização da zona"""
        cores = ["#d73027", "#fc8d59", "#fee08b", "#d9ef8b", "#91cf60", "#1a9852"]
        
        if total <= len(cores):
            passo = len(cores) // total
            return cores[indice * passo]
        else:
            return "#808080"
    
    def analisar_variabilidade(self, valores: List[float]) -> Dict[str, Any]:
        """Analisa variabilidade espacial dos índices"""
        
        if not valores:
            return {"erro": "Nenhum valor fornecido"}
        
        valores_array = np.array(valores)
        
        return {
            "media": round(np.mean(valores_array), 4),
            "desvio_padrao": round(np.std(valores_array), 4),
            "minimo": round(np.min(valores_array), 4),
            "maximo": round(np.max(valores_array), 4),
            "coeficiente_variacao": round(np.std(valores_array) / np.mean(valores_array), 4),
            "assimetria": round(stats.skew(valores_array), 4),
            "curtose": round(stats.kurtosis(valores_array), 4)
        }
    
    def exportar_prescricao(self, delineamento_id: str, formato: str = "shapefile") -> Dict[str, Any]:
        """Exporta mapa de prescrição em formato específico"""
        
        formatos_suportados = ["shapefile", "geojson", "kml", "csv"]
        
        if formato not in formatos_suportados:
            raise ValueError(f"Formato não suportado. Use: {formatos_suportados}")
        
        return {
            "delineamento_id": delineamento_id,
            "formato": formato,
            "url_download": f"/api/v1/delineamentos/{delineamento_id}/download?formato={formato}",
            "status": "pronto"
        }
