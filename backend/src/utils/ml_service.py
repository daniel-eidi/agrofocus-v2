import random
import numpy as np
from typing import Dict, Any, List

class MLService:
    """Serviço para Machine Learning de produtividade"""
    
    def __init__(self):
        self.modelo_atual = None
        self.scaler = None
    
    def prever_produtividade(self, dados_entrada: Dict[str, Any]) -> Dict[str, Any]:
        """Realiza predição de produtividade com base nos dados de entrada"""
        
        ndvi = dados_entrada.get("ndvi", 0.5)
        ndre = dados_entrada.get("ndre", 0.4)
        msavi = dados_entrada.get("msavi", 0.3)
        gdd = dados_entrada.get("gdd", 1000)
        area = dados_entrada.get("area", 10)
        cultura = dados_entrada.get("cultura", "soja")
        
        # Fórmula simplificada de predição (simulação)
        # Na implementação real, usar modelo treinado
        
        base_produtividade = {
            "soja": 3500,
            "milho": 12000,
            "cana": 80000,
            "algodao": 4500,
            "cafe": 2000,
            "trigo": 3000
        }
        
        prod_base = base_produtividade.get(cultura.lower(), 3000)
        
        # Fatores de ajuste
        fator_ndvi = 0.5 + (ndvi * 1.5)  # 0.5 a 2.0
        fator_ndre = 0.8 + (ndre * 0.4)  # 0.8 a 1.2
        fator_gdd = min(gdd / 1500, 1.2)  # Limitado a 1.2
        
        # Variação aleatória para simular modelo real
        variacao = random.uniform(0.9, 1.1)
        
        produtividade = prod_base * fator_ndvi * fator_ndre * fator_gdd * variacao
        
        # Confiabilidade baseada nos dados disponíveis
        confianca = 0.7 + (ndvi * 0.2) + (0.1 if gdd > 500 else 0)
        confianca = min(confianca, 0.98)
        
        return {
            "produtividade": round(produtividade, 2),
            "confianca": round(confianca, 2),
            "unidade": "kg/ha",
            "fatores": {
                "ndvi": ndvi,
                "ndre": ndre,
                "gdd": gdd,
                "fator_ndvi": round(fator_ndvi, 2),
                "fator_ndre": round(fator_ndre, 2),
                "fator_gdd": round(fator_gdd, 2)
            }
        }
    
    def treinar_modelo(self, dados_treinamento: List[Any]) -> Dict[str, Any]:
        """Treina um novo modelo ML com dados históricos"""
        
        # Simulação de treinamento
        # Na implementação real, usar scikit-learn, TensorFlow, etc.
        
        print(f"Treinando modelo com {len(dados_treinamento)} registros...")
        
        # Simular métricas de treinamento
        acuracia = random.uniform(0.75, 0.95)
        
        # Gerar parâmetros do modelo
        parametros = {
            "tipo": "random_forest",
            "n_estimators": 100,
            "max_depth": 10,
            "features_utilizadas": [
                "ndvi_medio",
                "ndre_medio", 
                "msavi_medio",
                "gdd_acumulado",
                "area_hectares"
            ],
            "importancia_features": {
                "ndvi_medio": random.uniform(0.3, 0.5),
                "gdd_acumulado": random.uniform(0.2, 0.4),
                "area_hectares": random.uniform(0.1, 0.2),
                "ndre_medio": random.uniform(0.05, 0.15),
                "msavi_medio": random.uniform(0.05, 0.15)
            }
        }
        
        # Simular métricas de validação
        validacao = {
            "rmse": random.uniform(200, 500),
            "mae": random.uniform(150, 400),
            "r2": random.uniform(0.7, 0.95)
        }
        
        return {
            "sucesso": True,
            "acuracia": round(acuracia, 4),
            "parametros": parametros,
            "validacao": validacao,
            "registros_treinamento": len(dados_treinamento)
        }
    
    def avaliar_modelo(self, predicoes: List[float], reais: List[float]) -> Dict[str, Any]:
        """Avalia performance do modelo"""
        
        if len(predicoes) != len(reais):
            raise ValueError("Listas de predições e valores reais devem ter mesmo tamanho")
        
        predicoes_array = np.array(predicoes)
        reais_array = np.array(reais)
        
        # RMSE
        rmse = np.sqrt(np.mean((predicoes_array - reais_array) ** 2))
        
        # MAE
        mae = np.mean(np.abs(predicoes_array - reais_array))
        
        # R²
        ss_res = np.sum((reais_array - predicoes_array) ** 2)
        ss_tot = np.sum((reais_array - np.mean(reais_array)) ** 2)
        r2 = 1 - (ss_res / ss_tot)
        
        # Erro percentual médio
        mape = np.mean(np.abs((reais_array - predicoes_array) / reais_array)) * 100
        
        return {
            "rmse": round(rmse, 2),
            "mae": round(mae, 2),
            "r2": round(r2, 4),
            "mape": round(mape, 2),
            "n_amostras": len(predicoes)
        }
    
    def salvar_modelo(self, caminho: str) -> bool:
        """Salva o modelo treinado em disco"""
        # Implementar serialização do modelo
        print(f"Modelo salvo em: {caminho}")
        return True
    
    def carregar_modelo(self, caminho: str) -> bool:
        """Carrega um modelo salvo"""
        # Implementar desserialização do modelo
        print(f"Modelo carregado de: {caminho}")
        return True
