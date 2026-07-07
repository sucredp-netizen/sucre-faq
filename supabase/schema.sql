-- ============================================================
--  Sucré FAQ – Estrutura de segurança (Supabase)
--  Execute este SQL no editor SQL do painel do Supabase.
-- ============================================================

-- Tabela de colaboradores. Cada linha está vinculada a um usuário
-- do Supabase Auth (id = auth.users.id).
create table if not exists public.colaboradores (
  id         uuid primary key references auth.users(id) on delete cascade,
  matricula  text unique not null,
  nome       text not null,
  created_at timestamptz not null default now()
);

-- Row Level Security: sem política liberada, ninguém lê nada.
alter table public.colaboradores enable row level security;

-- Cada colaborador só consegue ler a PRÓPRIA linha.
-- (A lista completa nunca é exposta ao navegador.)
drop policy if exists "colaborador_le_propria_linha" on public.colaboradores;
create policy "colaborador_le_propria_linha"
  on public.colaboradores
  for select
  to authenticated
  using (auth.uid() = id);

-- Observação: a carga inicial (INSERT) e a criação dos usuários de
-- autenticação são feitas pelo script scripts/seed-colaboradores.mjs
-- usando a service_role key, que ignora o RLS. Por isso não há
-- política de INSERT/UPDATE aqui — o navegador nunca escreve nesta tabela.
