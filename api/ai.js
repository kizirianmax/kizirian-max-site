/**
 * 🤖 ENDPOINT UNIFICADO DE IA - KIZI AI
 * 
 * Sistema inteligente com 3 motores:
 * - KIZI 2.5 Pro (Gemini 2.5 Pro) = Raciocínio complexo, análises profundas
 * - KIZI Speed (Groq Llama 70B) = Velocidade, respostas rápidas
 * - KIZI Flash (Gemini Flash) = Respostas simples, conversas leves
 * 
 * O sistema escolhe automaticamente o melhor motor baseado na complexidade.
 */

/**
 * Analisar complexidade da mensagem para escolher o motor ideal
 */
function analyzeComplexity(messages) {
  const lastMessage = messages[messages.length - 1]?.content || '';
  const allContent = messages.map(m => m.content).join(' ');
  
  // Indicadores de complexidade ALTA (KIZI 2.5 Pro)
  const complexIndicators = [
    /analis[ae]/i, /compar[ae]/i, /expliq/i, /detalh/i,
    /código|code|programa/i, /debug/i, /erro|error|bug/i,
    /arquitetura/i, /sistema/i, /projeto/i, /planeja/i,
    /pesquis/i, /estud/i, /aprend/i,
    /estratégia/i, /negócio/i, /empresa/i,
    /matemática|cálculo|equação/i,
    /\?.*\?/,  // Múltiplas perguntas
    /por que|porque|como funciona/i,
    /passo a passo/i, /tutorial/i,
    /crie|desenvolva|construa|implemente/i,
    /análise jurídica/i, /parecer/i, /tese/i,
    /prova matemática/i, /demonstre/i
  ];
  
  // Indicadores de simplicidade (KIZI Flash)
  const simpleIndicators = [
    /^(oi|olá|hey|hi|hello|e aí)/i,
    /^(obrigado|valeu|thanks|ok|tá|beleza)/i,
    /^(sim|não|yes|no)$/i,
    /^.{1,30}$/,  // Mensagens muito curtas
    /^(qual|quem|onde|quando) .{1,50}\?$/i,  // Perguntas diretas curtas
    /bom dia|boa tarde|boa noite/i,
    /tudo bem|como vai/i
  ];
  
  // Calcular scores
  let complexScore = 0;
  let simpleScore = 0;
  
  for (const pattern of complexIndicators) {
    if (pattern.test(lastMessage) || pattern.test(allContent)) {
      complexScore++;
    }
  }
  
  for (const pattern of simpleIndicators) {
    if (pattern.test(lastMessage)) {
      simpleScore++;
    }
  }
  
  // Fatores adicionais
  const messageLength = lastMessage.length;
  const conversationLength = messages.length;
  const hasCode = /```|function|class|import|SELECT |INSERT |UPDATE /.test(allContent);
  
  if (messageLength > 500 || hasCode) complexScore += 2;
  else if (messageLength > 200) complexScore += 1;
  else if (messageLength < 50) simpleScore += 1;
  
  if (conversationLength > 10) complexScore += 1;
  
  // Decidir
  if (simpleScore >= 2 && complexScore === 0) {
    return 'flash';  // KIZI Flash para respostas simples
  } else if (complexScore >= 2) {
    return 'pro';    // KIZI 2.5 Pro para raciocínio complexo
  } else {
    return 'speed';  // KIZI Speed para velocidade (padrão)
  }
}

/**
 * Chamar KIZI 2.5 Pro (Gemini 2.5 Pro - raciocínio avançado)
 */
async function callKiziPro(messages, systemPrompt, apiKey) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
        contents: messages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        })),
        generationConfig: {
          temperature: 1.0,
          maxOutputTokens: 16000,
          topP: 0.95,
          topK: 64
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`KIZI Pro error: ${error}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

/**
 * Chamar KIZI Flash (Gemini Flash - respostas simples e rápidas)
 */
async function callKiziFlash(messages, systemPrompt, apiKey) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
        contents: messages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        })),
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4000,
          topP: 0.9
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`KIZI Flash error: ${error}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

/**
 * Chamar KIZI Speed (Groq Llama 70B - ultra-rápido)
 */
async function callKiziSpeed(messages, systemPrompt, apiKey) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: systemPrompt 
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages,
      temperature: 0.7,
      max_tokens: 4000
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`KIZI Speed error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Chamar o motor KIZI apropriado com fallback automático
 */
async function callKizi(messages, systemPrompt, complexity, geminiKey, groqKey) {
  const hasGemini = !!geminiKey;
  const hasGroq = !!groqKey;
  
  // Ordem de tentativa baseada na complexidade
  let attempts = [];
  
  switch (complexity) {
    case 'pro':
      attempts = [
        { name: 'kizi-2.5-pro', fn: () => callKiziPro(messages, systemPrompt, geminiKey), requires: hasGemini },
        { name: 'kizi-speed', fn: () => callKiziSpeed(messages, systemPrompt, groqKey), requires: hasGroq },
        { name: 'kizi-flash', fn: () => callKiziFlash(messages, systemPrompt, geminiKey), requires: hasGemini }
      ];
      break;
    case 'flash':
      attempts = [
        { name: 'kizi-flash', fn: () => callKiziFlash(messages, systemPrompt, geminiKey), requires: hasGemini },
        { name: 'kizi-speed', fn: () => callKiziSpeed(messages, systemPrompt, groqKey), requires: hasGroq },
        { name: 'kizi-2.5-pro', fn: () => callKiziPro(messages, systemPrompt, geminiKey), requires: hasGemini }
      ];
      break;
    case 'speed':
    default:
      attempts = [
        { name: 'kizi-speed', fn: () => callKiziSpeed(messages, systemPrompt, groqKey), requires: hasGroq },
        { name: 'kizi-flash', fn: () => callKiziFlash(messages, systemPrompt, geminiKey), requires: hasGemini },
        { name: 'kizi-2.5-pro', fn: () => callKiziPro(messages, systemPrompt, geminiKey), requires: hasGemini }
      ];
      break;
  }
  
  // Tentar cada motor em ordem
  for (const attempt of attempts) {
    if (!attempt.requires) continue;
    
    try {
      console.log(`🤖 Tentando ${attempt.name}...`);
      const response = await attempt.fn();
      return { response, model: attempt.name };
    } catch (error) {
      console.error(`❌ ${attempt.name} falhou:`, error.message);
    }
  }
  
  throw new Error('Todos os motores KIZI falharam');
}

/**
 * Construir system prompt KIZI
 */
function buildKiziPrompt(agentType = 'default') {
  const basePrompt = `Você é KIZI 2.5 Pro, uma IA avançada e amigável criada pela KIZI AI.

PERSONALIDADE:
- Seja sempre útil, preciso e amigável
- Responda no idioma do usuário
- Use emojis com moderação para tornar a conversa mais agradável
- Seja conciso mas completo

CAPACIDADES:
- Análise e raciocínio avançado
- Programação e código
- Pesquisa e explicações
- Criatividade e brainstorming
- Suporte multilíngue

IMPORTANTE:
- Você é KIZI 2.5 Pro, não mencione outros nomes de IA
- Seja sempre ético e responsável
- Admita quando não souber algo`;

  const agentPrompts = {
    serginho: `${basePrompt}

MODO SERGINHO:
Você também é conhecido como Serginho, um assistente brasileiro super amigável e descontraído.
- Use gírias brasileiras ocasionalmente
- Seja mais informal e próximo
- Mantenha o bom humor`,
    
    hybrid: `${basePrompt}

MODO HÍBRIDO:
Você pode alternar entre diferentes especialistas conforme necessário.
- Adapte seu tom ao contexto
- Use conhecimento especializado quando relevante`,
    
    default: basePrompt
  };

  return agentPrompts[agentType] || agentPrompts.default;
}

/**
 * Handler principal
 */
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      messages, 
      agentType = 'default',
      systemPrompt: customPrompt,
      forceModel  // Opcional: forçar um modelo específico ('pro', 'speed', 'flash')
    } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    // Verificar credenciais
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GERMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;
    const hasGemini = !!geminiKey;
    const hasGroq = !!groqKey;

    if (!hasGemini && !hasGroq) {
      return res.status(500).json({
        error: 'No AI providers configured',
        hint: 'Configure GEMINI_API_KEY or GROQ_API_KEY in Vercel environment'
      });
    }

    // Analisar complexidade automaticamente ou usar modelo forçado
    const complexity = forceModel || analyzeComplexity(messages);
    console.log(`🤖 KIZI AI - Agent: ${agentType} | Complexity: ${complexity}`);

    // Construir system prompt
    const systemPrompt = customPrompt || buildKiziPrompt(agentType);

    // Chamar KIZI com seleção automática
    const { response, model } = await callKizi(
      messages,
      systemPrompt,
      complexity,
      geminiKey,
      groqKey
    );

    return res.status(200).json({
      response,
      model,
      provider: 'kizi',
      tier: complexity,
      agentType,
      success: true
    });

  } catch (error) {
    console.error('❌ KIZI AI error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
