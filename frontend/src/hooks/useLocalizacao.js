import { useState, useEffect, useCallback } from 'react';

const useLocalizacao = (options = {}) => {
  const { 
    enableHighAccuracy = true, 
    timeout = 10000, 
    maximumAge = 60000,
    autoRequest = false
  } = options;

  const [localizacao, setLocalizacao] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [permissao, setPermissao] = useState('prompt'); // 'granted', 'denied', 'prompt'

  const checkPermissao = useCallback(async () => {
    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        setPermissao(result.state);
        
        result.addEventListener('change', () => {
          setPermissao(result.state);
        });
      } catch (err) {
        console.error('Erro ao verificar permissão:', err);
      }
    }
  }, []);

  const solicitarLocalizacao = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        const err = new Error('Geolocalização não suportada neste navegador');
        setError(err.message);
        reject(err);
        return;
      }

      setLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp,
          };
          setLocalizacao(loc);
          setLoading(false);
          resolve(loc);
        },
        (err) => {
          let mensagem = 'Erro ao obter localização';
          switch (err.code) {
            case err.PERMISSION_DENIED:
              mensagem = 'Permissão de localização negada';
              setPermissao('denied');
              break;
            case err.POSITION_UNAVAILABLE:
              mensagem = 'Posição indisponível';
              break;
            case err.TIMEOUT:
              mensagem = 'Timeout ao obter localização';
              break;
          }
          setError(mensagem);
          setLoading(false);
          reject(new Error(mensagem));
        },
        {
          enableHighAccuracy,
          timeout,
          maximumAge,
        }
      );
    });
  }, [enableHighAccuracy, timeout, maximumAge]);

  const watchLocalizacao = useCallback((callback) => {
    if (!('geolocation' in navigator)) {
      setError('Geolocalização não suportada');
      return null;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };
        setLocalizacao(loc);
        if (callback) callback(loc);
      },
      (err) => {
        setError('Erro ao monitorar localização');
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [enableHighAccuracy, timeout, maximumAge]);

  useEffect(() => {
    checkPermissao();
    
    if (autoRequest && permissao !== 'denied') {
      solicitarLocalizacao().catch(() => {});
    }
  }, [checkPermissao, autoRequest, permissao, solicitarLocalizacao]);

  const formatarCoordenadas = useCallback((lat, lng, precisao = 4) => {
    return `${lat.toFixed(precisao)}, ${lng.toFixed(precisao)}`;
  }, []);

  const calcularDistancia = useCallback((lat1, lng1, lat2, lng2) => {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distância em km
  }, []);

  return {
    localizacao,
    error,
    loading,
    permissao,
    solicitarLocalizacao,
    watchLocalizacao,
    formatarCoordenadas,
    calcularDistancia,
    temSuporte: 'geolocation' in navigator,
  };
};

export default useLocalizacao;
