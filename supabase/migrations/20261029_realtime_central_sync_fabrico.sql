-- ============================================================================
-- INPROOVAL® BULLETPROOF AGENT SWARM — MIGRAÇÃO SUPABASE REALTIME & FABRICO (v2.7.27)
-- Projeto: Padaria da Vila (app-encomendas-padaria)
-- Centralização de Rotas, Bases Diárias, Ajustes de Fabrico e Loja Centro de Fabrico
-- Script 100% Idempotente (Executar no Supabase SQL Editor)
-- ============================================================================

-- 1. Enriquecer a tabela `carrinhas` com atributos operacionais de rota e condutor
ALTER TABLE public.carrinhas
  ADD COLUMN IF NOT EXISTS nome_condutor text,
  ADD COLUMN IF NOT EXISTS nome_carro text,
  ADD COLUMN IF NOT EXISTS numero integer,
  ADD COLUMN IF NOT EXISTS rota text,
  ADD COLUMN IF NOT EXISTS atualizado_em timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_carrinhas_numero ON public.carrinhas(numero);
CREATE INDEX IF NOT EXISTS idx_carrinhas_ativo ON public.carrinhas(ativo);

-- 2. Registar formalmente o Centro de Fabrico como Loja de pleno direito
INSERT INTO public.lojas (id, codigo, nome, morada, telefone, nif, ativo)
VALUES (
  'fabbbb00-0000-0000-0000-000000000001',
  'FABRICO',
  'Centro de Fabrico',
  'Zona Operacional / Fabrico, Arouca',
  '210000000',
  '500100200',
  true
)
ON CONFLICT (id) DO UPDATE SET
  codigo = EXCLUDED.codigo,
  nome = EXCLUDED.nome,
  morada = EXCLUDED.morada,
  ativo = EXCLUDED.ativo;

-- 3. Criar tabela dedicada para Ajustes Ad-hoc de Produção / Fabrico
CREATE TABLE IF NOT EXISTS public.ajustes_producao (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  chave text UNIQUE NOT NULL,
  data date NOT NULL,
  tipo_alvo text NOT NULL CHECK (tipo_alvo IN ('rota', 'b2b')),
  alvo_id text NOT NULL,
  produto_nome text NOT NULL,
  quantidade integer NOT NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ajustes_producao_data ON public.ajustes_producao(data);
CREATE INDEX IF NOT EXISTS idx_ajustes_producao_chave ON public.ajustes_producao(chave);
CREATE INDEX IF NOT EXISTS idx_ajustes_producao_alvo ON public.ajustes_producao(alvo_id);

-- 4. Criar tabela dedicada para Bases Fixas das Carrinhas
CREATE TABLE IF NOT EXISTS public.bases_fixas_carrinhas (
  carrinha_id text PRIMARY KEY,
  carrinha_nome text NOT NULL,
  quantidades jsonb NOT NULL DEFAULT '{}'::jsonb,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- 5. Criar tabela para Configurações Centrais do Sistema (Artigos Base Fixa, Talão Térmico, Matriz Permissões)
CREATE TABLE IF NOT EXISTS public.configuracoes_sistema (
  chave text PRIMARY KEY,
  valor jsonb NOT NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- 6. Configurar Row-Level Security (RLS) nas novas tabelas
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'carrinhas',
    'lojas',
    'ajustes_producao',
    'bases_fixas_carrinhas',
    'configuracoes_sistema'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);

      EXECUTE format('DROP POLICY IF EXISTS "Leitura App Padaria (%s)" ON public.%I;', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "Insercao App Padaria (%s)" ON public.%I;', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "Atualizacao App Padaria (%s)" ON public.%I;', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "Remocao App Padaria (%s)" ON public.%I;', t, t);

      EXECUTE format(
        'CREATE POLICY "Leitura App Padaria (%s)" ON public.%I FOR SELECT TO anon, authenticated USING (true);',
        t, t
      );

      EXECUTE format(
        'CREATE POLICY "Insercao App Padaria (%s)" ON public.%I FOR INSERT TO anon, authenticated WITH CHECK (true);',
        t, t
      );

      EXECUTE format(
        'CREATE POLICY "Atualizacao App Padaria (%s)" ON public.%I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);',
        t, t
      );

      EXECUTE format(
        'CREATE POLICY "Remocao App Padaria (%s)" ON public.%I FOR DELETE TO anon, authenticated USING (true);',
        t, t
      );
    END IF;
  END LOOP;
END $$;

-- 7. Ativação Global de Publicação em Supabase Realtime
DO $$
DECLARE
  tb text;
BEGIN
  FOREACH tb IN ARRAY ARRAY[
    'carrinhas',
    'lojas',
    'encomendas',
    'itens_encomenda',
    'clientes',
    'clientes_empresariais',
    'bases_diarias_recorrentes',
    'ajustes_producao',
    'bases_fixas_carrinhas',
    'configuracoes_sistema'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tb
    ) THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tb
      ) THEN
        BEGIN
          EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tb);
        EXCEPTION
          WHEN others THEN NULL;
        END;
      END IF;
    END IF;
  END LOOP;
END $$;
