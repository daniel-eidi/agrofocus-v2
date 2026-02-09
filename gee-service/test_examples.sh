#!/bin/bash
# Exemplos de teste do serviço GEE Python

BASE_URL="http://localhost:5001"

echo "=== Testando Health Check ==="
curl -s "$BASE_URL/health" | python3 -m json.tool

echo -e "\n\n=== Testando NDVI ==="
curl -s -X POST "$BASE_URL/ndvi" \
  -H "Content-Type: application/json" \
  -d '{
    "geojson": {
      "type": "Polygon",
      "coordinates": [[
        [-46.6413, -23.5505],
        [-46.6313, -23.5505],
        [-46.6313, -23.5405],
        [-46.6413, -23.5405],
        [-46.6413, -23.5505]
      ]]
    },
    "startDate": "2024-01-01",
    "endDate": "2024-02-01",
    "cloudCover": 20
  }' | python3 -m json.tool

echo -e "\n\n=== Testando NDRE ==="
curl -s -X POST "$BASE_URL/ndre" \
  -H "Content-Type: application/json" \
  -d '{
    "geojson": {
      "type": "Polygon",
      "coordinates": [[
        [-46.6413, -23.5505],
        [-46.6313, -23.5505],
        [-46.6313, -23.5405],
        [-46.6413, -23.5405],
        [-46.6413, -23.5505]
      ]]
    },
    "startDate": "2024-01-01",
    "endDate": "2024-02-01",
    "cloudCover": 20
  }' | python3 -m json.tool

echo -e "\n\n=== Testando MSAVI ==="
curl -s -X POST "$BASE_URL/msavi" \
  -H "Content-Type: application/json" \
  -d '{
    "geojson": {
      "type": "Polygon",
      "coordinates": [[
        [-46.6413, -23.5505],
        [-46.6313, -23.5505],
        [-46.6313, -23.5405],
        [-46.6413, -23.5405],
        [-46.6413, -23.5505]
      ]]
    },
    "startDate": "2024-01-01",
    "endDate": "2024-02-01",
    "cloudCover": 20
  }' | python3 -m json.tool

echo -e "\n\n=== Testes concluídos ==="
