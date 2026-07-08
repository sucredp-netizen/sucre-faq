-- ============================================================
--  Sucré FAQ – View de atendimentos para Power BI
--  Execute no SQL Editor do Supabase (uma vez).
--  No Power BI, importe public.vw_atendimentos e monte as
--  medidas (DAX) a partir dela.
-- ============================================================

-- Base detalhada — uma linha por atendimento, já enriquecida com
-- colunas de data (fuso America/Fortaleza) prontas para segmentar.
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

-- ============================================================
--  Permissão de leitura para o usuário de BI (Power BI)
--  Só rode se você já criou o role bi_powerbi. Caso contrário,
--  descomente o bloco abaixo (e troque a senha) antes do GRANT.
-- ============================================================

-- create role bi_powerbi with login password 'TROQUE_POR_UMA_SENHA_FORTE';
-- grant connect on database postgres to bi_powerbi;
-- grant usage  on schema public to bi_powerbi;

grant select on public.vw_atendimentos to bi_powerbi;
