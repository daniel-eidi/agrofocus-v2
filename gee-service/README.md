# GEE Python Service para AgroFocus

Serviço Python que substitui o serviço Node.js com bug na lib @google/earthengine v1.7.12.

## Endpoints

### GET /health
Health check do serviço e conexão com Earth Engine.

### POST /ndvi
Calcula o índice NDVI para uma área.

**Body:**
```json
{
  "geojson": {"type": "Polygon", "coordinates": [...]},
  "startDate": "2024-01-01",
  "endDate": "2024-02-01",
  "cloudCover": 20
}
```

**Response:**
```json
{
  "success": true,
  "index": "NDVI",
  "tileUrl": "https://earthengine.googleapis.com/v1alpha/...",
  "stats": {
    "mean": 0.45,
    "stdDev": 0.12,
    "min": -0.3,
    "max": 0.89
  },
  "imageCount": 15,
  "period": {"start": "2024-01-01", "end": "2024-02-01"}
}
```

### POST /ndre
Mesmo formato para NDRE (Normalized Difference Red Edge).

### POST /msavi
Mesmo formato para MSAVI (Modified Soil Adjusted Vegetation Index).

## Iniciar o Serviço

### Local (desenvolvimento):
```bash
cd /home/clawdbot_user/clawd/booster_agro/gee-service
pip install -r requirements.txt
python app.py
```

### Produção (gunicorn):
```bash
./start.sh
```

### Docker:
```bash
docker-compose up -d
```

## Testes

Veja o arquivo `test_examples.sh` para exemplos de chamadas curl.
