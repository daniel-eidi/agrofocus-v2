const express = require('express');
const router = express.Router();

// Analisar imagem com Claude Vision (via OpenClaw)
router.post('/analisar-imagem', async (req, res) => {
  try {
    const { imagemBase64, tipoCultura = 'soja' } = req.body;
    
    if (!imagemBase64) {
      return res.status(400).json({ 
        sucesso: false, 
        erro: 'Imagem não fornecida' 
      });
    }

    // Extrair base64 limpo (remover prefixo data:image/...)
    let base64Limpio = imagemBase64;
    if (imagemBase64.includes(',')) {
      base64Limpio = imagemBase64.split(',')[1];
    }

    // Converter base64 para buffer
    const buffer = Buffer.from(base64Limpio, 'base64');
    
    // Criar data URL para análise
    const mimeType = imagemBase64.includes('image/png') ? 'image/png' : 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64Limpio}`;

    // Análise detalhada para agricultura
    const prompt = `Você é um agrônomo especialista em fitopatologia e manejo de culturas brasileiras.

Analise esta imagem de uma lavoura de ${tipoCultura} e identifique:
1. Qual problema está presente (praga, doença, deficiência nutricional, ou se está saudável)
2. Nome científico e comum do problema
3. Severidade (baixa, média, alta, crítica)
4. Estágio do problema
5. Sintomas visíveis na imagem
6. Recomendação técnica específica para o Brasil

Responda APENAS em formato JSON:
{
  "tipo": "Nome específico do problema",
  "nomeCientifico": "Nome científico (se aplicável)",
  "categoria": "praga" | "doenca" | "deficiencia" | "saudavel",
  "severidade": "baixa" | "media" | "alta" | "critica",
  "confianca": 0.0 a 1.0,
  "estagio": "inicial" | "moderado" | "avancado",
  "sintomas": ["sintoma 1", "sintoma 2", "sintoma 3"],
  "descricao": "Descrição detalhada do que foi observado",
  "recomendacao": "Recomendação técnica específica para tratamento/manejo",
  "produtosSugeridos": ["produto 1", "produto 2"],
  "prazoAcao": "Imediato" | "24h" | "48h" | "7 dias" | "Monitorar",
  "danosEstimados": "Descrição do impacto na produtividade se não tratado"
}

Se a planta estiver saudável, retorne categoria "saudavel" com recomendações de manutenção.
Se não conseguir identificar com certeza, seja honesto sobre a incerteza.`;

    // Como não posso chamar a ferramenta image diretamente do backend Node,
    // vou retornar a estrutura e o frontend pode usar a sessão do OpenClaw
    // OU implementar um webhook
    
    // Por enquanto, retornar erro informativo sobre como proceder
    res.json({
      sucesso: true,
      modo: 'claude-vision',
      mensagem: 'Análise deve ser feita via sessão OpenClaw',
      imagemUrl: dataUrl.substring(0, 100) + '...',
      tipoCultura
    });

  } catch (err) {
    console.error('Erro na análise de imagem:', err);
    res.status(500).json({ 
      sucesso: false, 
      erro: 'Erro ao processar imagem: ' + err.message 
    });
  }
});

// Endpoint para receber resultado da análise Claude
router.post('/analisar-imagem/resultado', async (req, res) => {
  // Este endpoint seria chamado pelo OpenClaw após análise
  // Implementação futura
  res.json({ sucesso: true, mensagem: 'Endpoint para resultado da análise' });
});

module.exports = router;