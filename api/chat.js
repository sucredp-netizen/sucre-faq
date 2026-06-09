import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const faqContent = readFileSync(join(__dirname, '..', 'faq.txt'), 'utf-8');

const SYSTEM_PROMPT = `Você é a Ana, assistente virtual de RH da Sucré Alimentos.
Responda em português, de forma amigável, clara e objetiva.
Responda de forma completa e objetiva com base na base de conhecimento abaixo.
SOMENTE envie o link do Departamento Pessoal nas seguintes situações:
- O colaborador demonstrar que ainda ficou com dúvida após sua resposta
- A dúvida for muito específica e não estiver coberta pela base de conhecimento
- O colaborador pedir explicitamente para falar com alguém do DP
Quando isso ocorrer, use EXATAMENTE este texto (nunca use e-mail ou outro contato):
"Para mais esclarecimentos, entre em contato com o Departamento Pessoal através do seguinte link: https://wa.me/5585997153774?text=%20%20"
NÃO envie esse link ao final de respostas onde a dúvida já foi esclarecida.

${faqContent}`;

async function callGroq(messages, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        max_tokens: 1024,
        temperature: 0.4
      })
    });

    if (groqRes.status === 429 && attempt < retries) {
      await new Promise(r => setTimeout(r, attempt * 2000));
      continue;
    }

    const data = await groqRes.json();
    if (!groqRes.ok) console.error('Groq error', groqRes.status, JSON.stringify(data));
    return { status: groqRes.status, data };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { messages } = req.body;
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  const { status, data } = await callGroq(messages);
  res.status(status).json(data);
}
