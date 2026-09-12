-- ==============================================================================
-- SISTEMA DE GESTÃO DE ENCOMENDAS, PRODUÇÃO E ENTREGAS - 4 PADARIAS / PASTELARIAS
-- Esquema de Base de Dados para o Supabase (PostgreSQL + Realtime)
-- ==============================================================================

-- 1. TABELA DE LOJAS
create table if not exists public.lojas (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,               -- 'LOJA-1', 'LOJA-2', 'LOJA-3', 'LOJA-4'
  nome text not null,                        -- 'Loja Central / Matriz', 'Loja Baixa', etc.
  morada text not null,
  telefone text not null,
  nif text,
  ativo boolean default true,
  criado_em timestamp with time zone default now()
);

-- 2. TABELA DE PERFIS DE UTILIZADOR
create table if not exists public.perfis (
  id uuid primary key references auth.users on delete cascade,
  nome text not null,
  role text not null check (role in ('admin', 'atendente', 'operador_padaria', 'operador_pastelaria', 'motorista')),
  loja_id uuid references public.lojas(id), -- Nulo para administradores com visão global
  telefone text,
  ativo boolean default true,
  atualizado_em timestamp with time zone default now()
);

-- 3. TABELA DE CLIENTES
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null unique,
  email text,
  morada text,
  codigo_postal text,
  coordenadas_gps text,
  notas_entrega text, -- ex: 'Portão verde lateral, tocar na campainha do 1º Dto'
  criado_em timestamp with time zone default now()
);

-- 4. TABELA DE PRODUTOS
create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text not null check (categoria in ('padaria', 'pastelaria', 'bebidas_outros')),
  preco decimal(10,2) not null,
  unidade text default 'unidade' check (unidade in ('unidade', 'kg', 'cento')),
  tempo_preparo_minutos integer default 60,
  ativo boolean default true,
  criado_em timestamp with time zone default now()
);

-- 5. TABELA DE CARRINHAS DE ENTREGA (Afetas a cada loja)
create table if not exists public.carrinhas (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid references public.lojas(id) not null,
  identificador text not null, -- ex: 'Carrinha 1 - Loja Centro'
  matricula text not null,
  motorista_id uuid references public.perfis(id),
  ativo boolean default true,
  criado_em timestamp with time zone default now()
);

-- 6. TABELA DE ENCOMENDAS PRINCIPAIS
create table if not exists public.encomendas (
  id uuid primary key default gen_random_uuid(),
  numero_sequencial serial,
  codigo text unique not null, -- ex: 'ENC-L1-1001'
  loja_id uuid references public.lojas(id) not null,
  cliente_id uuid references public.clientes(id) not null,
  tipo text not null check (tipo in ('levantamento_loja', 'entrega_domicilio')),
  carrinha_id uuid references public.carrinhas(id),
  data_agendamento date not null,
  hora_agendamento time not null,
  estado text not null default 'pendente' check (estado in (
    'pendente', 'em_producao', 'pronto_loja', 'em_rota', 'entregue', 'cancelado'
  )),
  estado_pagamento text default 'pendente' check (estado_pagamento in ('pendente', 'pago')),
  metodo_pagamento text check (metodo_pagamento in ('dinheiro', 'multibanco', 'mbway', 'transferencia')),
  total decimal(10,2) not null default 0,
  notas_cliente text,
  criado_por uuid references public.perfis(id),
  criado_em timestamp with time zone default now(),
  atualizado_em timestamp with time zone default now()
);

-- 7. ITENS DA ENCOMENDA (Linhas de Produção)
create table if not exists public.itens_encomenda (
  id uuid primary key default gen_random_uuid(),
  encomenda_id uuid references public.encomendas(id) on delete cascade not null,
  produto_id uuid references public.produtos(id) not null,
  setor text not null check (setor in ('padaria', 'pastelaria')),
  quantidade decimal(10,2) not null,
  preco_unitario decimal(10,2) not null,
  notas_personalizacao text, -- ex: 'Bolo de massa folhada, recheio doce de ovos, frase: Parabéns Mãe'
  estado_producao text default 'pendente' check (estado_producao in ('pendente', 'em_preparo', 'pronto')),
  criado_em timestamp with time zone default now()
);

-- ÍNDICES PARA VELOCIDADE NAS CONSULTAS
create index if not exists idx_encomendas_loja on public.encomendas(loja_id, data_agendamento);
create index if not exists idx_encomendas_estado on public.encomendas(estado);
create index if not exists idx_itens_setor_estado on public.itens_encomenda(setor, estado_producao);
create index if not exists idx_clientes_telefone on public.clientes(telefone);

-- ATIVAÇÃO DO SUPABASE REALTIME
-- Permite que o balcão, a cozinha e os motoristas recebam atualizações sem recarregar a página
alter publication supabase_realtime add table public.encomendas;
alter publication supabase_realtime add table public.itens_encomenda;

-- ==============================================================================
-- DADOS INICIAIS DE EXEMPLO (SEEDS)
-- ==============================================================================

-- Inserir as 4 Lojas
insert into public.lojas (codigo, nome, morada, telefone, nif) values
  ('LOJA-1', 'Padaria & Pastelaria Central (Matriz)', 'Av. Principal 100, Lisboa', '210000001', '500100201'),
  ('LOJA-2', 'Padaria & Pastelaria Baixa', 'Rua Augusta 45, Lisboa', '210000002', '500100202'),
  ('LOJA-3', 'Padaria & Pastelaria do Parque', 'Alameda das Flores 12, Lisboa', '210000003', '500100203'),
  ('LOJA-4', 'Padaria & Pastelaria Estação', 'Praça da Estação 8, Lisboa', '210000004', '500100204')
on conflict (codigo) do nothing;

-- Inserir Produtos Base
insert into public.produtos (nome, categoria, preco, unidade, tempo_preparo_minutos) values
  -- Padaria
  ('Pão Alentejano Tradicional', 'padaria', 1.60, 'unidade', 120),
  ('Pão de Mafra', 'padaria', 1.40, 'unidade', 90),
  ('Broa de Milho', 'padaria', 2.20, 'unidade', 180),
  ('Baguete Rústica de Cereais', 'padaria', 1.10, 'unidade', 60),
  ('Regueifa Doce de Páscoa/Época', 'padaria', 7.50, 'unidade', 240),
  ('Pão de Forma Artesanal', 'padaria', 2.80, 'unidade', 90),
  -- Pastelaria
  ('Pastel de Nata (Caixa 6 un)', 'pastelaria', 6.90, 'unidade', 45),
  ('Bolo de Aniversário Personalizado (kg)', 'pastelaria', 18.50, 'kg', 360),
  ('Croissant Francês Manteiga', 'pastelaria', 1.35, 'unidade', 60),
  ('Bola de Berlim com Creme de Ovos', 'pastelaria', 1.50, 'unidade', 90),
  ('Mil-Folhas Tradicional', 'pastelaria', 1.70, 'unidade', 90),
  ('Tarte de Fruta da Época', 'pastelaria', 16.00, 'unidade', 180),
  -- Outros
  ('Sumo de Laranja Natural 500ml', 'bebidas_outros', 2.90, 'unidade', 10)
on conflict do nothing;
