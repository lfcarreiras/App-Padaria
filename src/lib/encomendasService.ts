import { supabase } from './supabase';
import { Encomenda, ItemEncomenda, EstadoEncomenda, EstadoProducaoItem, Cliente, Produto, Loja, Carrinha, PerfilUtilizador, LogAuditoria, BaseFixaCarrinha, ClienteEmpresarialB2B, DiaSemana } from '../types';
import { LOGS_AUDITORIA_MOCK, CARRINHAS_MOCK, COLUNAS_MAPA_DIARIO_OFICIAL, BASE_FIXA_CARRINHAS_INICIAL, CLIENTES_EMPRESARIAIS_B2B_INICIAIS } from './mockData';

const REAL_DELIVERY_TIMESTAMPS_KEY = 'padaria_timestamps_entrega_real_v1';
const CANAL_ORIGEM_FALLBACK_KEY = 'padaria_canais_origem_v1';
const ESTADO_ITENS_FALLBACK_KEY = 'padaria_estado_itens_v1';
const OBS_PRODUCAO_FALLBACK_KEY = 'padaria_obs_producao_v1';

export function guardarCanalOrigemLocal(encomendaId: string, canal: string) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(CANAL_ORIGEM_FALLBACK_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[encomendaId] = canal;
    localStorage.setItem(CANAL_ORIGEM_FALLBACK_KEY, JSON.stringify(map));
  } catch (e) {}
}

export function parseEncomendasFromDb(data: any[]): Encomenda[] {
  if (!data || !Array.isArray(data)) return [];

  let localTimestamps: Record<string, { data: string; hora: string }> = {};
  let localCanais: Record<string, string> = {};
  let localEstadosItens: Record<string, EstadoProducaoItem> = {};
  let localObsProducao: Record<string, string> = {};
  let localEncomendasPortal: Encomenda[] = [];
  if (typeof window !== 'undefined') {
    try {
      const rawTs = localStorage.getItem(REAL_DELIVERY_TIMESTAMPS_KEY);
      if (rawTs) localTimestamps = JSON.parse(rawTs);
      const rawCan = localStorage.getItem(CANAL_ORIGEM_FALLBACK_KEY);
      if (rawCan) localCanais = JSON.parse(rawCan);
      const rawEstIt = localStorage.getItem(ESTADO_ITENS_FALLBACK_KEY);
      if (rawEstIt) localEstadosItens = JSON.parse(rawEstIt);
      const rawObsProd = localStorage.getItem(OBS_PRODUCAO_FALLBACK_KEY);
      if (rawObsProd) localObsProducao = JSON.parse(rawObsProd);
      const rawPortal = localStorage.getItem('encomendas_portal_cliente_v1');
      if (rawPortal) localEncomendasPortal = JSON.parse(rawPortal);
    } catch (e) {}
  }

  return data.map((row, index) => {
    const cliente = row.clientes || {};
    const loja = row.lojas || {};
    const carrinha = row.carrinhas || {};
    const rawItens = row.itens_encomenda || [];
    const portalMatch = localEncomendasPortal.find(
      (e) => e.id === row.id || (row.codigo && e.codigo === row.codigo)
    );
    const todosAutoRecovery =
      rawItens.length > 0 &&
      rawItens.every((it: any) => String(it.notas_personalizacao || '').includes('[AUTO_RECOVERY]'));

    let itens: ItemEncomenda[] = rawItens.map((item: any, idx: number) => {
      const notasRaw = String(item.notas_personalizacao || '');
      const temTagRecusado = /\[RECUSADO\]/i.test(notasRaw);
      const notasLimpaItem = notasRaw
        .replace(/\[RECUSADO\]\s*/gi, '')
        .replace(/\[AUTO_RECOVERY\]\s*/gi, '')
        .trim();
      const estadoItemFinal: EstadoProducaoItem =
        item.estado_producao === 'recusado' || temTagRecusado || localEstadosItens[item.id] === 'recusado'
          ? 'recusado'
          : (localEstadosItens[item.id] || item.estado_producao || 'pendente');

      const nomeFallbackPortal =
        !todosAutoRecovery && portalMatch?.itens?.[idx]?.produto_nome
          ? portalMatch.itens[idx].produto_nome
          : undefined;

      return {
        id: item.id,
        encomenda_id: row.id,
        produto_id: item.produto_id,
        produto_nome: item.produtos?.nome || item.produto_nome || nomeFallbackPortal || 'Artigo de Padaria/Pastelaria',
        setor: item.setor || 'padaria',
        quantidade: Number(item.quantidade) || 1,
        preco_unitario: Number(item.preco_unitario) || 0,
        notas_personalizacao: notasLimpaItem || undefined,
        estado_producao: estadoItemFinal,
      };
    });

    // Se a encomenda veio sem itens (ou se existia na cache local do portal com os itens originais exatos antes do fix)
    if (itens.length === 0 && portalMatch && portalMatch.itens && portalMatch.itens.length > 0) {
      itens = portalMatch.itens.map((it) => ({
        ...it,
        encomenda_id: row.id,
        estado_producao: localEstadosItens[it.id] || it.estado_producao || 'pendente',
      }));
    } else if (itens.length === 0 && row.notas_cliente && row.notas_cliente.includes('[ITENS_BACKUP:')) {
      try {
        const matchBkp = row.notas_cliente.match(/\[ITENS_BACKUP:([\s\S]*?)\]/);
        if (matchBkp && matchBkp[1]) {
          const parsedBkp = JSON.parse(matchBkp[1]);
          if (Array.isArray(parsedBkp)) {
            itens = parsedBkp.map((b: any, idx: number) => {
              const itemId = b.id || `bkp-${row.id}-${idx}`;
              return {
                id: itemId,
                encomenda_id: row.id,
                produto_id: b.produto_id || '',
                produto_nome: b.nome || 'Artigo de Padaria/Pastelaria',
                setor: b.setor || 'padaria',
                quantidade: Number(b.qtd) || 1,
                preco_unitario: 0,
                notas_personalizacao: b.notas || undefined,
                estado_producao: localEstadosItens[itemId] || 'pendente',
              };
            });
          }
        }
      } catch (e) {}
    }

    // Determinar data e hora de entrega real para cálculo de On-Time e registo de levantamento
    let dataEntregaReal: string | undefined = row.data_entrega_real || localTimestamps[row.id]?.data;
    let horaEntregaReal: string | undefined = undefined;
    if (row.hora_entrega_real) {
      horaEntregaReal = String(row.hora_entrega_real).slice(0, 5);
    } else if (localTimestamps[row.id]?.hora) {
      horaEntregaReal = localTimestamps[row.id].hora;
    } else if (row.notas_cliente && row.notas_cliente.includes('[ENTREGUE:')) {
      const matchFull = row.notas_cliente.match(/\[ENTREGUE:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\s+([0-9]{2}:[0-9]{2})\]/);
      if (matchFull) {
        dataEntregaReal = matchFull[1];
        horaEntregaReal = matchFull[2];
      } else {
        const matchTime = row.notas_cliente.match(/\[ENTREGUE:\s*([0-9]{2}:[0-9]{2})\]/);
        if (matchTime) horaEntregaReal = matchTime[1];
      }
    } else if (row.estado === 'entregue' && row.atualizado_em) {
      try {
        const d = new Date(row.atualizado_em);
        dataEntregaReal = dataEntregaReal || d.toISOString().split('T')[0];
        horaEntregaReal = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch (e) {
        dataEntregaReal = dataEntregaReal || row.data_agendamento;
        horaEntregaReal = typeof row.hora_agendamento === 'string' ? row.hora_agendamento.slice(0, 5) : '10:00';
      }
    }

    if (row.estado === 'entregue' && !dataEntregaReal) {
      dataEntregaReal = row.data_agendamento;
    }

    // Determinar canal de origem
    let canalExtraido = row.canal_origem || localCanais[row.id] || localCanais[row.codigo];
    if (!canalExtraido && row.notas_cliente) {
      const matchCanal = row.notas_cliente.match(/\[CANAL:(presencial|telefone|whatsapp|site_online)\]/i);
      if (matchCanal) {
        canalExtraido = matchCanal[1].toLowerCase();
      } else if (row.notas_cliente.toLowerCase().includes('whatsapp') || row.notas_cliente.toLowerCase().includes('[whatsapp]')) {
        canalExtraido = 'whatsapp';
      } else if (row.notas_cliente.toLowerCase().includes('[online site]') || row.notas_cliente.toLowerCase().includes('site') || row.notas_cliente.toLowerCase().includes('[online]')) {
        canalExtraido = 'site_online';
      } else if (row.notas_cliente.toLowerCase().includes('telefone') || row.notas_cliente.toLowerCase().includes('chamada')) {
        canalExtraido = 'telefone';
      }
    }

    // Extrair Observações de Produção se presentes em notas_cliente ([OBS_PROD:...])
    let obsProducaoExtraida: string | undefined = localObsProducao[row.id];
    if (row.notas_cliente) {
      const matchObsProd = row.notas_cliente.match(/\[OBS_PROD:([\s\S]*?)\]/i);
      if (matchObsProd && matchObsProd[1]) {
        obsProducaoExtraida = matchObsProd[1].trim();
      }
    }

    const notasLimpa = row.notas_cliente
      ? row.notas_cliente
          .replace(/\[CANAL:(presencial|telefone|whatsapp|site_online)\]\s*/gi, '')
          .replace(/\[OBS_PROD:[\s\S]*?\]\s*/gi, '')
          .replace(/\[ITENS_BACKUP:[\s\S]*?\]\s*/gi, '')
          .trim()
      : undefined;

    const carrinhaMockMatch = CARRINHAS_MOCK.find((cm) => cm.id === row.carrinha_id);

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
        email: cliente.email || undefined,
        morada: cliente.morada || undefined,
        codigo_postal: cliente.codigo_postal || undefined,
        notas_entrega: cliente.notas_entrega
          ? String(cliente.notas_entrega).replace(/\[AUTH_PWD:[^\]]+\]\s*/g, '').trim() || undefined
          : undefined,
      },
      tipo: row.tipo,
      canal_origem: (canalExtraido as any) || 'presencial',
      carrinha_id: row.carrinha_id || undefined,
      carrinha_nome: carrinhaMockMatch?.identificador || carrinha.identificador || undefined,
      data_agendamento: row.data_agendamento,
      hora_agendamento: typeof row.hora_agendamento === 'string' 
        ? row.hora_agendamento.slice(0, 5) 
        : '10:00',
      data_entrega_real: dataEntregaReal,
      hora_entrega_real: horaEntregaReal,
      ordem_rota: row.ordem_rota || (index + 1),
      estado: row.estado as EstadoEncomenda,
      estado_pagamento: row.estado_pagamento,
      metodo_pagamento: row.metodo_pagamento,
      total: Number(row.total) || 0,
      notas_cliente: notasLimpa || undefined,
      observacoes_producao: obsProducaoExtraida || undefined,
      itens,
      criado_em: row.criado_em,
    };
  });
}

const OFFLINE_ENCOMENDAS_CACHE_KEY = 'padaria_encomendas_cache_v1';

function lerCacheEncomendasOffline(): Encomenda[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFLINE_ENCOMENDAS_CACHE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    return list.map((enc: any) => ({
      ...enc,
      itens: Array.isArray(enc?.itens) ? enc.itens : [],
      cliente: enc?.cliente || { id: '', nome: 'Cliente', telefone: '' },
    }));
  } catch {
    return [];
  }
}

export async function carregarEncomendasSupabase(): Promise<Encomenda[]> {
  if (!supabase) return lerCacheEncomendasOffline();

  try {
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
      console.error('Erro ao carregar encomendas reais do Supabase (usando cache offline):', error);
      return lerCacheEncomendasOffline();
    }

    const parsed = parseEncomendasFromDb(data);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(OFFLINE_ENCOMENDAS_CACHE_KEY, JSON.stringify(parsed));
      } catch {}
    }
    return parsed;
  } catch (err) {
    console.warn('Falha de rede ao ligar ao Supabase, ativando cache offline local:', err);
    return lerCacheEncomendasOffline();
  }
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
  if (novoEstado === 'entregue' && typeof window !== 'undefined') {
    const agoraData = new Date().toISOString().split('T')[0];
    const agoraHora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    try {
      const raw = localStorage.getItem(REAL_DELIVERY_TIMESTAMPS_KEY);
      const map = raw ? JSON.parse(raw) : {};
      map[encomendaId] = { data: agoraData, hora: agoraHora };
      localStorage.setItem(REAL_DELIVERY_TIMESTAMPS_KEY, JSON.stringify(map));
    } catch (e) {}
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

export async function atualizarEstadoItemDb(
  itemId: string,
  novoEstado: EstadoProducaoItem,
  notasPersonalizacaoAtuais?: string
) {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(ESTADO_ITENS_FALLBACK_KEY);
      const map = raw ? JSON.parse(raw) : {};
      map[itemId] = novoEstado;
      localStorage.setItem(ESTADO_ITENS_FALLBACK_KEY, JSON.stringify(map));
    } catch {}
  }

  if (!supabase) return;

  const notaLimpa = (notasPersonalizacaoAtuais || '').replace(/\[RECUSADO\]\s*/gi, '').trim();
  const novaNota =
    novoEstado === 'recusado'
      ? `[RECUSADO] ${notaLimpa}`.trim()
      : notaLimpa || null;

  const { error } = await supabase
    .from('itens_encomenda')
    .update({
      estado_producao: novoEstado === 'recusado' ? 'pendente' : novoEstado,
      notas_personalizacao: novaNota,
    })
    .eq('id', itemId);

  if (error) console.error('Erro ao atualizar estado do item:', error);
}

export async function salvarObservacoesProducaoDb(
  encomendaId: string,
  observacao: string,
  notasClienteAtuais?: string,
  canalOrigem?: string
) {
  const obsLimpa = observacao.trim();
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(OBS_PRODUCAO_FALLBACK_KEY);
      const map = raw ? JSON.parse(raw) : {};
      if (obsLimpa) {
        map[encomendaId] = obsLimpa;
      } else {
        delete map[encomendaId];
      }
      localStorage.setItem(OBS_PRODUCAO_FALLBACK_KEY, JSON.stringify(map));
    } catch {}
  }

  if (!supabase) return;

  const canalTag = canalOrigem ? `[CANAL:${canalOrigem}] ` : '';
  const notaBase = (notasClienteAtuais || '')
    .replace(/\[CANAL:(presencial|telefone|whatsapp|site_online)\]\s*/gi, '')
    .replace(/\[OBS_PROD:[\s\S]*?\]\s*/gi, '')
    .trim();
  const obsTag = obsLimpa ? `[OBS_PROD:${obsLimpa}] ` : '';
  const notasFinais = `${canalTag}${obsTag}${notaBase}`.trim() || null;

  await supabase
    .from('encomendas')
    .update({
      notas_cliente: notasFinais,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', encomendaId);
}

export function formatarTelefoneWhatsApp(telefone?: string): string {
  const digitos = (telefone || '').replace(/\D/g, '');
  if (!digitos) return '351910000000';
  if (digitos.startsWith('351') && digitos.length >= 12) return digitos;
  if (digitos.length === 9) return `351${digitos}`;
  return digitos;
}

export function gerarLinkWhatsAppDecisaoEncomenda(enc: Encomenda, obsExtra?: string): string {
  const tel = formatarTelefoneWhatsApp(enc.cliente?.telefone);
  const obs = (obsExtra !== undefined ? obsExtra : enc.observacoes_producao || '').trim();
  const obsTexto = obs ? `\n\nObservações da Padaria: ${obs}` : '';
  const destinoTexto =
    enc.tipo === 'levantamento_loja'
      ? `Levantamento em ${enc.loja_nome || 'Loja'}`
      : `Entrega ao Domicílio (${enc.cliente?.morada || 'Arouca'})`;

  const itensAceites = enc.itens.filter(
    (i) => i.estado_producao === 'em_preparo' || i.estado_producao === 'pronto'
  );
  const itensRecusados = enc.itens.filter((i) => i.estado_producao === 'recusado');

  let mensagem = '';
  if (itensAceites.length > 0 && itensRecusados.length === 0) {
    const lista = itensAceites.map((i) => `${i.quantidade}x ${i.produto_nome}`).join(', ');
    mensagem = `Olá ${enc.cliente.nome}! Confirmamos que a sua encomenda ${enc.codigo} (${destinoTexto} para ${enc.data_agendamento} às ${enc.hora_agendamento}) entrou em produção na Padaria da Vila:\n[Confirmado] Artigos a preparar: ${lista}.${obsTexto}`;
  } else if (itensAceites.length > 0 && itensRecusados.length > 0) {
    const listaSim = itensAceites.map((i) => `${i.quantidade}x ${i.produto_nome}`).join(', ');
    const listaNao = itensRecusados.map((i) => `${i.quantidade}x ${i.produto_nome}`).join(', ');
    mensagem = `Olá ${enc.cliente.nome}! Relativamente à sua encomenda ${enc.codigo} (${destinoTexto} para ${enc.data_agendamento} às ${enc.hora_agendamento}), informamos a confirmação parcelar do pedido:\n[Confirmado] Artigos a preparar: ${listaSim}\n[Indisponível] Artigos não produzidos: ${listaNao}${obsTexto}`;
  } else if (itensAceites.length === 0 && itensRecusados.length > 0) {
    const listaNao = itensRecusados.map((i) => `${i.quantidade}x ${i.produto_nome}`).join(', ');
    mensagem = `Olá ${enc.cliente.nome}! Lamentamos informar que não nos será possível preparar a sua encomenda ${enc.codigo} (${listaNao}) agendada para ${enc.data_agendamento} às ${enc.hora_agendamento}.${obsTexto}`;
  } else {
    const listaTodos = enc.itens.map((i) => `${i.quantidade}x ${i.produto_nome}`).join(', ');
    mensagem = `Olá ${enc.cliente.nome}! Contacto da Padaria da Vila sobre a sua encomenda ${enc.codigo} (${listaTodos}) para ${enc.data_agendamento} às ${enc.hora_agendamento}.${obsTexto}`;
  }

  return `https://wa.me/${tel}?text=${encodeURIComponent(mensagem)}`;
}

export function gerarLinkWhatsAppEncomendaPronta(enc: Encomenda): string {
  const tel = formatarTelefoneWhatsApp(enc.cliente?.telefone);
  const itensProduzidos = enc.itens.filter((i) => i.estado_producao !== 'recusado');
  const lista = (itensProduzidos.length > 0 ? itensProduzidos : enc.itens)
    .map((i) => `${i.quantidade}x ${i.produto_nome}`)
    .join(', ');

  const mensagem =
    enc.tipo === 'levantamento_loja'
      ? `Olá ${enc.cliente.nome}! A sua encomenda ${enc.codigo} (${lista}) já se encontra PRONTA para levantamento no balcão da loja ${enc.loja_nome || 'Padaria da Vila'}. Até já!`
      : `Olá ${enc.cliente.nome}! A sua encomenda ${enc.codigo} (${lista}) já se encontra PRONTA para entrega ao domicílio (${enc.cliente.morada || 'Arouca'}). Até já!`;

  return `https://wa.me/${tel}?text=${encodeURIComponent(mensagem)}`;
}

export async function concluirEntregaComTimestampDb(encomendaId: string, horaReal?: string, dataReal?: string) {
  const data = dataReal || new Date().toISOString().split('T')[0];
  const hora = horaReal || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(REAL_DELIVERY_TIMESTAMPS_KEY);
      const map = raw ? JSON.parse(raw) : {};
      map[encomendaId] = { data, hora };
      localStorage.setItem(REAL_DELIVERY_TIMESTAMPS_KEY, JSON.stringify(map));
    } catch (e) {}
  }

  if (!supabase) return false;
  const { error } = await supabase
    .from('encomendas')
    .update({
      estado: 'entregue',
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', encomendaId);

  if (error) {
    console.error('Erro ao concluir entrega com timestamp:', error);
    return false;
  }
  return true;
}

export async function atribuirCarrinhaDb(encomendaId: string, carrinhaId: string | null) {
  if (!supabase) return false;
  const { error } = await supabase
    .from('encomendas')
    .update({
      carrinha_id: carrinhaId,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', encomendaId);

  if (error) {
    console.error('Erro ao atribuir carrinha:', error);
    return false;
  }
  return true;
}

export async function eliminarEncomendaDb(encomendaId: string) {
  if (!supabase) return false;
  try {
    // 1. Apagar itens dependentes primeiro
    await supabase.from('itens_encomenda').delete().eq('encomenda_id', encomendaId);
    // 2. Apagar a encomenda
    const { error } = await supabase.from('encomendas').delete().eq('id', encomendaId);
    if (error) {
      console.error('Erro ao eliminar encomenda:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Erro na eliminação de encomenda:', err);
    return false;
  }
}

export async function atualizarEncomendaDb(encomenda: Partial<Encomenda> & { id: string }) {
  if (!supabase) return false;
  try {
    const updates: any = {
      atualizado_em: new Date().toISOString(),
    };
    if (encomenda.loja_id) updates.loja_id = encomenda.loja_id;
    if (encomenda.tipo) updates.tipo = encomenda.tipo;
    if (encomenda.canal_origem) {
      updates.canal_origem = encomenda.canal_origem;
      guardarCanalOrigemLocal(encomenda.id, encomenda.canal_origem);
    }
    if (encomenda.carrinha_id !== undefined) updates.carrinha_id = encomenda.carrinha_id || null;
    if (encomenda.data_agendamento) updates.data_agendamento = encomenda.data_agendamento;
    if (encomenda.hora_agendamento) updates.hora_agendamento = encomenda.hora_agendamento;
    if (encomenda.estado) updates.estado = encomenda.estado;
    if (encomenda.estado_pagamento) updates.estado_pagamento = encomenda.estado_pagamento;
    if (encomenda.notas_cliente !== undefined || encomenda.observacoes_producao !== undefined) {
      const canalTag = encomenda.canal_origem ? `[CANAL:${encomenda.canal_origem}] ` : '';
      const obsProdVal = encomenda.observacoes_producao || lerObservacoesProducaoLocal()[encomenda.id] || '';
      const obsProdTag = obsProdVal.trim() ? `[OBS_PROD:${obsProdVal.trim()}] ` : '';
      const notaSemTag = (encomenda.notas_cliente || '')
        .replace(/\[CANAL:(presencial|telefone|whatsapp|site_online)\]\s*/gi, '')
        .replace(/\[OBS_PROD:[\s\S]*?\]\s*/gi, '')
        .replace(/\[ITENS_BACKUP:[\s\S]*?\]\s*/gi, '')
        .trim();
      updates.notas_cliente = `${canalTag}${obsProdTag}${notaSemTag}`.trim() || null;
    }
    if (encomenda.total !== undefined) updates.total = encomenda.total;

    let { error } = await supabase
      .from('encomendas')
      .update(updates)
      .eq('id', encomenda.id);

    // Fallback automático caso a coluna canal_origem ainda não exista na cache do Supabase
    if (error && error.message && error.message.includes('canal_origem')) {
      delete updates.canal_origem;
      const retry = await supabase
        .from('encomendas')
        .update(updates)
        .eq('id', encomenda.id);
      error = retry.error;
    }

    if (error) {
      console.error('Erro ao atualizar encomenda:', error);
      return false;
    }

    // Se houver cliente para atualizar
    if (encomenda.cliente && encomenda.cliente.id) {
      await supabase
        .from('clientes')
        .update({
          nome: encomenda.cliente.nome.trim(),
          telefone: encomenda.cliente.telefone.trim(),
          morada: encomenda.cliente.morada?.trim() || null,
          notas_entrega: encomenda.cliente.notas_entrega?.trim() || null,
        })
        .eq('id', encomenda.cliente.id);
    }

    // Sincronizar itens_encomenda (incluindo novos artigos adicionados no modal de edição e preservando [RECUSADO])
    if (encomenda.itens && Array.isArray(encomenda.itens)) {
      await supabase.from('itens_encomenda').delete().eq('encomenda_id', encomenda.id);
      if (encomenda.itens.length > 0) {
        const itensPayload = encomenda.itens.map((it) => {
          const isRecusado = it.estado_producao === 'recusado';
          const notaLimpa = (it.notas_personalizacao || '').replace(/^\[RECUSADO\]\s*/i, '').trim();
          return {
            encomenda_id: encomenda.id,
            produto_id: it.produto_id && !it.produto_id.startsWith('prod-') && !it.produto_id.startsWith('temp-') ? it.produto_id : null,
            setor: it.setor || 'padaria',
            quantidade: Number(it.quantidade) || 1,
            preco_unitario: Number(it.preco_unitario) || 0,
            notas_personalizacao: isRecusado
              ? `[RECUSADO] ${notaLimpa}`.trim()
              : notaLimpa || null,
            estado_producao: isRecusado ? 'pendente' : it.estado_producao || 'pendente',
          };
        });
        const { error: itensError } = await supabase.from('itens_encomenda').insert(itensPayload);
        if (itensError) {
          console.warn('Aviso ao sincronizar itens da encomenda:', itensError);
        }
      }
    }

    return true;
  } catch (err) {
    console.error('Erro na atualização da encomenda:', err);
    return false;
  }
}

// ---------------- CLIENTES ---------------- //

const CREDENCIAIS_CLIENTES_KEY = 'padaria_credenciais_clientes_v1';

export function lerCredenciaisClientesLocal(): Record<string, { password?: string; email?: string }> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CREDENCIAIS_CLIENTES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function guardarCredencialClienteLocal(telefone: string, email?: string, password?: string) {
  if (typeof window === 'undefined') return;
  try {
    const telLimpo = (telefone || '').replace(/\D/g, '');
    if (!telLimpo) return;
    const atual = lerCredenciaisClientesLocal();
    atual[telLimpo] = {
      email: email?.trim() || atual[telLimpo]?.email,
      password: password || atual[telLimpo]?.password,
    };
    localStorage.setItem(CREDENCIAIS_CLIENTES_KEY, JSON.stringify(atual));
  } catch {}
}

function mapearLinhaClienteDb(row: any): Cliente {
  const telLimpo = String(row?.telefone || '').replace(/\D/g, '');
  const localCred = lerCredenciaisClientesLocal()[telLimpo];
  const rawNotas = String(row?.notas_entrega || '');
  const matchPwd = rawNotas.match(/\[AUTH_PWD:([^\]]+)\]/);
  const pwdExtraida = matchPwd ? matchPwd[1] : undefined;
  const notasLimpa = rawNotas.replace(/\[AUTH_PWD:[^\]]+\]\s*/g, '').trim();

  return {
    id: row.id,
    nome: row.nome,
    telefone: row.telefone,
    email: row.email || localCred?.email || undefined,
    password: row.password_cliente || pwdExtraida || localCred?.password || undefined,
    morada: row.morada || undefined,
    codigo_postal: row.codigo_postal || undefined,
    notas_entrega: notasLimpa || undefined,
  };
}

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
  return (data || [])
    .filter((c: any) => !String(c.telefone || '').startsWith('00000000'))
    .map(mapearLinhaClienteDb);
}

/**
 * Converte um nome (de produto, cliente, etc.) para Title Case adequado em Português
 * Exemplo: "PAO SALOIO" -> "Pão Saloio", "FERMENTO DE PADEIRO" -> "Fermento de Padeiro",
 * "MINI BROA C/CHOURISSO" -> "Mini Broa c/ Chourisso", "ANA SOFIA FERREIRA" -> "Ana Sofia Ferreira"
 */
export function formatarNomeEntidade(texto: string): string {
  if (!texto) return '';
  const preposicoes = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'c/', 'com', 'para', 'ao', 'à', 'aos', 'às']);
  
  // Dicionário de substituições e acentuações para produtos de padaria/pastelaria
  const acentuacoes: Record<string, string> = {
    'pao': 'Pão',
    'pão': 'Pão',
    'avo': 'Avó',
    'avó': 'Avó',
    'chourisso': 'Chouriço',
    'chourico': 'Chouriço',
    'aniversario': 'Aniversário',
    'frances': 'Francês',
    'alemao': 'Alemão',
    'japones': 'Japonês',
    'agua': 'Água',
  };

  const partes = texto.trim().split(/\s+/);
  return partes
    .map((palavra, index) => {
      // Casos como "c/chourisso"
      if (palavra.toLowerCase().startsWith('c/')) {
        const resto = palavra.substring(2);
        const restoFormatado = acentuacoes[resto.toLowerCase()] || 
          (resto ? resto.charAt(0).toUpperCase() + resto.slice(1).toLowerCase() : '');
        return 'c/ ' + restoFormatado;
      }

      const lower = palavra.toLowerCase();
      if (index > 0 && preposicoes.has(lower)) {
        return lower;
      }

      if (acentuacoes[lower]) {
        return acentuacoes[lower];
      }

      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

export async function salvarClienteDb(cliente: Partial<Cliente> & { nome: string; telefone: string }) {
  if (cliente.email || cliente.password) {
    guardarCredencialClienteLocal(cliente.telefone, cliente.email, cliente.password);
  }

  if (!supabase) return null;

  const telLimpo = (cliente.telefone || '').replace(/\D/g, '');
  const credLocal = lerCredenciaisClientesLocal()[telLimpo];
  const pwdFinal = cliente.password || credLocal?.password;
  const notasBaseLimpa = (cliente.notas_entrega || '').replace(/\[AUTH_PWD:[^\]]+\]\s*/g, '').trim();
  const notasComPwd = pwdFinal
    ? `${notasBaseLimpa ? `${notasBaseLimpa} ` : ''}[AUTH_PWD:${pwdFinal}]`
    : notasBaseLimpa || null;

  const payload = {
    nome: formatarNomeEntidade(cliente.nome),
    telefone: cliente.telefone.trim(),
    email: cliente.email?.trim() || credLocal?.email || null,
    morada: cliente.morada?.trim() || null,
    codigo_postal: cliente.codigo_postal?.trim() || null,
    notas_entrega: notasComPwd,
  };

  if (cliente.id && !cliente.id.startsWith('cli-')) {
    const { data, error } = await supabase
      .from('clientes')
      .update(payload)
      .eq('id', cliente.id)
      .select()
      .single();
    if (error) {
      console.error('Erro ao atualizar cliente:', error);
      return null;
    }
    return data ? mapearLinhaClienteDb(data) : null;
  } else {
    const { data, error } = await supabase
      .from('clientes')
      .insert(payload)
      .select()
      .single();
    if (error) {
      console.error('Erro ao criar cliente:', error);
      return null;
    }
    return data ? mapearLinhaClienteDb(data) : null;
  }
}

export async function eliminarClienteDb(clienteId: string) {
  if (!supabase) return false;
  const { error } = await supabase.from('clientes').delete().eq('id', clienteId);
  if (error) {
    console.error('Erro ao eliminar cliente:', error);
    return false;
  }
  return true;
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

export async function salvarProdutoDb(produto: Partial<Produto> & { nome: string; categoria: any; unidade?: any; ativo?: boolean }) {
  if (!supabase) return null;
  const payload: any = {
    nome: formatarNomeEntidade(produto.nome),
    categoria: produto.categoria,
    unidade: produto.unidade || 'unidade',
    ativo: produto.ativo !== undefined ? produto.ativo : true,
    preco: 0,
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

export async function eliminarProdutoDb(produtoId: string) {
  if (!supabase) return false;
  const { error } = await supabase.from('produtos').delete().eq('id', produtoId);
  if (error) {
    console.error('Erro ao eliminar produto:', error);
    return false;
  }
  return true;
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

export async function eliminarLojaDb(lojaId: string) {
  if (!supabase) return false;
  const { error } = await supabase.from('lojas').delete().eq('id', lojaId);
  if (error) {
    console.error('Erro ao eliminar loja:', error);
    return false;
  }
  return true;
}

// ---------------- CARRINHAS & ROTAS ---------------- //

const ROTAS_STORAGE_KEY = 'padaria_rotas_carros_v5';

export async function carregarCarrinhasSupabase(): Promise<Carrinha[]> {
  let locaisRotas: Carrinha[] = [...CARRINHAS_MOCK];
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(ROTAS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          locaisRotas = parsed.filter((c: Carrinha) => {
            const num = c.numero || parseInt(String(c.rota || c.identificador || '').replace(/\D+/g, '') || '99', 10);
            return num >= 1 && num <= 7 && c.matricula !== 'AAAAAA' && c.rota !== 'Rota 9' && c.rota !== 'Rota 8' && c.identificador !== 'Rota 8';
          });
        }
      }
    } catch {}
  }

  if (!supabase) {
    return locaisRotas
      .filter((c) => {
        const num = c.numero || parseInt(String(c.rota || c.identificador || '').replace(/\D+/g, '') || '99', 10);
        return num >= 1 && num <= 7 && c.matricula !== 'AAAAAA' && c.rota !== 'Rota 9' && c.rota !== 'Rota 8' && c.identificador !== 'Rota 8';
      })
      .sort((a, b) => (a.numero || 0) - (b.numero || 0));
  }

  try {
    const { data, error } = await supabase
      .from('carrinhas')
      .select('*')
      .order('identificador', { ascending: true });

    if (error || !data || data.length === 0) {
      return locaisRotas
        .filter((c) => {
          const num = c.numero || parseInt(String(c.rota || c.identificador || '').replace(/\D+/g, '') || '99', 10);
          return num >= 1 && num <= 7 && c.matricula !== 'AAAAAA' && c.rota !== 'Rota 9' && c.rota !== 'Rota 8' && c.identificador !== 'Rota 8';
        })
        .sort((a, b) => (a.numero || 0) - (b.numero || 0));
    }

    const merged: Carrinha[] = [...locaisRotas];
    for (const row of data) {
      const idx = merged.findIndex((m) => m.id === row.id);
      if (idx !== -1) {
        merged[idx] = {
          ...merged[idx],
          ...row,
          rota: merged[idx].rota || row.rota || `Rota ${merged[idx].numero || idx + 1}`,
          nome_carro: merged[idx].nome_carro || row.nome_carro || `Carro ${merged[idx].numero || idx + 1}`,
          nome_condutor: merged[idx].nome_condutor || row.nome_condutor || merged[idx].motorista_nome || '',
          matricula: row.matricula || merged[idx].matricula,
        };
      } else {
        merged.push({
          ...row,
          rota: row.rota || `Rota ${merged.length + 1}`,
          nome_carro: row.nome_carro || `Carro ${merged.length + 1}`,
          nome_condutor: row.nome_condutor || '',
          numero: row.numero || merged.length + 1,
        });
      }
    }

    const filtered = merged
      .filter((c) => {
        const num = c.numero || parseInt(String(c.rota || c.identificador || '').replace(/\D+/g, '') || '99', 10);
        return num >= 1 && num <= 7 && c.matricula !== 'AAAAAA' && c.rota !== 'Rota 9' && c.rota !== 'Rota 8' && c.identificador !== 'Rota 8' && c.identificador !== 'Carocha';
      })
      .map((c, i) => {
        const num = c.numero && c.numero >= 1 && c.numero <= 7 ? c.numero : (parseInt(String(c.rota || c.identificador || '').replace(/\D+/g, '') || '0', 10) || i + 1);
        const rotaPadrao = `Rota ${num}`;
        return {
          ...c,
          numero: num,
          rota: rotaPadrao,
          identificador: rotaPadrao,
        };
      })
      .sort((a, b) => (a.numero || 0) - (b.numero || 0));

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(ROTAS_STORAGE_KEY, JSON.stringify(filtered));
      } catch {}
    }

    return filtered;
  } catch {
    return locaisRotas
      .filter((c) => {
        const num = c.numero || parseInt(String(c.rota || c.identificador || '').replace(/\D+/g, '') || '99', 10);
        return num >= 1 && num <= 7 && c.matricula !== 'AAAAAA' && c.rota !== 'Rota 9' && c.rota !== 'Rota 8' && c.identificador !== 'Rota 8';
      })
      .sort((a, b) => (a.numero || 0) - (b.numero || 0));
  }
}

export async function salvarCarrinhaDb(carrinha: Partial<Carrinha> & { identificador: string; matricula: string; loja_id?: string }) {
  if (typeof window !== 'undefined') {
    try {
      const atuais = await carregarCarrinhasSupabase();
      const idx = atuais.findIndex((c) => c.id === carrinha.id);
      let novaLista: Carrinha[];
      if (idx >= 0) {
        novaLista = atuais.map((c) => (c.id === carrinha.id ? ({ ...c, ...carrinha } as Carrinha) : c));
      } else {
        novaLista = [...atuais, { ...carrinha, id: carrinha.id || `car-${Date.now()}` } as Carrinha];
      }
      novaLista = novaLista
        .filter((c) => {
          const num = c.numero || parseInt(String(c.rota || c.identificador || '').replace(/\D+/g, '') || '99', 10);
          return num >= 1 && num <= 7 && c.matricula !== 'AAAAAA' && c.rota !== 'Rota 9' && c.rota !== 'Rota 8' && c.identificador !== 'Rota 8';
        })
        .sort((a, b) => (a.numero || 0) - (b.numero || 0));
      localStorage.setItem(ROTAS_STORAGE_KEY, JSON.stringify(novaLista));
    } catch {}
  }

  if (!supabase) return carrinha;
  const payload: any = {
    loja_id: carrinha.loja_id || 'a9982e9f-7899-4a7c-8ce3-bc30f16c99a2',
    identificador: (carrinha.identificador || carrinha.rota || '').trim(),
    matricula: carrinha.matricula.trim(),
    ativo: carrinha.ativo !== undefined ? carrinha.ativo : true,
  };

  if (carrinha.id) {
    const { data, error } = await supabase
      .from('carrinhas')
      .update(payload)
      .eq('id', carrinha.id)
      .select()
      .maybeSingle();
    if (error) console.warn('Erro ao atualizar carrinha:', error);
    return data || carrinha;
  } else {
    const { data, error } = await supabase
      .from('carrinhas')
      .insert(payload)
      .select()
      .maybeSingle();
    if (error) console.warn('Erro ao criar carrinha:', error);
    return data || carrinha;
  }
}

export async function eliminarCarrinhaDb(carrinhaId: string) {
  if (!supabase) return false;
  const { error } = await supabase.from('carrinhas').delete().eq('id', carrinhaId);
  if (error) {
    console.error('Erro ao eliminar carrinha:', error);
    return false;
  }
  return true;
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

// ---------------- LOGS DE AUDITORIA & HISTÓRICO DE UTILIZADORES ---------------- //

const AUDIT_LOGS_STORAGE_KEY = 'app_logs_auditoria';
const AUDIT_LOGS_PHONE_KEY = '000000001';

export async function carregarLogsAuditoriaSupabase(): Promise<LogAuditoria[]> {
  const agora = new Date();
  const seteDiasAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
  const seteDiasAtrasStr = seteDiasAtras.toISOString().split('T')[0];
  const seteDiasAtrasISO = seteDiasAtras.toISOString();

  let todosLogs: LogAuditoria[] = [];

  // 1. Tentar ler da base de dados central (tabela dedicada ou registo compartilhado multi-utilizador)
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('logs_auditoria')
        .select('*')
        .gte('criado_em', seteDiasAtrasISO)
        .order('criado_em', { ascending: false });

      if (!error && data && data.length > 0) {
        todosLogs = data as LogAuditoria[];
      }
    } catch {}

    if (todosLogs.length === 0) {
      try {
        const { data } = await supabase
          .from('clientes')
          .select('notas_entrega')
          .eq('telefone', AUDIT_LOGS_PHONE_KEY)
          .maybeSingle();

        if (data && data.notas_entrega) {
          const parsed = JSON.parse(data.notas_entrega);
          if (Array.isArray(parsed) && parsed.length > 0) {
            todosLogs = parsed;
          }
        }
      } catch (err) {
        console.warn('Erro ao ler logs centrais:', err);
      }
    }
  }

  // 2. Mesclar com cache local para não perder logs efetuados offline
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          todosLogs = [...todosLogs, ...parsed];
        }
      } catch {}
    }
  }

  // 3. Fallback estruturado se a base de dados for inicializada pela primeira vez
  if (todosLogs.length === 0 && LOGS_AUDITORIA_MOCK && LOGS_AUDITORIA_MOCK.length > 0) {
    todosLogs = [...LOGS_AUDITORIA_MOCK];
  }

  // 4. Deduplicar por ID e filtrar estritamente pelos últimos 7 dias para rastreabilidade de utilização
  const idsVistos = new Set<string>();
  const logsUltimaSemana = todosLogs.filter((log) => {
    if (!log || !log.id || idsVistos.has(log.id)) return false;
    idsVistos.add(log.id);

    const logData = log.data || (log.criado_em ? log.criado_em.split('T')[0] : '');
    const logIso = log.criado_em || (logData ? `${logData}T${log.hora || '00:00'}:00` : '');
    return logData >= seteDiasAtrasStr || logIso >= seteDiasAtrasISO;
  }).sort((a, b) => {
    const dtA = a.criado_em || `${a.data} ${a.hora}`;
    const dtB = b.criado_em || `${b.data} ${b.hora}`;
    return dtB.localeCompare(dtA);
  });

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(logsUltimaSemana));
    } catch {}
  }

  return logsUltimaSemana;
}

export async function registarLogAuditoria(
  dados: Omit<LogAuditoria, 'id' | 'criado_em'> & { id?: string; criado_em?: string }
): Promise<LogAuditoria> {
  const agora = new Date();
  const dataHoje = dados.data || agora.toISOString().split('T')[0];
  const horaAgora = dados.hora || agora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const novoLog: LogAuditoria = {
    id: dados.id || `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    encomenda_id: dados.encomenda_id,
    codigo_encomenda: dados.codigo_encomenda,
    cliente_nome: dados.cliente_nome,
    utilizador_id: dados.utilizador_id,
    utilizador_nome: dados.utilizador_nome,
    utilizador_role: dados.utilizador_role,
    loja_id: dados.loja_id,
    loja_nome: dados.loja_nome,
    painel: dados.painel,
    acao: dados.acao,
    detalhes: dados.detalhes,
    data: dataHoje,
    hora: horaAgora,
    criado_em: dados.criado_em || agora.toISOString(),
  };

  // 1. Gravar na Base de Dados Central para visibilidade multi-utilizador
  if (supabase) {
    try {
      await supabase.from('logs_auditoria').insert([novoLog]);
    } catch {}

    try {
      const { data: existente } = await supabase
        .from('clientes')
        .select('id, notas_entrega')
        .eq('telefone', AUDIT_LOGS_PHONE_KEY)
        .maybeSingle();

      let listaRemota: LogAuditoria[] = [];
      if (existente && existente.notas_entrega) {
        try {
          const parsed = JSON.parse(existente.notas_entrega);
          if (Array.isArray(parsed)) listaRemota = parsed;
        } catch {}
      }

      listaRemota = [novoLog, ...listaRemota.filter((l) => l.id !== novoLog.id)].slice(0, 800);
      const jsonStr = JSON.stringify(listaRemota);

      if (existente) {
        await supabase
          .from('clientes')
          .update({
            nome: '[SISTEMA_LOGS_AUDITORIA]',
            notas_entrega: jsonStr,
          })
          .eq('id', existente.id);
      } else {
        await supabase
          .from('clientes')
          .insert({
            nome: '[SISTEMA_LOGS_AUDITORIA]',
            telefone: AUDIT_LOGS_PHONE_KEY,
            notas_entrega: jsonStr,
          });
      }
    } catch (err) {
      console.warn('Erro ao sincronizar log central no servidor:', err);
    }
  }

  // 2. Gravar em localStorage
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
      let logsAtuais: LogAuditoria[] = [];
      if (cached) {
        logsAtuais = JSON.parse(cached);
      } else {
        logsAtuais = [...LOGS_AUDITORIA_MOCK];
      }
      logsAtuais.unshift(novoLog);
      localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(logsAtuais.slice(0, 500)));
    } catch (e) {
      console.error('Erro ao gravar log no localStorage:', e);
    }
  }

  return novoLog;
}

export async function reiniciarLogsAuditoriaParaMock(): Promise<LogAuditoria[]> {
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(LOGS_AUDITORIA_MOCK));
  }
  return LOGS_AUDITORIA_MOCK;
}

// ---------------- BASE FIXA CARRINHAS 1-4 E CLIENTES EMPRESARIAIS B2B (CARRINHA 5) ---------------- //

const BASE_FIXA_CARRINHAS_STORAGE_KEY = 'padaria_base_fixa_carrinhas_v3';
const CLIENTES_B2B_STORAGE_KEY = 'padaria_clientes_empresariais_b2b_v3';

const MAPA_CARRINHA_IDS_LEGADOS: Record<string, { id: string; nome: string }> = {
  'e908db95-c427-4ed5-83fc-01403bd24cf1': { id: '1eaaa9bd-e3de-4b06-9c80-d1e464bcdc75', nome: 'Carrinha 1' },
  'a712db95-c427-4ed5-83fc-01403bd24cf2': { id: '5ebae97d-593f-4f54-81c5-b200dd04258b', nome: 'Carrinha 2' },
  'b823db95-c427-4ed5-83fc-01403bd24cf3': { id: 'e062fea7-97da-4b2a-8607-da6a9ea8e668', nome: 'Carrinha 3' },
  'c934db95-c427-4ed5-83fc-01403bd24cf4': { id: 'a282db95-c427-4ed5-83fc-01403bd24cfc', nome: 'Carrinha 4' },
  '1eaaa9bd-e3de-4b06-9c80-d1e464bcdc75': { id: '1eaaa9bd-e3de-4b06-9c80-d1e464bcdc75', nome: 'Carrinha 1' },
  '5ebae97d-593f-4f54-81c5-b200dd04258b': { id: '5ebae97d-593f-4f54-81c5-b200dd04258b', nome: 'Carrinha 2' },
  'e062fea7-97da-4b2a-8607-da6a9ea8e668': { id: 'e062fea7-97da-4b2a-8607-da6a9ea8e668', nome: 'Carrinha 3' },
  'a282db95-c427-4ed5-83fc-01403bd24cfc': { id: 'a282db95-c427-4ed5-83fc-01403bd24cfc', nome: 'Carrinha 4' },
};

export function normalizarBaseFixaItem(b: any): BaseFixaCarrinha {
  const infoId = MAPA_CARRINHA_IDS_LEGADOS[b?.carrinha_id] || {
    id: b?.carrinha_id || '1eaaa9bd-e3de-4b06-9c80-d1e464bcdc75',
    nome: b?.carrinha_nome || 'Carrinha 1',
  };
  const nomeLimpo = String(b?.carrinha_nome || infoId.nome).replace(/1º Carro/i, 'Carrinha 1')
    .replace(/2º Carro/i, 'Carrinha 2')
    .replace(/3º Carro/i, 'Carrinha 3')
    .replace(/4º Carro/i, 'Carrinha 4')
    .replace(/5º Carro/i, 'Carrinha 5');

  const mapaQtds: Record<string, number> = {
    ...(b?.quantidades_por_produto || b?.quantidades || b?.quantidadesPorProduto || {}),
  };

  const todosDias: DiaSemana[] = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
  const origemSemana = b?.quantidades_semanais || {};
  const semanaNormalizada: Record<DiaSemana, Record<string, number>> = {
    seg: { ...(origemSemana.seg || mapaQtds) },
    ter: { ...(origemSemana.ter || mapaQtds) },
    qua: { ...(origemSemana.qua || mapaQtds) },
    qui: { ...(origemSemana.qui || mapaQtds) },
    sex: { ...(origemSemana.sex || mapaQtds) },
    sab: { ...(origemSemana.sab || mapaQtds) },
    dom: { ...(origemSemana.dom || mapaQtds) },
  };
  todosDias.forEach((d) => {
    if (!semanaNormalizada[d] || typeof semanaNormalizada[d] !== 'object') {
      semanaNormalizada[d] = { ...mapaQtds };
    }
  });

  return {
    carrinha_id: infoId.id,
    carrinha_nome: nomeLimpo,
    quantidades_por_produto: mapaQtds,
    quantidades: mapaQtds,
    quantidades_semanais: semanaNormalizada,
  };
}

export function normalizarClienteB2BItem(c: any): ClienteEmpresarialB2B {
  const todosDias: DiaSemana[] = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
  const origemSemana = c?.quantidades_semanais || c?.quantidades_semana || {};
  const semanaNormalizada: Record<DiaSemana, Record<string, number>> = {
    seg: { ...(origemSemana.seg || {}) },
    ter: { ...(origemSemana.ter || {}) },
    qua: { ...(origemSemana.qua || {}) },
    qui: { ...(origemSemana.qui || {}) },
    sex: { ...(origemSemana.sex || {}) },
    sab: { ...(origemSemana.sab || {}) },
    dom: { ...(origemSemana.dom || {}) },
  };
  todosDias.forEach((d) => {
    if (!semanaNormalizada[d] || typeof semanaNormalizada[d] !== 'object') {
      semanaNormalizada[d] = {};
    }
  });

  return {
    id: c?.id || `b2b-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    nome: c?.nome || 'Cliente Empresarial',
    telefone: c?.telefone || '',
    telemovel: c?.telemovel || c?.telefone || '',
    email: c?.email || '',
    nif: c?.nif || '',
    password: c?.password || '',
    morada: c?.morada || 'Arouca',
    carrinha_id: c?.carrinha_id || '1eaaa9bd-e3de-4b06-9c80-d1e464bcdc75',
    ativo: c?.ativo !== undefined ? Boolean(c?.ativo) : true,
    quantidades_semanais: semanaNormalizada,
    quantidades_semana: semanaNormalizada,
  };
}

const ARTIGOS_BASE_FIXA_STORAGE_KEY = 'padaria_artigos_base_fixa_v3';

export function carregarArtigosBaseFixa(): string[] {
  const baseDefault = [...COLUNAS_MAPA_DIARIO_OFICIAL];
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(ARTIGOS_BASE_FIXA_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((s) => String(s).trim()).filter(Boolean);
        }
      } catch (e) {}
    }
    localStorage.setItem(ARTIGOS_BASE_FIXA_STORAGE_KEY, JSON.stringify(baseDefault));
  }
  return baseDefault;
}

export function salvarArtigosBaseFixa(artigos: string[]): void {
  const limpos = Array.from(new Set((artigos || []).map((s) => String(s).trim()).filter(Boolean)));
  if (typeof window !== 'undefined') {
    localStorage.setItem(ARTIGOS_BASE_FIXA_STORAGE_KEY, JSON.stringify(limpos));
    window.dispatchEvent(new Event('app_base_fixa_atualizada'));
  }
}

export function carregarBaseFixaCarrinhas(): BaseFixaCarrinha[] {
  const inicialNormalizado = BASE_FIXA_CARRINHAS_INICIAL.map(normalizarBaseFixaItem);
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(BASE_FIXA_CARRINHAS_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(normalizarBaseFixaItem).filter(b => b.carrinha_nome !== 'Rota 8' && b.carrinha_id !== 'e888db95-c427-4ed5-83fc-01403bd24cf8');
        }
      } catch (e) {}
    }
    localStorage.setItem(BASE_FIXA_CARRINHAS_STORAGE_KEY, JSON.stringify(inicialNormalizado));
  }
  return inicialNormalizado.filter(b => b.carrinha_nome !== 'Rota 8' && b.carrinha_id !== 'e888db95-c427-4ed5-83fc-01403bd24cf8');
}

export function salvarBaseFixaCarrinhas(dados: BaseFixaCarrinha[]): void {
  const normalizados = (dados || []).map(normalizarBaseFixaItem);
  if (typeof window !== 'undefined') {
    localStorage.setItem(BASE_FIXA_CARRINHAS_STORAGE_KEY, JSON.stringify(normalizados));
    window.dispatchEvent(new Event('app_base_fixa_atualizada'));
  }
}

export function carregarClientesEmpresariaisB2B(): ClienteEmpresarialB2B[] {
  const inicialNormalizado = CLIENTES_EMPRESARIAIS_B2B_INICIAIS.map(normalizarClienteB2BItem);
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(CLIENTES_B2B_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(normalizarClienteB2BItem);
        }
      } catch (e) {}
    }
    localStorage.setItem(CLIENTES_B2B_STORAGE_KEY, JSON.stringify(inicialNormalizado));
  }
  return inicialNormalizado;
}

export function salvarClientesEmpresariaisB2B(dados: ClienteEmpresarialB2B[]): void {
  const normalizados = (dados || []).map(normalizarClienteB2BItem);
  if (typeof window !== 'undefined') {
    localStorage.setItem(CLIENTES_B2B_STORAGE_KEY, JSON.stringify(normalizados));
    window.dispatchEvent(new Event('app_b2b_atualizado'));
  }
}

export function obterDiaSemanaDeData(dataStr: string): DiaSemana {
  // dataStr no formato YYYY-MM-DD
  const partes = (dataStr || '').split('-').map(Number);
  const d = partes.length === 3 ? new Date(partes[0], partes[1] - 1, partes[2]) : new Date();
  const day = d.getDay(); // 0 = Dom, 1 = Seg, ..., 6 = Sáb
  const mapa: Record<number, DiaSemana> = {
    0: 'dom',
    1: 'seg',
    2: 'ter',
    3: 'qua',
    4: 'qui',
    5: 'sex',
    6: 'sab',
  };
  return mapa[day] || 'seg';
}




// ---------------- AJUSTES AD-HOC DIÁRIOS (CALENDÁRIO 7 DIAS) ---------------- //

export const AJUSTES_ADHOC_STORAGE_KEY = 'padaria_ajustes_adhoc_rotas_v1';

export function carregarAjustesAdhoc(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(AJUSTES_ADHOC_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.valores || {};
    }
  } catch (e) {
    console.error('Erro ao ler ajustes ad-hoc:', e);
  }
  return {};
}

export function salvarAjusteAdhoc(chave: string, quantidade: number | null): void {
  if (typeof window === 'undefined') return;
  try {
    const todos = carregarAjustesAdhoc();
    if (quantidade === null || isNaN(quantidade)) {
      delete todos[chave];
    } else {
      todos[chave] = Math.max(0, quantidade);
    }
    localStorage.setItem(AJUSTES_ADHOC_STORAGE_KEY, JSON.stringify({
      valores: todos,
      atualizado_em: new Date().toISOString()
    }));
    window.dispatchEvent(new Event('app_ajustes_adhoc_atualizados'));
  } catch (e) {
    console.error('Erro ao salvar ajuste ad-hoc:', e);
  }
}

export function removerAjusteAdhoc(chave: string): void {
  salvarAjusteAdhoc(chave, null);
}

export function getChaveAdhocBase(dataStr: string, carrinhaId: string, produtoNome: string): string {
  return `base_${dataStr}_${carrinhaId}_${produtoNome}`;
}

export function getChaveAdhocB2B(dataStr: string, clienteB2BId: string, produtoNome: string): string {
  return `b2b_${dataStr}_${clienteB2BId}_${produtoNome}`;
}

export function obterQuantidadeEfetivaBaseRota(
  dataStr: string,
  carrinhaId: string,
  produtoNome: string,
  baseFixaSemanal?: Record<string, Record<string, number>>,
  diaSemana: string = 'seg'
): { quantidade: number; isAdhoc: boolean } {
  const ajustes = carregarAjustesAdhoc();
  const chave = getChaveAdhocBase(dataStr, carrinhaId, produtoNome);
  if (ajustes[chave] !== undefined) {
    return { quantidade: Number(ajustes[chave]), isAdhoc: true };
  }
  const baseline = (baseFixaSemanal?.[diaSemana]?.[produtoNome]) ?? 0;
  return { quantidade: Number(baseline), isAdhoc: false };
}

export function obterQuantidadeEfetivaClienteB2B(
  dataStr: string,
  clienteB2BId: string,
  produtoNome: string,
  quantidadesSemana?: Record<string, Record<string, number>>,
  diaSemana: string = 'seg'
): { quantidade: number; isAdhoc: boolean } {
  const ajustes = carregarAjustesAdhoc();
  const chave = getChaveAdhocB2B(dataStr, clienteB2BId, produtoNome);
  if (ajustes[chave] !== undefined) {
    return { quantidade: Number(ajustes[chave]), isAdhoc: true };
  }
  const baseline = (quantidadesSemana?.[diaSemana]?.[produtoNome]) ?? 0;
  return { quantidade: Number(baseline), isAdhoc: false };
}
