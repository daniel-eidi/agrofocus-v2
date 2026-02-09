# ADR-003: PWA com Funcionalidades Offline

## Status
✅ **Aceito** - 2026-02-09

## Contexto
Agricultores frequentemente trabalham em áreas com:
- Sinal de internet fraco ou inexistente
- Necessidade de registrar inspeções no campo
- Urgência em documentar problemas imediatamente

## Decisão
Implementar **PWA completo** com:
1. Service Worker para cache
2. IndexedDB para dados offline
3. Background Sync para sincronização
4. Install prompt para "app nativo"

## Consequências

### Positivas:
- ✅ Funciona sem internet
- ✅ Instalação na tela inicial (iOS/Android)
- ✅ Sincronização automática quando online
- ✅ Experiência similar a app nativo

### Negativas:
- ⚠️ Complexidade adicional
- ⚠️ Gerenciamento de estado offline/online
- ⚠️ Testes em múltiplos dispositivos

## Estratégias de Cache

| Recurso | Estratégia |
|---------|-----------|
| Assets (CSS/JS) | Cache First |
| API calls | Network First |
| Fotos | Cache + IndexedDB |
| Inspeções | IndexedDB + Background Sync |

## Tecnologias

- **Service Worker:** Nativo do browser
- **IndexedDB:** `idb` (wrapper)
- **Background Sync:** Service Worker API
- **Push:** Web Push API

## Testes

```bash
# Lighthouse audit
npm run build
# Chrome DevTools → Lighthouse → PWA

# Teste offline
# Chrome DevTools → Network → Offline
# Criar inspeção → Verificar IndexedDB
# Voltar online → Verificar sincronização
```

## Métricas de Sucesso

- [ ] Lighthouse PWA score > 90
- [ ] Instalação funciona em iOS/Android
- [ ] Inspeções offline sincronizam corretamente
- [ ] Tempo de carregamento < 3s (cache)
