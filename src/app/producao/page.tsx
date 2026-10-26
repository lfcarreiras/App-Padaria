'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Navbar } from '../../components/Navbar';
import { ThermalReceipt } from '../../components/ThermalReceipt';
import { LOJAS_MOCK, PRODUTOS_MOCK, CARRINHAS_MOCK } from '../../lib/mockData';
import { 
  carregarEncomendasSupabase, 
  carregarLojasSupabase,
  carregarProdutosSupabase,
  carregarCarrinhasSupabase,
  carregarBaseFixaCarrinhas,
  carregarClientesEmpresariaisB2B,
  sincronizarClientesB2BComSupabase,
  subscreverAlteracoesClientesB2B,
  carregarBasesDiariasRecorrentes,
  clienteEmModoFerias,
  subscreverAlteracoesBasesRecorrentes,
  obterDiaSemanaDeData,
  obterQuantidadeEfetivaBaseRota,
  obterQuantidadeEfetivaClienteB2B,
  atualizarEstadoEncomendaDb,
  atualizarEstadoItemDb,
  salvarObservacoesProducaoDb,
  concluirEntregaComTimestampDb,
  gerarLinkWhatsAppEncomendaPronta,
  registarLogAuditoria 
} from '../../lib/encomendasService';
import { 
  Encomenda, 
  SetorProducao, 
  Loja, 
  Produto,
  Carrinha,
  BaseFixaCarrinha,
  ClienteEmpresarialB2B,
  DiaSemana,
  BaseDiariaRecorrente
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
  Filter,
  ShoppingBag,
  Truck,
  Phone,
  MapPin,
  FileText,
  Layers,
  Zap,
  RefreshCw,
  CheckCheck,
  Building2,
  ExternalLink,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  X
} from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge';
import { BreadIcon, OriginBadge, SectorBadge } from '../../components/InproovalBadges';
import { PdfViewerModal, LinhaArtigoCarga, LinhaArtigoFabrico } from '../../components/pdf/PdfViewerModal';
import { MatrizAjustesAdhoc } from '../../components/MatrizAjustesAdhoc';
import { correspondePesquisaArtigo } from '../../lib/fuzzySearch';
import EncomendasPage from '../encomendas/page';
import EntregaLojaPage from '../loja/page';
import { 
  executarCompilacaoPoolNoturna, 
  obterUltimoFechoNoturno, 
  ResultadoFechoNoturno 
} from '../../lib/poolNoturnaService';

export default function ProducaoPage() {
  const { t } = useTranslation();
  const { podeEditar, usuario } = useAuth();
  const currentUser = usuario || { id: 'user-padeiro', nome: 'Carlos Ferreira (Chefe Padeiro)', role: 'operador_padaria' };
  const temPermissaoEdicao = true; // No Cockpit de Produção, a operação de concluir fabrico está sempre disponível aos operadores
  const configMarca = obterConfiguracaoMarca();

  // Navegação entre ecrãs no Cockpit de Produção
  const [abaAtiva, setAbaAtiva] = useState<'fabrico' | 'encomendas' | 'balcao' | 'guias_carga'>('fabrico');
  const [dataGuiasCarga, setDataGuiasCarga] = useState<'hoje' | 'amanha'>('hoje');

  // Dados Globais
  const [selectedLojaId, setSelectedLojaId] = useState<string>('todas');
  const [lojas, setLojas] = useState<Loja[]>(LOJAS_MOCK);
  const [produtos, setProdutos] = useState<Produto[]>(PRODUTOS_MOCK);
  const [carrinhas, setCarrinhas] = useState<Carrinha[]>(CARRINHAS_MOCK);
  const [baseFixaCarrinhas, setBaseFixaCarrinhas] = useState<BaseFixaCarrinha[]>([]);
  const [clientesB2B, setClientesB2B] = useState<ClienteEmpresarialB2B[]>([]);
  const [basesRecorrentes, setBasesRecorrentes] = useState<BaseDiariaRecorrente[]>([]);
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [encomendaParaImprimir, setEncomendaParaImprimir] = useState<Encomenda | null>(null);

  // Estados do Ecrã de Fabrico
  const [setorAtivo, setSetorAtivo] = useState<SetorProducao | 'todos'>('todos');
  const [filtroTipologia, setFiltroTipologia] = useState<'todas' | 'bases_diarias' | 'clientes_b2b' | 'encomendas'>('todas');
  const [mostrarAjustesPontuais, setMostrarAjustesPontuais] = useState<boolean>(false);
  const [filtroConclusao, setFiltroConclusao] = useState<'nao_concluidas' | 'concluidas' | 'todas'>('nao_concluidas');
  const [somAlertaAtivo, setSomAlertaAtivo] = useState<boolean>(true);
  const [obsProducaoPorEncomenda, setObsProducaoPorEncomenda] = useState<Record<string, string>>({});
  const [savingObsId, setSavingObsId] = useState<string | null>(null);
  const [pesquisaTexto, setPesquisaTexto] = useState<string>('');
  const [nowTick, setNowTick] = useState<number>(Date.now());
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Filtro de Calendário de Produção
  const [filtroPeriodo, setFiltroPeriodo] = useState<'hoje' | 'amanha' | 'todos' | 'personalizado'>('hoje');
  const [dataInicioPersonalizada, setDataInicioPersonalizada] = useState('');
  const [dataFimPersonalizada, setDataFimPersonalizada] = useState('');

  // Estados do Trigger.dev v3 Fecho Noturno (22h00)
  const [ultimoFechoPool, setUltimoFechoPool] = useState<ResultadoFechoNoturno | null>(null);
  const [executandoFecho, setExecutandoFecho] = useState<boolean>(false);
  const [feedbackFecho, setFeedbackFecho] = useState<string | null>(null);

  // Estados do Ecrã Encomendas
  const [buscaEncomendas, setBuscaEncomendas] = useState<string>('');
  const [filtroTipoEncomenda, setFiltroTipoEncomenda] = useState<'todos' | 'levantamento_loja' | 'entrega_domicilio'>('todos');
  const [filtroEstadoEncomendas, setFiltroEstadoEncomendas] = useState<string>('todos');

  // Estados do Ecrã Balcão (Levantamentos em Loja)
  const [buscaBalcao, setBuscaBalcao] = useState<string>('');
  const [filtroEstadoBalcao, setFiltroEstadoBalcao] = useState<'pendentes' | 'concluidos' | 'todos'>('pendentes');

  // Estados do Modal de PDF (Folhas de Carga, Comprovativos B2B & Folha de Fabrico)
  const [pdfModalOpen, setPdfModalOpen] = useState<boolean>(false);
  const [pdfModalTipo, setPdfModalTipo] = useState<'folha_carga' | 'comprovativo_b2b' | 'folha_fabrico'>('folha_carga');
  const [pdfCarrinhaSelecionada, setPdfCarrinhaSelecionada] = useState<Carrinha | undefined>(undefined);
  const [pdfClienteB2B, setPdfClienteB2B] = useState<ClienteEmpresarialB2B | undefined>(undefined);
  const [pdfItensCarga, setPdfItensCarga] = useState<LinhaArtigoCarga[]>([]);
  const [pdfItensFabrico, setPdfItensFabrico] = useState<LinhaArtigoFabrico[]>([]);
  const [pdfDataReferencia, setPdfDataReferencia] = useState<string>('');
  const [pdfDiaSemana, setPdfDiaSemana] = useState<string>('');
  const [modoFabricoPdf, setModoFabricoPdf] = useState<'consolidado' | 'encomendas'>('consolidado');
  const [lojaIdFiltroFabrico, setLojaIdFiltroFabrico] = useState<string>('todas');

  // Carregar dados iniciais
  useEffect(() => {
    async function carregar() {
      const [dados, ljs, cars, prods] = await Promise.all([
        carregarEncomendasSupabase(),
        carregarLojasSupabase(),
        carregarCarrinhasSupabase(),
        carregarProdutosSupabase(),
      ]);
      setEncomendas(dados);
      if (ljs && ljs.length > 0) setLojas(ljs);
      if (cars && cars.length > 0) setCarrinhas(cars);
      if (prods && prods.length > 0) setProdutos(prods);
      setBaseFixaCarrinhas(carregarBaseFixaCarrinhas());
      setClientesB2B(carregarClientesEmpresariaisB2B());
      sincronizarClientesB2BComSupabase().then((res) => {
        if (res && res.length > 0) setClientesB2B(res);
      });
      setUltimoFechoPool(obterUltimoFechoNoturno());
      carregarBasesDiariasRecorrentes().then((bases) => {
        if (Array.isArray(bases)) setBasesRecorrentes(bases);
      });
    }
    carregar();

    const unsubB2B = subscreverAlteracoesClientesB2B((lista) => {
      setClientesB2B(lista);
      setVersaoDados((v) => v + 1);
    });
    const unsubBases = subscreverAlteracoesBasesRecorrentes((lista) => {
      setBasesRecorrentes(lista);
      setVersaoDados((v) => v + 1);
    });

    return () => {
      unsubB2B();
      unsubBases();
    };
  }, []);

  // Sincronização em tempo real das Bases Diárias, Clientes B2B e Ajustes Pontuais
  const [versaoDados, setVersaoDados] = useState<number>(0);
  useEffect(() => {
    const handleAtualizacoes = () => {
      setBaseFixaCarrinhas(carregarBaseFixaCarrinhas());
      setClientesB2B(carregarClientesEmpresariaisB2B());
      setVersaoDados((v) => v + 1);
    };

    window.addEventListener('app_base_fixa_atualizada', handleAtualizacoes);
    window.addEventListener('app_b2b_atualizado', handleAtualizacoes);
    window.addEventListener('app_ajustes_adhoc_atualizados', handleAtualizacoes);
    window.addEventListener('storage', handleAtualizacoes);

    return () => {
      window.removeEventListener('app_base_fixa_atualizada', handleAtualizacoes);
      window.removeEventListener('app_b2b_atualizado', handleAtualizacoes);
      window.removeEventListener('app_ajustes_adhoc_atualizados', handleAtualizacoes);
      window.removeEventListener('storage', handleAtualizacoes);
    };
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
  const diaSemanaHoje = obterDiaSemanaDeData(hoje);

  const nomesDiaSemana: Record<string, string> = {
    seg: 'Segunda-feira',
    ter: 'Terça-feira',
    qua: 'Quarta-feira',
    qui: 'Quinta-feira',
    sex: 'Sexta-feira',
    sab: 'Sábado',
    dom: 'Domingo',
  };

  // 1. Filtrar encomendas para Levantamento em Loja (Fila de Fabrico)
  const encomendasLevantamentoLoja = useMemo(() => {
    return encomendas.filter((e) => e.tipo === 'levantamento_loja');
  }, [encomendas]);

  // 1.1 Encomendas ativas para fabrico (respeitando data, período, loja e setor)
  const encomendasParaFabrico = useMemo(() => {
    return encomendas.filter((enc) => {
      // Filtrar por loja se selecionada no cockpit
      if (selectedLojaId !== 'todas' && enc.loja_id !== selectedLojaId) return false;

      // Filtrar por data / período
      if (filtroPeriodo === 'hoje' && enc.data_agendamento !== hoje) return false;
      if (filtroPeriodo === 'amanha' && enc.data_agendamento !== amanha) return false;
      if (filtroPeriodo === 'personalizado') {
        if (dataInicioPersonalizada && enc.data_agendamento < dataInicioPersonalizada) return false;
        if (dataFimPersonalizada && enc.data_agendamento > dataFimPersonalizada) return false;
      }

      // Não incluir encomendas canceladas
      if (enc.estado === 'cancelado') return false;

      // Filtrar por setor se ativo
      if (setorAtivo !== 'todos') {
        const temItemSetor = enc.itens.some(
          (it) => it.setor === setorAtivo && it.estado_producao !== 'recusado' && Number(it.quantidade) > 0
        );
        if (!temItemSetor) return false;
      }

      // Conter pelo menos um item válido
      return enc.itens.some(
        (it) => it.estado_producao !== 'recusado' && Number(it.quantidade) > 0
      );
    });
  }, [
    encomendas,
    selectedLojaId,
    filtroPeriodo,
    dataInicioPersonalizada,
    dataFimPersonalizada,
    hoje,
    amanha,
    setorAtivo,
  ]);

  // 2. Encomendas urgentes (<= 3h para a hora agendada e ainda não concluídas)
  const encomendasUrgentes = useMemo(() => {
    return encomendasLevantamentoLoja.filter((e) => {
      if (e.estado === 'pronto_loja' || e.estado === 'entregue' || e.estado === 'cancelado') return false;
      const dataHoraStr = `${e.data_agendamento}T${e.hora_agendamento || '10:00'}:00`;
      const tsAgendado = new Date(dataHoraStr).getTime();
      if (isNaN(tsAgendado)) return false;
      const diffMs = tsAgendado - nowTick;
      const tresHorasMs = 3 * 60 * 60 * 1000;
      return diffMs > 0 && diffMs <= tresHorasMs;
    });
  }, [encomendasLevantamentoLoja, nowTick]);

  // Alarme Sonoro de Encomendas Urgentes
  useEffect(() => {
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }

    if (somAlertaAtivo && encomendasUrgentes.length > 0) {
      const tocarBeep = () => {
        try {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (!AudioContext) return;
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        } catch {
          // Audio autoplay bloqueado
        }
      };

      tocarBeep();
      audioIntervalRef.current = setInterval(tocarBeep, 10000);
    }

    return () => {
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
        audioIntervalRef.current = null;
      }
    };
  }, [somAlertaAtivo, encomendasUrgentes.length]);

  // Pool Consolidada de Fabrico por Artigo para a Fila de Produção (Bases Diárias + Clientes Empresariais + Encomendas)
  const poolArtigosConsolidada = useMemo(() => {
    const mapa: Record<string, {
      produto_nome: string;
      setor: SetorProducao;
      unidade: string;
      qtd_bases_diarias: number;
      qtd_clientes_b2b: number;
      qtd_encomendas: number;
      quantidade_total: number;
      encomendas_count: number;
      encomendas_codigos: string[];
      personalizacoes: string[];
    }> = {};

    const registrarOuObter = (nome: string, setorFallback?: SetorProducao) => {
      const chave = nome.trim().toLowerCase();
      if (!mapa[chave]) {
        const prodRef = produtos.find((p) => p.nome.toLowerCase() === chave);
        const setor: SetorProducao = prodRef?.categoria || setorFallback || (
          chave.includes('bolo') || chave.includes('croissant') || chave.includes('pastel') || chave.includes('nata')
            ? 'pastelaria'
            : 'padaria'
        );
        const unid = prodRef?.unidade?.toLowerCase().includes('kg') ? 'kg' : 'un.';
        mapa[chave] = {
          produto_nome: prodRef?.nome || nome,
          setor,
          unidade: unid,
          qtd_bases_diarias: 0,
          qtd_clientes_b2b: 0,
          qtd_encomendas: 0,
          quantidade_total: 0,
          encomendas_count: 0,
          encomendas_codigos: [],
          personalizacoes: [],
        };
      }
      return mapa[chave];
    };

    const dataAlvo = filtroPeriodo === 'amanha' 
      ? amanha 
      : filtroPeriodo === 'personalizado' && dataInicioPersonalizada 
      ? dataInicioPersonalizada 
      : hoje;
    const diaSemanaAlvo: DiaSemana = obterDiaSemanaDeData(dataAlvo);

    // 1. BASES DIÁRIAS (Rotas 1 a 7, excluindo Rota 8)
    const rotasValidas = carrinhas.filter((c) => c.rota !== 'Rota 8' && c.numero !== 8);
    rotasValidas.forEach((car) => {
      const bf = baseFixaCarrinhas.find((b) => b.carrinha_id === car.id);
      const semana = (bf?.quantidades_semanais || bf?.quantidades_semana || {}) as Record<string, Record<string, number>>;
      const mapaDia = semana?.[diaSemanaAlvo] || bf?.quantidades_por_produto || {};

      Object.keys(mapaDia).forEach((artigo) => {
        const { quantidade } = obterQuantidadeEfetivaBaseRota(dataAlvo, car.id, artigo, semana, diaSemanaAlvo);
        if (quantidade > 0) {
          const artigoCanonico = artigo.trim();
          const entry = registrarOuObter(artigoCanonico);
          entry.qtd_bases_diarias += quantidade;
        }
      });
    });

    // 1.1 BASES DIÁRIAS RECORRENTES (PORTA-A-PORTA - Exclui automaticamente quem está em Modo Férias)
    basesRecorrentes.forEach((base) => {
      if (!base.ativo) return;
      if (clienteEmModoFerias(base, dataAlvo)) return; // FÉRIAS ATIVAS -> NÃO PRODUZ PÃO
      if (selectedCarrinhaId !== 'todas' && base.carrinha_id !== selectedCarrinhaId) return;

      const mapaDia = base.quantidades_semanais?.[diaSemanaAlvo] || {};
      Object.entries(mapaDia).forEach(([artigo, qtd]) => {
        const quantidade = Number(qtd) || 0;
        if (quantidade > 0) {
          const entry = registrarOuObter(artigo);
          entry.qtd_bases_diarias += quantidade;
        }
      });
    });

    // 2. CLIENTES EMPRESARIAIS (B2B)
    const clientesValidos = clientesB2B.filter((cli) => {
      if (!cli.ativo) return false;
      if (cli.carrinha_id) {
        const car = carrinhas.find((c) => c.id === cli.carrinha_id);
        if (car && (car.rota === 'Rota 8' || car.numero === 8)) return false;
      }
      return true;
    });

    clientesValidos.forEach((cli) => {
      const semana = (cli.quantidades_semanais || cli.quantidades_semana || {}) as Record<string, Record<string, number>>;
      const mapaDia = semana?.[diaSemanaAlvo] || cli.produtos_predefinidos || {};

      Object.keys(mapaDia).forEach((artigo) => {
        const { quantidade } = obterQuantidadeEfetivaClienteB2B(dataAlvo, cli.id, artigo, semana, diaSemanaAlvo);
        if (quantidade > 0) {
          const entry = registrarOuObter(artigo);
          entry.qtd_clientes_b2b += quantidade;
        }
      });
    });

    // 3. ENCOMENDAS (Balcão, Loja e Entregas)
    encomendas.forEach((enc) => {
      // Filtrar por loja se selecionada
      if (selectedLojaId !== 'todas' && enc.loja_id !== selectedLojaId) return;

      // Filtrar por data
      if (filtroPeriodo === 'hoje' && enc.data_agendamento !== hoje) return;
      if (filtroPeriodo === 'amanha' && enc.data_agendamento !== amanha) return;
      if (filtroPeriodo === 'personalizado') {
        if (dataInicioPersonalizada && enc.data_agendamento < dataInicioPersonalizada) return;
        if (dataFimPersonalizada && enc.data_agendamento > dataFimPersonalizada) return;
      }

      // Não somar encomendas canceladas
      if (enc.estado === 'cancelado') return;

      enc.itens.forEach((item) => {
        // Se o item foi recusado parcialmente pela produção, não entra na pool
        if (item.estado_producao === 'recusado') return;

        const artigoCanonico = (item.produto_nome || '').trim();
        const entry = registrarOuObter(artigoCanonico, item.setor);
        entry.qtd_encomendas += item.quantidade;

        if (!entry.encomendas_codigos.includes(enc.codigo)) {
          entry.encomendas_codigos.push(enc.codigo);
          entry.encomendas_count += 1;
        }

        if (item.notas_personalizacao && !entry.personalizacoes.includes(item.notas_personalizacao)) {
          entry.personalizacoes.push(item.notas_personalizacao);
        }
      });
    });

    // Calcular quantidade_total e filtrar por tipologia
    let lista = Object.values(mapa).map((item) => {
      let qtdFiltrada = 0;
      if (filtroTipologia === 'todas') {
        qtdFiltrada = item.qtd_bases_diarias + item.qtd_clientes_b2b + item.qtd_encomendas;
      } else if (filtroTipologia === 'bases_diarias') {
        qtdFiltrada = item.qtd_bases_diarias;
      } else if (filtroTipologia === 'clientes_b2b') {
        qtdFiltrada = item.qtd_clientes_b2b;
      } else if (filtroTipologia === 'encomendas') {
        qtdFiltrada = item.qtd_encomendas;
      }

      return {
        ...item,
        quantidade_total: qtdFiltrada,
      };
    });

    // Manter apenas artigos com quantidade > 0 na tipologia selecionada
    lista = lista.filter((item) => item.quantidade_total > 0);

    // Filtrar por setor (se padaria ou pastelaria)
    if (setorAtivo !== 'todos') {
      lista = lista.filter((item) => item.setor === setorAtivo);
    }

    // Filtrar por pesquisa de artigo com correspondência inteligente (tolerância a gralhas como "bor" -> "broa")
    if (pesquisaTexto.trim()) {
      lista = lista.filter((item) => correspondePesquisaArtigo(item.produto_nome, pesquisaTexto));
    }

    return lista.sort((a, b) => {
      if (a.setor !== b.setor) return a.setor.localeCompare(b.setor);
      return b.quantidade_total - a.quantidade_total;
    });
  }, [
    encomendas,
    carrinhas,
    baseFixaCarrinhas,
    clientesB2B,
    produtos,
    selectedLojaId,
    filtroPeriodo,
    dataInicioPersonalizada,
    dataFimPersonalizada,
    hoje,
    amanha,
    setorAtivo,
    filtroTipologia,
    pesquisaTexto,
    versaoDados
  ]);

  // Lista de Encomendas Filtradas para o ecrã de Produção
  const encomendasFiltradasProducao = useMemo(() => {
    return encomendasLevantamentoLoja.filter((e) => {
      const matchLoja = selectedLojaId === 'todas' || e.loja_id === selectedLojaId;
      const temItensDoSetor = setorAtivo === 'todos' || e.itens.some((i) => i.setor === setorAtivo);

      let matchData = true;
      if (filtroPeriodo === 'hoje') {
        matchData = e.data_agendamento === hoje;
      } else if (filtroPeriodo === 'amanha') {
        matchData = e.data_agendamento === amanha;
      } else if (filtroPeriodo === 'personalizado') {
        const d = e.data_agendamento;
        if (dataInicioPersonalizada && d < dataInicioPersonalizada) matchData = false;
        if (dataFimPersonalizada && d > dataFimPersonalizada) matchData = false;
      }

      let matchConclusao = true;
      const isConcluida = e.estado === 'pronto_loja' || e.estado === 'entregue';
      if (filtroConclusao === 'nao_concluidas') {
        matchConclusao = !isConcluida && e.estado !== 'cancelado';
      } else if (filtroConclusao === 'concluidas') {
        matchConclusao = isConcluida;
      }

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

  // Executar Fecho Noturno Manual das 22h00 (Trigger.dev v3 Engine)
  const handleExecutarFechoNoturnoManual = async () => {
    setExecutandoFecho(true);
    setFeedbackFecho(null);
    try {
      // Compilar para o dia seguinte (amanha)
      const res = await executarCompilacaoPoolNoturna(amanha, currentUser);
      setUltimoFechoPool(res);
      setFeedbackFecho(`Fecho noturno concluído com sucesso para ${res.dataAlvo}! ${res.totalUnidades} unidades compiladas (${res.totalPadaria} pão, ${res.totalPastelaria} pastelaria, ~${res.totalCaixasEstimadas} caixas).`);
      
      // Atualizar lista de encomendas
      const dados = await carregarEncomendasSupabase();
      setEncomendas(dados);
    } catch (err: any) {
      setFeedbackFecho(`Erro no fecho noturno: ${err.message || 'Falha na compilação'}`);
    } finally {
      setExecutandoFecho(false);
    }
  };

  // Preparar Itens de Folha de Carga por Carrinha
  const prepararItensFolhaCarga = (car: Carrinha, dataAlvoParam?: string): LinhaArtigoCarga[] => {
    const dataAlvo = dataAlvoParam || (dataGuiasCarga === 'amanha' ? amanha : hoje);
    const diaSemanaAlvo = obterDiaSemanaDeData(dataAlvo);
    const mapaItens = new Map<string, { quantidade: number; categoria: 'padaria' | 'pastelaria'; unidade: string }>();

    // 1. Quantidades da Base Fixa da carrinha para a data selecionada (com eventuais ajustes pontuais)
    const bf = baseFixaCarrinhas.find((b) => b.carrinha_id === car.id);
    const semana = (bf?.quantidades_semanais || bf?.quantidades_semana || {}) as Record<string, Record<string, number>>;
    const mapaDia = semana?.[diaSemanaAlvo] || bf?.quantidades_por_produto || {};

    Object.keys(mapaDia).forEach((artigo) => {
      const { quantidade } = obterQuantidadeEfetivaBaseRota(dataAlvo, car.id, artigo, semana, diaSemanaAlvo);
      if (quantidade > 0) {
        const prodRef = produtos.find((p) => p.nome.toLowerCase() === artigo.toLowerCase());
        const cat: 'padaria' | 'pastelaria' = prodRef?.categoria || (artigo.toLowerCase().includes('bolo') || artigo.toLowerCase().includes('croissant') ? 'pastelaria' : 'padaria');
        const unid = prodRef?.unidade?.toLowerCase().includes('kg') ? 'kg' : 'un.';
        const artigoCanonico = artigo.trim();
        mapaItens.set(artigoCanonico, {
          quantidade,
          categoria: cat,
          unidade: unid,
        });
      }
    });

    // 1.1 Quantidades das Bases Diárias Recorrentes desta rota (excluindo quem está em Modo Férias)
    basesRecorrentes
      .filter((b) => b.ativo && b.carrinha_id === car.id && !clienteEmModoFerias(b, dataAlvo))
      .forEach((b) => {
        const mapaDia = b.quantidades_semanais?.[diaSemanaAlvo] || {};
        Object.entries(mapaDia).forEach(([artigo, qtd]) => {
          const quantidade = Number(qtd) || 0;
          if (quantidade > 0) {
            const prodRef = produtos.find((p) => p.nome.toLowerCase() === artigo.toLowerCase());
            const cat = prodRef?.categoria || (artigo.toLowerCase().includes('bolo') || artigo.toLowerCase().includes('croissant') ? 'pastelaria' : 'padaria');
            const unid = prodRef?.unidade?.toLowerCase().includes('kg') ? 'kg' : 'un.';
            const atual = mapaItens.get(artigo);
            if (atual) {
              atual.quantidade += quantidade;
            } else {
              mapaItens.set(artigo, {
                quantidade,
                categoria: cat,
                unidade: unid,
              });
            }
          }
        });
      });

    // NOTA: Clientes B2B e Encomendas foram desdobrados para o fim da Folha de Carga,
    // garantindo que a Tabela Principal reflita estritamente a Base Diária da rota (porta-a-porta e particulares).

    const resultado: LinhaArtigoCarga[] = [];
    mapaItens.forEach((val, nome) => {
      const fatorCaixa = val.categoria === 'pastelaria' ? 20 : 30;
      resultado.push({
        nome,
        categoria: val.categoria,
        unidade: val.unidade,
        quantidade: val.quantidade,
        caixasEstimadas: Math.ceil(val.quantidade / fatorCaixa),
      });
    });

    return resultado.sort((a, b) => {
      if (a.categoria !== b.categoria) return a.categoria.localeCompare(b.categoria);
      return a.nome.localeCompare(b.nome);
    });
  };

  const abrirFolhaCargaPdf = (car: Carrinha, dataAlvoParam?: string) => {
    const dataAlvo = dataAlvoParam || (dataGuiasCarga === 'amanha' ? amanha : hoje);
    const diaSem = obterDiaSemanaDeData(dataAlvo);
    const itens = prepararItensFolhaCarga(car, dataAlvo);
    setPdfItensCarga(itens);
    setPdfCarrinhaSelecionada(car);
    setPdfDataReferencia(dataAlvo);
    setPdfDiaSemana(diaSem);
    setPdfModalTipo('folha_carga');
    setPdfModalOpen(true);
  };

  // Ação: Marcar encomenda inteira como pronta
  const handleMarcarComoPronta = async (encomendaId: string) => {
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

  // Guardar observações da produção
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

  // Concluir Entrega no Balcão
  const handleConcluirEntregaBalcao = async (encomendaId: string) => {
    if (!temPermissaoEdicao) return;
    const agora = new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    const dataReal = new Date().toISOString().split('T')[0];

    await concluirEntregaComTimestampDb(encomendaId, agora, dataReal);

    const enc = encomendas.find((e) => e.id === encomendaId);
    if (enc) {
      await registarLogAuditoria({
        encomenda_id: enc.id,
        codigo_encomenda: enc.codigo,
        cliente_nome: enc.cliente.nome,
        utilizador_id: currentUser.id,
        utilizador_nome: currentUser.nome,
        utilizador_role: currentUser.role,
        loja_id: enc.loja_id,
        loja_nome: enc.loja_nome,
        painel: 'producao',
        acao: 'Conclusão de Levantamento ao Balcão',
        detalhes: `Encomenda entregue ao cliente às ${agora} do dia ${dataReal}.`,
      });
    }

    setEncomendas((prev) =>
      prev.map((e) =>
        e.id === encomendaId
          ? { ...e, estado: 'entregue', hora_entrega_real: agora, data_entrega_real: dataReal }
          : e
      )
    );
  };

  // Abrir Modal de Impressão PDF da Folha de Fabrico Diária Consolidada
  const handleAbrirPdfFolhaFabrico = () => {
    if (poolArtigosConsolidada.length === 0) {
      alert('Não existem artigos na pool de produção para os filtros e data selecionados.');
      return;
    }

    const itensParaPdf: LinhaArtigoFabrico[] = poolArtigosConsolidada.map((item) => ({
      produto_nome: item.produto_nome,
      setor: item.setor,
      quantidade_total: item.quantidade_total,
      unidade: item.unidade || 'un.',
      encomendas_count: item.encomendas_count,
      encomendas_codigos: item.encomendas_codigos,
      personalizacoes: item.personalizacoes,
      qtd_bases_diarias: item.qtd_bases_diarias,
      qtd_clientes_b2b: item.qtd_clientes_b2b,
      qtd_encomendas: item.qtd_encomendas,
    }));

    setModoFabricoPdf('consolidado');
    setLojaIdFiltroFabrico(selectedLojaId);
    setPdfItensFabrico(itensParaPdf);
    setPdfModalTipo('folha_fabrico');
    setPdfModalOpen(true);
  };

  // Abrir Modal de Impressão PDF da Folha de Fabrico de Encomendas por Loja
  const handleAbrirPdfFolhaFabricoEncomendas = (lojaId?: string) => {
    if (encomendasParaFabrico.length === 0) {
      alert('Não existem encomendas ativas para os filtros e data selecionados.');
      return;
    }

    setModoFabricoPdf('encomendas');
    setLojaIdFiltroFabrico(lojaId || selectedLojaId);
    setPdfModalTipo('folha_fabrico');
    setPdfModalOpen(true);
  };

  // Exportar Excel da Folha de Produção
  const exportarFolhaProducaoExcel = async () => {
    if (encomendasFiltradasProducao.length === 0) {
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

    encomendasFiltradasProducao.forEach((enc) => {
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
      encomenda_id: 'folha-producao-excel',
      codigo_encomenda: 'PROD-EXCEL',
      cliente_nome: 'Balcão Lojas Central',
      utilizador_id: currentUser.id,
      utilizador_nome: currentUser.nome,
      utilizador_role: currentUser.role,
      loja_id: selectedLojaId === 'todas' ? 'todas' : lojaAtual.id,
      loja_nome: selectedLojaId === 'todas' ? 'Todas as Lojas' : lojaAtual.nome,
      painel: 'producao',
      acao: 'Exportação Folha de Fabrico (Excel)',
      detalhes: `Exportada folha de produção com ${encomendasFiltradasProducao.length} encomendas e ${Object.keys(totaisMap).length} artigos consolidados.`,
    });
  };

  // Encomendas Gerais Filtradas (para o ecrã "Encomendas")
  const encomendasGeraisFiltradas = useMemo(() => {
    return encomendas.filter((e) => {
      const matchLoja = selectedLojaId === 'todas' || e.loja_id === selectedLojaId;
      const matchTipo = filtroTipoEncomenda === 'todos' || e.tipo === filtroTipoEncomenda;
      const matchEstado = filtroEstadoEncomendas === 'todos' || e.estado === filtroEstadoEncomendas;

      let matchBusca = true;
      if (buscaEncomendas.trim()) {
        const q = buscaEncomendas.toLowerCase().trim();
        const noCod = e.codigo.toLowerCase().includes(q);
        const noCli = e.cliente.nome.toLowerCase().includes(q);
        const noTel = e.cliente.telefone.includes(q);
        const nosItens = e.itens.some((it) => it.produto_nome.toLowerCase().includes(q));
        matchBusca = noCod || noCli || noTel || nosItens;
      }

      return matchLoja && matchTipo && matchEstado && matchBusca;
    }).sort((a, b) => `${b.data_agendamento} ${b.hora_agendamento}`.localeCompare(`${a.data_agendamento} ${a.hora_agendamento}`));
  }, [encomendas, selectedLojaId, filtroTipoEncomenda, filtroEstadoEncomendas, buscaEncomendas]);

  // Encomendas Balcão Filtradas (para o ecrã "Balcão")
  const encomendasBalcaoFiltradas = useMemo(() => {
    return encomendasLevantamentoLoja.filter((e) => {
      const matchLoja = selectedLojaId === 'todas' || e.loja_id === selectedLojaId;
      const matchEstado = 
        filtroEstadoBalcao === 'todos' ? true :
        filtroEstadoBalcao === 'pendentes' ? e.estado !== 'entregue' && e.estado !== 'cancelado' :
        e.estado === 'entregue';

      let matchBusca = true;
      if (buscaBalcao.trim()) {
        const q = buscaBalcao.toLowerCase().trim();
        const noCod = e.codigo.toLowerCase().includes(q);
        const noCli = e.cliente.nome.toLowerCase().includes(q);
        const noTel = e.cliente.telefone.includes(q);
        const nosItens = e.itens.some((it) => it.produto_nome.toLowerCase().includes(q));
        matchBusca = noCod || noCli || noTel || nosItens;
      }

      return matchLoja && matchEstado && matchBusca;
    }).sort((a, b) => `${a.data_agendamento} ${a.hora_agendamento}`.localeCompare(`${b.data_agendamento} ${b.hora_agendamento}`));
  }, [encomendasLevantamentoLoja, selectedLojaId, filtroEstadoBalcao, buscaBalcao]);

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

        {/* NAVEGAÇÃO DE ECRÃS DO COCKPIT DE PRODUÇÃO */}
        <div className="flex items-center gap-2 p-1.5 bg-stone-200/90 rounded-2xl mb-6 shadow-inner overflow-x-auto">
          <button
            type="button"
            onClick={() => setAbaAtiva('fabrico')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap ${
              abaAtiva === 'fabrico'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-stone-700 hover:bg-stone-300/60'
            }`}
          >
            <ChefHat className="h-4 w-4" />
            <span>Fabrico (Produção)</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('encomendas')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap ${
              abaAtiva === 'encomendas'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-stone-700 hover:bg-stone-300/60'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Encomendas ({encomendas.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('balcao')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap ${
              abaAtiva === 'balcao'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-stone-700 hover:bg-stone-300/60'
            }`}
          >
            <Store className="h-4 w-4" />
            <span>Balcão (Levantamentos em Loja)</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('guias_carga')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap ${
              abaAtiva === 'guias_carga'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-stone-700 hover:bg-stone-300/60'
            }`}
          >
            <Truck className="h-4 w-4" />
            <span>Guias de Carga (Rotas 1 a 7)</span>
          </button>
        </div>

        {/* SECÇÃO: AJUSTES PONTUAIS À RECORRÊNCIA DE ENTREGAS (7 DIAS) */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMostrarAjustesPontuais(!mostrarAjustesPontuais)}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-xs transition cursor-pointer"
            >
              <Calendar className="h-4 w-4" />
              <span>{mostrarAjustesPontuais ? 'Ocultar Ajustes Pontuais (7 Dias)' : 'Abrir Ajustes Pontuais (7 Dias)'}</span>
              {mostrarAjustesPontuais ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            <span className="text-[11px] text-stone-500 font-semibold hidden sm:inline">
              Ajustes pontuais por data sem alterar a base diária definida
            </span>
          </div>

          {mostrarAjustesPontuais && (
            <MatrizAjustesAdhoc
              carrinhas={carrinhas.filter((c) => c.rota !== 'Rota 8' && c.numero !== 8)}
              baseFixaCarrinhas={baseFixaCarrinhas}
              clientesB2B={clientesB2B}
              produtos={produtos}
            />
          )}
        </div>

        {/* ========================================================================= */}
        {/* ECRÃ 1: FABRICO (PRODUÇÃO)                                                */}
        {/* ========================================================================= */}
        {abaAtiva === 'fabrico' && (
          <div className="space-y-6">
            {/* ALERTA SONORO E VISUAL DE ENCOMENDAS URGENTES (<= 3 HORAS) */}
            {encomendasUrgentes.length > 0 && (
              <div className="rounded-3xl bg-red-600 text-white p-4 shadow-xl border-2 border-red-300 animate-pulse">
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

                      <button
                        type="button"
                        onClick={() => handleMarcarComoPronta(enc.id)}
                        className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs uppercase tracking-wider shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Check className="h-4 w-4" />
                        <span>Concluir Produção • Marcar como Pronta</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Barra de Filtros e Controlos de Produção */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500 text-white shadow-xs">
                  <ChefHat className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg md:text-xl font-black text-gray-900 leading-tight whitespace-nowrap flex items-center gap-2">
                    <span className="truncate">{configMarca.tituloProducao || 'Cockpit de Produção'}</span>
                    <span className="text-xs font-bold text-amber-900 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded-lg shrink-0">
                      {selectedLojaId === 'todas' ? t.allStores : lojaAtual.nome}
                    </span>
                  </h2>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
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

                {/* Abas de Setor */}
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
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <CakeSlice className="h-3.5 w-3.5" />
                    <span>{t.pastryTab}</span>
                  </button>
                </div>

                {/* Imprimir Folha de Fabrico em PDF (Dinâmico: Consolidado ou Encomendas por Loja) */}
                {filtroTipologia === 'encomendas' ? (
                  <button
                    type="button"
                    onClick={() => handleAbrirPdfFolhaFabricoEncomendas()}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-xs transition cursor-pointer"
                    title="Imprimir Folha de Fabrico de Encomendas por Loja em PDF"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    <span>Imprimir Encomendas por Loja</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleAbrirPdfFolhaFabrico}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-black shadow-xs transition cursor-pointer"
                    title="Imprimir Folha Diária de Fabrico Consolidada em PDF"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Imprimir Folha de Fabrico</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filtros de Data e Estado de Conclusão */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setFiltroPeriodo('hoje')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      filtroPeriodo === 'hoje' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'
                    }`}
                  >
                    Hoje ({hoje})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroPeriodo('amanha')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      filtroPeriodo === 'amanha' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'
                    }`}
                  >
                    Amanhã ({amanha})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroPeriodo('todos')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      filtroPeriodo === 'todos' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'
                    }`}
                  >
                    Todas as Datas
                  </button>
                </div>

                <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setFiltroConclusao('nao_concluidas')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      filtroConclusao === 'nao_concluidas' ? 'bg-amber-600 text-white shadow-xs' : 'text-stone-500'
                    }`}
                  >
                    A Produzir ({encomendasFiltradasProducao.filter(e => e.estado !== 'pronto_loja' && e.estado !== 'entregue').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroConclusao('concluidas')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      filtroConclusao === 'concluidas' ? 'bg-emerald-600 text-white shadow-xs' : 'text-stone-500'
                    }`}
                  >
                    Concluídas
                  </button>
                </div>
              </div>

              {/* Caixa de Pesquisa Instantânea */}
              <div className="relative min-w-[240px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={pesquisaTexto}
                  onChange={(e) => setPesquisaTexto(e.target.value)}
                  placeholder="Pesquisar código, cliente ou artigo..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 bg-stone-50 focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>

            {/* POOL CONSOLIDADA DE QUANTIDADES POR ARTIGO (TIPOLOGIAS) */}
            <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-amber-600 shrink-0" />
                  <div>
                    <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                      <span>Pool de Produção</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-950 font-bold">
                        {poolArtigosConsolidada.reduce((acc, p) => acc + p.quantidade_total, 0)} unidades totais
                      </span>
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      Totais diários calculados em tempo real com base recorrente, clientes empresariais e encomendas
                    </p>
                  </div>
                </div>

                {/* Filtro por Tipologia de Fabrico */}
                <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-bold flex-wrap">
                  <button
                    type="button"
                    onClick={() => setFiltroTipologia('todas')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                      filtroTipologia === 'todas'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-stone-700 hover:text-stone-950 hover:bg-white/50'
                    }`}
                  >
                    <span>Consolidado Geral</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFiltroTipologia('bases_diarias')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                      filtroTipologia === 'bases_diarias'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-stone-700 hover:text-stone-950 hover:bg-white/50'
                    }`}
                  >
                    <Truck className="h-3.5 w-3.5" />
                    <span>Bases Diárias</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFiltroTipologia('clientes_b2b')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                      filtroTipologia === 'clientes_b2b'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-stone-700 hover:text-stone-950 hover:bg-white/50'
                    }`}
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    <span>Clientes Empresariais</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFiltroTipologia('encomendas')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                      filtroTipologia === 'encomendas'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-stone-700 hover:text-stone-950 hover:bg-white/50'
                    }`}
                  >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    <span>Encomendas</span>
                  </button>
                </div>
              </div>

              {/* Banner de Ação Rápida para Folha de Fabrico por Loja */}
              {filtroTipologia === 'encomendas' && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-blue-50/80 border border-blue-200 rounded-xl mb-3 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-600 text-white rounded-lg">
                      <ShoppingBag className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-blue-950">
                        Folha de Fabrico Discriminada por Loja ({encomendasParaFabrico.length} encomendas ativas)
                      </p>
                      <p className="text-[11px] text-blue-800">
                        Impressão por encomenda detalhada com notas de personalização e caixas de verificação.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAbrirPdfFolhaFabricoEncomendas('todas')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition cursor-pointer shadow-xs"
                      title="Imprimir todas as lojas discriminadas por encomenda"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Imprimir Todas as Lojas</span>
                    </button>

                    {lojas.map((l) => {
                      const encsCount = encomendasParaFabrico.filter((e) => e.loja_id === l.id).length;
                      if (encsCount === 0) return null;
                      return (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => handleAbrirPdfFolhaFabricoEncomendas(l.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-blue-300 hover:bg-blue-100 text-blue-950 text-xs font-bold transition cursor-pointer shadow-xs"
                          title={`Imprimir apenas encomendas da ${l.nome}`}
                        >
                          <Store className="h-3 w-3 text-blue-600" />
                          <span>{l.nome}</span>
                          <span className="ml-1 px-1.5 py-0.2 bg-blue-200 text-blue-900 rounded-full text-[10px] font-black">
                            {encsCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {poolArtigosConsolidada.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-500 font-medium">
                  Nenhum artigo encontrado para a tipologia e filtros selecionados.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                  {poolArtigosConsolidada.map((item) => (
                    <div
                      key={item.produto_nome}
                      className={`p-2.5 rounded-xl border text-center transition flex flex-col justify-between ${
                        item.setor === 'pastelaria'
                          ? 'bg-rose-50/50 border-rose-200 text-rose-950'
                          : 'bg-amber-50/50 border-amber-200 text-amber-950'
                      }`}
                    >
                      <div>
                        <p className="text-xl font-black font-mono">{item.quantidade_total}</p>
                        <p className="text-xs font-bold leading-tight truncate mt-0.5" title={item.produto_nome}>
                          {item.produto_nome}
                        </p>
                      </div>

                      {/* Discriminação por Tipologia se Consolidado */}
                      {filtroTipologia === 'todas' ? (
                        <div className="mt-2 pt-1.5 border-t border-black/5 text-[10px] space-y-0.5 text-stone-600 font-semibold text-left">
                          {item.qtd_bases_diarias > 0 && (
                            <div className="flex justify-between">
                              <span className="text-amber-800">Base Diária:</span>
                              <span className="font-mono font-bold">{item.qtd_bases_diarias}</span>
                            </div>
                          )}
                          {item.qtd_clientes_b2b > 0 && (
                            <div className="flex justify-between">
                              <span className="text-purple-800">Empresarial:</span>
                              <span className="font-mono font-bold">{item.qtd_clientes_b2b}</span>
                            </div>
                          )}
                          {item.qtd_encomendas > 0 && (
                            <div className="flex justify-between">
                              <span className="text-blue-800">Encomendas:</span>
                              <span className="font-mono font-bold">{item.qtd_encomendas}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-[10px] text-gray-500 font-medium mt-1">
                          {filtroTipologia === 'encomendas'
                            ? `${item.encomendas_count} encomenda(s)`
                            : `${item.quantidade_total} ${item.unidade || 'un.'}`}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* LISTA DE ENCOMENDAS DE PRODUÇÃO */}
            {encomendasFiltradasProducao.length === 0 ? (
              <div className="rounded-2xl bg-white border border-gray-200 p-12 text-center">
                <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-gray-800">Sem encomendas na fila de produção</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Não existem levantamentos em loja pendentes para os filtros selecionados.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {encomendasFiltradasProducao.map((enc) => {
                  const isPronta = enc.estado === 'pronto_loja' || enc.estado === 'entregue';
                  const obsAtual = obsProducaoPorEncomenda[enc.id] ?? enc.observacoes_producao ?? '';

                  return (
                    <div
                      key={enc.id}
                      className={`rounded-2xl bg-white border-2 transition shadow-xs overflow-hidden flex flex-col justify-between ${
                        isPronta
                          ? 'border-emerald-300 bg-emerald-50/20'
                          : 'border-stone-200 hover:border-amber-400'
                      }`}
                    >
                      <div>
                        {/* Cabeçalho do Card */}
                        <div className={`p-3.5 border-b flex items-center justify-between ${
                          isPronta ? 'bg-emerald-50 text-emerald-900 border-emerald-100' : 'bg-stone-50 text-stone-900 border-stone-200'
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-white border shadow-2xs">
                              {enc.codigo}
                            </span>
                            <OriginBadge origem={enc.canal_origem} compact />
                          </div>
                          <span className="font-black text-xs flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-amber-700" />
                            {enc.hora_agendamento}
                          </span>
                        </div>

                        {/* Dados do Cliente e Loja */}
                        <div className="p-3.5 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-black text-sm text-stone-900">{enc.cliente.nome}</h4>
                              <p className="text-xs text-stone-500">{enc.cliente.telefone}</p>
                              <p className="text-[11px] font-bold text-amber-800 flex items-center gap-1 mt-0.5">
                                <Store className="h-3 w-3 text-amber-600" />
                                <span>{enc.loja_nome || 'Padaria da Vila'}</span>
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEncomendaParaImprimir(enc)}
                              className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition"
                              title="Imprimir Talão Térmico de Produção"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Itens a Fabricar */}
                          <div className="rounded-xl bg-stone-50 p-2.5 space-y-1.5 border border-stone-200/80">
                            {enc.itens.map((it) => {
                              const isRecusado = it.estado_producao === 'recusado';
                              return (
                                <div
                                  key={it.id}
                                  className={`flex items-center justify-between text-xs font-semibold ${
                                    isRecusado ? 'text-red-700 line-through opacity-75' : 'text-stone-800'
                                  }`}
                                >
                                  <span className="flex items-center gap-1">
                                    <b className={`${isRecusado ? 'text-red-700' : 'text-amber-800'} font-black`}>
                                      {it.quantidade}x
                                    </b>
                                    <span>{it.produto_nome}</span>
                                    {it.notas_personalizacao && (
                                      <span className="text-[10px] text-amber-800 italic">
                                        ({it.notas_personalizacao})
                                      </span>
                                    )}
                                  </span>
                                  <SectorBadge setor={it.setor} />
                                </div>
                              );
                            })}
                          </div>

                          {/* Campo de Observações da Produção */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-stone-400">
                              Notas de Produção (visível no talão/loja):
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
                                placeholder="Notas de fabrico ou lote..."
                                className="w-full px-2.5 py-1 text-xs rounded-lg border border-stone-200 bg-white"
                              />
                              {savingObsId === enc.id && (
                                <span className="text-[10px] text-emerald-600 font-bold shrink-0">
                                  Gravado!
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Botão de Conclusão de Fabrico */}
                      <div className="p-3 bg-stone-50 border-t flex items-center justify-between gap-2">
                        {isPronta ? (
                          <div className="flex items-center justify-between w-full">
                            <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-xl">
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Pronta no Balcão</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleReverterParaProducao(enc.id)}
                              className="text-[11px] font-bold text-stone-500 hover:text-stone-800 underline cursor-pointer"
                            >
                              Reverter
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleMarcarComoPronta(enc.id)}
                            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs uppercase tracking-wider shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Check className="h-4 w-4" />
                            <span>Concluir Produção • Marcar como Pronta</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* ECRÃ 2: GESTÃO COMPLETA DE ENCOMENDAS (EXATAMENTE IGUAL ÀS LOJAS)         */}
        {/* ========================================================================= */}
        {abaAtiva === 'encomendas' && (
          <div className="pt-2">
            <EncomendasPage embedded={true} />
          </div>
        )}

        {/* ========================================================================= */}
        {/* ECRÃ 3: BALCÃO E LEVANTAMENTOS EM LOJA (EXATAMENTE IGUAL ÀS LOJAS)         */}
        {/* ========================================================================= */}
        {abaAtiva === 'balcao' && (
          <div className="pt-2">
            <EntregaLojaPage embedded={true} />
          </div>
        )}

        {/* ECRÃ 4: GUIAS DE CARGA DAS 7 ROTAS                                        */}
        {/* ========================================================================= */}
        {abaAtiva === 'guias_carga' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-stone-900 flex items-center gap-2 whitespace-nowrap">
                  <Truck className="h-5 w-5 text-amber-600 shrink-0" />
                  <span>Guias de Carga das 7 Rotas de Distribuição</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Consolidação diária de artigos por carrinha para conferência e carga de madrugada ({dataGuiasCarga === 'amanha' ? `Amanhã, ${amanha}` : `Hoje, ${hoje}`})
                </p>
              </div>

              {/* Selector de Data: Hoje (por defeito) vs Amanhã */}
              <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-bold shrink-0">
                <button
                  type="button"
                  onClick={() => setDataGuiasCarga('hoje')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    dataGuiasCarga === 'hoje' ? 'bg-white text-stone-900 shadow-xs font-black' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5 text-amber-600" />
                  <span>Hoje ({hoje})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDataGuiasCarga('amanha')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    dataGuiasCarga === 'amanha' ? 'bg-white text-stone-900 shadow-xs font-black' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5 text-amber-600" />
                  <span>Amanhã ({amanha})</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {carrinhas.filter((c) => c.rota !== 'Rota 8' && c.numero !== 8).map((car) => {
                const dataAlvoGuia = dataGuiasCarga === 'amanha' ? amanha : hoje;
                const diaSemanaAlvoGuia = obterDiaSemanaDeData(dataAlvoGuia);
                const itensCar = prepararItensFolhaCarga(car, dataAlvoGuia);
                const totalPao = itensCar.filter(i => i.categoria === 'padaria').reduce((acc, i) => acc + i.quantidade, 0);
                const totalPastelaria = itensCar.filter(i => i.categoria === 'pastelaria').reduce((acc, i) => acc + i.quantidade, 0);
                const totalCaixas = itensCar.reduce((acc, i) => acc + i.caixasEstimadas, 0);
                const b2bDaRota = clientesB2B.filter(cli => {
                  if (!cli.ativo || cli.carrinha_id !== car.id) return false;
                  const semCli = (cli.quantidades_semanais || cli.quantidades_semana || {}) as Record<string, Record<string, number>>;
                  const mapaCli = semCli?.[diaSemanaAlvoGuia] || {};
                  const totalCli = Object.keys(mapaCli).reduce((acc, art) => {
                    const { quantidade } = obterQuantidadeEfetivaClienteB2B(dataAlvoGuia, cli.id, art, semCli, diaSemanaAlvoGuia);
                    return acc + (quantidade > 0 ? quantidade : 0);
                  }, 0);
                  return totalCli > 0;
                });

                return (
                  <div
                    key={car.id}
                    className="rounded-2xl bg-white border border-stone-200 p-4 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition"
                  >
                    <div>
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className="text-sm font-black text-stone-900">
                          {car.rota || car.identificador}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                          {car.matricula}
                        </span>
                      </div>

                      <div className="mt-2 text-xs text-stone-500 font-medium">
                        <p><b>Viatura:</b> {car.nome_carro || car.modelo || 'Carrinha de Caixa'}</p>
                        <p><b>Motorista:</b> {car.motorista_nome || 'Rui Oliveira'}</p>
                      </div>

                      {/* Métricas de Carga de Madrugada */}
                      <div className="mt-3 grid grid-cols-2 gap-1.5 p-2 rounded-xl bg-stone-50 border border-stone-100 text-center">
                        <div>
                          <p className="text-[10px] text-stone-500 font-bold uppercase">Padaria</p>
                          <p className="text-sm font-black text-amber-800">{totalPao} un.</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-stone-500 font-bold uppercase">Pastelaria</p>
                          <p className="text-sm font-black text-rose-800">{totalPastelaria} un.</p>
                        </div>
                      </div>

                      {/* Clientes B2B da Rota */}
                      {b2bDaRota.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-stone-100">
                          <p className="text-[10px] font-bold text-stone-500 uppercase flex items-center gap-1 mb-1">
                            <Building2 className="h-3 w-3 text-amber-700" />
                            {b2bDaRota.length} Clientes Empresariais:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {b2bDaRota.map(cli => (
                              <span key={cli.id} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                                {cli.nome}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => abrirFolhaCargaPdf(car, dataAlvoGuia)}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-xs transition cursor-pointer"
                    >
                      <FileText className="h-4 w-4" />
                      <span>Gerar Folha de Carga</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Modal de Impressão Térmica */}
      {encomendaParaImprimir && (
        <ThermalReceipt
          encomenda={encomendaParaImprimir}
          loja={lojaAtual}
          onClose={() => setEncomendaParaImprimir(null)}
        />
      )}

      {/* Modal de PDF (Folha de Carga das Rotas 1 a 7 & Folha de Fabrico) */}
      <PdfViewerModal
        isOpen={pdfModalOpen}
        tipo={pdfModalTipo}
        onClose={() => setPdfModalOpen(false)}
        carrinha={pdfCarrinhaSelecionada}
        diaSemana={(pdfModalTipo === 'folha_carga' ? (pdfDiaSemana || diaSemanaHoje) : (filtroPeriodo === 'amanha' ? obterDiaSemanaDeData(amanha) : diaSemanaHoje)) as any}
        dataReferencia={pdfModalTipo === 'folha_carga' ? (pdfDataReferencia || (dataGuiasCarga === 'amanha' ? amanha : hoje)) : (filtroPeriodo === 'amanha' ? amanha : hoje)}
        itensCarga={pdfItensCarga}
        itensFabrico={pdfItensFabrico}
        lojaNome={selectedLojaId === 'todas' ? 'Todas as Lojas' : (lojas.find((l) => l.id === selectedLojaId)?.nome || 'Loja')}
        setorFiltro={setorAtivo}
        modoFabrico={modoFabricoPdf}
        encomendasFabrico={encomendasParaFabrico}
        lojasFabrico={lojas}
        lojaIdFiltro={lojaIdFiltroFabrico}
        clienteB2B={pdfClienteB2B}
        clientesB2BRota={clientesB2B.filter((cli) => cli.ativo && cli.carrinha_id === pdfCarrinhaSelecionada?.id)}
        encomendasRota={encomendas.filter(
          (e) => (pdfCarrinhaSelecionada ? e.carrinha_id === pdfCarrinhaSelecionada.id : true) &&
                 e.data_agendamento === (pdfDataReferencia || (dataGuiasCarga === 'amanha' ? amanha : hoje)) &&
                 e.tipo === 'entrega_domicilio' &&
                 e.estado !== 'cancelado'
        )}
        nomeCondutor={currentUser.nome}
        matriculaCarro={pdfCarrinhaSelecionada?.matricula}
      />
    </div>
  );
}
