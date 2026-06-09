export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { messages } = req.body;
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 1024,
      temperature: 0.4
    })
  });

  const data = await groqRes.json();

  if (!groqRes.ok) {
    console.error('Groq error', groqRes.status, JSON.stringify(data));
  }

  res.status(groqRes.status).json(data);
}
