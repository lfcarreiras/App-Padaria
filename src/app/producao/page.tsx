'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Navbar } from '../../components/Navbar';
import { ThermalReceipt } from '../../components/ThermalReceipt';
import { LOJAS_MOCK, PRODUTOS_MOCK } from '../../lib/mockData';
import { 
  carregarEncomendasSupabase, 
  carregarLojasSupabase,
  carregarProdutosSupabase,
  atualizarEstadoEncomendaDb,
  atualizarEstadoItemDb,
  salvarObservacoesProducaoDb,
  registarLogAuditoria 
} from '../../lib/encomendasService';
import { 
  Encomenda, 
  SetorProducao, 
  Loja, 
  Produto 
} from '../../types';
import { useTranslation } from '../../lib/i18n';
import { useAuth } from '../../lib/authContext';
import { obterConfiguracaoMarca } from '../../lib/tinaContent';
import * as XLSX from 'xlsx';
import { 
  ChefHat, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  CakeSlice, 
  Store, 
  Eye, 
  Calendar,
  FileSpreadsheet,
  Volume2,
  VolumeX,
  Check,
  RotateCcw,
  User,
  MessageSquare,
  Search,
  Filter
} from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge';
import { BreadIcon, OriginBadge, SectorBadge } from '../../components/InproovalBadges';

export default function ProducaoPage() {
  const { t } = useTranslation();
  const { podeEditar, usuario } = useAuth();
  const currentUser = usuario || { id: 'user-padeiro', nome: 'Carlos Ferreira (Chefe Padeiro)', role: 'operador_padaria' };
  const temPermissaoEdicao = podeEditar('producao');
  const configMarca = obterConfiguracaoMarca();

  const [selectedLojaId, setSelectedLojaId] = useState<string>('todas');
  const [lojas, setLojas] = useState<Loja[]>(LOJAS_MOCK);
  const [produtos, setProdutos] = useState<Produto[]>(PRODUTOS_MOCK);
  const [setorAtivo, setSetorAtivo] = useState<SetorProducao | 'todos'>('todos');
  const [filtroConclusao, setFiltroConclusao] = useState<'nao_concluidas' | 'concluidas' | 'todas'>('nao_concluidas');
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [encomendaParaImprimir, setEncomendaParaImprimir] = useState<Encomenda | null>(null);

  // Alarme Sonoro e Visual de Encomendas Urgentes (<= 3 horas para levantamento)
  const [somAlertaAtivo, setSomAlertaAtivo] = useState<boolean>(true);
  const [obsProducaoPorEncomenda, setObsProducaoPorEncomenda] = useState<Record<string, string>>({});
  const [savingObsId, setSavingObsId] = useState<string | null>(null);
  const [pesquisaTexto, setPesquisaTexto] = useState<string>('');
  const [nowTick, setNowTick] = useState<number>(Date.now());
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Filtro de Calendário
  const [filtroPeriodo, setFiltroPeriodo] = useState<'hoje' | 'amanha' | 'todos' | 'personalizado'>('hoje');
  const [dataInicioPersonalizada, setDataInicioPersonalizada] = useState('');
  const [dataFimPersonalizada, setDataFimPersonalizada] = useState('');

  // Carregar encomendas da base de dados central
  useEffect(() => {
    async function carregar() {
      const [dados, ljs, prods] = await Promise.all([
        carregarEncomendasSupabase(),
        carregarLojasSupabase(),
        carregarProdutosSupabase(),
      ]);
      setEncomendas(dados);
      if (ljs && ljs.length > 0) setLojas(ljs);
      if (prods && prods.length > 0) setProdutos(prods);
    }
    carregar();
  }, []);

  // Relógio ao vivo para verificação em tempo real do alerta de 3 horas
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const lojaAtual = lojas.find((l) => l.id === selectedLojaId) || lojas[0] || LOJAS_MOCK[0];

  // Datas de referência
  const hoje = new Date().toISOString().split('T')[0];
  const dHoje = new Date();
  const dAmanha = new Date(dHoje);
  dAmanha.setDate(dHoje.getDate() + 1);
  const amanha = dAmanha.toISOString().split('T')[0];

  // 1. Filtrar APENAS encomendas para Levantamento em Loja (excluindo entregas ao domicílio)
  const encomendasLevantamentoLoja = useMemo(() => {
    return encomendas.filter((e) => e.tipo === 'levantamento_loja');
  }, [encomendas]);

  // 2. Encomendas urgentes (<= 3h para a hora agendada e ainda não concluídas)
  const encomendasUrgentes = useMemo(() => {
    return encomendasLevantamentoLoja.filter((e) => {
      if (e.estado === 'pronto_loja' || e.estado === 'entregue' || e.estado === 'cancelado') return false;
      const dataHoraStr = `${e.data_agendamento}T${e.hora_agendamento || '10:00'}:00`;
      const tsAgendado = new Date(dataHoraStr).getTime();
      if (isNaN(tsAgendado)) return false;
      const diffHoras = (tsAgendado - nowTick) / (1000 * 60 * 60);
      return diffHoras <= 3 && (e.data_agendamento === hoje || diffHoras >= -4);
    }).sort((a, b) => {
      const dtA = `${a.data_agendamento} ${a.hora_agendamento}`;
      const dtB = `${b.data_agendamento} ${b.hora_agendamento}`;
      return dtA.localeCompare(dtB);
    });
  }, [encomendasLevantamentoLoja, nowTick, hoje]);

  // Gestão do sinal sonoro para encomendas urgentes
  const tocarSinalSonoroUrgente = () => {
    if (typeof window === 'undefined' || !somAlertaAtivo) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const playTone = (freq: number, startOffset: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + startOffset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + startOffset);
        osc.stop(ctx.currentTime + startOffset + duration);
      };
      playTone(880, 0, 0.22);
      playTone(1046.5, 0.28, 0.28);
    } catch {
      // Browser autoplay policy fallback
    }
  };

  useEffect(() => {
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }
    if (encomendasUrgentes.length > 0 && somAlertaAtivo) {
      tocarSinalSonoroUrgente();
      audioIntervalRef.current = setInterval(() => {
        tocarSinalSonoroUrgente();
      }, 10000);
    }
    return () => {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    };
  }, [encomendasUrgentes.length, somAlertaAtivo]);

  // 3. Filtrar encomendas de acordo com Loja, Setor, Período, Conclusão e Pesquisa
  const encomendasFiltradas = useMemo(() => {
    return encomendasLevantamentoLoja.filter((e) => {
      // Filtro de Loja
      const matchLoja = selectedLojaId === 'todas' || e.loja_id === selectedLojaId;

      // Filtro de Setor (Padaria vs Pastelaria)
      const temItensDoSetor =
        setorAtivo === 'todos'
          ? true
          : e.itens.some((item) => item.setor === setorAtivo);

      // Filtro Temporal / Calendário
      let matchData = true;
      if (filtroPeriodo === 'hoje') {
        matchData = e.data_agendamento === hoje;
      } else if (filtroPeriodo === 'amanha') {
        matchData = e.data_agendamento === amanha;
      } else if (filtroPeriodo === 'personalizado') {
        if (dataInicioPersonalizada && dataFimPersonalizada) {
          matchData = e.data_agendamento >= dataInicioPersonalizada && e.data_agendamento <= dataFimPersonalizada;
        } else if (dataInicioPersonalizada) {
          matchData = e.data_agendamento >= dataInicioPersonalizada;
        } else if (dataFimPersonalizada) {
          matchData = e.data_agendamento <= dataFimPersonalizada;
        }
      }

      // Filtro de Conclusão: Não Concluídas (A Produzir) vs Concluídas (Prontas)
      let matchConclusao = true;
      const isConcluida = e.estado === 'pronto_loja' || e.estado === 'entregue';
      if (filtroConclusao === 'nao_concluidas') {
        matchConclusao = !isConcluida && e.estado !== 'cancelado';
      } else if (filtroConclusao === 'concluidas') {
        matchConclusao = isConcluida;
      }

      // Filtro de Pesquisa
      let matchPesquisa = true;
      if (pesquisaTexto.trim()) {
        const q = pesquisaTexto.toLowerCase();
        const noCliente = (e.cliente?.nome || '').toLowerCase().includes(q);
        const noCodigo = (e.codigo || '').toLowerCase().includes(q);
        const noTelefone = (e.cliente?.telefone || '').includes(q);
        const nosArtigos = e.itens.some((it) => (it.produto_nome || '').toLowerCase().includes(q));
        matchPesquisa = noCliente || noCodigo || noTelefone || nosArtigos;
      }

      return matchLoja && temItensDoSetor && matchData && matchConclusao && matchPesquisa;
    }).sort((a, b) => {
      // Ordenação estritamente ascendente por data e hora de agendamento
      const dtA = `${a.data_agendamento} ${a.hora_agendamento || '00:00'}`;
      const dtB = `${b.data_agendamento} ${b.hora_agendamento || '00:00'}`;
      const comp = dtA.localeCompare(dtB);
      if (comp !== 0) return comp;
      return a.codigo.localeCompare(b.codigo);
    });
  }, [
    encomendasLevantamentoLoja,
    selectedLojaId,
    setorAtivo,
    filtroPeriodo,
    filtroConclusao,
    dataInicioPersonalizada,
    dataFimPersonalizada,
    pesquisaTexto,
    hoje,
    amanha
  ]);

  // Ação direta única: Marcar encomenda inteira como pronta
  const handleMarcarComoPronta = async (encomendaId: string) => {
    if (!temPermissaoEdicao) return;
    const encAlvo = encomendas.find((e) => e.id === encomendaId);
    if (!encAlvo) return;

    await atualizarEstadoEncomendaDb(encomendaId, 'pronto_loja');

    await registarLogAuditoria({
      encomenda_id: encAlvo.id,
      codigo_encomenda: encAlvo.codigo,
      cliente_nome: encAlvo.cliente.nome,
      utilizador_id: currentUser.id,
      utilizador_nome: currentUser.nome,
      utilizador_role: currentUser.role,
      loja_id: encAlvo.loja_id,
      loja_nome: encAlvo.loja_nome,
      painel: 'producao',
      acao: 'Encomenda Pronta no Balcão',
      detalhes: `Fabrico concluído e embalado por ${currentUser.nome}. Pedido pronto para levantamento do cliente em ${encAlvo.loja_nome || 'loja'}.`,
    });

    setEncomendas((prev) =>
      prev.map((enc) => {
        if (enc.id !== encomendaId) return enc;
        const itensAtualizados = enc.itens.map((it) => ({
          ...it,
          estado_producao: 'pronto' as const,
        }));
        itensAtualizados.forEach((it) => {
          atualizarEstadoItemDb(it.id, 'pronto', it.notas_personalizacao);
        });

        return {
          ...enc,
          estado: 'pronto_loja',
          itens: itensAtualizados,
        };
      })
    );
  };

  // Reverter encomenda para A Produzir
  const handleReverterParaProducao = async (encomendaId: string) => {
    if (!temPermissaoEdicao) return;
    await atualizarEstadoEncomendaDb(encomendaId, 'em_producao');

    setEncomendas((prev) =>
      prev.map((enc) => {
        if (enc.id !== encomendaId) return enc;
        const itensAtualizados = enc.itens.map((it) => ({
          ...it,
          estado_producao: 'em_preparo' as const,
        }));
        itensAtualizados.forEach((it) => {
          atualizarEstadoItemDb(it.id, 'em_preparo', it.notas_personalizacao);
        });

        return {
          ...enc,
          estado: 'em_producao',
          itens: itensAtualizados,
        };
      })
    );
  };

  // Guardar observações da produção para a loja/talão/recibo
  const handleGuardarObsProducao = async (enc: Encomenda, obsTexto?: string) => {
    const textoFinal = (obsTexto !== undefined ? obsTexto : obsProducaoPorEncomenda[enc.id] ?? enc.observacoes_producao ?? '').trim();
    setSavingObsId(enc.id);
    try {
      await salvarObservacoesProducaoDb(enc.id, textoFinal, enc.notas_cliente, enc.canal_origem);
      setEncomendas((prev) =>
        prev.map((e) => (e.id === enc.id ? { ...e, observacoes_producao: textoFinal || undefined } : e))
      );
    } finally {
      setTimeout(() => setSavingObsId(null), 600);
    }
  };

  // Exportação para Excel da Folha de Produção para Levantamentos em Loja
  const exportarFolhaProducaoExcel = async () => {
    if (encomendasFiltradas.length === 0) {
      alert('Não existem encomendas para a data e loja selecionadas.');
      return;
    }

    const colunas = [
      'Hora Levantamento',
      'Data Levantamento',
      'Código Encomenda',
      'Loja de Levantamento',
      'Cliente',
      'Contacto',
      'Setor',
      'Artigo',
      'Qtd.',
      'Personalização / Notas',
      'Observações Produção',
      'Estado',
      'Visto Conclusão [  ]'
    ];

    const linhasPadaria: (string | number)[][] = [];
    const linhasPastelaria: (string | number)[][] = [];
    const totaisMap: Record<string, { setor: string; produto: string; totalQtd: number; encs: Set<string> }> = {};

    encomendasFiltradas.forEach((enc) => {
      enc.itens.forEach((item) => {
        const keyTotais = `${item.setor || 'padaria'}_${item.produto_nome}`;
        if (!totaisMap[keyTotais]) {
          totaisMap[keyTotais] = {
            setor: item.setor === 'pastelaria' ? 'Pastelaria' : 'Padaria',
            produto: item.produto_nome,
            totalQtd: 0,
            encs: new Set()
          };
        }
        totaisMap[keyTotais].totalQtd += item.quantidade;
        totaisMap[keyTotais].encs.add(enc.codigo);

        const linha = [
          enc.hora_agendamento,
          enc.data_agendamento,
          enc.codigo,
          enc.loja_nome || 'Padaria da Vila',
          enc.cliente.nome,
          enc.cliente.telefone,
          item.setor === 'pastelaria' ? 'Pastelaria' : 'Padaria',
          item.produto_nome,
          item.quantidade,
          item.notas_personalizacao || '-',
          enc.observacoes_producao || '-',
          enc.estado === 'pronto_loja' ? 'PRONTA' : 'A PRODUZIR',
          enc.estado === 'pronto_loja' ? '[ X ]' : '[   ]'
        ];

        if (item.setor === 'pastelaria') {
          linhasPastelaria.push(linha);
        } else {
          linhasPadaria.push(linha);
        }
      });
    });

    const colunasResumo = [
      'Setor',
      'Artigo',
      'Qtd Total a Produzir',
      'Total de Encomendas',
      'Encomendas',
      'Conferência [  ]'
    ];

    const linhasResumo = Object.values(totaisMap)
      .sort((a, b) => a.setor.localeCompare(b.setor) || a.produto.localeCompare(b.produto))
      .map((t) => [
        t.setor.toUpperCase(),
        t.produto,
        t.totalQtd,
        t.encs.size,
        Array.from(t.encs).join(', '),
        '[   ]'
      ]);

    const wb = XLSX.utils.book_new();
    const wsPadaria = XLSX.utils.aoa_to_sheet([colunas, ...linhasPadaria]);
    const wsPastelaria = XLSX.utils.aoa_to_sheet([colunas, ...linhasPastelaria]);
    const wsResumo = XLSX.utils.aoa_to_sheet([colunasResumo, ...linhasResumo]);

    XLSX.utils.book_append_sheet(wb, wsPadaria, 'Padaria - Loja');
    XLSX.utils.book_append_sheet(wb, wsPastelaria, 'Pastelaria - Loja');
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo Totais');

    const nomeFicheiro = `folha_producao_levantamentos_loja_${filtroPeriodo}_${hoje}.xlsx`;
    XLSX.writeFile(wb, nomeFicheiro);

    await registarLogAuditoria({
      encomenda_id: 'fabrico-exportacao',
      codigo_encomenda: 'EXP-PRODUCAO',
      cliente_nome: 'Linha de Fabrico',
      utilizador_id: currentUser.id,
      utilizador_nome: currentUser.nome,
      utilizador_role: currentUser.role,
      loja_id: selectedLojaId === 'todas' ? 'todas' : lojaAtual.id,
      loja_nome: selectedLojaId === 'todas' ? 'Todas as Lojas' : lojaAtual.nome,
      painel: 'producao',
      acao: 'Exportação Folha de Produção (Excel)',
      detalhes: `Exportação de folha de produção para levantamentos em loja (${encomendasFiltradas.length} encomendas).`,
    });
  };

  // Contadores para os filtros de conclusão
  const totalNaoConcluidas = useMemo(() => {
    return encomendasLevantamentoLoja.filter((e) => {
      const matchLoja = selectedLojaId === 'todas' || e.loja_id === selectedLojaId;
      return matchLoja && e.estado !== 'pronto_loja' && e.estado !== 'entregue' && e.estado !== 'cancelado';
    }).length;
  }, [encomendasLevantamentoLoja, selectedLojaId]);

  const totalConcluidas = useMemo(() => {
    return encomendasLevantamentoLoja.filter((e) => {
      const matchLoja = selectedLojaId === 'todas' || e.loja_id === selectedLojaId;
      return matchLoja && (e.estado === 'pronto_loja' || e.estado === 'entregue');
    }).length;
  }, [encomendasLevantamentoLoja, selectedLojaId]);

  return (
    <div className="min-h-screen flex flex-col bg-stone-100/70 font-sans selection:bg-amber-100 selection:text-amber-900">
      <Navbar selectedLojaId={selectedLojaId} onSelectLoja={setSelectedLojaId} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:px-6">
        {/* Aviso de Modo de Leitura */}
        {!temPermissaoEdicao && (
          <div className="mb-6 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-2.5 shadow-2xs">
            <Eye className="h-4 w-4 text-amber-600 shrink-0" />
            <span>{t.readOnlyNotice}</span>
          </div>
        )}

        {/* ALERTA SONORO E VISUAL DE ENCOMENDAS URGENTES (<= 3 HORAS) */}
        {encomendasUrgentes.length > 0 && (
          <div className="mb-6 rounded-3xl bg-red-600 text-white p-4 shadow-xl border-2 border-red-300 animate-pulse">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-red-400/60 pb-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-white text-red-600 shadow-xs">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-wide">
                    Alerta de Encomendas Urgentes (&le; 3 Horas para Levantamento em Loja)
                  </h3>
                  <p className="text-xs text-red-100 font-medium">
                    Existem {encomendasUrgentes.length} encomenda(s) de balcão a expirar dentro das próximas 3 horas. Conclua a produção e marque como pronta.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSomAlertaAtivo(!somAlertaAtivo)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-800 hover:bg-red-900 text-white text-xs font-bold border border-red-400 shrink-0 cursor-pointer"
              >
                {somAlertaAtivo ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                <span>{somAlertaAtivo ? 'Som Ativo (10s)' : 'Som Silenciado'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {encomendasUrgentes.map((enc) => (
                <div
                  key={enc.id}
                  className="bg-white text-stone-900 p-3.5 rounded-2xl shadow-sm border border-red-200 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        {enc.codigo}
                      </span>
                      <span className="font-black text-xs text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-flex items-center gap-1">
                        <Clock className="h-3 w-3 text-amber-700" />
                        {enc.hora_agendamento} ({enc.data_agendamento})
                      </span>
                    </div>

                    <p className="text-xs font-black text-stone-900">
                      Cliente: {enc.cliente.nome}
                    </p>
                    <p className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
                      <Store className="h-3 w-3 text-amber-600" />
                      <span>{enc.loja_nome || 'Padaria da Vila'}</span>
                    </p>

                    <div className="pt-1 border-t border-stone-100 text-xs space-y-1 max-h-24 overflow-y-auto">
                      {enc.itens.map((it) => (
                        <div key={it.id} className="flex items-center justify-between font-bold text-stone-800 text-[11px]">
                          <span className="flex items-center gap-1">
                            <SectorBadge setor={it.setor} />
                            <span>{it.quantidade}x {it.produto_nome}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {temPermissaoEdicao && (
                    <button
                      type="button"
                      onClick={() => handleMarcarComoPronta(enc.id)}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Check className="h-4 w-4" />
                      <span>Marcar como Pronta</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Barra Superior do Cockpit de Produção */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500 text-white shadow-xs">
              <ChefHat className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 leading-tight">
                {configMarca.tituloProducao || 'Cockpit de Produção'} ({selectedLojaId === 'todas' ? t.allStores : lojaAtual.nome})
              </h2>
              <p className="text-xs text-gray-500">
                Fila de fabrico exclusiva para levantamentos em loja, ordenada cronologicamente por hora de entrega
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Seletor de Loja */}
            <div className="flex items-center gap-1.5 rounded-xl bg-stone-50 border border-gray-200 px-2.5 py-1.5 shadow-2xs">
              <Store className="h-4 w-4 text-amber-600 shrink-0" />
              <select
                value={selectedLojaId}
                onChange={(e) => setSelectedLojaId(e.target.value)}
                className="bg-transparent text-xs font-bold text-gray-900 focus:outline-hidden cursor-pointer"
              >
                <option value="todas">{t.allStores}</option>
                {lojas.map((l) => (
                  <option key={l.id} value={l.id}>{l.nome}</option>
                ))}
              </select>
            </div>

            {/* Abas de Setor com BreadIcon e CakeSlice */}
            <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setSetorAtivo('todos')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  setorAtivo === 'todos'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {t.allDepartments}
              </button>
              <button
                type="button"
                onClick={() => setSetorAtivo('padaria')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  setorAtivo === 'padaria'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <BreadIcon className="h-3.5 w-3.5" />
                <span>{t.bakeryTab}</span>
              </button>
              <button
                type="button"
                onClick={() => setSetorAtivo('pastelaria')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  setorAtivo === 'pastelaria'
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <CakeSlice className="h-3.5 w-3.5" />
                <span>{t.pastryTab}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Barra de Filtros: Conclusão, Calendário, Pesquisa e Excel */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs mb-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Toggle de Conclusão: Não Concluídas vs Concluídas vs Todas */}
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setFiltroConclusao('nao_concluidas')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filtroConclusao === 'nao_concluidas'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>A Produzir ({totalNaoConcluidas})</span>
              </button>

              <button
                type="button"
                onClick={() => setFiltroConclusao('concluidas')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filtroConclusao === 'concluidas'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Prontas ({totalConcluidas})</span>
              </button>

              <button
                type="button"
                onClick={() => setFiltroConclusao('todas')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filtroConclusao === 'todas'
                    ? 'bg-stone-800 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Todas
              </button>
            </div>

            {/* Período de Fabrico */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-gray-500 mr-1 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-amber-600" />
                Período:
              </span>
              {[
                { id: 'hoje', label: 'Hoje' },
                { id: 'amanha', label: 'Amanhã' },
                { id: 'todos', label: 'Todas as Datas' },
                { id: 'personalizado', label: 'Calendário' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setFiltroPeriodo(p.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    filtroPeriodo === p.id
                      ? 'bg-stone-900 text-white shadow-2xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Exportar Excel */}
            <button
              type="button"
              onClick={exportarFolhaProducaoExcel}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition active:scale-95 cursor-pointer ml-auto"
              title="Exportar folha de produção para levantamentos em loja em Excel (.xlsx)"
            >
              <FileSpreadsheet className="h-4 w-4 shrink-0" />
              <span>Exportar Folha de Fabrico (.xlsx)</span>
            </button>
          </div>

          {/* Sub-barra: Intervalo de Datas Personalizado + Campo de Pesquisa */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-stone-100">
            {filtroPeriodo === 'personalizado' ? (
              <div className="flex flex-wrap items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                <span className="text-xs font-bold text-amber-950">Intervalo:</span>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-gray-600 font-medium">De:</span>
                  <input
                    type="date"
                    value={dataInicioPersonalizada}
                    onChange={(e) => setDataInicioPersonalizada(e.target.value)}
                    className="text-xs px-2 py-1 rounded bg-white border border-amber-300 font-medium text-gray-900"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-gray-600 font-medium">Até:</span>
                  <input
                    type="date"
                    value={dataFimPersonalizada}
                    onChange={(e) => setDataFimPersonalizada(e.target.value)}
                    className="text-xs px-2 py-1 rounded bg-white border border-amber-300 font-medium text-gray-900"
                  />
                </div>
              </div>
            ) : <div />}

            <div className="relative max-w-sm w-full">
              <Search className="h-3.5 w-3.5 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={pesquisaTexto}
                onChange={(e) => setPesquisaTexto(e.target.value)}
                placeholder="Pesquisar por cliente, código ou artigo..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* LISTA DE ENCOMENDAS ORDENADA ASCENDENTE POR DATA E HORA DE LEVANTAMENTO */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-stone-500">
              A apresentar <strong className="text-stone-900">{encomendasFiltradas.length}</strong> encomenda(s) de balcão • ordenadas estritamente por hora crescente
            </span>
          </div>

          {encomendasFiltradas.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 space-y-3">
              <ChefHat className="h-10 w-10 text-stone-300 mx-auto" />
              <h3 className="text-sm font-bold text-stone-800">
                Nenhuma encomenda de balcão encontrada
              </h3>
              <p className="text-xs text-stone-500">
                Não existem encomendas para os filtros de loja, período ou estado selecionados.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {encomendasFiltradas.map((enc) => {
                const isPronta = enc.estado === 'pronto_loja' || enc.estado === 'entregue';
                const obsAtual = obsProducaoPorEncomenda[enc.id] ?? enc.observacoes_producao ?? '';

                return (
                  <div
                    key={enc.id}
                    className={`rounded-3xl border-2 transition flex flex-col justify-between overflow-hidden shadow-xs ${
                      isPronta
                        ? 'bg-emerald-50/40 border-emerald-300'
                        : 'bg-white border-stone-200 hover:border-amber-400'
                    }`}
                  >
                    {/* Cabeçalho do Cartão */}
                    <div className={`p-4 border-b flex items-start justify-between gap-2 ${
                      isPronta ? 'bg-emerald-50/80 border-emerald-200' : 'bg-stone-50 border-stone-200'
                    }`}>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-black text-xs text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-300">
                            {enc.codigo}
                          </span>
                          <OriginBadge origem={enc.canal_origem} compact />
                        </div>
                        <h4 className="text-sm font-black text-stone-900 mt-1">
                          {enc.cliente.nome}
                        </h4>
                        <p className="text-[11px] text-stone-500 font-mono">
                          {enc.cliente.telefone}
                        </p>
                      </div>

                      <div className="text-right flex flex-col items-end gap-1.5">
                        <div className="bg-white px-2.5 py-1 rounded-xl border border-stone-200 shadow-2xs text-right">
                          <div className="flex items-center gap-1 text-xs font-black text-amber-700">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{enc.hora_agendamento}</span>
                          </div>
                          <span className="text-[10px] text-stone-400 font-medium block">
                            {enc.data_agendamento}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setEncomendaParaImprimir(enc)}
                          className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition cursor-pointer"
                          title="Imprimir talão de fabrico"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Conteúdo: Loja de Levantamento e Lista de Artigos */}
                    <div className="p-4 space-y-3 flex-1">
                      <div className="flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                        <Store className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                        <span>Levantamento: {enc.loja_nome || 'Padaria da Vila'}</span>
                      </div>

                      {enc.notas_cliente && (
                        <p className="text-[11px] text-stone-600 bg-stone-50 p-2 rounded-xl border border-stone-200 italic">
                          <span className="font-bold not-italic text-stone-700">Nota do Pedido:</span> {enc.notas_cliente}
                        </p>
                      )}

                      {/* Artigos da Encomenda */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">
                          Artigos a Confeccionar ({enc.itens.length}):
                        </span>
                        <div className="space-y-1.5">
                          {enc.itens.map((item) => (
                            <div
                              key={item.id}
                              className="p-2.5 rounded-xl bg-stone-50/70 border border-stone-200 text-xs flex items-center justify-between gap-2"
                            >
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <SectorBadge setor={item.setor} />
                                  <span className="font-black text-stone-900">
                                    {item.quantidade}x {item.produto_nome}
                                  </span>
                                </div>
                                {item.notas_personalizacao && (
                                  <span className="block text-[11px] text-amber-800 italic mt-0.5 pl-5">
                                    » {item.notas_personalizacao}
                                  </span>
                                )}
                              </div>

                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-stone-200 text-stone-600">
                                {item.setor === 'pastelaria' ? 'Pastelaria' : 'Padaria'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Campo de Observações da Produção (p/ talão e registo) */}
                      <div className="pt-2 border-t border-stone-100 space-y-1">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-stone-400">
                          Observações da Produção (visível no talão/loja):
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={obsAtual}
                            onChange={(e) =>
                              setObsProducaoPorEncomenda((prev) => ({
                                ...prev,
                                [enc.id]: e.target.value,
                              }))
                            }
                            onBlur={() => handleGuardarObsProducao(enc)}
                            placeholder="Notas de fabrico, embalagem ou lote..."
                            className="w-full px-2.5 py-1.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 focus:outline-hidden focus:border-amber-500"
                          />
                          {savingObsId === enc.id && (
                            <span className="text-[10px] text-emerald-600 font-bold shrink-0">
                              Gravado!
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Rodapé Operacional com Ação Direta Única: Marcar como Pronta */}
                    <div className="p-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-2">
                      {isPronta ? (
                        <div className="flex items-center justify-between w-full">
                          <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-xl">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Pronta no Balcão</span>
                          </span>

                          {temPermissaoEdicao && (
                            <button
                              type="button"
                              onClick={() => handleReverterParaProducao(enc.id)}
                              className="text-[11px] font-bold text-stone-500 hover:text-stone-800 underline cursor-pointer"
                            >
                              Reverter
                            </button>
                          )}
                        </div>
                      ) : (
                        temPermissaoEdicao && (
                          <button
                            type="button"
                            onClick={() => handleMarcarComoPronta(enc.id)}
                            className="w-full py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs uppercase tracking-wider shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Check className="h-4 w-4" />
                            <span>Marcar como Pronta</span>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modal de Impressão */}
      {encomendaParaImprimir && (
        <ThermalReceipt
          encomenda={encomendaParaImprimir}
          loja={lojaAtual}
          onClose={() => setEncomendaParaImprimir(null)}
        />
      )}
    </div>
  );
}
