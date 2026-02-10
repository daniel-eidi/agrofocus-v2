#!/usr/bin/env python3
"""
Serviço Python GEE para AgroFocus
Endpoints:
  - GET  /health           - Health check
  - POST /list-images      - Lista últimas imagens Sentinel-2
  - POST /ndvi-tile        - Gera tile NDVI (por imageId ou date)
  - POST /ndvi             - Calcula NDVI (legacy)
"""

import os
import json
import random
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta

# Configurações
CREDENTIALS_PATH = '/home/clawdbot_user/clawd/booster_agro/backend/config/gee-credentials.json'

# Estado global
GEE_INITIALIZED = False
MOCK_MODE = True
INIT_ERROR = None
SERVICE_ACCOUNT = None

app = Flask(__name__)
CORS(app)

# --- EARTH ENGINE INITIALIZATION ---
def init_earth_engine():
    global GEE_INITIALIZED, MOCK_MODE, INIT_ERROR, SERVICE_ACCOUNT
    
    print("=" * 50)
    print("🌍 Inicializando Google Earth Engine...")
    print("=" * 50)
    
    # Verifica se o arquivo de credenciais existe
    if not os.path.exists(CREDENTIALS_PATH):
        INIT_ERROR = f"Arquivo não encontrado: {CREDENTIALS_PATH}"
        print(f"❌ {INIT_ERROR}")
        MOCK_MODE = True
        return False
    
    # Carrega e valida credenciais
    try:
        with open(CREDENTIALS_PATH, 'r') as f:
            creds_data = json.load(f)
        
        SERVICE_ACCOUNT = creds_data.get('client_email', 'unknown')
        project_id = creds_data.get('project_id', 'unknown')
        private_key_id = creds_data.get('private_key_id', '')
        
        print(f"📧 Service Account: {SERVICE_ACCOUNT}")
        print(f"📁 Project ID: {project_id}")
        print(f"🔑 Private Key ID: {private_key_id[:20]}..." if len(private_key_id) > 20 else f"🔑 Private Key ID: {private_key_id}")
        
        # Detecta credenciais placeholder
        if private_key_id in ['key-id', 'your-key-id', '']:
            INIT_ERROR = "Credenciais são placeholders (private_key_id inválido)"
            print(f"⚠️  {INIT_ERROR}")
            MOCK_MODE = True
            return False
            
    except json.JSONDecodeError as e:
        INIT_ERROR = f"JSON inválido: {e}"
        print(f"❌ {INIT_ERROR}")
        MOCK_MODE = True
        return False
    except Exception as e:
        INIT_ERROR = f"Erro lendo credenciais: {e}"
        print(f"❌ {INIT_ERROR}")
        MOCK_MODE = True
        return False
    
    # Tenta inicializar o Earth Engine
    try:
        import ee
        
        print("\n🔄 Tentando autenticação com Service Account...")
        credentials = ee.ServiceAccountCredentials(SERVICE_ACCOUNT, CREDENTIALS_PATH)
        ee.Initialize(credentials, project=project_id)
        
        # Testa uma operação simples
        test_result = ee.Number(1).add(1).getInfo()
        if test_result == 2:
            print(f"✅ Earth Engine inicializado com sucesso!")
            print(f"✅ Teste de operação: 1 + 1 = {test_result}")
            GEE_INITIALIZED = True
            MOCK_MODE = False
            return True
        else:
            INIT_ERROR = f"Teste de operação falhou: esperado 2, obteve {test_result}"
            print(f"❌ {INIT_ERROR}")
            MOCK_MODE = True
            return False
            
    except Exception as e:
        INIT_ERROR = str(e)
        # Simplifica mensagens de erro comuns
        if "Could not deserialize key" in str(e):
            INIT_ERROR = "Chave privada inválida ou corrompida"
        elif "not registered" in str(e).lower():
            INIT_ERROR = "Service Account não registrada no Earth Engine"
        elif "permission" in str(e).lower():
            INIT_ERROR = "Sem permissão para acessar Earth Engine"
        
        print(f"❌ Erro GEE: {INIT_ERROR}")
        MOCK_MODE = True
        return False

# --- MOCK DATA GENERATORS ---
def generate_mock_tile_url(index_type="ndvi"):
    """Gera URL de tile simulada"""
    colors = {'ndvi': '2ecc71', 'ndre': '3498db', 'msavi': 'e74c3c'}
    color = colors.get(index_type, '95a5a6')
    return f"https://via.placeholder.com/256/{color}/ffffff?text=MOCK+{index_type.upper()}"

def get_mock_images(limit=10):
    """Gera lista de imagens simuladas"""
    images = []
    current = datetime.now()
    
    for i in range(limit):
        date_str = current.strftime("%Y-%m-%d")
        images.append({
            "image_id": f"COPERNICUS/S2_SR_HARMONIZED/{current.strftime('%Y%m%d')}T000000_MOCK",
            "date": date_str,
            "cloud_cover": round(random.uniform(0, 30), 2)
        })
        current -= timedelta(days=random.randint(3, 7))
        
    return images

# --- GEE HELPERS ---
def geojson_to_ee_geometry(geojson):
    """Converte GeoJSON para geometria EE"""
    import ee
    return ee.Geometry(geojson)

def get_tile_url(image, vis_params):
    """Obtém URL de tile para uma imagem"""
    map_id = image.getMapId(vis_params)
    return map_id['tile_fetcher'].url_format

# --- ENDPOINTS ---

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'service': 'gee-python-service',
        'mode': 'REAL' if not MOCK_MODE else 'MOCK',
        'gee_initialized': GEE_INITIALIZED,
        'init_error': INIT_ERROR if MOCK_MODE else None,
        'service_account': SERVICE_ACCOUNT,
        'timestamp': datetime.utcnow().isoformat()
    })


@app.route('/list-images', methods=['POST'])
def list_images():
    """
    Lista as últimas imagens Sentinel-2 disponíveis
    
    Request: { "geometry": GeoJSON, "limit": 10 }
    Response: { "images": [{ "date", "cloud_cover", "image_id" }], "mode": "REAL|MOCK" }
    """
    data = request.get_json() or {}
    geometry_geojson = data.get('geometry')
    limit = data.get('limit', 10)
    
    # MOCK MODE
    if MOCK_MODE:
        return jsonify({
            'success': True,
            'images': get_mock_images(limit),
            'mode': 'MOCK',
            'message': f'Dados simulados. Motivo: {INIT_ERROR}'
        })
    
    # REAL MODE
    try:
        import ee
        
        if not geometry_geojson:
            return jsonify({'success': False, 'error': 'geometry é obrigatório'}), 400
        
        geometry = geojson_to_ee_geometry(geometry_geojson)
        
        # Últimos 90 dias
        end_date = datetime.now()
        start_date = end_date - timedelta(days=90)
        
        # Busca coleção Sentinel-2
        collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
            .filterBounds(geometry)
            .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 50))
            .sort('system:time_start', False)
            .limit(limit))
        
        # Obtém informações
        images_info = collection.getInfo()
        features = images_info.get('features', [])
        
        result_list = []
        for feat in features:
            props = feat.get('properties', {})
            img_id = feat.get('id')
            timestamp_ms = props.get('system:time_start', 0)
            date_str = datetime.fromtimestamp(timestamp_ms / 1000).strftime('%Y-%m-%d')
            cloud = props.get('CLOUDY_PIXEL_PERCENTAGE', 0)
            
            result_list.append({
                'image_id': img_id,
                'date': date_str,
                'cloud_cover': round(cloud, 2)
            })
        
        return jsonify({
            'success': True,
            'images': result_list,
            'count': len(result_list),
            'mode': 'REAL'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'mode': 'REAL'
        }), 500


@app.route('/ndvi-tile', methods=['POST'])
def ndvi_tile():
    """
    Gera tile NDVI para uma imagem específica
    
    Request: { "geometry": GeoJSON, "image_id": string } ou { "geometry": GeoJSON, "date": "YYYY-MM-DD" }
    Response: { "tile_url": string, "mode": "REAL|MOCK" }
    """
    data = request.get_json() or {}
    geometry_geojson = data.get('geometry')
    image_id = data.get('image_id')
    target_date = data.get('date')
    
    # MOCK MODE
    if MOCK_MODE:
        return jsonify({
            'success': True,
            'tile_url': generate_mock_tile_url('ndvi'),
            'mode': 'MOCK',
            'message': f'Dados simulados. Motivo: {INIT_ERROR}'
        })
    
    # REAL MODE
    try:
        import ee
        
        if not geometry_geojson:
            return jsonify({'success': False, 'error': 'geometry é obrigatório'}), 400
        
        if not image_id and not target_date:
            return jsonify({'success': False, 'error': 'image_id ou date é obrigatório'}), 400
        
        geometry = geojson_to_ee_geometry(geometry_geojson)
        
        # Obtém a imagem
        if image_id:
            image = ee.Image(image_id)
        else:
            # Busca imagem pela data
            collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                .filterBounds(geometry)
                .filterDate(target_date, (datetime.strptime(target_date, '%Y-%m-%d') + timedelta(days=1)).strftime('%Y-%m-%d'))
                .sort('CLOUDY_PIXEL_PERCENTAGE')
                .first())
            
            if collection.getInfo() is None:
                return jsonify({'success': False, 'error': f'Nenhuma imagem encontrada para {target_date}'}), 404
            
            image = collection
        
        # Recorta pelo polígono
        # image = image.clip(geometry)
        
        # Calcula NDVI: (B8 - B4) / (B8 + B4)
        ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
        
        # Parâmetros de visualização: vermelho → amarelo → verde
        vis_params = {
            'min': -0.1,
            'max': 0.9,
            'palette': ['d73027', 'fc8d59', 'fee08b', 'd9ef8b', '91cf60', '1a9850']
        }
        
        tile_url = get_tile_url(ndvi, vis_params)
        
        # DEBUG: Log da URL gerada
        print(f"🛰️ TILE URL GERADA: {tile_url}")
        
        return jsonify({
            'success': True,
            'tile_url': tile_url,
            'mode': 'REAL'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'mode': 'REAL'
        }), 500


@app.route('/ndvi', methods=['POST'])
def calculate_ndvi():
    """
    Endpoint legacy - Calcula NDVI com estatísticas
    """
    data = request.get_json() or {}
    geojson = data.get('geojson') or data.get('geometry')
    image_id = data.get('imageId') or data.get('image_id')
    date_target = data.get('date')
    
    # MOCK MODE
    if MOCK_MODE:
        return jsonify({
            'success': True,
            'index': 'NDVI',
            'tileUrl': generate_mock_tile_url('ndvi'),
            'stats': {'mean': 0.65, 'min': 0.2, 'max': 0.9, 'stdDev': 0.1},
            'mode': 'MOCK',
            'message': f'Dados simulados. Motivo: {INIT_ERROR}'
        })
    
    # REAL MODE
    try:
        import ee
        
        if not geojson:
            return jsonify({'success': False, 'error': 'geojson/geometry é obrigatório'}), 400
        
        geometry = geojson_to_ee_geometry(geojson)
        
        # Obtém imagem
        if image_id:
            image = ee.Image(image_id)
        elif date_target:
            end_date = (datetime.strptime(date_target, '%Y-%m-%d') + timedelta(days=1)).strftime('%Y-%m-%d')
            collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                .filterBounds(geometry)
                .filterDate(date_target, end_date)
                .sort('CLOUDY_PIXEL_PERCENTAGE')
                .first())
            image = collection
        else:
            # Usa imagem mais recente
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)
            collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                .filterBounds(geometry)
                .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))
                .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
                .sort('system:time_start', False)
                .first())
            image = collection
        
        # Recorta e calcula NDVI
        # image = image.clip(geometry)
        ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
        
        # Estatísticas
        stats = ndvi.reduceRegion(
            reducer=ee.Reducer.mean().combine(ee.Reducer.minMax(), sharedInputs=True),
            geometry=geometry,
            scale=10,
            maxPixels=1e9
        ).getInfo()
        
        # Visualização
        vis_params = {
            'min': -0.1,
            'max': 0.9,
            'palette': ['d73027', 'fc8d59', 'fee08b', 'd9ef8b', '91cf60', '1a9850']
        }
        
        tile_url = get_tile_url(ndvi, vis_params)
        
        return jsonify({
            'success': True,
            'index': 'NDVI',
            'tileUrl': tile_url,
            'stats': {
                'mean': stats.get('NDVI_mean'),
                'min': stats.get('NDVI_min'),
                'max': stats.get('NDVI_max')
            },
            'mode': 'REAL'
        })
        
    except Exception as e:
        import traceback
        print(f"❌ ERRO em /ndvi: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e),
            'mode': 'REAL'
        }), 500


# --- STARTUP ---
if __name__ == '__main__':
    print("\n" + "=" * 50)
    print("🚀 AgroFocus GEE Python Service")
    print("=" * 50 + "\n")
    
    init_earth_engine()
    
    print("\n" + "-" * 50)
    print(f"📊 Status: {'REAL MODE ✅' if not MOCK_MODE else 'MOCK MODE ⚠️'}")
    if MOCK_MODE:
        print(f"📝 Motivo: {INIT_ERROR}")
    print("-" * 50)
    print(f"\n🌐 Servidor iniciando na porta 5001...")
    print(f"📍 Endpoints disponíveis:")
    print(f"   GET  /health")
    print(f"   POST /list-images")
    print(f"   POST /ndvi-tile")
    print(f"   POST /ndvi")
    print("\n")
    
    app.run(host='0.0.0.0', port=5001, debug=False)
