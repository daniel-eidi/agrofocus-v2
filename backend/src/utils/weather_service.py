import os
import requests
from typing import Dict, Any, List
from datetime import datetime, date

class WeatherService:
    """Serviço para integração com APIs de clima"""
    
    def __init__(self):
        self.api_key = os.getenv("OPENWEATHER_API_KEY", "")
        self.base_url = "https://api.openweathermap.org/data/2.5"
    
    def obter_clima_atual(self, lat: float, lon: float) -> Dict[str, Any]:
        """Obtém condições climáticas atuais"""
        
        if not self.api_key:
            return self._simular_clima_atual()
        
        try:
            url = f"{self.base_url}/weather"
            params = {
                "lat": lat,
                "lon": lon,
                "appid": self.api_key,
                "units": "metric",
                "lang": "pt_br"
            }
            
            response = requests.get(url, params=params, timeout=10)
            data = response.json()
            
            return {
                "temperatura": data["main"]["temp"],
                "temperatura_max": data["main"]["temp_max"],
                "temperatura_min": data["main"]["temp_min"],
                "umidade": data["main"]["humidity"],
                "pressao": data["main"]["pressure"],
                "velocidade_vento": data["wind"]["speed"],
                "direcao_vento": data["wind"].get("deg", 0),
                "descricao": data["weather"][0]["description"],
                "icone": data["weather"][0]["icon"],
                "nascer_sol": datetime.fromtimestamp(data["sys"]["sunrise"]).isoformat(),
                "por_sol": datetime.fromtimestamp(data["sys"]["sunset"]).isoformat()
            }
        except Exception as e:
            print(f"Erro ao obter clima: {e}")
            return self._simular_clima_atual()
    
    def obter_previsao(self, lat: float, lon: float, dias: int = 7) -> List[Dict[str, Any]]:
        """Obtém previsão do tempo para os próximos dias"""
        
        if not self.api_key:
            return self._simular_previsao(dias)
        
        try:
            url = f"{self.base_url}/forecast"
            params = {
                "lat": lat,
                "lon": lon,
                "appid": self.api_key,
                "units": "metric",
                "lang": "pt_br"
            }
            
            response = requests.get(url, params=params, timeout=10)
            data = response.json()
            
            # Agrupar por dia
            previsao_por_dia = {}
            for item in data.get("list", [])[:dias * 8]:  # 8 medições por dia
                data_str = item["dt_txt"][:10]
                
                if data_str not in previsao_por_dia:
                    previsao_por_dia[data_str] = {
                        "temps": [],
                        "humidades": [],
                        "descricoes": [],
                        "icones": [],
                        "chuva_prob": []
                    }
                
                previsao_por_dia[data_str]["temps"].append(item["main"]["temp"])
                previsao_por_dia[data_str]["humidades"].append(item["main"]["humidity"])
                previsao_por_dia[data_str]["descricoes"].append(item["weather"][0]["description"])
                previsao_por_dia[data_str]["icones"].append(item["weather"][0]["icon"])
                previsao_por_dia[data_str]["chuva_prob"].append(item.get("pop", 0))
            
            resultado = []
            for data_str, dados in list(previsao_por_dia.items())[:dias]:
                resultado.append({
                    "data_previsao": data_str,
                    "hora_previsao": datetime.strptime(data_str, "%Y-%m-%d"),
                    "temp_max": max(dados["temps"]),
                    "temp_min": min(dados["temps"]),
                    "umidade": sum(dados["humidades"]) / len(dados["humidades"]),
                    "descricao": max(set(dados["descricoes"]), key=dados["descricoes"].count),
                    "icone": dados["icones"][len(dados["icones"]) // 2],
                    "precipitacao_probabilidade": max(dados["chuva_prob"]),
                    "precipitacao_volume": 0  # Calcular se disponível
                })
            
            return resultado
            
        except Exception as e:
            print(f"Erro ao obter previsão: {e}")
            return self._simular_previsao(dias)
    
    def _simular_clima_atual(self) -> Dict[str, Any]:
        import random
        return {
            "temperatura": round(random.uniform(20, 35), 1),
            "temperatura_max": round(random.uniform(25, 38), 1),
            "temperatura_min": round(random.uniform(15, 25), 1),
            "umidade": round(random.uniform(40, 90), 1),
            "pressao": round(random.uniform(1000, 1025), 1),
            "velocidade_vento": round(random.uniform(0, 20), 1),
            "direcao_vento": random.randint(0, 360),
            "descricao": "Céu parcialmente nublado",
            "icone": "02d",
            "nascer_sol": "06:00:00",
            "por_sol": "18:00:00",
            "fonte": "simulado"
        }
    
    def _simular_previsao(self, dias: int) -> List[Dict[str, Any]]:
        import random
        from datetime import datetime, timedelta
        
        resultado = []
        data_atual = date.today()
        
        for i in range(dias):
            data = data_atual + timedelta(days=i)
            resultado.append({
                "data_previsao": data.isoformat(),
                "hora_previsao": datetime.combine(data, datetime.min.time()),
                "temp_max": round(random.uniform(25, 38), 1),
                "temp_min": round(random.uniform(15, 25), 1),
                "umidade": round(random.uniform(40, 90), 1),
                "descricao": random.choice(["Ensolarado", "Parcialmente nublado", "Nublado", "Possibilidade de chuva"]),
                "icone": random.choice(["01d", "02d", "03d", "04d", "09d", "10d"]),
                "precipitacao_probabilidade": round(random.uniform(0, 0.8), 2),
                "precipitacao_volume": round(random.uniform(0, 20), 1),
                "fonte": "simulado"
            })
        
        return resultado
