import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function httpsPost(url, headers, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      path: u.pathname,
      method: "POST",
      headers: {
        ...headers,
        "Content-Length": Buffer.byteLength(bodyStr),
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid request" });
  }

  let faqContent = "";
  try {
    const faqPath = path.join(__dirname, "..", "faq.txt");
    faqContent = fs.readFileSync(faqPath, "utf-8");
  } catch (err) {
    console.error("Erro ao ler faq.txt:", err.message);
    return res.status(500).json({ error: "Erro interno. Tente novamente." });
  }

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
    const result = await httpsPost(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      {
        model: "gemma2-9b-it",
        messages: groqMessages,
        max_tokens: 1024,
        temperature: 0.4,
      }
    );

    const data = JSON.parse(result.body);

    if (result.status !== 200) {
      console.error("Groq error:", result.status, result.body);
      return res.status(500).json({ error: "Erro na API. Tente novamente." });
    }

    const text = data.choices?.[0]?.message?.content;
    res.status(200).json({ content: text || "Não consegui processar. Tente novamente." });
  } catch (error) {
    console.error("Erro:", error.message);
    res.status(500).json({ error: "Erro ao processar sua mensagem." });
  }
}
