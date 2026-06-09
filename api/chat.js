import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid request" });
  }

  // Lê o FAQ em tempo real — atualizar o txt e fazer deploy já reflete na Ana
  const faqPath = path.join(process.cwd(), "FAQ - Dúvidas dos Colaboradores.txt");
  const faqContent = fs.readFileSync(faqPath, "utf-8");

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

  const groqMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  try {
    const apiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gemma2-9b-it",
        messages: groqMessages,
        max_tokens: 1024,
        temperature: 0.4,
      }),
    });

    const data = await apiRes.json();

    if (!apiRes.ok) {
      console.error(data);
      return res.status(500).json({ error: "Erro na API. Tente novamente." });
    }

    const text = data.choices?.[0]?.message?.content;
    res.status(200).json({ content: text || "Não consegui processar. Tente novamente." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao processar sua mensagem." });
  }
}
