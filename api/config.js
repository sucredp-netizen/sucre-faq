// Entrega ao frontend apenas as credenciais PÚBLICAS do Supabase.
// A anon key é projetada para ficar no cliente — o acesso aos dados
// é controlado pelas políticas de Row Level Security (RLS).
export default function handler(req, res) {
  res.status(200).json({
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY
  });
}
