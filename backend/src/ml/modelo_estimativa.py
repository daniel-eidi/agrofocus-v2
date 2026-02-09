#!/usr/bin/env python3
"""
Modelo de Machine Learning para Estimativa de Produtividade Agrícola
AgroFocus - Regressão Linear Múltipla

Features: NDVI_mean, GDD_total, Precip_total
Target: Produtividade (t/ha)

Uso:
    python modelo_estimativa.py --train dados.csv
    python modelo_estimativa.py --predict '{"ndvi_mean": 0.75, "gdd_total": 1800, "precip_total": 450}'
"""

import json
import sys
import os
import argparse
import pickle
import numpy as np
from datetime import datetime

# Import sklearn com fallback para modo simulado
try:
    from sklearn.linear_model import LinearRegression
    from sklearn.preprocessing import StandardScaler
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import r2_score, mean_squared_error
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    print("⚠️  scikit-learn não instalado. Usando modo de fallback/simulação.", file=sys.stderr)

# Diretório para salvar modelos treinados
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')
os.makedirs(MODEL_DIR, exist_ok=True)

# Tabela de calibração inicial (fallback quando não há modelo treinado)
TABELA_CALIBRACAO = {
    'milho': {
        'faixas_ndvi': [
            {'min': 0.8, 'max': 1.0, 'produtividade': (12, 14), 'descricao': 'Excelente'},
            {'min': 0.6, 'max': 0.8, 'produtividade': (8, 12), 'descricao': 'Bom'},
            {'min': 0.4, 'max': 0.6, 'produtividade': (5, 8), 'descricao': 'Médio'},
            {'min': 0.0, 'max': 0.4, 'produtividade': (0, 5), 'descricao': 'Baixo'},
        ]
    },
    'soja': {
        'faixas_ndvi': [
            {'min': 0.8, 'max': 1.0, 'produtividade': (4.0, 5.0), 'descricao': 'Excelente'},
            {'min': 0.6, 'max': 0.8, 'produtividade': (2.5, 4.0), 'descricao': 'Bom'},
            {'min': 0.4, 'max': 0.6, 'produtividade': (1.5, 2.5), 'descricao': 'Médio'},
            {'min': 0.0, 'max': 0.4, 'produtividade': (0, 1.5), 'descricao': 'Baixo'},
        ]
    },
    'trigo': {
        'faixas_ndvi': [
            {'min': 0.8, 'max': 1.0, 'produtividade': (6, 8), 'descricao': 'Excelente'},
            {'min': 0.6, 'max': 0.8, 'produtividade': (4, 6), 'descricao': 'Bom'},
            {'min': 0.4, 'max': 0.6, 'produtividade': (2, 4), 'descricao': 'Médio'},
            {'min': 0.0, 'max': 0.4, 'produtividade': (0, 2), 'descricao': 'Baixo'},
        ]
    },
    'algodao': {
        'faixas_ndvi': [
            {'min': 0.8, 'max': 1.0, 'produtividade': (4.5, 6.0), 'descricao': 'Excelente'},
            {'min': 0.6, 'max': 0.8, 'produtividade': (3.0, 4.5), 'descricao': 'Bom'},
            {'min': 0.4, 'max': 0.6, 'produtividade': (1.5, 3.0), 'descricao': 'Médio'},
            {'min': 0.0, 'max': 0.4, 'produtividade': (0, 1.5), 'descricao': 'Baixo'},
        ]
    }
}

class ModeloEstimativaProdutividade:
    """
    Modelo de regressão linear múltipla para estimar produtividade agrícola.
    
    Features utilizadas:
    - NDVI médio (índice de vegetação)
    - GDD acumulado (graus-dia de crescimento)
    - Precipitação total (mm)
    
    Ajustes por cultura:
    - Cada cultura tem coeficientes específicos
    - Fallback para tabela de calibração quando modelo não treinado
    """
    
    def __init__(self, cultura='milho'):
        self.cultura = cultura.lower()
        self.modelo = None
        self.scaler = None
        self.metricas = {}
        self.coeficientes = {}
        self._carregar_modelo()
    
    def _get_model_path(self):
        """Retorna caminho do arquivo do modelo para a cultura."""
        return os.path.join(MODEL_DIR, f'modelo_{self.cultura}.pkl')
    
    def _carregar_modelo(self):
        """Tenta carregar modelo treinado do disco."""
        model_path = self._get_model_path()
        if os.path.exists(model_path):
            try:
                with open(model_path, 'rb') as f:
                    dados = pickle.load(f)
                    self.modelo = dados.get('modelo')
                    self.scaler = dados.get('scaler')
                    self.metricas = dados.get('metricas', {})
                    self.coeficientes = dados.get('coeficientes', {})
                return True
            except Exception as e:
                print(f"Erro ao carregar modelo: {e}", file=sys.stderr)
        return False
    
    def _salvar_modelo(self):
        """Salva modelo treinado no disco."""
        model_path = self._get_model_path()
        dados = {
            'modelo': self.modelo,
            'scaler': self.scaler,
            'metricas': self.metricas,
            'coeficientes': self.coeficientes,
            'cultura': self.cultura,
            'data_treino': datetime.now().isoformat()
        }
        with open(model_path, 'wb') as f:
            pickle.dump(dados, f)
    
    def treinar(self, dados_treino):
        """
        Treina o modelo com dados históricos.
        
        Args:
            dados_treino: Lista de dicts com keys: ndvi_mean, gdd_total, precip_total, produtividade
        
        Returns:
            Dict com métricas do treinamento
        """
        if not SKLEARN_AVAILABLE:
            return {'erro': 'scikit-learn não disponível para treinamento'}
        
        if len(dados_treino) < 5:
            return {'erro': 'Mínimo de 5 amostras necessário para treinamento'}
        
        # Extrair features e target
        X = np.array([[d['ndvi_mean'], d['gdd_total'], d['precip_total']] for d in dados_treino])
        y = np.array([d['produtividade'] for d in dados_treino])
        
        # Dividir em treino e teste
        if len(dados_treino) >= 10:
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        else:
            X_train, y_train = X, y
            X_test, y_test = X, y
        
        # Normalizar features
        self.scaler = StandardScaler()
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Treinar modelo
        self.modelo = LinearRegression()
        self.modelo.fit(X_train_scaled, y_train)
        
        # Calcular métricas
        y_pred = self.modelo.predict(X_test_scaled)
        
        self.metricas = {
            'r2_score': r2_score(y_test, y_pred),
            'rmse': np.sqrt(mean_squared_error(y_test, y_pred)),
            'n_amostras': len(dados_treino),
            'n_amostras_treino': len(X_train),
            'n_amostras_teste': len(X_test)
        }
        
        self.coeficientes = {
            'intercept': float(self.modelo.intercept_),
            'ndvi_coef': float(self.modelo.coef_[0]),
            'gdd_coef': float(self.modelo.coef_[1]),
            'precip_coef': float(self.modelo.coef_[2])
        }
        
        # Salvar modelo
        self._salvar_modelo()
        
        return {
            'sucesso': True,
            'metricas': self.metricas,
            'coeficientes': self.coeficientes
        }
    
    def prever(self, ndvi_mean, gdd_total, precip_total):
        """
        Faz predição de produtividade.
        
        Args:
            ndvi_mean: Média do NDVI (0-1)
            gdd_total: Graus-dia acumulados
            precip_total: Precipitação total em mm
        
        Returns:
            Dict com estimativa e intervalo de confiança
        """
        # Se tem modelo treinado, usa ele
        if self.modelo is not None and self.scaler is not None and SKLEARN_AVAILABLE:
            X = np.array([[ndvi_mean, gdd_total, precip_total]])
            X_scaled = self.scaler.transform(X)
            estimativa = float(self.modelo.predict(X_scaled)[0])
            
            # Calcular intervalo de confiança baseado no RMSE
            rmse = self.metricas.get('rmse', 1.0)
            intervalo = {
                'min': max(0, estimativa - 1.96 * rmse),
                'max': estimativa + 1.96 * rmse
            }
            
            return {
                'estimativa_ton_ha': round(estimativa, 2),
                'intervalo_confianca': {
                    'min': round(intervalo['min'], 2),
                    'max': round(intervalo['max'], 2),
                    'nivel': '95%'
                },
                'metodo': 'modelo_ml',
                'cultura': self.cultura,
                'features_utilizadas': {
                    'ndvi_mean': ndvi_mean,
                    'gdd_total': gdd_total,
                    'precip_total': precip_total
                },
                'metricas_modelo': self.metricas
            }
        
        # Fallback: usar tabela de calibração
        return self._estimativa_fallback(ndvi_mean)
    
    def _estimativa_fallback(self, ndvi_mean):
        """
        Estimativa baseada na tabela de calibração quando modelo não disponível.
        """
        tabela = TABELA_CALIBRACAO.get(self.cultura, TABELA_CALIBRACAO['milho'])
        
        for faixa in tabela['faixas_ndvi']:
            if faixa['min'] <= ndvi_mean <= faixa['max']:
                prod_min, prod_max = faixa['produtividade']
                estimativa = (prod_min + prod_max) / 2
                
                return {
                    'estimativa_ton_ha': round(estimativa, 2),
                    'intervalo_confianca': {
                        'min': prod_min,
                        'max': prod_max,
                        'nivel': 'estimado'
                    },
                    'metodo': 'tabela_calibracao',
                    'cultura': self.cultura,
                    'descricao_faixa': faixa['descricao'],
                    'features_utilizadas': {
                        'ndvi_mean': ndvi_mean
                    },
                    'observacao': 'Usando tabela de calibração inicial. Treine o modelo para maior precisão.'
                }
        
        # Fallback extremo
        return {
            'estimativa_ton_ha': 0,
            'intervalo_confianca': {'min': 0, 'max': 0, 'nivel': 'n/a'},
            'metodo': 'erro',
            'erro': 'NDVI fora das faixas esperadas'
        }
    
    def calcular_tendencia(self, dados_historicos):
        """
        Calcula tendência de produtividade ao longo dos anos.
        
        Args:
            dados_historicos: Lista de dicts com 'ano' e 'produtividade'
        
        Returns:
            Dict com análise de tendência
        """
        if len(dados_historicos) < 2:
            return {
                'tendencia': 'insuficiente',
                'mensagem': 'Dados históricos insuficientes para análise de tendência'
            }
        
        # Ordenar por ano
        dados_ordenados = sorted(dados_historicos, key=lambda x: x['ano'])
        anos = [d['ano'] for d in dados_ordenados]
        produtividades = [d['produtividade'] for d in dados_ordenados]
        
        # Calcular média e variação
        media = np.mean(produtividades)
        ultima_prod = produtividades[-1]
        primeira_prod = produtividades[0]
        
        # Determinar tendência
        variacao = ((ultima_prod - primeira_prod) / primeira_prod * 100) if primeira_prod > 0 else 0
        
        if variacao > 5:
            tendencia = 'crescente'
        elif variacao < -5:
            tendencia = 'decrescente'
        else:
            tendencia = 'estavel'
        
        return {
            'tendencia': tendencia,
            'variacao_percentual': round(variacao, 2),
            'produtividade_media': round(media, 2),
            'produtividade_ultimo_ano': round(ultima_prod, 2),
            'anos_disponiveis': anos,
            'produtividades': produtividades
        }
    
    def comparar_com_media_historica(self, estimativa_atual, media_historica):
        """
        Compara estimativa atual com média histórica.
        
        Returns:
            Dict com análise comparativa e alertas
        """
        diferenca = estimativa_atual - media_historica
        diferenca_percentual = (diferenca / media_historica * 100) if media_historica > 0 else 0
        
        # Alertas
        alertas = []
        if diferenca_percentual < -20:
            alertas.append({
                'tipo': 'critico',
                'mensagem': f'Estimativa {abs(diferenca_percentual):.1f}% abaixo da média histórica',
                'acao_sugerida': 'Verificar condições da cultura, nutrição e pragas'
            })
        elif diferenca_percentual < -10:
            alertas.append({
                'tipo': 'atencao',
                'mensagem': f'Estimativa {abs(diferenca_percentual):.1f}% abaixo da média histórica',
                'acao_sugerida': 'Monitorar desenvolvimento da cultura'
            })
        
        return {
            'estimativa_atual': round(estimativa_atual, 2),
            'media_historica': round(media_historica, 2),
            'diferenca_absoluta': round(diferenca, 2),
            'diferenca_percentual': round(diferenca_percentual, 2),
            'status': 'acima' if diferenca > 0 else 'abaixo' if diferenca < 0 else 'igual',
            'alertas': alertas
        }


def gerar_dados_exemplo(n_amostras=50):
    """Gera dados sintéticos para exemplo/teste."""
    np.random.seed(42)
    dados = []
    
    for _ in range(n_amostras):
        # Simular correlação entre features e produtividade
        ndvi = np.random.uniform(0.4, 0.95)
        gdd = np.random.uniform(1200, 2200)
        precip = np.random.uniform(300, 700)
        
        # Produtividade baseada em features com algum ruído
        produtividade = (
            5 + ndvi * 8 +  # NDVI positivo
            (gdd - 1200) / 1000 * 2 +  # GDD positivo
            (precip - 400) / 300 * 1.5 +  # Precip positivo até certo ponto
            np.random.normal(0, 0.5)  # Ruído
        )
        
        dados.append({
            'ndvi_mean': round(ndvi, 3),
            'gdd_total': round(gdd, 1),
            'precip_total': round(precip, 1),
            'produtividade': round(max(0, produtividade), 2)
        })
    
    return dados


def main():
    parser = argparse.ArgumentParser(description='Modelo de Estimativa de Produtividade AgroFocus')
    parser.add_argument('--train', metavar='ARQUIVO', help='Treinar modelo com dados CSV/JSON')
    parser.add_argument('--predict', metavar='JSON', help='Fazer predição com dados JSON')
    parser.add_argument('--cultura', default='milho', help='Cultura (milho, soja, trigo, algodao)')
    parser.add_argument('--exemplo', action='store_true', help='Gerar dados de exemplo e treinar')
    
    args = parser.parse_args()
    
    modelo = ModeloEstimativaProdutividade(cultura=args.cultura)
    
    if args.exemplo:
        # Gerar dados de exemplo
        dados = gerar_dados_exemplo(50)
        print(json.dumps({'dados_gerados': dados[:5], 'total': len(dados)}, indent=2))
        
        # Treinar modelo
        resultado = modelo.treinar(dados)
        print("\n=== Resultado do Treinamento ===")
        print(json.dumps(resultado, indent=2))
        
        # Fazer predição de exemplo
        previsao = modelo.prever(ndvi_mean=0.75, gdd_total=1800, precip_total=450)
        print("\n=== Exemplo de Predição ===")
        print(json.dumps(previsao, indent=2))
    
    elif args.train:
        # Carregar dados do arquivo
        if args.train.endswith('.json'):
            with open(args.train, 'r') as f:
                dados = json.load(f)
        else:
            # CSV - necessitaria de pandas, simplificando para JSON
            print("Formato CSV não implementado. Use JSON.", file=sys.stderr)
            sys.exit(1)
        
        resultado = modelo.treinar(dados)
        print(json.dumps(resultado, indent=2))
    
    elif args.predict:
        dados = json.loads(args.predict)
        resultado = modelo.prever(
            ndvi_mean=dados.get('ndvi_mean', 0.5),
            gdd_total=dados.get('gdd_total', 1500),
            precip_total=dados.get('precip_total', 400)
        )
        print(json.dumps(resultado, indent=2))
    
    else:
        # Modo interativo - predição de exemplo
        print("🌾 AgroFocus - Modelo de Estimativa de Produtividade")
        print(f"Cultura: {args.cultura}")
        print("\nExemplo de predição:")
        
        previsao = modelo.prever(ndvi_mean=0.82, gdd_total=1850, precip_total=520)
        print(json.dumps(previsao, indent=2))


if __name__ == '__main__':
    main()
