/**
 * Rotas de Notificações Push
 * Sistema de notificações web push para alertar usuários
 */

const express = require('express');
const webpush = require('web-push');
const router = express.Router();

// Configurar VAPID
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@agrofocus.com';

if (!vapidPublicKey || !vapidPrivateKey) {
  console.error('❌ VAPID keys não configuradas! Execute: npx web-push generate-vapid-keys');
} else {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  console.log('✅ VAPID configurado para notificações push');
}

// Em memória (deve ser substituído por PostgreSQL em produção)
const subscriptions = new Map();
const notificacoesEnviadas = [];

/**
 * @route POST /api/notificacoes/subscribe
 * @desc Registrar subscription do usuário para push
 * @access Privado (requer autenticação)
 */
router.post('/subscribe', (req, res) => {
  try {
    const { subscription, usuario_id } = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Subscription inválida'
      });
    }

    // Salvar subscription com chave baseada no endpoint
    const subscriptionKey = subscription.endpoint;
    subscriptions.set(subscriptionKey, {
      subscription,
      usuario_id: usuario_id || req.usuario?.id || 'anonimo',
      criado_em: new Date().toISOString(),
      ultimo_acesso: new Date().toISOString()
    });

    console.log(`🔔 Nova subscription registrada para usuário: ${usuario_id || 'anonimo'}`);

    res.json({
      sucesso: true,
      mensagem: 'Subscription registrada com sucesso'
    });

  } catch (err) {
    console.error('Erro ao registrar subscription:', err);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro ao registrar subscription'
    });
  }
});

/**
 * @route POST /api/notificacoes/unsubscribe
 * @desc Remover subscription do usuário
 * @access Privado
 */
router.post('/unsubscribe', (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Endpoint é obrigatório'
      });
    }

    subscriptions.delete(endpoint);

    res.json({
      sucesso: true,
      mensagem: 'Subscription removida'
    });

  } catch (err) {
    console.error('Erro ao remover subscription:', err);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro ao remover subscription'
    });
  }
});

/**
 * @route GET /api/notificacoes/vapid-public-key
 * @desc Obter chave pública VAPID para o frontend
 * @access Público
 */
router.get('/vapid-public-key', (req, res) => {
  res.json({
    publicKey: vapidPublicKey
  });
});

/**
 * @route POST /api/notificacoes/send
 * @desc Enviar notificação push para um ou mais usuários
 * @access Privado (apenas admin ou sistema)
 */
router.post('/send', async (req, res) => {
  try {
    const { 
      titulo, 
      corpo, 
      icone, 
      imagem, 
      url, 
      usuario_ids,
      dados 
    } = req.body;

    if (!titulo || !corpo) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Título e corpo são obrigatórios'
      });
    }

    // Montar payload da notificação
    const payload = JSON.stringify({
      notification: {
        title: titulo,
        body: corpo,
        icon: icone || '/logo192.png',
        image: imagem,
        data: {
          url: url || '/',
          ...dados
        },
        actions: [
          {
            action: 'open',
            title: 'Ver'
          }
        ],
        requireInteraction: true,
        badge: '/badge-72x72.png',
        tag: `notificacao-${Date.now()}`,
        renotify: true
      }
    });

    const resultados = {
      enviados: 0,
      falhas: 0,
      erros: []
    };

    // Filtrar subscriptions
    const subscriptionsToSend = usuario_ids 
      ? Array.from(subscriptions.entries()).filter(([_, sub]) => 
          usuario_ids.includes(sub.usuario_id)
        )
      : Array.from(subscriptions.entries());

    // Enviar para cada subscription
    for (const [key, sub] of subscriptionsToSend) {
      try {
        await webpush.sendNotification(sub.subscription, payload);
        resultados.enviados++;
        
        // Atualizar último acesso
        sub.ultimo_acesso = new Date().toISOString();
        
      } catch (err) {
        resultados.falhas++;
        
        // Se erro 410 (Gone), remover subscription expirada
        if (err.statusCode === 410) {
          subscriptions.delete(key);
          console.log(`🗑️ Subscription expirada removida: ${sub.usuario_id}`);
        } else {
          resultados.erros.push({
            usuario: sub.usuario_id,
            erro: err.message
          });
        }
      }
    }

    // Registrar notificação enviada
    const notificacaoRegistro = {
      id: Date.now().toString(),
      titulo,
      corpo,
      url,
      usuario_ids: usuario_ids || 'todos',
      enviados: resultados.enviados,
      falhas: resultados.falhas,
      data: new Date().toISOString()
    };
    notificacoesEnviadas.push(notificacaoRegistro);

    console.log(`📨 Notificação enviada: "${titulo}" - ${resultados.enviados} sucesso, ${resultados.falhas} falhas`);

    res.json({
      sucesso: true,
      mensagem: `Notificação enviada para ${resultados.enviados} dispositivos`,
      resultados
    });

  } catch (err) {
    console.error('Erro ao enviar notificação:', err);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro ao enviar notificação'
    });
  }
});

/**
 * @route GET /api/notificacoes/historico
 * @desc Listar histórico de notificações enviadas
 * @access Privado
 */
router.get('/historico', (req, res) => {
  const { limit = 50 } = req.query;
  
  const historico = notificacoesEnviadas
    .slice(-parseInt(limit))
    .reverse();

  res.json({
    sucesso: true,
    total: historico.length,
    notificacoes: historico
  });
});

/**
 * @route GET /api/notificacoes/subscriptions
 * @desc Listar subscriptions ativas (admin)
 * @access Privado (apenas admin)
 */
router.get('/subscriptions', (req, res) => {
  const subs = Array.from(subscriptions.entries()).map(([key, sub]) => ({
    endpoint_preview: sub.subscription.endpoint.substring(0, 50) + '...',
    usuario_id: sub.usuario_id,
    criado_em: sub.criado_em,
    ultimo_acesso: sub.ultimo_acesso
  }));

  res.json({
    sucesso: true,
    total: subs.length,
    subscriptions: subs
  });
});

// Função auxiliar para enviar notificação de análise pronta
async function enviarNotificacaoAnalise(inspecao, usuarioId) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('⚠️ VAPID não configurado, notificação não enviada');
    return { sucesso: false, erro: 'VAPID não configurado' };
  }

  const payload = JSON.stringify({
    notification: {
      title: '🔬 Análise Pronta!',
      body: `Seu diagnóstico de ${inspecao.cultura} está disponível`,
      icon: '/logo192.png',
      badge: '/badge-72x72.png',
      data: {
        url: `/inspecao/${inspecao.id}/resultado`,
        inspecao_id: inspecao.id,
        tipo: 'analise_pronta'
      },
      actions: [
        { action: 'open', title: 'Ver Análise' },
        { action: 'dismiss', title: 'Fechar' }
      ],
      requireInteraction: true,
      tag: `analise-${inspecao.id}`,
      renotify: true
    }
  });

  // Encontrar subscriptions do usuário
  const userSubscriptions = Array.from(subscriptions.entries())
    .filter(([_, sub]) => sub.usuario_id === usuarioId);

  if (userSubscriptions.length === 0) {
    console.log(`📭 Nenhuma subscription encontrada para usuário: ${usuarioId}`);
    return { sucesso: false, erro: 'Usuário sem subscriptions' };
  }

  const resultados = { enviados: 0, falhas: 0 };

  for (const [key, sub] of userSubscriptions) {
    try {
      await webpush.sendNotification(sub.subscription, payload);
      resultados.enviados++;
    } catch (err) {
      resultados.falhas++;
      if (err.statusCode === 410) {
        subscriptions.delete(key);
      }
    }
  }

  console.log(`🔔 Notificação de análise enviada para ${usuarioId}: ${resultados.enviados} dispositivo(s)`);
  
  return {
    sucesso: resultados.enviados > 0,
    resultados
  };
}

// Função auxiliar para enviar notificação de nova inspeção pendente
async function enviarNotificacaoNovaInspecao(inspecao) {
  if (!vapidPublicKey || !vapidPrivateKey) return { sucesso: false };

  const payload = JSON.stringify({
    notification: {
      title: '📸 Nova Inspeção Pendente',
      body: `${inspecao.cultura} em ${inspecao.talhao_nome} - Aguardando análise`,
      icon: '/logo192.png',
      badge: '/badge-72x72.png',
      data: {
        url: '/especialista',
        inspecao_id: inspecao.id,
        tipo: 'nova_inspecao'
      },
      actions: [
        { action: 'open', title: 'Analisar' },
        { action: 'dismiss', title: 'Ignorar' }
      ],
      tag: `pendente-${inspecao.id}`,
      requireInteraction: false
    }
  });

  // Enviar para todos os usuários (ou filtrar por perfil de especialista)
  const resultados = { enviados: 0, falhas: 0 };

  for (const [key, sub] of subscriptions.entries()) {
    try {
      await webpush.sendNotification(sub.subscription, payload);
      resultados.enviados++;
    } catch (err) {
      resultados.falhas++;
      if (err.statusCode === 410) {
        subscriptions.delete(key);
      }
    }
  }

  return { sucesso: resultados.enviados > 0, resultados };
}

module.exports = {
  router,
  enviarNotificacaoAnalise,
  enviarNotificacaoNovaInspecao,
  subscriptions,
  notificacoesEnviadas
};
