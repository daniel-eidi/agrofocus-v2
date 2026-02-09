const express = require('express');
const router = express.Router();

// Banco de dados em memória para inspeções pendentes
const inspecoesPendentes = new Map();

// Criar nova inspeção pendente de análise do especialista
router.post('/pendentes', async (req, res) => {
  try {
    const {
      fotos,
      cultura,
      talhao_id,
      talhao_nome,
      fazenda_id,
      fazenda_nome,
      latitude,
      longitude,
      operador_id,
      operador_nome,
      observacoes
    } = req.body;

    if (!fotos || fotos.length === 0) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Pelo menos uma foto é obrigatória'
      });
    }

    const inspecaoId = Date.now().toString();
    
    const inspecao = {
      id: inspecaoId,
      fotos,
      cultura: cultura || 'Não especificada',
      talhao_id,
      talhao_nome: talhao_nome || 'Não especificado',
      fazenda_id,
      fazenda_nome: fazenda_nome || 'Não especificado',
      latitude,
      longitude,
      operador_id: operador_id || req.usuario?.id,
      operador_nome: operador_nome || req.usuario?.nome || 'Operador',
      observacoes: observacoes || '',
      status: 'pendente',
      data_criacao: new Date().toISOString(),
      data_analise: null,
      analise: null
    };

    inspecoesPendentes.set(inspecaoId, inspecao);

    // Log de notificação para o especialista (Clawdbot)
    console.log('\n🔔 =========================================');
    console.log('🔔 NOVA INSPEÇÃO PENDENTE DE ANÁLISE');
    console.log('🔔 =========================================');
    console.log(`🆔 ID: ${inspecaoId}`);
    console.log(`🌱 Cultura: ${inspecao.cultura}`);
    console.log(`🏡 Fazenda: ${inspecao.fazenda_nome}`);
    console.log(`📍 Talhão: ${inspecao.talhao_nome}`);
    console.log(`👤 Operador: ${inspecao.operador_nome}`);
    console.log(`📸 Fotos: ${fotos.length}`);
    console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}`);
    console.log('🔔 =========================================\n');

    // Retornar URL da primeira foto para fácil acesso
    const fotoPreview = fotos[0].substring(0, 100) + '...';

    res.status(201).json({
      sucesso: true,
      inspecao: {
        id: inspecaoId,
        status: 'pendente',
        talhao_nome: inspecao.talhao_nome,
        fazenda_nome: inspecao.fazenda_nome,
        mensagem: 'Inspeção registrada e aguardando análise do especialista'
      },
      notificacao: {
        mensagem: `🆕 Nova inspeção pendente: ${inspecao.cultura} em ${inspecao.talhao_nome}`,
        foto_url: inspecao.fotos[0]
      }
    });

  } catch (err) {
    console.error('Erro ao criar inspeção pendente:', err);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro ao registrar inspeção: ' + err.message
    });
  }
});

// Listar inspeções pendentes (para o especialista)
router.get('/pendentes', async (req, res) => {
  try {
    const pendentes = Array.from(inspecoesPendentes.values())
      .filter(i => i.status === 'pendente')
      .sort((a, b) => new Date(b.data_criacao) - new Date(a.data_criacao));

    res.json({
      sucesso: true,
      total: pendentes.length,
      inspecoes: pendentes.map(i => ({
        id: i.id,
        cultura: i.cultura,
        talhao_nome: i.talhao_nome,
        fazenda_nome: i.fazenda_nome,
        operador_nome: i.operador_nome,
        data_criacao: i.data_criacao,
        foto_preview: i.fotos[0],
        observacoes: i.observacoes
      }))
    });

  } catch (err) {
    res.status(500).json({
      sucesso: false,
      erro: err.message
    });
  }
});

// Obter detalhes de uma inspeção pendente
router.get('/pendentes/:id', async (req, res) => {
  try {
    const inspecao = inspecoesPendentes.get(req.params.id);
    
    if (!inspecao) {
      return res.status(404).json({
        sucesso: false,
        erro: 'Inspeção não encontrada'
      });
    }

    res.json({
      sucesso: true,
      inspecao
    });

  } catch (err) {
    res.status(500).json({
      sucesso: false,
      erro: err.message
    });
  }
});

// Submeter análise do especialista
router.post('/pendentes/:id/analisar', async (req, res) => {
  try {
    const inspecao = inspecoesPendentes.get(req.params.id);
    
    if (!inspecao) {
      return res.status(404).json({
        sucesso: false,
        erro: 'Inspeção não encontrada'
      });
    }

    const {
      tipo,
      categoria,
      severidade,
      confianca,
      descricao,
      recomendacao,
      sintomas,
      estagio,
      danos,
      produtosSugeridos,
      prazoAcao,
      observacoesEspecialista
    } = req.body;

    // Validar campos obrigatórios
    if (!tipo || !categoria || !descricao) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Tipo, categoria e descrição são obrigatórios'
      });
    }

    // Atualizar inspeção com análise
    inspecao.status = 'analisada';
    inspecao.data_analise = new Date().toISOString();
    inspecao.analise = {
      tipo,
      categoria,
      severidade: severidade || 'media',
      confianca: confianca || 0.95,
      descricao,
      recomendacao: recomendacao || '',
      sintomas: sintomas || [],
      estagio: estagio || 'Não especificado',
      danos: danos || 'Não especificado',
      produtosSugeridos: produtosSugeridos || [],
      prazoAcao: prazoAcao || 'Monitorar',
      observacoesEspecialista: observacoesEspecialista || '',
      analista: 'Especialista AgroFocus',
      data_analise: new Date().toISOString()
    };

    // Salvar também na lista de ocorrências (para aparecer no dashboard)
    // Isso seria integrado com o sistema de ocorrências existente
    
    console.log('\n✅ =========================================');
    console.log('✅ INSPEÇÃO ANALISADA PELO ESPECIALISTA');
    console.log('✅ =========================================');
    console.log(`🆔 ID: ${inspecao.id}`);
    console.log(`🌱 Diagnóstico: ${tipo}`);
    console.log(`📊 Severidade: ${severidade}`);
    console.log(`✅ =========================================\n`);

    res.json({
      sucesso: true,
      mensagem: 'Análise registrada com sucesso',
      inspecao: {
        id: inspecao.id,
        status: 'analisada',
        analise: inspecao.analise
      }
    });

  } catch (err) {
    res.status(500).json({
      sucesso: false,
      erro: err.message
    });
  }
});

// Verificar status de uma inspeção (para o operador consultar)
router.get('/:id/status', async (req, res) => {
  try {
    const inspecao = inspecoesPendentes.get(req.params.id);
    
    if (!inspecao) {
      return res.status(404).json({
        sucesso: false,
        erro: 'Inspeção não encontrada'
      });
    }

    res.json({
      sucesso: true,
      id: inspecao.id,
      status: inspecao.status,
      data_criacao: inspecao.data_criacao,
      data_analise: inspecao.data_analise,
      analise: inspecao.analise
    });

  } catch (err) {
    res.status(500).json({
      sucesso: false,
      erro: err.message
    });
  }
});

// Rejeitar análise (se a foto não for adequada)
router.post('/pendentes/:id/rejeitar', async (req, res) => {
  try {
    const inspecao = inspecoesPendentes.get(req.params.id);
    
    if (!inspecao) {
      return res.status(404).json({
        sucesso: false,
        erro: 'Inspeção não encontrada'
      });
    }

    const { motivo } = req.body;

    inspecao.status = 'rejeitada';
    inspecao.motivo_rejeicao = motivo || 'Foto não adequada para análise';

    res.json({
      sucesso: true,
      mensagem: 'Inspeção rejeitada',
      motivo: inspecao.motivo_rejeicao
    });

  } catch (err) {
    res.status(500).json({
      sucesso: false,
      erro: err.message
    });
  }
});

module.exports = router;