-- ============================================================
--  Sucré FAQ – Registro de atendimentos da Ana
--  Execute no SQL Editor do Supabase (uma vez).
-- ============================================================

create table if not exists public.atendimentos (
  id         bigint generated always as identity primary key,
  user_id    uuid references auth.users(id) on delete set null,
  matricula  text,
  pergunta   text not null,
  categoria  text,               -- categoria do FAQ que respondeu (null se não achou)
  encontrou  boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.atendimentos enable row level security;

-- O colaborador autenticado pode APENAS inserir o próprio atendimento.
-- (Não há política de SELECT: nenhum colaborador lê os atendimentos de
--  outro. Você, como dona do projeto, visualiza tudo pelo painel/SQL Editor.)
drop policy if exists "inserir_proprio_atendimento" on public.atendimentos;
create policy "inserir_proprio_atendimento"
  on public.atendimentos
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create index if not exists idx_atendimentos_data on public.atendimentos (created_at);
create index if not exists idx_atendimentos_categoria on public.atendimentos (categoria);


-- ============================================================
--  RELATÓRIOS — rode estas consultas quando quiser, no SQL Editor
-- ============================================================

-- 1) Total de atendimentos e taxa de resposta
-- select
--   count(*)                                     as total,
--   count(*) filter (where encontrou)            as respondidos,
--   count(*) filter (where not encontrou)        as sem_resposta,
--   round(100.0 * count(*) filter (where encontrou) / nullif(count(*),0), 1) as taxa_resposta_pct
-- from public.atendimentos;

-- 2) Assuntos mais perguntados (categorias)
-- select coalesce(categoria, '(sem resposta)') as categoria, count(*) as total
-- from public.atendimentos
-- group by 1
-- order by total desc;

-- 3) Perguntas que a Ana NÃO respondeu (lacunas para melhorar o FAQ)
-- select pergunta, count(*) as vezes, max(created_at) as ultima_vez
-- from public.atendimentos
-- where not encontrou
-- group by pergunta
-- order by vezes desc;

-- 4) Volume por dia
-- select date_trunc('day', created_at)::date as dia, count(*) as total
-- from public.atendimentos
-- group by 1
-- order by dia desc;

-- 5) Uso por colaborador
-- select matricula, count(*) as perguntas, max(created_at) as ultimo_acesso
-- from public.atendimentos
-- group by matricula
-- order by perguntas desc;
