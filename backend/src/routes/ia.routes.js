const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

// Função para obter instância OpenAI com API key atual
function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'sk-fake-key-for-development') {
    return null;
  }
  return new OpenAI({ apiKey });
}

// Analisar imagem com Vision AI (GPT-4o)
router.post('/analisar-imagem', async (req, res) => {
  try {
    const { imagemBase64, tipoCultura = 'soja' } = req.body;
    
    if (!imagemBase64) {
      return res.status(400).json({ 
        sucesso: false, 
        erro: 'Imagem não fornecida' 
      });
    }

    // Verificar se API key está configurada
    const openai = getOpenAI();
    if (!openai) {
      // Modo simulação para desenvolvimento
      console.log('⚠️ OPENAI_API_KEY não configurada - usando simulação');
      
      const analisesSimuladas = [
        {
          tipo: 'Lagarta Helicoverpa armigera',
          categoria: 'praga',
          severidade: 'alta',
          confianca: 0.91,
          descricao: 'Detectada lagarta Helicoverpa armigera em estágio inicial de infestação. Presença de danos característicos em folhas e estruturas florais.',
          recomendacao: 'Aplicar inseticida específico (Clorantraniliprole ou Indoxacarb) nas próximas 48h. Monitorar áreas adjacentes.',
          sintomas: ['Folhas com orifícios irregulares', 'Dano em estruturas florais', 'Presença de excrementos'],
          estagio: 'L3-L4 (3º a 4º instar)',
          danos: 'Médio a Alto'
        },
        {
          tipo: 'Ferrugem Asiática',
          categoria: 'doenca',
          severidade: 'media',
          confianca: 0.87,
          descricao: 'Manchas de ferrugem asiática (Phakopsora pachyrhizi) identificadas em folhas do limbo. Lesões pequenas e elevadas de cor marrom-avermelhada.',
          recomendacao: 'Aplicar fungicida triazólico (Tebuconazole ou Cyproconazole). Monitorar condições climáticas (umidade > 70%).',
          sintomas: ['Pústulas elevadas castanho-avermelhadas', 'Lesões pequenas (2-5mm)', 'Amarelecimento foliar adjacente'],
          estagio: 'Inicial a Moderado',
          danos: 'Baixo a Médio'
        },
        {
          tipo: 'Deficiência de Nitrogênio',
          categoria: 'outro',
          severidade: 'media',
          confianca: 0.82,
          descricao: 'Sintomas característicos de deficiência de nitrogênio: clorose generalizada iniciando em folhas mais velhas.',
          recomendacao: 'Aplicar adubação nitrogenada (Uréia ou Nitrato de Amônio) a lanco ou via fertirrigação. Dose: 30-50 kg/ha de N.',
          sintomas: ['Clorose amarela folhas velhas', 'Crescimento atrofiado', 'Folhas pequenas e finas'],
          estagio: 'Moderado',
          danos: 'Redução de 15-25% na produtividade esperada'
        }
      ];
      
      const analiseAleatoria = analisesSimuladas[Math.floor(Math.random() * analisesSimuladas.length)];
      
      return res.json({
        sucesso: true,
        simulacao: true,
        analise: analiseAleatoria
      });
    }

    // Análise real com GPT-4o Vision
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Você é um especialista em agronomia e fitopatologia com foco em culturas brasileiras. 
Analise imagens de lavouras e identifique pragas, doenças ou problemas nutricionais.

Responda APENAS em formato JSON com a seguinte estrutura:
{
  "tipo": "Nome específico da praga/doença/deficiência",
  "categoria": "praga" | "doenca" | "outro",
  "severidade": "baixa" | "media" | "alta" | "critica",
  "confianca": 0.0 a 1.0,
  "descricao": "Descrição detalhada do problema identificado",
  "recomendacao": "Recomendação técnica específica para tratamento",
  "sintomas": ["sintoma 1", "sintoma 2", "sintoma 3"],
  "estagio": "Estágio do problema (ex: Inicial, Moderado, Avançado)",
  "danos": "Nível de dano esperado"
}

Se não conseguir identificar com confiança, retorne:
{
  "tipo": "Não identificado",
  "categoria": "outro",
  "severidade": "baixa",
  "confianca": 0.3,
  "descricao": "Não foi possível identificar o problema com certeza.",
  "recomendacao": "Consulte um agrônomo para avaliação presencial.",
  "sintomas": [],
  "estagio": "Indeterminado",
  "danos": "Indeterminado"
}`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analise esta imagem de uma lavoura de ${tipoCultura}. Identifique qualquer praga, doença ou problema nutricional visível.`
            },
            {
              type: "image_url",
              image_url: {
                url: imagemBase64.startsWith('data:image') ? imagemBase64 : `data:image/jpeg;base64,${imagemBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.3
    });

    // Parse da resposta
    let analise;
    try {
      const content = response.choices[0].message.content;
      // Extrair JSON da resposta (pode vir com markdown)
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/({[\s\S]*})/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      analise = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Erro ao parsear resposta da OpenAI:', parseError);
      analise = {
        tipo: "Erro de análise",
        categoria: "outro",
        severidade: "baixa",
        confianca: 0.0,
        descricao: "Não foi possível processar a resposta da IA.",
        recomendacao: "Tente novamente ou consulte um especialista.",
        sintomas: [],
        estagio: "Indeterminado",
        danos: "Indeterminado"
      };
    }

    res.json({
      sucesso: true,
      simulacao: false,
      analise
    });

  } catch (err) {
    console.error('Erro na análise de imagem:', err);
    res.status(500).json({ 
      sucesso: false, 
      erro: 'Erro ao analisar imagem: ' + err.message 
    });
  }
});

module.exports = router;