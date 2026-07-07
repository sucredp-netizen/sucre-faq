import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const faqContent = readFileSync(join(__dirname, '..', 'faq.txt'), 'utf-8');

// Cliente usado apenas para validar o token de sessão do colaborador.
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Confere o token JWT enviado pelo frontend. Retorna o usuário ou null.
async function getUsuarioAutenticado(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

const SYSTEM_PROMPT = `Você é a Ana, assistente virtual do Departamento Pessoal (RH) da Sucré Alimentos.
Responda em português, de forma amigável, clara e objetiva, baseando-se ESTRITAMENTE na base de conhecimento (FAQ) apresentada abaixo.
Se a pergunta não estiver coberta pela base de conhecimento, diga educadamente que não possui essa informação — não invente respostas.

REGRAS SOBRE O CONTATO DO DP (MUITO IMPORTANTE):
- Por padrão, NÃO inclua o link de contato do DP nas respostas do dia a dia. Mantenha-o oculto.
- SOMENTE inclua o link nestas situações:
  • O colaborador disser que não entendeu ou que a resposta não ajudou.
  • O colaborador pedir explicitamente para falar com um atendente, humano ou com o DP.
  • A dúvida não estiver coberta pela base de conhecimento abaixo.
- Quando for o caso, use EXATAMENTE este texto (nunca use e-mail ou outro contato):
"Caso precise de mais ajuda, fale diretamente com o Departamento Pessoal: https://wa.me/5585997153774"
- NÃO envie esse link ao final de respostas em que a dúvida já foi esclarecida.

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
        temperature: 0.2
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

  // Todas as tentativas retornaram 429 (rate limit): devolve resposta amigável em vez de estourar.
  return {
    status: 429,
    data: { error: { message: 'Estamos com muitas solicitações no momento. Tente novamente em alguns instantes.' } }
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Bloqueia acesso anônimo: só responde a colaboradores autenticados.
  const usuario = await getUsuarioAutenticado(req);
  if (!usuario) {
    return res.status(401).json({ error: { message: 'Sessão expirada. Faça login novamente.' } });
  }

  const { messages } = req.body;
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: { message: 'Requisição inválida.' } });
  }

  const { status, data } = await callGroq(messages);
  res.status(status).json(data);
}
