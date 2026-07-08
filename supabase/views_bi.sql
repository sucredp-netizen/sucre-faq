-- ============================================================
--  Sucré FAQ – Views de métricas para Power BI
--  Execute no SQL Editor do Supabase (uma vez).
--  Depois, no Power BI, importe as views abaixo do schema public.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Base detalhada — uma linha por atendimento, já enriquecida
--    com colunas de data prontas para segmentar no Power BI.
-- ------------------------------------------------------------
create or replace view public.vw_atendimentos as
select
  a.id,
  a.matricula,
  a.pergunta,
  coalesce(a.categoria, '(sem resposta)')      as categoria,
  a.encontrou,
  a.created_at,
  (a.created_at at time zone 'America/Fortaleza')            as data_hora_local,
  (a.created_at at time zone 'America/Fortaleza')::date      as dia,
  date_trunc('week',  a.created_at at time zone 'America/Fortaleza')::date as semana,
  date_trunc('month', a.created_at at time zone 'America/Fortaleza')::date as mes,
  extract(hour from a.created_at at time zone 'America/Fortaleza')::int    as hora,
  trim(to_char(a.created_at at time zone 'America/Fortaleza', 'TMDay'))    as dia_semana
from public.atendimentos a;

-- ------------------------------------------------------------
-- 2) Resumo geral — total, respondidos, sem resposta, taxa (%)
-- ------------------------------------------------------------
create or replace view public.vw_resumo_geral as
select
  count(*)                                       as total_atendimentos,
  count(*) filter (where encontrou)              as respondidos,
  count(*) filter (where not encontrou)          as sem_resposta,
  round(100.0 * count(*) filter (where encontrou)
        / nullif(count(*), 0), 1)                as taxa_resposta_pct,
  count(distinct matricula)                      as colaboradores_distintos,
  min(created_at)                                as primeiro_atendimento,
  max(created_at)                                as ultimo_atendimento
from public.atendimentos;

-- ------------------------------------------------------------
-- 3) Volume por dia (com respondidos x sem resposta)
-- ------------------------------------------------------------
create or replace view public.vw_volume_diario as
select
  (created_at at time zone 'America/Fortaleza')::date as dia,
  count(*)                                as total,
  count(*) filter (where encontrou)       as respondidos,
  count(*) filter (where not encontrou)   as sem_resposta
from public.atendimentos
group by 1
order by 1;

-- ------------------------------------------------------------
-- 4) Assuntos mais perguntados (por categoria do FAQ)
-- ------------------------------------------------------------
create or replace view public.vw_categorias as
select
  coalesce(categoria, '(sem resposta)')  as categoria,
  count(*)                               as total,
  round(100.0 * count(*)
        / nullif(sum(count(*)) over (), 0), 1) as pct_do_total
from public.atendimentos
group by 1
order by total desc;

-- ------------------------------------------------------------
-- 5) Lacunas — perguntas que a Ana NÃO respondeu
--    (insumo para melhorar o faq.txt)
-- ------------------------------------------------------------
create or replace view public.vw_lacunas as
select
  pergunta,
  count(*)                          as vezes,
  max(created_at)                   as ultima_vez
from public.atendimentos
where not encontrou
group by pergunta
order by vezes desc, ultima_vez desc;

-- ------------------------------------------------------------
-- 6) Uso por colaborador
-- ------------------------------------------------------------
create or replace view public.vw_uso_por_colaborador as
select
  a.matricula,
  c.nome,
  count(*)                                     as total_perguntas,
  count(*) filter (where a.encontrou)          as respondidas,
  count(*) filter (where not a.encontrou)      as sem_resposta,
  max(a.created_at)                            as ultimo_acesso
from public.atendimentos a
left join public.colaboradores c on c.matricula = a.matricula
group by a.matricula, c.nome
order by total_perguntas desc;

-- ============================================================
--  Permissões de leitura para o usuário de BI (Power BI)
--  Só rode se você criou o role bi_powerbi (passo anterior).
--  Se ainda não criou, descomente o bloco CREATE ROLE abaixo.
-- ============================================================

-- create role bi_powerbi with login password 'TROQUE_POR_UMA_SENHA_FORTE';
-- grant connect on database postgres to bi_powerbi;
-- grant usage  on schema public to bi_powerbi;

grant select on
  public.vw_atendimentos,
  public.vw_resumo_geral,
  public.vw_volume_diario,
  public.vw_categorias,
  public.vw_lacunas,
  public.vw_uso_por_colaborador
to bi_powerbi;
