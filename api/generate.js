export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key não configurada' }), { status: 500 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido' }), { status: 400 });
  }

  const { nomeEvento, objetivo, vagas, texto, empresas } = body;

  if (!nomeEvento || !objetivo || !empresas?.length) {
    return new Response(JSON.stringify({ error: 'Dados incompletos' }), { status: 400 });
  }

  const prompt = `Você é um especialista em eventos B2B e CRM. Sua tarefa é gerar uma lista priorizada de empresas para convidar para um evento.

DADOS DO EVENTO:
- Nome: ${nomeEvento}
- Objetivo: ${objetivo}
- Vagas disponíveis: ${vagas}
- Instruções adicionais: ${texto || "Nenhuma"}

EMPRESAS DISPONÍVEIS (${empresas.length} após filtros aplicados):
- base "ativa" = já foram a eventos anteriores, têm histórico
- base "target" = empresas alvo que nunca foram convidadas (campos extras: plataforma, totalLojas, volumeEcommerce)

${JSON.stringify(empresas, null, 1)}

REGRAS DE PRIORIZAÇÃO:
1. T0/T1 com deals abertos = máxima prioridade (fechar negócio)
2. Base target com alto volume de ecommerce ou muitas lojas = grande oportunidade
3. Prospects da base ativa que foram a eventos mas não geraram negócio = reativar
4. Equilibre base ativa e target na lista final
5. Evite fadiga: base ativa com muitos eventos e zero deals = baixa prioridade
6. Considere plataforma de ecommerce se relevante para o objetivo do evento

Retorne SOMENTE um JSON válido, sem texto antes ou depois, no formato:
{
  "total_analisado": número,
  "lista": [
    {
      "empresa": "nome",
      "tier": "0-4",
      "segmento": "segmento",
      "status": "Cliente" ou "Prospect",
      "base": "ativa" ou "target",
      "prioridade": 1,
      "justificativa": "frase curta em português explicando por que convidar"
    }
  ],
  "resumo": "parágrafo curto em português explicando a estratégia da lista"
}

Retorne exatamente ${vagas} empresas na lista (ou menos se não houver suficientes).`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: `Erro na API: ${res.status}`, detail: err }), { status: 502 });
    }

    const data = await res.json();
    const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Erro ao processar resposta da IA' }), { status: 500 });
  }
}
