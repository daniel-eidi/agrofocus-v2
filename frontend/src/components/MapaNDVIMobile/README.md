# Mapa NDVI Mobile - AgroFocus

Componente de mapa NDVI otimizado para dispositivos móveis - FASE 6 do projeto.

## 📱 Funcionalidades

### 1. Camada Base Satélite
- Imagens de satélite de alta resolução (Esri ArcGIS)
- Labels de cidades e estradas sobrepostos
- Carregamento otimizado para conexões 3G/4G

### 2. Overlay NDVI Toggle
- Visualização de índice de vegetação por cores
- 5 níveis de classificação:
  - 🟢 **Excelente** (0.8-1.0) - Verde escuro
  - 🟢 **Bom** (0.6-0.8) - Verde claro
  - 🟡 **Moderado** (0.4-0.6) - Amarelo
  - 🟠 **Ruim** (0.2-0.4) - Laranja
  - 🔴 **Muito Ruim** (0.0-0.2) - Vermelho
- Botão toggle para ligar/desligar camada

### 3. Controles Touch
- **Pinch Zoom**: Aproximar/afastar com dois dedos
- **Double Tap**: Zoom in rápido
- **Two Finger Tap**: Zoom out rápido
- **Pan**: Arrastar mapa com um dedo (nativo)
- Feedback tátil em todas as ações

### 4. Botão "Minha Localização"
- Obtém posição via GPS do dispositivo
- Mostra precisão com círculo azul
- Centraliza mapa automaticamente
- Feedback visual e tátil

### 5. Painel Inferior
- Handle para arrastar (UX mobile)
- Status em tempo real
- Legenda NDVI colorida
- Botões de ação rápida

### 6. Otimizações Mobile
- Tela cheia (fullscreen API)
- Safe areas (notch, home indicator)
- Touch targets 48x48px (Material Design)
- Responsivo para todos os tamanhos
- Previne bounce no iOS

## 🚀 Uso

```tsx
import MapaNDVIMobile from './components/MapaNDVIMobile';

function App() {
  const ndviPolygons = [
    {
      id: 'talhao-01',
      bounds: [[-16.68, -49.27], [-16.685, -49.265]],
      level: 'excellent',
      value: 0.85
    },
    // ...
  ];

  return (
    <MapaNDVIMobile
      fazendaId="Fazenda São José"
      talhaoId="talhao-01"
      ndviPolygons={ndviPolygons}
      onPolygonClick={(polygon) => console.log(polygon)}
    />
  );
}
```

## 🎨 Props

| Prop | Tipo | Descrição |
|------|------|-----------|
| `fazendaId` | string | ID/nome da fazenda |
| `talhaoId` | string | ID do talhão selecionado |
| `ndviPolygons` | NDVIPolygon[] | Array de polígonos NDVI |
| `onPolygonClick` | function | Callback ao clicar em polígono |
| `className` | string | Classes CSS adicionais |

## 📦 Tipos

```typescript
type NDVILevel = 'excellent' | 'good' | 'moderate' | 'poor' | 'very-poor';

interface NDVIPolygon {
  id: string;
  bounds: L.LatLngBoundsExpression;
  level: NDVILevel;
  value: number; // 0.0 - 1.0
}
```

## 🛠️ Hooks Disponíveis

### useTouchGestures
Gerencia gestos touch no mapa:
```typescript
const gestureState = useTouchGestures(map, {
  onPinchZoom: (scale) => console.log('Pinch:', scale),
  onDoubleTap: () => console.log('Double tap!'),
  onTwoFingerTap: () => console.log('Two finger tap!')
});
```

### useUserLocation
Gerencia geolocalização:
```typescript
const { position, error, isLoading, getLocation } = useUserLocation();
```

### useFullscreen
Gerencia modo tela cheia:
```typescript
const { isFullscreen, toggleFullscreen } = useFullscreen();
```

### useHaptics
Feedback tátil:
```typescript
const { trigger, light, medium, heavy, success, error } = useHaptics();
```

## 📋 Checklist FASE 6

- [x] Componente MapaNDVIMobile criado
- [x] Camada base satélite (Esri)
- [x] Overlay NDVI com toggle
- [x] Pinch zoom implementado
- [x] Double tap zoom in
- [x] Two finger tap zoom out
- [x] Botão "Minha Localização"
- [x] Painel inferior com legenda
- [x] Otimização para tela cheia
- [x] Touch targets 48x48px
- [x] Feedback tátil (vibration API)
- [x] Safe areas (notch)
- [x] Estilos responsivos

## 🧪 Teste

### Desktop
1. Acesse `/ndvi-mobile`
2. Use scroll para zoom
3. Clique para interagir
4. Teste modo fullscreen

### Mobile (Chrome DevTools)
1. Device Mode: iPhone 12 Pro / Pixel 5
2. Toque em elementos
3. Verifique touch targets
4. Teste gestos touch

### Dispositivo Real
1. Acesse via IP da rede local
2. Teste GPS no campo
3. Verifique offline
4. Teste sob luz solar

## 🔧 Configurações

```javascript
// Configurações padrão
const DEFAULT_CENTER = [-16.6869, -49.2648]; // Centro Brasil
const DEFAULT_ZOOM = 14;
const MIN_ZOOM = 10;
const MAX_ZOOM = 20;
```

## 📚 Dependências

- `react-leaflet`: Mapa interativo
- `leaflet`: Biblioteca de mapas
- `lucide-react`: Ícones
- Tailwind CSS: Estilos

## 🎯 Próximos Passos

- [ ] Integração com API real de NDVI
- [ ] Cache offline de tiles
- [ ] Histórico de NDVI (timeline)
- [ ] Comparação lado a lado
- [ ] Modo campo (luvas)

---

**Versão:** 1.0.0  
**FASE:** 6 - Mapa NDVI Mobile  
**Data:** Fev/2026
