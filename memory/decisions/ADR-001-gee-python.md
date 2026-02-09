# ADR-001: Uso de Python para Google Earth Engine

## Status
✅ **Aceito** - 2026-02-09

## Contexto
A biblioteca Node.js `@google/earthengine` v1.7.12 possui um bug crítico com Node.js 25:
```
TypeError: module$contents$ee$apiclient_apiclient.apiBaseUrl_.replace is not a function
```

Isso impede o uso de dados reais de satélite no AgroFocus.

## Decisão
Criar um **serviço Python paralelo** usando a biblioteca oficial `earthengine-api` para Python, que é mais estável e mantida.

## Consequências

### Positivas:
- ✅ Serviço GEE funcional imediatamente
- ✅ Biblioteca Python é oficial e bem mantida
- ✅ Isolamento - falhas no GEE não derrubam a API principal
- ✅ Fácil de escalar independentemente

### Negativas:
- ⚠️ Manter 2 serviços (Node.js + Python)
- ⚠️ Comunicação HTTP entre serviços
- ⚠️ Docker compose mais complexo

## Alternativas Consideradas

| Alternativa | Motivo de Rejeição |
|-------------|-------------------|
| Aguardar correção Google | Tempo incerto, bloqueia deploy |
| Downgrade Node.js para v18 | Quebra outras dependências |
| Usar apenas Sentinel Hub | Limitado a dados recentes |

## Implementação

**Serviço:** `/gee-service/`
**Porta:** 5001
**Endpoints:** `/ndvi`, `/ndre`, `/msavi`

## Referências
- [Google Earth Engine Python API](https://developers.google.com/earth-engine/guides/python_install)
- Bug report: GitHub `google/earthengine-api` #341 (exemplo)
