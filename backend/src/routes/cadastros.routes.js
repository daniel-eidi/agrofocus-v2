const express = require('express');
const router = express.Router();
const { Safra, Fazenda } = require('../models/db.models');

// GET /api/safras
router.get('/safras', async (req, res) => {
  try {
    const safras = await Safra.findAll();
    res.json(safras);
  } catch (error) {
    console.error('Erro ao buscar safras:', error);
    res.status(500).json({ error: 'Erro interno ao buscar safras' });
  }
});

// POST /api/safras
router.post('/safras', async (req, res) => {
  const { nome, cultura, ano_inicio, ano_fim, status, fazenda_id } = req.body;
  
  // Apenas nome e anos são obrigatórios (cultura e fazenda são opcionais)
  if (!nome || !ano_inicio || !ano_fim) {
    return res.status(400).json({ error: 'Campos obrigatórios: Nome, Ano Início e Ano Fim' });
  }

  try {
    const novaSafra = await Safra.create({
      nome,
      cultura: cultura || null,
      ano_inicio,
      ano_fim,
      status: status || 'planejada',
      fazenda_id: fazenda_id || null,
      data_inicio: `${ano_inicio}-09-01`,
      data_fim: `${ano_fim}-02-28`
    });

    res.status(201).json(novaSafra);
  } catch (error) {
    console.error('Erro ao criar safra:', error);
    res.status(500).json({ error: 'Erro ao salvar safra no banco de dados.' });
  }
});

module.exports = router;
