/**
 * Hook para gerenciar Notificações Push
 * 
 * Uso:
 * const { 
 *   permission, 
 *   isSupported, 
 *   subscribe, 
 *   unsubscribe,
 *   isSubscribed 
 * } = usePushNotifications();
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3002';

export function usePushNotifications() {
  const { usuario } = useAuth();
  const [permission, setPermission] = useState(Notification.permission);
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verificar suporte e permissão inicial
  useEffect(() => {
    const checkSupport = () => {
      const supported = 
        'serviceWorker' in navigator && 
        'PushManager' in window && 
        'Notification' in window;
      
      setIsSupported(supported);
      setPermission(Notification.permission);

      if (supported) {
        checkExistingSubscription();
      }
    };

    checkSupport();
  }, []);

  // Verificar subscription existente
  const checkExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        setSubscription(existingSubscription);
        setIsSubscribed(true);
        console.log('🔔 Subscription existente encontrada');
      }
    } catch (err: any) {
      console.error('Erro ao verificar subscription:', err);
    }
  };

  // Solicitar permissão de notificação
  const requestPermission = async () => {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (err: any) {
      console.error('Erro ao solicitar permissão:', err);
      setError('Erro ao solicitar permissão');
      return false;
    }
  };

  // Registrar service worker
  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('🔔 Service Worker registrado:', registration.scope);
      return registration;
    } catch (err: any) {
      console.error('Erro ao registrar service worker:', err);
      throw new Error('Falha ao registrar service worker');
    }
  };

  // Obter chave pública VAPID
  const getVapidPublicKey = async () => {
    try {
      const response = await fetch(`${API_URL}/api/notificacoes/vapid-public-key`);
      const data = await response.json();
      return data.publicKey;
    } catch (err: any) {
      console.error('Erro ao obter VAPID key:', err);
      throw new Error('Falha ao obter chave pública');
    }
  };

  // Converter VAPID key para Uint8Array
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Assinar para receber notificações push
  const subscribe = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Verificar suporte
      if (!isSupported) {
        throw new Error('Seu navegador não suporta notificações push');
      }

      // 2. Solicitar permissão
      const permissionGranted = await requestPermission();
      if (!permissionGranted) {
        throw new Error('Permissão de notificação negada');
      }

      // 3. Registrar service worker
      let registration = await navigator.serviceWorker.ready;
      if (!registration) {
        registration = await registerServiceWorker();
      }

      // 4. Obter VAPID key
      const vapidPublicKey = await getVapidPublicKey();
      
      // 5. Criar subscription
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // 6. Enviar para o backend
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/notificacoes/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subscription: newSubscription.toJSON(),
          usuario_id: usuario?.id
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao salvar subscription no servidor');
      }

      setSubscription(newSubscription);
      setIsSubscribed(true);
      
      // Mostrar notificação de boas-vindas
      if (registration.active) {
        registration.active.postMessage({
          type: 'SHOW_LOCAL_NOTIFICATION',
          title: '🔔 Notificações Ativadas!',
          body: 'Você receberá alertas sobre análises de inspeção.',
          icon: '/logo192.png'
        });
      }

      console.log('✅ Inscrição em notificações realizada com sucesso');
      return true;

    } catch (err: any) {
      console.error('Erro na inscrição:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Cancelar assinatura
  const unsubscribe = async () => {
    setLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const currentSubscription = await registration.pushManager.getSubscription();

      if (currentSubscription) {
        await currentSubscription.unsubscribe();

        // Notificar backend
        const token = localStorage.getItem('token');
        await fetch(`${API_URL}/api/notificacoes/unsubscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            endpoint: currentSubscription.endpoint
          })
        });
      }

      setSubscription(null);
      setIsSubscribed(false);
      console.log('🚫 Inscrição em notificações cancelada');
      return true;

    } catch (err: any) {
      console.error('Erro ao cancelar inscrição:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    permission,
    isSupported,
    isSubscribed,
    subscription,
    loading,
    error,
    subscribe,
    unsubscribe,
    requestPermission
  };
}

export default usePushNotifications;
