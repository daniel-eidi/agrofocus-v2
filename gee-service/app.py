#!/usr/bin/env python3
"""
Serviço Python GEE para AgroFocus
Substitui o serviço Node.js @google/earthengine (com bug v1.7.12)

Endpoints:
  - GET  /health      - Health check
  - POST /ndvi        - Calcula NDVI para uma área
  - POST /ndre        - Calcula NDRE para uma área
  - POST /msavi       - Calcula MSAVI para uma área

Cada endpoint de índice recebe:
  - geojson: GeoJSON da área de interesse (Polygon/MultiPolygon)
  - startDate: Data inicial (YYYY-MM-DD)
  - endDate: Data final (YYYY-MM-DD)
  - cloudCover: (opcional) Cobertura de nuvens máxima (padrão: 20)

Retorna:
  - tileUrl: URL do tile XYZ para visualização
  - stats: Estatísticas da área (min, max, mean, stdDev)
"""

import os
import json
import ee
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

# Configurações
CREDENTIALS_PATH = '/home/clawdbot_user/clawd/booster_agro/backend/config/gee-credentials.json'
SERVICE_ACCOUNT = None  # Será lido do arquivo de credenciais

app = Flask(__name__)
CORS(app)

# Inicialização do Earth Engine
def init_earth_engine():
    """Inicializa o Earth Engine com as credenciais do service account."""
    global SERVICE_ACCOUNT
    
    # Tenta diferentes métodos de inicialização
    methods = []
    
    # Método 1: Service Account (se arquivo existe e é válido)
    if os.path.exists(CREDENTIALS_PATH):
        try:
            with open(CREDENTIALS_PATH, 'r') as f:
                creds_data = json.load(f)
                SERVICE_ACCOUNT = creds_data.get('client_email')
                project_id = creds_data.get('project_id')
            
            if SERVICE_ACCOUNT:
                credentials = ee.ServiceAccountCredentials(SERVICE_ACCOUNT, CREDENTIALS_PATH)
                ee.Initialize(credentials, project=project_id)
                methods.append("Service Account")
        except Exception as e:
            print(f"  ⚠️  Service Account falhou: {str(e)[:80]}")
    
    # Método 2: Autenticação padrão (se usuário rodou earthengine authenticate)
    if not methods:
        try:
            ee.Initialize()
            methods.append("Default Credentials")
            SERVICE_ACCOUNT = "default"
        except Exception as e:
            print(f"  ⚠️  Default auth falhou: {str(e)[:80]}")
    
    # Método 3: High-volume endpoint (para produção)
    if not methods:
        try:
            ee.Initialize(opt_url='https://earthengine-highvolume.googleapis.com')
            methods.append("High-volume endpoint")
            SERVICE_ACCOUNT = "high-volume"
        except Exception as e:
            print(f"  ⚠️  High-volume falhou: {str(e)[:80]}")
    
    if methods:
        print(f"✅ Earth Engine inicializado com sucesso")
        print(f"   Método: {methods[0]}")
        print(f"   Service Account: {SERVICE_ACCOUNT}")
        return True
    else:
        print(f"❌ Falha ao inicializar Earth Engine")
        print(f"   Verifique se as credenciais em {CREDENTIALS_PATH} estão válidas")
        print(f"   Ou rode: earthengine authenticate")
        return False

# Health Check
@app.route('/health', methods=['GET'])
def health_check():
    """Endpoint de health check."""
    try:
        # Testa se o EE está funcionando
        info = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED").limit(1).size().getInfo()
        return jsonify({
            'status': 'ok',
            'service': 'gee-python-service',
            'earth_engine': 'connected',
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

# Função auxiliar para obter coleção Sentinel-2
def get_sentinel_collection(geometry, start_date, end_date, cloud_cover=20):
    """Obtém coleção Sentinel-2 filtrada."""
    collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
        .filterBounds(geometry)
        .filterDate(start_date, end_date)
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', cloud_cover))
        .sort('CLOUDY_PIXEL_PERCENTAGE'))
    return collection

# Função para calcular estatísticas
def calculate_stats(image, geometry, scale=10):
    """Calcula estatísticas para uma imagem em uma geometria."""
    stats = image.reduceRegion(
        reducer=ee.Reducer.mean().combine(
            reducer2=ee.Reducer.stdDev(),
            sharedInputs=True
        ).combine(
            reducer2=ee.Reducer.minMax(),
            sharedInputs=True
        ),
        geometry=geometry,
        scale=scale,
        maxPixels=1e9
    )
    return stats.getInfo()

# Função para gerar tile URL
def get_tile_url(image, vis_params):
    """Gera URL de tiles XYZ para uma imagem."""
    map_id = image.getMapId(vis_params)
    tile_url = map_id['tile_fetcher'].url_format
    return tile_url

# Validação de entrada
def validate_request(data):
    """Valida os dados da requisição."""
    required = ['geojson', 'startDate', 'endDate']
    missing = [f for f in required if f not in data]
    if missing:
        return False, f"Campos obrigatórios ausentes: {', '.join(missing)}"
    return True, None

# Converte GeoJSON para EE Geometry
def geojson_to_ee_geometry(geojson):
    """Converte GeoJSON Python para EE Geometry."""
    return ee.Geometry(geojson)

# Endpoint NDVI
@app.route('/ndvi', methods=['POST'])
def calculate_ndvi():
    """Calcula NDVI para uma área específica."""
    try:
        data = request.get_json()
        valid, error = validate_request(data)
        if not valid:
            return jsonify({'error': error}), 400

        geometry = geojson_to_ee_geometry(data['geojson'])
        start_date = data['startDate']
        end_date = data['endDate']
        cloud_cover = data.get('cloudCover', 20)

        # Obtém coleção Sentinel-2
        collection = get_sentinel_collection(geometry, start_date, end_date, cloud_cover)
        
        # Verifica se há imagens
        count = collection.size().getInfo()
        if count == 0:
            return jsonify({
                'error': 'Nenhuma imagem encontrada para o período e área especificados'
            }), 404

        # Cria mosaic mediano
        mosaic = collection.median()

        # Calcula NDVI: (NIR - Red) / (NIR + Red)
        # Sentinel-2: B8 (NIR) = 0.842, B4 (Red) = 0.665
        ndvi = mosaic.normalizedDifference(['B8', 'B4']).rename('NDVI')

        # Clip para a área de interesse
        ndvi_clipped = ndvi.clip(geometry)

        # Calcula estatísticas
        stats = calculate_stats(ndvi_clipped, geometry)

        # Parâmetros de visualização
        vis_params = {
            'min': -1,
            'max': 1,
            'palette': ['red', 'yellow', 'green']
        }

        # Gera tile URL
        tile_url = get_tile_url(ndvi_clipped, vis_params)

        return jsonify({
            'success': True,
            'index': 'NDVI',
            'tileUrl': tile_url,
            'stats': {
                'mean': stats.get('NDVI_mean'),
                'stdDev': stats.get('NDVI_stdDev'),
                'min': stats.get('NDVI_min'),
                'max': stats.get('NDVI_max')
            },
            'imageCount': count,
            'period': {'start': start_date, 'end': end_date}
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Endpoint NDRE
@app.route('/ndre', methods=['POST'])
def calculate_ndre():
    """Calcula NDRE (Normalized Difference Red Edge) para uma área específica."""
    try:
        data = request.get_json()
        valid, error = validate_request(data)
        if not valid:
            return jsonify({'error': error}), 400

        geometry = geojson_to_ee_geometry(data['geojson'])
        start_date = data['startDate']
        end_date = data['endDate']
        cloud_cover = data.get('cloudCover', 20)

        # Obtém coleção Sentinel-2
        collection = get_sentinel_collection(geometry, start_date, end_date, cloud_cover)
        
        count = collection.size().getInfo()
        if count == 0:
            return jsonify({
                'error': 'Nenhuma imagem encontrada para o período e área especificados'
            }), 404

        # Cria mosaic mediano
        mosaic = collection.median()

        # Calcula NDRE: (NIR - Red Edge) / (NIR + Red Edge)
        # Sentinel-2: B8 (NIR), B5 (Red Edge 1 = 0.705)
        ndre = mosaic.normalizedDifference(['B8', 'B5']).rename('NDRE')

        # Clip para a área de interesse
        ndre_clipped = ndre.clip(geometry)

        # Calcula estatísticas
        stats = calculate_stats(ndre_clipped, geometry)

        # Parâmetros de visualização
        vis_params = {
            'min': -1,
            'max': 1,
            'palette': ['red', 'yellow', 'green']
        }

        # Gera tile URL
        tile_url = get_tile_url(ndre_clipped, vis_params)

        return jsonify({
            'success': True,
            'index': 'NDRE',
            'tileUrl': tile_url,
            'stats': {
                'mean': stats.get('NDRE_mean'),
                'stdDev': stats.get('NDRE_stdDev'),
                'min': stats.get('NDRE_min'),
                'max': stats.get('NDRE_max')
            },
            'imageCount': count,
            'period': {'start': start_date, 'end': end_date}
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Endpoint MSAVI
@app.route('/msavi', methods=['POST'])
def calculate_msavi():
    """Calcula MSAVI (Modified Soil Adjusted Vegetation Index) para uma área específica."""
    try:
        data = request.get_json()
        valid, error = validate_request(data)
        if not valid:
            return jsonify({'error': error}), 400

        geometry = geojson_to_ee_geometry(data['geojson'])
        start_date = data['startDate']
        end_date = data['endDate']
        cloud_cover = data.get('cloudCover', 20)

        # Obtém coleção Sentinel-2
        collection = get_sentinel_collection(geometry, start_date, end_date, cloud_cover)
        
        count = collection.size().getInfo()
        if count == 0:
            return jsonify({
                'error': 'Nenhuma imagem encontrada para o período e área especificados'
            }), 404

        # Cria mosaic mediano
        mosaic = collection.median()

        # Calcula MSAVI: (2 * NIR + 1 - sqrt((2 * NIR + 1)^2 - 8 * (NIR - Red))) / 2
        # Sentinel-2: B8 (NIR), B4 (Red)
        nir = mosaic.select('B8')
        red = mosaic.select('B4')
        
        msavi = nir.multiply(2).add(1) \
            .subtract(nir.multiply(2).add(1).pow(2) \
            .subtract(nir.subtract(red).multiply(8)).sqrt()) \
            .divide(2) \
            .rename('MSAVI')

        # Clip para a área de interesse
        msavi_clipped = msavi.clip(geometry)

        # Calcula estatísticas
        stats = calculate_stats(msavi_clipped, geometry)

        # Parâmetros de visualização
        vis_params = {
            'min': -1,
            'max': 1,
            'palette': ['brown', 'yellow', 'green']
        }

        # Gera tile URL
        tile_url = get_tile_url(msavi_clipped, vis_params)

        return jsonify({
            'success': True,
            'index': 'MSAVI',
            'tileUrl': tile_url,
            'stats': {
                'mean': stats.get('MSAVI_mean'),
                'stdDev': stats.get('MSAVI_stdDev'),
                'min': stats.get('MSAVI_min'),
                'max': stats.get('MSAVI_max')
            },
            'imageCount': count,
            'period': {'start': start_date, 'end': end_date}
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Inicialização
if __name__ == '__main__':
    if init_earth_engine():
        print(f"🚀 Serviço GEE Python iniciado na porta 5001")
        app.run(host='0.0.0.0', port=5001, debug=False)
    else:
        print("❌ Falha na inicialização. Verifique as credenciais.")
        exit(1)
