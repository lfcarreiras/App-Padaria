'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from '../../components/Navbar';
import { ThermalReceipt } from '../../components/ThermalReceipt';
import { LOJAS_MOCK, PRODUTOS_MOCK } from '../../lib/mockData';
import { 
  carregarEncomendasSupabase, 
  carregarLojasSupabase,
  carregarProdutosSupabase,
  carregarBaseFixaCarrinhas,
  carregarClientesEmpresariaisB2B,
  obterDiaSemanaDeData,
  atualizarEstadoItemDb, 
  atualizarEstadoEncomendaDb,
  salvarObservacoesProducaoDb,
  gerarLinkWhatsAppDecisaoEncomenda,
  registarLogAuditoria 
} from '../../lib/encomendasService';
import { 
  Encomenda, 
  SetorProducao, 
  EstadoProducaoItem, 
  TipoEntrega, 
  Loja, 
  Produto,
  BaseFixaCarrinha,
  ClienteEmpresarialB2B,
  CartaoFornoProducao,
  RegistoFornada
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
  Download,
  Phone,
  MessageSquare,
  Globe,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  Play,
  Check
} from 'lucide-react';

const FORNOS_STORAGE_KEY = 'padaria_fornos_producao_v1';
const PRODUZIDO_DIA_STORAGE_KEY = 'padaria_produzido_dia_v1';
const URGENTES_ACEITES_STORAGE_KEY = 'padaria_encomendas_urgentes_aceites_v1';

const FORNOS_INICIAIS: CartaoFornoProducao[] = [
  { id: 'forno-1', nome: 'Forno 1', estado: 'livre', itens: [], historico_fornadas: [] },
  { id: 'forno-2', nome: 'Forno 2', estado: 'livre', itens: [], historico_fornadas: [] },
  { id: 'forno-3', nome: 'Forno 3', estado: 'livre', itens: [], historico_fornadas: [] },
];

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
  const [modoVisualizacao, setModoVisualizacao] = useState<'kanban' | 'hierarquica'>('kanban');
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [encomendaParaImprimir, setEncomendaParaImprimir] = useState<Encomenda | null>(null);

  // Carga Base das Carrinhas (1 a 4 Particulares + 5º Carro B2B)
  const [baseFixaCarrinhas, setBaseFixaCarrinhas] = useState<BaseFixaCarrinha[]>([]);
  const [clientesB2B, setClientesB2B] = useState<ClienteEmpresarialB2B[]>([]);
  const [incluirCargaCarrinhasNoPool, setIncluirCargaCarrinhasNoPool] = useState<boolean>(true);

  // Estado dos 3 Fornos e Quantidades Produzidas
  const [fornos, setFornos] = useState<CartaoFornoProducao[]>(FORNOS_INICIAIS);
  const [produzidoPorProduto, setProduzidoPorProduto] = useState<Record<string, number>>({});
  const [selecaoManualForno, setSelecaoManualForno] = useState<Record<string, { produto_id: string; quantidade: number }>>({
    'forno-1': { produto_id: '', quantidade: 20 },
    'forno-2': { produto_id: '', quantidade: 20 },
    'forno-3': { produto_id: '', quantidade: 20 },
  });
  const [nowTick, setNowTick] = useState<number>(Date.now());

  // Alerta Sonoro e Visual de Encomendas Urgentes (< 3 horas)
  const [encomendasUrgentesAceites, setEncomendasUrgentesAceites] = useState<string[]>([]);
  const [somAlertaAtivo, setSomAlertaAtivo] = useState<boolean>(true);
  const [obsProducaoPorEncomenda, setObsProducaoPorEncomenda] = useState<Record<string, string>>({});
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Filtro de Calendário
  const [filtroPeriodo, setFiltroPeriodo] = useState<'hoje' | 'amanha' | 'todos' | 'personalizado'>('hoje');
  const [dataInicioPersonalizada, setDataInicioPersonalizada] = useState('');
  const [dataFimPersonalizada, setDataFimPersonalizada] = useState('');

  // Carregar encomendas reais da base de dados Supabase + Configuração de Fornos e Rotas
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
      setBaseFixaCarrinhas(carregarBaseFixaCarrinhas());
      setClientesB2B(carregarClientesEmpresariaisB2B());

      if (typeof window !== 'undefined') {
        try {
          const rawFornos = localStorage.getItem(FORNOS_STORAGE_KEY);
          if (rawFornos) {
            const parsed = JSON.parse(rawFornos);
            if (Array.isArray(parsed) && parsed.length === 3) {
              setFornos(
                parsed.map((f: any, idx: number) => ({
                  ...FORNOS_INICIAIS[idx],
                  ...f,
                  itens: Array.isArray(f?.itens) ? f.itens : [],
                  historico_fornadas: Array.isArray(f?.historico_fornadas) ? f.historico_fornadas : [],
                }))
              );
            }
          }
          const rawProd = localStorage.getItem(PRODUZIDO_DIA_STORAGE_KEY);
          if (rawProd) {
            const parsedProd = JSON.parse(rawProd);
            if (parsedProd && typeof parsedProd === 'object') setProduzidoPorProduto(parsedProd);
          }
          const rawAceites = localStorage.getItem(URGENTES_ACEITES_STORAGE_KEY);
          if (rawAceites) {
            const parsedAceites = JSON.parse(rawAceites);
            if (Array.isArray(parsedAceites)) setEncomendasUrgentesAceites(parsedAceites);
          }
        } catch {
          // ignore
        }
      }
    }
    carregar();
  }, []);

  // Relógio em tempo real para cronómetros dos 3 Fornos e verificação de 3h
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Persistir estado dos Fornos e Produzidos
  const atualizarFornos = (novos: CartaoFornoProducao[]) => {
    setFornos(novos);
    if (typeof window !== 'undefined') {
      localStorage.setItem(FORNOS_STORAGE_KEY, JSON.stringify(novos));
    }
  };

  const atualizarProduzido = (novoMapa: Record<string, number>) => {
    setProduzidoPorProduto(novoMapa);
    if (typeof window !== 'undefined') {
      localStorage.setItem(PRODUZIDO_DIA_STORAGE_KEY, JSON.stringify(novoMapa));
    }
  };

  const lojaAtual = lojas.find((l) => l.id === selectedLojaId) || lojas[0] || LOJAS_MOCK[0];

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

  // Atualizar estado de produção de um item específico (Aceitar p/ Produção, Marcar Pronto ou Recusar/Não Produzir)
  const atualizarEstadoItem = async (encomendaId: string, itemId: string, novoEstado: EstadoProducaoItem) => {
    const encAlvo = encomendas.find((e) => e.id === encomendaId);
    const itemAlvo = encAlvo?.itens.find((i) => i.id === itemId);

    await atualizarEstadoItemDb(itemId, novoEstado, itemAlvo?.notas_personalizacao);

    if (encAlvo && itemAlvo) {
      const acaoTexto =
        novoEstado === 'pronto'
          ? 'Conclusão de Artigo / Pronto'
          : novoEstado === 'recusado'
          ? 'Artigo Recusado / Não Produzido'
          : 'Aceitação / Início de Fabrico de Artigo';

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
        acao: acaoTexto,
        detalhes: `Artigo "${itemAlvo.produto_nome}" (${itemAlvo.quantidade} un) alterado para "${novoEstado}" por ${currentUser.nome}.`,
      });
    }

    setEncomendas((prev) =>
      prev.map((enc) => {
        if (enc.id !== encomendaId) return enc;
        const novosItens = enc.itens.map((item) =>
          item.id === itemId ? { ...item, estado_producao: novoEstado } : item
        );

        const itensNaoRecusados = novosItens.filter((i) => i.estado_producao !== 'recusado');
        const todosRecusados = novosItens.length > 0 && itensNaoRecusados.length === 0;
        const todosValidosProntos =
          itensNaoRecusados.length > 0 && itensNaoRecusados.every((i) => i.estado_producao === 'pronto');
        const algumEmProducao = itensNaoRecusados.some(
          (i) => i.estado_producao === 'em_preparo' || i.estado_producao === 'pronto'
        );

        const novoEstadoEnc = todosRecusados
          ? 'cancelado'
          : todosValidosProntos
          ? 'pronto_loja'
          : algumEmProducao
          ? 'em_producao'
          : 'pendente';

        if (novoEstadoEnc !== enc.estado) {
          atualizarEstadoEncomendaDb(encomendaId, novoEstadoEnc);
        }

        return {
          ...enc,
          itens: novosItens,
          estado: novoEstadoEnc,
        };
      })
    );
  };

  // Guardar observações da produção para o cliente (visível na App do Cliente e enviada no WhatsApp)
  const handleGuardarObsProducao = async (enc: Encomenda, obsTexto?: string) => {
    const textoFinal = (obsTexto !== undefined ? obsTexto : obsProducaoPorEncomenda[enc.id] ?? enc.observacoes_producao ?? '').trim();
    await salvarObservacoesProducaoDb(enc.id, textoFinal, enc.notas_cliente, enc.canal_origem);
    setEncomendas((prev) =>
      prev.map((e) => (e.id === enc.id ? { ...e, observacoes_producao: textoFinal || undefined } : e))
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
        const itensAtualizados = enc.itens.map((it) =>
          it.estado_producao === 'recusado'
            ? it
            : {
                ...it,
                estado_producao: novoEstadoItens,
              }
        );
        // Atualizar também na BD apenas os itens que não foram recusados, preservando notas_personalizacao
        itensAtualizados.forEach((it) => {
          if (it.estado_producao !== 'recusado') {
            atualizarEstadoItemDb(it.id, novoEstadoItens, it.notas_personalizacao);
          }
        });

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
      'Canal Origem',
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
      'Canal Origem',
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

      const canalTexto =
        enc.canal_origem === 'site_online' ? 'Site Online' :
        enc.canal_origem === 'whatsapp' ? 'WhatsApp' :
        enc.canal_origem === 'telefone' ? 'Telefone' : 'Presencial';

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
            canalTexto,
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
            canalTexto,
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

  // ---------------------------------------------------------------------------
  // ALERTA SONORO E VISUAL DE ENCOMENDAS URGENTES (< 3 HORAS)
  // ---------------------------------------------------------------------------
  const encomendasUrgentesParaAceitar = encomendas.filter((e) => {
    if (e.estado === 'entregue' || e.estado === 'pronto_loja' || e.estado === 'em_rota') return false;
    if (encomendasUrgentesAceites.includes(e.id)) return false;
    const dataHoraStr = `${e.data_agendamento}T${e.hora_agendamento || '10:00'}:00`;
    const tsAgendado = new Date(dataHoraStr).getTime();
    if (isNaN(tsAgendado)) return false;
    const diffHoras = (tsAgendado - nowTick) / (1000 * 60 * 60);
    // Urgente se faltar <= 3 horas para a recolha/entrega (e for do dia de hoje ou próximas 3h)
    return diffHoras <= 3 && (e.data_agendamento === hoje || diffHoras >= -4);
  });

  // O sinal sonoro toca enquanto houver encomendas urgentes com algum artigo ainda por decidir ('pendente')
  const temItensUrgentesPorDecidir = encomendasUrgentesParaAceitar.some((e) =>
    e.itens.some((it) => it.estado_producao === 'pendente')
  );

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
      // Browser pode bloquear autoplay até 1º clique
    }
  };

  useEffect(() => {
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }
    if (temItensUrgentesPorDecidir && somAlertaAtivo) {
      tocarSinalSonoroUrgente();
      audioIntervalRef.current = setInterval(() => {
        tocarSinalSonoroUrgente();
      }, 10000);
    }
    return () => {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    };
  }, [temItensUrgentesPorDecidir, somAlertaAtivo]);

  const concluirTriagemUrgente = async (enc: Encomenda) => {
    await handleGuardarObsProducao(enc);
    const novaLista = Array.from(new Set([...encomendasUrgentesAceites, enc.id]));
    setEncomendasUrgentesAceites(novaLista);
    if (typeof window !== 'undefined') {
      localStorage.setItem(URGENTES_ACEITES_STORAGE_KEY, JSON.stringify(novaLista));
    }
  };

  const aceitarTodosItensUrgente = async (enc: Encomenda) => {
    await handleGuardarObsProducao(enc);
    await moverEncomendaKanban(enc.id, 'em_producao');
  };

  // ---------------------------------------------------------------------------
  // POOL DE ARTIGOS A PRODUZIR NO DIA + GESTÃO DOS 3 FORNOS
  // ---------------------------------------------------------------------------
  const dataReferenciaPool = filtroPeriodo === 'amanha' ? amanha : hoje;
  const diaSemanaPool = obterDiaSemanaDeData(dataReferenciaPool);

  interface ItemPoolArtigo {
    produto_id: string;
    produto_nome: string;
    setor: SetorProducao;
    qtdEncomendas: number;
    qtdBaseCarrinhas: number;
    totalNecessario: number;
    emForno: number;
    produzido: number;
    restantePool: number;
  }

  const mapaPool = new Map<string, {
    produto_id: string;
    produto_nome: string;
    setor: SetorProducao;
    qtdEncomendas: number;
    qtdBaseCarrinhas: number;
    qtdItensProntos: number;
  }>();

  // 1. Somar quantidades das encomendas filtradas (excluindo artigos recusados)
  encomendasFiltradas.forEach((enc) => {
    if (enc.estado === 'cancelado') return;
    enc.itens.forEach((it) => {
      if (it.estado_producao === 'recusado') return;
      if (setorAtivo !== 'todos' && it.setor !== setorAtivo) return;
      const existente = mapaPool.get(it.produto_id) || {
        produto_id: it.produto_id,
        produto_nome: it.produto_nome,
        setor: it.setor || 'padaria',
        qtdEncomendas: 0,
        qtdBaseCarrinhas: 0,
        qtdItensProntos: 0,
      };
      existente.qtdEncomendas += it.quantidade;
      if (it.estado_producao === 'pronto' || enc.estado === 'pronto_loja' || enc.estado === 'entregue') {
        existente.qtdItensProntos += it.quantidade;
      }
      mapaPool.set(it.produto_id, existente);
    });
  });

  // 2. Somar Carga Base das Carrinhas 1 a 4 (Particulares) e 5º Carro (Clientes Empresariais B2B) se ativo
  if (incluirCargaCarrinhasNoPool && selectedLojaId === 'todas') {
    const artigosPastelariaMapa = new Set([
      'PASTEIS',
      'Lanches',
      'Merendas',
      'Meia Lua',
      'R.doce GR',
      'R.doce P',
      'R. Coco',
      'R CANELA',
    ]);

    baseFixaCarrinhas.forEach((bf) => {
      const mapaProd = bf?.quantidades_por_produto || bf?.quantidades || {};
      Object.entries(mapaProd).forEach(([prodKey, qtd]) => {
        const qtdNum = Number(qtd || 0);
        if (qtdNum <= 0) return;
        const prodCatalogo = produtos.find(
          (p) => p.id === prodKey || p.nome.toLowerCase() === prodKey.toLowerCase()
        );
        const chavePool = prodCatalogo?.id || prodKey;
        const nomeExibicao = prodCatalogo?.nome || prodKey;
        const setorProd: SetorProducao =
          prodCatalogo?.categoria === 'pastelaria' || artigosPastelariaMapa.has(prodKey)
            ? 'pastelaria'
            : 'padaria';
        if (setorAtivo !== 'todos' && setorProd !== setorAtivo) return;
        const existente = mapaPool.get(chavePool) || {
          produto_id: chavePool,
          produto_nome: nomeExibicao,
          setor: setorProd,
          qtdEncomendas: 0,
          qtdBaseCarrinhas: 0,
          qtdItensProntos: 0,
        };
        existente.qtdBaseCarrinhas += qtdNum;
        mapaPool.set(chavePool, existente);
      });
    });

    clientesB2B.filter((c) => c?.ativo).forEach((cli) => {
      const semanaCli = cli?.quantidades_semanais || cli?.quantidades_semana || ({} as Record<string, Record<string, number>>);
      const mapaDia = semanaCli[diaSemanaPool] || {};
      Object.entries(mapaDia).forEach(([prodKey, qtdVal]) => {
        const qtdDia = Number(qtdVal || 0);
        if (qtdDia <= 0) return;
        const prodCatalogo = produtos.find(
          (p) => p.id === prodKey || p.nome.toLowerCase() === prodKey.toLowerCase()
        );
        const chavePool = prodCatalogo?.id || prodKey;
        const nomeExibicao = prodCatalogo?.nome || prodKey;
        const setorProd: SetorProducao =
          prodCatalogo?.categoria === 'pastelaria' || artigosPastelariaMapa.has(prodKey)
            ? 'pastelaria'
            : 'padaria';
        if (setorAtivo !== 'todos' && setorProd !== setorAtivo) return;
        const existente = mapaPool.get(chavePool) || {
          produto_id: chavePool,
          produto_nome: nomeExibicao,
          setor: setorProd,
          qtdEncomendas: 0,
          qtdBaseCarrinhas: 0,
          qtdItensProntos: 0,
        };
        existente.qtdBaseCarrinhas += qtdDia;
        mapaPool.set(chavePool, existente);
      });
    });
  }

  // 3. Calcular quantidades atualmente nos 3 Fornos e quantidades já produzidas
  const listaPoolArtigos: ItemPoolArtigo[] = Array.from(mapaPool.values())
    .map((entry) => {
      const emForno = fornos.reduce((acc, forno) => {
        const somaForno = (forno.itens || [])
          .filter((i) => i.produto_id === entry.produto_id || i.produto_nome === entry.produto_nome)
          .reduce((s, i) => s + i.quantidade, 0);
        return acc + somaForno;
      }, 0);

      const produzidoFornos = Number(produzidoPorProduto[entry.produto_id] || 0);
      const produzidoTotal = Math.max(produzidoFornos, entry.qtdItensProntos);
      const totalNecessario = entry.qtdEncomendas + entry.qtdBaseCarrinhas;
      const restantePool = Math.max(0, totalNecessario - emForno - produzidoTotal);

      return {
        produto_id: entry.produto_id,
        produto_nome: entry.produto_nome,
        setor: entry.setor,
        qtdEncomendas: entry.qtdEncomendas,
        qtdBaseCarrinhas: entry.qtdBaseCarrinhas,
        totalNecessario,
        emForno,
        produzido: produzidoTotal,
        restantePool,
      };
    })
    .sort((a, b) => b.restantePool - a.restantePool || a.produto_nome.localeCompare(b.produto_nome));

  // Alocar um produto (e quantidade) do Pool para um Forno (Forno 1, Forno 2 ou Forno 3)
  const alocarArtigoAoForno = (fornoId: 'forno-1' | 'forno-2' | 'forno-3', produtoId: string, qtdPedida?: number) => {
    if (!temPermissaoEdicao) return;
    const itemPool = listaPoolArtigos.find((p) => p.produto_id === produtoId);
    const prodCatalogo = produtos.find((p) => p.id === produtoId);
    const nomeProduto = itemPool?.produto_nome || prodCatalogo?.nome || produtoId;
    if (!nomeProduto) return;

    const maxDisponivel = itemPool ? itemPool.restantePool : 999;
    const qtdFinal = qtdPedida !== undefined
      ? Math.max(1, qtdPedida)
      : Math.max(1, maxDisponivel > 0 ? maxDisponivel : 10);

    const novosFornos = fornos.map((forno) => {
      if (forno.id !== fornoId) return forno;
      const itensAtuais = forno.itens || [];
      const existenteIdx = itensAtuais.findIndex((i) => i.produto_id === produtoId);
      let novosItens = [...itensAtuais];
      if (existenteIdx >= 0) {
        novosItens[existenteIdx] = {
          ...novosItens[existenteIdx],
          quantidade: novosItens[existenteIdx].quantidade + qtdFinal,
        };
      } else {
        novosItens.push({
          id: `aloc-${Date.now()}-${Math.random()}`,
          produto_id: produtoId,
          produto_nome: nomeProduto,
          setor: itemPool?.setor || (prodCatalogo?.categoria === 'pastelaria' ? 'pastelaria' : 'padaria'),
          quantidade: qtdFinal,
        });
      }
      return { ...forno, itens: novosItens };
    });

    atualizarFornos(novosFornos);
  };

  const alterarQtdNoForno = (fornoId: string, itemAlocId: string, novaQtd: number) => {
    if (!temPermissaoEdicao) return;
    const novosFornos = fornos.map((f) => {
      if (f.id !== fornoId) return f;
      if (novaQtd <= 0) {
        return { ...f, itens: f.itens.filter((i) => i.id !== itemAlocId) };
      }
      return {
        ...f,
        itens: f.itens.map((i) => (i.id === itemAlocId ? { ...i, quantidade: novaQtd } : i)),
      };
    });
    atualizarFornos(novosFornos);
  };

  // Iniciar Preparação num Forno (Inicia cronómetro de tempo de produção)
  const handleIniciarForno = async (fornoId: 'forno-1' | 'forno-2' | 'forno-3') => {
    if (!temPermissaoEdicao) return;
    const fornoAlvo = fornos.find((f) => f.id === fornoId);
    if (!fornoAlvo || fornoAlvo.itens.length === 0) {
      alert('Aloque pelo menos um artigo ao forno antes de iniciar a preparação.');
      return;
    }

    const agoraTs = Date.now();
    const novosFornos = fornos.map((f) =>
      f.id === fornoId
        ? { ...f, estado: 'em_preparacao' as const, inicio_timestamp: agoraTs }
        : f
    );
    atualizarFornos(novosFornos);

    const resumoItens = fornoAlvo.itens.map((i) => `${i.quantidade}x ${i.produto_nome}`).join(', ');
    await registarLogAuditoria({
      encomenda_id: fornoId,
      codigo_encomenda: fornoAlvo.nome.toUpperCase().replace(/\s+/g, '-'),
      cliente_nome: fornoAlvo.nome,
      utilizador_id: currentUser.id,
      utilizador_nome: currentUser.nome,
      utilizador_role: currentUser.role,
      loja_id: selectedLojaId === 'todas' ? 'todas' : lojaAtual.id,
      loja_nome: selectedLojaId === 'todas' ? 'Centro de Produção' : lojaAtual.nome,
      painel: 'producao',
      acao: `Início de Fornada (${fornoAlvo.nome})`,
      detalhes: `Iniciada preparação no ${fornoAlvo.nome} às ${new Date(agoraTs).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}: ${resumoItens}.`,
    });
  };

  // Concluir Fornada / Marcar Pronto num Forno (Regista duração real de cozedura e atualiza produzidos)
  const handleConcluirForno = async (fornoId: 'forno-1' | 'forno-2' | 'forno-3') => {
    if (!temPermissaoEdicao) return;
    const fornoAlvo = fornos.find((f) => f.id === fornoId);
    if (!fornoAlvo || fornoAlvo.itens.length === 0) return;

    const fimTs = Date.now();
    const inicioTs = fornoAlvo.inicio_timestamp || fimTs - 60000;
    const duracaoSegundos = Math.max(1, Math.round((fimTs - inicioTs) / 1000));
    const min = Math.floor(duracaoSegundos / 60);
    const seg = duracaoSegundos % 60;
    const duracaoFormatada = `${min}m ${String(seg).padStart(2, '0')}s`;

    // 1. Atualizar quantidades produzidas no dia
    const novoMapaProd = { ...produzidoPorProduto };
    fornoAlvo.itens.forEach((it) => {
      novoMapaProd[it.produto_id] = (novoMapaProd[it.produto_id] || 0) + it.quantidade;
    });
    atualizarProduzido(novoMapaProd);

    // 2. Criar registo de fornada concluída
    const novoRegisto: RegistoFornada = {
      id: `fornada-${fimTs}`,
      forno_id: fornoId,
      forno_nome: fornoAlvo.nome,
      itens: [...fornoAlvo.itens],
      inicio_iso: new Date(inicioTs).toISOString(),
      fim_iso: new Date(fimTs).toISOString(),
      duracao_segundos: duracaoSegundos,
      operador_nome: currentUser.nome,
    };

    const novosFornos = fornos.map((f) =>
      f.id === fornoId
        ? {
            ...f,
            estado: 'livre' as const,
            inicio_timestamp: undefined,
            itens: [],
            historico_fornadas: [novoRegisto, ...(f.historico_fornadas || [])].slice(0, 20),
          }
        : f
    );
    atualizarFornos(novosFornos);

    const resumoItens = fornoAlvo.itens.map((i) => `${i.quantidade}x ${i.produto_nome}`).join(', ');
    await registarLogAuditoria({
      encomenda_id: fornoId,
      codigo_encomenda: fornoAlvo.nome.toUpperCase().replace(/\s+/g, '-'),
      cliente_nome: fornoAlvo.nome,
      utilizador_id: currentUser.id,
      utilizador_nome: currentUser.nome,
      utilizador_role: currentUser.role,
      loja_id: selectedLojaId === 'todas' ? 'todas' : lojaAtual.id,
      loja_nome: selectedLojaId === 'todas' ? 'Centro de Produção' : lojaAtual.nome,
      painel: 'producao',
      acao: `Fornada Pronta (${fornoAlvo.nome} — ${duracaoFormatada})`,
      detalhes: `Fornada concluída no ${fornoAlvo.nome} em ${duracaoFormatada} (${resumoItens}) por ${currentUser.nome}.`,
    });
  };

  const formatarDuracaoAoVivo = (inicioTs?: number) => {
    if (!inicioTs) return '00:00';
    const diffSeg = Math.max(0, Math.floor((nowTick - inicioTs) / 1000));
    const m = Math.floor(diffSeg / 60);
    const s = diffSeg % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

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

        {/* ALERTA SONORO E VISUAL DE ENCOMENDAS URGENTES (< 3 HORAS) */}
        {encomendasUrgentesParaAceitar.length > 0 && (
          <div className={`mb-6 rounded-3xl bg-red-600 text-white p-4 shadow-xl border-2 border-red-300 ${temItensUrgentesPorDecidir ? 'animate-pulse' : ''}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-red-400/60 pb-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-white text-red-600 shadow-xs">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm sm:text-base font-black uppercase tracking-wide">
                      🚨 Alerta de Encomenda Urgente (&le; 3 Horas para Recolha/Entrega)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-red-900/70 border border-red-300/60 text-[10px] font-bold uppercase tracking-wider text-red-100">
                      🛡️ Decisão Humana Obrigatória (Art. 14.º EU AI Act)
                    </span>
                  </div>
                  <p className="text-xs text-red-100 font-medium">
                    Verifique o conteúdo detalhado do pedido, o canal e a loja, e aceite ou recuse cada artigo individualmente para produção.
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {encomendasUrgentesParaAceitar.map((enc) => {
                const obsAtual = obsProducaoPorEncomenda[enc.id] ?? enc.observacoes_producao ?? '';
                const canalLabel =
                  enc.canal_origem === 'site_online'
                    ? '🌐 Canal: App Cliente (Online)'
                    : enc.canal_origem === 'whatsapp'
                    ? '💬 Canal: WhatsApp'
                    : enc.canal_origem === 'telefone'
                    ? '📞 Canal: Telefone'
                    : '🏪 Canal: Presencial (Balcão)';

                const lojaDestinoLabel =
                  enc.tipo === 'levantamento_loja'
                    ? `🏪 Levantamento na Loja: ${enc.loja_nome || 'Padaria da Vila'}`
                    : `🚚 Domicílio (${enc.carrinha_nome || enc.loja_nome || 'Frota'})${enc.cliente.morada ? ` — ${enc.cliente.morada}` : ''}`;

                return (
                  <div
                    key={enc.id}
                    className="bg-white text-gray-900 p-4 rounded-2xl shadow-md space-y-3 border border-red-200 flex flex-col justify-between"
                  >
                    {/* 1. Cabeçalho do Pedido Urgente: Código, Hora, Canal e Loja */}
                    <div className="space-y-2 border-b border-stone-200 pb-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono font-black text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            {enc.codigo}
                          </span>
                          <span className="font-black text-xs text-gray-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            ⏰ {enc.hora_agendamento} ({enc.data_agendamento})
                          </span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                            enc.canal_origem === 'site_online'
                              ? 'bg-indigo-50 text-indigo-900 border-indigo-200'
                              : enc.canal_origem === 'whatsapp'
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                              : enc.canal_origem === 'telefone'
                              ? 'bg-amber-50 text-amber-900 border-amber-200'
                              : 'bg-stone-100 text-stone-800 border-stone-300'
                          }`}>
                            {canalLabel}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => aceitarTodosItensUrgente(enc)}
                          className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                          title="Aceitar todos os artigos desta encomenda para produção"
                        >
                          ✓ Aceitar Todos os Artigos
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-stone-900">
                          👤 Cliente: {enc.cliente.nome} <span className="text-stone-500 font-mono">({enc.cliente.telefone})</span>
                        </span>
                        <span className="text-[11px] font-bold text-amber-900 bg-amber-50/80 px-2 py-0.5 rounded-lg border border-amber-200">
                          {lojaDestinoLabel}
                        </span>
                      </div>

                      {enc.notas_cliente && (
                        <p className="text-[11px] text-stone-600 bg-stone-50 px-2.5 py-1.5 rounded-lg border border-stone-200 italic">
                          💬 Notas do Pedido: {enc.notas_cliente}
                        </p>
                      )}
                    </div>

                    {/* 2. Conteúdo Detalhado do Pedido (Aceitação ou Recusa Artigo a Artigo) */}
                    <div className="space-y-1.5">
                      <span className="block text-[10px] font-black uppercase tracking-wider text-stone-500">
                        Conteúdo do Pedido — Decisão Artigo a Artigo ({enc.itens.length} artigo(s)):
                      </span>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {enc.itens.map((item) => {
                          const aceite = item.estado_producao === 'em_preparo' || item.estado_producao === 'pronto';
                          const recusado = item.estado_producao === 'recusado';

                          return (
                            <div
                              key={item.id}
                              className={`p-2.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition ${
                                aceite
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                                  : recusado
                                  ? 'bg-red-50 border-red-300 text-red-950 opacity-85'
                                  : 'bg-stone-50 border-stone-200 text-stone-900'
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-1.5 font-black">
                                  <span>{item.setor === 'pastelaria' ? '🎂' : '🥖'}</span>
                                  <span className={`text-sm ${recusado ? 'line-through text-red-700' : 'text-stone-900'}`}>
                                    {item.quantidade}x {item.produto_nome}
                                  </span>
                                  <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-black ${
                                    aceite
                                      ? 'bg-emerald-200 text-emerald-900'
                                      : recusado
                                      ? 'bg-red-200 text-red-900'
                                      : 'bg-amber-100 text-amber-900'
                                  }`}>
                                    {aceite ? '✓ Em Produção' : recusado ? '✕ Não Produzir' : '⏳ Por Decidir'}
                                  </span>
                                </div>
                                {item.notas_personalizacao && (
                                  <span className="block text-[11px] text-amber-900 font-semibold italic mt-0.5 pl-5">
                                    » Personalização: {item.notas_personalizacao}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => atualizarEstadoItem(enc.id, item.id, 'em_preparo')}
                                  className={`px-2.5 py-1.5 rounded-lg font-black text-[11px] flex items-center gap-1 transition cursor-pointer ${
                                    aceite
                                      ? 'bg-emerald-600 text-white shadow-2xs'
                                      : 'bg-white hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-300'
                                  }`}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  <span>Produzir</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => atualizarEstadoItem(enc.id, item.id, 'recusado')}
                                  className={`px-2.5 py-1.5 rounded-lg font-black text-[11px] flex items-center gap-1 transition cursor-pointer ${
                                    recusado
                                      ? 'bg-red-600 text-white shadow-2xs'
                                      : 'bg-white hover:bg-red-600 text-red-700 hover:text-white border border-red-300'
                                  }`}
                                >
                                  <span>✕ Não Produzir</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. Observações para o Cliente & Envio de Informação Parcelar (App Cliente ou WhatsApp) */}
                    <div className="pt-2.5 border-t border-stone-200 space-y-2">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5">
                        <input
                          type="text"
                          value={obsAtual}
                          onChange={(e) =>
                            setObsProducaoPorEncomenda((prev) => ({
                              ...prev,
                              [enc.id]: e.target.value,
                            }))
                          }
                          placeholder="Observações p/ cliente (ex: motivo de artigo indisponível ou ajuste)..."
                          className="flex-1 px-2.5 py-1.5 rounded-xl border border-stone-300 text-xs text-stone-900 bg-stone-50 focus:bg-white focus:outline-hidden"
                        />
                        {enc.canal_origem === 'site_online' && (
                          <button
                            type="button"
                            onClick={async () => {
                              await handleGuardarObsProducao(enc, obsAtual);
                              alert('Estado parcelar dos artigos e observações atualizados na App do Cliente!');
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shrink-0 transition cursor-pointer"
                          >
                            Atualizar na App Cliente
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <a
                          href={gerarLinkWhatsAppDecisaoEncomenda(enc, obsAtual)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => handleGuardarObsProducao(enc, obsAtual)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-xs transition shadow-2xs ${
                            enc.canal_origem !== 'site_online'
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>
                            {enc.canal_origem !== 'site_online'
                              ? 'Enviar Confirmação / Estado Parcelar via WhatsApp'
                              : 'Enviar também via WhatsApp ao Cliente'}
                          </span>
                        </a>

                        <button
                          type="button"
                          onClick={() => concluirTriagemUrgente(enc)}
                          className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-black text-xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
                          <span>Concluir Triagem / Fechar Alerta</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Banner de Aviso de Produção */}
        {configMarca.avisoProducao && (
          <div className="mb-5 bg-amber-500 text-stone-950 font-black text-xs py-2 px-4 rounded-2xl shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4" />
              <span>{configMarca.avisoProducao}</span>
            </div>
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
                {configMarca.tituloProducao || 'Painel de Produção'} ({selectedLojaId === 'todas' ? t.allStores : lojaAtual.nome})
              </h2>
              <p className="text-xs text-gray-500">
                {configMarca.subtituloProducao || 'Pool de fabrico diário com alocação aos 3 Fornos e vista hierárquica por loja'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Seletor de Loja do Painel de Produção */}
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

            {/* Toggle de Modo de Visualização */}
            <div className="flex bg-stone-100 p-1 rounded-xl font-bold text-xs">
              <button
                type="button"
                onClick={() => setModoVisualizacao('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  modoVisualizacao === 'kanban'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Columns className="h-3.5 w-3.5 text-amber-600" />
                Quadro Kanban (3 Fornos)
              </button>
              <button
                type="button"
                onClick={() => setModoVisualizacao('hierarquica')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
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

        {/* ---------------- VISTA 1: QUADRO KANBAN (POOL DE ARTIGOS + 3 CARTÕES DE FORNO) ---------------- */}
        {modoVisualizacao === 'kanban' && (
          <div className="space-y-6">
            {/* SECÇÃO SUPERIOR: POOL DE ARTIGOS A PRODUZIR NO DIA */}
            <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-stone-900 uppercase tracking-wide flex items-center gap-2">
                    <Flame className="h-4 w-4 text-amber-600" />
                    <span>Pool de Artigos a Produzir no Dia ({listaPoolArtigos.length} artigos)</span>
                  </h3>
                  <p className="text-xs text-stone-500">
                    Arraste um artigo do Pool para um dos 3 Fornos abaixo ou clique nos botões rápidos (+ Forno 1, 2 ou 3) para descontar a quantidade a produzir.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-stone-700 bg-stone-100 px-3 py-1.5 rounded-xl border border-stone-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={incluirCargaCarrinhasNoPool}
                      onChange={(e) => setIncluirCargaCarrinhasNoPool(e.target.checked)}
                      className="rounded text-amber-600"
                    />
                    <span>Incluir Base Fixa das 5 Carrinhas (Particulares + B2B)</span>
                  </label>

                  {Object.keys(produzidoPorProduto).length > 0 && temPermissaoEdicao && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Deseja reiniciar a contagem de unidades produzidas hoje nos fornos?')) {
                          atualizarProduzido({});
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reiniciar Contagem do Dia
                    </button>
                  )}
                </div>
              </div>

              {listaPoolArtigos.length === 0 ? (
                <div className="text-center py-8 text-stone-400 text-xs italic">
                  Nenhum artigo pendente no Pool para os filtros selecionados.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-h-80 overflow-y-auto pr-1">
                  {listaPoolArtigos.map((art) => (
                    <div
                      key={art.produto_id}
                      draggable={temPermissaoEdicao && art.restantePool > 0}
                      onDragStart={(e) => {
                        e.dataTransfer.setData(
                          'application/json',
                          JSON.stringify({
                            produto_id: art.produto_id,
                            quantidade: art.restantePool,
                          })
                        );
                      }}
                      className={`p-3 rounded-2xl border transition flex flex-col justify-between gap-2 ${
                        art.restantePool === 0
                          ? 'bg-emerald-50/60 border-emerald-200 opacity-75'
                          : 'bg-stone-50/90 border-stone-200 hover:border-amber-400 cursor-grab active:cursor-grabbing shadow-2xs'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1.5">
                          <span className="text-xs font-black text-stone-900 leading-snug">
                            {art.setor === 'pastelaria' ? '🎂 ' : '🥖 '}
                            {art.produto_nome}
                          </span>
                          <span className={`px-2 py-0.5 rounded-lg font-mono text-xs font-black shrink-0 ${
                            art.restantePool > 0
                              ? 'bg-amber-500 text-stone-950'
                              : 'bg-emerald-600 text-white'
                          }`}>
                            {art.restantePool} un.
                          </span>
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-stone-500 font-semibold">
                          <span>Total: <b className="text-stone-800">{art.totalNecessario}</b></span>
                          {art.emForno > 0 && (
                            <span className="text-amber-700">• Em Forno: <b>{art.emForno}</b></span>
                          )}
                          {art.produzido > 0 && (
                            <span className="text-emerald-700">• Pronto: <b>{art.produzido}</b></span>
                          )}
                        </div>
                      </div>

                      {temPermissaoEdicao && art.restantePool > 0 && (
                        <div className="pt-1.5 border-t border-stone-200/70 grid grid-cols-3 gap-1">
                          {(['forno-1', 'forno-2', 'forno-3'] as const).map((fId, idx) => (
                            <button
                              key={fId}
                              type="button"
                              onClick={() => alocarArtigoAoForno(fId, art.produto_id, art.restantePool)}
                              className="py-1 px-1.5 rounded-lg bg-white hover:bg-amber-100 text-stone-700 hover:text-amber-950 border border-stone-200 font-bold text-[10px] transition cursor-pointer"
                              title={`Alocar ${art.restantePool} un. para o Forno ${idx + 1}`}
                            >
                              + Forno {idx + 1}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECÇÃO CENTRAL: 3 CARTÕES DE FORNO (FORNO 1, FORNO 2, FORNO 3) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {fornos.map((forno) => {
                const emPreparacao = forno.estado === 'em_preparacao';
                const selManual = selecaoManualForno[forno.id] || {
                  produto_id: listaPoolArtigos[0]?.produto_id || produtos[0]?.id || '',
                  quantidade: 20,
                };
                const totalUnidadesForno = forno.itens.reduce((acc, i) => acc + i.quantidade, 0);

                return (
                  <div
                    key={forno.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      try {
                        const raw = e.dataTransfer.getData('application/json');
                        if (!raw) return;
                        const parsed = JSON.parse(raw);
                        if (parsed.produto_id) {
                          alocarArtigoAoForno(forno.id, parsed.produto_id, parsed.quantidade);
                        }
                      } catch {
                        // ignore
                      }
                    }}
                    className={`rounded-3xl p-5 border-2 transition flex flex-col justify-between space-y-4 shadow-sm ${
                      emPreparacao
                        ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-300/50'
                        : 'bg-white border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Cabeçalho do Forno */}
                      <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2.5 rounded-2xl font-black text-white shadow-xs ${
                            emPreparacao ? 'bg-amber-600 animate-pulse' : 'bg-stone-800'
                          }`}>
                            <Flame className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-base font-black text-stone-900 uppercase tracking-wide">
                              {forno.nome}
                            </h3>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-block ${
                              emPreparacao
                                ? 'bg-amber-200 text-amber-950'
                                : forno.itens.length > 0
                                ? 'bg-blue-100 text-blue-900'
                                : 'bg-stone-100 text-stone-600'
                            }`}>
                              {emPreparacao
                                ? '🔥 Em Cozedura / Preparação'
                                : forno.itens.length > 0
                                ? `Carregado (${totalUnidadesForno} un.)`
                                : 'Livre — Aguarda Lote'}
                            </span>
                          </div>
                        </div>

                        {/* Cronómetro ao Vivo quando em preparação */}
                        {emPreparacao && (
                          <div className="bg-stone-900 text-amber-400 px-3 py-1.5 rounded-2xl font-mono font-black text-sm flex items-center gap-1.5 shadow-inner">
                            <Clock className="h-4 w-4 animate-spin" />
                            <span>{formatarDuracaoAoVivo(forno.inicio_timestamp)}</span>
                          </div>
                        )}
                      </div>

                      {/* Seletor Direto no Cartão do Forno para Adicionar Produto + Quantidade */}
                      {temPermissaoEdicao && (
                        <div className="bg-stone-50 p-2.5 rounded-2xl border border-stone-200 space-y-2">
                          <label className="block text-[10px] font-black text-stone-500 uppercase tracking-wider">
                            Selecionar Artigo e Quantidade para {forno.nome}
                          </label>
                          <div className="flex items-center gap-1.5">
                            <select
                              value={selManual.produto_id || listaPoolArtigos[0]?.produto_id || produtos[0]?.id || ''}
                              onChange={(e) => {
                                const pId = e.target.value;
                                const pPool = listaPoolArtigos.find((x) => x.produto_id === pId);
                                setSelecaoManualForno((prev) => ({
                                  ...prev,
                                  [forno.id]: {
                                    produto_id: pId,
                                    quantidade: pPool && pPool.restantePool > 0 ? pPool.restantePool : selManual.quantidade,
                                  },
                                }));
                              }}
                              className="flex-1 min-w-0 px-2.5 py-1.5 rounded-xl bg-white border border-stone-300 text-xs font-bold text-stone-900 focus:outline-hidden"
                            >
                              {listaPoolArtigos.map((lp) => (
                                <option key={lp.produto_id} value={lp.produto_id}>
                                  {lp.produto_nome} (Pool: {lp.restantePool} un.)
                                </option>
                              ))}
                              {produtos
                                .filter((p) => !listaPoolArtigos.some((lp) => lp.produto_id === p.id || lp.produto_nome === p.nome))
                                .map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.nome}
                                  </option>
                                ))}
                            </select>

                            <input
                              type="number"
                              min={1}
                              value={selManual.quantidade}
                              onChange={(e) =>
                                setSelecaoManualForno((prev) => ({
                                  ...prev,
                                  [forno.id]: {
                                    ...selManual,
                                    quantidade: Math.max(1, Number(e.target.value) || 1),
                                  },
                                }))
                              }
                              className="w-16 px-2 py-1.5 rounded-xl bg-white border border-stone-300 text-xs font-mono font-black text-center text-stone-900"
                              title="Quantidade a colocar no forno"
                            />

                            <button
                              type="button"
                              onClick={() => {
                                const prodId = selManual.produto_id || listaPoolArtigos[0]?.produto_id || produtos[0]?.id;
                                if (prodId) {
                                  alocarArtigoAoForno(forno.id, prodId, selManual.quantidade);
                                }
                              }}
                              className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-amber-600 text-white font-black text-xs transition shrink-0 cursor-pointer"
                            >
                              + Alocar
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Lista de Artigos Alocados ao Forno */}
                      <div className="space-y-2 min-h-36 max-h-64 overflow-y-auto pr-1">
                        {forno.itens.length === 0 ? (
                          <div className="h-36 rounded-2xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center text-center p-4 text-stone-400 text-xs">
                            <Flame className="h-6 w-6 mb-1 opacity-40" />
                            <span className="font-bold">Arraste artigos do Pool para aqui</span>
                            <span className="text-[11px]">ou selecione o artigo e quantidade acima</span>
                          </div>
                        ) : (
                          forno.itens.map((item) => (
                            <div
                              key={item.id}
                              className="p-3 rounded-2xl bg-white border border-stone-200 shadow-2xs flex items-center justify-between gap-2"
                            >
                              <div>
                                <span className="text-xs font-black text-stone-900 block">
                                  {item.produto_nome}
                                </span>
                                <span className="text-[10px] text-stone-500 uppercase font-bold">
                                  {item.setor === 'pastelaria' ? 'Pastelaria' : 'Padaria'}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {temPermissaoEdicao && (
                                  <button
                                    type="button"
                                    onClick={() => alterarQtdNoForno(forno.id, item.id, item.quantidade - 5)}
                                    className="px-1.5 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs"
                                  >
                                    -5
                                  </button>
                                )}
                                <input
                                  type="number"
                                  min={1}
                                  disabled={!temPermissaoEdicao}
                                  value={item.quantidade}
                                  onChange={(e) => alterarQtdNoForno(forno.id, item.id, Number(e.target.value) || 0)}
                                  className="w-16 text-center font-mono font-black text-xs px-1.5 py-1 rounded-lg border border-amber-300 bg-amber-50 text-amber-950"
                                />
                                {temPermissaoEdicao && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => alterarQtdNoForno(forno.id, item.id, item.quantidade + 5)}
                                      className="px-1.5 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs"
                                    >
                                      +5
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => alterarQtdNoForno(forno.id, item.id, 0)}
                                      className="p-1 text-red-500 hover:bg-red-50 rounded-lg"
                                      title="Devolver ao Pool"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Botões Operacionais do Forno: Iniciar Preparação e Pronto */}
                    <div className="pt-3 border-t border-stone-200/80 space-y-2">
                      {temPermissaoEdicao && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            disabled={forno.itens.length === 0 || emPreparacao}
                            onClick={() => handleIniciarForno(forno.id)}
                            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl font-black text-xs transition shadow-xs ${
                              forno.itens.length > 0 && !emPreparacao
                                ? 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer'
                                : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                            }`}
                          >
                            <Play className="h-3.5 w-3.5" />
                            <span>Iniciar Preparação</span>
                          </button>

                          <button
                            type="button"
                            disabled={forno.itens.length === 0}
                            onClick={() => handleConcluirForno(forno.id)}
                            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl font-black text-xs transition shadow-xs ${
                              forno.itens.length > 0
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                                : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                            }`}
                          >
                            <Check className="h-4 w-4" />
                            <span>Pronto</span>
                          </button>
                        </div>
                      )}

                      {/* Última fornada concluída neste forno */}
                      {forno.historico_fornadas && forno.historico_fornadas.length > 0 && (
                        <div className="bg-stone-50 p-2 rounded-xl border border-stone-200 text-[10px] text-stone-600 flex items-center justify-between">
                          <span className="truncate mr-2">
                            Última: <b>{forno.historico_fornadas[0].itens.map((i) => `${i.quantidade}x ${i.produto_nome}`).join(', ')}</b>
                          </span>
                          <span className="font-mono font-black text-emerald-700 shrink-0">
                            ⏱ {Math.floor(forno.historico_fornadas[0].duracao_segundos / 60)}m {forno.historico_fornadas[0].duracao_segundos % 60}s
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
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
                                    <span className="text-[10px] bg-stone-700/80 px-1.5 py-0.5 rounded-md font-bold text-stone-200 border border-stone-600">
                                      {enc.canal_origem === 'site_online' ? '🌐 Site' :
                                       enc.canal_origem === 'whatsapp' ? '💬 WhatsApp' :
                                       enc.canal_origem === 'telefone' ? '📞 Telefone' : '🏪 Presencial'}
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
                                        : item.estado_producao === 'recusado'
                                        ? 'bg-red-50 border-red-300 text-red-950 opacity-80'
                                        : 'bg-white border-stone-200 text-stone-900'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <span className="text-xs font-black text-stone-500 uppercase block mb-0.5">
                                          {item.setor === 'padaria' ? `🥖 ${t.bakeryTab}` : `🎂 ${t.pastryTab}`}
                                        </span>
                                        <h4 className={`text-sm font-black leading-tight ${item.estado_producao === 'recusado' ? 'line-through text-red-700' : 'text-gray-900'}`}>
                                          <span className="text-amber-700 mr-1.5">{item.quantidade}x</span>
                                          {item.produto_nome}
                                        </h4>
                                      </div>

                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                                        item.estado_producao === 'pronto'
                                          ? 'bg-emerald-200 text-emerald-900 border-emerald-400'
                                          : item.estado_producao === 'em_preparo'
                                          ? 'bg-amber-200 text-amber-900 border-amber-400'
                                          : item.estado_producao === 'recusado'
                                          ? 'bg-red-200 text-red-900 border-red-400'
                                          : 'bg-stone-200 text-stone-700 border-stone-300'
                                      }`}>
                                        {item.estado_producao === 'pronto'
                                          ? t.readyPrep
                                          : item.estado_producao === 'em_preparo'
                                          ? t.inPrep
                                          : item.estado_producao === 'recusado'
                                          ? 'Não Produzido'
                                          : t.pendingPrep}
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

                                    <div className="mt-3 flex flex-wrap items-center justify-end gap-1.5 pt-2 border-t border-stone-200/60">
                                      {temPermissaoEdicao ? (
                                        <>
                                          {item.estado_producao === 'pendente' && (
                                            <>
                                              <button
                                                onClick={() => atualizarEstadoItem(enc.id, item.id, 'em_preparo')}
                                                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition cursor-pointer"
                                              >
                                                Iniciar Preparação
                                              </button>
                                              <button
                                                onClick={() => atualizarEstadoItem(enc.id, item.id, 'recusado')}
                                                className="rounded-lg bg-white border border-red-300 text-red-700 px-2.5 py-1.5 text-xs font-bold hover:bg-red-50 transition cursor-pointer"
                                              >
                                                ✕ Não Produzir
                                              </button>
                                            </>
                                          )}
                                          {item.estado_producao === 'em_preparo' && (
                                            <>
                                              <button
                                                onClick={() => atualizarEstadoItem(enc.id, item.id, 'pronto')}
                                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition flex items-center gap-1 cursor-pointer"
                                              >
                                                <CheckCircle2 className="h-3.5 w-3.5" /> Marcar Pronto
                                              </button>
                                              <button
                                                onClick={() => atualizarEstadoItem(enc.id, item.id, 'recusado')}
                                                className="rounded-lg bg-white border border-red-300 text-red-700 px-2 py-1.5 text-[11px] font-bold hover:bg-red-50 transition cursor-pointer"
                                              >
                                                ✕ Recusar
                                              </button>
                                            </>
                                          )}
                                          {(item.estado_producao === 'pronto' || item.estado_producao === 'recusado') && (
                                            <div className="flex items-center gap-2">
                                              <span className={`flex items-center gap-1 text-xs font-bold ${item.estado_producao === 'pronto' ? 'text-emerald-700' : 'text-red-700'}`}>
                                                {item.estado_producao === 'pronto' ? (
                                                  <>
                                                    <CheckCircle2 className="h-4 w-4" /> Pronto na Bancada
                                                  </>
                                                ) : (
                                                  '✕ Artigo Recusado'
                                                )}
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
                                          {item.estado_producao === 'pronto'
                                            ? '✓ Pronto na Bancada'
                                            : item.estado_producao === 'em_preparo'
                                            ? 'Em Preparação'
                                            : item.estado_producao === 'recusado'
                                            ? '✕ Não Produzido'
                                            : 'Pendente'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}

                                {/* Campo de Observações da Produção & Botão WhatsApp / App Cliente */}
                                {temPermissaoEdicao && (
                                  <div className="pt-2 border-t border-stone-200 space-y-2">
                                    <input
                                      type="text"
                                      value={obsProducaoPorEncomenda[enc.id] ?? enc.observacoes_producao ?? ''}
                                      onChange={(e) =>
                                        setObsProducaoPorEncomenda((prev) => ({
                                          ...prev,
                                          [enc.id]: e.target.value,
                                        }))
                                      }
                                      onBlur={() => handleGuardarObsProducao(enc)}
                                      placeholder="Observações p/ cliente sobre artigos produzidos/indisponíveis..."
                                      className="w-full px-2.5 py-1.5 rounded-xl border border-stone-300 bg-white text-[11px] text-stone-900 focus:outline-hidden"
                                    />
                                    <div className="flex items-center justify-between gap-2">
                                      <a
                                        href={gerarLinkWhatsAppDecisaoEncomenda(
                                          enc,
                                          obsProducaoPorEncomenda[enc.id] ?? enc.observacoes_producao ?? ''
                                        )}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => handleGuardarObsProducao(enc)}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition"
                                      >
                                        <MessageSquare className="h-3.5 w-3.5" />
                                        <span>Notificar Cliente via WhatsApp</span>
                                      </a>
                                      {enc.canal_origem === 'site_online' && (
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            await handleGuardarObsProducao(enc);
                                            alert('Estado parcelar e observações sincronizados com a App do Cliente!');
                                          }}
                                          className="py-1.5 px-2.5 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold text-[11px] hover:bg-indigo-100 transition cursor-pointer"
                                        >
                                          Guardar p/ App
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="p-3 bg-stone-100 border-t border-stone-200 flex items-center justify-between text-xs text-stone-600">
                                <span className="font-semibold">
                                  Destino: {enc.tipo === 'entrega_domicilio' ? 'Carrinha de Entrega' : `Loja (${enc.loja_nome || 'Balcão'})`}
                                </span>
                                <span className="font-bold text-stone-800">
                                  {enc.itens.filter((i) => i.estado_producao === 'pronto').length} / {enc.itens.filter((i) => i.estado_producao !== 'recusado').length} Concluídos
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
