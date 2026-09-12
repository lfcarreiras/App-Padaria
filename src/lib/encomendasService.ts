import { supabase, isSupabaseConfigured } from './supabase';
import { Encomenda, ItemEncomenda, EstadoEncomenda, EstadoProducaoItem } from '../types';

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

export async function atualizarEstadoEncomendaDb(encomendaId: string, novoEstado: EstadoEncomenda) {
  if (!supabase) return;
  const { error } = await supabase
    .from('encomendas')
    .update({ estado: novoEstado, atualizado_em: new Date().toISOString() })
    .eq('id', encomendaId);

  if (error) console.error('Erro ao atualizar estado da encomenda:', error);
}

export async function atualizarEstadoItemDb(itemId: string, novoEstado: EstadoProducaoItem) {
  if (!supabase) return;
  const { error } = await supabase
    .from('itens_encomenda')
    .update({ estado_producao: novoEstado })
    .eq('id', itemId);

  if (error) console.error('Erro ao atualizar estado do item:', error);
}
