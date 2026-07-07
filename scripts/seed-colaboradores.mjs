// ============================================================
//  Cria um usuário no Supabase Auth para cada colaborador,
//  gera uma senha aleatória e grava tudo em scripts/senhas.csv
//  para o DP distribuir. Cada colaborador troca a senha no 1º acesso.
//
//  Uso (na raiz do projeto):
//    1. Preencha .env com SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
//    2. npm install
//    3. node --env-file=.env scripts/seed-colaboradores.mjs
// ============================================================
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { randomInt } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env');
  process.exit(1);
}

// A service_role key ignora o RLS — usar SOMENTE aqui, nunca no frontend.
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Mesmo formato de e-mail usado no login do frontend.
const matriculaToEmail = (m) =>
  m.toUpperCase().replace(/[^A-Z0-9]/g, '').toLowerCase() + '@sucre-faq.interno';

// Senha aleatória de 10 caracteres, sem símbolos ambíguos (0/O, 1/l/I).
function gerarSenha(tamanho = 10) {
  const alfabeto = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < tamanho; i++) s += alfabeto[randomInt(alfabeto.length)];
  return s;
}

const colaboradores = JSON.parse(
  readFileSync(join(__dirname, 'colaboradores.json'), 'utf-8')
);

const linhasCsv = ['matricula,nome,senha'];
let criados = 0, pulados = 0, erros = 0;

for (const { matricula, nome } of colaboradores) {
  const email = matriculaToEmail(matricula);
  const senha = gerarSenha();

  // Cria o usuário de autenticação (e-mail já confirmado).
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { matricula, nome, must_change_password: true }
  });

  if (error) {
    // Provavelmente já existe — não sobrescreve senha para não invalidar acessos.
    console.warn(`⚠️  ${matricula} (${nome}): ${error.message}`);
    pulados++;
    continue;
  }

  // Vincula a linha na tabela colaboradores ao id do usuário criado.
  const { error: insErr } = await supabase
    .from('colaboradores')
    .upsert({ id: data.user.id, matricula, nome }, { onConflict: 'matricula' });

  if (insErr) {
    console.error(`❌ Falha ao inserir ${matricula} na tabela: ${insErr.message}`);
    erros++;
    continue;
  }

  linhasCsv.push(`${matricula},"${nome}",${senha}`);
  criados++;
  console.log(`✅ ${matricula} — ${nome}`);
}

const csvPath = join(__dirname, 'senhas.csv');
writeFileSync(csvPath, linhasCsv.join('\n'), 'utf-8');

console.log('\n──────────────────────────────');
console.log(`Criados: ${criados} | Pulados: ${pulados} | Erros: ${erros}`);
console.log(`Senhas salvas em: ${csvPath}`);
console.log('⚠️  Distribua as senhas com segurança e apague o CSV depois.');
