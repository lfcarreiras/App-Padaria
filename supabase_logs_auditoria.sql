-- ==========================================================
-- SCRIPT DE CRIAÇÃO DA TABELA DE AUDITORIA E LOGS (Supabase)
-- Padaria da Vila (União Panificadora Central Arouquense)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.logs_auditoria (
    id TEXT PRIMARY KEY,
    encomenda_id TEXT,
    codigo_encomenda TEXT,
    cliente_nome TEXT,
    utilizador_id TEXT NOT NULL,
    utilizador_nome TEXT NOT NULL,
    utilizador_role TEXT NOT NULL,
    loja_id TEXT,
    loja_nome TEXT,
    painel TEXT NOT NULL,
    acao TEXT NOT NULL,
    detalhes TEXT NOT NULL,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    hora TEXT NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para pesquisa ágil e ordenação no painel de gestão
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_criado_em ON public.logs_auditoria (criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_codigo_encomenda ON public.logs_auditoria (codigo_encomenda);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_utilizador_id ON public.logs_auditoria (utilizador_id);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_data ON public.logs_auditoria (data);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_painel ON public.logs_auditoria (painel);

-- Habilitar RLS e criar políticas de acesso
ALTER TABLE public.logs_auditoria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de logs para todos" ON public.logs_auditoria;
CREATE POLICY "Permitir leitura de logs para todos" ON public.logs_auditoria
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercao de logs para todos" ON public.logs_auditoria;
CREATE POLICY "Permitir insercao de logs para todos" ON public.logs_auditoria
    FOR INSERT WITH CHECK (true);
