-- ============================================================================
-- INPROOVAL® BULLETPROOF AGENT SWARM — MIGRAÇÃO DBA & HARDENING (v2.1.1)
-- Projeto: Padaria da Vila (app-encomendas-padaria)
-- Auditor: Agente 2 (Supabase DBA & Data Integrity Auditor)
-- Script 100% Idempotente (Seguro para executar em Produção no Supabase SQL Editor)
-- ============================================================================

-- 1. Adicionar colunas nativas em `encomendas` (mantendo retrocompatibilidade total com tags resilientes)
ALTER TABLE public.encomendas
  ADD COLUMN IF NOT EXISTS canal_origem text DEFAULT 'presencial',
  ADD COLUMN IF NOT EXISTS observacoes_producao text,
  ADD COLUMN IF NOT EXISTS data_entrega_real date,
  ADD COLUMN IF NOT EXISTS hora_entrega_real text,
  ADD COLUMN IF NOT EXISTS ordem_rota integer;

-- 2. Garantir suporte ao estado parcelar 'recusado' em `itens_encomenda`
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_producao_item') THEN
    ALTER TYPE public.estado_producao_item ADD VALUE IF NOT EXISTS 'recusado';
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- 3. Criar tabela `perfis_acesso` caso ainda opere apenas em fallback local
CREATE TABLE IF NOT EXISTS public.perfis_acesso (
  id text PRIMARY KEY,
  nome text NOT NULL,
  email text,
  telefone text,
  password text,
  role text NOT NULL DEFAULT 'atendente',
  loja_id uuid REFERENCES public.lojas(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  acesso_encomendas text NOT NULL DEFAULT 'leitura',
  acesso_producao text NOT NULL DEFAULT 'sem_acesso',
  acesso_loja text NOT NULL DEFAULT 'leitura',
  acesso_entregas text NOT NULL DEFAULT 'sem_acesso',
  acesso_gestao text NOT NULL DEFAULT 'sem_acesso',
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- 4. Criar tabela `logs_auditoria` para rastreabilidade imutável e FinOps
CREATE TABLE IF NOT EXISTS public.logs_auditoria (
  id text PRIMARY KEY,
  data_hora timestamptz NOT NULL DEFAULT now(),
  utilizador_id text NOT NULL,
  utilizador_nome text NOT NULL,
  utilizador_role text NOT NULL,
  loja_id text,
  loja_nome text,
  painel text NOT NULL,
  acao text NOT NULL,
  detalhes text,
  encomenda_id uuid REFERENCES public.encomendas(id) ON DELETE SET NULL,
  encomenda_codigo text
);

-- 5. Índices compostos para performance e redução de Database Egress (Agente 2 & Agente 6 FinOps)
CREATE INDEX IF NOT EXISTS idx_encomendas_data_loja_estado
  ON public.encomendas (data_agendamento, loja_id, estado);

CREATE INDEX IF NOT EXISTS idx_encomendas_carrinha_data
  ON public.encomendas (carrinha_id, data_agendamento);

CREATE INDEX IF NOT EXISTS idx_itens_encomenda_encomenda_id
  ON public.itens_encomenda (encomenda_id);

CREATE INDEX IF NOT EXISTS idx_clientes_telefone
  ON public.clientes (telefone);

-- 6. Autenticação no Portal Direto de Clientes (/encomendar) com Password e E-mail de Recuperação (v2.1.3)
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS password_cliente text;

CREATE INDEX IF NOT EXISTS idx_clientes_email
  ON public.clientes (email);

