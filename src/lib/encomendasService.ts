import { supabase } from './supabase';
import type { Encomenda, ItemEncomenda, EstadoEncomenda, EstadoProducaoItem, Cliente, Produto, Loja, Carrinha, PerfilUtilizador, LogAuditoria, BaseFixaCarrinha, ClienteEmpresarialB2B, DiaSemana, BaseDiariaRecorrente, Role, PermissoesCargo, MatrizPermissoesCargos, LinhaCargaConjunta, DadosGuiaConjunta, ColunaCabecalhoRota, ColunaRotaGuia, LinhaGuiaConjuntaSecao, ColunaGrelhaProduto, LinhaGrelhaCarga, GrupoRotaGrelha } from '../types';
import { LOJAS_MOCK, LOGS_AUDITORIA_MOCK, CARRINHAS_MOCK, COLUNAS_MAPA_DIARIO_OFICIAL, BASE_FIXA_CARRINHAS_INICIAL, CLIENTES_EMPRESARIAIS_B2B_INICIAIS } from './mockData';

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
    tipo_cliente: row.tipo_cliente || 'particular',
    pin_hash: row.pin_hash || undefined,
    nif: row.nif || undefined,
    carrinha_id: row.carrinha_id || undefined,
    ativo: row.ativo !== undefined ? row.ativo : true,
    criado_em: row.criado_em || undefined,
    atualizado_em: row.atualizado_em || undefined,
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

  const payload: any = {
    nome: formatarNomeEntidade(cliente.nome),
    telefone: cliente.telefone.trim(),
    email: cliente.email ? cliente.email.toLowerCase().trim() : (credLocal?.email ? credLocal.email.toLowerCase().trim() : null),
    morada: cliente.morada?.trim() || null,
    codigo_postal: cliente.codigo_postal?.trim() || null,
    notas_entrega: notasComPwd,
    tipo_cliente: cliente.tipo_cliente || 'particular',
    nif: cliente.nif?.trim() || null,
    carrinha_id: cliente.carrinha_id || null,
    ativo: cliente.ativo !== undefined ? cliente.ativo : true,
    atualizado_em: new Date().toISOString(),
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


/**
 * Envia e-mail de recuperação / redefinição de password através do Supabase Auth
 * para qualquer cliente particular ou empresarial que tenha e-mail associado
 */
export async function enviarEmailRecuperacaoPassword(email: string): Promise<{ success: boolean; message: string }> {
  const emailLimpo = (email || '').trim().toLowerCase();
  if (!emailLimpo || !emailLimpo.includes('@')) {
    return { success: false, message: 'Por favor, indique um endereço de e-mail válido.' };
  }
  if (!supabase) {
    return { success: false, message: 'Ligação à base de dados indisponível no momento.' };
  }
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.padariadavila.com';
    const { error } = await supabase.auth.resetPasswordForEmail(emailLimpo, {
      redirectTo: `${origin}/encomendar?recuperar=1&email=${encodeURIComponent(emailLimpo)}`
    });
    if (error) {
      console.warn('Aviso Supabase ao enviar redefinição de password:', error);
      return { success: false, message: error.message || 'Erro ao enviar e-mail de redefinição.' };
    }
    return { success: true, message: `E-mail de recuperação enviado com sucesso para ${emailLimpo}.` };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Falha de comunicação com o servidor de autenticação.' };
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
  if (!supabase) return [...LOJAS_MOCK];
  try {
    const { data, error } = await supabase
      .from('lojas')
      .select('*')
      .order('codigo', { ascending: true });

    if (!error && data && data.length > 0) {
      const temFabrico = data.some((l) => l.codigo === 'FABRICO' || l.nome.toLowerCase().includes('fabrico'));
      if (!temFabrico) {
        const lojaFabrico = LOJAS_MOCK.find((l) => l.codigo === 'FABRICO') || {
          id: 'fabbbb00-0000-0000-0000-000000000001',
          codigo: 'FABRICO',
          nome: 'Centro de Fabrico',
          morada: 'Zona Operacional / Fabrico, Arouca',
          telefone: '210000000',
          nif: '500100200',
          ativo: true,
        };
        await salvarLojaDb(lojaFabrico);
        return [...data, lojaFabrico];
      }
      return data;
    }
  } catch (err) {
    console.warn('Erro ao carregar lojas do Supabase:', err);
  }
  return [...LOJAS_MOCK];
}

// Helper para criar canais Realtime com nomes únicos e isolados
function criarCanalRealtime(prefixo: string) {
  if (!supabase) return null;
  const uniqueId = `rt_${prefixo}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return supabase.channel(uniqueId);
}

export function subscreverAlteracoesLojas(onUpdate: (lojas: Loja[]) => void) {
  if (!supabase) return () => {};
  try {
    const channel = criarCanalRealtime('lojas');
    if (!channel) return () => {};
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lojas' }, async () => {
        try {
          const atualizados = await carregarLojasSupabase();
          onUpdate(atualizados);
        } catch {}
      })
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  } catch (err) {
    console.warn('Aviso ao subscrever lojas realtime:', err);
    return () => {};
  }
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
          locaisRotas = parsed;
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

    if (!error && data && data.length > 0) {
      // Prioridade absoluta para a base central Supabase (Network-First)
      const mapped: Carrinha[] = data.map((row) => {
        const numInferido = row.numero || parseInt(String(row.rota || row.identificador || '').replace(/\D+/g, '') || '0', 10);
        const localMatch = locaisRotas.find((m) => m.id === row.id || (m.numero && m.numero === numInferido) || (m.identificador && m.identificador === row.identificador)) || {};
        const num = numInferido || localMatch.numero || 1;
        const condutorFinal = (row.nome_condutor && row.nome_condutor.trim()) || (row.motorista_nome && row.motorista_nome.trim()) || (localMatch.nome_condutor && localMatch.nome_condutor.trim()) || '';
        return {
          id: row.id,
          loja_id: row.loja_id || 'a9982e9f-7899-4a7c-8ce3-bc30f16c99a2',
          identificador: row.identificador || `Rota ${num}`,
          matricula: row.matricula || localMatch.matricula || '---',
          ativo: row.ativo !== false,
          criado_em: row.criado_em,
          rota: row.rota || `Rota ${num}`,
          nome_carro: row.nome_carro || localMatch.nome_carro || `Carro ${num}`,
          nome_condutor: condutorFinal,
          numero: num,
        };
      });

      const filtered = mapped
        .filter((c) => {
          const num = c.numero || parseInt(String(c.rota || c.identificador || '').replace(/\D+/g, '') || '99', 10);
          return num >= 1 && num <= 7 && c.matricula !== 'AAAAAA' && c.rota !== 'Rota 9' && c.rota !== 'Rota 8' && c.identificador !== 'Rota 8' && c.identificador !== 'Carocha';
        })
        .sort((a, b) => (a.numero || 0) - (b.numero || 0));

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(ROTAS_STORAGE_KEY, JSON.stringify(filtered));
        } catch {}
      }

      return filtered;
    }
  } catch (err) {
    console.warn('Erro ao carregar carrinhas do Supabase, a usar cache local:', err);
  }

  return locaisRotas
    .filter((c) => {
      const num = c.numero || parseInt(String(c.rota || c.identificador || '').replace(/\D+/g, '') || '99', 10);
      return num >= 1 && num <= 7 && c.matricula !== 'AAAAAA' && c.rota !== 'Rota 9' && c.rota !== 'Rota 8' && c.identificador !== 'Rota 8';
    })
    .sort((a, b) => (a.numero || 0) - (b.numero || 0));
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
      window.dispatchEvent(new Event('app_rotas_atualizadas'));
    } catch {}
  }

  if (!supabase) return carrinha;
  const payload: any = {
    loja_id: carrinha.loja_id || 'a9982e9f-7899-4a7c-8ce3-bc30f16c99a2',
    identificador: (carrinha.identificador || carrinha.rota || '').trim(),
    matricula: carrinha.matricula.trim(),
    ativo: carrinha.ativo !== undefined ? carrinha.ativo : true,
    nome_condutor: carrinha.nome_condutor ? carrinha.nome_condutor.trim() : null,
    nome_carro: carrinha.nome_carro ? carrinha.nome_carro.trim() : null,
    numero: carrinha.numero || null,
    rota: (carrinha.rota || carrinha.identificador || '').trim(),
    atualizado_em: new Date().toISOString(),
  };

  if (carrinha.id) {
    const { data, error } = await supabase
      .from('carrinhas')
      .update(payload)
      .eq('id', carrinha.id)
      .select()
      .maybeSingle();
    if (error) {
      console.warn('Erro ao atualizar carrinha com colunas estendidas, a tentar colunas base:', error.message);
      const basePayload: any = {
        loja_id: payload.loja_id,
        identificador: payload.identificador,
        matricula: payload.matricula,
        ativo: payload.ativo,
      };
      await supabase.from('carrinhas').update(basePayload).eq('id', carrinha.id);
    }
    return data || carrinha;
  } else {
    const { data, error } = await supabase
      .from('carrinhas')
      .insert(payload)
      .select()
      .maybeSingle();
    if (error) {
      console.warn('Erro ao criar carrinha no Supabase:', error);
      const basePayload: any = {
        loja_id: payload.loja_id,
        identificador: payload.identificador,
        matricula: payload.matricula,
        ativo: payload.ativo,
      };
      await supabase.from('carrinhas').insert(basePayload);
    }
    return data || carrinha;
  }
}

export function subscreverAlteracoesCarrinhas(onUpdate: (lista: Carrinha[]) => void) {
  if (!supabase) return () => {};
  try {
    const channel = criarCanalRealtime('carrinhas');
    if (!channel) return () => {};
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'carrinhas' }, async () => {
        try {
          const atualizados = await carregarCarrinhasSupabase();
          onUpdate(atualizados);
        } catch {}
      })
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  } catch (err) {
    console.warn('Aviso ao subscrever carrinhas realtime:', err);
    return () => {};
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

export const MATRIZ_PERMISSOES_CARGOS_PADRAO: Record<Role, PermissoesCargo> = {
  admin: {
    acesso_encomendas: 'edicao',
    acesso_loja: 'edicao',
    acesso_producao: 'edicao',
    acesso_entregas: 'edicao',
    acesso_gestao: 'edicao',
  },
  gerente_loja: {
    acesso_encomendas: 'edicao',
    acesso_loja: 'edicao',
    acesso_producao: 'leitura',
    acesso_entregas: 'leitura',
    acesso_gestao: 'leitura',
  },
  atendente: {
    acesso_encomendas: 'edicao',
    acesso_loja: 'edicao',
    acesso_producao: 'sem_acesso',
    acesso_entregas: 'sem_acesso',
    acesso_gestao: 'sem_acesso',
  },
  padeiro_pasteleiro: {
    acesso_encomendas: 'sem_acesso',
    acesso_loja: 'sem_acesso',
    acesso_producao: 'edicao',
    acesso_entregas: 'sem_acesso',
    acesso_gestao: 'sem_acesso',
  },
  operador_padaria: {
    acesso_encomendas: 'sem_acesso',
    acesso_loja: 'sem_acesso',
    acesso_producao: 'edicao',
    acesso_entregas: 'sem_acesso',
    acesso_gestao: 'sem_acesso',
  },
  operador_pastelaria: {
    acesso_encomendas: 'sem_acesso',
    acesso_loja: 'sem_acesso',
    acesso_producao: 'edicao',
    acesso_entregas: 'sem_acesso',
    acesso_gestao: 'sem_acesso',
  },
  motorista: {
    acesso_encomendas: 'sem_acesso',
    acesso_loja: 'sem_acesso',
    acesso_producao: 'sem_acesso',
    acesso_entregas: 'edicao',
    acesso_gestao: 'sem_acesso',
  },
};

export const MATRIZ_CARGOS_STORAGE_KEY = 'padaria_matriz_permissoes_cargos_v1';
export const CONFIG_MATRIZ_PHONE_KEY = '000000002';

export function carregarMatrizPermissoesCargos(): Record<Role, PermissoesCargo> {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(MATRIZ_CARGOS_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return {
            ...MATRIZ_PERMISSOES_CARGOS_PADRAO,
            ...parsed,
          };
        }
      } catch (e) {}
    }
  }
  return { ...MATRIZ_PERMISSOES_CARGOS_PADRAO };
}

export async function carregarMatrizPermissoesCargosSupabase(): Promise<Record<Role, PermissoesCargo>> {
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(MATRIZ_CARGOS_STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          return { ...MATRIZ_PERMISSOES_CARGOS_PADRAO, ...parsed };
        }
      } catch (e) {}
    }
  }

  if (!supabase) return { ...MATRIZ_PERMISSOES_CARGOS_PADRAO };

  try {
    const { data } = await supabase
      .from('clientes')
      .select('notas_entrega')
      .eq('telefone', CONFIG_MATRIZ_PHONE_KEY)
      .maybeSingle();

    if (data && data.notas_entrega) {
      const parsed = JSON.parse(data.notas_entrega);
      if (parsed && typeof parsed === 'object') {
        const fullMatriz = { ...MATRIZ_PERMISSOES_CARGOS_PADRAO, ...parsed };
        if (typeof window !== 'undefined') {
          localStorage.setItem(MATRIZ_CARGOS_STORAGE_KEY, JSON.stringify(fullMatriz));
        }
        return fullMatriz;
      }
    }
  } catch (err) {
    console.warn('Usando matriz de permissões predefinida:', err);
  }

  return { ...MATRIZ_PERMISSOES_CARGOS_PADRAO };
}

export function obterPermissoesCargo(role: Role): PermissoesCargo {
  const matriz = carregarMatrizPermissoesCargos();
  return matriz[role] || MATRIZ_PERMISSOES_CARGOS_PADRAO[role] || MATRIZ_PERMISSOES_CARGOS_PADRAO.atendente;
}

export async function salvarMatrizPermissoesCargos(
  novaMatriz: Record<Role, PermissoesCargo>
): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.setItem(MATRIZ_CARGOS_STORAGE_KEY, JSON.stringify(novaMatriz));
    window.dispatchEvent(new Event('app_matriz_cargos_atualizada'));
  }

  // Atualizar todos os perfis de utilizadores para refletirem a nova matriz do seu cargo
  const perfisAtuais = await carregarPerfisAcessoSupabase();
  const perfisAtualizados = perfisAtuais.map((p) => {
    const perm = novaMatriz[p.role] || MATRIZ_PERMISSOES_CARGOS_PADRAO[p.role];
    if (perm) {
      return {
        ...p,
        ...perm,
        painel_encomendas: perm.acesso_encomendas !== 'sem_acesso',
        painel_loja: perm.acesso_loja !== 'sem_acesso',
        painel_producao: perm.acesso_producao !== 'sem_acesso',
        painel_entregas: perm.acesso_entregas !== 'sem_acesso',
        painel_gestao: perm.acesso_gestao !== 'sem_acesso',
        atualizado_em: new Date().toISOString(),
      };
    }
    return p;
  });

  await salvarTodosPerfisSupabase(perfisAtualizados);

  if (!supabase) return;
  try {
    const jsonStr = JSON.stringify(novaMatriz);
    const { data: existente } = await supabase
      .from('clientes')
      .select('id')
      .eq('telefone', CONFIG_MATRIZ_PHONE_KEY)
      .maybeSingle();

    if (existente) {
      await supabase
        .from('clientes')
        .update({
          nome: '[SISTEMA_MATRIZ_PERMISSOES_CARGOS]',
          notas_entrega: jsonStr,
        })
        .eq('id', existente.id);
    } else {
      await supabase
        .from('clientes')
        .insert({
          nome: '[SISTEMA_MATRIZ_PERMISSOES_CARGOS]',
          telefone: CONFIG_MATRIZ_PHONE_KEY,
          notas_entrega: jsonStr,
        });
    }
  } catch (err) {
    console.error('Erro ao sincronizar matriz de permissões no Supabase:', err);
  }
}

export function normalizarPerfil(p: any): PerfilUtilizador {
  let role: Role = p.role || 'atendente';
  if (role === 'operador_padaria' || role === 'operador_pastelaria') {
    role = 'padeiro_pasteleiro';
  }
  const permPadrao = obterPermissoesCargo(role);

  // Normalizar IDs legados de loja para UUIDs canónicos
  let lojaId = p.loja_id;
  if (lojaId === 'loja-1') lojaId = 'a9982e9f-7899-4a7c-8ce3-bc30f16c99a2';
  else if (lojaId === 'loja-2') lojaId = '778dae33-00ea-4ae7-8e36-e1f5fb067dab';
  else if (lojaId === 'loja-3') lojaId = '4d475863-af72-4349-bd4a-66eb7a90304b';

  // As permissões aos 5 cockpits são estritamente governadas pela Matriz de Cargos (RBAC)
  const acessoEnc = permPadrao.acesso_encomendas;
  const acessoLoja = permPadrao.acesso_loja;
  const acessoProd = permPadrao.acesso_producao;
  const acessoEnt = permPadrao.acesso_entregas;
  const acessoGest = permPadrao.acesso_gestao;

  return {
    id: p.id || `user-${Date.now()}`,
    nome: p.nome || 'Colaborador',
    telefone: p.telefone || '',
    email: p.email || '',
    password: p.password || (role === 'admin' ? 'admin' : '123'),
    role,
    loja_id: lojaId,
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
    nome: 'Luís Silva',
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
    id: 'user-carocha',
    nome: 'Carocha',
    telefone: '910 000 003',
    email: 'carocha@padaria.pt',
    password: '123',
    role: 'atendente',
    loja_id: 'cb8972e2-9011-4f81-a90a-be45612f00c3',
    loja_nome: 'Padaria da Vila III - Carocha',
    acesso_encomendas: 'edicao',
    acesso_producao: 'sem_acesso',
    acesso_loja: 'edicao',
    acesso_entregas: 'sem_acesso',
    acesso_gestao: 'sem_acesso',
    painel_encomendas: true,
    painel_producao: false,
    painel_loja: true,
    painel_entregas: false,
    painel_gestao: false,
    ativo: true,
  },
  {
    id: 'user-praca',
    nome: 'Praça',
    telefone: '910 000 002',
    email: 'praca@padaria.pt',
    password: '123',
    role: 'atendente',
    loja_id: 'a9982e9f-7899-4a7c-8ce3-bc30f16c99a2',
    loja_nome: 'Padaria da Vila I - Praça',
    acesso_encomendas: 'edicao',
    acesso_producao: 'sem_acesso',
    acesso_loja: 'edicao',
    acesso_entregas: 'sem_acesso',
    acesso_gestao: 'sem_acesso',
    painel_encomendas: true,
    painel_producao: false,
    painel_loja: true,
    painel_entregas: false,
    painel_gestao: false,
    ativo: true,
  },
  {
    id: 'user-liceu',
    nome: 'Liceu',
    telefone: '910 000 004',
    email: 'liceu@padaria.pt',
    password: '123',
    role: 'atendente',
    loja_id: 'b11234ef-5678-90ab-cdef-1234567890ab',
    loja_nome: 'Padaria da Vila II - Liceu',
    acesso_encomendas: 'edicao',
    acesso_producao: 'sem_acesso',
    acesso_loja: 'edicao',
    acesso_entregas: 'sem_acesso',
    acesso_gestao: 'sem_acesso',
    painel_encomendas: true,
    painel_producao: false,
    painel_loja: true,
    painel_entregas: false,
    painel_gestao: false,
    ativo: true,
  },
  {
    id: 'user-fabrico',
    nome: 'Fabrico',
    telefone: '910 000 005',
    email: 'fabrico@padaria.pt',
    password: '123',
    role: 'padeiro_pasteleiro',
    loja_id: 'fabbbb00-0000-0000-0000-000000000001',
    loja_nome: 'Centro de Fabrico',
    acesso_encomendas: 'sem_acesso',
    acesso_producao: 'edicao',
    acesso_loja: 'sem_acesso',
    acesso_entregas: 'sem_acesso',
    acesso_gestao: 'sem_acesso',
    painel_encomendas: false,
    painel_producao: true,
    painel_loja: false,
    painel_entregas: false,
    painel_gestao: false,
    ativo: true,
  },
];

const CONFIG_PHONE_KEY = '000000000';

export async function carregarPerfisAcessoSupabase(): Promise<PerfilUtilizador[]> {
  // 1. Tentar carregar sempre de Supabase primeiro para sincronização cross-device em tempo real
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('notas_entrega')
        .eq('telefone', CONFIG_PHONE_KEY)
        .maybeSingle();

      if (!error && data && data.notas_entrega) {
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
      console.warn('Erro ao carregar perfis do Supabase, tentando cache local:', err);
    }
  }

  // 2. Fallback para cache local apenas se offline ou erro
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

  return PERFIS_INICIAIS.map(normalizarPerfil);
}

export async function salvarTodosPerfisSupabase(perfis: PerfilUtilizador[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('app_perfis_utilizadores', JSON.stringify(perfis));
    window.dispatchEvent(new Event('app_perfis_atualizados'));
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
  const normalizado = normalizarPerfil(perfil);
  const listaAtual = await carregarPerfisAcessoSupabase();
  let novaLista: PerfilUtilizador[] = [];

  const idx = listaAtual.findIndex((p) => p.id === normalizado.id);
  if (idx >= 0) {
    novaLista = listaAtual.map((p) => (p.id === normalizado.id ? { ...normalizado, atualizado_em: new Date().toISOString() } : p));
  } else {
    novaLista = [...listaAtual, { ...normalizado, id: normalizado.id || `user-${Date.now()}`, atualizado_em: new Date().toISOString() }];
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

export const BASE_FIXA_CARRINHAS_STORAGE_KEY = 'padaria_base_fixa_carrinhas_v4';
export const CLIENTES_B2B_STORAGE_KEY = 'padaria_clientes_empresariais_b2b_v4';
export const ARTIGOS_BASE_FIXA_STORAGE_KEY = 'padaria_artigos_base_fixa_v4';

/**
 * Retorna o nome limpo do artigo diretamente (sem transformações legadas).
 */
export function normalizarNomeArtigoCanonico(nome: string): string {
  return (nome || '').trim();
}

/**
 * Normaliza um mapa de quantidades por produto, higienizando os nomes.
 */
export function normalizarMapaQuantidades(mapa?: Record<string, number>): Record<string, number> {
  if (!mapa || typeof mapa !== 'object') return {};
  const res: Record<string, number> = {};
  for (const [k, v] of Object.entries(mapa)) {
    const nomeNorm = (k || '').trim();
    if (!nomeNorm) continue;
    const qtd = Number(v) || 0;
    if (qtd > 0) {
      res[nomeNorm] = (res[nomeNorm] || 0) + qtd;
    }
  }
  return res;
}

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

  const mapaQtds = normalizarMapaQuantidades(
    b?.quantidades_por_produto || b?.quantidades || b?.quantidadesPorProduto
  );

  const todosDias: DiaSemana[] = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
  const origemSemana = b?.quantidades_semanais || {};
  const temSemanaDefinida = Boolean(
    b?.quantidades_semanais &&
    Object.keys(b.quantidades_semanais).some((k) => ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].includes(k))
  );
  const semanaNormalizada: Record<DiaSemana, Record<string, number>> = {
    seg: normalizarMapaQuantidades(origemSemana.seg || (temSemanaDefinida ? {} : mapaQtds)),
    ter: normalizarMapaQuantidades(origemSemana.ter || (temSemanaDefinida ? {} : mapaQtds)),
    qua: normalizarMapaQuantidades(origemSemana.qua || (temSemanaDefinida ? {} : mapaQtds)),
    qui: normalizarMapaQuantidades(origemSemana.qui || (temSemanaDefinida ? {} : mapaQtds)),
    sex: normalizarMapaQuantidades(origemSemana.sex || (temSemanaDefinida ? {} : mapaQtds)),
    sab: normalizarMapaQuantidades(origemSemana.sab || (temSemanaDefinida ? {} : mapaQtds)),
    dom: normalizarMapaQuantidades(origemSemana.dom || (temSemanaDefinida ? {} : mapaQtds)),
  };
  todosDias.forEach((d) => {
    if (!semanaNormalizada[d] || typeof semanaNormalizada[d] !== 'object') {
      semanaNormalizada[d] = {};
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
  const prodsPredefinidos = normalizarMapaQuantidades(c?.produtos_predefinidos);
  const semanaNormalizada: Record<DiaSemana, Record<string, number>> = {
    seg: normalizarMapaQuantidades(origemSemana.seg),
    ter: normalizarMapaQuantidades(origemSemana.ter),
    qua: normalizarMapaQuantidades(origemSemana.qua),
    qui: normalizarMapaQuantidades(origemSemana.qui),
    sex: normalizarMapaQuantidades(origemSemana.sex),
    sab: normalizarMapaQuantidades(origemSemana.sab),
    dom: normalizarMapaQuantidades(origemSemana.dom),
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
    produtos_predefinidos: prodsPredefinidos,
  };
}

export function carregarArtigosBaseFixa(): string[] {
  const baseDefault = [...COLUNAS_MAPA_DIARIO_OFICIAL];
  if (typeof window !== 'undefined') {
    let raw = localStorage.getItem(ARTIGOS_BASE_FIXA_STORAGE_KEY);
    if (!raw) {
      // Tentar migrar de v3
      const rawV3 = localStorage.getItem('padaria_artigos_base_fixa_v3');
      if (rawV3) {
        try {
          const parsedV3 = JSON.parse(rawV3);
          if (Array.isArray(parsedV3)) {
            const migradas = Array.from(new Set(parsedV3.map((p) => String(p || '').trim()).filter(Boolean)));
            localStorage.setItem(ARTIGOS_BASE_FIXA_STORAGE_KEY, JSON.stringify(migradas));
            localStorage.removeItem('padaria_artigos_base_fixa_v3');
            return migradas;
          }
        } catch (e) {}
      }
    } else {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalizados = Array.from(new Set(parsed.map((p) => String(p || '').trim()).filter(Boolean)));
          return normalizados;
        }
      } catch (e) {}
    }
    localStorage.setItem(ARTIGOS_BASE_FIXA_STORAGE_KEY, JSON.stringify(baseDefault));
  }
  return baseDefault;
}

export async function carregarArtigosBaseFixaSupabase(): Promise<string[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('configuracoes_sistema')
        .select('valor')
        .eq('chave', 'artigos_base_fixa')
        .maybeSingle();

      if (!error && data && data.valor && Array.isArray(data.valor) && data.valor.length > 0) {
        const limpos = Array.from(new Set(data.valor.map((p: any) => String(p || '').trim()).filter(Boolean)));
        if (typeof window !== 'undefined') {
          localStorage.setItem(ARTIGOS_BASE_FIXA_STORAGE_KEY, JSON.stringify(limpos));
        }
        return limpos;
      }
    } catch {}
  }
  return carregarArtigosBaseFixa();
}

export function salvarArtigosBaseFixa(artigos: string[]): void {
  const limpos = Array.from(new Set((artigos || []).map((p) => String(p || '').trim()).filter(Boolean)));
  if (typeof window !== 'undefined') {
    localStorage.setItem(ARTIGOS_BASE_FIXA_STORAGE_KEY, JSON.stringify(limpos));
    window.dispatchEvent(new Event('app_base_fixa_atualizada'));
  }
  if (supabase) {
    supabase.from('configuracoes_sistema').upsert({
      chave: 'artigos_base_fixa',
      valor: limpos,
      atualizado_em: new Date().toISOString()
    }, { onConflict: 'chave' }).then(() => {}).catch(() => {});
  }
}

export function carregarBaseFixaCarrinhas(): BaseFixaCarrinha[] {
  const inicialNormalizado = BASE_FIXA_CARRINHAS_INICIAL.map(normalizarBaseFixaItem);
  if (typeof window !== 'undefined') {
    let raw = localStorage.getItem(BASE_FIXA_CARRINHAS_STORAGE_KEY);
    if (!raw) {
      // Migração de v3 para v4
      const rawV3 = localStorage.getItem('padaria_base_fixa_carrinhas_v3');
      if (rawV3) {
        try {
          const parsedV3 = JSON.parse(rawV3);
          if (Array.isArray(parsedV3) && parsedV3.length > 0) {
            const migradas = parsedV3
              .map(normalizarBaseFixaItem)
              .filter(b => b.carrinha_nome !== 'Rota 8' && b.carrinha_id !== 'e888db95-c427-4ed5-83fc-01403bd24cf8');
            localStorage.setItem(BASE_FIXA_CARRINHAS_STORAGE_KEY, JSON.stringify(migradas));
            localStorage.removeItem('padaria_base_fixa_carrinhas_v3');
            return migradas;
          }
        } catch (e) {}
      }
    } else {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
            .map(normalizarBaseFixaItem)
            .filter(b => b.carrinha_nome !== 'Rota 8' && b.carrinha_id !== 'e888db95-c427-4ed5-83fc-01403bd24cf8');
        }
      } catch (e) {}
    }
    localStorage.setItem(BASE_FIXA_CARRINHAS_STORAGE_KEY, JSON.stringify(inicialNormalizado));
  }
  return inicialNormalizado.filter(b => b.carrinha_nome !== 'Rota 8' && b.carrinha_id !== 'e888db95-c427-4ed5-83fc-01403bd24cf8');
}

export const CONFIG_BASE_FIXA_PHONE_KEY = '000000003';

export async function carregarBaseFixaCarrinhasSupabase(): Promise<BaseFixaCarrinha[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('bases_fixas_carrinhas')
        .select('*');

      if (!error && data && data.length > 0) {
        const parsed = data.map((row: any) => {
          const q = row.quantidades || {};
          const temSemanas = Boolean(q.seg || q.ter || q.qua || q.qui || q.sex || q.sab || q.dom || q.quantidades_semanais);
          const semana = q.quantidades_semanais || (temSemanas ? {
            seg: q.seg || {},
            ter: q.ter || {},
            qua: q.qua || {},
            qui: q.qui || {},
            sex: q.sex || {},
            sab: q.sab || {},
            dom: q.dom || {},
          } : undefined);

          return normalizarBaseFixaItem({
            carrinha_id: row.carrinha_id,
            carrinha_nome: row.carrinha_nome,
            quantidades_semanais: semana,
            quantidades_por_produto: q,
            quantidades: q,
          });
        }).filter((b) => b.carrinha_nome !== 'Rota 8' && b.carrinha_id !== 'e888db95-c427-4ed5-83fc-01403bd24cf8');

        if (typeof window !== 'undefined') {
          localStorage.setItem(BASE_FIXA_CARRINHAS_STORAGE_KEY, JSON.stringify(parsed));
        }
        return parsed;
      }
    } catch (err) {
      console.warn('Aviso ao consultar tabela bases_fixas_carrinhas:', err);
    }

    try {
      const { data } = await supabase
        .from('clientes')
        .select('notas_entrega')
        .eq('telefone', CONFIG_BASE_FIXA_PHONE_KEY)
        .maybeSingle();

      if (data && data.notas_entrega) {
        const parsed = JSON.parse(data.notas_entrega);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalizados = parsed
            .map(normalizarBaseFixaItem)
            .filter((b) => b.carrinha_nome !== 'Rota 8' && b.carrinha_id !== 'e888db95-c427-4ed5-83fc-01403bd24cf8');
          // Migração automática imediata para bases_fixas_carrinhas
          for (const b of normalizados) {
            supabase.from('bases_fixas_carrinhas').upsert({
              carrinha_id: b.carrinha_id,
              carrinha_nome: b.carrinha_nome || `Rota`,
              quantidades: b.quantidades_por_produto || b.quantidades || {},
              atualizado_em: new Date().toISOString()
            }, { onConflict: 'carrinha_id' }).then(() => {}).catch(() => {});
          }
          if (typeof window !== 'undefined') {
            localStorage.setItem(BASE_FIXA_CARRINHAS_STORAGE_KEY, JSON.stringify(normalizados));
          }
          return normalizados;
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar base fixa do Supabase:', err);
    }
  }

  return carregarBaseFixaCarrinhas();
}

export function salvarBaseFixaCarrinhas(dados: BaseFixaCarrinha[]): void {
  const normalizados = (dados || []).map(normalizarBaseFixaItem);
  if (typeof window !== 'undefined') {
    localStorage.setItem(BASE_FIXA_CARRINHAS_STORAGE_KEY, JSON.stringify(normalizados));
    window.dispatchEvent(new Event('app_base_fixa_atualizada'));
  }

  if (supabase) {
    for (const b of normalizados) {
      supabase.from('bases_fixas_carrinhas').upsert({
        carrinha_id: b.carrinha_id,
        carrinha_nome: b.carrinha_nome || `Rota`,
        quantidades: {
          ...b.quantidades_por_produto,
          quantidades_semanais: b.quantidades_semanais,
          seg: b.quantidades_semanais?.seg || {},
          ter: b.quantidades_semanais?.ter || {},
          qua: b.quantidades_semanais?.qua || {},
          qui: b.quantidades_semanais?.qui || {},
          sex: b.quantidades_semanais?.sex || {},
          sab: b.quantidades_semanais?.sab || {},
          dom: b.quantidades_semanais?.dom || {},
        },
        atualizado_em: new Date().toISOString()
      }, { onConflict: 'carrinha_id' }).then(() => {}).catch(() => {});
    }

    const jsonStr = JSON.stringify(normalizados);
    supabase
      .from('clientes')
      .update({
        nome: '[SISTEMA_BASE_FIXA_CARRINHAS]',
        notas_entrega: jsonStr,
      })
      .eq('telefone', CONFIG_BASE_FIXA_PHONE_KEY)
      .then(() => {})
      .catch(() => {});
  }
}

export function subscreverAlteracoesBaseFixa(onUpdate: (lista: BaseFixaCarrinha[]) => void) {
  if (!supabase) return () => {};
  try {
    const channel = criarCanalRealtime('base_fixa');
    if (!channel) return () => {};
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bases_fixas_carrinhas' }, async () => {
        try {
          const atualizados = await carregarBaseFixaCarrinhasSupabase();
          onUpdate(atualizados);
        } catch {}
      })
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  } catch (err) {
    console.warn('Aviso ao subscrever bases fixas realtime:', err);
    return () => {};
  }
}

export function carregarClientesEmpresariaisB2B(): ClienteEmpresarialB2B[] {
  const inicialNormalizado = CLIENTES_EMPRESARIAIS_B2B_INICIAIS.map(normalizarClienteB2BItem);
  if (typeof window !== 'undefined') {
    let raw = localStorage.getItem(CLIENTES_B2B_STORAGE_KEY);
    if (!raw) {
      const rawV3 = localStorage.getItem('padaria_clientes_empresariais_b2b_v3');
      if (rawV3) {
        try {
          const parsedV3 = JSON.parse(rawV3);
          if (Array.isArray(parsedV3) && parsedV3.length > 0) {
            const migradas = parsedV3.map(normalizarClienteB2BItem);
            localStorage.setItem(CLIENTES_B2B_STORAGE_KEY, JSON.stringify(migradas));
            localStorage.removeItem('padaria_clientes_empresariais_b2b_v3');
            return migradas;
          }
        } catch (e) {}
      }
    } else {
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

  // Sincronização em background com Supabase se a tabela existir
  if (supabase) {
    const payloads = normalizados.map((c) => ({
      id: c.id,
      nome: c.nome,
      nif: c.nif || null,
      telefone: c.telefone || c.telemovel || null,
      telemovel: c.telemovel || c.telefone || null,
      email: c.email ? c.email.toLowerCase().trim() : null,
      morada: c.morada || 'Arouca',
      carrinha_id: c.carrinha_id || null,
      ativo: c.ativo !== undefined ? c.ativo : true,
      quantidades_semanais: c.quantidades_semanais || c.quantidades_semana || {},
      atualizado_em: new Date().toISOString()
    }));
    supabase
      .from('clientes_empresariais')
      .upsert(payloads)
      .then(({ error }) => {
        if (error) console.warn('Aviso sincronização B2B Supabase:', error.message);
      })
      .catch(() => {});
  }
}

export async function sincronizarClientesB2BComSupabase(): Promise<ClienteEmpresarialB2B[]> {
  if (!supabase) return carregarClientesEmpresariaisB2B();
  try {
    const { data, error } = await supabase
      .from('clientes_empresariais')
      .select('*')
      .order('nome', { ascending: true });

    if (!error && data && data.length > 0) {
      const normalizados = data.map(normalizarClienteB2BItem);
      if (typeof window !== 'undefined') {
        localStorage.setItem(CLIENTES_B2B_STORAGE_KEY, JSON.stringify(normalizados));
        window.dispatchEvent(new Event('app_b2b_atualizado'));
      }
      return normalizados;
    }
  } catch (err) {
    console.warn('Fallback para cache local de clientes B2B:', err);
  }
  return carregarClientesEmpresariaisB2B();
}

export async function eliminarClienteEmpresarialB2B(id: string): Promise<boolean> {
  if (typeof window !== 'undefined') {
    const lista = carregarClientesEmpresariaisB2B().filter((c) => c.id !== id);
    localStorage.setItem(CLIENTES_B2B_STORAGE_KEY, JSON.stringify(lista));
    window.dispatchEvent(new Event('app_b2b_atualizado'));
  }
  if (supabase) {
    try {
      const { error } = await supabase.from('clientes_empresariais').delete().eq('id', id);
      if (error) {
        console.warn('Erro ao eliminar cliente B2B no Supabase:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Erro de rede ao eliminar cliente B2B:', err);
      return false;
    }
  }
  return true;
}

// ---------------- BASES DIÁRIAS RECORRENTES (PORTA-A-PORTA & MODO FÉRIAS) ---------------- //

const BASES_RECORRENTES_STORAGE_KEY = 'padaria_bases_diarias_recorrentes_v1';

export function clienteEmModoFerias(base: BaseDiariaRecorrente, dataStr: string): boolean {
  if (!base.ativo) return true; // Se inativo, está em pausa
  if (!base.pausa_inicio || !base.pausa_fim) return false;
  // dataStr: YYYY-MM-DD
  return dataStr >= base.pausa_inicio && dataStr <= base.pausa_fim;
}

export function normalizarBaseRecorrenteItem(item: any): BaseDiariaRecorrente {
  const todosDias: DiaSemana[] = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
  const origemSemana = item?.quantidades_semanais || item?.quantidades_semana || {};
  const semanaNormalizada: Record<DiaSemana, Record<string, number>> = {
    seg: normalizarMapaQuantidades(origemSemana.seg),
    ter: normalizarMapaQuantidades(origemSemana.ter),
    qua: normalizarMapaQuantidades(origemSemana.qua),
    qui: normalizarMapaQuantidades(origemSemana.qui),
    sex: normalizarMapaQuantidades(origemSemana.sex),
    sab: normalizarMapaQuantidades(origemSemana.sab),
    dom: normalizarMapaQuantidades(origemSemana.dom),
  };
  todosDias.forEach((d) => {
    if (!semanaNormalizada[d] || typeof semanaNormalizada[d] !== 'object') {
      semanaNormalizada[d] = {};
    }
  });

  return {
    id: String(item.id || ''),
    cliente_id: String(item.cliente_id || ''),
    cliente_nome: item.cliente_nome || undefined,
    cliente_telefone: item.cliente_telefone || undefined,
    cliente_morada: item.cliente_morada || undefined,
    carrinha_id: String(item.carrinha_id || ''),
    carrinha_nome: item.carrinha_nome || undefined,
    ativo: item.ativo !== undefined ? Boolean(item.ativo) : true,
    pausa_inicio: item.pausa_inicio || null,
    pausa_fim: item.pausa_fim || null,
    quantidades_semanais: semanaNormalizada,
    notas_motorista: item.notas_motorista || null,
    metodo_pagamento: item.metodo_pagamento || 'dinheiro_ao_motorista',
    criado_em: item.criado_em || undefined,
    atualizado_em: item.atualizado_em || undefined,
  };
}

export async function carregarBasesDiariasRecorrentes(): Promise<BaseDiariaRecorrente[]> {
  let locais: BaseDiariaRecorrente[] = [];
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(BASES_RECORRENTES_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) locais = parsed.map(normalizarBaseRecorrenteItem);
      } catch (e) {}
    }
  }

  if (!supabase) return locais;

  try {
    const { data, error } = await supabase
      .from('bases_diarias_recorrentes')
      .select(`
        *,
        cliente:clientes ( id, nome, telefone, morada ),
        carrinha:carrinhas ( id, identificador )
      `)
      .order('criado_em', { ascending: false });

    if (!error && data) {
      const normalizadas = data.map((row: any) => ({
        ...normalizarBaseRecorrenteItem(row),
        cliente_nome: row.cliente?.nome,
        cliente_telefone: row.cliente?.telefone,
        cliente_morada: row.cliente?.morada,
        carrinha_nome: row.carrinha?.identificador,
      }));

      if (typeof window !== 'undefined') {
        localStorage.setItem(BASES_RECORRENTES_STORAGE_KEY, JSON.stringify(normalizadas));
        window.dispatchEvent(new Event('app_bases_recorrentes_atualizado'));
      }
      return normalizadas;
    }
  } catch (err) {
    console.warn('Fallback para cache local de bases recorrentes:', err);
  }

  return locais;
}

export async function salvarBaseDiariaRecorrente(base: Partial<BaseDiariaRecorrente> & { cliente_id: string; carrinha_id: string }): Promise<BaseDiariaRecorrente | null> {
  const payload: any = {
    cliente_id: base.cliente_id,
    carrinha_id: base.carrinha_id,
    ativo: base.ativo !== undefined ? base.ativo : true,
    pausa_inicio: base.pausa_inicio || null,
    pausa_fim: base.pausa_fim || null,
    quantidades_semanais: base.quantidades_semanais || {},
    notas_motorista: base.notas_motorista || null,
    metodo_pagamento: base.metodo_pagamento || 'dinheiro_ao_motorista',
    atualizado_em: new Date().toISOString(),
  };

  if (base.id && !base.id.startsWith('temp-')) {
    payload.id = base.id;
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('bases_diarias_recorrentes')
        .upsert(payload)
        .select(`
          *,
          cliente:clientes ( id, nome, telefone, morada ),
          carrinha:carrinhas ( id, identificador )
        `)
        .single();

      if (error) {
        console.error('Erro ao guardar base recorrente no Supabase:', error);
      } else if (data) {
        const item = {
          ...normalizarBaseRecorrenteItem(data),
          cliente_nome: data.cliente?.nome,
          cliente_telefone: data.cliente?.telefone,
          cliente_morada: data.cliente?.morada,
          carrinha_nome: data.carrinha?.identificador,
        };
        // Atualizar cache local
        if (typeof window !== 'undefined') {
          const listaAtual = (await carregarBasesDiariasRecorrentes()).filter((b) => b.id !== item.id);
          localStorage.setItem(BASES_RECORRENTES_STORAGE_KEY, JSON.stringify([item, ...listaAtual]));
          window.dispatchEvent(new Event('app_bases_recorrentes_atualizado'));
        }
        return item;
      }
    } catch (e) {
      console.warn('Erro de rede ao salvar base recorrente:', e);
    }
  }

  // Fallback offline
  const fallbackItem: BaseDiariaRecorrente = {
    id: base.id || `base-rec-${Date.now()}`,
    cliente_id: base.cliente_id,
    carrinha_id: base.carrinha_id,
    ativo: base.ativo !== undefined ? base.ativo : true,
    pausa_inicio: base.pausa_inicio || null,
    pausa_fim: base.pausa_fim || null,
    quantidades_semanais: base.quantidades_semanais || { seg: {}, ter: {}, qua: {}, qui: {}, sex: {}, sab: {}, dom: {} },
    notas_motorista: base.notas_motorista || null,
    metodo_pagamento: base.metodo_pagamento || 'dinheiro_ao_motorista',
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(BASES_RECORRENTES_STORAGE_KEY);
    let list: BaseDiariaRecorrente[] = [];
    try {
      if (raw) list = JSON.parse(raw);
    } catch {}
    list = [fallbackItem, ...list.filter((b) => b.id !== fallbackItem.id)];
    localStorage.setItem(BASES_RECORRENTES_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event('app_bases_recorrentes_atualizado'));
  }
  return fallbackItem;
}

export async function eliminarBaseDiariaRecorrente(id: string): Promise<boolean> {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(BASES_RECORRENTES_STORAGE_KEY);
    if (raw) {
      try {
        const list: BaseDiariaRecorrente[] = JSON.parse(raw);
        const filtrada = list.filter((b) => b.id !== id);
        localStorage.setItem(BASES_RECORRENTES_STORAGE_KEY, JSON.stringify(filtrada));
        window.dispatchEvent(new Event('app_bases_recorrentes_atualizado'));
      } catch {}
    }
  }

  if (supabase) {
    try {
      const { error } = await supabase.from('bases_diarias_recorrentes').delete().eq('id', id);
      if (error) console.warn('Aviso remoção base recorrente no Supabase:', error.message);
      return !error;
    } catch (e) {
      console.warn('Erro de rede ao eliminar base recorrente:', e);
    }
  }
  return true;
}

// ---------------- SUBSCRIÇÕES REALTIME OMNICHANNEL ---------------- //

export function subscreverAlteracoesClientesB2B(onUpdate: (lista: ClienteEmpresarialB2B[]) => void) {
  if (!supabase) return () => {};
  try {
    const channel = criarCanalRealtime('b2b');
    if (!channel) return () => {};
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes_empresariais' }, async () => {
        try {
          const atualizados = await sincronizarClientesB2BComSupabase();
          onUpdate(atualizados);
        } catch {}
      })
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  } catch (err) {
    console.warn('Aviso ao subscrever b2b realtime:', err);
    return () => {};
  }
}

export function subscreverAlteracoesClientes(onUpdate: (lista: Cliente[]) => void) {
  if (!supabase) return () => {};
  try {
    const channel = criarCanalRealtime('clientes');
    if (!channel) return () => {};
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, async () => {
        try {
          const atualizados = await carregarClientesSupabase();
          onUpdate(atualizados);
        } catch {}
      })
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  } catch (err) {
    console.warn('Aviso ao subscrever clientes realtime:', err);
    return () => {};
  }
}

export function subscreverAlteracoesBasesRecorrentes(onUpdate: (lista: BaseDiariaRecorrente[]) => void) {
  if (!supabase) return () => {};
  try {
    const channel = criarCanalRealtime('bases_recorrentes');
    if (!channel) return () => {};
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bases_diarias_recorrentes' }, async () => {
        try {
          const atualizados = await carregarBasesDiariasRecorrentes();
          onUpdate(atualizados);
        } catch {}
      })
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  } catch (err) {
    console.warn('Aviso ao subscrever bases recorrentes realtime:', err);
    return () => {};
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
export const CONFIG_AJUSTES_ADHOC_PHONE_KEY = '000000004';

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

export async function carregarAjustesAdhocSupabase(): Promise<Record<string, number>> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('ajustes_producao')
        .select('*');

      if (!error && data && data.length > 0) {
        const valores: Record<string, number> = {};
        for (const row of data) {
          if (row.chave && row.quantidade !== undefined) {
            valores[row.chave] = Number(row.quantidade);
          }
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem(AJUSTES_ADHOC_STORAGE_KEY, JSON.stringify({
            valores,
            atualizado_em: new Date().toISOString()
          }));
          window.dispatchEvent(new Event('app_ajustes_adhoc_atualizados'));
        }
        return valores;
      }
    } catch (err) {
      console.warn('Aviso ao consultar tabela ajustes_producao:', err);
    }

    try {
      const { data } = await supabase
        .from('clientes')
        .select('notas_entrega')
        .eq('telefone', CONFIG_AJUSTES_ADHOC_PHONE_KEY)
        .maybeSingle();

      if (data && data.notas_entrega) {
        const parsed = JSON.parse(data.notas_entrega);
        const valores = (parsed && parsed.valores) || parsed;
        if (valores && typeof valores === 'object' && Object.keys(valores).length > 0) {
          // Migração automática imediata para ajustes_producao
          for (const [ch, q] of Object.entries(valores)) {
            const partes = ch.split('_');
            const tipoAlvo = ch.startsWith('base_') ? 'rota' : 'b2b';
            const dataStr = partes[1] || new Date().toISOString().split('T')[0];
            const alvoId = partes[2] || '';
            const produtoNome = partes.slice(3).join('_') || 'artigo';
            supabase.from('ajustes_producao').upsert({
              chave: ch,
              data: dataStr,
              tipo_alvo: tipoAlvo,
              alvo_id: alvoId,
              produto_nome: produtoNome,
              quantidade: Math.max(0, Number(q) || 0),
              atualizado_em: new Date().toISOString()
            }, { onConflict: 'chave' }).then(() => {}).catch(() => {});
          }
          if (typeof window !== 'undefined') {
            localStorage.setItem(AJUSTES_ADHOC_STORAGE_KEY, JSON.stringify({
              valores,
              atualizado_em: new Date().toISOString()
            }));
            window.dispatchEvent(new Event('app_ajustes_adhoc_atualizados'));
          }
          return valores;
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar ajustes ad-hoc do Supabase:', err);
    }
  }

  return carregarAjustesAdhoc();
}

export async function salvarAjusteAdhoc(chave: string, quantidade: number | null): Promise<void> {
  const todos = carregarAjustesAdhoc();
  if (quantidade === null || isNaN(quantidade)) {
    delete todos[chave];
  } else {
    todos[chave] = Math.max(0, quantidade);
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(AJUSTES_ADHOC_STORAGE_KEY, JSON.stringify({
        valores: todos,
        atualizado_em: new Date().toISOString()
      }));
      window.dispatchEvent(new Event('app_ajustes_adhoc_atualizados'));
    } catch (e) {
      console.error('Erro ao salvar ajuste ad-hoc localmente:', e);
    }
  }

  if (supabase) {
    try {
      if (quantidade === null || isNaN(quantidade)) {
        await supabase.from('ajustes_producao').delete().eq('chave', chave);
      } else {
        const partes = chave.split('_');
        const tipoAlvo = chave.startsWith('base_') ? 'rota' : 'b2b';
        const dataStr = partes[1] || new Date().toISOString().split('T')[0];
        const alvoId = partes[2] || '';
        const produtoNome = partes.slice(3).join('_') || 'artigo';
        await supabase.from('ajustes_producao').upsert({
          chave,
          data: dataStr,
          tipo_alvo: tipoAlvo,
          alvo_id: alvoId,
          produto_nome: produtoNome,
          quantidade: Math.max(0, quantidade),
          atualizado_em: new Date().toISOString()
        }, { onConflict: 'chave' });
      }
    } catch (err) {
      console.error('Erro ao upsert ajuste na tabela ajustes_producao:', err);
    }

    try {
      const jsonStr = JSON.stringify({
        valores: todos,
        atualizado_em: new Date().toISOString()
      });
      await supabase
        .from('clientes')
        .update({
          nome: '[SISTEMA_AJUSTES_ADHOC_ROTAS]',
          notas_entrega: jsonStr,
        })
        .eq('telefone', CONFIG_AJUSTES_ADHOC_PHONE_KEY);
    } catch {}
  }
}

export function subscreverAlteracoesAjustesAdhoc(onUpdate: (valores: Record<string, number>) => void) {
  if (!supabase) return () => {};
  try {
    const channel = criarCanalRealtime('ajustes_adhoc');
    if (!channel) return () => {};
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ajustes_producao' }, async () => {
        try {
          const atualizados = await carregarAjustesAdhocSupabase();
          onUpdate(atualizados);
        } catch {}
      })
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  } catch (err) {
    console.warn('Aviso ao subscrever ajustes adhoc realtime:', err);
    return () => {};
  }
}

export function subscreverAlteracoesEncomendas(onUpdate: (dados: Encomenda[]) => void) {
  if (!supabase) return () => {};
  try {
    const channel = criarCanalRealtime('encomendas');
    if (!channel) return () => {};
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'encomendas' }, async () => {
        try {
          const dados = await carregarEncomendasSupabase();
          onUpdate(dados);
        } catch {}
      })
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  } catch (err) {
    console.warn('Aviso ao subscrever encomendas realtime:', err);
    return () => {};
  }
}

export function removerAjusteAdhoc(chave: string): void {
  salvarAjusteAdhoc(chave, null);
}

export const MAPA_ID_PARA_NUMERO_ROTA: Record<string, number> = {
  '1eaaa9bd-e3de-4b06-9c80-d1e464bcdc75': 1,
  '5ebae97d-593f-4f54-81c5-b200dd04258b': 2,
  'e062fea7-97da-4b2a-8607-da6a9ea8e668': 3,
  'a282db95-c427-4ed5-83fc-01403bd24cfc': 4,
  'b555db95-c427-4ed5-83fc-01403bd24cf5': 5,
  'c666db95-c427-4ed5-83fc-01403bd24cf6': 6,
  'd777db95-c427-4ed5-83fc-01403bd24cf7': 7,
  'car-1': 1,
  'car-2': 2,
  'car-3': 3,
  'car-4': 4,
  'car-5': 5,
  'car-6': 6,
  'car-7': 7,
};

export function obterAliasesCarrinha(carrinhaId: string): string[] {
  const aliases = [carrinhaId];
  const num = MAPA_ID_PARA_NUMERO_ROTA[carrinhaId] || parseInt(String(carrinhaId).replace(/\D+/g, '') || '0', 10);
  if (num >= 1 && num <= 7) {
    if (!aliases.includes(`car-${num}`)) aliases.push(`car-${num}`);
    if (!aliases.includes(String(num))) aliases.push(String(num));
    for (const [uuid, rNum] of Object.entries(MAPA_ID_PARA_NUMERO_ROTA)) {
      if (rNum === num && !aliases.includes(uuid)) {
        aliases.push(uuid);
      }
    }
  }
  return aliases;
}

export function getChaveAdhocBase(dataStr: string, carrinhaId: string, produtoNome: string): string {
  return `base_${dataStr}_${carrinhaId}_${(produtoNome || '').trim()}`;
}

export function getChaveAdhocB2B(dataStr: string, clienteB2BId: string, produtoNome: string): string {
  return `b2b_${dataStr}_${clienteB2BId}_${(produtoNome || '').trim()}`;
}

export function obterArtigosAjustadosBaseRota(dataStr: string, carrinhaId: string, ajustesCustom?: Record<string, number>): string[] {
  const ajustes = ajustesCustom || carregarAjustesAdhoc();
  const aliases = obterAliasesCarrinha(carrinhaId);
  const artigos: string[] = [];

  for (const alt of aliases) {
    const prefixo = `base_${dataStr}_${alt}_`;
    Object.keys(ajustes).forEach((k) => {
      if (k.startsWith(prefixo)) {
        const art = k.slice(prefixo.length).trim();
        if (art && !artigos.includes(art)) {
          artigos.push(art);
        }
      }
    });
  }
  return artigos;
}

export function obterArtigosAjustadosClienteB2B(dataStr: string, clienteB2BId: string, ajustesCustom?: Record<string, number>): string[] {
  const ajustes = ajustesCustom || carregarAjustesAdhoc();
  const prefixo = `b2b_${dataStr}_${clienteB2BId}_`;
  const artigos: string[] = [];
  Object.keys(ajustes).forEach((k) => {
    if (k.startsWith(prefixo)) {
      const art = k.slice(prefixo.length).trim();
      if (art && !artigos.includes(art)) {
        artigos.push(art);
      }
    }
  });
  return artigos;
}

export function obterQuantidadeEfetivaBaseRota(
  dataStr: string,
  carrinhaId: string,
  produtoNome: string,
  baseFixaSemanal?: Record<string, Record<string, number>>,
  diaSemana: string = 'seg',
  ajustesCustom?: Record<string, number>
): { quantidade: number; isAdhoc: boolean } {
  const ajustes = ajustesCustom || carregarAjustesAdhoc();
  const nomeLimpo = (produtoNome || '').trim();
  const aliases = obterAliasesCarrinha(carrinhaId);

  // 1. Procurar em todos os aliases (UUID ou car-X)
  for (const alt of aliases) {
    const chave = getChaveAdhocBase(dataStr, alt, nomeLimpo);
    if (ajustes[chave] !== undefined) {
      return { quantidade: Number(ajustes[chave]), isAdhoc: true };
    }
    const prefixo = `base_${dataStr}_${alt}_`;
    for (const [k, v] of Object.entries(ajustes)) {
      if (k.startsWith(prefixo) && k.slice(prefixo.length).trim().toLowerCase() === nomeLimpo.toLowerCase()) {
        return { quantidade: Number(v), isAdhoc: true };
      }
    }
  }

  // 2. Baseline do mapa semanal
  const mapaDia = baseFixaSemanal?.[diaSemana] || {};
  if (mapaDia[nomeLimpo] !== undefined) {
    return { quantidade: Number(mapaDia[nomeLimpo]), isAdhoc: false };
  }
  for (const [p, q] of Object.entries(mapaDia)) {
    if (p.trim().toLowerCase() === nomeLimpo.toLowerCase()) {
      return { quantidade: Number(q), isAdhoc: false };
    }
  }
  return { quantidade: 0, isAdhoc: false };
}

export function obterQuantidadeEfetivaClienteB2B(
  dataStr: string,
  clienteB2BId: string,
  produtoNome: string,
  quantidadesSemana?: Record<string, Record<string, number>>,
  diaSemana: string = 'seg',
  ajustesCustom?: Record<string, number>
): { quantidade: number; isAdhoc: boolean } {
  const ajustes = ajustesCustom || carregarAjustesAdhoc();
  const nomeLimpo = (produtoNome || '').trim();
  const chave = getChaveAdhocB2B(dataStr, clienteB2BId, nomeLimpo);
  if (ajustes[chave] !== undefined) {
    return { quantidade: Number(ajustes[chave]), isAdhoc: true };
  }
  // Fallback case-insensitive na chave adhoc
  const prefixo = `b2b_${dataStr}_${clienteB2BId}_`;
  for (const [k, v] of Object.entries(ajustes)) {
    if (k.startsWith(prefixo) && k.slice(prefixo.length).trim().toLowerCase() === nomeLimpo.toLowerCase()) {
      return { quantidade: Number(v), isAdhoc: true };
    }
  }
  // Baseline do mapa semanal
  const mapaDia = quantidadesSemana?.[diaSemana] || {};
  if (mapaDia[nomeLimpo] !== undefined) {
    return { quantidade: Number(mapaDia[nomeLimpo]), isAdhoc: false };
  }
  for (const [p, q] of Object.entries(mapaDia)) {
    if (p.trim().toLowerCase() === nomeLimpo.toLowerCase()) {
      return { quantidade: Number(q), isAdhoc: false };
    }
  }
  return { quantidade: 0, isAdhoc: false };
}

// ---------------- GUIA DE CARGA CONJUNTA (ROTAS 1 A 7) - GRELHA OFICIAL ---------------- //

export const COLUNAS_GRELHA_PADARIA: ColunaGrelhaProduto[] = [
  { id: 'b_amarela_05', label: 'B. amarela 0.5kg', alias: ['broa amarela 0,5 kg', 'broa amarela 0.5kg', 'b. amarela 0.5kg', 'b. amarela 0,5kg'] },
  { id: 'b_amarela_1', label: 'B. amarela 1 kg', alias: ['broa amarela 1 kg', 'broa amarela 1kg', 'b. amarela 1 kg', 'b. amarela 1kg'] },
  { id: 'b_amarela_2', label: 'B. amarela 2 kg', alias: ['broa amarela 2 kg', 'broa amarela 2kg', 'b. amarela 2 kg', 'b. amarela 2kg'] },
  { id: 'b_branca_05', label: 'B. branca 0.5kg', alias: ['broa branca 0,5 kg', 'broa branca 0.5kg', 'b. branca 0.5kg', 'b. branca 0,5kg'] },
  { id: 'b_branca_1', label: 'B. branca 1kg', alias: ['broa branca 1 kg', 'broa branca 1kg', 'b. branca 1kg', 'b. branca 1 kg'] },
  { id: 'b_chourico', label: 'B c/ chouriço', alias: ['broa com chouriço', 'bola com chouriço', 'b c/ chouriço', 'broa c/ chouriço', 'bola c/ chouriço', 'b. chourico'] },
  { id: 'broa_mistura', label: 'Broa mistura', alias: ['broa de mistura', 'broa mistura', 'broa de centeio 0,5 kg'] },
  { id: 'canilha', label: 'Canilha', alias: ['canilha'] },
  { id: 'meia_bola_carne', label: 'Meia bola de carne', alias: ['meia bola de carne', 'meia bola carne', 'bola de carne'] },
  { id: 'mini_pao_centeio', label: 'Mini pão centeio', alias: ['mini pão de centeio', 'mini pão centeio', 'mini pao centeio'] },
  { id: 'mini_pao_saloio', label: 'Mini pão saloio', alias: ['mini pão saloio', 'mini pao saloio'] },
  { id: 'padas_centeio', label: 'Padas Centeio', alias: ['padas de centeio', 'padas centeio'] },
  { id: 'padas_normais', label: 'Padas Normais', alias: ['padas normais'] },
  { id: 'padinhas', label: 'Padinhas', alias: ['padinhas'] },
  { id: 'pao_7_graos_peq', label: 'P. 7 grãos peq.', alias: ['pão 7 grãos pequeno', 'p. 7 grãos peq.', 'pão 7 grãos', 'p. 7 graos peq.', 'pao 7 graos'] },
  { id: 'pao_alfarroba', label: 'Pão alfarroba', alias: ['pão de alfarroba', 'pão alfarroba', 'pao alfarroba'] },
  { id: 'pao_bico', label: 'Pão de bico', alias: ['pão de bico', 'pão bico', 'pao bico'] },
  { id: 'pao_cachorro', label: 'Pão de cachorro', alias: ['pão de cachorro', 'pão cachorro', 'pao cachorro'] },
  { id: 'pao_canela', label: 'Pão de canela', alias: ['pão de canela', 'pão canela', 'pao canela'] },
  { id: 'pao_centeio', label: 'Pão de centeio', alias: ['pão de centeio', 'pão centeio', 'pao centeio'] },
  { id: 'pao_forma_gr', label: 'Pão de forma Gr.', alias: ['pão de forma grande', 'pão de forma gr.', 'pao de forma gr.', 'pao forma grande'] },
  { id: 'pao_forma_corte_fino', label: 'P. F. gr. Corte fino', alias: ['pão de forma grande (corte fino)', 'p. f. gr. corte fino', 'pao de forma corte fino', 'corte fino'] },
  { id: 'pao_forma_peq', label: 'P. forna pequeno', alias: ['pão de forma pequeno', 'p. forna pequeno', 'pão forma pequeno', 'p. forma pequeno', 'pao forma pequeno'] },
  { id: 'pao_leite', label: 'Pão de leite', alias: ['pão de leite', 'pao de leite', 'pão leite'] },
  { id: 'pao_sementes', label: 'Pão sementes', alias: ['pão de sementes', 'pão sementes', 'pao sementes'] },
  { id: 'pao_integral', label: 'Pão integral', alias: ['pão integral', 'pao integral'] },
  { id: 'pao_italiano', label: 'Pão italiano', alias: ['pão italiano', 'pao italiano'] },
  { id: 'pao_normal', label: 'Pão normal', alias: ['pão normal', 'pao normal', 'carcaça', 'carcaças'] },
  { id: 'pao_saloio', label: 'Pão saloio', alias: ['pão saloio', 'pao saloio'] },
  { id: 'tosta', label: 'Tosta', alias: ['tosta', 'tostas'] },
  { id: 'triga_milha_03', label: 'Triga milha 0.3kg', alias: ['triga milha 0,3 kg', 'triga milha 0.3kg', 'triga milha 0,3kg'] },
  { id: 'triga_milha_05', label: 'Triga milha 0.5kg', alias: ['triga milha 0,5 kg', 'triga milha 0.5kg', 'triga milha 0,5kg'] },
  { id: 'triga_milha_1', label: 'Triga milha1 kg', alias: ['triga milha 1 kg', 'triga milha 1kg', 'triga milha1 kg', 'triga milha 1,0 kg'] },
  { id: 'triga_milha_saloio', label: 'Tri. milha Saloio', alias: ['triga milha saloio', 'tri. milha saloio', 'triga saloio'] },
];

export const COLUNAS_GRELHA_PASTELARIA: ColunaGrelhaProduto[] = [
  { id: 'croiss_choc', label: 'Croiss. Choc.', alias: ['croissant de chocolate', 'croiss. choc.', 'croissant choc', 'croissant chocolate'] },
  { id: 'croiss_simples', label: 'Croiss. Simples', alias: ['croissant simples', 'croiss. simples'] },
  { id: 'fatia_pizza', label: 'Fatia Pizza', alias: ['fatia de pizza', 'fatia pizza'] },
  { id: 'lanche_choco', label: 'Lanche Choco.', alias: ['lanche de chocolate', 'lanche choco.', 'lanche choc', 'lanche chocolate'] },
  { id: 'lanche_fiambre', label: 'Lanche Fiambre', alias: ['lanche de fiambre', 'lanche fiambre'] },
  { id: 'lanche_misto', label: 'Lanche Misto', alias: ['lanche misto'] },
  { id: 'meia_lua', label: 'Meia Lua', alias: ['meia lua'] },
  { id: 'merendas', label: 'Merendas', alias: ['merendas', 'merenda'] },
  { id: 'pao_chourico', label: 'Pão c/ Chouriço', alias: ['pão com chouriço', 'pão c/ chouriço', 'pao com chourico'] },
  { id: 'pao_croissant', label: 'Pão Croissant', alias: ['pão croissant', 'pao croissant'] },
  { id: 'pao_pizza', label: 'Pão Pizza', alias: ['pão pizza', 'pao pizza'] },
  { id: 'pasteis', label: 'Pasteis', alias: ['pasteis', 'pastéis'] },
  { id: 'pastel_nata', label: 'Pastel de Nata', alias: ['pastel de nata', 'nata', 'natas'] },
  { id: 'pastel_miniatura', label: 'Pastel Miniatura', alias: ['pastel miniatura', 'miniaturas', 'pasteis miniatura'] },
  { id: 'regueifa_canela', label: 'Regueifa. Canela', alias: ['regueifa de canela', 'regueifa. canela', 'regueifa canela'] },
  { id: 'regueifa_coco', label: 'Regueifa de Côco', alias: ['regueifa de côco', 'regueifa de coco', 'regueifa coco', 'regueifa côco'] },
  { id: 'regueifa_doce', label: 'Regueifa Doce', alias: ['regueifa doce', 'regueifa branca'] },
  { id: 'tranca_chocolate', label: 'Trança Chocolate', alias: ['trança de chocolate', 'trança chocolate', 'trança de creme', 'trança regueifa branca'] },
];

export function identificarColunaGrelha(artigoNome: string): { coluna: ColunaGrelhaProduto; setor: 'padaria' | 'pastelaria' } | null {
  if (!artigoNome) return null;
  const safeArtigoNome = String(artigoNome || '').trim();
  const norm = safeArtigoNome.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');

  for (const c of COLUNAS_GRELHA_PADARIA) {
    if (c.label.toLowerCase() === safeArtigoNome.toLowerCase()) return { coluna: c, setor: 'padaria' };
    for (const a of c.alias) {
      const an = a.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (norm === an) return { coluna: c, setor: 'padaria' };
    }
  }

  for (const c of COLUNAS_GRELHA_PASTELARIA) {
    if (c.label.toLowerCase() === safeArtigoNome.toLowerCase()) return { coluna: c, setor: 'pastelaria' };
    for (const a of c.alias) {
      const an = a.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (norm === an) return { coluna: c, setor: 'pastelaria' };
    }
  }

  for (const c of COLUNAS_GRELHA_PADARIA) {
    for (const a of c.alias) {
      const an = a.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (an.length > 4 && (norm.includes(an) || an.includes(norm))) {
        return { coluna: c, setor: 'padaria' };
      }
    }
  }

  for (const c of COLUNAS_GRELHA_PASTELARIA) {
    for (const a of c.alias) {
      const an = a.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (an.length > 4 && (norm.includes(an) || an.includes(norm))) {
        return { coluna: c, setor: 'pastelaria' };
      }
    }
  }

  return null;
}

export function calcularDadosGuiaCargaConjunta(
  arg1: any,
  carrinhasArg?: Carrinha[],
  baseFixaCarrinhasArg?: BaseFixaCarrinha[],
  clientesB2BArg?: ClienteEmpresarialB2B[],
  basesRecorrentesArg?: BaseDiariaRecorrente[],
  encomendasArg?: Encomenda[],
  produtosArg?: Produto[],
  ajustesCustomArg?: Record<string, number>
): DadosGuiaConjunta {
  let carrinhas: Carrinha[];
  let dataAlvo: string;
  let baseFixaCarrinhas: BaseFixaCarrinha[];
  let clientesB2B: ClienteEmpresarialB2B[];
  let basesRecorrentes: BaseDiariaRecorrente[];
  let encomendas: Encomenda[];
  let produtos: Produto[];
  let ajustesCustom: Record<string, number> | undefined;

  if (typeof arg1 === 'object' && arg1 !== null && Array.isArray(arg1.carrinhas)) {
    carrinhas = arg1.carrinhas;
    dataAlvo = arg1.dataAlvo || new Date().toISOString().split('T')[0];
    baseFixaCarrinhas = arg1.baseFixaCarrinhas || [];
    clientesB2B = arg1.clientesB2B || [];
    basesRecorrentes = arg1.basesRecorrentes || [];
    encomendas = arg1.encomendas || [];
    produtos = arg1.produtos || [];
    ajustesCustom = arg1.ajustesCustom;
  } else {
    dataAlvo = typeof arg1 === 'string' ? arg1 : new Date().toISOString().split('T')[0];
    carrinhas = carrinhasArg || [];
    baseFixaCarrinhas = baseFixaCarrinhasArg || [];
    clientesB2B = clientesB2BArg || [];
    basesRecorrentes = basesRecorrentesArg || [];
    encomendas = encomendasArg || [];
    produtos = produtosArg || [];
    ajustesCustom = ajustesCustomArg;
  }

  const diaSemanaAlvo = obterDiaSemanaDeData(dataAlvo);

  const rotasAtivas = [...carrinhas]
    .filter((c) => {
      const num = c.numero || parseInt(String(c.rota || c.identificador || '').replace(/\D+/g, '') || '99', 10);
      return num >= 1 && num <= 7 && c.matricula !== 'AAAAAA' && c.rota !== 'Rota 8' && c.identificador !== 'Rota 8';
    })
    .sort((a, b) => (a.numero || 0) - (b.numero || 0));

  const colunasRotas: ColunaRotaGuia[] = rotasAtivas.map((c, i) => {
    const num = c.numero || i + 1;
    return {
      carrinhaId: c.id,
      numeroRota: num,
      rota: c.rota || `Rota ${num}`,
      nomeCondutor: c.nome_condutor || 'A atribuir',
      matricula: c.matricula || '---',
      nomeCarro: c.nome_carro || `Carro ${num}`,
    };
  });

  const rotasCabecalho: ColunaCabecalhoRota[] = rotasAtivas.map((c, i) => {
    const num = c.numero || i + 1;
    return {
      id: c.id,
      numero: num,
      rota: c.rota || `Rota ${num}`,
      nome_condutor: c.nome_condutor || 'A atribuir',
      nome_carro: c.nome_carro || `Carro ${num}`,
      matricula: c.matricula || '---',
      carrinhaId: c.id,
      numeroRota: num,
      nomeCondutor: c.nome_condutor || 'A atribuir',
      nomeCarro: c.nome_carro || `Carro ${num}`,
    };
  });

  const mapaArtigos = new Map<string, {
    setor: string;
    unidade: string;
    rotas: Record<string, number>;
    total: number;
  }>();

  const getOrCreateArtigo = (nomeRaw: string) => {
    const nomeCanonico = normalizarNomeArtigoCanonico(nomeRaw);
    if (!mapaArtigos.has(nomeCanonico)) {
      const prodRef = produtos.find((p) => (p?.nome || '').toLowerCase() === (nomeCanonico || '').toLowerCase());
      const setor = prodRef?.categoria || (
        nomeCanonico.toLowerCase().includes('bolo') ||
        nomeCanonico.toLowerCase().includes('croissant') ||
        nomeCanonico.toLowerCase().includes('nata') ||
        nomeCanonico.toLowerCase().includes('pastel')
          ? 'pastelaria'
          : 'padaria'
      );
      const unidade = prodRef?.unidade?.toLowerCase().includes('kg') ? 'kg' : 'un.';
      const rotasObj: Record<string, number> = {};
      rotasAtivas.forEach((r) => { rotasObj[r.id] = 0; });
      mapaArtigos.set(nomeCanonico, {
        setor,
        unidade,
        rotas: rotasObj,
        total: 0,
      });
    }
    return mapaArtigos.get(nomeCanonico)!;
  };

  const gruposRotasGrelha: GrupoRotaGrelha[] = [];

  for (let i = 0; i < rotasAtivas.length; i++) {
    const car = rotasAtivas[i];
    const numRota = car.numero || i + 1;
    const aliasesCar = obterAliasesCarrinha(car.id);
    const linhasGrelhaRota: LinhaGrelhaCarga[] = [];
    const rotaTotaisPadaria: Record<string, number> = {};
    const rotaTotaisPastelaria: Record<string, number> = {};
    COLUNAS_GRELHA_PADARIA.forEach((c) => { rotaTotaisPadaria[c.id] = 0; });
    COLUNAS_GRELHA_PASTELARIA.forEach((c) => { rotaTotaisPastelaria[c.id] = 0; });

    // 1. Base Fixa
    const bf = baseFixaCarrinhas.find((b) => aliasesCar.includes(b.carrinha_id) || obterAliasesCarrinha(b.carrinha_id).some((a) => aliasesCar.includes(a)));
    const semanaBf = (bf?.quantidades_semanais || bf?.quantidades_semana || {}) as Record<string, Record<string, number>>;
    const mapaBfDia = semanaBf?.[diaSemanaAlvo] || bf?.quantidades_por_produto || {};

    const candidatosBf = new Set<string>();
    Object.keys(mapaBfDia).forEach((a) => {
      const art = (a || '').trim();
      if (art) candidatosBf.add(art);
    });
    if (bf?.quantidades_semanais) {
      Object.values(bf.quantidades_semanais).forEach((m) => {
        if (m && typeof m === 'object') {
          Object.keys(m).forEach((a) => {
            const art = (a || '').trim();
            if (art) candidatosBf.add(art);
          });
        }
      });
    }
    if (bf?.quantidades_por_produto) {
      Object.keys(bf.quantidades_por_produto).forEach((a) => {
        const art = (a || '').trim();
        if (art) candidatosBf.add(art);
      });
    }
    obterArtigosAjustadosBaseRota(dataAlvo, car.id, ajustesCustom).forEach((a) => {
      const art = (a || '').trim();
      if (art) candidatosBf.add(art);
    });

    const qtdsBaseLinha: Record<string, number> = {};
    let totalBaseLinha = 0;

    candidatosBf.forEach((artigo) => {
      const { quantidade } = obterQuantidadeEfetivaBaseRota(dataAlvo, car.id, artigo, semanaBf, diaSemanaAlvo, ajustesCustom);
      if (quantidade > 0) {
        const entry = getOrCreateArtigo(artigo);
        entry.rotas[car.id] = (entry.rotas[car.id] || 0) + quantidade;
        entry.total += quantidade;

        const colMatch = identificarColunaGrelha(artigo);
        if (colMatch) {
          qtdsBaseLinha[colMatch.coluna.id] = (qtdsBaseLinha[colMatch.coluna.id] || 0) + quantidade;
          totalBaseLinha += quantidade;
          if (colMatch.setor === 'padaria') {
            rotaTotaisPadaria[colMatch.coluna.id] += quantidade;
          } else {
            rotaTotaisPastelaria[colMatch.coluna.id] += quantidade;
          }
        }
      }
    });

    // 2. Bases Recorrentes (particulares fixos)
    basesRecorrentes
      .filter((b) => b.ativo && (aliasesCar.includes(b.carrinha_id) || obterAliasesCarrinha(b.carrinha_id).some((a) => aliasesCar.includes(a))) && !clienteEmModoFerias(b, dataAlvo))
      .forEach((b) => {
        const mapaDia = b.quantidades_semanais?.[diaSemanaAlvo] || {};
        Object.entries(mapaDia).forEach(([artigo, qtd]) => {
          const quantidade = Number(qtd) || 0;
          if (quantidade > 0) {
            const entry = getOrCreateArtigo(artigo);
            entry.rotas[car.id] = (entry.rotas[car.id] || 0) + quantidade;
            entry.total += quantidade;

            const colMatch = identificarColunaGrelha(artigo);
            if (colMatch) {
              qtdsBaseLinha[colMatch.coluna.id] = (qtdsBaseLinha[colMatch.coluna.id] || 0) + quantidade;
              totalBaseLinha += quantidade;
              if (colMatch.setor === 'padaria') {
                rotaTotaisPadaria[colMatch.coluna.id] += quantidade;
              } else {
                rotaTotaisPastelaria[colMatch.coluna.id] += quantidade;
              }
            }
          }
        });
      });

    // Linha de Cabeçalho / Base da Rota: discriminar como 'Porta a Porta' apenas se tiver quantidades
    if (totalBaseLinha > 0) {
      linhasGrelhaRota.push({
        tipo: 'rota_base',
        id: `base-${car.id}`,
        carrinhaId: car.id,
        nomeExibicao: 'Porta a Porta',
        detalhe: 'Base Diária (Porta-a-Porta)',
        quantidades: qtdsBaseLinha,
        totalLinha: totalBaseLinha,
      });
    }

    // 3. Clientes B2B da carrinha
    const clientesDaRota = clientesB2B.filter((cli) => cli.ativo && (aliasesCar.includes(cli.carrinha_id) || obterAliasesCarrinha(cli.carrinha_id).some((a) => aliasesCar.includes(a))));
    clientesDaRota.forEach((cli) => {
      const semanaB2b = (cli.quantidades_semanais || cli.quantidades_semana || {}) as Record<string, Record<string, number>>;
      const mapaDiaB2b = semanaB2b?.[diaSemanaAlvo] || {};
      const candidatosB2b = new Set<string>();
      Object.keys(mapaDiaB2b).forEach((a) => {
        const art = (a || '').trim();
        if (art) candidatosB2b.add(art);
      });
      if (cli.quantidades_semanais) {
        Object.values(cli.quantidades_semanais).forEach((m) => {
          if (m && typeof m === 'object') {
            Object.keys(m).forEach((a) => {
              const art = (a || '').trim();
              if (art) candidatosB2b.add(art);
            });
          }
        });
      }
      obterArtigosAjustadosClienteB2B(dataAlvo, cli.id, ajustesCustom).forEach((a) => {
        const art = (a || '').trim();
        if (art) candidatosB2b.add(art);
      });

      const qtdsCliLinha: Record<string, number> = {};
      let totalCliLinha = 0;

      candidatosB2b.forEach((artigo) => {
        const { quantidade } = obterQuantidadeEfetivaClienteB2B(dataAlvo, cli.id, artigo, semanaB2b, diaSemanaAlvo, ajustesCustom);
        if (quantidade > 0) {
          const entry = getOrCreateArtigo(artigo);
          entry.rotas[car.id] = (entry.rotas[car.id] || 0) + quantidade;
          entry.total += quantidade;

          const colMatch = identificarColunaGrelha(artigo);
          if (colMatch) {
            qtdsCliLinha[colMatch.coluna.id] = (qtdsCliLinha[colMatch.coluna.id] || 0) + quantidade;
            totalCliLinha += quantidade;
            if (colMatch.setor === 'padaria') {
              rotaTotaisPadaria[colMatch.coluna.id] += quantidade;
            } else {
              rotaTotaisPastelaria[colMatch.coluna.id] += quantidade;
            }
          }
        }
      });

      linhasGrelhaRota.push({
        tipo: 'cliente_b2b',
        id: cli.id,
        carrinhaId: car.id,
        nomeExibicao: cli.nome,
        detalhe: cli.morada,
        quantidades: qtdsCliLinha,
        totalLinha: totalCliLinha,
      });
    });

    // 4. Encomendas ao Domicílio
    const encsRota = encomendas.filter(
      (e) => (aliasesCar.includes(e.carrinha_id || '') || obterAliasesCarrinha(e.carrinha_id || '').some((a) => aliasesCar.includes(a))) &&
             e.data_agendamento === dataAlvo &&
             e.tipo === 'entrega_domicilio' &&
             e.estado !== 'cancelado'
    );
    encsRota.forEach((e) => {
      const qtdsEncLinha: Record<string, number> = {};
      let totalEncLinha = 0;
      (e.itens || []).forEach((item) => {
        const quantidade = Number(item.quantidade) || 0;
        if (quantidade > 0 && item.estado_producao !== 'recusado') {
          const entry = getOrCreateArtigo(item.produto_nome);
          entry.rotas[car.id] = (entry.rotas[car.id] || 0) + quantidade;
          entry.total += quantidade;

          const colMatch = identificarColunaGrelha(item.produto_nome);
          if (colMatch) {
            qtdsEncLinha[colMatch.coluna.id] = (qtdsEncLinha[colMatch.coluna.id] || 0) + quantidade;
            totalEncLinha += quantidade;
            if (colMatch.setor === 'padaria') {
              rotaTotaisPadaria[colMatch.coluna.id] += quantidade;
            } else {
              rotaTotaisPastelaria[colMatch.coluna.id] += quantidade;
            }
          }
        }
      });
      if (totalEncLinha > 0) {
        linhasGrelhaRota.push({
          tipo: 'encomenda_domicilio',
          id: e.id,
          carrinhaId: car.id,
          nomeExibicao: `Enc: ${e.cliente?.nome || e.codigo}`,
          detalhe: e.cliente?.telefone,
          quantidades: qtdsEncLinha,
          totalLinha: totalEncLinha,
        });
      }
    });

    const totPadRota = Object.values(rotaTotaisPadaria).reduce((acc, v) => acc + v, 0);
    const totPastRota = Object.values(rotaTotaisPastelaria).reduce((acc, v) => acc + v, 0);
    const totGeralRota = totPadRota + totPastRota;

    // Regra de Negócio: rotas com total geral a zero não devem aparecer na folha
    if (totGeralRota > 0) {
      gruposRotasGrelha.push({
        carrinhaId: car.id,
        numeroRota: numRota,
        rotaNome: car.rota || `Rota ${numRota}`,
        nomeCondutor: car.nome_condutor || '',
        matricula: car.matricula || '',
        linhas: linhasGrelhaRota,
        totaisPadaria: rotaTotaisPadaria,
        totaisPastelaria: rotaTotaisPastelaria,
        totalPadariaRota: totPadRota,
        totalPastelariaRota: totPastRota,
        totalGeralRota,
      });
    }
  }

  const totaisColunasPadaria: Record<string, number> = {};
  const totaisColunasPastelaria: Record<string, number> = {};
  COLUNAS_GRELHA_PADARIA.forEach((c) => {
    totaisColunasPadaria[c.id] = gruposRotasGrelha.reduce((acc, g) => acc + (g.totaisPadaria[c.id] || 0), 0);
  });
  COLUNAS_GRELHA_PASTELARIA.forEach((c) => {
    totaisColunasPastelaria[c.id] = gruposRotasGrelha.reduce((acc, g) => acc + (g.totaisPastelaria[c.id] || 0), 0);
  });

  const linhas: LinhaCargaConjunta[] = Array.from(mapaArtigos.entries())
    .filter(([_, val]) => val.total > 0)
    .map(([artigo, val]) => ({
      artigo,
      setor: val.setor,
      unidade: val.unidade,
      rotas: val.rotas,
      total: val.total,
    }))
    .sort((a, b) => {
      if (a.setor !== b.setor) return a.setor.localeCompare(b.setor);
      return a.artigo.localeCompare(b.artigo);
    });

  const totaisPorRota: Record<string, number> = {};
  const totaisPadariaPorRota: Record<string, number> = {};
  const totaisPastelariaPorRota: Record<string, number> = {};
  rotasAtivas.forEach((r) => {
    totaisPorRota[r.id] = 0;
    totaisPadariaPorRota[r.id] = 0;
    totaisPastelariaPorRota[r.id] = 0;
  });

  const linhasPadaria: LinhaGuiaConjuntaSecao[] = [];
  const linhasPastelaria: LinhaGuiaConjuntaSecao[] = [];
  let totalGeral = 0;
  let totalGeralPadaria = 0;
  let totalGeralPastelaria = 0;

  for (const l of linhas) {
    const itemSecao: LinhaGuiaConjuntaSecao = {
      artigo: l.artigo,
      unidade: l.unidade,
      quantidadesPorRota: l.rotas,
      totalArtigo: l.total,
    };

    rotasAtivas.forEach((r) => {
      const q = l.rotas[r.id] || 0;
      totaisPorRota[r.id] = (totaisPorRota[r.id] || 0) + q;
    });
    totalGeral += l.total;

    if (l.setor === 'pastelaria') {
      linhasPastelaria.push(itemSecao);
      totalGeralPastelaria += l.total;
      rotasAtivas.forEach((r) => {
        const q = l.rotas[r.id] || 0;
        totaisPastelariaPorRota[r.id] = (totaisPastelariaPorRota[r.id] || 0) + q;
      });
    } else {
      linhasPadaria.push(itemSecao);
      totalGeralPadaria += l.total;
      rotasAtivas.forEach((r) => {
        const q = l.rotas[r.id] || 0;
        totaisPadariaPorRota[r.id] = (totaisPadariaPorRota[r.id] || 0) + q;
      });
    }
  }

  const totalCaixasEstimadas = Math.ceil(totalGeral / 25);
  const colunasRotasAtivas = colunasRotas.filter((c) => (totaisPorRota[c.carrinhaId] || 0) > 0);
  const rotasCabecalhoAtivas = rotasCabecalho.filter((r) => (totaisPorRota[r.id] || 0) > 0);

  return {
    data: dataAlvo,
    colunasRotas: colunasRotasAtivas.length > 0 ? colunasRotasAtivas : colunasRotas,
    linhasPadaria,
    linhasPastelaria,
    totaisPorRota,
    totaisPadariaPorRota,
    totaisPastelariaPorRota,
    totalGeralUnidades: totalGeral,
    totalGeralPadaria,
    totalGeralPastelaria,
    totalCaixasEstimadas,

    rotasCabecalho: rotasCabecalhoAtivas.length > 0 ? rotasCabecalhoAtivas : rotasCabecalho,
    linhas,
    totalGeral,

    colunasGrelhaPadaria: COLUNAS_GRELHA_PADARIA,
    colunasGrelhaPastelaria: COLUNAS_GRELHA_PASTELARIA,
    gruposRotasGrelha,
    totaisColunasPadaria,
    totaisColunasPastelaria,
  };
}
