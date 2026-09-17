'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '../../components/Navbar';
import { ThermalReceipt } from '../../components/ThermalReceipt';
import { LOJAS_MOCK } from '../../lib/mockData';
import { 
  carregarEncomendasSupabase, 
  atualizarEstadoItemDb, 
  atualizarEstadoEncomendaDb,
  registarLogAuditoria 
} from '../../lib/encomendasService';
import { Encomenda, SetorProducao, EstadoProducaoItem, TipoEntrega } from '../../types';
import { useTranslation } from '../../lib/i18n';
import { useAuth } from '../../lib/authContext';
import * as XLSX from 'xlsx';
import { 
  ChefHat, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  Sparkles, 
  Flame, 
  Store, 
  Truck,
  Eye, 
  Calendar,
  Columns,
  ListFilter,
  ArrowRight,
  RotateCcw,
  FileSpreadsheet,
  Download
} from 'lucide-react';

export default function ProducaoPage() {
  const { t } = useTranslation();
  const { podeEditar, usuario } = useAuth();
  const currentUser = usuario || { id: 'user-padeiro', nome: 'Carlos Ferreira (Chefe Padeiro)', role: 'operador_padaria' };
  const temPermissaoEdicao = podeEditar('producao');
  const [selectedLojaId, setSelectedLojaId] = useState<string>('todas');
  const [setorAtivo, setSetorAtivo] = useState<SetorProducao | 'todos'>('todos');
  const [modoVisualizacao, setModoVisualizacao] = useState<'kanban' | 'hierarquica'>('kanban');
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [encomendaParaImprimir, setEncomendaParaImprimir] = useState<Encomenda | null>(null);

  // Filtro de Calendário
  const [filtroPeriodo, setFiltroPeriodo] = useState<'hoje' | 'amanha' | 'todos' | 'personalizado'>('hoje');
  const [dataInicioPersonalizada, setDataInicioPersonalizada] = useState('');
  const [dataFimPersonalizada, setDataFimPersonalizada] = useState('');

  // Carregar encomendas reais da base de dados Supabase
  useEffect(() => {
    async function carregar() {
      const dados = await carregarEncomendasSupabase();
      setEncomendas(dados);
    }
    carregar();
  }, []);

  const lojaAtual = LOJAS_MOCK.find((l) => l.id === selectedLojaId) || LOJAS_MOCK[0];

  // Datas de referência
  const hoje = new Date().toISOString().split('T')[0];
  const dHoje = new Date();
  const dAmanha = new Date(dHoje);
  dAmanha.setDate(dHoje.getDate() + 1);
  const amanha = dAmanha.toISOString().split('T')[0];

  // Filtrar encomendas de acordo com Loja, Setor e Período de Calendário
  const encomendasFiltradas = encomendas.filter((e) => {
    // 1. Filtro de Loja
    const matchLoja = selectedLojaId === 'todas' || e.loja_id === selectedLojaId;

    // 2. Filtro de Setor (Padaria vs Pastelaria)
    const temItensDoSetor =
      setorAtivo === 'todos'
        ? true
        : e.itens.some((item) => item.setor === setorAtivo);

    // 3. Filtro Temporal / Calendário (Suporte a Período de Dias)
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

    return matchLoja && temItensDoSetor && matchData;
  });

  // Atualizar estado de produção de um item específico
  const atualizarEstadoItem = async (encomendaId: string, itemId: string, novoEstado: EstadoProducaoItem) => {
    await atualizarEstadoItemDb(itemId, novoEstado);

    const encAlvo = encomendas.find((e) => e.id === encomendaId);
    const itemAlvo = encAlvo?.itens.find((i) => i.id === itemId);
    if (encAlvo && itemAlvo) {
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
        acao: novoEstado === 'pronto' ? 'Conclusão de Artigo / Pronto' : 'Início de Fabrico de Artigo',
        detalhes: `Artigo "${itemAlvo.produto_nome}" (${itemAlvo.quantidade} un) alterado para "${novoEstado}" por ${currentUser.nome}.`,
      });
    }

    setEncomendas((prev) =>
      prev.map((enc) => {
        if (enc.id !== encomendaId) return enc;
        const novosItens = enc.itens.map((item) =>
          item.id === itemId ? { ...item, estado_producao: novoEstado } : item
        );
        const todosProntos = novosItens.every((i) => i.estado_producao === 'pronto');
        if (todosProntos) {
          atualizarEstadoEncomendaDb(encomendaId, 'pronto_loja');
        }
        return {
          ...enc,
          itens: novosItens,
          estado: todosProntos ? 'pronto_loja' : 'em_producao',
        };
      })
    );
  };

  // Mover encomenda completa no Kanban (Pendente -> Em Produção -> Pronto)
  const moverEncomendaKanban = async (encomendaId: string, novoEstadoEncomenda: 'pendente' | 'em_producao' | 'pronto_loja') => {
    const novoEstadoItens: EstadoProducaoItem = 
      novoEstadoEncomenda === 'pendente' ? 'pendente' :
      novoEstadoEncomenda === 'em_producao' ? 'em_preparo' : 'pronto';

    await atualizarEstadoEncomendaDb(encomendaId, novoEstadoEncomenda);

    const encAlvo = encomendas.find((e) => e.id === encomendaId);
    if (encAlvo) {
      const acaoDescricao = 
        novoEstadoEncomenda === 'em_producao' ? 'Início de Preparação' :
        novoEstadoEncomenda === 'pronto_loja' ? 'Conclusão de Fabrico / Pronto' : 'Retorno a Pendente';

      const detalheDescricao = 
        novoEstadoEncomenda === 'em_producao'
          ? `Iniciado o fabrico dos artigos no forno/cozinha por ${currentUser.nome}.`
          : novoEstadoEncomenda === 'pronto_loja'
          ? `Fabrico concluído e embalado por ${currentUser.nome}. Pedido pronto para expedição/balcão.`
          : `Estado da encomenda devolvido a pendente por ${currentUser.nome}.`;

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
        acao: acaoDescricao,
        detalhes: detalheDescricao,
      });
    }

    setEncomendas((prev) =>
      prev.map((enc) => {
        if (enc.id !== encomendaId) return enc;
        const itensAtualizados = enc.itens.map((it) => ({
          ...it,
          estado_producao: novoEstadoItens,
        }));
        // Atualizar também na BD os itens
        itensAtualizados.forEach((it) => atualizarEstadoItemDb(it.id, novoEstadoItens));

        return {
          ...enc,
          estado: novoEstadoEncomenda,
          itens: itensAtualizados,
        };
      })
    );
  };

  // Exportação para Excel da Folha de Produção (separada por Padaria e Pastelaria)
  const exportarFolhaProducaoExcel = async () => {
    // 1. Obter encomendas que cumprem o filtro temporal e de loja selecionados
    const encomendasParaExportar = encomendas.filter((e) => {
      const matchLoja = selectedLojaId === 'todas' || e.loja_id === selectedLojaId;

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
      return matchLoja && matchData;
    });

    if (encomendasParaExportar.length === 0) {
      alert('Não existem encomendas para a data e loja selecionadas.');
      return;
    }

    // 2. Ordenar cronologicamente por hora de agendamento e código
    const encomendasOrdenadas = [...encomendasParaExportar].sort((a, b) => {
      const compData = a.data_agendamento.localeCompare(b.data_agendamento);
      if (compData !== 0) return compData;
      const compHora = a.hora_agendamento.localeCompare(b.hora_agendamento);
      if (compHora !== 0) return compHora;
      return a.codigo.localeCompare(b.codigo);
    });

    // 3. Preparar Linhas para Folha de Padaria
    const colunasPadaria = [
      'Hora Agendada',
      'Código Encomenda',
      'Cliente',
      'Contacto',
      'Destino / Modalidade',
      'Artigo de Padaria',
      'Qtd.',
      'Personalização / Notas de Fabrico',
      'Observações Gerais',
      'Estado Atual',
      'Conferência [  ]'
    ];

    const linhasPadaria: (string | number)[][] = [];

    // 4. Preparar Linhas para Folha de Pastelaria
    const colunasPastelaria = [
      'Hora Agendada',
      'Código Encomenda',
      'Cliente',
      'Contacto',
      'Destino / Modalidade',
      'Artigo de Pastelaria',
      'Qtd.',
      'Personalização / Mensagem de Bolo',
      'Observações Gerais',
      'Estado Atual',
      'Conferência [  ]'
    ];

    const linhasPastelaria: (string | number)[][] = [];

    // Mapa para Resumo Consolidado de Totais a Produzir
    const totaisMap: Record<string, { setor: string; produto: string; totalQtd: number; encs: Set<string> }> = {};

    encomendasOrdenadas.forEach((enc) => {
      const modalidadeDestino =
        enc.tipo === 'levantamento_loja'
          ? `Loja: ${enc.loja_nome || 'Balcão'}`
          : `Domicílio: ${enc.carrinha_nome || 'Carrinha'}${enc.cliente.morada ? ` (${enc.cliente.morada})` : ''}`;

      enc.itens.forEach((item) => {
        const estadoTraduzido =
          item.estado_producao === 'pronto'
            ? 'PRONTO'
            : item.estado_producao === 'em_preparo'
            ? 'EM PREPARAÇÃO'
            : 'PENDENTE';

        // Resumo de totais
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

        if (item.setor === 'pastelaria') {
          linhasPastelaria.push([
            enc.hora_agendamento,
            enc.codigo,
            enc.cliente.nome,
            enc.cliente.telefone,
            modalidadeDestino,
            item.produto_nome,
            item.quantidade,
            item.notas_personalizacao || '-',
            enc.notas_cliente || '-',
            estadoTraduzido,
            '[   ]'
          ]);
        } else {
          // Padaria (ou default)
          linhasPadaria.push([
            enc.hora_agendamento,
            enc.codigo,
            enc.cliente.nome,
            enc.cliente.telefone,
            modalidadeDestino,
            item.produto_nome,
            item.quantidade,
            item.notas_personalizacao || '-',
            enc.notas_cliente || '-',
            estadoTraduzido,
            '[   ]'
          ]);
        }
      });
    });

    // 5. Preparar Linhas para Resumo Consolidado de Fabrico
    const colunasResumo = [
      'Setor de Fabrico',
      'Artigo a Produzir',
      'Quantidade Total',
      'Total de Encomendas',
      'Encomendas a Atender',
      'Visto Conclusão [  ]'
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

    // 6. Construir Workbook com Folhas
    const wb = XLSX.utils.book_new();

    const colWidths = [
      { wch: 14 }, // Hora
      { wch: 18 }, // Código
      { wch: 26 }, // Cliente
      { wch: 14 }, // Contacto
      { wch: 32 }, // Destino
      { wch: 28 }, // Artigo
      { wch: 8 },  // Qtd
      { wch: 35 }, // Personalização
      { wch: 25 }, // Obs Gerais
      { wch: 16 }, // Estado
      { wch: 18 }  // Visto
    ];

    // Folha 1: Linha Padaria
    const wsPadaria = XLSX.utils.aoa_to_sheet([colunasPadaria, ...linhasPadaria]);
    wsPadaria['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, wsPadaria, 'Linha Padaria');

    // Folha 2: Linha Pastelaria
    const wsPastelaria = XLSX.utils.aoa_to_sheet([colunasPastelaria, ...linhasPastelaria]);
    wsPastelaria['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, wsPastelaria, 'Linha Pastelaria');

    // Folha 3: Resumo Consolidado de Fabrico
    const wsResumo = XLSX.utils.aoa_to_sheet([colunasResumo, ...linhasResumo]);
    wsResumo['!cols'] = [
      { wch: 18 }, // Setor
      { wch: 32 }, // Artigo
      { wch: 18 }, // Total Qtd
      { wch: 20 }, // Total Encs
      { wch: 45 }, // Códigos
      { wch: 20 }  // Visto
    ];
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo Totais Fabrico');

    // 7. Nome do Ficheiro
    let periodoTexto = hoje;
    if (filtroPeriodo === 'amanha') periodoTexto = amanha;
    else if (filtroPeriodo === 'personalizado') {
      periodoTexto = `${dataInicioPersonalizada || 'inicio'}_a_${dataFimPersonalizada || 'fim'}`;
    } else if (filtroPeriodo === 'todos') {
      periodoTexto = 'todas_as_datas';
    }

    const lojaStr =
      selectedLojaId === 'todas'
        ? 'todas_lojas'
        : (lojaAtual.nome || 'loja').toLowerCase().replace(/\s+/g, '_');

    const nomeFicheiro = `folha_producao_${periodoTexto}_${lojaStr}.xlsx`;
    XLSX.writeFile(wb, nomeFicheiro);

    // 8. Registar Log de Auditoria
    await registarLogAuditoria({
      encomenda_id: 'fabrico-exportacao',
      codigo_encomenda: 'EXP-FABRICO',
      cliente_nome: 'Linha de Fabrico',
      utilizador_id: currentUser.id,
      utilizador_nome: currentUser.nome,
      utilizador_role: currentUser.role,
      loja_id: selectedLojaId === 'todas' ? 'todas' : lojaAtual.id,
      loja_nome: selectedLojaId === 'todas' ? 'Todas as Lojas' : lojaAtual.nome,
      painel: 'producao',
      acao: 'Exportação Folha de Fabrico (Excel)',
      detalhes: `Exportação de folha de produção para o período "${periodoTexto}" (${linhasPadaria.length} itens padaria, ${linhasPastelaria.length} itens pastelaria) gerada para entrega em papel à linha de fabrico.`,
    });
  };

  // Separação para as 3 colunas táteis do Kanban
  const kanbanPorPreparar = encomendasFiltradas.filter(
    (e) => e.estado === 'pendente'
  );
  const kanbanEmPreparacao = encomendasFiltradas.filter(
    (e) => e.estado === 'em_producao'
  );
  const kanbanPronto = encomendasFiltradas.filter(
    (e) => e.estado === 'pronto_loja' || e.estado === 'em_rota' || e.estado === 'entregue'
  );

  return (
    <div className="min-h-screen flex flex-col bg-stone-100/70">
      <Navbar selectedLojaId={selectedLojaId} onSelectLoja={setSelectedLojaId} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:px-6">
        {/* Aviso de Modo de Leitura */}
        {!temPermissaoEdicao && (
          <div className="mb-6 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-2.5 shadow-2xs">
            <Eye className="h-4 w-4 text-amber-600 shrink-0" />
            <span>{t.readOnlyNotice}</span>
          </div>
        )}

        {/* Barra Superior do Painel de Produção */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500 text-white shadow-xs">
              <ChefHat className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 leading-tight">
                Painel de Produção ({selectedLojaId === 'todas' ? t.allStores : lojaAtual.nome})
              </h2>
              <p className="text-xs text-gray-500">
                Fila de fabrico com visualização Kanban e hierárquica por tipo e loja
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle de Modo de Visualização */}
            <div className="flex bg-stone-100 p-1 rounded-xl font-bold text-xs">
              <button
                type="button"
                onClick={() => setModoVisualizacao('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  modoVisualizacao === 'kanban'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Columns className="h-3.5 w-3.5 text-amber-600" />
                Quadro Kanban
              </button>
              <button
                type="button"
                onClick={() => setModoVisualizacao('hierarquica')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  modoVisualizacao === 'hierarquica'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <ListFilter className="h-3.5 w-3.5 text-amber-600" />
                Vista Hierárquica
              </button>
            </div>

            {/* Abas de Setor: Padaria vs Pastelaria */}
            <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setSetorAtivo('todos')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  setorAtivo === 'todos'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {t.allDepartments}
              </button>
              <button
                onClick={() => setSetorAtivo('padaria')}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  setorAtivo === 'padaria'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Flame className="h-3 w-3" />
                {t.bakeryTab}
              </button>
              <button
                onClick={() => setSetorAtivo('pastelaria')}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  setorAtivo === 'pastelaria'
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Sparkles className="h-3 w-3" />
                {t.pastryTab}
              </button>
            </div>
          </div>
        </div>

        {/* Barra de Filtro de Calendário */}
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-600 flex items-center gap-1.5 mr-1">
              <Calendar className="h-4 w-4 text-amber-600" />
              Período de Fabrico:
            </span>
            {[
              { id: 'hoje', label: 'Hoje' },
              { id: 'amanha', label: 'Amanhã' },
              { id: 'todos', label: 'Todas as Datas' },
              { id: 'personalizado', label: 'Calendário Específico' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setFiltroPeriodo(p.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  filtroPeriodo === p.id
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-stone-100 text-gray-700 hover:bg-stone-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {filtroPeriodo === 'personalizado' && (
            <div className="flex flex-wrap items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
              <span className="text-xs font-bold text-amber-950">Período:</span>
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
              {(dataInicioPersonalizada || dataFimPersonalizada) && (
                <button
                  type="button"
                  onClick={() => {
                    setDataInicioPersonalizada('');
                    setDataFimPersonalizada('');
                  }}
                  className="text-[11px] text-amber-800 hover:text-red-700 underline font-bold ml-1"
                >
                  Limpar
                </button>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <div className="text-xs font-bold text-gray-500">
              Total: <span className="text-amber-700 font-black">{encomendasFiltradas.length}</span> encomenda(s)
            </div>

            {/* Botão de Exportação para Linha de Fabrico (Excel) */}
            <button
              type="button"
              onClick={exportarFolhaProducaoExcel}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition active:scale-95 cursor-pointer"
              title="Exportar folha de produção em Excel com separadores independentes para Padaria e Pastelaria para entrega em papel na fábrica"
            >
              <FileSpreadsheet className="h-4 w-4 shrink-0" />
              <span>Exportar Linha de Fabrico (Excel)</span>
            </button>
          </div>
        </div>

        {/* ---------------- VISTA 1: QUADRO KANBAN (3 COLUNAS) ---------------- */}
        {modoVisualizacao === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* COLUNA 1: POR PREPARAR (Pendente) */}
            <div className="flex flex-col rounded-3xl bg-stone-200/60 p-4 border border-stone-300 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-stone-300 mb-3">
                <div className="flex items-center gap-2 font-black text-xs text-stone-800 uppercase tracking-wider">
                  <span className="h-3 w-3 rounded-full bg-stone-400"></span>
                  <span>1. Por Preparar</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-stone-300 font-mono text-xs font-black text-stone-700">
                  {kanbanPorPreparar.length}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[75vh] pr-1">
                {kanbanPorPreparar.length === 0 ? (
                  <div className="text-center py-8 text-stone-400 text-xs italic">
                    Sem encomendas pendentes de início.
                  </div>
                ) : (
                  kanbanPorPreparar.map((enc) => (
                    <div key={enc.id} className="bg-white p-3.5 rounded-2xl border border-stone-300 shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-xs text-gray-900">{enc.codigo}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                          {enc.hora_agendamento}
                        </span>
                      </div>

                      <p className="font-bold text-xs text-gray-800">{enc.cliente.nome}</p>

                      <div className="bg-stone-50 p-2 rounded-xl border border-stone-100 space-y-1">
                        {enc.itens.map((it) => (
                          <div key={it.id} className="text-[11px] flex justify-between">
                            <span className="font-semibold text-gray-700">{it.produto_nome}</span>
                            <span className="font-mono font-bold text-amber-700">{it.quantidade}x</span>
                          </div>
                        ))}
                      </div>

                      {temPermissaoEdicao && (
                        <button
                          type="button"
                          onClick={() => moverEncomendaKanban(enc.id, 'em_producao')}
                          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-xs transition"
                        >
                          <span>Iniciar Preparação 👨‍🍳</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* COLUNA 2: EM PREPARAÇÃO (Forno / Bancada) */}
            <div className="flex flex-col rounded-3xl bg-amber-50/80 p-4 border border-amber-200 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-amber-200 mb-3">
                <div className="flex items-center gap-2 font-black text-xs text-amber-900 uppercase tracking-wider">
                  <span className="h-3 w-3 rounded-full bg-amber-500 animate-pulse"></span>
                  <span>2. Em Preparação</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-200 font-mono text-xs font-black text-amber-800">
                  {kanbanEmPreparacao.length}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[75vh] pr-1">
                {kanbanEmPreparacao.length === 0 ? (
                  <div className="text-center py-8 text-amber-700/60 text-xs italic">
                    Nenhuma encomenda atualmente em forno/preparo.
                  </div>
                ) : (
                  kanbanEmPreparacao.map((enc) => (
                    <div key={enc.id} className="bg-white p-3.5 rounded-2xl border border-amber-300 shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-xs text-amber-900">{enc.codigo}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          {enc.hora_agendamento}
                        </span>
                      </div>

                      <p className="font-bold text-xs text-gray-800">{enc.cliente.nome}</p>

                      <div className="space-y-1.5">
                        {enc.itens.map((it) => (
                          <div
                            key={it.id}
                            className={`p-2 rounded-xl text-[11px] flex items-center justify-between border ${
                              it.estado_producao === 'pronto'
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                : 'bg-stone-50 border-stone-200 text-stone-800'
                            }`}
                          >
                            <span>{it.quantidade}x {it.produto_nome}</span>
                            {temPermissaoEdicao && (
                              <button
                                type="button"
                                onClick={() =>
                                  atualizarEstadoItem(
                                    enc.id,
                                    it.id,
                                    it.estado_producao === 'pronto' ? 'em_preparo' : 'pronto'
                                  )
                                }
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                                  it.estado_producao === 'pronto'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-stone-200 hover:bg-stone-300 text-stone-700'
                                }`}
                              >
                                {it.estado_producao === 'pronto' ? '✓ Pronto' : 'Marcar'}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {temPermissaoEdicao && (
                        <div className="flex gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => moverEncomendaKanban(enc.id, 'pendente')}
                            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600"
                            title="Recuar para Por Preparar"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moverEncomendaKanban(enc.id, 'pronto_loja')}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Marcar Tudo Pronto</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* COLUNA 3: PRONTO A SER LEVANTADO / EXPEDIDO */}
            <div className="flex flex-col rounded-3xl bg-emerald-50/80 p-4 border border-emerald-200 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-200 mb-3">
                <div className="flex items-center gap-2 font-black text-xs text-emerald-900 uppercase tracking-wider">
                  <span className="h-3 w-3 rounded-full bg-emerald-600"></span>
                  <span>3. Pronto / Expedição</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-200 font-mono text-xs font-black text-emerald-800">
                  {kanbanPronto.length}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[75vh] pr-1">
                {kanbanPronto.length === 0 ? (
                  <div className="text-center py-8 text-emerald-700/60 text-xs italic">
                    Nenhuma encomenda na zona de expedição ou pronta.
                  </div>
                ) : (
                  kanbanPronto.map((enc) => (
                    <div key={enc.id} className="bg-white p-3.5 rounded-2xl border border-emerald-300 shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-xs text-emerald-900">{enc.codigo}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                          {enc.tipo === 'entrega_domicilio' ? 'Carrinha' : 'Balcão'}
                        </span>
                      </div>

                      <p className="font-bold text-xs text-gray-800">{enc.cliente.nome}</p>

                      <div className="bg-emerald-50/60 p-2 rounded-xl border border-emerald-100 text-[11px] space-y-0.5">
                        <span className="font-bold text-emerald-900 block">
                          {enc.itens.reduce((acc, i) => acc + i.quantidade, 0)} unidades concluídas
                        </span>
                        <span className="text-gray-500">Agendado: {enc.hora_agendamento}</span>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setEncomendaParaImprimir(enc)}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>Talão</span>
                        </button>
                        {temPermissaoEdicao && (
                          <button
                            type="button"
                            onClick={() => moverEncomendaKanban(enc.id, 'em_producao')}
                            className="p-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600"
                            title="Recuar para Em Preparação"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ---------------- VISTA 2: HIERÁRQUICA (TIPO -> LOJA -> ASCENDENTE HORA) ---------------- */}
        {modoVisualizacao === 'hierarquica' && (
          <div className="space-y-8">
            {(['levantamento_loja', 'entrega_domicilio'] as TipoEntrega[]).map((tipo) => {
              const encomendasDoTipo = encomendasFiltradas.filter((e) => e.tipo === tipo);
              if (encomendasDoTipo.length === 0) return null;

              // Agrupar por Loja
              const lojasMap = new Map<string, Encomenda[]>();
              for (const enc of encomendasDoTipo) {
                const lNome = enc.loja_nome || 'Padaria da Vila (Arouca)';
                if (!lojasMap.has(lNome)) {
                  lojasMap.set(lNome, []);
                }
                lojasMap.get(lNome)!.push(enc);
              }

              return (
                <div key={tipo} className="space-y-4">
                  {/* Cabeçalho do Formato de Entrega */}
                  <div className={`p-4 rounded-2xl flex items-center justify-between border ${
                    tipo === 'levantamento_loja'
                      ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                      : 'bg-blue-50/90 border-blue-200 text-blue-950'
                  }`}>
                    <div className="flex items-center gap-2.5 font-black text-sm">
                      {tipo === 'levantamento_loja' ? (
                        <>
                          <Store className="h-5 w-5 text-emerald-700" />
                          <span>PRODUÇÃO PARA LEVANTAMENTO EM LOJA</span>
                        </>
                      ) : (
                        <>
                          <Truck className="h-5 w-5 text-blue-700" />
                          <span>PRODUÇÃO PARA ENTREGA AO DOMICÍLIO (FROTA)</span>
                        </>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white font-bold border border-current opacity-80">
                        {encomendasDoTipo.length} encomenda(s)
                      </span>
                    </div>
                  </div>

                  {/* Agrupamento por Loja */}
                  {Array.from(lojasMap.entries()).map(([nomeLoja, pedidosLoja]) => {
                    // Ordenação estrita crescente por data e hora de agendamento
                    const pedidosOrdenados = [...pedidosLoja].sort((a, b) => {
                      const dtA = `${a.data_agendamento} ${a.hora_agendamento}`;
                      const dtB = `${b.data_agendamento} ${b.hora_agendamento}`;
                      return dtA.localeCompare(dtB);
                    });

                    return (
                      <div key={nomeLoja} className="pl-2 sm:pl-4 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-700 border-b border-gray-200 pb-1.5">
                          <span className="h-2 w-2 rounded-full bg-amber-600"></span>
                          <span>{nomeLoja}</span>
                          <span className="text-[11px] text-gray-500 font-normal">
                            ({pedidosOrdenados.length} pedidos • ordenados por hora crescente de entrega)
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                          {pedidosOrdenados.map((enc) => (
                            <div
                              key={enc.id}
                              className="rounded-2xl bg-white border-2 border-stone-200 shadow-sm overflow-hidden flex flex-col justify-between"
                            >
                              <div className="bg-stone-800 text-white p-3.5 flex items-center justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-black text-sm text-amber-400">{enc.codigo}</span>
                                    <span className="text-xs bg-stone-700 px-2 py-0.5 rounded-md font-medium text-stone-200">
                                      #{enc.numero_sequencial}
                                    </span>
                                  </div>
                                  <p className="text-xs font-bold text-white mt-0.5">{enc.cliente.nome}</p>
                                </div>

                                <div className="text-right flex items-center gap-2">
                                  <div className="bg-stone-700 px-2.5 py-1 rounded-lg border border-stone-600 text-right">
                                    <div className="flex items-center gap-1 text-xs font-bold text-amber-300">
                                      <Clock className="h-3.5 w-3.5" />
                                      <span>{enc.hora_agendamento}</span>
                                    </div>
                                    <span className="text-[10px] text-stone-300 block">{enc.data_agendamento}</span>
                                  </div>

                                  <button
                                    onClick={() => setEncomendaParaImprimir(enc)}
                                    className="p-1.5 rounded-lg bg-stone-700 hover:bg-stone-600 text-white transition"
                                    title="Imprimir talão de produção"
                                  >
                                    <Printer className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>

                              <div className="p-4 space-y-3 flex-1 bg-stone-50/50">
                                {enc.itens.map((item) => (
                                  <div
                                    key={item.id}
                                    className={`p-3 rounded-xl border transition ${
                                      item.estado_producao === 'pronto'
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 opacity-80'
                                        : item.estado_producao === 'em_preparo'
                                        ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-xs'
                                        : 'bg-white border-stone-200 text-stone-900'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <span className="text-xs font-black text-stone-500 uppercase block mb-0.5">
                                          {item.setor === 'padaria' ? `🥖 ${t.bakeryTab}` : `🎂 ${t.pastryTab}`}
                                        </span>
                                        <h4 className="text-sm font-black text-gray-900 leading-tight">
                                          <span className="text-amber-700 mr-1.5">{item.quantidade}x</span>
                                          {item.produto_nome}
                                        </h4>
                                      </div>

                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                                        item.estado_producao === 'pronto'
                                          ? 'bg-emerald-200 text-emerald-900 border-emerald-400'
                                          : item.estado_producao === 'em_preparo'
                                          ? 'bg-amber-200 text-amber-900 border-amber-400'
                                          : 'bg-stone-200 text-stone-700 border-stone-300'
                                      }`}>
                                        {item.estado_producao === 'pronto' ? t.readyPrep : item.estado_producao === 'em_preparo' ? t.inPrep : t.pendingPrep}
                                      </span>
                                    </div>

                                    {item.notas_personalizacao && (
                                      <div className="mt-2 p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-950 flex items-start gap-1.5">
                                        <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                                        <div>
                                          <span className="font-black text-[11px] uppercase block tracking-wider text-red-800">
                                            {t.customizationNotes}
                                          </span>
                                          <p className="font-bold">{item.notas_personalizacao}</p>
                                        </div>
                                      </div>
                                    )}

                                    <div className="mt-3 flex items-center justify-end gap-2 pt-2 border-t border-stone-200/60">
                                      {temPermissaoEdicao ? (
                                        <>
                                          {item.estado_producao === 'pendente' && (
                                            <button
                                              onClick={() => atualizarEstadoItem(enc.id, item.id, 'em_preparo')}
                                              className="rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition cursor-pointer"
                                            >
                                              Iniciar Preparação
                                            </button>
                                          )}
                                          {item.estado_producao === 'em_preparo' && (
                                            <button
                                              onClick={() => atualizarEstadoItem(enc.id, item.id, 'pronto')}
                                              className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition flex items-center gap-1 cursor-pointer"
                                            >
                                              <CheckCircle2 className="h-3.5 w-3.5" /> Marcar Pronto
                                            </button>
                                          )}
                                          {item.estado_producao === 'pronto' && (
                                            <div className="flex items-center gap-2">
                                              <span className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                                                <CheckCircle2 className="h-4 w-4" /> Pronto na Bancada
                                              </span>
                                              <button
                                                onClick={() => atualizarEstadoItem(enc.id, item.id, 'pendente')}
                                                className="text-[10px] text-gray-400 hover:text-gray-600 underline cursor-pointer"
                                                title="Reverter estado para pendente"
                                              >
                                                (reverter)
                                              </button>
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        <span className="text-xs font-bold text-stone-500">
                                          {item.estado_producao === 'pronto' ? '✓ Pronto na Bancada' : item.estado_producao === 'em_preparo' ? 'Em Preparação' : 'Pendente'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="p-3 bg-stone-100 border-t border-stone-200 flex items-center justify-between text-xs text-stone-600">
                                <span className="font-semibold">
                                  Destino: {enc.tipo === 'entrega_domicilio' ? 'Carrinha de Entrega' : 'Balcão de Loja'}
                                </span>
                                <span className="font-bold text-stone-800">
                                  {enc.itens.filter((i) => i.estado_producao === 'pronto').length} / {enc.itens.length} Concluídos
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
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
