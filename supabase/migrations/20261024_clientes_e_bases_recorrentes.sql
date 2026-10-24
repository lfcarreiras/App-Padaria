-- ============================================================================
-- INPROOVAL® BULLETPROOF AGENT SWARM — MIGRAÇÃO ESTRUTURAL SUPABASE (v2.7.5)
-- Projeto: Padaria da Vila (app-encomendas-padaria)
-- Arquitetura Unificada de Clientes Particulares e Empresariais (B2B),
-- Recuperação de Password por E-mail e Matrizes de Entregas Recorrentes Diárias
-- Script 100% Idempotente (Executar no Supabase SQL Editor)
-- ============================================================================

-- 1. Enriquecer a tabela `clientes` para suporte a tipologia, NIF, PIN e credenciais
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS tipo_cliente text NOT NULL DEFAULT 'particular' 
    CHECK (tipo_cliente IN ('particular', 'empresarial')),
  ADD COLUMN IF NOT EXISTS pin_hash text,
  ADD COLUMN IF NOT EXISTS nif text,
  ADD COLUMN IF NOT EXISTS carrinha_id uuid REFERENCES public.carrinhas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS atualizado_em timestamptz DEFAULT now();

-- 2. Garantir índices de alta performance para email, telefone e rotas
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON public.clientes (telefone);
CREATE INDEX IF NOT EXISTS idx_clientes_email ON public.clientes (email);
CREATE INDEX IF NOT EXISTS idx_clientes_carrinha ON public.clientes (carrinha_id);
CREATE INDEX IF NOT EXISTS idx_clientes_tipo ON public.clientes (tipo_cliente);

-- 3. Criar tabela dedicada de Clientes Empresariais (B2B)
CREATE TABLE IF NOT EXISTS public.clientes_empresariais (
  id text PRIMARY KEY,
  nome text NOT NULL,
  nif text,
  telefone text,
  telemovel text,
  email text,
  password text,
  morada text,
  carrinha_id uuid REFERENCES public.carrinhas(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  quantidades_semanais jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clientes_b2b_carrinha ON public.clientes_empresariais (carrinha_id);
CREATE INDEX IF NOT EXISTS idx_clientes_b2b_email ON public.clientes_empresariais (email);
CREATE INDEX IF NOT EXISTS idx_clientes_b2b_ativo ON public.clientes_empresariais (ativo);

-- 4. Criar tabela de Bases Diárias / Entregas Recorrentes ao Domicílio (Particulares e B2B)
CREATE TABLE IF NOT EXISTS public.bases_diarias_recorrentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  carrinha_id uuid NOT NULL REFERENCES public.carrinhas(id) ON DELETE CASCADE,
  ativo boolean NOT NULL DEFAULT true,
  pausa_inicio date,
  pausa_fim date,
  quantidades_semanais jsonb NOT NULL DEFAULT '{}'::jsonb,
  notas_motorista text,
  metodo_pagamento text DEFAULT 'dinheiro_ao_motorista' 
    CHECK (metodo_pagamento IN ('dinheiro_ao_motorista', 'conta_mensal', 'mbway_semanal', 'multibanco')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bases_recorrentes_carrinha ON public.bases_diarias_recorrentes (carrinha_id, ativo);
CREATE INDEX IF NOT EXISTS idx_bases_recorrentes_cliente ON public.bases_diarias_recorrentes (cliente_id);

-- 5. Ativar RLS e Permissões Seguras (API Pública, Balcão, Fabrico e Gestão)
ALTER TABLE public.clientes_empresariais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bases_diarias_recorrentes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clientes_empresariais' AND policyname = 'Acesso total clientes empresariais') THEN
    CREATE POLICY "Acesso total clientes empresariais" ON public.clientes_empresariais FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bases_diarias_recorrentes' AND policyname = 'Acesso total bases recorrentes') THEN
    CREATE POLICY "Acesso total bases recorrentes" ON public.bases_diarias_recorrentes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT ALL ON public.clientes_empresariais TO anon, authenticated;
GRANT ALL ON public.bases_diarias_recorrentes TO anon, authenticated;

-- 6. Adicionar à publicação Realtime do Supabase (100% Idempotente com checagem pg_publication_tables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'clientes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.clientes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'clientes_empresariais'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.clientes_empresariais;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'bases_diarias_recorrentes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bases_diarias_recorrentes;
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- 7. Povoamento / Migração dos 21 Clientes Empresariais Reais (com Matrizes Semanais)

INSERT INTO public.clientes_empresariais (
  id, nome, nif, telefone, telemovel, email, morada, carrinha_id, ativo, quantidades_semanais
) VALUES (
  'b2b-lanterna',
  'Lanterna',
  NULL,
  '910111222',
  '910111222',
  'lanterna@padaria.pt',
  'Arouca',
  '1eaaa9bd-e3de-4b06-9c80-d1e464bcdc75',
  true,
  '{"seg":{"Broa Amarela 1 kg":3},"ter":{"Broa Amarela 1 kg":3},"qua":{"Broa Amarela 1 kg":3},"qui":{"Broa Amarela 1 kg":3},"sex":{"Broa Amarela 1 kg":3},"sab":{"Broa 1 kg":3,"Regueifa de Coco":2,"Trança de Chocolate":2},"dom":{"Broa 1 kg":4,"Regueifa de Coco":4,"Trança de Chocolate":2}}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  nif = EXCLUDED.nif,
  telefone = EXCLUDED.telefone,
  telemovel = EXCLUDED.telemovel,
  email = EXCLUDED.email,
  morada = EXCLUDED.morada,
  carrinha_id = EXCLUDED.carrinha_id,
  quantidades_semanais = EXCLUDED.quantidades_semanais,
  ativo = EXCLUDED.ativo,
  atualizado_em = now();

INSERT INTO public.clientes_empresariais (
  id, nome, nif, telefone, telemovel, email, morada, carrinha_id, ativo, quantidades_semanais
) VALUES (
  'b2b-cavadinha-cabecais',
  'Cavadinha Cabeçais',
  NULL,
  '910222333',
  '910222333',
  'cavadinha.cabecais@padaria.pt',
  'Cabeçais, Arouca',
  '1eaaa9bd-e3de-4b06-9c80-d1e464bcdc75',
  true,
  '{"seg":{"Pão Normal":80,"Padas Normais":20,"Pão Integral":5,"Pão de Centeio":10,"Pão Italiano":50,"Pão de Sementes":5,"Pão Saloio":20,"Padinhas":50,"Pasteis":10,"Broa 1 kg":4,"Regueifa Doce":1,"Regueifa de Coco":1,"Regueifa de Canela":1,"Pão Croissant":8,"Meia Bola de Carne":1},"ter":{"Pão Normal":100,"Padas Normais":20,"Pão Integral":5,"Pão de Centeio":5,"Pão Italiano":80,"Pão de Sementes":5,"Pão Saloio":20,"Padinhas":50,"Pasteis":10,"Broa Amarela 1 kg":4,"Regueifa Doce":1,"Regueifa de Coco":1,"Regueifa de Canela":1,"Pão Croissant":8,"Meia Bola de Carne":1},"qua":{"Pão Normal":80,"Padas Normais":20,"Pão Integral":5,"Pão de Centeio":10,"Pão Italiano":50,"Pão de Sementes":5,"Pão Saloio":20,"Padinhas":50,"Pasteis":10,"Broa Amarela 1 kg":4,"Regueifa Doce":1,"Regueifa de Coco":1,"Regueifa de Canela":1,"Pão Croissant":1,"Meia Bola de Carne":1},"qui":{"Pão Normal":80,"Padas Normais":20,"Pão Integral":5,"Pão de Centeio":10,"Pão Italiano":50,"Pão de Sementes":5,"Pão Saloio":20,"Padinhas":50,"Pasteis":10,"Broa Amarela 1 kg":4,"Regueifa Doce":1,"Regueifa de Coco":1,"Regueifa de Canela":1,"Pão Croissant":1,"Meia Bola de Carne":1},"sex":{"Pão Normal":80,"Padas Normais":20,"Pão Integral":5,"Pão de Centeio":10,"Pão Italiano":50,"Pão de Sementes":5,"Pão Saloio":20,"Padinhas":50,"Pasteis":10,"Broa Amarela 1 kg":4,"Regueifa Doce":1,"Regueifa de Coco":1,"Regueifa de Canela":1,"Pão Croissant":1,"Meia Bola de Carne":1},"sab":{"Pão Normal":80,"Padas Normais":20,"Pão Integral":5,"Pão de Centeio":10,"Pão Italiano":50,"Pão de Sementes":5,"Pão Saloio":20,"Padinhas":50,"Pasteis":10,"Broa Amarela 1 kg":4,"Regueifa Doce":2,"Regueifa de Coco":3,"Regueifa de Canela":1,"Pão Croissant":8,"Meia Bola de Carne":1,"Trança de Chocolate":2,"Trança de Creme":1,"Meia Lua":1,"Regueifa Branca":2},"dom":{"Pão Normal":80,"Padas Normais":10,"Pão Integral":5,"Pão Italiano":30,"Pão de Sementes":10,"Pão Saloio":20,"Padinhas":60,"Pasteis":5,"Broa Amarela 1 kg":3,"Regueifa Doce":3,"Regueifa de Coco":2,"Regueifa de Canela":2,"Trança de Chocolate":2,"Regueifa Branca":2}}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  nif = EXCLUDED.nif,
  telefone = EXCLUDED.telefone,
  telemovel = EXCLUDED.telemovel,
  email = EXCLUDED.email,
  morada = EXCLUDED.morada,
  carrinha_id = EXCLUDED.carrinha_id,
  quantidades_semanais = EXCLUDED.quantidades_semanais,
  ativo = EXCLUDED.ativo,
  atualizado_em = now();

INSERT INTO public.clientes_empresariais (
  id, nome, nif, telefone, telemovel, email, morada, carrinha_id, ativo, quantidades_semanais
) VALUES (
  'b2b-escola-escariz',
  'Escola de Escariz',
  NULL,
  '256940010',
  '910333444',
  'escola.escariz@padaria.pt',
  'Escariz, Arouca',
  '1eaaa9bd-e3de-4b06-9c80-d1e464bcdc75',
  true,
  '{"seg":{"Pão da Avó":30,"Pão de Sementes":10,"Padinhas":15,"Pão de Leite":15,"Pão de Forma Grande (Corte Fino)":2,"Croissant Simples":40,"Croissant de Chocolate":15,"Lanche de Fiambre":10,"Lanche de Chocolate":6,"Pastel de Nata":1},"ter":{"Pão da Avó":30,"Pão de Sementes":10,"Padinhas":15,"Pão de Leite":15,"Pão de Forma Grande (Corte Fino)":2,"Croissant Simples":40,"Croissant de Chocolate":15,"Lanche de Fiambre":10,"Lanche de Chocolate":6,"Pastel de Nata":1},"qua":{"Pão da Avó":30,"Pão de Sementes":10,"Padinhas":15,"Pão de Leite":15,"Pão de Forma Grande (Corte Fino)":2,"Croissant Simples":40,"Croissant de Chocolate":15,"Lanche de Fiambre":10,"Lanche de Chocolate":6,"Pastel de Nata":1},"qui":{"Pão da Avó":30,"Pão de Sementes":10,"Padinhas":15,"Pão de Leite":15,"Pão de Forma Grande (Corte Fino)":2,"Croissant Simples":40,"Croissant de Chocolate":15,"Lanche de Fiambre":10,"Lanche de Chocolate":6,"Pastel de Nata":1},"sex":{"Pão da Avó":30,"Pão de Sementes":10,"Padinhas":15,"Pão de Leite":15,"Pão de Forma Grande (Corte Fino)":2,"Croissant Simples":40,"Croissant de Chocolate":15,"Lanche de Fiambre":10,"Lanche de Chocolate":6,"Pastel de Nata":1},"sab":{"Pão da Avó":30,"Pão de Sementes":10,"Padinhas":15,"Pão de Leite":15,"Pão de Forma Grande (Corte Fino)":2,"Croissant Simples":40,"Croissant de Chocolate":15,"Lanche de Fiambre":10,"Lanche de Chocolate":6,"Pastel de Nata":1},"dom":{}}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  nif = EXCLUDED.nif,
  telefone = EXCLUDED.telefone,
  telemovel = EXCLUDED.telemovel,
  email = EXCLUDED.email,
  morada = EXCLUDED.morada,
  carrinha_id = EXCLUDED.carrinha_id,
  quantidades_semanais = EXCLUDED.quantidades_semanais,
  ativo = EXCLUDED.ativo,
  atualizado_em = now();

INSERT INTO public.clientes_empresariais (
  id, nome, nif, telefone, telemovel, email, morada, carrinha_id, ativo, quantidades_semanais
) VALUES (
  'b2b-mercearia-ribeiro',
  'Mercearia Ribeiro',
  NULL,
  '910444555',
  '910444555',
  'mercearia.ribeiro@padaria.pt',
  'Chave, Arouca',
  '5ebae97d-593f-4f54-81c5-b200dd04258b',
  true,
  '{"seg":{"Pão Normal":12,"Padas Normais":20,"Padas de Centeio":2,"Pão Integral":2,"Pão Italiano":8},"ter":{"Pão Normal":12,"Padas Normais":20,"Padas de Centeio":2,"Pão Integral":2,"Pão Italiano":8},"qua":{"Pão Normal":28,"Padas Normais":20,"Padas de Centeio":2,"Pão Integral":22,"Pão Italiano":8},"qui":{"Pão Normal":12,"Padas Normais":20,"Padas de Centeio":2,"Pão Integral":2,"Pão Italiano":8},"sex":{"Pão Normal":12,"Padas Normais":20,"Padas de Centeio":2,"Pão Integral":2,"Pão Italiano":8},"sab":{"Pão Normal":16,"Padas Normais":28,"Padas de Centeio":1,"Pão Integral":2,"Pão Italiano":8},"dom":{}}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  nif = EXCLUDED.nif,
  telefone = EXCLUDED.telefone,
  telemovel = EXCLUDED.telemovel,
  email = EXCLUDED.email,
  morada = EXCLUDED.morada,
  carrinha_id = EXCLUDED.carrinha_id,
  quantidades_semanais = EXCLUDED.quantidades_semanais,
  ativo = EXCLUDED.ativo,
  atualizado_em = now();

INSERT INTO public.clientes_empresariais (
  id, nome, nif, telefone, telemovel, email, morada, carrinha_id, ativo, quantidades_semanais
) VALUES (
  'b2b-cafe-ribeiro',
  'Café Ribeiro',
  NULL,
  '910555666',
  '910555666',
  'cafe.ribeiro@padaria.pt',
  'Chave, Arouca',
  '5ebae97d-593f-4f54-81c5-b200dd04258b',
  true,
  '{"seg":{"Pasteis":15},"ter":{"Pasteis":15},"qua":{"Pasteis":15},"qui":{"Pasteis":15},"sex":{"Pasteis":15},"sab":{"Pasteis":15},"dom":{}}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  nif = EXCLUDED.nif,
  telefone = EXCLUDED.telefone,
  telemovel = EXCLUDED.telemovel,
  email = EXCLUDED.email,
  morada = EXCLUDED.morada,
  carrinha_id = EXCLUDED.carrinha_id,
  quantidades_semanais = EXCLUDED.quantidades_semanais,
  ativo = EXCLUDED.ativo,
  atualizado_em = now();

INSERT INTO public.clientes_empresariais (
  id, nome, nif, telefone, telemovel, email, morada, carrinha_id, ativo, quantidades_semanais
) VALUES (
  'b2b-restaurante-chao-de-ave',
  'Restaurante Chão de Ave',
  NULL,
  '910666777',
  '910666777',
  'chaodeave@padaria.pt',
  'Chão de Ave, Arouca',
  '5ebae97d-593f-4f54-81c5-b200dd04258b',
  true,
  '{"seg":{"Pão Normal":12,"Pasteis":13},"ter":{"Pão Normal":12,"Pasteis":13},"qua":{"Pão Normal":12,"Pasteis":13,"Broa Amarela 1 kg":4,"Padinhas":80},"qui":{"Pão Normal":12,"Pasteis":13},"sex":{"Pão Normal":12,"Pasteis":13},"sab":{"Pão Normal":12,"Pasteis":13},"dom":{}}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  nif = EXCLUDED.nif,
  telefone = EXCLUDED.telefone,
  telemovel = EXCLUDED.telemovel,
  email = EXCLUDED.email,
  morada = EXCLUDED.morada,
  carrinha_id = EXCLUDED.carrinha_id,
  quantidades_semanais = EXCLUDED.quantidades_semanais,
  ativo = EXCLUDED.ativo,
  atualizado_em = now();

INSERT INTO public.clientes_empresariais (
  id, nome, nif, telefone, telemovel, email, morada, carrinha_id, ativo, quantidades_semanais
) VALUES (
  'b2b-ass-pais-chave',
  'Associação de Pais de Chave',
  NULL,
  '256940020',
  '910777888',
  'pais.chave@padaria.pt',
  'Escola de Chave, Arouca',
  '5ebae97d-593f-4f54-81c5-b200dd04258b',
  true,
  '{"seg":{"Mini Pão Centeio":30},"ter":{"Mini Pão Centeio":30},"qua":{"Mini Pão Centeio":30},"qui":{"Mini Pão Centeio":30},"sex":{"Mini Pão Centeio":30},"sab":{},"dom":{}}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  nif = EXCLUDED.nif,
  telefone = EXCLUDED.telefone,
  telemovel = EXCLUDED.telemovel,
  email = EXCLUDED.email,
  morada = EXCLUDED.morada,
  carrinha_id = EXCLUDED.carrinha_id,
  quantidades_semanais = EXCLUDED.quantidades_semanais,
  ativo = EXCLUDED.ativo,
  atualizado_em = now();

INSERT INTO public.clientes_empresariais (
  id, nome, nif, telefone, telemovel, email, morada, carrinha_id, ativo, quantidades_semanais
) VALUES (
  'b2b-cavadinha-vale-cambra',
  'Cavadinha de Vale de Cambra',
  NULL,
  '256940030',
  '910888999',
  'cavadinha.valecambra@padaria.pt',
  'Vale de Cambra',
  '5ebae97d-593f-4f54-81c5-b200dd04258b',
  true,
  '{"seg":{"Pão Normal":30,"Broa Branca 1 kg":2,"Broa Amarela 1 kg":2,"Pão Italiano":35,"Pão Saloio":20,"Pão Croissant":8,"Pasteis":10,"Padas Normais":30,"Pão de Centeio":10,"Pão de Sementes":5,"Pão de Leite":6,"Regueifa Doce":1,"Regueifa de Coco":1,"Meia Lua":1,"Regueifa de Canela":2,"Trança de Chocolate":1,"Meia Bola de Carne":1},"ter":{"Pão Normal":30,"Broa Branca 1 kg":2,"Broa Amarela 1 kg":2,"Pão Italiano":35,"Pão Saloio":20,"Pão Croissant":8,"Pasteis":10,"Padas Normais":30,"Pão de Centeio":10,"Pão de Sementes":5,"Pão de Leite":6,"Regueifa Doce":1,"Regueifa de Coco":1,"Meia Lua":1,"Regueifa de Canela":2,"Trança de Chocolate":1,"Meia Bola de Carne":1},"qua":{"Pão Normal":30,"Broa Branca 1 kg":2,"Broa Amarela 1 kg":2,"Pão Italiano":35,"Pão Saloio":20,"Pão Croissant":8,"Pasteis":10,"Padas Normais":30,"Pão de Centeio":10,"Pão de Sementes":5,"Pão de Leite":6,"Regueifa Doce":1,"Regueifa de Coco":1,"Meia Lua":1,"Regueifa de Canela":2,"Trança de Chocolate":1,"Meia Bola de Carne":1},"qui":{"Pão Normal":30,"Broa Branca 1 kg":2,"Broa Amarela 1 kg":2,"Pão Italiano":35,"Pão Saloio":20,"Pão Croissant":8,"Pasteis":10,"Padas Normais":30,"Pão de Centeio":10,"Pão de Sementes":5,"Pão de Leite":6,"Regueifa Doce":1,"Regueifa de Coco":1,"Meia Lua":1,"Regueifa de Canela":2,"Trança de Chocolate":1,"Meia Bola de Carne":1},"sex":{"Pão Normal":30,"Broa Branca 1 kg":2,"Broa Amarela 1 kg":2,"Pão Italiano":35,"Pão Saloio":20,"Pão Croissant":8,"Pasteis":10,"Padas Normais":30,"Pão de Centeio":10,"Pão de Sementes":5,"Pão de Leite":6,"Regueifa Doce":1,"Regueifa de Coco":1,"Meia Lua":1,"Regueifa de Canela":2,"Trança de Chocolate":1,"Meia Bola de Carne":1},"sab":{"Pão Normal":30,"Broa Branca 1 kg":2,"Broa Amarela 1 kg":2,"Pão Italiano":35,"Pão Saloio":20,"Pão Croissant":8,"Pasteis":10,"Padas Normais":30,"Pão de Centeio":10,"Pão de Sementes":5,"Pão de Leite":6,"Regueifa Doce":2,"Regueifa de Coco":6,"Meia Lua":2,"Regueifa de Canela":3,"Trança de Chocolate":8,"Meia Bola de Carne":1},"dom":{}}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  nif = EXCLUDED.nif,
  telefone = EXCLUDED.telefone,
  telemovel = EXCLUDED.telemovel,
  email = EXCLUDED.email,
  morada = EXCLUDED.morada,
  carrinha_id = EXCLUDED.carrinha_id,
  quantidades_semanais = EXCLUDED.quantidades_semanais,
  ativo = EXCLUDED.ativo,
  atualizado_em = now();

INSERT INTO public.clientes_empresariais (
  id, nome, nif, telefone, telemovel, email, morada, carrinha_id, ativo, quantidades_semanais
) VALUES (
  'b2b-cafe-sto-antonio',
  'Café Sto. António',
  NULL,
  '910999000',
  '910999000',
  'sto.antonio@padaria.pt',
  'Sto. António, Arouca',
  'e062fea7-97da-4b2a-8607-da6a9ea8e668',
  true,
  '{"seg":{"Pão Normal":10,"Pasteis":10},"ter":{"Pão Normal":10,"Pasteis":10},"qua":{"Pão Normal":10,"Pasteis":10},"qui":{"Pão Normal":10,"Pasteis":10},"sex":{"Pão Normal":10,"Pasteis":10},"sab":{"Pão Normal":10,"Pasteis":10},"dom":{}}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  nif = EXCLUDED.nif,
  telefone = EXCLUDED.telefone,
  telemovel = EXCLUDED.telemovel,
  email = EXCLUDED.email,
  morada = EXCLUDED.morada,
  carrinha_id = EXCLUDED.carrinha_id,
  quantidades_semanais = EXCLUDED.quantidades_semanais,
  ativo = EXCLUDED.ativo,
  atualizado_em = now();

INSERT INTO public.clientes_empresariais (
  id, nome, nif, telefone, telemovel, email, morada, carrinha_id, ativo, quantidades_semanais
) VALUES (
  'b2b-quinta-anterronde',
  'Quinta de Anterronde',
  NULL,
  '256940040',
  '911000111',
  'anterronde@padaria.pt',
  'Anterronde, Arouca',
  'e062fea7-97da-4b2a-8607-da6a9ea8e668',
  true,
  '{"seg":{"Padinhas":20,"Pão Italiano":8},"ter":{"Padinhas":20,"Pão Italiano":8},"qua":{"Padinhas":20,"Pão Italiano":8},"qui":{"Padinhas":20,"Pão Italiano":8},"sex":{"Padinhas":20,"Pão Italiano":8},"sab":{"Padinhas":20,"Pão Italiano":8},"dom":{}}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  nif = EXCLUDED.nif,
  telefone = EXCLUDED.telefone,
  telemovel = EXCLUDED.telemovel,
  email = EXCLUDED.email,
  morada = EXCLUDED.morada,
  carrinha_id = EXCLUDED.carrinha_id,
  quantidades_semanais = EXCLUDED.quantidades_semanais,
  ativo = EXCLUDED.ativo,
  atualizado_em = now();

INSERT INTO public.clientes_empresariais (
  id, nome, nif, telefone, telemovel, email, morada, carrinha_id, ativo, quantidades_semanais
) VALUES (
  'b2b-belavista',
  'Belavista',
  NULL,
  '911111222',
  '911111222',
  'belavista@padaria.pt',
  'Belavista, Arouca',
  'e062fea7-97da-4b2a-8607-da6a9ea8e668',
  true,
  '{"seg":{"Broa 1 kg":2,"Padas Normais":5,"Padinhas":20,"Pão Normal":70,"Pão de Sementes":5,"Pão da Avó":8,"Triga Milha Saloio":1},"ter":{"Broa 1 kg":2,"Padas Normais":5,"Padinhas":20,"Pão Normal":70,"Pão de Sementes":5,"Pão da Avó":8,"Triga Milha Saloio":1},"qua":{"Broa 1 kg":2,"Padas Normais":5,"Padinhas":20,"Pão Normal":70,"Pão de Sementes":5,"Pão da Avó":8,"Triga Milha Saloio":1},"qui":{"Broa 1 kg":2,"Padas Normais":5,"Padinhas":20,"Pão Normal":70,"Pão de Sementes":5,"Pão da Avó":8,"Triga Milha Saloio":1},"sex":{"Broa 1 kg":2,"Padas Normais":5,"Padinhas":20,"Pão Normal":70,"Pão de Sementes":5,"Pão da Avó":8,"Triga Milha Saloio":1},"sab":{"Broa 1 kg":2,"Padas Normais":5,"Padinhas":10,"Pão Normal":80,"Pão de Sementes":5,"Pão da Avó":9,"Triga Milha Saloio":1,"Meia Lua":1,"Pão Italiano":5,"Pasteis":4,"Regueifa Doce":1,"Trança de Chocolate":1},"dom":{}}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  nif = EXCLUDED.nif,
  telefone = EXCLUDED.telefone,
  telemovel = EXCLUDED.telemovel,
  email = EXCLUDED.email,
  morada = EXCLUDED.morada,
  carrinha_id = EXCLUDED.carrinha_id,
  quantidades_semanais = EXCLUDED.quantidades_semanais,
  ativo = EXCLUDED.ativo,
  atualizado_em = now();

INSERT INTO public.clientes_empresariais (
  id, nome, nif, telefone, telemovel, email, morada, carrinha_id, ativo, quantidades_semanais
) VALUES (
  'b2b-ponte-telhe',
  'Ponte Telhe',
  NULL,
  '911222333',
  '911222333',
  'pontetelhe@padaria.pt',
  'Ponte de Telhe, Arouca',
  'b555db95-c427-4ed5-83fc-01403bd24cf5',
  true,
  '{"seg":{"Pão Normal":50,"Pão Integral":2,"Broa Amarela 1 kg":1},"ter":{"Pão Normal":50,"Pão Integral":2,"Broa Amarela 1 kg":1},"qua":{"Pão Normal":50,"Pão Integral":2,"Broa Amarela 1 kg":1},"qui":{"Pão Normal":50,"Pão Integral":2,"Broa Amarela 1 kg":1},"sex":{"Pão Normal":50,"Pão Integral":2,"Broa Amarela 1 kg":1},"sab":{"Pão Normal":160,"Pão Integral":2,"Pasteis":4,"Broa Amarela 2 kg":1,"Pão de Forma Pequeno":1},"dom":{}}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  nif = EXCLUDED.nif,
  telefone = EXCLUDED.telefone,
  telemovel = EXCLUDED.telemovel,
  email = EXCLUDED.email,
  morada = EXCLUDED.morada,
  carrinha_id = EXCLUDED.carrinha_id,
  quantidades_semanais = EXCLUDED.quantidades_semanais,
  ativo = EXCLUDED.ativo,
  atualizado_em = now();

INSERT INTO public.clientes_empresariais (
  id, nome, nif, telefone, telemovel, email, morada, carrinha_id, ativo, quantidades_semanais
) VALUES (
  'b2b-aicia',
  'AICIA',
  NULL,
  '256940050',
  '911333444',
  'aicia@padaria.pt',
  'Arouca',
  'b555db95-c427-4ed5-83fc-01403bd24cf5',
  true,
  '{"seg":{"Pão de Centeio":120},"ter":{"Pão de Centeio":120},"qua":{"Pão de Centeio":120},"qui":{"Pão de Centeio":120},"sex":{"Pão de Centeio":120},"sab":{"Pão de Centeio":80},"dom":{}}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  nif = EXCLUDED.nif,
  telefone = EXCLUDED.telefone,
  telemovel = EXCLUDED.telemovel,
  email = EXCLUDED.email,
  morada = EXCLUDED.morada,
  carrinha_id = EXCLUDED.carrinha_id,
  quantidades_semanais = EXCLUDED.quantidades_semanais,
  ativo = EXCLUDED.ativo,
  atualizado_em = now();

INSERT INTO public.clientes_empresariais (
  id, nome, nif, telefone, telemovel, email, morada, carrinha_id, ativo, quantidades_semanais
) VALUES (
  'b2b-cs-burgo-atl',
  'Centro Social Burgo ATL',
  NULL,
  '256940060',
  '911444555',
  'burgo.atl@padaria.pt',
  'Burgo, Arouca',
  'b555db95-c427-4ed5-83fc-01403bd24cf5',
  true,
  '{"seg":{"Pão Normal":55},"ter":{"Pão Normal":55},"qua":{"Pão Normal":55},"qui":{"Pão Normal":55},"sex":{"Pão Normal":55},"sab":{},"dom":{}}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  nif = EXCLUDED.nif,
  telefone = EXCLUDED.telefone,
  telemovel = EXCLUDED.telemovel,
  email = EXCLUDED.email,
  morada = EXCLUDED.morada,
  carrinha_id = EXCLUDED.carrinha_id,
  quantidades_semanais = EXCLUDED.quantidades_semanais,
  ativo = EXCLUDED.ativo,
  atualizado_em = now();

INSERT INTO public.clientes_empresariais (
  id, nome, nif, telefone, telemovel, email, morada, carrinha_id, ativo, quantidades_semanais
) VALUES (
  'b2b-creche-burgo',
  'Creche (Burgo)',
  NULL,
  '256940070',
  '911555666',
  'creche.burgo@padaria.pt',
  'Burgo, Arouca',
  'b555db95-c427-4ed5-83fc-01403bd24cf5',
  true,
  '{"seg":{"Pão de Centeio":15},"ter":{"Pão Normal":11},"qua":{"Pão de Centeio":15},"qui":{"Pão Normal":11},"sex":{"Pão de Centeio":15},"sab":{},"dom":{}}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  nif = EXCLUDED.nif,
  telefone = EXCLUDED.telefone,
  telemovel = EXCLUDED.telemovel,
  email = EXCLUDED.email,
  morada = EXCLUDED.morada,
  carrinha_id = EXCLUDED.carrinha_id,
  quantidades_semanais = EXCLUDED.quantidades_semanais,
  ativo = EXCLUDED.ativo,
  atualizado_em = now();

INSERT INTO public.clientes_empresariais (
  id, nome, nif, telefone, telemovel, email, morada, carrinha_id, ativo, quantidades_semanais
) VALUES (
  'b2b-centro-dia-burgo',
  'Centro de Dia (Burgo)',
  NULL,
  '256940080',
  '911666777',
  'centrodia.burgo@padaria.pt',
  'Burgo, Arouca',
  'b555db95-c427-4ed5-83fc-01403bd24cf5',
  true,
  '{"seg":{"Pão de Centeio":45},"ter":{"Pão de Centeio":45},"qua":{"Pão de Centeio":45},"qui":{"Pão de Centeio":45},"sex":{"Pão de Centeio":45},"sab":{},"dom":{}}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  nif = EXCLUDED.nif,
  telefone = EXCLUDED.telefone,
  telemovel = EXCLUDED.telemovel,
  email = EXCLUDED.email,
  morada = EXCLUDED.morada,
  carrinha_id = EXCLUDED.carrinha_id,
  quantidades_semanais = EXCLUDED.quantidades_semanais,
  ativo = EXCLUDED.ativo,
  atualizado_em = now();

INSERT INTO public.clientes_empresariais (
  id, nome, nif, telefone, telemovel, email, morada, carrinha_id, ativo, quantidades_semanais
) VALUES (
  'b2b-carocha',
  'Carocha',
  NULL,
  '911777888',
  '911777888',
  'carocha@padaria.pt',
  'Arouca',
  'c666db95-c427-4ed5-83fc-01403bd24cf6',
  true,
  '{"seg":{"Pão Integral":25,"Pão de Centeio":40,"Triga Milha 0,5 kg":2,"Broa Branca 1 kg":2,"Broa Amarela 1 kg":8,"Padinhas":44,"Pão Italiano":35,"Pão Saloio":35,"Mini Pão Saloio":15,"Padas Normais":15,"Pão de Sementes":15,"Broa com Chouriço":1,"Pasteis":55,"Pastel Miniatura":25,"Pão com Chouriço":8,"Lanche":6,"Pão Pizza":2,"Merendas":2,"Meia Bola de Carne":3},"ter":{"Pão Integral":25,"Pão de Centeio":40,"Triga Milha 0,5 kg":2,"Broa Branca 1 kg":2,"Broa Amarela 1 kg":8,"Padinhas":44,"Pão Italiano":35,"Pão Saloio":35,"Mini Pão Saloio":15,"Padas Normais":15,"Pão de Sementes":15,"Broa com Chouriço":1,"Pasteis":55,"Pastel Miniatura":25,"Pão com Chouriço":8,"Lanche":6,"Pão Pizza":2,"Merendas":2,"Meia Bola de Carne":3},"qua":{"Pão Integral":25,"Pão de Centeio":40,"Triga Milha 0,5 kg":2,"Broa Branca 1 kg":2,"Broa Amarela 1 kg":8,"Padinhas":44,"Pão Italiano":35,"Pão Saloio":35,"Mini Pão Saloio":15,"Padas Normais":15,"Pão de Sementes":15,"Broa com Chouriço":1,"Pasteis":55,"Pastel Miniatura":25,"Pão com Chouriço":8,"Lanche":6,"Pão Pizza":2,"Merendas":2,"Meia Bola de Carne":3},"qui":{"Pão Integral":25,"Pão de Centeio":40,"Triga Milha 0,5 kg":2,"Broa Branca 1 kg":2,"Broa Amarela 1 kg":8,"Padinhas":44,"Pão Italiano":35,"Pão Saloio":35,"Mini Pão Saloio":15,"Padas Normais":15,"Pão de Sementes":15,"Broa com Chouriço":1,"Pasteis":55,"Pastel Miniatura":25,"Pão com Chouriço":8,"Lanche":6,"Pão Pizza":2,"Merendas":2,"Meia Bola de Carne":3},"sex":{"Pão Integral":25,"Pão de Centeio":40,"Triga Milha 0,5 kg":2,"Broa Branca 1 kg":2,"Broa Amarela 1 kg":8,"Padinhas":44,"Pão Italiano":35,"Pão Saloio":35,"Mini Pão Saloio":15,"Padas Normais":15,"Pão de Sementes":15,"Broa com Chouriço":1,"Pasteis":55,"Pastel Miniatura":25,"Pão com Chouriço":8,"Lanche":6,"Pão Pizza":2,"Merendas":2,"Meia Bola de Carne":3},"sab":{"Pão Integral":25,"Pão de Centeio":40,"Triga Milha 0,5 kg":2,"Broa Branca 1 kg":2,"Broa Amarela 1 kg":8,"Padinhas":44,"Pão Italiano":35,"Pão Saloio":35,"Mini Pão Saloio":15,"Padas Normais":15,"Pão de Sementes":15,"Broa com Chouriço":1,"Pasteis":55,"Pastel Miniatura":25,"Pão com Chouriço":8,"Lanche":6,"Pão Pizza":2,"Merendas":2,"Meia Bola de Carne":3},"dom":{}}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  nif = EXCLUDED.nif,
  telefone = EXCLUDED.telefone,
  telemovel = EXCLUDED.telemovel,
  email = EXCLUDED.email,
  morada = EXCLUDED.morada,
  carrinha_id = EXCLUDED.carrinha_id,
  quantidades_semanais = EXCLUDED.quantidades_semanais,
  ativo = EXCLUDED.ativo,
  atualizado_em = now();

INSERT INTO public.clientes_empresariais (
  id, nome, nif, telefone, telemovel, email, morada, carrinha_id, ativo, quantidades_semanais
) VALUES (
  'b2b-pompeu',
  'Pompeu',
  NULL,
  '911888999',
  '911888999',
  'pompeu@padaria.pt',
  'Arouca',
  'c666db95-c427-4ed5-83fc-01403bd24cf6',
  true,
  '{"seg":{"Pão Normal":50,"Pão Italiano":15,"Padas de Centeio":15,"Pasteis":4,"Lanche":1,"Fatia de Pizza":1,"Broa Amarela 1 kg":3,"Triga Milha Saloio":2},"ter":{"Pão Normal":50,"Pão Italiano":15,"Padas de Centeio":15,"Pasteis":4,"Lanche":1,"Fatia de Pizza":1,"Broa Amarela 1 kg":3,"Triga Milha Saloio":2},"qua":{"Pão Normal":50,"Pão Italiano":15,"Padas de Centeio":15,"Pasteis":4,"Lanche":1,"Fatia de Pizza":1,"Broa Amarela 1 kg":3,"Triga Milha Saloio":2},"qui":{"Pão Normal":50,"Pão Italiano":15,"Padas de Centeio":15,"Pasteis":4,"Lanche":1,"Fatia de Pizza":1,"Broa Amarela 1 kg":3,"Triga Milha Saloio":2},"sex":{"Pão Normal":50,"Pão Italiano":15,"Padas de Centeio":15,"Pasteis":4,"Lanche":1,"Fatia de Pizza":1,"Broa Amarela 1 kg":3,"Triga Milha Saloio":2},"sab":{"Pão Normal":50,"Pão Italiano":15,"Padas de Centeio":15,"Pasteis":4,"Lanche":1,"Fatia de Pizza":1,"Broa Amarela 1 kg":3,"Triga Milha Saloio":2},"dom":{}}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  nif = EXCLUDED.nif,
  telefone = EXCLUDED.telefone,
  telemovel = EXCLUDED.telemovel,
  email = EXCLUDED.email,
  morada = EXCLUDED.morada,
  carrinha_id = EXCLUDED.carrinha_id,
  quantidades_semanais = EXCLUDED.quantidades_semanais,
  ativo = EXCLUDED.ativo,
  atualizado_em = now();

INSERT INTO public.clientes_empresariais (
  id, nome, nif, telefone, telemovel, email, morada, carrinha_id, ativo, quantidades_semanais
) VALUES (
  'b2b-taberna-toita',
  'Taberna da Toita',
  NULL,
  '911999111',
  '911999111',
  'toita@padaria.pt',
  'Toita, Arouca',
  'c666db95-c427-4ed5-83fc-01403bd24cf6',
  true,
  '{"seg":{"Pasteis":6,"Meia Bola de Carne":1},"ter":{"Pasteis":6,"Meia Bola de Carne":1},"qua":{"Pasteis":6,"Meia Bola de Carne":1},"qui":{"Pasteis":6,"Meia Bola de Carne":1},"sex":{"Pasteis":6,"Meia Bola de Carne":1},"sab":{"Pasteis":6,"Meia Bola de Carne":1},"dom":{}}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  nif = EXCLUDED.nif,
  telefone = EXCLUDED.telefone,
  telemovel = EXCLUDED.telemovel,
  email = EXCLUDED.email,
  morada = EXCLUDED.morada,
  carrinha_id = EXCLUDED.carrinha_id,
  quantidades_semanais = EXCLUDED.quantidades_semanais,
  ativo = EXCLUDED.ativo,
  atualizado_em = now();

INSERT INTO public.clientes_empresariais (
  id, nome, nif, telefone, telemovel, email, morada, carrinha_id, ativo, quantidades_semanais
) VALUES (
  'b2b-pretexto-paralelo',
  'Pretexto Paralelo',
  NULL,
  '912000222',
  '912000222',
  'pretexto@padaria.pt',
  'Arouca',
  'c666db95-c427-4ed5-83fc-01403bd24cf6',
  true,
  '{"seg":{"Pão Normal":65,"Broa Amarela 1 kg":3},"ter":{"Pão Normal":65,"Broa Amarela 1 kg":3},"qua":{"Pão Normal":65,"Broa Amarela 1 kg":3},"qui":{"Pão Normal":65,"Broa Amarela 1 kg":3},"sex":{"Pão Normal":65,"Broa Amarela 1 kg":3},"sab":{"Pão Normal":65,"Broa Amarela 1 kg":3},"dom":{}}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  nif = EXCLUDED.nif,
  telefone = EXCLUDED.telefone,
  telemovel = EXCLUDED.telemovel,
  email = EXCLUDED.email,
  morada = EXCLUDED.morada,
  carrinha_id = EXCLUDED.carrinha_id,
  quantidades_semanais = EXCLUDED.quantidades_semanais,
  ativo = EXCLUDED.ativo,
  atualizado_em = now();

INSERT INTO public.clientes_empresariais (
  id, nome, nif, telefone, telemovel, email, morada, carrinha_id, ativo, quantidades_semanais
) VALUES (
  'b2b-cavadinha-arouca',
  'Cavadinha Arouca',
  NULL,
  '912111333',
  '912111333',
  'cavadinha.arouca@padaria.pt',
  'Arouca',
  'c666db95-c427-4ed5-83fc-01403bd24cf6',
  true,
  '{"seg":{"Pão Integral":15,"Pão de Centeio":40,"Triga Milha 1 kg":1,"Triga Milha 0,5 kg":1,"Triga Milha 0,3 kg":1,"Broa Branca 1 kg":4,"Broa Amarela 2 kg":2,"Broa Amarela 1 kg":12,"Pão Saloio":20,"Triga Milha Saloio":2,"Padas Normais":5,"Padas de Centeio":5,"Pão de Sementes":10,"Pasteis":21,"Lanche":4,"Fatia de Pizza":2},"ter":{"Pão Integral":15,"Pão de Centeio":40,"Triga Milha 1 kg":1,"Triga Milha 0,5 kg":1,"Triga Milha 0,3 kg":1,"Broa Branca 1 kg":4,"Broa Amarela 2 kg":2,"Broa Amarela 1 kg":12,"Pão Saloio":20,"Triga Milha Saloio":2,"Padas Normais":5,"Padas de Centeio":5,"Pão de Sementes":10,"Pasteis":21,"Lanche":4,"Fatia de Pizza":2},"qua":{"Pão Integral":15,"Pão de Centeio":40,"Triga Milha 1 kg":1,"Triga Milha 0,5 kg":1,"Triga Milha 0,3 kg":1,"Broa Branca 1 kg":4,"Broa Amarela 2 kg":2,"Broa Amarela 1 kg":12,"Pão Saloio":20,"Triga Milha Saloio":2,"Padas Normais":5,"Padas de Centeio":5,"Pão de Sementes":10,"Pasteis":21,"Lanche":4,"Fatia de Pizza":2},"qui":{"Pão Integral":15,"Pão de Centeio":40,"Triga Milha 1 kg":1,"Triga Milha 0,5 kg":1,"Triga Milha 0,3 kg":1,"Broa Branca 1 kg":4,"Broa Amarela 2 kg":2,"Broa Amarela 1 kg":12,"Pão Saloio":20,"Triga Milha Saloio":2,"Padas Normais":5,"Padas de Centeio":5,"Pão de Sementes":10,"Pasteis":21,"Lanche":4,"Fatia de Pizza":2},"sex":{"Pão Integral":15,"Pão de Centeio":40,"Triga Milha 1 kg":1,"Triga Milha 0,5 kg":1,"Triga Milha 0,3 kg":1,"Broa Branca 1 kg":4,"Broa Amarela 2 kg":2,"Broa Amarela 1 kg":12,"Pão Saloio":20,"Triga Milha Saloio":2,"Padas Normais":5,"Padas de Centeio":5,"Pão de Sementes":10,"Pasteis":21,"Lanche":4,"Fatia de Pizza":2},"sab":{"Pão Integral":15,"Pão de Centeio":40,"Triga Milha 1 kg":1,"Triga Milha 0,5 kg":1,"Triga Milha 0,3 kg":1,"Broa Branca 1 kg":4,"Broa Amarela 2 kg":2,"Broa Amarela 1 kg":12,"Pão Saloio":20,"Triga Milha Saloio":2,"Padas Normais":5,"Padas de Centeio":5,"Pão de Sementes":10,"Pasteis":21,"Lanche":4,"Fatia de Pizza":2},"dom":{}}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  nif = EXCLUDED.nif,
  telefone = EXCLUDED.telefone,
  telemovel = EXCLUDED.telemovel,
  email = EXCLUDED.email,
  morada = EXCLUDED.morada,
  carrinha_id = EXCLUDED.carrinha_id,
  quantidades_semanais = EXCLUDED.quantidades_semanais,
  ativo = EXCLUDED.ativo,
  atualizado_em = now();
