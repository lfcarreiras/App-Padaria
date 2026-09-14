import { supabase } from './supabase';
import { Encomenda, ItemEncomenda, EstadoEncomenda, EstadoProducaoItem, Cliente, Produto, Loja, Carrinha, PerfilUtilizador } from '../types';

export function parseEncomendasFromDb(data: any[]): Encomenda[] {
  if (!data || !Array.isArray(data)) return [];

  return data.map((row, index) => {
    const cliente = row.clientes || {};
    const loja = row.lojas || {};
    const carrinha = row.carrinhas || {};
    const rawItens = row.itens_encomenda || [];

    const itens: ItemEncomenda[] = rawItens.map((item: any) => ({
      id: item.id,
      encomenda_id: row.id,
      produto_id: item.produto_id,
      produto_nome: item.produtos?.nome || 'Artigo de Padaria/Pastelaria',
      setor: item.setor || 'padaria',
      quantidade: Number(item.quantidade) || 1,
      preco_unitario: Number(item.preco_unitario) || 0,
      notas_personalizacao: item.notas_personalizacao || undefined,
      estado_producao: item.estado_producao || 'pendente',
    }));

    return {
      id: row.id,
      numero_sequencial: row.numero_sequencial || (index + 1),
      codigo: row.codigo,
      loja_id: row.loja_id,
      loja_nome: loja.nome || 'Padaria Central',
      cliente: {
        id: cliente.id || '',
        nome: cliente.nome || 'Cliente',
        telefone: cliente.telefone || '',
        morada: cliente.morada || undefined,
        codigo_postal: cliente.codigo_postal || undefined,
        notas_entrega: cliente.notas_entrega || undefined,
      },
      tipo: row.tipo,
      carrinha_id: row.carrinha_id || undefined,
      carrinha_nome: carrinha.identificador || undefined,
      data_agendamento: row.data_agendamento,
      hora_agendamento: typeof row.hora_agendamento === 'string' 
        ? row.hora_agendamento.slice(0, 5) 
        : '10:00',
      estado: row.estado as EstadoEncomenda,
      estado_pagamento: row.estado_pagamento,
      metodo_pagamento: row.metodo_pagamento,
      total: Number(row.total) || 0,
      notas_cliente: row.notas_cliente || undefined,
      itens,
      criado_em: row.criado_em,
    };
  });
}

export async function carregarEncomendasSupabase(): Promise<Encomenda[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('encomendas')
    .select(`
      id,
      numero_sequencial,
      codigo,
      loja_id,
      tipo,
      carrinha_id,
      data_agendamento,
      hora_agendamento,
      estado,
      estado_pagamento,
      metodo_pagamento,
      total,
      notas_cliente,
      criado_em,
      clientes(id, nome, telefone, morada, codigo_postal, notas_entrega),
      lojas(id, nome, codigo),
      carrinhas(id, identificador, matricula),
      itens_encomenda(
        id,
        produto_id,
        setor,
        quantidade,
        preco_unitario,
        notas_personalizacao,
        estado_producao,
        produtos(id, nome)
      )
    `)
    .order('criado_em', { ascending: false });

  if (error) {
    console.error('Erro ao carregar encomendas reais do Supabase:', error);
    return [];
  }

  return parseEncomendasFromDb(data);
}

export async function atualizarEstadoEncomendaDb(
  encomendaId: string, 
  novoEstado: EstadoEncomenda,
  estadoPagamento?: 'pago' | 'pendente'
) {
  if (!supabase) return;
  const updates: any = { 
    estado: novoEstado, 
    atualizado_em: new Date().toISOString() 
  };
  if (estadoPagamento) {
    updates.estado_pagamento = estadoPagamento;
  }
  const { error } = await supabase
    .from('encomendas')
    .update(updates)
    .eq('id', encomendaId);

  if (error) console.error('Erro ao atualizar estado da encomenda:', error);
}

export async function alternarTipoEntregaDb(
  encomendaId: string,
  novoTipo: 'levantamento_loja' | 'entrega_domicilio',
  lojaId?: string,
  carrinhaIdEspecifica?: string
) {
  if (!supabase) return false;

  let carrinhaFinal: string | null = null;

  if (novoTipo === 'entrega_domicilio') {
    if (carrinhaIdEspecifica) {
      carrinhaFinal = carrinhaIdEspecifica;
    } else if (lojaId) {
      const { data: carDb } = await supabase
        .from('carrinhas')
        .select('id')
        .eq('loja_id', lojaId)
        .limit(1)
        .maybeSingle();
      if (carDb) carrinhaFinal = carDb.id;
    }
  }

  const { error } = await supabase
    .from('encomendas')
    .update({
      tipo: novoTipo,
      carrinha_id: carrinhaFinal,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', encomendaId);

  if (error) {
    console.error('Erro ao alternar modo de entrega:', error);
    return false;
  }
  return true;
}

export async function atualizarEstadoItemDb(itemId: string, novoEstado: EstadoProducaoItem) {
  if (!supabase) return;
  const { error } = await supabase
    .from('itens_encomenda')
    .update({ estado_producao: novoEstado })
    .eq('id', itemId);

  if (error) console.error('Erro ao atualizar estado do item:', error);
}

// ---------------- CLIENTES ---------------- //

export async function carregarClientesSupabase(): Promise<Cliente[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao carregar clientes:', error);
    return [];
  }
  return data || [];
}

export async function salvarClienteDb(cliente: Partial<Cliente> & { nome: string; telefone: string }) {
  if (!supabase) return null;

  const payload = {
    nome: cliente.nome.trim(),
    telefone: cliente.telefone.trim(),
    email: cliente.email?.trim() || null,
    morada: cliente.morada?.trim() || null,
    codigo_postal: cliente.codigo_postal?.trim() || null,
    notas_entrega: cliente.notas_entrega?.trim() || null,
  };

  if (cliente.id) {
    const { data, error } = await supabase
      .from('clientes')
      .update(payload)
      .eq('id', cliente.id)
      .select()
      .single();
    if (error) console.error('Erro ao atualizar cliente:', error);
    return data;
  } else {
    const { data, error } = await supabase
      .from('clientes')
      .insert(payload)
      .select()
      .single();
    if (error) console.error('Erro ao criar cliente:', error);
    return data;
  }
}

// ---------------- PRODUTOS ---------------- //

export async function carregarProdutosSupabase(): Promise<Produto[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao carregar produtos:', error);
    return [];
  }
  return data || [];
}

export async function salvarProdutoDb(produto: Partial<Produto> & { nome: string; preco: number; categoria: any }) {
  if (!supabase) return null;
  const payload = {
    nome: produto.nome.trim(),
    preco: produto.preco,
    categoria: produto.categoria,
    unidade: produto.unidade || 'unidade',
    ativo: produto.ativo !== undefined ? produto.ativo : true,
  };

  if (produto.id) {
    const { data, error } = await supabase
      .from('produtos')
      .update(payload)
      .eq('id', produto.id)
      .select()
      .single();
    if (error) console.error('Erro ao atualizar produto:', error);
    return data;
  } else {
    const { data, error } = await supabase
      .from('produtos')
      .insert(payload)
      .select()
      .single();
    if (error) console.error('Erro ao criar produto:', error);
    return data;
  }
}

// ---------------- LOJAS ---------------- //

export async function carregarLojasSupabase(): Promise<Loja[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('lojas')
    .select('*')
    .order('codigo', { ascending: true });

  if (error) {
    console.error('Erro ao carregar lojas:', error);
    return [];
  }
  return data || [];
}

export async function salvarLojaDb(loja: Partial<Loja> & { codigo: string; nome: string; morada: string; telefone: string }) {
  if (!supabase) return null;
  const payload = {
    codigo: loja.codigo.trim(),
    nome: loja.nome.trim(),
    morada: loja.morada.trim(),
    telefone: loja.telefone.trim(),
    nif: loja.nif?.trim() || null,
    ativo: loja.ativo !== undefined ? loja.ativo : true,
  };

  if (loja.id) {
    const { data, error } = await supabase
      .from('lojas')
      .update(payload)
      .eq('id', loja.id)
      .select()
      .single();
    if (error) console.error('Erro ao atualizar loja:', error);
    return data;
  } else {
    const { data, error } = await supabase
      .from('lojas')
      .insert(payload)
      .select()
      .single();
    if (error) console.error('Erro ao criar loja:', error);
    return data;
  }
}

// ---------------- CARRINHAS ---------------- //

export async function carregarCarrinhasSupabase(): Promise<Carrinha[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('carrinhas')
    .select('*')
    .order('identificador', { ascending: true });

  if (error) {
    console.error('Erro ao carregar carrinhas:', error);
    return [];
  }
  return data || [];
}

export async function salvarCarrinhaDb(carrinha: Partial<Carrinha> & { loja_id: string; identificador: string; matricula: string }) {
  if (!supabase) return null;
  const payload = {
    loja_id: carrinha.loja_id,
    identificador: carrinha.identificador.trim(),
    matricula: carrinha.matricula.trim(),
    ativo: carrinha.ativo !== undefined ? carrinha.ativo : true,
  };

  if (carrinha.id) {
    const { data, error } = await supabase
      .from('carrinhas')
      .update(payload)
      .eq('id', carrinha.id)
      .select()
      .single();
    if (error) console.error('Erro ao atualizar carrinha:', error);
    return data;
  } else {
    const { data, error } = await supabase
      .from('carrinhas')
      .insert(payload)
      .select()
      .single();
    if (error) console.error('Erro ao criar carrinha:', error);
    return data;
  }
}

// ---------------- IMPORTAÇÃO MASSIVA (UPSERT) ---------------- //

export async function upsertClientesEmLote(clientes: any[]) {
  if (!supabase || !clientes.length) return { inseridos: 0, erros: [] };

  let sucesso = 0;
  const erros: string[] = [];

  for (const c of clientes) {
    if (!c.telefone || !c.nome) continue;
    try {
      const { data: existente } = await supabase
        .from('clientes')
        .select('id')
        .eq('telefone', c.telefone.trim())
        .maybeSingle();

      const payload = {
        nome: c.nome.trim(),
        telefone: c.telefone.trim(),
        email: c.email?.trim() || null,
        morada: c.morada?.trim() || null,
        codigo_postal: c.codigo_postal?.trim() || null,
        notas_entrega: c.notas_entrega?.trim() || null,
      };

      if (existente) {
        await supabase.from('clientes').update(payload).eq('id', existente.id);
      } else {
        await supabase.from('clientes').insert(payload);
      }
      sucesso++;
    } catch (err: any) {
      erros.push(`Falha no cliente ${c.nome} (${c.telefone}): ${err.message}`);
    }
  }

  return { sucesso, erros };
}

export async function upsertProdutosEmLote(produtos: any[]) {
  if (!supabase || !produtos.length) return { inseridos: 0, erros: [] };

  let sucesso = 0;
  const erros: string[] = [];

  for (const p of produtos) {
    if (!p.nome || !p.nome.trim()) continue;
    try {
      const { data: existente } = await supabase
        .from('produtos')
        .select('id')
        .ilike('nome', p.nome.trim())
        .maybeSingle();

      const payload = {
        nome: p.nome.trim(),
        preco: Number(p.preco) || 0,
        categoria: p.categoria === 'pastelaria' ? 'pastelaria' : 'padaria',
        unidade: p.unidade || 'unidade',
        ativo: p.ativo !== undefined ? Boolean(p.ativo) : true,
      };

      if (existente) {
        await supabase.from('produtos').update(payload).eq('id', existente.id);
      } else {
        await supabase.from('produtos').insert(payload);
      }
      sucesso++;
    } catch (err: any) {
      erros.push(`Falha no produto ${p.nome}: ${err.message}`);
    }
  }

  return { sucesso, erros };
}

// ---------------- GESTÃO DE ACESSOS & UTILIZADORES ---------------- //

export function normalizarPerfil(p: any): PerfilUtilizador {
  const acessoEnc = p.acesso_encomendas || (p.painel_encomendas ? 'edicao' : 'sem_acesso');
  const acessoProd = p.acesso_producao || (p.painel_producao ? 'edicao' : 'sem_acesso');
  const acessoLoja = p.acesso_loja || (p.painel_loja ? 'edicao' : 'sem_acesso');
  const acessoEnt = p.acesso_entregas || (p.painel_entregas ? 'edicao' : 'sem_acesso');
  const acessoGest = p.acesso_gestao || (p.painel_gestao ? 'edicao' : 'sem_acesso');

  return {
    id: p.id || `user-${Date.now()}`,
    nome: p.nome || 'Colaborador',
    telefone: p.telefone || '',
    email: p.email || '',
    password: p.password || (p.role === 'admin' ? 'admin' : '123'),
    role: p.role || 'atendente',
    loja_id: p.loja_id,
    loja_nome: p.loja_nome,
    acesso_encomendas: acessoEnc,
    acesso_producao: acessoProd,
    acesso_loja: acessoLoja,
    acesso_entregas: acessoEnt,
    acesso_gestao: acessoGest,
    painel_encomendas: acessoEnc !== 'sem_acesso',
    painel_producao: acessoProd !== 'sem_acesso',
    painel_loja: acessoLoja !== 'sem_acesso',
    painel_entregas: acessoEnt !== 'sem_acesso',
    painel_gestao: acessoGest !== 'sem_acesso',
    ativo: p.ativo !== undefined ? Boolean(p.ativo) : true,
    atualizado_em: p.atualizado_em,
  };
}

export const PERFIS_INICIAIS: PerfilUtilizador[] = [
  {
    id: 'user-admin',
    nome: 'Administrador Geral',
    telefone: '910 000 001',
    email: 'admin@padaria.pt',
    password: 'admin',
    role: 'admin',
    loja_id: undefined,
    loja_nome: 'Todas as Lojas',
    acesso_encomendas: 'edicao',
    acesso_producao: 'edicao',
    acesso_loja: 'edicao',
    acesso_entregas: 'edicao',
    acesso_gestao: 'edicao',
    painel_encomendas: true,
    painel_producao: true,
    painel_loja: true,
    painel_entregas: true,
    painel_gestao: true,
    ativo: true,
  },
  {
    id: 'user-gerente',
    nome: 'António Silva (Gerente)',
    telefone: '910 000 002',
    email: 'antonio.silva@padaria.pt',
    password: '123',
    role: 'gerente_loja',
    loja_id: 'loja-1',
    loja_nome: 'Padaria Central (Matriz)',
    acesso_encomendas: 'edicao',
    acesso_producao: 'edicao',
    acesso_loja: 'edicao',
    acesso_entregas: 'edicao',
    acesso_gestao: 'leitura',
    painel_encomendas: true,
    painel_producao: true,
    painel_loja: true,
    painel_entregas: true,
    painel_gestao: true,
    ativo: true,
  },
  {
    id: 'user-balcao',
    nome: 'Marta Santos (Atendente Balcão)',
    telefone: '910 000 003',
    email: 'marta.santos@padaria.pt',
    password: '123',
    role: 'atendente',
    loja_id: 'loja-1',
    loja_nome: 'Padaria Central (Matriz)',
    acesso_encomendas: 'edicao',
    acesso_producao: 'leitura',
    acesso_loja: 'edicao',
    acesso_entregas: 'sem_acesso',
    acesso_gestao: 'sem_acesso',
    painel_encomendas: true,
    painel_producao: true,
    painel_loja: true,
    painel_entregas: false,
    painel_gestao: false,
    ativo: true,
  },
  {
    id: 'user-padeiro',
    nome: 'Carlos Ferreira (Chefe Padeiro)',
    telefone: '910 000 004',
    email: 'carlos.padeiro@padaria.pt',
    password: '123',
    role: 'operador_padaria',
    loja_id: 'loja-1',
    loja_nome: 'Padaria Central (Matriz)',
    acesso_encomendas: 'leitura',
    acesso_producao: 'edicao',
    acesso_loja: 'sem_acesso',
    acesso_entregas: 'sem_acesso',
    acesso_gestao: 'sem_acesso',
    painel_encomendas: true,
    painel_producao: true,
    painel_loja: false,
    painel_entregas: false,
    painel_gestao: false,
    ativo: true,
  },
  {
    id: 'user-motorista',
    nome: 'Rui Oliveira (Motorista Carrinha 1)',
    telefone: '910 000 005',
    email: 'rui.motorista@padaria.pt',
    password: '123',
    role: 'motorista',
    loja_id: 'loja-1',
    loja_nome: 'Carrinha 1 - Matriz',
    acesso_encomendas: 'sem_acesso',
    acesso_producao: 'sem_acesso',
    acesso_loja: 'leitura',
    acesso_entregas: 'edicao',
    acesso_gestao: 'sem_acesso',
    painel_encomendas: false,
    painel_producao: false,
    painel_loja: true,
    painel_entregas: true,
    painel_gestao: false,
    ativo: true,
  },
];

const CONFIG_PHONE_KEY = '000000000';

export async function carregarPerfisAcessoSupabase(): Promise<PerfilUtilizador[]> {
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('app_perfis_utilizadores');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(normalizarPerfil);
        }
      } catch (e) {}
    }
  }

  if (!supabase) return PERFIS_INICIAIS.map(normalizarPerfil);

  try {
    const { data } = await supabase
      .from('clientes')
      .select('notas_entrega')
      .eq('telefone', CONFIG_PHONE_KEY)
      .maybeSingle();

    if (data && data.notas_entrega) {
      const parsed = JSON.parse(data.notas_entrega);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const normalizados = parsed.map(normalizarPerfil);
        if (typeof window !== 'undefined') {
          localStorage.setItem('app_perfis_utilizadores', JSON.stringify(normalizados));
        }
        return normalizados;
      }
    }
  } catch (err) {
    console.warn('Usando perfis predefinidos:', err);
  }

  return PERFIS_INICIAIS.map(normalizarPerfil);
}

export async function salvarTodosPerfisSupabase(perfis: PerfilUtilizador[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('app_perfis_utilizadores', JSON.stringify(perfis));
  }

  if (!supabase) return;

  try {
    const jsonStr = JSON.stringify(perfis);
    const { data: existente } = await supabase
      .from('clientes')
      .select('id')
      .eq('telefone', CONFIG_PHONE_KEY)
      .maybeSingle();

    if (existente) {
      await supabase
        .from('clientes')
        .update({
          nome: '[SISTEMA_ACESSOS_UTILIZADORES]',
          notas_entrega: jsonStr,
        })
        .eq('id', existente.id);
    } else {
      await supabase
        .from('clientes')
        .insert({
          nome: '[SISTEMA_ACESSOS_UTILIZADORES]',
          telefone: CONFIG_PHONE_KEY,
          notas_entrega: jsonStr,
        });
    }
  } catch (err) {
    console.error('Erro ao sincronizar perfis no Supabase:', err);
  }
}

export async function salvarPerfilAcessoDb(perfil: PerfilUtilizador): Promise<PerfilUtilizador[]> {
  const listaAtual = await carregarPerfisAcessoSupabase();
  let novaLista: PerfilUtilizador[] = [];

  const idx = listaAtual.findIndex((p) => p.id === perfil.id);
  if (idx >= 0) {
    novaLista = listaAtual.map((p) => (p.id === perfil.id ? { ...perfil, atualizado_em: new Date().toISOString() } : p));
  } else {
    novaLista = [...listaAtual, { ...perfil, id: `user-${Date.now()}`, atualizado_em: new Date().toISOString() }];
  }

  await salvarTodosPerfisSupabase(novaLista);
  return novaLista;
}

export async function eliminarPerfilAcessoDb(perfilId: string): Promise<PerfilUtilizador[]> {
  const listaAtual = await carregarPerfisAcessoSupabase();
  const novaLista = listaAtual.filter((p) => p.id !== perfilId);
  await salvarTodosPerfisSupabase(novaLista);
  return novaLista;
}
