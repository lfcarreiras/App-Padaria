'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { Navbar } from '../../components/Navbar';
import { ThermalReceipt } from '../../components/ThermalReceipt';
import { MatrizAjustesAdhoc } from '../../components/MatrizAjustesAdhoc';
import { LOJAS_MOCK, PRODUTOS_MOCK, CARRINHAS_MOCK, COLUNAS_MAPA_DIARIO_OFICIAL } from '../../lib/mockData';
import { 
  carregarEncomendasSupabase, 
  carregarClientesSupabase, 
  carregarProdutosSupabase,
  carregarLojasSupabase,
  salvarLojaDb,
  eliminarLojaDb,
  carregarCarrinhasSupabase,
  salvarCarrinhaDb,
  calcularDadosGuiaCargaConjunta,
  subscreverAlteracoesCarrinhas,
  subscreverAlteracoesBaseFixa,
  subscreverAlteracoesAjustesAdhoc,
  subscreverAlteracoesEncomendas,
  eliminarCarrinhaDb,
  carregarPerfisAcessoSupabase,
  salvarPerfilAcessoDb,
  eliminarPerfilAcessoDb,
  carregarMatrizPermissoesCargos,
  salvarMatrizPermissoesCargos,
  obterPermissoesCargo,
  MATRIZ_PERMISSOES_CARGOS_PADRAO,
  salvarClienteDb,
  enviarEmailRecuperacaoPassword,
  salvarProdutoDb,
  eliminarProdutoDb,
  formatarNomeEntidade,
  upsertClientesEmLote,
  upsertProdutosEmLote,
  carregarLogsAuditoriaSupabase,
  reiniciarLogsAuditoriaParaMock,
  carregarBaseFixaCarrinhas,
  salvarBaseFixaCarrinhas,
  carregarArtigosBaseFixa,
  salvarArtigosBaseFixa,
  carregarClientesEmpresariaisB2B,
  salvarClientesEmpresariaisB2B,
  eliminarClienteEmpresarialB2B,
  sincronizarClientesB2BComSupabase,
  subscreverAlteracoesClientesB2B,
  subscreverAlteracoesClientes,
  carregarBasesDiariasRecorrentes,
  salvarBaseDiariaRecorrente,
  eliminarBaseDiariaRecorrente,
  clienteEmModoFerias,
  subscreverAlteracoesBasesRecorrentes
} from '../../lib/encomendasService';
import { 
  ReceiptConfig, 
  getReceiptConfig, 
  saveReceiptConfig, 
  DEFAULT_RECEIPT_CONFIG 
} from '../../lib/receiptConfig';
import { Encomenda, Cliente, Produto, Loja, Carrinha, PerfilUtilizador, Role, NivelAcesso, LogAuditoria, BaseFixaCarrinha, ClienteEmpresarialB2B, DiaSemana, BaseDiariaRecorrente, PermissoesCargo, MatrizPermissoesCargos } from '../../types';
import { useTranslation } from '../../lib/i18n';
import { useAuth } from '../../lib/authContext';
import { obterConfiguracaoMarca } from '../../lib/tinaContent';
import { getAllSecretRouteMappings } from '../../lib/secretRoutes';
import { 
  BarChart3, 
  Store, 
  Truck, 
  FileSpreadsheet, 
  Printer, 
  Search,
  ArrowUpDown, 
  Users, 
  Download, 
  Upload, 
  RefreshCw, 
  Edit3, 
  Plus, 
  Trash2,
  Calendar,
  Layers,
  Filter,
  Check,
  ShieldCheck,
  UserCheck,
  Eye,
  Lock,
  AlertTriangle,
  Clock, 
  CheckCircle2, 
  XCircle, 
  Award, 
  TrendingUp, 
  User,
  ChefHat,
  X,
  RotateCcw,
  Sparkles,
  Phone,
  MessageSquare,
  Globe,
  Flame,
  Copy,
  Minus,
  Package,
} from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge';
import { OriginBadge, SectorBadge } from '../../components/InproovalBadges';
import { PdfViewerModal, LinhaArtigoCarga } from '../../components/pdf/PdfViewerModal';
import { FileText, Zap, Mail } from 'lucide-react';
import { correspondePesquisaArtigo } from '../../lib/fuzzySearch';

export default function AdminPage() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const { podeEditar, podeLer, usuario, cockpitAtivo, loading, obterRotaInicial } = useAuth();
  const temPermissaoEdicaoGestao = podeEditar('gestao');
  const configMarca = obterConfiguracaoMarca();

  // Route Guard estrito para Cockpit de Gestão
  useEffect(() => {
    if (!loading && usuario && !podeLer('gestao')) {
      router.replace(obterRotaInicial(usuario, cockpitAtivo));
    }
  }, [loading, usuario, cockpitAtivo, router, podeLer, obterRotaInicial]);

  const [selectedLojaId, setSelectedLojaId] = useState<string>('todas');
  const [activeTab, setActiveTab] = useState<'metricas' | 'lojas_carrinhas' | 'database' | 'logs' | 'talao' | 'acessos'>('metricas');
  const [subAbaAcessos, setSubAbaAcessos] = useState<'colaboradores' | 'permissoes_cargos'>('colaboradores');
  const [matrizPermissoes, setMatrizPermissoes] = useState<Record<Role, PermissoesCargo>>(() => carregarMatrizPermissoesCargos());
  const [salvandoMatriz, setSalvandoMatriz] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Histórico & Logs de Auditoria de Utilizadores
  const [logsAuditoria, setLogsAuditoria] = useState<LogAuditoria[]>([]);
  const [carregandoLogs, setCarregandoLogs] = useState(false);
  const [paginaAtualLogs, setPaginaAtualLogs] = useState(1);
  const [registosPorPaginaLogs, setRegistosPorPaginaLogs] = useState<number | 'todos'>(50);
  const [sortLogs, setSortLogs] = useState<{
    col: 'data_hora' | 'codigo' | 'cliente' | 'utilizador' | 'role' | 'painel' | 'acao' | 'detalhes';
    dir: 'asc' | 'desc';
  }>({ col: 'data_hora', dir: 'desc' });
  const [filtroLogs, setFiltroLogs] = useState({
    codigo: '',
    cliente: '',
    utilizador: 'todos',
    role: 'todos',
    painel: 'todos',
    acao: 'todas',
    detalhes: '',
    dataInicio: '',
    dataFim: '',
    periodoRapido: 'semana', // Rastreabilidade predefinida para os últimos 7 dias
  });

  // Filtros Temporais e Formato de Entrega
  const [periodoSelecionado, setPeriodoSelecionado] = useState<'dia' | 'semana' | 'mes' | 'ano' | 'todos'>('todos');
  const [formatoEntrega, setFormatoEntrega] = useState<'todos' | 'levantamento_loja' | 'entrega_domicilio'>('todos');

  // Dados Globais
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>(PRODUTOS_MOCK);
  const [lojas, setLojas] = useState<Loja[]>(LOJAS_MOCK);
  const [carrinhas, setCarrinhas] = useState<Carrinha[]>(CARRINHAS_MOCK);
  const [perfis, setPerfis] = useState<PerfilUtilizador[]>([]);

  // Todas as 7 rotas operacionais ativas (Rota 1 a Rota 7 - Rota 8 desativada)
  const carrinhasBaseDiaria = useMemo(() => {
    return [...carrinhas]
      .filter((c) => {
        const num = c.numero || parseInt(String(c.rota || c.identificador || '').replace(/\D+/g, '') || '99', 10);
        return num >= 1 && num <= 7 && c.matricula !== 'AAAAAA' && c.rota !== 'Rota 9' && c.rota !== 'Rota 8' && c.identificador !== 'Rota 8';
      })
      .sort((a, b) => {
        const numA = a.numero || parseInt(String(a.rota || a.identificador || '').replace(/\D+/g, '') || '99', 10);
        const numB = b.numero || parseInt(String(b.rota || b.identificador || '').replace(/\D+/g, '') || '99', 10);
        return numA - numB;
      });
  }, [carrinhas]);

  // Filtros e Ordenação para a Base Diária de Rotas
  const [filtroArtigoBaseFixa, setFiltroArtigoBaseFixa] = useState<string>('');
  const [ordenacaoBaseFixa, setOrdenacaoBaseFixa] = useState<'nome_asc' | 'nome_desc' | 'qtd_desc' | 'qtd_asc'>('nome_asc');

  // Filtros e Ordenação para os Clientes Empresariais (B2B)
  const [filtroRotaB2B, setFiltroRotaB2B] = useState<string>('todas');
  const [filtroClienteB2B, setFiltroClienteB2B] = useState<string>('');
  const [filtroArtigoB2B, setFiltroArtigoB2B] = useState<string>('');
  const [ordenacaoB2B, setOrdenacaoB2B] = useState<'nome_asc' | 'nome_desc' | 'total_desc' | 'total_asc'>('nome_asc');

  // Configuração do Talão
  const [receiptConfig, setReceiptConfig] = useState<ReceiptConfig>(DEFAULT_RECEIPT_CONFIG);
  const [lojaSelecionadaTalao, setLojaSelecionadaTalao] = useState<string>('todas');
  const [feedbackTalao, setFeedbackTalao] = useState<string | null>(null);
  const [encomendaTesteTalão, setEncomendaTesteTalão] = useState<Encomenda | null>(null);

  // Edição de Lojas / Carrinhas / Utilizadores
  const [lojaEmEdicao, setLojaEmEdicao] = useState<Partial<Loja> | null>(null);
  const [carrinhaEmEdicao, setCarrinhaEmEdicao] = useState<Partial<Carrinha> | null>(null);
  const [perfilEmEdicao, setPerfilEmEdicao] = useState<Partial<PerfilUtilizador> | null>(null);

  // Inserção de Registo Avulso na BD
  const [modalRegistoAvulsoAberto, setModalRegistoAvulsoAberto] = useState<boolean>(false);
  const [subAbaRegistoAvulso, setSubAbaRegistoAvulso] = useState<'cliente' | 'produto'>('cliente');
  const [novoCliente, setNovoCliente] = useState<{
    nome: string;
    telefone: string;
    email?: string;
    morada: string;
    codigo_postal: string;
    notas_entrega: string;
    tipo_cliente?: 'particular' | 'empresarial';
    nif?: string;
    carrinha_id?: string;
  }>({
    nome: '',
    telefone: '',
    email: '',
    morada: '',
    codigo_postal: '',
    notas_entrega: '',
    tipo_cliente: 'particular',
    nif: '',
    carrinha_id: '',
  });
  const [novoProduto, setNovoProduto] = useState<{ nome: string; categoria: 'padaria' | 'pastelaria'; unidade: string }>({
    nome: '', categoria: 'padaria', unidade: 'unidade'
  });

  // Tabela de Produtos Interativa (Base de Dados Central)
  const [produtoEmEdicaoModal, setProdutoEmEdicaoModal] = useState<Partial<Produto> | null>(null);
  const [sortProdutos, setSortProdutos] = useState<{ col: 'nome' | 'categoria' | 'unidade' | 'ativo'; dir: 'asc' | 'desc' }>({ col: 'nome', dir: 'asc' });
  const [filtroProdutos, setFiltroProdutos] = useState({
    busca: '',
    categoria: 'todas',
    unidade: 'todas',
    ativo: 'todos',
  });

  // Filtros e Ordenação para a Tabela Consolidada de Planeamento vs Real
  const [filtroDataConsolidada, setFiltroDataConsolidada] = useState<string>('');
  const [sortConsolidada, setSortConsolidada] = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: 'data_agendamento', dir: 'desc' });
  const [filtroConsolidada, setFiltroConsolidada] = useState({
    codigo: '',
    cliente: '',
    formato: 'todos',
    data: '',
    horaPlaneada: '',
    horaReal: '',
    pontualidade: 'todos',
    estado: 'todos'
  });

  // Importação Massiva Excel/CSV
  const [tabelaImportacao, setTabelaImportacao] = useState<'clientes' | 'produtos'>('clientes');
  const [arquivoImportado, setArquivoImportado] = useState<string>('');
  const [linhasPreview, setLinhasPreview] = useState<any[]>([]);
  const [statusImportacao, setStatusImportacao] = useState<string | null>(null);
  const [processandoImportacao, setProcessandoImportacao] = useState(false);

  // Base Diária das Carrinhas & Clientes Empresariais B2B
  const [baseFixaCarrinhas, setBaseFixaCarrinhas] = useState<BaseFixaCarrinha[]>([]);
  const [artigosBaseFixa, setArtigosBaseFixa] = useState<string[]>([]);
  const [artigoBaseFixaEmEdicao, setArtigoBaseFixaEmEdicao] = useState<string | null>(null);
  const [novoNomeArtigoBaseFixa, setNovoNomeArtigoBaseFixa] = useState<string>('');
  const [diaSemanaBaseFixa, setDiaSemanaBaseFixa] = useState<DiaSemana>('seg');
  const [carrinhaExportacaoId, setCarrinhaExportacaoId] = useState<string>('');
  const [clientesB2B, setClientesB2B] = useState<ClienteEmpresarialB2B[]>([]);
  const [diaSemanaB2B, setDiaSemanaB2B] = useState<DiaSemana>('seg');
  const [clienteB2BEmEdicao, setClienteB2BEmEdicao] = useState<ClienteEmpresarialB2B | null>(null);
  const [categoriaArtigoB2BModal, setCategoriaArtigoB2BModal] = useState<'todas' | 'padaria' | 'pastelaria' | 'selecionados'>('todas');
  const [buscaArtigoB2BModal, setBuscaArtigoB2BModal] = useState<string>('');
  const [novoArtigoBaseFixa, setNovoArtigoBaseFixa] = useState<string>('');
  const [feedbackBaseFixa, setFeedbackBaseFixa] = useState<string | null>(null);
  const [feedbackB2B, setFeedbackB2B] = useState<string | null>(null);

  // Bases Diárias Recorrentes (Porta-a-Porta & Modo Férias)
  const [basesRecorrentes, setBasesRecorrentes] = useState<BaseDiariaRecorrente[]>([]);
  const [baseRecorrenteEmEdicao, setBaseRecorrenteEmEdicao] = useState<Partial<BaseDiariaRecorrente> | null>(null);
  const [modalFeriasBase, setModalFeriasBase] = useState<BaseDiariaRecorrente | null>(null);
  const [feriasInicio, setFeriasInicio] = useState<string>('');
  const [feriasFim, setFeriasFim] = useState<string>('');
  const [filtroRotaBaseRecorrente, setFiltroRotaBaseRecorrente] = useState<string>('todas');
  const [filtroBuscaBaseRecorrente, setFiltroBuscaBaseRecorrente] = useState<string>('');
  const [filtroEstadoBaseRecorrente, setFiltroEstadoBaseRecorrente] = useState<'todos' | 'ativos' | 'ferias'>('todos');
  const [diaSemanaBaseRecorrenteModal, setDiaSemanaBaseRecorrenteModal] = useState<DiaSemana>('seg');
  const [feedbackBaseRecorrente, setFeedbackBaseRecorrente] = useState<string | null>(null);

  // Estados do Modal de PDF (Folha de Carga & Comprovativo B2B)
  const [pdfModalOpen, setPdfModalOpen] = useState<boolean>(false);
  const [pdfModalTipo, setPdfModalTipo] = useState<'folha_carga' | 'comprovativo_b2b' | 'guia_carga_conjunta'>('folha_carga');
  const [pdfDadosGuiaConjunta, setPdfDadosGuiaConjunta] = useState<DadosGuiaConjunta | undefined>(undefined);
  const [pdfCarrinhaSelecionada, setPdfCarrinhaSelecionada] = useState<Carrinha | undefined>(undefined);
  const [pdfClienteB2B, setPdfClienteB2B] = useState<ClienteEmpresarialB2B | undefined>(undefined);
  const [pdfItensCarga, setPdfItensCarga] = useState<LinhaArtigoCarga[]>([]);

  const DIAS_SEMANA_NOMES: { id: DiaSemana; label: string; abrev: string }[] = [
    { id: 'seg', label: 'Segunda-feira', abrev: 'Seg' },
    { id: 'ter', label: 'Terça-feira', abrev: 'Ter' },
    { id: 'qua', label: 'Quarta-feira', abrev: 'Qua' },
    { id: 'qui', label: 'Quinta-feira', abrev: 'Qui' },
    { id: 'sex', label: 'Sexta-feira', abrev: 'Sex' },
    { id: 'sab', label: 'Sábado', abrev: 'Sáb' },
    { id: 'dom', label: 'Domingo', abrev: 'Dom' },
  ];

  // Carregamento Inicial
  useEffect(() => {
    async function carregar() {
      try {
        const [encs, clis, prods, ljs, cars, pfs, logs] = await Promise.all([
          carregarEncomendasSupabase(),
          carregarClientesSupabase(),
          carregarProdutosSupabase(),
          carregarLojasSupabase(),
          carregarCarrinhasSupabase(),
          carregarPerfisAcessoSupabase(),
          carregarLogsAuditoriaSupabase(),
        ]);
        if (Array.isArray(encs)) setEncomendas(encs);
        if (Array.isArray(clis) && clis.length) setClientes(clis);
        if (Array.isArray(prods) && prods.length) setProdutos(prods);
        if (Array.isArray(ljs) && ljs.length) setLojas(ljs);
        if (Array.isArray(cars) && cars.length) {
          setCarrinhas(cars);
          setCarrinhaExportacaoId(cars[0]?.id || '');
        }
        if (Array.isArray(pfs) && pfs.length) setPerfis(pfs);
        if (Array.isArray(logs) && logs.length) setLogsAuditoria(logs);
        setReceiptConfig(getReceiptConfig());
        const bfCarregada = carregarBaseFixaCarrinhas();
        if (Array.isArray(bfCarregada)) setBaseFixaCarrinhas(bfCarregada);
        const artsGuardados = carregarArtigosBaseFixa();
        const setCombinado = new Set<string>((Array.isArray(artsGuardados) ? artsGuardados : []).map((p) => String(p || '').trim()).filter(Boolean));
        (bfCarregada || []).forEach((bf) => {
          if (!bf) return;
          const mapa = bf?.quantidades_por_produto || bf?.quantidades || {};
          Object.keys(mapa).forEach((prod) => {
            const n = String(prod || '').trim();
            if (n) setCombinado.add(n);
          });
          if (bf?.quantidades_semanais) {
            Object.values(bf.quantidades_semanais).forEach((m) => {
              Object.keys(m || {}).forEach((prod) => {
                const n = String(prod || '').trim();
                if (n) setCombinado.add(n);
              });
            });
          }
        });
        setArtigosBaseFixa(Array.from(setCombinado));
        const b2b = carregarClientesEmpresariaisB2B();
        if (Array.isArray(b2b)) setClientesB2B(b2b);
        sincronizarClientesB2BComSupabase().then((res) => {
          if (res && res.length > 0) setClientesB2B(res);
        });
      } catch (err) {
        console.error('Erro no carregamento inicial de dados em gestao:', err);
      }
    }
    carregar();

    const unsubB2B = subscreverAlteracoesClientesB2B((lista) => {
      setClientesB2B(lista);
    });
    const unsubClientes = subscreverAlteracoesClientes((lista) => {
      setClientes(lista);
    });
    const unsubBases = subscreverAlteracoesBasesRecorrentes((lista) => {
      setBasesRecorrentes(lista);
    });

    carregarBasesDiariasRecorrentes().then((bases) => {
      if (Array.isArray(bases)) setBasesRecorrentes(bases);
    });

    const unsubCarrinhas = subscreverAlteracoesCarrinhas((cars) => {
      setCarrinhas(cars);
    });
    const unsubBaseFixa = subscreverAlteracoesBaseFixa((bfs) => {
      setBaseFixaCarrinhas(bfs);
    });
    const unsubEncomendas = subscreverAlteracoesEncomendas((encs) => {
      setEncomendas(encs);
    });
    const unsubAjustes = subscreverAlteracoesAjustesAdhoc(() => {
      const bfAtualizada = carregarBaseFixaCarrinhas();
      if (Array.isArray(bfAtualizada)) setBaseFixaCarrinhas(bfAtualizada);
    });

    return () => {
      unsubB2B();
      unsubClientes();
      unsubBases();
      unsubCarrinhas();
      unsubBaseFixa();
      unsubEncomendas();
      unsubAjustes();
    };
  }, []);

  // Artigos visíveis na grelha de Base Fixa com pesquisa em tempo real e ordenação
  const artigosGrelhaBaseFixa = useMemo(() => {
    const todos = (artigosBaseFixa && artigosBaseFixa.length > 0) ? artigosBaseFixa : (COLUNAS_MAPA_DIARIO_OFICIAL || []);
    let filtrados = todos.filter((nome) => {
      if (!filtroArtigoBaseFixa.trim()) return true;
      return nome.toLowerCase().includes(filtroArtigoBaseFixa.toLowerCase().trim());
    });

    return [...filtrados].sort((a, b) => {
      if (ordenacaoBaseFixa === 'nome_asc') return a.localeCompare(b, 'pt');
      if (ordenacaoBaseFixa === 'nome_desc') return b.localeCompare(a, 'pt');
      const somaA = carrinhasBaseDiaria.reduce((acc, c) => acc + obterQtdBaseCarrinha(c.id, diaSemanaBaseFixa, a), 0);
      const somaB = carrinhasBaseDiaria.reduce((acc, c) => acc + obterQtdBaseCarrinha(c.id, diaSemanaBaseFixa, b), 0);
      if (ordenacaoBaseFixa === 'qtd_desc') return somaB - somaA;
      if (ordenacaoBaseFixa === 'qtd_asc') return somaA - somaB;
      return a.localeCompare(b, 'pt');
    });
  }, [artigosBaseFixa, filtroArtigoBaseFixa, ordenacaoBaseFixa, diaSemanaBaseFixa, carrinhasBaseDiaria]);

  // Clientes Empresariais B2B filtrados e ordenados
  const clientesB2BFiltrados = useMemo(() => {
    let res = [...clientesB2B];

    // Filtro por Rota
    if (filtroRotaB2B !== 'todas') {
      res = res.filter((cli) => {
        const car = carrinhas.find((c) => c.id === cli.carrinha_id);
        const rotaIdent = car?.rota || car?.identificador || '';
        return cli.carrinha_id === filtroRotaB2B || rotaIdent.toLowerCase() === filtroRotaB2B.toLowerCase();
      });
    }

    // Filtro por Cliente (nome, nif, email, telefone, morada)
    if (filtroClienteB2B.trim()) {
      const q = filtroClienteB2B.toLowerCase().trim();
      res = res.filter((cli) =>
        (cli.nome || '').toLowerCase().includes(q) ||
        (cli.nif || '').toLowerCase().includes(q) ||
        (cli.email || '').toLowerCase().includes(q) ||
        (cli.telemovel || '').toLowerCase().includes(q) ||
        (cli.telefone || '').toLowerCase().includes(q) ||
        (cli.morada || '').toLowerCase().includes(q)
      );
    }

    // Filtro por Artigo
    if (filtroArtigoB2B.trim()) {
      const art = filtroArtigoB2B.toLowerCase().trim();
      res = res.filter((cli) => {
        const semana = cli.quantidades_semanais || cli.quantidades_semana || ({} as Record<DiaSemana, Record<string, number>>);
        const mapa = semana[diaSemanaB2B] || {};
        return Object.entries(mapa).some(([prod, qtd]) => qtd > 0 && prod.toLowerCase().includes(art));
      });
    }

    // Ordenação
    return res.sort((a, b) => {
      if (ordenacaoB2B === 'nome_asc') return (a.nome || '').localeCompare(b.nome || '', 'pt');
      if (ordenacaoB2B === 'nome_desc') return (b.nome || '').localeCompare(a.nome || '', 'pt');

      const semA = a.quantidades_semanais || a.quantidades_semana || ({} as Record<DiaSemana, Record<string, number>>);
      const semB = b.quantidades_semanais || b.quantidades_semana || ({} as Record<DiaSemana, Record<string, number>>);
      const totalA = Object.values(semA[diaSemanaB2B] || {}).reduce((acc, q) => acc + (Number(q) || 0), 0);
      const totalB = Object.values(semB[diaSemanaB2B] || {}).reduce((acc, q) => acc + (Number(q) || 0), 0);

      if (ordenacaoB2B === 'total_desc') return totalB - totalA;
      if (ordenacaoB2B === 'total_asc') return totalA - totalB;
      return (a.nome || '').localeCompare(b.nome || '', 'pt');
    });
  }, [clientesB2B, filtroRotaB2B, filtroClienteB2B, filtroArtigoB2B, ordenacaoB2B, diaSemanaB2B, carrinhas]);

  // Catálogo completo de artigos para o modal de configuração de Cliente B2B (estilo UX Encomendas)
  const artigosCatalogoB2B = useMemo(() => {
    const mapa = new Map<string, { nome: string; categoria: 'padaria' | 'pastelaria'; unidade: string }>();

    // 1. Produtos do catálogo oficial da app
    produtos.forEach((p) => {
      const nomeLimpo = (p.nome || '').trim();
      if (!nomeLimpo) return;
      mapa.set(nomeLimpo.toLowerCase(), {
        nome: nomeLimpo,
        categoria: p.categoria === 'pastelaria' ? 'pastelaria' : 'padaria',
        unidade: p.unidade || (nomeLimpo.toLowerCase().includes('kg') ? 'kg' : 'un.'),
      });
    });

    // 2. Colunas do mapa diário oficial (garantir que todos os artigos base históricos existem)
    COLUNAS_MAPA_DIARIO_OFICIAL.forEach((nome) => {
      const nomeLimpo = nome.trim();
      const chave = nomeLimpo.toLowerCase();
      if (!mapa.has(chave)) {
        const isPastelaria = chave.includes('croissant') || chave.includes('bolo') || chave.includes('pastel') || chave.includes('torta') || chave.includes('queque') || chave.includes('folhado');
        mapa.set(chave, {
          nome: nomeLimpo,
          categoria: isPastelaria ? 'pastelaria' : 'padaria',
          unidade: nomeLimpo.toLowerCase().includes('kg') ? 'kg' : 'un.',
        });
      }
    });

    // 3. Qualquer artigo já presente no cliente em edição
    if (clienteB2BEmEdicao) {
      const semana = (clienteB2BEmEdicao.quantidades_semanais || clienteB2BEmEdicao.quantidades_semana || {}) as Record<string, Record<string, number>>;
      Object.values(semana).forEach((m) => {
        Object.keys(m || {}).forEach((nome) => {
          const nomeLimpo = nome.trim();
          const chave = nomeLimpo.toLowerCase();
          if (!mapa.has(chave)) {
            const isPastelaria = chave.includes('croissant') || chave.includes('bolo') || chave.includes('pastel') || chave.includes('torta') || chave.includes('queque') || chave.includes('folhado');
            mapa.set(chave, {
              nome: nomeLimpo,
              categoria: isPastelaria ? 'pastelaria' : 'padaria',
              unidade: nomeLimpo.toLowerCase().includes('kg') ? 'kg' : 'un.',
            });
          }
        });
      });
    }

    return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
  }, [produtos, clienteB2BEmEdicao]);

  // Artigos filtrados no Modal B2B por categoria ('todas' | 'padaria' | 'pastelaria' | 'selecionados') e pesquisa
  const artigosFiltradosB2BModal = useMemo(() => {
    if (!clienteB2BEmEdicao) return [];
    const semanaModal = (clienteB2BEmEdicao.quantidades_semanais || clienteB2BEmEdicao.quantidades_semana || {}) as Record<string, Record<string, number>>;
    const mapaDia = semanaModal[diaSemanaB2B] || {};

    return artigosCatalogoB2B.filter((art) => {
      const qtd = Number(mapaDia[art.nome] || 0);

      if (categoriaArtigoB2BModal === 'selecionados' && qtd <= 0) return false;
      if (categoriaArtigoB2BModal === 'padaria' && art.categoria !== 'padaria') return false;
      if (categoriaArtigoB2BModal === 'pastelaria' && art.categoria !== 'pastelaria') return false;

      if (buscaArtigoB2BModal.trim()) {
        return correspondePesquisaArtigo(art.nome, buscaArtigoB2BModal);
      }
      return true;
    });
  }, [artigosCatalogoB2B, clienteB2BEmEdicao, diaSemanaB2B, categoriaArtigoB2BModal, buscaArtigoB2BModal]);

  // Totais métricos do Modal B2B para o dia selecionado
  const totaisB2BModalDia = useMemo(() => {
    if (!clienteB2BEmEdicao) return { totalQtd: 0, totalItens: 0, padariaTotal: 0, pastelariaTotal: 0 };
    const semanaModal = (clienteB2BEmEdicao.quantidades_semanais || clienteB2BEmEdicao.quantidades_semana || {}) as Record<string, Record<string, number>>;
    const mapaDia = semanaModal[diaSemanaB2B] || {};
    
    let totalQtd = 0;
    let totalItens = 0;
    Object.entries(mapaDia).forEach(([_, qtd]) => {
      const q = Number(qtd) || 0;
      if (q > 0) {
        totalQtd += q;
        totalItens += 1;
      }
    });

    const padariaTotal = artigosCatalogoB2B.filter((a) => a.categoria === 'padaria').length;
    const pastelariaTotal = artigosCatalogoB2B.filter((a) => a.categoria === 'pastelaria').length;

    return { totalQtd, totalItens, padariaTotal, pastelariaTotal };
  }, [clienteB2BEmEdicao, diaSemanaB2B, artigosCatalogoB2B]);

  // Handler para definir ou ajustar a quantidade de um artigo no Modal B2B
  const handleDefinirQtdArtigoB2BModal = (prodNome: string, valor: number | string) => {
    if (!clienteB2BEmEdicao) return;
    const semanaModal = (clienteB2BEmEdicao.quantidades_semanais || clienteB2BEmEdicao.quantidades_semana || {}) as Record<string, Record<string, number>>;
    const mapaDia = { ...(semanaModal[diaSemanaB2B] || {}) };
    
    const novoValor = typeof valor === 'string' ? parseInt(valor, 10) : valor;
    if (isNaN(novoValor) || novoValor <= 0) {
      delete mapaDia[prodNome];
    } else {
      mapaDia[prodNome] = Math.max(0, novoValor);
    }

    const novaSemana = {
      ...semanaModal,
      [diaSemanaB2B]: mapaDia,
    };

    setClienteB2BEmEdicao({
      ...clienteB2BEmEdicao,
      quantidades_semanais: novaSemana,
      quantidades_semana: novaSemana,
    });
  };

  // Bases Recorrentes Filtradas (Porta-a-Porta & Modo Férias)
  const basesRecorrentesFiltradas = useMemo(() => {
    const hojeStr = new Date().toISOString().split('T')[0];
    return basesRecorrentes.filter((base) => {
      // 1. Filtro Rota
      if (filtroRotaBaseRecorrente !== 'todas' && base.carrinha_id !== filtroRotaBaseRecorrente) return false;
      // 2. Filtro Busca
      if (filtroBuscaBaseRecorrente.trim()) {
        const q = filtroBuscaBaseRecorrente.toLowerCase().trim();
        const nome = (base.cliente_nome || '').toLowerCase();
        const tel = (base.cliente_telefone || '').toLowerCase();
        const morada = (base.cliente_morada || '').toLowerCase();
        if (!nome.includes(q) && !tel.includes(q) && !morada.includes(q)) return false;
      }
      // 3. Filtro Estado
      if (filtroEstadoBaseRecorrente === 'ferias') {
        if (!clienteEmModoFerias(base, hojeStr)) return false;
      } else if (filtroEstadoBaseRecorrente === 'ativos') {
        if (!base.ativo || clienteEmModoFerias(base, hojeStr)) return false;
      }
      return true;
    });
  }, [basesRecorrentes, filtroRotaBaseRecorrente, filtroBuscaBaseRecorrente, filtroEstadoBaseRecorrente]);

  const obterQtdBaseCarrinha = (carrinhaId: string, dia: DiaSemana, prodNome: string): number => {
    const reg = (baseFixaCarrinhas || []).find((b) => b?.carrinha_id === carrinhaId);
    if (!reg) return 0;
    if (reg.quantidades_semanais && reg.quantidades_semanais[dia]) {
      return Number(reg.quantidades_semanais[dia][prodNome] || 0);
    }
    const mapaGeral = reg.quantidades_por_produto || reg.quantidades || {};
    return Number(mapaGeral[prodNome] || 0);
  };

  const handleAlterarQtdBaseFixa = (carrinhaId: string, carrinhaNome: string, dia: DiaSemana, produtoNome: string, valor: number) => {
    const qtdLimpa = Math.max(0, Math.floor(Number(valor) || 0));
    const novaLista = [...baseFixaCarrinhas];
    const idx = novaLista.findIndex((b) => b?.carrinha_id === carrinhaId || b?.carrinha_nome === carrinhaNome);
    if (idx >= 0) {
      const regAtual = novaLista[idx];
      const mapaGeral = { ...(regAtual.quantidades_por_produto || regAtual.quantidades || {}) };
      const semAtual = regAtual.quantidades_semanais || {
        seg: { ...mapaGeral },
        ter: { ...mapaGeral },
        qua: { ...mapaGeral },
        qui: { ...mapaGeral },
        sex: { ...mapaGeral },
        sab: { ...mapaGeral },
        dom: { ...mapaGeral },
      };
      const mapaDia = { ...(semAtual[dia] || {}) };
      if (qtdLimpa <= 0) {
        delete mapaDia[produtoNome];
        delete mapaGeral[produtoNome];
      } else {
        mapaDia[produtoNome] = qtdLimpa;
        mapaGeral[produtoNome] = qtdLimpa;
      }
      const novaSemana = {
        ...semAtual,
        [dia]: mapaDia,
      };
      novaLista[idx] = {
        ...regAtual,
        carrinha_id: carrinhaId,
        carrinha_nome: carrinhaNome,
        quantidades_semanais: novaSemana,
        quantidades_por_produto: mapaGeral,
        quantidades: mapaGeral,
      };
    } else {
      const mapaInicial = qtdLimpa > 0 ? { [produtoNome]: qtdLimpa } : {};
      const novaSemana: Record<DiaSemana, Record<string, number>> = {
        seg: {}, ter: {}, qua: {}, qui: {}, sex: {}, sab: {}, dom: {}
      };
      novaSemana[dia] = mapaInicial;
      novaLista.push({
        carrinha_id: carrinhaId,
        carrinha_nome: carrinhaNome,
        quantidades_semanais: novaSemana,
        quantidades_por_produto: mapaInicial,
        quantidades: mapaInicial,
      });
    }
    setBaseFixaCarrinhas(novaLista);
    salvarBaseFixaCarrinhas(novaLista);
  };

  const handleAdicionarArtigoBaseFixa = (nomeRaw: string) => {
    const nomeLimpo = nomeRaw.trim();
    if (!nomeLimpo) return;
    if (!artigosGrelhaBaseFixa.includes(nomeLimpo)) {
      const novaListaArtigos = [...artigosGrelhaBaseFixa, nomeLimpo];
      setArtigosBaseFixa(novaListaArtigos);
      salvarArtigosBaseFixa(novaListaArtigos);
    }
    setNovoArtigoBaseFixa('');
    setFeedbackBaseFixa(`Artigo "${nomeLimpo}" adicionado à grelha da Base Fixa!`);
    setTimeout(() => setFeedbackBaseFixa(null), 3000);
  };

  const handleRenomearArtigoBaseFixa = (nomeAntigo: string, nomeNovoRaw: string) => {
    const nomeNovo = nomeNovoRaw.trim();
    if (!nomeNovo || nomeNovo === nomeAntigo) {
      setArtigoBaseFixaEmEdicao(null);
      return;
    }

    // 1. Atualizar lista de artigos mantendo a posição original
    const novaListaArtigos = Array.from(
      new Set(artigosGrelhaBaseFixa.map((a) => (a === nomeAntigo ? nomeNovo : a)))
    );
    setArtigosBaseFixa(novaListaArtigos);
    salvarArtigosBaseFixa(novaListaArtigos);

    // 2. Migrar quantidades nas carrinhas da Base Fixa (quantidades_por_produto e semanais)
    const todosDias: DiaSemana[] = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
    const novaBaseFixa = baseFixaCarrinhas.map((bf) => {
      const mapaAtual = { ...(bf.quantidades_por_produto || bf.quantidades || {}) };
      if (nomeAntigo in mapaAtual) {
        const qtdAntiga = Number(mapaAtual[nomeAntigo] || 0);
        const qtdExistente = Number(mapaAtual[nomeNovo] || 0);
        delete mapaAtual[nomeAntigo];
        if (qtdAntiga + qtdExistente > 0) {
          mapaAtual[nomeNovo] = qtdAntiga + qtdExistente;
        }
      }
      const semanaAtual = bf.quantidades_semanais || ({} as Record<DiaSemana, Record<string, number>>);
      const novaSemana: any = { ...semanaAtual };
      todosDias.forEach((d) => {
        const mapaDia = { ...(novaSemana[d] || {}) };
        if (nomeAntigo in mapaDia) {
          const qOld = Number(mapaDia[nomeAntigo] || 0);
          const qNew = Number(mapaDia[nomeNovo] || 0);
          delete mapaDia[nomeAntigo];
          if (qOld + qNew > 0) mapaDia[nomeNovo] = qOld + qNew;
          novaSemana[d] = mapaDia;
        }
      });
      return {
        ...bf,
        quantidades_por_produto: mapaAtual,
        quantidades: mapaAtual,
        quantidades_semanais: novaSemana,
        quantidades_semana: novaSemana,
      };
    });
    setBaseFixaCarrinhas(novaBaseFixa);
    salvarBaseFixaCarrinhas(novaBaseFixa);

    // 3. Migrar também nos clientes B2B caso usassem o nome antigo
    const novosClientesB2B = clientesB2B.map((cli) => {
      const semanaAtual = cli.quantidades_semanais || cli.quantidades_semana || ({} as Record<DiaSemana, Record<string, number>>);
      const novaSemana: any = { ...semanaAtual };
      todosDias.forEach((d) => {
        const mapaDia = { ...(novaSemana[d] || {}) };
        if (nomeAntigo in mapaDia) {
          const qOld = Number(mapaDia[nomeAntigo] || 0);
          const qNew = Number(mapaDia[nomeNovo] || 0);
          delete mapaDia[nomeAntigo];
          if (qOld + qNew > 0) mapaDia[nomeNovo] = qOld + qNew;
          novaSemana[d] = mapaDia;
        }
      });
      return {
        ...cli,
        quantidades_semanais: novaSemana,
        quantidades_semana: novaSemana,
      };
    });
    setClientesB2B(novosClientesB2B);
    salvarClientesEmpresariaisB2B(novosClientesB2B);

    setArtigoBaseFixaEmEdicao(null);
    setFeedbackBaseFixa(`Artigo "${nomeAntigo}" corrigido para "${nomeNovo}" com sucesso!`);
    setTimeout(() => setFeedbackBaseFixa(null), 3500);
  };

  const handleEliminarArtigoBaseFixa = (prodNome: string) => {
    if (!window.confirm(`Deseja eliminar o artigo "${prodNome}" da Base Fixa Diária de Clientes Particulares (1º ao 4º Carro)?`)) {
      return;
    }

    const novaListaArtigos = artigosGrelhaBaseFixa.filter((a) => a !== prodNome);
    setArtigosBaseFixa(novaListaArtigos);
    salvarArtigosBaseFixa(novaListaArtigos);

    const novaBaseFixa = baseFixaCarrinhas.map((bf) => {
      const mapaAtual = { ...(bf.quantidades_por_produto || bf.quantidades || {}) };
      delete mapaAtual[prodNome];
      return {
        ...bf,
        quantidades_por_produto: mapaAtual,
        quantidades: mapaAtual,
      };
    });
    setBaseFixaCarrinhas(novaBaseFixa);
    salvarBaseFixaCarrinhas(novaBaseFixa);

    if (artigoBaseFixaEmEdicao === prodNome) {
      setArtigoBaseFixaEmEdicao(null);
    }
    setFeedbackBaseFixa(`Artigo "${prodNome}" eliminado da Base Fixa!`);
    setTimeout(() => setFeedbackBaseFixa(null), 3500);
  };

  const handleCopiarDiaParaTodaSemanaBaseFixa = (diaOrigem: DiaSemana) => {
    const todosDias: DiaSemana[] = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
    const novaLista = baseFixaCarrinhas.map((bf) => {
      const semAtual = bf.quantidades_semanais || {
        seg: { ...(bf.quantidades_por_produto || {}) },
        ter: { ...(bf.quantidades_por_produto || {}) },
        qua: { ...(bf.quantidades_por_produto || {}) },
        qui: { ...(bf.quantidades_por_produto || {}) },
        sex: { ...(bf.quantidades_por_produto || {}) },
        sab: { ...(bf.quantidades_por_produto || {}) },
        dom: { ...(bf.quantidades_por_produto || {}) },
      };
      const baseDia = { ...(semAtual[diaOrigem] || bf.quantidades_por_produto || {}) };
      const novaSemana: any = {};
      todosDias.forEach((d) => {
        novaSemana[d] = { ...baseDia };
      });
      return {
        ...bf,
        quantidades_semanais: novaSemana,
        quantidades_por_produto: baseDia,
        quantidades: baseDia,
      };
    });
    setBaseFixaCarrinhas(novaLista);
    salvarBaseFixaCarrinhas(novaLista);
    const nomeDia = DIAS_SEMANA_NOMES.find((d) => d.id === diaOrigem)?.label || diaOrigem;
    setFeedbackBaseFixa(`Quantidades de ${nomeDia} replicadas para todos os dias da semana em todas as carrinhas!`);
    setTimeout(() => setFeedbackBaseFixa(null), 3500);
  };

  const abrirFolhaCargaPdfModal = (carId?: string) => {
    const alvoId = carId || carrinhaExportacaoId || carrinhas[0]?.id;
    const carAlvo = carrinhas.find((c) => c.id === alvoId) || carrinhas[0];
    if (!carAlvo) return;

    const mapaItens = new Map<string, { quantidade: number; categoria: 'padaria' | 'pastelaria'; unidade: string }>();

    // 1. Base fixa da carrinha
    const bf = baseFixaCarrinhas.find((b) => b.carrinha_id === carAlvo.id);
    const sem = bf?.quantidades_semanais || bf?.quantidades_semana;
    const mapaHoje = sem?.[diaSemanaBaseFixa] || bf?.quantidades_por_produto || {};

    Object.entries(mapaHoje).forEach(([artigo, qtd]) => {
      if (typeof qtd === 'number' && qtd > 0) {
        const prod = produtos.find((p) => p.nome.toLowerCase() === artigo.toLowerCase());
        mapaItens.set(artigo, {
          quantidade: qtd,
          categoria: prod?.categoria || 'padaria',
          unidade: prod?.unidade?.toLowerCase().includes('kg') ? 'kg' : 'un.',
        });
      }
    });

    // NOTA: Clientes B2B foram desdobrados para o fim da Folha de Carga.
    // A Tabela Principal inclui estritamente a Base Diária da viatura.

    const itens: LinhaArtigoCarga[] = [];
    mapaItens.forEach((val, nome) => {
      const fatorCaixa = val.categoria === 'pastelaria' ? 20 : 30;
      itens.push({
        nome,
        categoria: val.categoria,
        unidade: val.unidade,
        quantidade: val.quantidade,
        caixasEstimadas: Math.ceil(val.quantidade / fatorCaixa),
      });
    });

    itens.sort((a, b) => a.nome.localeCompare(b.nome));

    setPdfItensCarga(itens);
    setPdfCarrinhaSelecionada(carAlvo);
    setPdfModalTipo('folha_carga');
    setPdfModalOpen(true);
  };

  const abrirComprovativoB2BPdfModal = (cliente: ClienteEmpresarialB2B) => {
    const car = carrinhas.find((c) => c.id === cliente.carrinha_id) || carrinhas[0];
    setPdfModalTipo('comprovativo_b2b');
    setPdfClienteB2B(cliente);
    setPdfCarrinhaSelecionada(car);
    setPdfModalOpen(true);
  };

  const abrirGuiaCargaConjuntaPdf = () => {
    const dataAlvo = new Date().toISOString().split('T')[0];
    const dados = calcularDadosGuiaCargaConjunta(
      dataAlvo,
      carrinhas,
      baseFixaCarrinhas,
      clientesB2B,
      basesRecorrentes,
      encomendas,
      produtos
    );
    setPdfDadosGuiaConjunta(dados);
    setPdfModalTipo('guia_carga_conjunta');
    setPdfModalOpen(true);
  };

  const handleExportarExcelBaseFixaConsolidado = () => {
    const wb = XLSX.utils.book_new();
    const listaDias: { id: DiaSemana; label: string }[] = [
      { id: 'seg', label: 'Segunda-feira' },
      { id: 'ter', label: 'Terça-feira' },
      { id: 'qua', label: 'Quarta-feira' },
      { id: 'qui', label: 'Quinta-feira' },
      { id: 'sex', label: 'Sexta-feira' },
      { id: 'sab', label: 'Sábado' },
      { id: 'dom', label: 'Domingo' },
    ];

    listaDias.forEach((d) => {
      const cabecalho = ['Produto_Artigo', ...carrinhasBaseDiaria.map((c) => c.identificador || c.nome), 'Total_Dia'];
      const linhas: any[] = artigosGrelhaBaseFixa.map((prodNome) => {
        const qtds = carrinhasBaseDiaria.map((c) => obterQtdBaseCarrinha(c.id, d.id, prodNome));
        const total = qtds.reduce((a, b) => a + b, 0);
        return [prodNome, ...qtds, total];
      });

      const totaisPorCarrinha = carrinhasBaseDiaria.map((c) => {
        return artigosGrelhaBaseFixa.reduce((acc, prodNome) => acc + obterQtdBaseCarrinha(c.id, d.id, prodNome), 0);
      });
      const grandeTotal = totaisPorCarrinha.reduce((a, b) => a + b, 0);
      linhas.push(['TOTAL GERAL', ...totaisPorCarrinha, grandeTotal]);

      const ws = XLSX.utils.aoa_to_sheet([cabecalho, ...linhas]);
      XLSX.utils.book_append_sheet(wb, ws, d.label.substring(0, 31));
    });

    const dataStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Base_Diaria_Total_Todas_Carrinhas_${dataStr}.xlsx`);
  };

  const handleExportarExcelBaseFixaIndividual = (carrinhaIdParaExportar?: string) => {
    const alvoId = carrinhaIdParaExportar || carrinhaExportacaoId || carrinhas[0]?.id;
    const carrinhaAlvo = carrinhas.find((c) => c.id === alvoId) || carrinhas[0];
    if (!carrinhaAlvo) {
      alert('Selecione uma carrinha para exportar.');
      return;
    }
    const nomeCarrinha = carrinhaAlvo.identificador || carrinhaAlvo.nome || 'Carrinha';
    const wb = XLSX.utils.book_new();

    const cabecalho = ['Produto_Artigo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo', 'Total_Semana'];
    const dias: DiaSemana[] = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];

    const linhas: any[] = artigosGrelhaBaseFixa.map((prodNome) => {
      const qtds = dias.map((d) => obterQtdBaseCarrinha(carrinhaAlvo.id, d, prodNome));
      const totalSemana = qtds.reduce((a, b) => a + b, 0);
      return [prodNome, ...qtds, totalSemana];
    });

    const totaisPorDia = dias.map((d) => {
      return artigosGrelhaBaseFixa.reduce((acc, prodNome) => acc + obterQtdBaseCarrinha(carrinhaAlvo.id, d, prodNome), 0);
    });
    const grandeTotalSemana = totaisPorDia.reduce((a, b) => a + b, 0);
    linhas.push(['TOTAL GERAL', ...totaisPorDia, grandeTotalSemana]);

    const ws = XLSX.utils.aoa_to_sheet([cabecalho, ...linhas]);
    const nomeAba = nomeCarrinha.replace(/[/\\?*[\]]/g, '_').substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, nomeAba);

    const dataStr = new Date().toISOString().split('T')[0];
    const nomeFicheiro = `Base_Diaria_${nomeCarrinha.replace(/\s+/g, '_')}_${dataStr}.xlsx`;
    XLSX.writeFile(wb, nomeFicheiro);
  };

  const handleImportarExcelBaseFixa = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        if (!buffer) return;
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);
        if (!rows.length) return;

        const novosArtigos: string[] = [];
        const mapasPorCarrinha: Record<string, Record<string, number>> = {};
        carrinhas.forEach((c) => {
          mapasPorCarrinha[c.id] = {};
        });

        for (const r of rows) {
          const prodNome = String(
            r['Produto_Artigo'] ||
            r['Produto / Artigo (Mapa Diário)'] ||
            r['Produto'] ||
            r['Artigo'] ||
            r['Nome'] ||
            ''
          ).trim();
          if (!prodNome || prodNome.toUpperCase() === 'TOTAL GERAL' || prodNome.toUpperCase() === 'TOTAL') continue;
          if (!novosArtigos.includes(prodNome)) novosArtigos.push(prodNome);

          carrinhas.forEach((c, idx) => {
            const val = r[c.identificador] ?? r[c.nome] ?? r[`Carrinha ${idx + 1}`] ?? r[`${idx + 1}º Carro`] ?? 0;
            const qtdNum = Math.max(0, Math.floor(Number(val) || 0));
            if (qtdNum > 0) {
              mapasPorCarrinha[c.id][prodNome] = qtdNum;
            }
          });
        }

        if (novosArtigos.length > 0) {
          const novaBaseFixa: BaseFixaCarrinha[] = carrinhas.map((c) => {
            const regExistente = baseFixaCarrinhas.find((b) => b.carrinha_id === c.id);
            const semAtual = regExistente?.quantidades_semanais || {
              seg: {}, ter: {}, qua: {}, qui: {}, sex: {}, sab: {}, dom: {}
            };
            const novoMapaDia = mapasPorCarrinha[c.id] || {};
            const novaSem = {
              ...semAtual,
              [diaSemanaBaseFixa]: novoMapaDia,
            };
            return {
              carrinha_id: c.id,
              carrinha_nome: c.identificador || c.nome,
              quantidades_semanais: novaSem,
              quantidades_por_produto: novoMapaDia,
              quantidades: novoMapaDia,
            };
          });

          setArtigosBaseFixa(novosArtigos);
          salvarArtigosBaseFixa(novosArtigos);
          setBaseFixaCarrinhas(novaBaseFixa);
          salvarBaseFixaCarrinhas(novaBaseFixa);
          setFeedbackBaseFixa(`Importação concluída! ${novosArtigos.length} artigos atualizados para ${DIAS_SEMANA_NOMES.find((d) => d.id === diaSemanaBaseFixa)?.label}.`);
          setTimeout(() => setFeedbackBaseFixa(null), 4000);
        }
      } catch (err: any) {
        alert(`Erro ao importar ficheiro de Base Diária: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleGuardarBaseFixaManual = () => {
    salvarArtigosBaseFixa(artigosGrelhaBaseFixa);
    salvarBaseFixaCarrinhas(baseFixaCarrinhas);
    setFeedbackBaseFixa('Base diária das carrinhas guardada com sucesso!');
    setTimeout(() => setFeedbackBaseFixa(null), 3500);
  };

  const handleAlterarQtdClienteB2B = (clienteId: string, dia: DiaSemana, produtoNome: string, valor: number) => {
    const qtdLimpa = Math.max(0, Math.floor(Number(valor) || 0));
    const novaLista = clientesB2B.map((cli) => {
      if (cli.id !== clienteId) return cli;
      const semanaAtual = cli.quantidades_semanais || cli.quantidades_semana || ({} as Record<DiaSemana, Record<string, number>>);
      const mapaDia = { ...(semanaAtual[dia] || {}) };
      if (qtdLimpa <= 0) {
        delete mapaDia[produtoNome];
      } else {
        mapaDia[produtoNome] = qtdLimpa;
      }
      const novaSemana = {
        ...semanaAtual,
        [dia]: mapaDia,
      };
      return {
        ...cli,
        quantidades_semanais: novaSemana,
        quantidades_semana: novaSemana,
      };
    });
    setClientesB2B(novaLista);
    salvarClientesEmpresariaisB2B(novaLista);
  };

  const handleCopiarDiaParaTodaSemanaB2B = (diaOrigem: DiaSemana) => {
    const todosDias: DiaSemana[] = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
    const novaLista = clientesB2B.map((cli) => {
      const semanaAtual = cli.quantidades_semanais || cli.quantidades_semana || ({} as Record<DiaSemana, Record<string, number>>);
      const baseDia = { ...(semanaAtual[diaOrigem] || {}) };
      const novaSemana: Record<DiaSemana, Record<string, number>> = {
        seg: { ...baseDia },
        ter: { ...baseDia },
        qua: { ...baseDia },
        qui: { ...baseDia },
        sex: { ...baseDia },
        sab: { ...baseDia },
        dom: { ...baseDia },
      };
      todosDias.forEach((d) => {
        novaSemana[d] = { ...baseDia };
      });
      return {
        ...cli,
        quantidades_semanais: novaSemana,
        quantidades_semana: novaSemana,
      };
    });
    setClientesB2B(novaLista);
    salvarClientesEmpresariaisB2B(novaLista);
    setFeedbackB2B('Quantidades do dia selecionadas copiadas para todos os dias da semana (Seg a Dom)!');
    setTimeout(() => setFeedbackB2B(null), 3500);
  };

  const handleSalvarClienteB2BModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteB2BEmEdicao || !clienteB2BEmEdicao.nome.trim()) return;
    const semanaSync = clienteB2BEmEdicao.quantidades_semanais || clienteB2BEmEdicao.quantidades_semana || {
      seg: {}, ter: {}, qua: {}, qui: {}, sex: {}, sab: {}, dom: {}
    };
    const itemNormalizado: ClienteEmpresarialB2B = {
      ...clienteB2BEmEdicao,
      nome: clienteB2BEmEdicao.nome.trim(),
      nif: (clienteB2BEmEdicao.nif || '').trim(),
      telefone: (clienteB2BEmEdicao.telefone || clienteB2BEmEdicao.telemovel || '').trim(),
      telemovel: (clienteB2BEmEdicao.telemovel || clienteB2BEmEdicao.telefone || '').trim(),
      email: (clienteB2BEmEdicao.email || '').trim().toLowerCase(),
      password: (clienteB2BEmEdicao.password || '').trim(),
      morada: (clienteB2BEmEdicao.morada || 'Arouca').trim(),
      carrinha_id: clienteB2BEmEdicao.carrinha_id || carrinhas[0]?.id || '1eaaa9bd-e3de-4b06-9c80-d1e464bcdc75',
      quantidades_semanais: semanaSync,
      quantidades_semana: semanaSync,
    };
    const existe = clientesB2B.some((c) => c.id === itemNormalizado.id);
    const novaLista = existe
      ? clientesB2B.map((c) => (c.id === itemNormalizado.id ? itemNormalizado : c))
      : [...clientesB2B, itemNormalizado];
    setClientesB2B(novaLista);
    salvarClientesEmpresariaisB2B(novaLista);
    setClienteB2BEmEdicao(null);
    setFeedbackB2B('Cliente Empresarial (B2B) guardado com sucesso!');
    setTimeout(() => setFeedbackB2B(null), 3500);
  };

  const handleEliminarClienteB2B = async (id: string, nome: string) => {
    if (!window.confirm(`Deseja remover o cliente empresarial "${nome}" da rota do 5º Carro?`)) return;
    const novaLista = clientesB2B.filter((c) => c.id !== id);
    setClientesB2B(novaLista);
    await eliminarClienteEmpresarialB2B(id);
  };

  const handleExportarTemplateB2B = () => {
    const wb = XLSX.utils.book_new();
    const colunasAtivas = artigosGrelhaBaseFixa.length > 0 ? artigosGrelhaBaseFixa : COLUNAS_MAPA_DIARIO_OFICIAL;
    const cabecalho = ['Cliente_Empresarial', 'Telefone', 'Morada', 'Carrinha', ...colunasAtivas];
    const linhas = clientesB2B.map((cli) => {
      const semanaAtual = cli.quantidades_semanais || cli.quantidades_semana || ({} as Record<DiaSemana, Record<string, number>>);
      const mapaDia = semanaAtual[diaSemanaB2B] || {};
      return [
        cli.nome,
        cli.telefone || '',
        cli.morada || '',
        '5º Carro',
        ...colunasAtivas.map((col) => mapaDia[col] || ''),
      ];
    });
    const ws = XLSX.utils.aoa_to_sheet([cabecalho, ...linhas]);
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes_B2B_5Carro');
    XLSX.writeFile(wb, `Template_Clientes_Empresariais_5Carro_${diaSemanaB2B.toUpperCase()}.xlsx`);
  };

  const handleImportarExcelB2B = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        if (!buffer) return;
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);
        if (!rows.length) return;

        const novaLista = [...clientesB2B];
        const todosDias: DiaSemana[] = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
        const colunasAtivas = artigosGrelhaBaseFixa.length > 0 ? artigosGrelhaBaseFixa : COLUNAS_MAPA_DIARIO_OFICIAL;

        for (const r of rows) {
          const nomeCli = String(r['Cliente_Empresarial'] || r['Cliente'] || r['Nome'] || '').trim();
          if (!nomeCli) continue;

          const mapaArtigos: Record<string, number> = {};
          for (const col of colunasAtivas) {
            const val = Number(r[col] || 0);
            if (val > 0) mapaArtigos[col] = val;
          }

          const idx = novaLista.findIndex((c) => c.nome.toLowerCase() === nomeCli.toLowerCase());
          if (idx >= 0) {
            const semanaAtualizada = { ...(novaLista[idx].quantidades_semanais || novaLista[idx].quantidades_semana || {}) } as Record<DiaSemana, Record<string, number>>;
            todosDias.forEach((d) => {
              semanaAtualizada[d] = { ...mapaArtigos };
            });
            novaLista[idx] = {
              ...novaLista[idx],
              telefone: String(r['Telefone'] || novaLista[idx].telefone || ''),
              morada: String(r['Morada'] || novaLista[idx].morada || ''),
              quantidades_semanais: semanaAtualizada,
              quantidades_semana: semanaAtualizada,
            };
          } else {
            const novaSemana: any = {};
            todosDias.forEach((d) => {
              novaSemana[d] = { ...mapaArtigos };
            });
            novaLista.push({
              id: `b2b-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              nome: nomeCli,
              telefone: String(r['Telefone'] || ''),
              morada: String(r['Morada'] || 'Arouca'),
              carrinha_id: 'b555db95-c427-4ed5-83fc-01403bd24cf5',
              ativo: true,
              quantidades_semanais: novaSemana,
              quantidades_semana: novaSemana,
            });
          }
        }

        setClientesB2B(novaLista);
        salvarClientesEmpresariaisB2B(novaLista);
        setFeedbackB2B(`Importação concluída! ${rows.length} clientes empresariais atualizados no 5º Carro.`);
        setTimeout(() => setFeedbackB2B(null), 4000);
      } catch (err: any) {
        alert(`Erro ao importar ficheiro B2B: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // --- Handlers de Bases Diárias Recorrentes (Porta-a-Porta & Modo Férias) ---
  const handleSalvarBaseRecorrenteModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseRecorrenteEmEdicao || !baseRecorrenteEmEdicao.cliente_id || !baseRecorrenteEmEdicao.carrinha_id) {
      alert('Por favor selecione o cliente e a rota/carrinha de distribuição.');
      return;
    }

    const salvo = await salvarBaseDiariaRecorrente(baseRecorrenteEmEdicao as any);
    if (salvo) {
      const atualizadas = await carregarBasesDiariasRecorrentes();
      setBasesRecorrentes(atualizadas);
      setBaseRecorrenteEmEdicao(null);
      setFeedbackBaseRecorrente('Entrega diária recorrente guardada com sucesso!');
      setTimeout(() => setFeedbackBaseRecorrente(null), 3500);
    }
  };

  const handleEliminarBaseRecorrente = async (id: string, clienteNome?: string) => {
    if (!window.confirm(`Deseja eliminar a entrega diária recorrente do cliente "${clienteNome || 'selecionado'}"?`)) return;
    const ok = await eliminarBaseDiariaRecorrente(id);
    if (ok) {
      const atualizadas = await carregarBasesDiariasRecorrentes();
      setBasesRecorrentes(atualizadas);
    }
  };

  const handleAbrirModalFerias = (base: BaseDiariaRecorrente) => {
    setModalFeriasBase(base);
    setFeriasInicio(base.pausa_inicio || '');
    setFeriasFim(base.pausa_fim || '');
  };

  const handleSalvarFerias = async () => {
    if (!modalFeriasBase) return;
    const atualizado = await salvarBaseDiariaRecorrente({
      ...modalFeriasBase,
      pausa_inicio: feriasInicio || null,
      pausa_fim: feriasFim || null,
    });
    if (atualizado) {
      const lista = await carregarBasesDiariasRecorrentes();
      setBasesRecorrentes(lista);
      setModalFeriasBase(null);
      setFeedbackBaseRecorrente('Modo Férias atualizado com sucesso!');
      setTimeout(() => setFeedbackBaseRecorrente(null), 3500);
    }
  };

  const handleCancelarFerias = async (base: BaseDiariaRecorrente) => {
    if (!window.confirm(`Deseja cancelar o Modo Férias e retomar as entregas diárias de imediato para "${base.cliente_nome || 'o cliente'}"?`)) return;
    const atualizado = await salvarBaseDiariaRecorrente({
      ...base,
      pausa_inicio: null,
      pausa_fim: null,
    });
    if (atualizado) {
      const lista = await carregarBasesDiariasRecorrentes();
      setBasesRecorrentes(lista);
      setFeedbackBaseRecorrente('Entregas diárias retomadas com sucesso!');
      setTimeout(() => setFeedbackBaseRecorrente(null), 3500);
    }
  };

  // Filtragem Reativa de Encomendas (Tempo + Loja + Formato de Entrega)
  const encomendasFiltradas = useMemo(() => {
    const hoje = new Date();
    const hojeStr = hoje.toISOString().split('T')[0];

    // Cálculo da semana corrente (últimos 7 dias)
    const seteDiasAtras = new Date(hoje);
    seteDiasAtras.setDate(hoje.getDate() - 7);
    const seteDiasStr = seteDiasAtras.toISOString().split('T')[0];

    // Cálculo do mês corrente (a partir do dia 1)
    const mesInicioStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;

    // Cálculo do ano corrente (a partir de 1 de janeiro)
    const anoInicioStr = `${hoje.getFullYear()}-01-01`;

    return encomendas.filter((e) => {
      if (!e) return false;
      // 1. Filtro de Loja
      const matchLoja = selectedLojaId === 'todas' || e.loja_id === selectedLojaId;

      // 2. Filtro de Formato de Entrega
      const matchFormato = formatoEntrega === 'todos' || e.tipo === formatoEntrega;

      // 3. Filtro Temporal
      let matchTempo = true;
      const dataEnc = e.data_agendamento || '';

      if (periodoSelecionado === 'dia') {
        matchTempo = dataEnc === hojeStr;
      } else if (periodoSelecionado === 'semana') {
        matchTempo = dataEnc >= seteDiasStr && dataEnc <= hojeStr;
      } else if (periodoSelecionado === 'mes') {
        matchTempo = dataEnc >= mesInicioStr;
      } else if (periodoSelecionado === 'ano') {
        matchTempo = dataEnc >= anoInicioStr;
      }

      return matchLoja && matchFormato && matchTempo;
    });
  }, [encomendas, selectedLojaId, formatoEntrega, periodoSelecionado]);

  // Cálculos de Indicadores Operacionais (Foco em cumprimento e volume)
  const totalVolumeEncomendas = encomendasFiltradas.length;
  const totalArtigos = encomendasFiltradas.reduce(
    (acc, curr) => acc + (curr?.itens || []).reduce((iAcc, item) => iAcc + (Number(item?.quantidade) || 0), 0),
    0
  );
  const totalEntregas = encomendasFiltradas.filter((e) => e?.tipo === 'entrega_domicilio').length;
  const totalLevantamentos = encomendasFiltradas.filter((e) => e?.tipo === 'levantamento_loja').length;

  // Necessidades Consolidadas de Produção com o filtro ativo
  const mapaProducao: { [nome: string]: { quantidade: number; setor: string; unidade: string } } = {};
  encomendasFiltradas.forEach((enc) => {
    (enc.itens || []).forEach((item) => {
      if (!item || !item.produto_nome) return;
      const prod = produtos.find((p) => p.id === item.produto_id) || PRODUTOS_MOCK.find((p) => p.id === item.produto_id);
      if (!mapaProducao[item.produto_nome]) {
        mapaProducao[item.produto_nome] = {
          quantidade: 0,
          setor: item.setor || prod?.categoria || 'padaria',
          unidade: prod?.unidade || 'unidade',
        };
      }
      mapaProducao[item.produto_nome].quantidade += Number(item.quantidade) || 0;
    });
  });
  const itensProducaoConsolidados = Object.entries(mapaProducao).sort((a, b) => b[1].quantidade - a[1].quantidade);

  // Função auxiliar de cálculo de desvio em minutos entre hora planeada e real
  const calcularDesvioMinutos = (horaAgendada?: string, horaReal?: string): number | null => {
    if (!horaAgendada || !horaReal || typeof horaAgendada !== 'string' || typeof horaReal !== 'string') return null;
    const partesA = horaAgendada.split(':');
    const partesR = horaReal.split(':');
    if (partesA.length < 2 || partesR.length < 2) return null;
    const hA = Number(partesA[0]);
    const mA = Number(partesA[1]);
    const hR = Number(partesR[0]);
    const mR = Number(partesR[1]);
    if (isNaN(hA) || isNaN(mA) || isNaN(hR) || isNaN(mR)) return null;
    return (hR * 60 + mR) - (hA * 60 + mA);
  };

  // Cálculo de % On-Time (Pontualidade das Entregas) com tolerância de 10 min
  const entregasFinalizadas = useMemo(() => {
    return encomendasFiltradas.filter((e) => e?.estado === 'entregue' && (e?.hora_entrega_real || e?.hora_agendamento));
  }, [encomendasFiltradas]);

  const entregasNoPrazo = useMemo(() => {
    return entregasFinalizadas.filter((e) => {
      const desvio = calcularDesvioMinutos(e?.hora_agendamento, e?.hora_entrega_real || e?.hora_agendamento);
      return desvio === null || desvio <= 10;
    });
  }, [entregasFinalizadas]);

  const taxaPontualidade = entregasFinalizadas.length > 0
    ? Math.round((entregasNoPrazo.length / entregasFinalizadas.length) * 100)
    : 100;

  // Top 5 Clientes com mais encomendas no período
  const topClientes = useMemo(() => {
    const contagem: Record<string, { nome: string; telefone: string; morada?: string; total: number }> = {};
    encomendasFiltradas.forEach((e) => {
      const chave = e.cliente?.telefone || e.cliente?.nome || e.id;
      if (!contagem[chave]) {
        contagem[chave] = { nome: e.cliente?.nome || 'Cliente', telefone: e.cliente?.telefone || '', morada: e.cliente?.morada, total: 0 };
      }
      contagem[chave].total += 1;
    });
    return Object.values(contagem).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [encomendasFiltradas]);

  // Top 5 Artigos mais pedidos no período
  const topArtigos = useMemo(() => {
    const contagem: Record<string, { nome: string; setor: string; quantidade: number }> = {};
    encomendasFiltradas.forEach((e) => {
      (e.itens || []).forEach((item) => {
        if (!item || !item.produto_nome) return;
        if (!contagem[item.produto_nome]) {
          contagem[item.produto_nome] = { nome: item.produto_nome, setor: item.setor || 'padaria', quantidade: 0 };
        }
        contagem[item.produto_nome].quantidade += Number(item.quantidade) || 0;
      });
    });
    return Object.values(contagem).sort((a, b) => b.quantidade - a.quantidade).slice(0, 5);
  }, [encomendasFiltradas]);

  // Estatísticas por Canal de Origem da Encomenda
  const canaisOrigemStats = useMemo(() => {
    const counts = {
      presencial: 0,
      telefone: 0,
      whatsapp: 0,
      site_online: 0,
    };
    encomendasFiltradas.forEach((e) => {
      const c = e.canal_origem || 'presencial';
      if (counts[c] !== undefined) {
        counts[c]++;
      } else {
        counts.presencial++;
      }
    });
    return counts;
  }, [encomendasFiltradas]);

  // Ações de Ordenação da Tabela Consolidada
  const handleToggleSortConsolidada = (col: string) => {
    setSortConsolidada(prev => ({
      col,
      dir: prev.col === col && prev.dir === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Encomendas para a Tabela de Detalhe Consolidado de Planeamento vs Real (com filtros e ordenação)
  const encomendasTabelaConsolidada = useMemo(() => {
    let base = [...encomendasFiltradas];

    if (filtroDataConsolidada) {
      base = base.filter((e) => e.data_agendamento === filtroDataConsolidada);
    }
    if (filtroConsolidada.codigo.trim()) {
      const q = filtroConsolidada.codigo.toLowerCase().trim();
      base = base.filter(e => e.codigo.toLowerCase().includes(q));
    }
    if (filtroConsolidada.cliente.trim()) {
      const q = filtroConsolidada.cliente.toLowerCase().trim();
      base = base.filter(e => 
        (e.cliente?.nome || '').toLowerCase().includes(q) || 
        (e.cliente?.telefone || '').includes(q)
      );
    }
    if (filtroConsolidada.formato !== 'todos') {
      base = base.filter(e => e.tipo === filtroConsolidada.formato);
    }
    if (filtroConsolidada.data.trim()) {
      base = base.filter(e => (e.data_agendamento || '').includes(filtroConsolidada.data.trim()));
    }
    if (filtroConsolidada.horaPlaneada.trim()) {
      base = base.filter(e => (e.hora_agendamento || '').includes(filtroConsolidada.horaPlaneada.trim()));
    }
    if (filtroConsolidada.horaReal.trim()) {
      base = base.filter(e => (e.hora_entrega_real || '').includes(filtroConsolidada.horaReal.trim()));
    }
    if (filtroConsolidada.pontualidade !== 'todos') {
      base = base.filter(e => {
        if (e.estado !== 'entregue') return filtroConsolidada.pontualidade === 'pendente';
        const d = e.hora_entrega_real ? calcularDesvioMinutos(e.hora_agendamento, e.hora_entrega_real) : null;
        if (filtroConsolidada.pontualidade === 'no_prazo') return d !== null && d <= 10;
        if (filtroConsolidada.pontualidade === 'atraso') return d !== null && d > 10;
        return true;
      });
    }
    if (filtroConsolidada.estado !== 'todos') {
      base = base.filter(e => e.estado === filtroConsolidada.estado);
    }

    base.sort((a, b) => {
      let res = 0;
      switch (sortConsolidada.col) {
        case 'codigo':
          res = (a.codigo || '').localeCompare(b.codigo || '');
          break;
        case 'cliente':
          res = (a.cliente?.nome || '').localeCompare(b.cliente?.nome || '');
          break;
        case 'formato':
          res = (a.tipo || '').localeCompare(b.tipo || '');
          break;
        case 'data_agendamento':
          res = (a.data_agendamento || '').localeCompare(b.data_agendamento || '');
          if (res === 0) res = (a.hora_agendamento || '').localeCompare(b.hora_agendamento || '');
          break;
        case 'hora_agendamento':
          res = (a.hora_agendamento || '').localeCompare(b.hora_agendamento || '');
          break;
        case 'hora_entrega_real':
          res = (a.hora_entrega_real || '').localeCompare(b.hora_entrega_real || '');
          break;
        case 'pontualidade': {
          const dA = a.hora_entrega_real ? calcularDesvioMinutos(a.hora_agendamento, a.hora_entrega_real) : 999;
          const dB = b.hora_entrega_real ? calcularDesvioMinutos(b.hora_agendamento, b.hora_entrega_real) : 999;
          res = (dA ?? 999) - (dB ?? 999);
          break;
        }
        case 'estado':
          res = (a.estado || '').localeCompare(b.estado || '');
          break;
        default:
          res = (a.data_agendamento || '').localeCompare(b.data_agendamento || '');
      }
      return sortConsolidada.dir === 'asc' ? res : -res;
    });

    return base;
  }, [encomendasFiltradas, filtroDataConsolidada, filtroConsolidada, sortConsolidada]);

  // Ações da Tabela Interativa de Produtos
  const handleToggleSortProdutos = (col: 'nome' | 'categoria' | 'unidade' | 'ativo') => {
    setSortProdutos(prev => ({
      col,
      dir: prev.col === col && prev.dir === 'asc' ? 'desc' : 'asc'
    }));
  };

  const produtosFiltradosTabela = useMemo(() => {
    let list = [...(produtos || [])];

    if (filtroProdutos.busca.trim()) {
      const q = filtroProdutos.busca.toLowerCase().trim();
      list = list.filter(p => (p.nome || '').toLowerCase().includes(q) || (p.id || '').toLowerCase().includes(q));
    }
    if (filtroProdutos.categoria !== 'todas') {
      list = list.filter(p => (p.categoria || '') === filtroProdutos.categoria);
    }
    if (filtroProdutos.unidade !== 'todas') {
      list = list.filter(p => (p.unidade || '') === filtroProdutos.unidade);
    }
    if (filtroProdutos.ativo !== 'todos') {
      const isAtivo = filtroProdutos.ativo === 'ativo';
      list = list.filter(p => Boolean(p.ativo) === isAtivo);
    }

    list.sort((a, b) => {
      let res = 0;
      if (sortProdutos.col === 'nome') {
        res = (a.nome || '').localeCompare(b.nome || '');
      } else if (sortProdutos.col === 'categoria') {
        res = (a.categoria || '').localeCompare(b.categoria || '');
      } else if (sortProdutos.col === 'unidade') {
        res = (a.unidade || '').localeCompare(b.unidade || '');
      } else if (sortProdutos.col === 'ativo') {
        res = (a.ativo ? 1 : 0) - (b.ativo ? 1 : 0);
      }
      return sortProdutos.dir === 'asc' ? res : -res;
    });

    return list;
  }, [produtos, filtroProdutos, sortProdutos]);

  // Ações da Tabela Interativa de Logs de Auditoria
  const handleToggleSortLogs = (col: 'data_hora' | 'codigo' | 'cliente' | 'utilizador' | 'role' | 'painel' | 'acao' | 'detalhes') => {
    setSortLogs(prev => ({
      col,
      dir: prev.col === col && prev.dir === 'desc' ? 'asc' : 'desc'
    }));
  };

  const utilizadoresLogsUnicos = useMemo(() => {
    const s = new Set<string>();
    logsAuditoria.forEach(l => { if (l.utilizador_nome) s.add(l.utilizador_nome); });
    return Array.from(s).sort();
  }, [logsAuditoria]);

  const rolesLogsUnicas = useMemo(() => {
    const s = new Set<string>();
    logsAuditoria.forEach(l => { if (l.utilizador_role) s.add(String(l.utilizador_role)); });
    return Array.from(s).sort();
  }, [logsAuditoria]);

  const paineisLogsUnicos = useMemo(() => {
    const s = new Set<string>();
    logsAuditoria.forEach(l => { if (l.painel) s.add(String(l.painel)); });
    return Array.from(s).sort();
  }, [logsAuditoria]);

  const acoesLogsUnicas = useMemo(() => {
    const s = new Set<string>();
    logsAuditoria.forEach(l => { if (l.acao) s.add(l.acao); });
    return Array.from(s).sort();
  }, [logsAuditoria]);

  const logsFiltradosEOrdenados = useMemo(() => {
    const hojeStr = new Date().toISOString().split('T')[0];
    const dHoje = new Date();
    const dOntem = new Date(dHoje);
    dOntem.setDate(dOntem.getDate() - 1);
    const ontemStr = dOntem.toISOString().split('T')[0];
    const dSemana = new Date(dHoje);
    dSemana.setDate(dSemana.getDate() - 7);
    const semanaStr = dSemana.toISOString().split('T')[0];

    const filtrados = logsAuditoria.filter((log) => {
      // 1. Filtro de Loja Global
      if (selectedLojaId !== 'todas' && log.loja_id && log.loja_id !== selectedLojaId) {
        return false;
      }

      // 2. Filtro de Período Rápido / Datas
      if (filtroLogs.periodoRapido === 'hoje' && log.data !== hojeStr) return false;
      if (filtroLogs.periodoRapido === 'ontem' && log.data !== ontemStr) return false;
      if (filtroLogs.periodoRapido === 'semana' && log.data < semanaStr) return false;
      if (filtroLogs.dataInicio && log.data < filtroLogs.dataInicio) return false;
      if (filtroLogs.dataFim && log.data > filtroLogs.dataFim) return false;

      // 3. Filtros por Coluna
      if (filtroLogs.codigo && !(log.codigo_encomenda || '').toLowerCase().includes(filtroLogs.codigo.toLowerCase().trim())) {
        return false;
      }
      if (filtroLogs.cliente && !(log.cliente_nome || '').toLowerCase().includes(filtroLogs.cliente.toLowerCase().trim())) {
        return false;
      }
      if (filtroLogs.utilizador !== 'todos' && log.utilizador_nome !== filtroLogs.utilizador) {
        return false;
      }
      if (filtroLogs.role !== 'todos' && log.utilizador_role !== filtroLogs.role) {
        return false;
      }
      if (filtroLogs.painel !== 'todos' && log.painel !== filtroLogs.painel) {
        return false;
      }
      if (filtroLogs.acao !== 'todas' && log.acao !== filtroLogs.acao) {
        return false;
      }
      if (filtroLogs.detalhes && !(log.detalhes || '').toLowerCase().includes(filtroLogs.detalhes.toLowerCase().trim())) {
        return false;
      }

      return true;
    });

    filtrados.sort((a, b) => {
      let res = 0;
      switch (sortLogs.col) {
        case 'data_hora':
          res = `${a.data || ''} ${a.hora || ''}`.localeCompare(`${b.data || ''} ${b.hora || ''}`);
          break;
        case 'codigo':
          res = (a.codigo_encomenda || '').localeCompare(b.codigo_encomenda || '');
          break;
        case 'cliente':
          res = (a.cliente_nome || '').localeCompare(b.cliente_nome || '');
          break;
        case 'utilizador':
          res = (a.utilizador_nome || '').localeCompare(b.utilizador_nome || '');
          break;
        case 'role':
          res = String(a.utilizador_role || '').localeCompare(String(b.utilizador_role || ''));
          break;
        case 'painel':
          res = String(a.painel || '').localeCompare(String(b.painel || ''));
          break;
        case 'acao':
          res = (a.acao || '').localeCompare(b.acao || '');
          break;
        case 'detalhes':
          res = (a.detalhes || '').localeCompare(b.detalhes || '');
          break;
        default:
          res = `${a.data || ''} ${a.hora || ''}`.localeCompare(`${b.data || ''} ${b.hora || ''}`);
      }
      return sortLogs.dir === 'asc' ? res : -res;
    });

    return filtrados;
  }, [logsAuditoria, selectedLojaId, filtroLogs, sortLogs]);

  const logsPaginados = useMemo(() => {
    if (registosPorPaginaLogs === 'todos') return logsFiltradosEOrdenados;
    const inicio = (paginaAtualLogs - 1) * registosPorPaginaLogs;
    return logsFiltradosEOrdenados.slice(inicio, inicio + registosPorPaginaLogs);
  }, [logsFiltradosEOrdenados, paginaAtualLogs, registosPorPaginaLogs]);

  const totalPaginasLogs = registosPorPaginaLogs === 'todos' ? 1 : Math.ceil(logsFiltradosEOrdenados.length / registosPorPaginaLogs);

  const handleSalvarEdicaoProdutoModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoEmEdicaoModal || !produtoEmEdicaoModal.nome?.trim()) return;
    const salvo = await salvarProdutoDb(produtoEmEdicaoModal as any);
    if (salvo) {
      const prods = await carregarProdutosSupabase();
      setProdutos(prods);
      setProdutoEmEdicaoModal(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('app_produtos_atualizados'));
      }
      alert('Artigo atualizado com sucesso na Base de Dados!');
    }
  };

  const handleEliminarProduto = async (prodId: string, prodNome: string) => {
    if (!window.confirm(`Tem a certeza que deseja eliminar o artigo "${prodNome}" permanentemente da Base de Dados?`)) return;
    const ok = await eliminarProdutoDb(prodId);
    if (ok) {
      const prods = await carregarProdutosSupabase();
      setProdutos(prods);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('app_produtos_atualizados'));
      }
      alert('Artigo eliminado com sucesso!');
    } else {
      alert('Não foi possível eliminar o artigo.');
    }
  };

  // Ações de Talão
  const handleSalvarConfigTalao = (e: React.FormEvent) => {
    e.preventDefault();
    saveReceiptConfig(receiptConfig, lojaSelecionadaTalao);
    const lojaNome = lojaSelecionadaTalao === 'todas'
      ? 'Todas as Lojas'
      : (lojas.find((l) => l.id === lojaSelecionadaTalao)?.nome || 'a loja selecionada');
    setFeedbackTalao(`Configuração do talão guardada com sucesso para ${lojaNome}!`);
    setTimeout(() => setFeedbackTalao(null), 4000);
    alert(t.success);
  };

  // Ações de Lojas e Carrinhas
  const handleSalvarLoja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lojaEmEdicao || !lojaEmEdicao.nome || !lojaEmEdicao.codigo) return;
    const salva = await salvarLojaDb(lojaEmEdicao as any);
    if (salva) {
      const ljs = await carregarLojasSupabase();
      setLojas(ljs);
      setLojaEmEdicao(null);
      alert(t.success);
    }
  };

  const handleEliminarLoja = async (lojaId: string) => {
    if (!window.confirm('Tem a certeza que deseja eliminar permanentemente esta loja?')) return;
    const ok = await eliminarLojaDb(lojaId);
    if (ok) {
      const ljs = await carregarLojasSupabase();
      setLojas(ljs);
      setLojaEmEdicao(null);
      alert(t.success);
    }
  };

  const handleSalvarCarrinha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!carrinhaEmEdicao) return;
    const rotaLimpa = carrinhaEmEdicao.rota || carrinhaEmEdicao.identificador || 'Rota';
    const salva = await salvarCarrinhaDb({
      ...carrinhaEmEdicao,
      identificador: rotaLimpa,
      rota: rotaLimpa,
      nome_carro: carrinhaEmEdicao.nome_carro || `Carro ${carrinhaEmEdicao.numero || ''}`,
      nome_condutor: carrinhaEmEdicao.nome_condutor || '',
      matricula: (carrinhaEmEdicao.matricula || '').trim(),
      loja_id: carrinhaEmEdicao.loja_id || lojas[0]?.id || 'a9982e9f-7899-4a7c-8ce3-bc30f16c99a2',
    } as any);
    if (salva) {
      const cars = await carregarCarrinhasSupabase();
      setCarrinhas(cars);
      setCarrinhaEmEdicao(null);
      alert('Dados da viatura e rota guardados com sucesso!');
    }
  };

  const handleEliminarCarrinha = async (carrinhaId: string) => {
    if (!window.confirm('Tem a certeza que deseja eliminar permanentemente esta carrinha da frota?')) return;
    const ok = await eliminarCarrinhaDb(carrinhaId);
    if (ok) {
      const cars = await carregarCarrinhasSupabase();
      setCarrinhas(cars);
      setCarrinhaEmEdicao(null);
      alert(t.success);
    }
  };

  // Ações de Inserção de Registos Avulsos na Base de Dados
  const handleSalvarClienteAvulso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoCliente.nome.trim() || !novoCliente.telefone.trim()) {
      alert('Nome e telefone são obrigatórios.');
      return;
    }
    const salvo = await salvarClienteDb(novoCliente);
    if (salvo) {
      const clis = await carregarClientesSupabase();
      setClientes(clis);
      setNovoCliente({ nome: '', telefone: '', email: '', morada: '', codigo_postal: '', notas_entrega: '', tipo_cliente: 'particular', nif: '', carrinha_id: '' });
      setModalRegistoAvulsoAberto(false);
      alert('Cliente criado com sucesso na Base de Dados!');
    }
  };

  const handleSalvarProdutoAvulso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoProduto.nome.trim()) {
      alert('O nome do produto é obrigatório.');
      return;
    }
    const salvo = await salvarProdutoDb({
      nome: novoProduto.nome.trim(),
      preco: 0,
      categoria: novoProduto.categoria,
      unidade: novoProduto.unidade,
      ativo: true
    });
    if (salvo) {
      const prods = await carregarProdutosSupabase();
      setProdutos(prods);
      setNovoProduto({ nome: '', categoria: 'padaria', unidade: 'unidade' });
      setModalRegistoAvulsoAberto(false);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('app_produtos_atualizados'));
      }
      alert('Produto criado com sucesso na Base de Dados!');
    }
  };

  // Ações de Gestão de Acessos
  const aplicarPredefinicoesCargo = (cargo: Role) => {
    if (!perfilEmEdicao) return;
    const perm = matrizPermissoes[cargo] || obterPermissoesCargo(cargo);
    const lojaIdAtualizada =
      (cargo === 'atendente' || cargo === 'gerente_loja')
        ? (perfilEmEdicao.loja_id || lojas[0]?.id)
        : perfilEmEdicao.loja_id;

    setPerfilEmEdicao({
      ...perfilEmEdicao,
      role: cargo,
      loja_id: lojaIdAtualizada,
      ...perm,
      painel_encomendas: perm.acesso_encomendas !== 'sem_acesso',
      painel_producao: perm.acesso_producao !== 'sem_acesso',
      painel_loja: perm.acesso_loja !== 'sem_acesso',
      painel_entregas: perm.acesso_entregas !== 'sem_acesso',
      painel_gestao: perm.acesso_gestao !== 'sem_acesso',
    });
  };

  const handleSalvarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!perfilEmEdicao || !perfilEmEdicao.nome) return;

    const cargo: Role =
      perfilEmEdicao.role === 'operador_padaria' || perfilEmEdicao.role === 'operador_pastelaria'
        ? 'padeiro_pasteleiro'
        : (perfilEmEdicao.role as Role) || 'atendente';
    const perm = matrizPermissoes[cargo] || obterPermissoesCargo(cargo);

    // Se for atendente ou gerente de loja, garantir obrigatoriamente a loja afeta
    const lojaIdEfetiva =
      cargo === 'atendente' || cargo === 'gerente_loja'
        ? (perfilEmEdicao.loja_id || lojas[0]?.id)
        : (perfilEmEdicao.loja_id || undefined);

    const lojaEncontrada = lojas.find((l) => l.id === lojaIdEfetiva);

    const perfilParaGravar: PerfilUtilizador = {
      id: perfilEmEdicao.id || `user-${Date.now()}`,
      nome: perfilEmEdicao.nome.trim(),
      telefone: perfilEmEdicao.telefone?.trim() || '9xxxxxxxx',
      email: perfilEmEdicao.email?.trim() || '',
      password: perfilEmEdicao.password?.trim() || (cargo === 'admin' ? 'admin' : '123'),
      role: cargo,
      loja_id: lojaIdEfetiva,
      loja_nome: lojaEncontrada?.nome || (cargo === 'admin' ? 'Todas as Lojas' : undefined),
      acesso_encomendas: perm.acesso_encomendas,
      acesso_producao: perm.acesso_producao,
      acesso_loja: perm.acesso_loja,
      acesso_entregas: perm.acesso_entregas,
      acesso_gestao: perm.acesso_gestao,
      painel_encomendas: perm.acesso_encomendas !== 'sem_acesso',
      painel_producao: perm.acesso_producao !== 'sem_acesso',
      painel_loja: perm.acesso_loja !== 'sem_acesso',
      painel_entregas: perm.acesso_entregas !== 'sem_acesso',
      painel_gestao: perm.acesso_gestao !== 'sem_acesso',
      ativo: perfilEmEdicao.ativo ?? true,
    };

    const novaLista = await salvarPerfilAcessoDb(perfilParaGravar);
    setPerfis(novaLista);
    setPerfilEmEdicao(null);
    alert(t.success);
  };

  const handleSalvarMatrizPermissoes = async () => {
    setSalvandoMatriz(true);
    try {
      await salvarMatrizPermissoesCargos(matrizPermissoes);
      const perfisAtualizados = await carregarPerfisAcessoSupabase();
      setPerfis(perfisAtualizados);
      alert('Matriz de Permissões por Cargo guardada com sucesso! As novas permissões foram aplicadas a todos os colaboradores.');
    } catch (err: any) {
      alert(`Erro ao guardar matriz: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setSalvandoMatriz(false);
    }
  };

  const handleReporMatrizPadrao = () => {
    if (!window.confirm('Deseja repor a matriz de permissões com os valores recomendados de fábrica?')) return;
    setMatrizPermissoes({ ...MATRIZ_PERMISSOES_CARGOS_PADRAO });
  };

  const handleEliminarPerfil = async (id: string) => {
    if (!window.confirm('Tem a certeza de que deseja remover este utilizador?')) return;
    const novaLista = await eliminarPerfilAcessoDb(id);
    setPerfis(novaLista);
  };

  // Exportação Excel (.xlsx) Nativa
  const exportarExcel = (nomeFicheiro: string, nomeFolha: string, colunas: string[], linhas: (string | number)[][]) => {
    const wb = XLSX.utils.book_new();
    const dadosCompletos = [colunas, ...linhas];
    const ws = XLSX.utils.aoa_to_sheet(dadosCompletos);
    XLSX.utils.book_append_sheet(wb, ws, nomeFolha);
    const dataStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `${nomeFicheiro}_${dataStr}.xlsx`);
  };

  const exportarClientes = () => {
    exportarExcel('clientes_padaria', 'Clientes', ['Nome', 'Telefone', 'Morada', 'Codigo_Postal', 'Notas_Entrega', 'Email'], clientes.map((c) => [
      c.nome, c.telefone, c.morada || '', c.codigo_postal || '', c.notas_entrega || '', c.email || ''
    ]));
  };

  const exportarProdutos = () => {
    exportarExcel('produtos_padaria', 'Produtos', ['Nome', 'Categoria', 'Unidade', 'Ativo'], produtos.map((p) => [
      p.nome, p.categoria, p.unidade, p.ativo ? 'SIM' : 'NAO'
    ]));
  };

  const exportarEncomendas = () => {
    exportarExcel('encomendas_padaria', 'Encomendas', ['Codigo', 'Loja', 'Cliente', 'Telefone', 'Tipo', 'Data', 'Hora', 'Total', 'Estado', 'Pagamento'], encomendas.map((e) => [
      e.codigo, e.loja_nome || '', e.cliente?.nome || 'Cliente', e.cliente?.telefone || '', e.tipo, e.data_agendamento, e.hora_agendamento, e.total, e.estado, e.estado_pagamento
    ]));
  };

  const exportarLogsAuditoria = () => {
    const colunas = [
      'Data',
      'Hora',
      'Código Encomenda',
      'Cliente',
      'Colaborador/Utilizador',
      'Perfil/Cargo',
      'Módulo/Painel',
      'Ação Realizada',
      'Detalhes da Operação',
      'Loja'
    ];
    const linhas = logsFiltradosEOrdenados.map((l) => [
      l.data,
      l.hora,
      l.codigo_encomenda || 'N/A',
      l.cliente_nome || 'N/A',
      l.utilizador_nome,
      l.utilizador_role,
      l.painel,
      l.acao,
      l.detalhes,
      l.loja_nome || 'Todas as Lojas'
    ]);
    exportarExcel('historico_auditoria_padaria', 'Logs Auditoria', colunas, linhas);
  };

  const recarregarLogs = async () => {
    setCarregandoLogs(true);
    try {
      const logs = await carregarLogsAuditoriaSupabase();
      setLogsAuditoria(logs);
    } finally {
      setCarregandoLogs(false);
    }
  };

  const reiniciarLogs = async () => {
    if (!window.confirm('Deseja repor o histórico com os registos de auditoria estruturados de exemplo das 100 encomendas?')) return;
    setCarregandoLogs(true);
    try {
      const logs = await reiniciarLogsAuditoriaParaMock();
      setLogsAuditoria(logs);
      alert('Histórico de auditoria reposto com sucesso!');
    } finally {
      setCarregandoLogs(false);
    }
  };

  // Download de Templates em Excel (.xlsx)
  const descarregarTemplate = (tipo: 'clientes' | 'produtos') => {
    if (tipo === 'clientes') {
      exportarExcel('template_clientes', 'Clientes', ['Nome', 'Telefone', 'Morada', 'Codigo_Postal', 'Notas_Entrega', 'Email'], [
        ['Manuel Ferreira', '912345678', 'Rua Dr. Teixeira de Brito, Arouca', '4540-100', 'Campainha 2º Dto', 'manuel@exemplo.pt'],
        ['Maria Santos', '933221100', 'Praça Brandão de Vasconcelos, Arouca', '4540-111', 'Portão lateral', 'maria@exemplo.pt'],
      ]);
    } else {
      exportarExcel('template_produtos_padaria_da_vila', 'Produtos', ['Nome', 'Categoria', 'Unidade', 'Ativo'], [
        ['Pão de Arouca Tradicional', 'padaria', 'unidade', 'SIM'],
        ['Broa de Milho em Forno de Lenha', 'padaria', 'unidade', 'SIM'],
        ['Pão de Ló de Arouca', 'pastelaria', 'unidade', 'SIM'],
        ['Castanhas Doces de Arouca', 'pastelaria', 'unidade', 'SIM'],
        ['Manjar de Língua', 'pastelaria', 'unidade', 'SIM'],
      ]);
    }
  };

  const handleFicheiroSelecionado = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArquivoImportado(file.name);
    setStatusImportacao(null);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        if (!buffer) return;
        const wb = XLSX.read(buffer, { type: 'array' });
        const parsed: any[] = [];

        if (tabelaImportacao === 'produtos') {
          // Processar todas as folhas do ficheiro Excel (ex: Padaria e Pastelaria)
          for (const sheetName of wb.SheetNames) {
            const ws = wb.Sheets[sheetName];
            const rows: any[] = XLSX.utils.sheet_to_json(ws);
            const defaultCat = sheetName.toLowerCase().includes('past') ? 'pastelaria' : 'padaria';

            for (const r of rows) {
              const nome = r['Descrição'] || r['Descricao'] || r['Nome'] || r['nome'] || r['Produto'] || r['produto'] || '';
              if (!String(nome).trim()) continue;

              const catRaw = r['Área'] || r['Area'] || r['Categoria'] || r['categoria'] || defaultCat;
              const cat = String(catRaw).toLowerCase().includes('past') ? 'pastelaria' : 'padaria';
              const preco = parseFloat(String(r['Preco'] || r['Preço'] || r['preco'] || '0').replace(',', '.')) || 0;
              const unidadeRaw = r['Unidade'] || r['unidade'] || (String(nome).toLowerCase().includes('kg') ? 'kg' : 'unidade');
              const ativo = r['Ativo'] !== undefined ? String(r['Ativo']).toUpperCase() === 'SIM' || String(r['Ativo']) === '1' || String(r['Ativo']) === 'true' : true;

              parsed.push({
                nome: String(nome).trim(),
                categoria: cat,
                preco,
                unidade: unidadeRaw,
                ativo
              });
            }
          }
        } else {
          // Processar folha de clientes
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows: any[] = XLSX.utils.sheet_to_json(ws);
          for (const r of rows) {
            const nome = r['Nome'] || r['nome'] || r['Cliente'] || r['cliente'] || '';
            const telefone = r['Telefone'] || r['telefone'] || r['Contato'] || r['contato'] || r['Tel'] || '';
            if (!String(nome).trim() && !String(telefone).trim()) continue;

            parsed.push({
              nome: String(nome).trim(),
              telefone: String(telefone).trim(),
              morada: r['Morada'] || r['morada'] || r['Endereco'] || '',
              codigo_postal: r['Codigo_Postal'] || r['codigo_postal'] || r['CP'] || '',
              notas_entrega: r['Notas_Entrega'] || r['notas_entrega'] || r['Observacoes'] || '',
              email: r['Email'] || r['email'] || '',
            });
          }
        }

        setLinhasPreview(parsed);
      } catch (err: any) {
        console.error('Erro ao ler ficheiro Excel:', err);
        setStatusImportacao(`Erro ao processar ficheiro Excel: ${err.message}`);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleExecutarImportacao = async () => {
    if (!linhasPreview.length) return;
    setProcessandoImportacao(true);
    setStatusImportacao(t.loading);

    try {
      if (tabelaImportacao === 'clientes') {
        const listaMapeada = linhasPreview.map((item) => ({
          nome: item.nome || item.cliente || '',
          telefone: item.telefone || item.contato || item.tel || '',
          morada: item.morada || item.endereco || '',
          codigo_postal: item.codigo_postal || item.cp || '',
          notas_entrega: item.notas_entrega || item.observacoes || '',
          email: item.email || '',
        }));

        const res = await upsertClientesEmLote(listaMapeada);
        setStatusImportacao(`${t.success} ${res.sucesso} clientes importados/atualizados.`);
        const clis = await carregarClientesSupabase();
        setClientes(clis);
      } else {
        const listaMapeada = linhasPreview.map((item) => ({
          nome: item.nome || item.produto || '',
          preco: parseFloat(String(item.preco).replace(',', '.')) || 0,
          categoria: item.categoria?.toLowerCase() || 'padaria',
          unidade: item.unidade || 'unidade',
          ativo: item.ativo ? item.ativo.toUpperCase() === 'SIM' || item.ativo === '1' || item.ativo === 'true' : true,
        }));

        const res = await upsertProdutosEmLote(listaMapeada);
        setStatusImportacao(`${t.success} ${res.sucesso} produtos importados/atualizados.`);
        const prods = await carregarProdutosSupabase();
        setProdutos(prods);
      }
    } catch (err: any) {
      setStatusImportacao(`${t.error}: ${err.message}`);
    } finally {
      setProcessandoImportacao(false);
    }
  };

  if (!loading && usuario && !podeLer('gestao')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center space-y-3 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm max-w-md">
          <BarChart3 className="h-10 w-10 text-gray-400 mx-auto" />
          <h2 className="text-base font-bold text-gray-900">Acesso Restrito ao Cockpit de Gestão</h2>
          <p className="text-xs text-gray-500">O seu perfil não tem permissão para aceder à Gestão. A redirecionar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/70">
      <Navbar selectedLojaId={selectedLojaId} onSelectLoja={setSelectedLojaId} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:px-6">
        {/* Aviso de Modo de Leitura na Gestão */}
        {!temPermissaoEdicaoGestao && (
          <div className="mb-6 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-2.5 shadow-2xs">
            <Eye className="h-4 w-4 text-amber-600 shrink-0" />
            <span>{t.readOnlyNotice}</span>
          </div>
        )}

        {/* Cabeçalho de Gestão */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2 whitespace-nowrap truncate">
              <BarChart3 className="h-6 w-6 text-bakery-600 shrink-0" />
              <span>{configMarca.tituloGestao || t.managementTitle}</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 truncate">
              {configMarca.subtituloGestao || t.managementSubtitle}
            </p>
          </div>

          {/* Seletor Rápido de Loja para Métricas */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-2xs">
            <Filter className="h-4 w-4 text-bakery-600" />
            <select
              value={selectedLojaId}
              onChange={(e) => setSelectedLojaId(e.target.value)}
              className="text-xs font-bold text-gray-900 bg-transparent focus:outline-hidden cursor-pointer"
            >
              <option value="todas">{t.allStores}</option>
              {lojas.map((l) => (
                <option key={l.id} value={l.id}>{l.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Abas de Navegação do Painel de Gestão */}
        <div className="flex bg-white p-1 rounded-2xl border border-gray-200 shadow-2xs mb-6 overflow-x-auto">
          <button
                    type="button"
                    onClick={() => abrirGuiaCargaConjuntaPdf()}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-xs transition cursor-pointer"
                    title="Gerar Guia de Carga Conjunta em formato tabela compacta para todas as rotas"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Guia Conjunta (Todas as Rotas)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => abrirFolhaCargaPdfModal(carrinhaExportacaoId)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-xs transition cursor-pointer"
                    title="Gerar Folha de Carga em PDF oficial para conferência de carregamento das rotas 1 a 7"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Folha de Carga</span>
                  </button>

                  <div className="flex items-center gap-1 bg-blue-50/70 p-1 rounded-xl border border-blue-200">
                    <select
                      value={carrinhaExportacaoId}
                      onChange={(e) => setCarrinhaExportacaoId(e.target.value)}
                      className="text-xs font-bold bg-white border border-gray-300 rounded-lg px-2 py-1 text-gray-800"
                      title="Selecionar carrinha para exportar individualmente"
                    >
                      {carrinhasBaseDiaria.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.rota || `Rota ${c.numero || ''}`}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleExportarExcelBaseFixaIndividual(carrinhaExportacaoId)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition cursor-pointer"
                      title="Exportar Excel com os 7 dias da carrinha selecionada"
                    >
                      <Download className="h-3 w-3" />
                      Individual (.xlsx)
                    </button>
                  </div>

                  <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 text-xs font-bold hover:bg-emerald-100 transition cursor-pointer">
                    <Upload className="h-3.5 w-3.5 text-emerald-700" />
                    <span>Importar Excel</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleImportarExcelBaseFixa}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleGuardarBaseFixaManual}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    Guardar Quantidades
                  </button>
                </div>
              </div>

              {/* Seletor de Dia da Semana para a Base Diária */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-50/90 p-3 rounded-2xl border border-gray-200">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-black text-gray-700 mr-1 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-blue-600" />
                    Dia da Semana:
                  </span>
                  {DIAS_SEMANA_NOMES.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDiaSemanaBaseFixa(d.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        diaSemanaBaseFixa === d.id
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleCopiarDiaParaTodaSemanaBaseFixa(diaSemanaBaseFixa)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-300 bg-white hover:bg-blue-50 text-blue-800 text-xs font-bold transition cursor-pointer shrink-0"
                  title="Copiar quantidades deste dia para todos os outros dias da semana"
                >
                  <Copy className="h-3.5 w-3.5 text-blue-600" />
                  Replicar {DIAS_SEMANA_NOMES.find((d) => d.id === diaSemanaBaseFixa)?.abrev} para Toda a Semana
                </button>
              </div>

              {feedbackBaseFixa && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{feedbackBaseFixa}</span>
                </div>
              )}

              {/* Datalist de sugestões do catálogo para correção rápida de nomes */}
              <datalist id="catalogo-produtos-base-fixa">
                {produtos.map((p) => (
                  <option key={p.id} value={p.nome} />
                ))}
              </datalist>

              {/* Barra de Pesquisa e Ordenação em Tempo Real */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-blue-200 shadow-2xs">
                <div className="relative flex-1">
                  <Search className="h-3.5 w-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={filtroArtigoBaseFixa}
                    onChange={(e) => setFiltroArtigoBaseFixa(e.target.value)}
                    placeholder="Pesquisar e filtrar artigo na base diária (ex: Pão Normal, Broa, Lanche, Centeio)..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg font-medium text-gray-900 focus:outline-hidden focus:border-blue-500 focus:bg-white"
                  />
                  {filtroArtigoBaseFixa && (
                    <button
                      type="button"
                      onClick={() => setFiltroArtigoBaseFixa('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-gray-600 flex items-center gap-1 shrink-0">
                    <ArrowUpDown className="h-3 w-3 text-blue-600" />
                    Ordenar:
                  </span>
                  <select
                    value={ordenacaoBaseFixa}
                    onChange={(e) => setOrdenacaoBaseFixa(e.target.value as any)}
                    className="text-xs font-bold bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-800 focus:outline-hidden cursor-pointer"
                  >
                    <option value="nome_asc">Artigo (A → Z)</option>
                    <option value="nome_desc">Artigo (Z → A)</option>
                    <option value="qtd_desc">Maior Quantidade</option>
                    <option value="qtd_asc">Menor Quantidade</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-xl max-h-[460px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-blue-50/80 text-gray-800 border-b border-blue-200 sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3 font-black uppercase text-[11px]">Produto / Artigo (Mapa Diário)</th>
                      {carrinhasBaseDiaria.map((c) => (
                        <th key={c.id} className="py-2.5 px-3 font-black text-center uppercase text-[11px] min-w-28">
                          <span className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 text-blue-900 font-black">
                              <Truck className="h-3 w-3 text-cyan-600" />
                              <span>{c.rota || c.identificador}</span>
                            </span>
                            <span className="text-[10px] font-medium text-gray-500 lowercase">
                              {c.nome_carro || c.matricula}
                            </span>
                          </span>
                        </th>
                      ))}
                      <th className="py-2.5 px-3 font-black text-right uppercase text-[11px] w-28 bg-blue-100/70">
                        Total Diário
                      </th>
                      <th className="py-2.5 px-3 font-black text-right uppercase text-[11px] w-24 bg-blue-50/90">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {artigosGrelhaBaseFixa.map((prodNome) => {
                      const somaLinha = carrinhasBaseDiaria.reduce(
                        (acc, c) => acc + obterQtdBaseCarrinha(c.id, diaSemanaBaseFixa, prodNome),
                        0
                      );
                      const isEditingName = artigoBaseFixaEmEdicao === prodNome;

                      return (
                        <tr key={prodNome} className={`hover:bg-blue-50/30 transition ${somaLinha > 0 ? 'bg-amber-50/20' : ''}`}>
                          <td className="py-2 px-3 font-bold text-gray-900">
                            {isEditingName ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  list="catalogo-produtos-base-fixa"
                                  value={novoNomeArtigoBaseFixa}
                                  onChange={(e) => setNovoNomeArtigoBaseFixa(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleRenomearArtigoBaseFixa(prodNome, novoNomeArtigoBaseFixa);
                                    } else if (e.key === 'Escape') {
                                      setArtigoBaseFixaEmEdicao(null);
                                    }
                                  }}
                                  autoFocus
                                  className="px-2 py-1 rounded-lg border border-blue-500 bg-white text-xs font-bold text-gray-900 w-44 focus:outline-hidden"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRenomearArtigoBaseFixa(prodNome, novoNomeArtigoBaseFixa)}
                                  className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-black hover:bg-emerald-700 transition cursor-pointer"
                                  title="Guardar nome corrigido"
                                >
                                  Guardar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setArtigoBaseFixaEmEdicao(null)}
                                  className="px-1.5 py-1 rounded-lg bg-gray-200 text-gray-700 text-[10px] font-bold hover:bg-gray-300 transition cursor-pointer"
                                  title="Cancelar edição"
                                ><X className="h-4 w-4" /></button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  onClick={() => {
                                    setArtigoBaseFixaEmEdicao(prodNome);
                                    setNovoNomeArtigoBaseFixa(prodNome);
                                  }}
                                  className="cursor-pointer hover:text-blue-700 hover:underline"
                                  title="Clique para editar o nome do artigo"
                                >
                                  {prodNome}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setArtigoBaseFixaEmEdicao(prodNome);
                                      setNovoNomeArtigoBaseFixa(prodNome);
                                    }}
                                    className="p-1 rounded-md text-blue-600 hover:bg-blue-100 transition cursor-pointer"
                                    title="Editar nome deste artigo"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleEliminarArtigoBaseFixa(prodNome)}
                                    className="p-1 rounded-md text-red-600 hover:bg-red-100 transition cursor-pointer"
                                    title="Apagar este artigo da Base Diária"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>
                          {carrinhasBaseDiaria.map((c) => {
                            const valQtd = obterQtdBaseCarrinha(c.id, diaSemanaBaseFixa, prodNome);
                            return (
                              <td key={c.id} className="py-1.5 px-3 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  value={valQtd === 0 ? '' : valQtd}
                                  placeholder="0"
                                  onChange={(e) =>
                                    handleAlterarQtdBaseFixa(
                                      c.id,
                                      c.identificador || c.nome,
                                      diaSemanaBaseFixa,
                                      prodNome,
                                      Number(e.target.value)
                                    )
                                  }
                                  className={`w-20 text-center py-1 px-2 rounded-lg border font-mono text-xs font-bold focus:outline-hidden ${
                                    valQtd > 0
                                      ? 'bg-blue-50 border-blue-400 text-blue-950'
                                      : 'bg-white border-gray-200 text-gray-500'
                                  }`}
                                />
                              </td>
                            );
                          })}
                          <td className="py-2 px-3 text-right font-mono font-black text-sm text-blue-900 bg-blue-50/40">
                            {somaLinha > 0 ? `${somaLinha} un.` : '—'}
                          </td>
                          <td className="py-1.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setArtigoBaseFixaEmEdicao(prodNome);
                                  setNovoNomeArtigoBaseFixa(prodNome);
                                }}
                                className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                                title="Corrigir ou alterar nome deste artigo"
                              >
                                <Edit3 className="h-3 w-3" />
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEliminarArtigoBaseFixa(prodNome)}
                                className="p-1 rounded-lg text-red-600 hover:bg-red-50 transition cursor-pointer"
                                title="Eliminar artigo da Base Diária"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECÇÃO 2: CLIENTES EMPRESARIAIS (B2B) */}
            <div className="bg-white p-5 rounded-2xl border border-indigo-200 shadow-xs space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                    <Truck className="h-4 w-4 text-indigo-600" />
                    Clientes Empresariais (B2B) — Matriz Semanal por Rota e Cliente
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Quantidades fixas semanais contratadas por cliente empresarial, atribuídas às respetivas rotas operacionais (Rotas 1 a 7).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const vazios: Record<DiaSemana, Record<string, number>> = {
                        seg: {}, ter: {}, qua: {}, qui: {}, sex: {}, sab: {}, dom: {}
                      };
                      setClienteB2BEmEdicao({
                        id: `b2b-${Date.now()}`,
                        nome: '',
                        nif: '',
                        telefone: '',
                        telemovel: '',
                        email: '',
                        password: '',
                        morada: 'Arouca',
                        carrinha_id: carrinhas[0]?.id || '1eaaa9bd-e3de-4b06-9c80-d1e464bcdc75',
                        ativo: true,
                        quantidades_semanais: vazios,
                        quantidades_semana: vazios,
                      });
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs transition cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Novo Cliente Empresarial
                  </button>

                  <button
                    type="button"
                    onClick={handleExportarTemplateB2B}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-900 text-xs font-bold hover:bg-indigo-100 transition cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 text-indigo-700" />
                    Template Excel B2B (.xlsx)
                  </button>

                  <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 text-xs font-bold hover:bg-emerald-100 transition cursor-pointer">
                    <Upload className="h-3.5 w-3.5 text-emerald-700" />
                    <span>Importar Excel B2B</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleImportarExcelB2B}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {feedbackB2B && (
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>{feedbackB2B}</span>
                </div>
              )}

              {/* Barra de Filtros e Ordenação de Clientes B2B */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 bg-indigo-50/60 p-3 rounded-xl border border-indigo-100">
                <div>
                  <label className="block text-[10px] font-black text-indigo-950 uppercase mb-1">Filtrar por Rota</label>
                  <select
                    value={filtroRotaB2B}
                    onChange={(e) => setFiltroRotaB2B(e.target.value)}
                    className="w-full text-xs font-bold bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 text-gray-800 focus:outline-hidden cursor-pointer"
                  >
                    <option value="todas">Todas as Rotas (1 a 7)</option>
                    {carrinhasBaseDiaria.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.rota || `Rota ${c.numero || ''}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-indigo-950 uppercase mb-1">Pesquisar Cliente / NIF / Contacto</label>
                  <div className="relative">
                    <Search className="h-3 w-3 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={filtroClienteB2B}
                      onChange={(e) => setFiltroClienteB2B(e.target.value)}
                      placeholder="Nome, NIF, telemóvel, email..."
                      className="w-full pl-7 pr-2.5 py-1.5 text-xs bg-white border border-indigo-200 rounded-lg font-medium text-gray-900 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-indigo-950 uppercase mb-1">Filtrar por Artigo</label>
                  <input
                    type="text"
                    value={filtroArtigoB2B}
                    onChange={(e) => setFiltroArtigoB2B(e.target.value)}
                    placeholder="Filtrar por artigo (ex: Broa, Pão Normal)..."
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-indigo-200 rounded-lg font-medium text-gray-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-indigo-950 uppercase mb-1">Ordenação</label>
                  <select
                    value={ordenacaoB2B}
                    onChange={(e) => setOrdenacaoB2B(e.target.value as any)}
                    className="w-full text-xs font-bold bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 text-gray-800 focus:outline-hidden cursor-pointer"
                  >
                    <option value="nome_asc">Nome do Cliente (A → Z)</option>
                    <option value="nome_desc">Nome do Cliente (Z → A)</option>
                    <option value="total_desc">Maior Volume Total</option>
                    <option value="total_asc">Menor Volume Total</option>
                  </select>
                </div>
              </div>

              {/* Seletor de Dia da Semana para Edição Rápida B2B */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold text-indigo-950 mr-1 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                    Dia da Semana:
                  </span>
                  {([
                    { id: 'seg', label: 'Segunda' },
                    { id: 'ter', label: 'Terça' },
                    { id: 'qua', label: 'Quarta' },
                    { id: 'qui', label: 'Quinta' },
                    { id: 'sex', label: 'Sexta' },
                    { id: 'sab', label: 'Sábado' },
                    { id: 'dom', label: 'Domingo' },
                  ] as { id: DiaSemana; label: string }[]).map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDiaSemanaB2B(d.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        diaSemanaB2B === d.id
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-white text-indigo-900 border border-indigo-200 hover:bg-indigo-100'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleCopiarDiaParaTodaSemanaB2B(diaSemanaB2B)}
                  className="text-xs font-bold text-indigo-700 hover:text-indigo-950 bg-white px-3 py-1.5 rounded-xl border border-indigo-200 shadow-2xs transition cursor-pointer shrink-0"
                >
                  Replicar este dia para Seg–Dom
                </button>
              </div>

              {/* Tabela Interativa de Clientes Empresariais B2B */}
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-3 font-black uppercase text-[11px] w-64">Cliente Empresarial (B2B)</th>
                      <th className="py-2.5 px-3 font-black uppercase text-[11px]">
                        Quantidades Fixas no Dia ({diaSemanaB2B.toUpperCase()})
                      </th>
                      <th className="py-2.5 px-3 font-black uppercase text-[11px] text-right w-28">Total Dia</th>
                      <th className="py-2.5 px-3 font-black uppercase text-[11px] text-right w-28">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {clientesB2BFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-400 italic text-xs">
                          Nenhum cliente empresarial encontrado com os filtros atuais.
                        </td>
                      </tr>
                    ) : (
                      clientesB2BFiltrados.map((cli) => {
                        const semanaCli = cli.quantidades_semanais || cli.quantidades_semana || ({} as Record<DiaSemana, Record<string, number>>);
                        const mapaDia = semanaCli[diaSemanaB2B] || {};
                        const entries = Object.entries(mapaDia).filter(([, q]) => q > 0);
                        const totalCliDia = entries.reduce((acc, [, q]) => acc + q, 0);
                        const carRota = carrinhas.find((c) => c.id === cli.carrinha_id);
                        const rotaNome = carRota?.rota || carRota?.identificador || 'Rota 1';

                        return (
                          <tr key={cli.id} className="hover:bg-indigo-50/30 transition">
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-800">
                                  {rotaNome}
                                </span>
                                <p className="font-black text-gray-900 text-xs">{cli.nome}</p>
                              </div>
                              <p className="text-[10px] text-gray-500 mt-0.5">
                                {cli.morada || 'Arouca'}
                                {cli.telemovel || cli.telefone ? ` • ${cli.telemovel || cli.telefone}` : ''}
                                {cli.email ? ` • ${cli.email}` : ''}
                              </p>
                            </td>
                            <td className="py-2.5 px-3">
                              {entries.length === 0 ? (
                                <span className="text-gray-400 italic text-[11px]">
                                  Sem artigos fixos definidos neste dia
                                </span>
                              ) : (
                                <div className="flex flex-wrap gap-1.5">
                                  {entries.map(([prodNome, qtd]) => (
                                    <div
                                      key={prodNome}
                                      className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-0.5 text-[11px]"
                                    >
                                      <span className="font-bold text-indigo-950">{prodNome}:</span>
                                      <input
                                        type="number"
                                        min={0}
                                        value={qtd}
                                        onChange={(e) =>
                                          handleAlterarQtdClienteB2B(cli.id, diaSemanaB2B, prodNome, Number(e.target.value))
                                        }
                                        className="w-14 text-center bg-white border border-indigo-300 rounded font-mono font-black text-indigo-900 px-1 py-0.5 text-[11px]"
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-black text-indigo-900">
                              {totalCliDia} un.
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => abrirComprovativoB2BPdfModal(cli)}
                                  className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                                  title="Gerar Comprovativo de Entrega B2B em PDF"
                                >
                                  <FileText className="h-3 w-3" />
                                  PDF
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setClienteB2BEmEdicao(cli)}
                                  className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                                  title="Configurar artigos, rota e contactos do cliente empresarial"
                                >
                                  <Edit3 className="h-3 w-3" />
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEliminarClienteB2B(cli.id, cli.nome)}
                                  className="p-1 rounded-lg text-red-600 hover:bg-red-50 transition cursor-pointer"
                                  title="Remover cliente empresarial"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TABELA DE BASES DIÁRIAS RECORRENTES (PORTA-A-PORTA & MODO FÉRIAS) */}
            <div className="bg-white p-5 rounded-2xl border border-teal-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-teal-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-600 text-white font-bold text-xs shadow-2xs">
                      🏠
                    </span>
                    Bases Diárias Recorrentes (Porta-a-Porta & Modo Férias)
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Contratos de pão diário e clientes particulares por carrinha, com suporte a pausa de férias e integração com a produção.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBaseRecorrenteEmEdicao({
                        cliente_id: clientes[0]?.id || '',
                        carrinha_id: carrinhas[0]?.id || '',
                        quantidades_semanais: { seg: {}, ter: {}, qua: {}, qui: {}, sex: {}, sab: {}, dom: {} },
                        metodo_pagamento: 'dinheiro_ao_motorista',
                        ativo: true,
                      });
                      setDiaSemanaBaseRecorrenteModal('seg');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Nova Entrega Recorrente
                  </button>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200">
                    Total: <b>{basesRecorrentes.length}</b>
                  </span>
                  {basesRecorrentes.filter((b) => clienteEmModoFerias(b, new Date().toISOString().split('T')[0])).length > 0 && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                      <span>🏖️ Em Férias:</span>
                      <b>{basesRecorrentes.filter((b) => clienteEmModoFerias(b, new Date().toISOString().split('T')[0])).length}</b>
                    </span>
                  )}
                </div>
              </div>

              {feedbackBaseRecorrente && (
                <div className="bg-teal-50 border border-teal-200 text-teal-900 text-xs px-3.5 py-2 rounded-xl flex items-center gap-2">
                  <Check className="h-4 w-4 text-teal-600" />
                  <span>{feedbackBaseRecorrente}</span>
                </div>
              )}

              {/* Filtros da Tabela de Bases Recorrentes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-teal-50/40 p-3 rounded-xl border border-teal-100">
                <div>
                  <label className="block text-[10px] font-black text-teal-950 uppercase mb-1">Filtrar por Rota</label>
                  <select
                    value={filtroRotaBaseRecorrente}
                    onChange={(e) => setFiltroRotaBaseRecorrente(e.target.value)}
                    className="w-full text-xs font-bold bg-white border border-teal-200 rounded-lg px-2.5 py-1.5 text-gray-800 focus:outline-hidden cursor-pointer"
                  >
                    <option value="todas">Todas as Rotas (1 a 7)</option>
                    {carrinhas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.identificador || c.rota || `Carrinha ${c.numero || ''}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-teal-950 uppercase mb-1">Pesquisar Cliente / Morada</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={filtroBuscaBaseRecorrente}
                      onChange={(e) => setFiltroBuscaBaseRecorrente(e.target.value)}
                      placeholder="Nome, telefone ou morada..."
                      className="w-full pl-7 pr-2 py-1.5 text-xs bg-white border border-teal-200 rounded-lg font-bold text-gray-800 focus:outline-hidden"
                    />
                    <Search className="h-3 w-3 text-gray-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-teal-950 uppercase mb-1">Estado das Entregas</label>
                  <select
                    value={filtroEstadoBaseRecorrente}
                    onChange={(e) => setFiltroEstadoBaseRecorrente(e.target.value as any)}
                    className="w-full text-xs font-bold bg-white border border-teal-200 rounded-lg px-2.5 py-1.5 text-gray-800 focus:outline-hidden cursor-pointer"
                  >
                    <option value="todos">Todos os Estados</option>
                    <option value="ativos">Apenas Ativos (A entregar hoje)</option>
                    <option value="ferias">Em Modo Férias / Pausa</option>
                  </select>
                </div>
              </div>

              {/* Tabela de Bases Recorrentes */}
              <div className="overflow-x-auto border border-teal-100 rounded-xl">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-teal-50/70 text-teal-950 border-b border-teal-200">
                    <tr>
                      <th className="py-2.5 px-3 font-black uppercase text-[10px]">Cliente Particular</th>
                      <th className="py-2.5 px-3 font-black uppercase text-[10px]">Rota / Carrinha</th>
                      <th className="py-2.5 px-3 font-black uppercase text-[10px]">Pão Semanal Configurado</th>
                      <th className="py-2.5 px-3 font-black uppercase text-[10px]">Pagamento & Notas</th>
                      <th className="py-2.5 px-3 font-black uppercase text-[10px] text-center">Modo Férias</th>
                      <th className="py-2.5 px-3 font-black uppercase text-[10px] text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {basesRecorrentesFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400 font-bold">
                          Nenhuma entrega recorrente encontrada com os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      basesRecorrentesFiltradas.map((base) => {
                        const hojeStr = new Date().toISOString().split('T')[0];
                        const emFerias = clienteEmModoFerias(base, hojeStr);
                        const car = carrinhas.find((c) => c.id === base.carrinha_id);
                        const cli = clientes.find((c) => c.id === base.cliente_id);
                        const sem = base.quantidades_semanais || { seg: {}, ter: {}, qua: {}, qui: {}, sex: {}, sab: {}, dom: {} };

                        const diasComQtd = Object.entries(sem).filter(([, mapa]) => Object.values(mapa || {}).some((q) => Number(q) > 0));

                        return (
                          <tr key={base.id} className="hover:bg-teal-50/20 transition">
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-gray-900 text-xs">{base.cliente_nome || cli?.nome || 'Cliente'}</div>
                              <div className="text-[11px] text-gray-500 font-mono">{base.cliente_telefone || cli?.telefone}</div>
                              {(base.cliente_morada || cli?.morada) && (
                                <div className="text-[10px] text-gray-400 truncate max-w-xs">{base.cliente_morada || cli?.morada}</div>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 text-[11px]">
                                {base.carrinha_nome || car?.identificador || car?.rota || 'Rota'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {diasComQtd.length === 0 ? (
                                <span className="text-gray-400 italic text-[11px]">(Sem quantidades definidas)</span>
                              ) : (
                                <div className="flex flex-wrap gap-1 max-w-md">
                                  {diasComQtd.map(([d, mapa]) => {
                                    const totalDia = Object.values(mapa).reduce((a, b) => a + (Number(b) || 0), 0);
                                    const prods = Object.entries(mapa).filter(([, q]) => Number(q) > 0).map(([p, q]) => `${q}x ${p}`).join(', ');
                                    return (
                                      <span key={d} className="inline-flex items-center gap-1 bg-white border border-gray-200 px-1.5 py-0.5 rounded text-[10px] text-gray-700" title={prods}>
                                        <b className="uppercase text-teal-700">{d}:</b>
                                        <span>{totalDia} un.</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-[11px]">
                              <div className="font-medium text-gray-700">
                                {base.metodo_pagamento === 'dinheiro_ao_motorista' ? '💵 Dinheiro ao condutor' :
                                 base.metodo_pagamento === 'conta_mensal' ? '📑 Conta mensal' :
                                 base.metodo_pagamento === 'mbway_semanal' ? '📱 MBWay semanal' : '🏦 Multibanco'}
                              </div>
                              {base.notas_motorista && (
                                <div className="text-[10px] text-gray-500 italic truncate max-w-xs">
                                  📝 {base.notas_motorista}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {emFerias ? (
                                <div className="inline-flex flex-col items-center">
                                  <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full text-[10px] font-black">
                                    🏖️ Em Férias
                                  </span>
                                  {base.pausa_fim && (
                                    <span className="text-[9px] text-amber-700 mt-0.5 font-bold">
                                      até {base.pausa_fim}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleCancelarFerias(base)}
                                    className="text-[9px] text-teal-700 underline font-bold mt-0.5 hover:text-teal-900 cursor-pointer"
                                  >
                                    Retomar agora
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAbrirModalFerias(base)}
                                  className="inline-flex items-center gap-1 bg-gray-50 hover:bg-amber-50 text-gray-600 hover:text-amber-800 border border-gray-200 hover:border-amber-300 px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer"
                                  title="Definir pausa de férias"
                                >
                                  <span>Ativar Férias</span>
                                </button>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleAbrirModalFerias(base)}
                                  className="p-1 rounded-lg text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                                  title="Configurar datas de férias"
                                >
                                  🏖️
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBaseRecorrenteEmEdicao(base);
                                    setDiaSemanaBaseRecorrenteModal('seg');
                                  }}
                                  className="p-1 rounded-lg text-teal-700 hover:bg-teal-50 transition cursor-pointer"
                                  title="Editar quantidades e detalhes da entrega recorrente"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEliminarBaseRecorrente(base.id, base.cliente_nome)}
                                  className="p-1 rounded-lg text-red-600 hover:bg-red-50 transition cursor-pointer"
                                  title="Eliminar entrega recorrente"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MATRIZ DE AJUSTES AD-HOC CALENDARIZADOS (7 DIAS) */}
            <MatrizAjustesAdhoc
              carrinhas={carrinhasBaseDiaria}
              baseFixaCarrinhas={baseFixaCarrinhas}
              clientesB2B={clientesB2B}
              produtos={produtos}
            />
          </div>
        )}

        {/* ----------------- ABA 3: BASES DE DADOS & EXCEL ----------------- */}
        {activeTab === 'database' && (
          <div className="space-y-6">
            {/* TABELA DE ARTIGOS E PRODUTOS (BASE DE DADOS CENTRAL) */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-amber-600" />
                    Catálogo de Artigos & Produtos (Base de Dados Central)
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Tabela em tempo real dos produtos registados na base de dados central com filtros por coluna, ordenação, edição e remoção.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setProdutoEmEdicaoModal({ nome: '', categoria: 'padaria', unidade: 'unidade', ativo: true });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Novo Artigo
                  </button>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 border border-gray-200">
                    Total: <b>{produtos.length}</b> artigos
                  </span>
                  {produtosFiltradosTabela.length !== produtos.length && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                      Filtrados: <b>{produtosFiltradosTabela.length}</b>
                    </span>
                  )}
                </div>
              </div>

              {/* Tabela com Filtros de Coluna e Ordenação */}
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-3 font-black text-gray-900">
                        <div className="flex items-center justify-between gap-1 mb-1.5 cursor-pointer select-none hover:text-bakery-700" onClick={() => handleToggleSortProdutos('nome')}>
                          <span className="text-[11px] uppercase tracking-wider">Artigo / Nome</span>
                          <span className="flex items-center text-[10px] text-gray-400">
                            <ArrowUpDown className="h-3 w-3" />
                            {sortProdutos.col === 'nome' && (sortProdutos.dir === 'asc' ? ' ↑' : ' ↓')}
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            value={filtroProdutos.busca}
                            onChange={(e) => setFiltroProdutos({ ...filtroProdutos, busca: e.target.value })}
                            placeholder="Pesquisar artigo..."
                            className="w-full pl-6 pr-2 py-1 text-xs bg-white border border-gray-200 rounded-lg font-normal focus:outline-hidden focus:border-bakery-500"
                          />
                          <Search className="h-3 w-3 text-gray-400 absolute left-2 top-2" />
                        </div>
                      </th>
                      <th className="py-2.5 px-3 font-black text-gray-900 w-36">
                        <div className="flex items-center justify-between gap-1 mb-1.5 cursor-pointer select-none hover:text-bakery-700" onClick={() => handleToggleSortProdutos('categoria')}>
                          <span className="text-[11px] uppercase tracking-wider">Setor</span>
                          <span className="flex items-center text-[10px] text-gray-400">
                            <ArrowUpDown className="h-3 w-3" />
                            {sortProdutos.col === 'categoria' && (sortProdutos.dir === 'asc' ? ' ↑' : ' ↓')}
                          </span>
                        </div>
                        <select
                          value={filtroProdutos.categoria}
                          onChange={(e) => setFiltroProdutos({ ...filtroProdutos, categoria: e.target.value })}
                          className="w-full py-1 px-1.5 text-xs bg-white border border-gray-200 rounded-lg font-bold focus:outline-hidden"
                        >
                          <option value="todas">Todos os setores</option>
                          <option value="padaria">Padaria</option>
                          <option value="pastelaria">Pastelaria</option>
                        </select>
                      </th>
                      <th className="py-2.5 px-3 font-black text-gray-900 w-32">
                        <div className="flex items-center justify-between gap-1 mb-1.5 cursor-pointer select-none hover:text-bakery-700" onClick={() => handleToggleSortProdutos('unidade')}>
                          <span className="text-[11px] uppercase tracking-wider">Unidade</span>
                          <span className="flex items-center text-[10px] text-gray-400">
                            <ArrowUpDown className="h-3 w-3" />
                            {sortProdutos.col === 'unidade' && (sortProdutos.dir === 'asc' ? ' ↑' : ' ↓')}
                          </span>
                        </div>
                        <select
                          value={filtroProdutos.unidade}
                          onChange={(e) => setFiltroProdutos({ ...filtroProdutos, unidade: e.target.value })}
                          className="w-full py-1 px-1.5 text-xs bg-white border border-gray-200 rounded-lg font-bold focus:outline-hidden"
                        >
                          <option value="todas">Todas</option>
                          <option value="unidade">Unidade (un.)</option>
                          <option value="kg">Quilograma (kg)</option>
                          <option value="cento">Cento</option>
                          <option value="dose">Dose</option>
                        </select>
                      </th>
                      <th className="py-2.5 px-3 font-black text-gray-900 w-28">
                        <div className="flex items-center justify-between gap-1 mb-1.5 cursor-pointer select-none hover:text-bakery-700" onClick={() => handleToggleSortProdutos('ativo')}>
                          <span className="text-[11px] uppercase tracking-wider">Estado</span>
                          <span className="flex items-center text-[10px] text-gray-400">
                            <ArrowUpDown className="h-3 w-3" />
                            {sortProdutos.col === 'ativo' && (sortProdutos.dir === 'asc' ? ' ↑' : ' ↓')}
                          </span>
                        </div>
                        <select
                          value={filtroProdutos.ativo}
                          onChange={(e) => setFiltroProdutos({ ...filtroProdutos, ativo: e.target.value })}
                          className="w-full py-1 px-1.5 text-xs bg-white border border-gray-200 rounded-lg font-bold focus:outline-hidden"
                        >
                          <option value="todos">Todos</option>
                          <option value="ativo">Ativo</option>
                          <option value="inativo">Inativo</option>
                        </select>
                      </th>
                      <th className="py-2.5 px-3 font-black text-gray-900 w-24 text-right">
                        <span className="block text-[11px] uppercase tracking-wider mb-1.5">Ações</span>
                        <span className="text-[10px] text-gray-400 font-normal">Opções</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {produtosFiltradosTabela.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400 italic">
                          Nenhum artigo encontrado para o filtro selecionado.
                        </td>
                      </tr>
                    ) : (
                      produtosFiltradosTabela.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50/80 transition">
                          <td className="py-2 px-3">
                            <p className="font-bold text-gray-900">{p.nome}</p>
                          </td>
                          <td className="py-2 px-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.categoria === 'padaria' ? 'bg-amber-100 text-amber-900' : 'bg-pink-100 text-pink-900'
                            }`}>
                              <SectorBadge setor={p.categoria} />
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-mono text-[10px]">
                              {p.unidade || 'unidade'}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                              p.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'
                            }`}>
                              <StatusBadge variant={p.ativo ? 'concluido' : 'inativo'} label={p.ativo ? 'Ativo' : 'Inativo'} />
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {temPermissaoEdicaoGestao && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setProdutoEmEdicaoModal(p)}
                                    className="p-1 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition cursor-pointer"
                                    title="Editar Artigo"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleEliminarProduto(p.id, p.nome)}
                                    className="p-1 rounded-lg text-red-600 hover:text-red-800 hover:bg-red-50 transition cursor-pointer"
                                    title="Eliminar Artigo"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Download className="h-4 w-4 text-emerald-600" />
                {t.exportExcel}
              </h3>
              <p className="text-xs text-gray-500">
                Ficheiros compatíveis com o Microsoft Excel (formato UTF-8 com BOM e pontuação portuguesa).
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={exportarClientes}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shadow-xs"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Exportar Clientes ({clientes.length})
                </button>

                <button
                  onClick={exportarProdutos}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shadow-xs"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Exportar Produtos ({produtos.length})
                </button>

                <button
                  onClick={exportarEncomendas}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shadow-xs"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Exportar Encomendas ({encomendas.length})
                </button>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Upload className="h-4 w-4 text-blue-600" />
                {t.importExcel}
              </h3>
              <p className="text-xs text-gray-500">
                {t.bulkUploadDesc}
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-700">Tabela Destino:</span>
                  <select
                    value={tabelaImportacao}
                    onChange={(e) => {
                      setTabelaImportacao(e.target.value as any);
                      setLinhasPreview([]);
                      setStatusImportacao(null);
                    }}
                    className="text-xs font-bold bg-white border border-gray-200 rounded-lg px-3 py-1.5"
                  >
                    <option value="clientes">Clientes (atualiza por Telefone)</option>
                    <option value="produtos">Produtos & Preços (atualiza por Nome)</option>
                  </select>
                </div>

                <button
                  onClick={() => descarregarTemplate(tabelaImportacao)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <Download className="h-3.5 w-3.5" /> Descarregar Modelo Excel (.xlsx)
                </button>
              </div>

              <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition ${
                temPermissaoEdicaoGestao
                  ? 'border-gray-300 hover:border-blue-500 bg-gray-50/50 cursor-pointer'
                  : 'border-gray-200 bg-gray-100/70 cursor-not-allowed opacity-75'
              }`}>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  id="excel-upload"
                  disabled={!temPermissaoEdicaoGestao}
                  onChange={handleFicheiroSelecionado}
                  className="hidden"
                />
                <label htmlFor={temPermissaoEdicaoGestao ? "excel-upload" : undefined} className={`flex flex-col items-center ${temPermissaoEdicaoGestao ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                  <FileSpreadsheet className="h-10 w-10 text-emerald-600 mb-2" />
                  <span className="text-xs font-bold text-gray-800">
                    {!temPermissaoEdicaoGestao ? `${t.readOnlyMode} - ${t.importExcel}` : arquivoImportado ? `Ficheiro: ${arquivoImportado}` : 'Clique para carregar ficheiro Excel (.xlsx / .xls)'}
                  </span>
                  <span className="text-[11px] text-gray-400 mt-1">Suporta ficheiros Excel nativos (.xlsx e .xls) e folhas múltiplas (Padaria / Pastelaria)</span>
                </label>
              </div>

              {linhasPreview.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700">
                      Linhas Detetadas: <b>{linhasPreview.length}</b>
                    </span>
                    <button
                      onClick={handleExecutarImportacao}
                      disabled={processandoImportacao || !temPermissaoEdicaoGestao}
                      className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 disabled:opacity-50 transition shadow-xs flex items-center gap-1.5"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${processandoImportacao ? 'animate-spin' : ''}`} />
                      {processandoImportacao ? t.loading : !temPermissaoEdicaoGestao ? t.levelReadOnly : t.save}
                    </button>
                  </div>

                  {statusImportacao && (
                    <div className="p-3 rounded-xl bg-blue-50 text-blue-900 text-xs font-bold border border-blue-200">
                      {statusImportacao}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ----------------- ABA 4: HISTÓRICO & AUDITORIA DE UTILIZADORES (NOVO v1.8.0) ----------------- */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            {/* Cabeçalho da Aba de Auditoria */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-bakery-600" />
                  Histórico & Auditoria de Ações dos Utilizadores
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Rastreabilidade e carimbo temporal de todas as ações operacionais desde o registo inicial da encomenda à entrega final ao cliente.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={recarregarLogs}
                  disabled={carregandoLogs}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold text-xs hover:bg-gray-50 transition shadow-2xs cursor-pointer"
                  title="Atualizar lista de registos de auditoria"
                >
                  <RefreshCw className={`h-3.5 w-3.5 text-bakery-600 ${carregandoLogs ? 'animate-spin' : ''}`} />
                  Recarregar
                </button>

                <button
                  type="button"
                  onClick={exportarLogsAuditoria}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition shadow-xs cursor-pointer"
                  title="Exportar todos os registos filtrados para Excel"
                >
                  <Download className="h-3.5 w-3.5" />
                  Exportar Excel (.xlsx)
                </button>

                {temPermissaoEdicaoGestao && (
                  <button
                    type="button"
                    onClick={reiniciarLogs}
                    className="flex items-center gap-1 px-2.5 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 font-bold text-xs hover:bg-amber-100 transition shadow-2xs cursor-pointer"
                    title="Repor registos estruturados de exemplo das 100 encomendas"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-amber-700" />
                    Repor Exemplo
                  </button>
                )}
              </div>
            </div>

            {/* Cartões de Métricas / Resumo dos Logs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Ações Auditadas</span>
                  <Clock className="h-4 w-4 text-bakery-600" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-gray-900">{logsAuditoria.length}</span>
                  {logsFiltradosEOrdenados.length !== logsAuditoria.length && (
                    <span className="text-xs font-bold text-bakery-600">({logsFiltradosEOrdenados.length} filtradas)</span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Registos de auditoria em sistema</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Ações de Hoje</span>
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-2xl font-black text-blue-700">
                  {logsAuditoria.filter(l => l.data === new Date().toISOString().split('T')[0]).length}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Operações efetuadas no turno atual</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Colaboradores</span>
                  <Users className="h-4 w-4 text-purple-600" />
                </div>
                <div className="text-2xl font-black text-purple-700">
                  {utilizadoresLogsUnicos.length}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Utilizadores com ações registadas</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Entregas Concluídas</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-emerald-700">
                  {logsAuditoria.filter(l => l.acao.includes('Entrega Efetuada')).length}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Auditorias com carimbo de entrega real</p>
              </div>
            </div>

            {/* Barra de Atalhos Rápidos de Período e Limpeza */}
            <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-bold text-gray-600 mr-1 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-bakery-600" />
                  Período Rápido:
                </span>
                {[
                  { id: 'todos', label: 'Todo o Histórico' },
                  { id: 'hoje', label: 'Hoje' },
                  { id: 'ontem', label: 'Ontem' },
                  { id: 'semana', label: 'Últimos 7 Dias' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setFiltroLogs(prev => ({ ...prev, periodoRapido: p.id, dataInicio: '', dataFim: '' }));
                      setPaginaAtualLogs(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                      filtroLogs.periodoRapido === p.id && !filtroLogs.dataInicio
                        ? 'bg-bakery-600 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500 font-medium">De:</span>
                  <input
                    type="date"
                    value={filtroLogs.dataInicio}
                    onChange={(e) => {
                      setFiltroLogs(prev => ({ ...prev, dataInicio: e.target.value, periodoRapido: 'personalizado' }));
                      setPaginaAtualLogs(1);
                    }}
                    className="px-2.5 py-1 rounded-xl border border-gray-200 bg-white font-medium text-xs focus:outline-hidden"
                  />
                  <span className="text-gray-500 font-medium">Até:</span>
                  <input
                    type="date"
                    value={filtroLogs.dataFim}
                    onChange={(e) => {
                      setFiltroLogs(prev => ({ ...prev, dataFim: e.target.value, periodoRapido: 'personalizado' }));
                      setPaginaAtualLogs(1);
                    }}
                    className="px-2.5 py-1 rounded-xl border border-gray-200 bg-white font-medium text-xs focus:outline-hidden"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFiltroLogs({
                      codigo: '',
                      cliente: '',
                      utilizador: 'todos',
                      role: 'todos',
                      painel: 'todos',
                      acao: 'todas',
                      detalhes: '',
                      dataInicio: '',
                      dataFim: '',
                      periodoRapido: 'todos',
                    });
                    setPaginaAtualLogs(1);
                  }}
                  className="px-2.5 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Limpar todos os filtros da tabela"
                >
                  <RotateCcw className="h-3 w-3" />
                  Limpar Filtros
                </button>
              </div>
            </div>

            {/* Tabela Completa de Auditoria com Filtros e Ordenação em TODAS as Colunas */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-stone-50 border-b border-gray-200 text-gray-700">
                    {/* Linha 1 de Cabeçalho: Títulos e Botões de Ordenação */}
                    <tr className="border-b border-gray-200">
                      <th className="p-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleSortLogs('data_hora')}
                          className="flex items-center gap-1 font-black text-gray-800 hover:text-bakery-600 transition cursor-pointer"
                        >
                          Data & Hora
                          <ArrowUpDown className={`h-3.5 w-3.5 ${sortLogs.col === 'data_hora' ? 'text-bakery-600 font-black' : 'text-gray-400'}`} />
                        </button>
                      </th>

                      <th className="p-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleSortLogs('codigo')}
                          className="flex items-center gap-1 font-black text-gray-800 hover:text-bakery-600 transition cursor-pointer"
                        >
                          Encomenda
                          <ArrowUpDown className={`h-3.5 w-3.5 ${sortLogs.col === 'codigo' ? 'text-bakery-600 font-black' : 'text-gray-400'}`} />
                        </button>
                      </th>

                      <th className="p-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleSortLogs('cliente')}
                          className="flex items-center gap-1 font-black text-gray-800 hover:text-bakery-600 transition cursor-pointer"
                        >
                          Cliente
                          <ArrowUpDown className={`h-3.5 w-3.5 ${sortLogs.col === 'cliente' ? 'text-bakery-600 font-black' : 'text-gray-400'}`} />
                        </button>
                      </th>

                      <th className="p-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleSortLogs('utilizador')}
                          className="flex items-center gap-1 font-black text-gray-800 hover:text-bakery-600 transition cursor-pointer"
                        >
                          Colaborador
                          <ArrowUpDown className={`h-3.5 w-3.5 ${sortLogs.col === 'utilizador' ? 'text-bakery-600 font-black' : 'text-gray-400'}`} />
                        </button>
                      </th>

                      <th className="p-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleSortLogs('role')}
                          className="flex items-center gap-1 font-black text-gray-800 hover:text-bakery-600 transition cursor-pointer"
                        >
                          Cargo / Perfil
                          <ArrowUpDown className={`h-3.5 w-3.5 ${sortLogs.col === 'role' ? 'text-bakery-600 font-black' : 'text-gray-400'}`} />
                        </button>
                      </th>

                      <th className="p-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleSortLogs('painel')}
                          className="flex items-center gap-1 font-black text-gray-800 hover:text-bakery-600 transition cursor-pointer"
                        >
                          Módulo
                          <ArrowUpDown className={`h-3.5 w-3.5 ${sortLogs.col === 'painel' ? 'text-bakery-600 font-black' : 'text-gray-400'}`} />
                        </button>
                      </th>

                      <th className="p-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleSortLogs('acao')}
                          className="flex items-center gap-1 font-black text-gray-800 hover:text-bakery-600 transition cursor-pointer"
                        >
                          Ação Realizada
                          <ArrowUpDown className={`h-3.5 w-3.5 ${sortLogs.col === 'acao' ? 'text-bakery-600 font-black' : 'text-gray-400'}`} />
                        </button>
                      </th>

                      <th className="p-3 min-w-[280px]">
                        <button
                          type="button"
                          onClick={() => handleToggleSortLogs('detalhes')}
                          className="flex items-center gap-1 font-black text-gray-800 hover:text-bakery-600 transition cursor-pointer"
                        >
                          Detalhes da Operação
                          <ArrowUpDown className={`h-3.5 w-3.5 ${sortLogs.col === 'detalhes' ? 'text-bakery-600 font-black' : 'text-gray-400'}`} />
                        </button>
                      </th>
                    </tr>

                    {/* Linha 2 de Cabeçalho: Controlos de Filtro em Cada Coluna */}
                    <tr className="bg-stone-100/80">
                      {/* Filtro Data */}
                      <th className="p-2">
                        <input
                          type="date"
                          value={filtroLogs.dataInicio}
                          onChange={(e) => {
                            setFiltroLogs(prev => ({ ...prev, dataInicio: e.target.value, periodoRapido: 'personalizado' }));
                            setPaginaAtualLogs(1);
                          }}
                          className="w-full px-2 py-1 rounded-lg border border-gray-300 bg-white text-[11px] font-medium focus:outline-hidden"
                          title="Filtrar por data"
                        />
                      </th>

                      {/* Filtro Código Encomenda */}
                      <th className="p-2">
                        <input
                          type="text"
                          placeholder="Filtrar cód..."
                          value={filtroLogs.codigo}
                          onChange={(e) => {
                            setFiltroLogs(prev => ({ ...prev, codigo: e.target.value }));
                            setPaginaAtualLogs(1);
                          }}
                          className="w-full px-2 py-1 rounded-lg border border-gray-300 bg-white text-[11px] font-medium focus:outline-hidden"
                        />
                      </th>

                      {/* Filtro Cliente */}
                      <th className="p-2">
                        <input
                          type="text"
                          placeholder="Filtrar cliente..."
                          value={filtroLogs.cliente}
                          onChange={(e) => {
                            setFiltroLogs(prev => ({ ...prev, cliente: e.target.value }));
                            setPaginaAtualLogs(1);
                          }}
                          className="w-full px-2 py-1 rounded-lg border border-gray-300 bg-white text-[11px] font-medium focus:outline-hidden"
                        />
                      </th>

                      {/* Filtro Utilizador */}
                      <th className="p-2">
                        <select
                          value={filtroLogs.utilizador}
                          onChange={(e) => {
                            setFiltroLogs(prev => ({ ...prev, utilizador: e.target.value }));
                            setPaginaAtualLogs(1);
                          }}
                          className="w-full px-2 py-1 rounded-lg border border-gray-300 bg-white text-[11px] font-bold focus:outline-hidden cursor-pointer"
                        >
                          <option value="todos">Todos os Colaboradores</option>
                          {utilizadoresLogsUnicos.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </th>

                      {/* Filtro Cargo / Role */}
                      <th className="p-2">
                        <select
                          value={filtroLogs.role}
                          onChange={(e) => {
                            setFiltroLogs(prev => ({ ...prev, role: e.target.value }));
                            setPaginaAtualLogs(1);
                          }}
                          className="w-full px-2 py-1 rounded-lg border border-gray-300 bg-white text-[11px] font-bold focus:outline-hidden cursor-pointer"
                        >
                          <option value="todos">Todos os Cargos</option>
                          {rolesLogsUnicas.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </th>

                      {/* Filtro Módulo */}
                      <th className="p-2">
                        <select
                          value={filtroLogs.painel}
                          onChange={(e) => {
                            setFiltroLogs(prev => ({ ...prev, painel: e.target.value }));
                            setPaginaAtualLogs(1);
                          }}
                          className="w-full px-2 py-1 rounded-lg border border-gray-300 bg-white text-[11px] font-bold focus:outline-hidden cursor-pointer"
                        >
                          <option value="todos">Todos os Módulos</option>
                          {paineisLogsUnicos.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </th>

                      {/* Filtro Ação */}
                      <th className="p-2">
                        <select
                          value={filtroLogs.acao}
                          onChange={(e) => {
                            setFiltroLogs(prev => ({ ...prev, acao: e.target.value }));
                            setPaginaAtualLogs(1);
                          }}
                          className="w-full px-2 py-1 rounded-lg border border-gray-300 bg-white text-[11px] font-bold focus:outline-hidden cursor-pointer"
                        >
                          <option value="todas">Todas as Ações</option>
                          {acoesLogsUnicas.map((a) => (
                            <option key={a} value={a}>{a}</option>
                          ))}
                        </select>
                      </th>

                      {/* Filtro Detalhes */}
                      <th className="p-2">
                        <input
                          type="text"
                          placeholder="Pesquisar nos detalhes..."
                          value={filtroLogs.detalhes}
                          onChange={(e) => {
                            setFiltroLogs(prev => ({ ...prev, detalhes: e.target.value }));
                            setPaginaAtualLogs(1);
                          }}
                          className="w-full px-2 py-1 rounded-lg border border-gray-300 bg-white text-[11px] font-medium focus:outline-hidden"
                        />
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                    {logsPaginados.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-gray-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Clock className="h-8 w-8 text-gray-300" />
                            <p className="font-bold text-gray-600">Nenhum registo de auditoria encontrado com os filtros selecionados.</p>
                            <button
                              type="button"
                              onClick={() => setFiltroLogs({
                                codigo: '', cliente: '', utilizador: 'todos', role: 'todos',
                                painel: 'todos', acao: 'todas', detalhes: '', dataInicio: '', dataFim: '', periodoRapido: 'todos'
                              })}
                              className="text-xs text-bakery-600 font-bold hover:underline cursor-pointer mt-1"
                            >
                              Limpar filtros aplicados
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      logsPaginados.map((log) => {
                        const encAlvo = encomendas.find(
                          (e) => e.codigo === log.codigo_encomenda || e.id === log.encomenda_id
                        );

                        return (
                          <tr key={log.id} className="hover:bg-amber-50/40 transition">
                            {/* Data & Hora */}
                            <td className="p-3 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="font-mono font-bold text-gray-900">{log.data}</span>
                                <span className="font-mono text-[11px] text-gray-500">{log.hora}</span>
                              </div>
                            </td>

                            {/* Código Encomenda */}
                            <td className="p-3 whitespace-nowrap">
                              {log.codigo_encomenda ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (encAlvo) {
                                      setEncomendaTesteTalão(encAlvo);
                                    } else {
                                      alert(`Encomenda ${log.codigo_encomenda} registada no log.`);
                                    }
                                  }}
                                  className="px-2 py-1 rounded-lg font-mono font-bold text-[11px] bg-stone-100 hover:bg-amber-100 text-stone-800 hover:text-amber-900 transition border border-stone-200 cursor-pointer flex items-center gap-1"
                                  title="Clique para ver o talão térmico"
                                >
                                  <Printer className="h-3 w-3 text-bakery-600" />
                                  {log.codigo_encomenda}
                                </button>
                              ) : (
                                <span className="text-gray-400 font-mono text-[11px]">N/A</span>
                              )}
                            </td>

                            {/* Cliente */}
                            <td className="p-3 whitespace-nowrap">
                              <span className="font-bold text-gray-900">{log.cliente_nome || 'Cliente'}</span>
                            </td>

                            {/* Colaborador */}
                            <td className="p-3 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <div className="p-1 rounded-md bg-stone-100 text-gray-700">
                                  <User className="h-3.5 w-3.5" />
                                </div>
                                <span className="font-bold text-gray-900">{log.utilizador_nome}</span>
                              </div>
                            </td>

                            {/* Cargo / Perfil */}
                            <td className="p-3 whitespace-nowrap">
                              {(() => {
                                const r = String(log.utilizador_role);
                                if (r === 'admin') {
                                  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">Administrador</span>;
                                }
                                if (r === 'gerente_loja') {
                                  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">Gerente</span>;
                                }
                                if (r === 'atendente') {
                                  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">Operador de Balcão</span>;
                                }
                                if (r === 'padeiro_pasteleiro' || r === 'operador_padaria' || r === 'operador_pastelaria') {
                                  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">Padeiro / Pasteleiro</span>;
                                }
                                if (r === 'motorista' || r === 'condutor') {
                                  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-800 border border-orange-200">Motorista</span>;
                                }
                                return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">{r}</span>;
                              })()}
                            </td>

                            {/* Módulo / Painel */}
                            <td className="p-3 whitespace-nowrap">
                              {(() => {
                                const p = String(log.painel);
                                if (p === 'encomendas') {
                                  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200"><FileSpreadsheet className="h-3 w-3" /> Encomendas</span>;
                                }
                                if (p === 'producao') {
                                  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200"><ChefHat className="h-3 w-3" /> Produção</span>;
                                }
                                if (p === 'loja') {
                                  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><Store className="h-3 w-3" /> Balcão</span>;
                                }
                                if (p === 'entregas') {
                                  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200"><Truck className="h-3 w-3" /> Entregas</span>;
                                }
                                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200"><BarChart3 className="h-3 w-3" /> Gestão</span>;
                              })()}
                            </td>

                            {/* Ação Realizada */}
                            <td className="p-3 whitespace-nowrap">
                              {(() => {
                                const a = log.acao;
                                if (a.includes('Entrega')) {
                                  return (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                      {a}
                                    </span>
                                  );
                                }
                                if (a.includes('Registo')) {
                                  return (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                                      <Plus className="h-3.5 w-3.5 text-blue-600" />
                                      {a}
                                    </span>
                                  );
                                }
                                if (a.includes('Preparação') || a.includes('Fabrico') || a.includes('Pronto')) {
                                  return (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                                      <ChefHat className="h-3.5 w-3.5 text-amber-600" />
                                      {a}
                                    </span>
                                  );
                                }
                                if (a.includes('Carrinha') || a.includes('Rota')) {
                                  return (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200">
                                      <Truck className="h-3.5 w-3.5 text-indigo-600" />
                                      {a}
                                    </span>
                                  );
                                }
                                if (a.includes('Eliminação') || a.includes('Cancelamento')) {
                                  return (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-black bg-red-100 text-red-800 border border-red-200">
                                      <Trash2 className="h-3.5 w-3.5 text-red-600" />
                                      {a}
                                    </span>
                                  );
                                }
                                return (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-black bg-stone-100 text-stone-800 border border-stone-200">
                                    <Edit3 className="h-3.5 w-3.5 text-stone-600" />
                                    {a}
                                  </span>
                                );
                              })()}
                            </td>

                            {/* Detalhes da Operação */}
                            <td className="p-3 text-[11px] text-gray-600">
                              <p className="leading-snug">{log.detalhes}</p>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Barra de Paginação e Controlo de Registos */}
              <div className="bg-stone-50 px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="text-gray-600 font-medium">
                  A mostrar <b>{logsFiltradosEOrdenados.length === 0 ? 0 : (paginaAtualLogs - 1) * (registosPorPaginaLogs === 'todos' ? logsFiltradosEOrdenados.length : registosPorPaginaLogs) + 1}</b> a <b>{registosPorPaginaLogs === 'todos' ? logsFiltradosEOrdenados.length : Math.min(paginaAtualLogs * registosPorPaginaLogs, logsFiltradosEOrdenados.length)}</b> de <b>{logsFiltradosEOrdenados.length}</b> registos filtrados (Total em arquivo: {logsAuditoria.length})
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500 font-medium">Linhas por página:</span>
                    <select
                      value={registosPorPaginaLogs}
                      onChange={(e) => {
                        const v = e.target.value === 'todos' ? 'todos' : Number(e.target.value);
                        setRegistosPorPaginaLogs(v);
                        setPaginaAtualLogs(1);
                      }}
                      className="px-2 py-1 rounded-lg border border-gray-200 bg-white font-bold text-xs cursor-pointer focus:outline-hidden"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value="todos">Todas</option>
                    </select>
                  </div>

                  {registosPorPaginaLogs !== 'todos' && totalPaginasLogs > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPaginaAtualLogs(p => Math.max(1, p - 1))}
                        disabled={paginaAtualLogs === 1}
                        className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-gray-700 font-bold hover:bg-gray-100 disabled:opacity-40 transition cursor-pointer"
                      >
                        Anterior
                      </button>
                      <span className="text-gray-600 font-bold px-1">
                        {paginaAtualLogs} / {totalPaginasLogs}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPaginaAtualLogs(p => Math.min(totalPaginasLogs, p + 1))}
                        disabled={paginaAtualLogs === totalPaginasLogs}
                        className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-gray-700 font-bold hover:bg-gray-100 disabled:opacity-40 transition cursor-pointer"
                      >
                        Seguinte
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- ABA 5: CONFIGURADOR DE TALÃO ----------------- */}
        {activeTab === 'talao' && (
          <div className="space-y-4">
            {/* Seletor de Loja para Configuração de Talão */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-bakery-600" />
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Configuração de Cabeçalho por Loja</h4>
                  <p className="text-xs text-gray-500">Cada loja pode ter os seus próprios cabeçalhos, contactos, slogans e mensagens de rodapé impressos no talão térmico.</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setLojaSelecionadaTalao('todas');
                    setReceiptConfig(getReceiptConfig('todas'));
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    lojaSelecionadaTalao === 'todas'
                      ? 'bg-bakery-600 text-white shadow-xs'
                      : 'bg-stone-100 text-gray-700 hover:bg-stone-200'
                  }`}
                >
                  Geral (Todas as Lojas)
                </button>
                {lojas.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => {
                      setLojaSelecionadaTalao(l.id);
                      const cfgLoja = getReceiptConfig(l.id);
                      setReceiptConfig({
                        ...cfgLoja,
                        storeNameOverride: cfgLoja.storeNameOverride || l.nome,
                      });
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      lojaSelecionadaTalao === l.id
                        ? 'bg-bakery-600 text-white shadow-xs'
                        : 'bg-stone-100 text-gray-700 hover:bg-stone-200'
                    }`}
                  >
                    {l.nome}
                  </button>
                ))}
              </div>
            </div>

            {feedbackTalao && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{feedbackTalao}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <form onSubmit={handleSalvarConfigTalao} className="lg:col-span-7 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4 text-xs">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Printer className="h-4 w-4 text-bakery-600" />
                    {t.tabReceiptConfig} — {lojaSelecionadaTalao === 'todas' ? 'Predefinição Geral' : (lojas.find(l => l.id === lojaSelecionadaTalao)?.nome || 'Loja')}
                  </h3>
                  <span className="font-mono text-[11px] font-bold text-bakery-800 bg-bakery-50 px-2 py-0.5 rounded border border-bakery-200">
                    {lojaSelecionadaTalao === 'todas' ? 'GERAL' : (lojas.find(l => l.id === lojaSelecionadaTalao)?.codigo || 'LOJA')}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Nome Comercial no Cabeçalho</label>
                    <input
                      type="text"
                      value={receiptConfig.storeNameOverride}
                      onChange={(e) => setReceiptConfig({ ...receiptConfig, storeNameOverride: e.target.value })}
                      placeholder="Padaria & Pastelaria"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Slogan / Subtítulo</label>
                    <input
                      type="text"
                      value={receiptConfig.slogan}
                      onChange={(e) => setReceiptConfig({ ...receiptConfig, slogan: e.target.value })}
                      placeholder="Fabrico Próprio Diário"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Largura da Bobina Térmica</label>
                    <select
                      value={receiptConfig.paperWidth}
                      onChange={(e) => setReceiptConfig({ ...receiptConfig, paperWidth: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-bold"
                    >
                      <option value="80mm">80 mm (Padrão de Balcão)</option>
                      <option value="58mm">58 mm (Impressora Portátil / Mini)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Tamanho da Fonte</label>
                    <select
                      value={receiptConfig.fontSize}
                      onChange={(e) => setReceiptConfig({ ...receiptConfig, fontSize: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-bold"
                    >
                      <option value="compact">Compacto</option>
                      <option value="normal">Normal</option>
                      <option value="large">Grande</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <span className="font-bold text-gray-800 block mb-1">Secções a Imprimir:</span>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={receiptConfig.showSectionSeparation}
                      onChange={(e) => setReceiptConfig({ ...receiptConfig, showSectionSeparation: e.target.checked })}
                      className="rounded text-bakery-600"
                    />
                    <span>Separar artigos por setor ([ PADARIA ] e [ PASTELARIA ])</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={receiptConfig.highlightCakeNotes}
                      onChange={(e) => setReceiptConfig({ ...receiptConfig, highlightCakeNotes: e.target.checked })}
                      className="rounded text-bakery-600"
                    />
                    <span>Destacar notas de personalização de bolos em caixa de destaque</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={receiptConfig.showPhone}
                      onChange={(e) => setReceiptConfig({ ...receiptConfig, showPhone: e.target.checked })}
                      className="rounded text-bakery-600"
                    />
                    <span>Imprimir telefone da loja no topo</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={receiptConfig.showNif}
                      onChange={(e) => setReceiptConfig({ ...receiptConfig, showNif: e.target.checked })}
                      className="rounded text-bakery-600"
                    />
                    <span>Imprimir NIF da loja</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={receiptConfig.showQrCode}
                      onChange={(e) => setReceiptConfig({ ...receiptConfig, showQrCode: e.target.checked })}
                      className="rounded text-bakery-600"
                    />
                    <span>Imprimir QR Code no rodapé</span>
                  </label>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Mensagem de Rodapé</label>
                  <input
                    type="text"
                    value={receiptConfig.footerMessage}
                    onChange={(e) => setReceiptConfig({ ...receiptConfig, footerMessage: e.target.value })}
                    placeholder="Obrigado pela sua preferência! Bom apetite."
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                  />
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-bakery-600 text-white font-black shadow-xs hover:bg-bakery-700 transition cursor-pointer"
                  >
                    Guardar Configuração ({lojaSelecionadaTalao === 'todas' ? 'Geral' : (lojas.find(l => l.id === lojaSelecionadaTalao)?.nome || 'Loja')})
                  </button>
                </div>
              </form>

            {/* Pré-visualização Estática */}
            <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col items-center">
              <span className="text-xs font-bold text-gray-500 uppercase mb-3">
                Pré-visualização ({receiptConfig.paperWidth})
              </span>

              <div
                className={`${
                  receiptConfig.paperWidth === '58mm' ? 'w-[230px]' : 'w-[290px]'
                } ${
                  receiptConfig.fontSize === 'compact' ? 'text-[10px]' :
                  receiptConfig.fontSize === 'large' ? 'text-xs' : 'text-[11px]'
                } border-2 border-dashed border-gray-300 p-4 font-mono bg-white text-black shadow-sm`}
              >
                <div className="text-center">
                  <p className="font-black text-xs uppercase">{receiptConfig.storeNameOverride || 'Padaria Central'}</p>
                  {receiptConfig.slogan && <p className="text-[9px] italic">{receiptConfig.slogan}</p>}
                  {receiptConfig.showPhone && <p className="text-[10px]">Tel: 210 000 001</p>}
                  {receiptConfig.showNif && <p className="text-[9px]">NIF: 500100201</p>}
                </div>

                <div className="my-2 border-b border-dashed border-black" />
                <div className="text-center">
                  <p className="font-black text-sm">ENC-LOJA-1-0001</p>
                  <p className="text-[9px] font-bold uppercase mt-0.5">{t.pickupStore}</p>
                </div>
                <div className="my-2 border-b border-dashed border-black" />

                <div className="space-y-0.5">
                  <p>{t.date}: <b>Hoje</b> | {t.time}: <b>10:30</b></p>
                  <p>{t.client}: <b>Ana Silva</b></p>
                </div>

                <div className="my-2 border-b border-dashed border-black" />

                {receiptConfig.showSectionSeparation ? (
                  <>
                    <p className="font-bold text-[10px] uppercase tracking-wider">{t.receiptBakerySection}</p>
                    <div className="py-0.5 font-bold">
                      <span>2x Pão Alentejano</span>
                    </div>

                    <p className="font-bold text-[10px] uppercase tracking-wider mt-2">{t.receiptPastrySection}</p>
                    <div className="py-0.5 font-bold">
                      <span>1x Bolo Aniversário</span>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-[10px] uppercase tracking-wider">{t.receiptAllItemsSection}</p>
                    <div className="py-0.5 font-bold">
                      <span>2x Pão Alentejano</span>
                    </div>
                    <div className="py-0.5 font-bold">
                      <span>1x Bolo Aniversário</span>
                    </div>
                  </>
                )}

                {receiptConfig.highlightCakeNotes && (
                  <div className="bg-gray-100 p-1 border border-black my-1 text-[9px]">
                    <p className="font-bold">{t.customizationNotes}</p>
                    <p>Parabéns Mãe!</p>
                  </div>
                )}

                <div className="my-2 border-b border-dashed border-black" />
                <div className="flex justify-between font-black text-xs uppercase border-t border-b border-black py-1">
                  <span>{t.totalItems}:</span>
                  <span>3 un.</span>
                </div>

                <div className="text-center pt-3 text-[9px] space-y-0.5">
                  <p>{receiptConfig.footerMessage}</p>
                  <p className="text-gray-500">*** SISTEMA DE ENCOMENDAS ***</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* ----------------- ABA 5: GESTÃO DE ACESSOS & UTILIZADORES (100% NA APP) ----------------- */}
        {activeTab === 'acessos' && (
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-bakery-600" />
                  {t.panelAccessManagement}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t.panelAccessDesc}
                </p>
              </div>

              {/* Alternador de Sub-Abas: Colaboradores vs Matriz de Permissões */}
              <div className="flex items-center gap-2">
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setSubAbaAcessos('colaboradores')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      subAbaAcessos === 'colaboradores'
                        ? 'bg-white text-gray-900 shadow-2xs'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <Users className="h-3.5 w-3.5 text-bakery-600" />
                    <span>Colaboradores ({perfis.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubAbaAcessos('permissoes_cargos')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      subAbaAcessos === 'permissoes_cargos'
                        ? 'bg-white text-gray-900 shadow-2xs'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-bakery-600" />
                    <span>Matriz de Permissões por Cargo</span>
                  </button>
                </div>

                {subAbaAcessos === 'colaboradores' && (
                  <button
                    type="button"
                    onClick={() => {
                      const cargoInicial: Role = 'atendente';
                      const permPadrao = matrizPermissoes[cargoInicial] || obterPermissoesCargo(cargoInicial);
                      setPerfilEmEdicao({
                        nome: '',
                        telefone: '',
                        email: '',
                        password: '123',
                        role: cargoInicial,
                        loja_id: lojas[0]?.id,
                        ...permPadrao,
                        ativo: true,
                      });
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-bakery-600 text-white text-xs font-bold hover:bg-bakery-700 transition shadow-xs cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    {t.newUser}
                  </button>
                )}
              </div>
            </div>

            {/* SUB-ABA 1: LISTA DE COLABORADORES */}
            {subAbaAcessos === 'colaboradores' && (
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-[10px] border-b border-gray-200">
                    <tr>
                      <th className="p-3.5">Colaborador</th>
                      <th className="p-3.5">{t.role}</th>
                      <th className="p-3.5">{t.store}</th>
                      <th className="p-3.5">{t.allowedPanels}</th>
                      <th className="p-3.5">{t.status}</th>
                      <th className="p-3.5 text-right">{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                    {perfis.map((p) => {
                      const lojaNome = lojas.find((l) => l.id === p.loja_id)?.nome || t.allStores;
                      const roleLabel =
                        p.role === 'admin' ? t.roleAdmin :
                        p.role === 'gerente_loja' ? t.roleStoreManager :
                        p.role === 'padeiro_pasteleiro' || p.role === 'operador_padaria' || p.role === 'operador_pastelaria' ? t.roleBaker :
                        (p.role === 'motorista' || p.role === 'condutor') ? t.roleDriver : t.roleCounter;

                      const paineisUtilizador = [
                        { key: 'acesso_encomendas', label: t.navEncomendas, nivel: p.acesso_encomendas },
                        { key: 'acesso_loja', label: t.navLoja, nivel: p.acesso_loja },
                        { key: 'acesso_producao', label: t.navProducao, nivel: p.acesso_producao },
                        { key: 'acesso_entregas', label: t.navEntregas, nivel: p.acesso_entregas },
                        { key: 'acesso_gestao', label: t.navGestao, nivel: p.acesso_gestao },
                      ];

                      return (
                        <tr key={p.id} className="hover:bg-gray-50/70 transition">
                          <td className="p-3.5">
                            <p className="font-bold text-gray-900">{p.nome}</p>
                            <p className="text-[11px] text-gray-500">{p.telefone} {p.email ? `• ${p.email}` : ''}</p>
                          </td>

                          <td className="p-3.5">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              p.role === 'admin' ? 'bg-purple-50 text-purple-800 border border-purple-200' :
                              p.role === 'gerente_loja' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {roleLabel}
                            </span>
                          </td>

                          <td className="p-3.5 text-gray-600 font-bold">
                            {lojaNome}
                          </td>

                          <td className="p-3.5">
                            <div className="flex flex-wrap gap-1.5">
                              {paineisUtilizador.map((item) => {
                                if (item.nivel === 'sem_acesso') return null;
                                const isLeitura = item.nivel === 'leitura';
                                return (
                                  <span
                                    key={item.key}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                      isLeitura
                                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                                        : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    }`}
                                    title={isLeitura ? t.levelReadOnly : t.levelFullEdit}
                                  >
                                    {isLeitura ? <Eye className="h-2.5 w-2.5 text-blue-600" /> : <Edit3 className="h-2.5 w-2.5 text-emerald-600" />}
                                    {item.label} ({isLeitura ? t.levelReadOnly : t.levelFullEdit})
                                  </span>
                                );
                              })}
                            </div>
                          </td>

                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.ativo ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {p.ativo ? t.userActive : t.userInactive}
                            </span>
                          </td>

                          <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setPerfilEmEdicao(p)}
                              className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[11px] transition cursor-pointer"
                            >
                              {t.edit}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEliminarPerfil(p.id)}
                              className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[11px] transition cursor-pointer"
                              title="Eliminar este utilizador"
                            >
                              <Trash2 className="h-3.5 w-3.5 inline" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* SUB-ABA 2: MATRIZ DE PERMISSÕES POR CARGO */}
            {subAbaAcessos === 'permissoes_cargos' && (
              <div className="space-y-4">
                <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 leading-relaxed">
                  <p className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-amber-700" />
                    Configuração Centralizada de Permissões por Função / Cargo (RBAC)
                  </p>
                  <p className="text-[11px] text-amber-800/90 mt-0.5">
                    Defina abaixo os privilégios operacionais de cada função nos 5 cockpits. Ao guardar, todos os colaboradores registados com cada função herdam as regras imediatamente, garantindo que nenhum colaborador acede a cockpits ou dados indevidos.
                  </p>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-[10px] border-b border-gray-200">
                      <tr>
                        <th className="p-3 min-w-[160px]">Cargo / Função</th>
                        <th className="p-3 text-center min-w-[140px]">📦 {t.navEncomendas}</th>
                        <th className="p-3 text-center min-w-[140px]">🏬 {t.navLoja}</th>
                        <th className="p-3 text-center min-w-[140px]">👨‍🍳 {t.navProducao}</th>
                        <th className="p-3 text-center min-w-[140px]">🚚 {t.navEntregas}</th>
                        <th className="p-3 text-center min-w-[140px]">📊 {t.navGestao}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                      {([
                        { role: 'admin' as Role, label: t.roleAdmin, desc: 'Acesso pleno a todos os módulos e configurações globais' },
                        { role: 'gerente_loja' as Role, label: t.roleStoreManager, desc: 'Gestão da loja física, encomendas e consulta aos restantes painéis' },
                        { role: 'atendente' as Role, label: t.roleCounter, desc: 'Operação exclusiva de registo de encomendas e levantamentos ao balcão' },
                        { role: 'padeiro_pasteleiro' as Role, label: t.roleBaker, desc: 'Operação do Cockpit de Produção e planeamento de fabrico (padaria e pastelaria)' },
                        { role: 'motorista' as Role, label: t.roleDriver, desc: 'Operação do Cockpit de Carrinhas, rotas de distribuição e guias' },
                      ] as const).map((item) => {
                        const permCargo = matrizPermissoes[item.role] || MATRIZ_PERMISSOES_CARGOS_PADRAO[item.role];
                        const modulos: { key: keyof PermissoesCargo; nome: string }[] = [
                          { key: 'acesso_encomendas', nome: 'Encomendas' },
                          { key: 'acesso_loja', nome: 'Loja' },
                          { key: 'acesso_producao', nome: 'Produção' },
                          { key: 'acesso_entregas', nome: 'Carrinhas' },
                          { key: 'acesso_gestao', nome: 'Gestão' },
                        ];

                        return (
                          <tr key={item.role} className="hover:bg-gray-50/70 transition">
                            <td className="p-3.5">
                              <p className="font-bold text-gray-900">{item.label}</p>
                              <p className="text-[10px] text-gray-500 leading-tight mt-0.5">{item.desc}</p>
                            </td>

                            {modulos.map((mod) => {
                              const nivelAtual = permCargo[mod.key] || 'sem_acesso';
                              return (
                                <td key={mod.key} className="p-2.5 text-center">
                                  <div className="inline-flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-lg border border-gray-200 shadow-2xs">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setMatrizPermissoes((prev) => ({
                                          ...prev,
                                          [item.role]: {
                                            ...prev[item.role],
                                            [mod.key]: 'sem_acesso',
                                          },
                                        }));
                                      }}
                                      className={`px-1.5 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
                                        nivelAtual === 'sem_acesso'
                                          ? 'bg-red-600 text-white shadow-2xs'
                                          : 'text-gray-500 hover:text-gray-900'
                                      }`}
                                      title="Sem Acesso"
                                    >
                                      <Lock className="h-3 w-3 inline" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setMatrizPermissoes((prev) => ({
                                          ...prev,
                                          [item.role]: {
                                            ...prev[item.role],
                                            [mod.key]: 'leitura',
                                          },
                                        }));
                                      }}
                                      className={`px-1.5 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
                                        nivelAtual === 'leitura'
                                          ? 'bg-blue-600 text-white shadow-2xs'
                                          : 'text-gray-500 hover:text-gray-900'
                                      }`}
                                      title="Apenas Leitura"
                                    >
                                      <Eye className="h-3 w-3 inline" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setMatrizPermissoes((prev) => ({
                                          ...prev,
                                          [item.role]: {
                                            ...prev[item.role],
                                            [mod.key]: 'edicao',
                                          },
                                        }));
                                      }}
                                      className={`px-1.5 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
                                        nivelAtual === 'edicao'
                                          ? 'bg-emerald-600 text-white shadow-2xs'
                                          : 'text-gray-500 hover:text-gray-900'
                                      }`}
                                      title="Edição Total"
                                    >
                                      <Edit3 className="h-3 w-3 inline" />
                                    </button>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Barra de Ações da Matriz de Permissões */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleReporMatrizPadrao}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50 transition cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-gray-500" />
                    Repor Valores Recomendados
                  </button>

                  <button
                    type="button"
                    disabled={salvandoMatriz}
                    onClick={handleSalvarMatrizPermissoes}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-bakery-600 hover:bg-bakery-700 text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    <span>{salvandoMatriz ? 'A Guardar e Sincronizar...' : 'Guardar Configuração de Permissões'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL DE EDIÇÃO / CRIAÇÃO DE COLABORADOR */}
      {perfilEmEdicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-gray-200 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-bakery-600" />
              {perfilEmEdicao.id ? t.editUser : t.newUser}
            </h3>

            <form onSubmit={handleSalvarPerfil} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nome do Colaborador *</label>
                  <input
                    type="text"
                    required
                    value={perfilEmEdicao.nome || ''}
                    onChange={(e) => setPerfilEmEdicao({ ...perfilEmEdicao, nome: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Telefone *</label>
                  <input
                    type="tel"
                    required
                    value={perfilEmEdicao.telefone || ''}
                    onChange={(e) => setPerfilEmEdicao({ ...perfilEmEdicao, telefone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={perfilEmEdicao.email || ''}
                    onChange={(e) => setPerfilEmEdicao({ ...perfilEmEdicao, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">{t.password} *</label>
                  <input
                    type="text"
                    required
                    value={perfilEmEdicao.password || ''}
                    onChange={(e) => setPerfilEmEdicao({ ...perfilEmEdicao, password: e.target.value })}
                    placeholder="••••"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden font-mono text-gray-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Loja Afeta {perfilEmEdicao.role === 'atendente' || perfilEmEdicao.role === 'gerente_loja' ? '*' : ''}
                  </label>
                  <select
                    value={perfilEmEdicao.loja_id || (perfilEmEdicao.role === 'atendente' || perfilEmEdicao.role === 'gerente_loja' ? (lojas[0]?.id || '') : 'todas')}
                    onChange={(e) => setPerfilEmEdicao({ ...perfilEmEdicao, loja_id: e.target.value === 'todas' ? undefined : e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-bold"
                  >
                    {perfilEmEdicao.role !== 'atendente' && perfilEmEdicao.role !== 'gerente_loja' && (
                      <option value="todas">{t.allStores}</option>
                    )}
                    {lojas.map((l) => (
                      <option key={l.id} value={l.id}>{l.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">{t.role}</label>
                <select
                  value={
                    perfilEmEdicao.role === 'operador_padaria' || perfilEmEdicao.role === 'operador_pastelaria'
                      ? 'padeiro_pasteleiro'
                      : (perfilEmEdicao.role || 'atendente')
                  }
                  onChange={(e) => aplicarPredefinicoesCargo(e.target.value as Role)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-bold text-gray-900"
                >
                  <option value="admin">{t.roleAdmin}</option>
                  <option value="gerente_loja">{t.roleStoreManager}</option>
                  <option value="atendente">{t.roleCounter}</option>
                  <option value="padeiro_pasteleiro">{t.roleBaker}</option>
                  <option value="motorista">{t.roleDriver}</option>
                </select>
              </div>

              {/* Informação explicativa sobre permissões RBAC centralizadas */}
              <div className="bg-amber-50/70 border border-amber-200/90 rounded-xl p-3 text-amber-900 text-[11px] leading-relaxed flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Permissões de Cockpit Automáticas (RBAC):</span>
                  <p className="text-amber-800/90 mt-0.5">
                    As permissões de acesso aos cockpits deste colaborador são atribuídas automaticamente através da <strong>Matriz de Permissões por Cargo</strong>. Para editar o que cada função pode ou não executar, utilize o separador &ldquo;Matriz de Permissões por Cargo&rdquo;.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={perfilEmEdicao.ativo ?? true}
                    onChange={(e) => setPerfilEmEdicao({ ...perfilEmEdicao, ativo: e.target.checked })}
                    className="rounded text-emerald-600"
                  />
                  <span>{t.userActive}</span>
                </label>

                <div className="flex items-center gap-2">
                  {perfilEmEdicao.id && perfilEmEdicao.role !== 'admin' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Tem a certeza que deseja eliminar o colaborador ${perfilEmEdicao.nome}?`)) {
                          handleEliminarPerfil(perfilEmEdicao.id!);
                          setPerfilEmEdicao(null);
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs transition cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPerfilEmEdicao(null)}
                    className="px-3 py-1.5 rounded-lg bg-gray-100 font-bold text-gray-700 hover:bg-gray-200 transition cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-bakery-600 font-bold text-white shadow-xs hover:bg-bakery-700 transition cursor-pointer"
                  >
                    {t.saveUser}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE LOJA */}
      {lojaEmEdicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-200 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-gray-900 border-b pb-2">Editar Dados da Loja</h3>
            <form onSubmit={handleSalvarLoja} className="space-y-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">{t.storeCode}</label>
                <input
                  type="text"
                  required
                  value={lojaEmEdicao.codigo || ''}
                  onChange={(e) => setLojaEmEdicao({ ...lojaEmEdicao, codigo: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">{t.storeName}</label>
                <input
                  type="text"
                  required
                  value={lojaEmEdicao.nome || ''}
                  onChange={(e) => setLojaEmEdicao({ ...lojaEmEdicao, nome: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">{t.address}</label>
                <input
                  type="text"
                  required
                  value={lojaEmEdicao.morada || ''}
                  onChange={(e) => setLojaEmEdicao({ ...lojaEmEdicao, morada: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">{t.phone}</label>
                  <input
                    type="text"
                    required
                    value={lojaEmEdicao.telefone || ''}
                    onChange={(e) => setLojaEmEdicao({ ...lojaEmEdicao, telefone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">{t.nif}</label>
                  <input
                    type="text"
                    value={lojaEmEdicao.nif || ''}
                    onChange={(e) => setLojaEmEdicao({ ...lojaEmEdicao, nif: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                {lojaEmEdicao.id ? (
                  <button
                    type="button"
                    onClick={() => handleEliminarLoja(lojaEmEdicao.id!)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs transition cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar Loja
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLojaEmEdicao(null)}
                    className="px-3 py-1.5 rounded-lg bg-gray-100 font-bold text-gray-700 hover:bg-gray-200 transition cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-bakery-600 font-bold text-white shadow-xs hover:bg-bakery-700 transition cursor-pointer"
                  >
                    {t.save}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE CARRINHA / ROTA */}
      {carrinhaEmEdicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-200 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
              <Truck className="h-4 w-4 text-blue-600" />
              Editar Dados da Viatura e Rota ({carrinhaEmEdicao.rota || `Rota ${carrinhaEmEdicao.numero || ''}`})
            </h3>
            <form onSubmit={handleSalvarCarrinha} className="space-y-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nome da Rota *</label>
                <input
                  type="text"
                  required
                  value={carrinhaEmEdicao.rota || carrinhaEmEdicao.identificador || ''}
                  onChange={(e) => setCarrinhaEmEdicao({ ...carrinhaEmEdicao, rota: e.target.value, identificador: e.target.value })}
                  placeholder="Ex: Rota 1"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Viatura / Nome do Carro *</label>
                <input
                  type="text"
                  required
                  value={carrinhaEmEdicao.nome_carro || ''}
                  onChange={(e) => setCarrinhaEmEdicao({ ...carrinhaEmEdicao, nome_carro: e.target.value })}
                  placeholder="Ex: Carro 1"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Nome do Condutor</label>
                <input
                  type="text"
                  value={carrinhaEmEdicao.nome_condutor || ''}
                  onChange={(e) => setCarrinhaEmEdicao({ ...carrinhaEmEdicao, nome_condutor: e.target.value })}
                  placeholder="Ex: Manuel Silva"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">{t.licensePlate} *</label>
                <input
                  type="text"
                  required
                  value={carrinhaEmEdicao.matricula || ''}
                  onChange={(e) => setCarrinhaEmEdicao({ ...carrinhaEmEdicao, matricula: e.target.value.toUpperCase() })}
                  placeholder="Ex: 42-AB-90"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden font-mono uppercase font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setCarrinhaEmEdicao(null)}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 font-bold text-gray-700 hover:bg-gray-200 transition cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE INSERÇÃO DE REGISTO AVULSO NA BASE DE DADOS */}
      {modalRegistoAvulsoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-gray-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Plus className="h-4 w-4 text-bakery-600" />
                Inserir Registo na Base de Dados
              </h3>
              <button
                type="button"
                onClick={() => setModalRegistoAvulsoAberto(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold cursor-pointer"
              ><X className="h-4 w-4" /></button>
            </div>

            {/* Sub-abas do Modal */}
            <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-bold gap-1">
              <button
                type="button"
                onClick={() => setSubAbaRegistoAvulso('cliente')}
                className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
                  subAbaRegistoAvulso === 'cliente' ? 'bg-white text-bakery-900 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="inline-flex items-center gap-1.5"><User className="h-3.5 w-3.5" /><span>Cliente</span></span>
              </button>
              <button
                type="button"
                onClick={() => setSubAbaRegistoAvulso('produto')}
                className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
                  subAbaRegistoAvulso === 'produto' ? 'bg-white text-bakery-900 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="inline-flex items-center gap-1.5"><Flame className="h-3.5 w-3.5" /><span>Produto</span></span>
              </button>
            </div>

            {/* Formulário de Novo Cliente */}
            {subAbaRegistoAvulso === 'cliente' && (
              <form onSubmit={handleSalvarClienteAvulso} className="space-y-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nome do Cliente *</label>
                  <input
                    type="text"
                    required
                    value={novoCliente.nome}
                    onChange={(e) => setNovoCliente({ ...novoCliente, nome: e.target.value })}
                    placeholder="Ex: Maria Pereira"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Telefone *</label>
                    <input
                      type="tel"
                      required
                      value={novoCliente.telefone}
                      onChange={(e) => setNovoCliente({ ...novoCliente, telefone: e.target.value })}
                      placeholder="912 345 678"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">E-mail (Acesso à App & Recuperação)</label>
                    <input
                      type="email"
                      value={novoCliente.email || ''}
                      onChange={(e) => setNovoCliente({ ...novoCliente, email: e.target.value })}
                      placeholder="cliente@exemplo.pt"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Tipo de Cliente</label>
                    <select
                      value={novoCliente.tipo_cliente || 'particular'}
                      onChange={(e) => setNovoCliente({ ...novoCliente, tipo_cliente: e.target.value as 'particular' | 'empresarial' })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden bg-white text-xs font-bold"
                    >
                      <option value="particular">👤 Particular</option>
                      <option value="empresarial">🏢 Empresarial (B2B)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">NIF (Opcional)</label>
                    <input
                      type="text"
                      value={novoCliente.nif || ''}
                      onChange={(e) => setNovoCliente({ ...novoCliente, nif: e.target.value })}
                      placeholder="999 999 999"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Rota / Carrinha Habitual</label>
                    <select
                      value={novoCliente.carrinha_id || ''}
                      onChange={(e) => setNovoCliente({ ...novoCliente, carrinha_id: e.target.value || undefined })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden bg-white text-xs font-bold"
                    >
                      <option value="">(Sem rota específica)</option>
                      {carrinhas.map((car) => (
                        <option key={car.id} value={car.id}>
                          {car.identificador || car.matricula}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Código Postal</label>
                  <input
                    type="text"
                    value={novoCliente.codigo_postal}
                    onChange={(e) => setNovoCliente({ ...novoCliente, codigo_postal: e.target.value })}
                    placeholder="4540-102"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Morada de Entrega</label>
                  <input
                    type="text"
                    value={novoCliente.morada}
                    onChange={(e) => setNovoCliente({ ...novoCliente, morada: e.target.value })}
                    placeholder="Rua / Lugar, Arouca"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Notas de Entrega / Referência</label>
                  <textarea
                    rows={2}
                    value={novoCliente.notas_entrega}
                    onChange={(e) => setNovoCliente({ ...novoCliente, notas_entrega: e.target.value })}
                    placeholder="Ex: Deixar no portão lateral se não atender"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setModalRegistoAvulsoAberto(false)}
                    className="px-3 py-1.5 rounded-lg bg-gray-100 font-bold text-gray-700 hover:bg-gray-200 transition cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-bakery-600 hover:bg-bakery-700 font-bold text-white shadow-xs transition cursor-pointer"
                  >
                    Criar Cliente
                  </button>
                </div>
              </form>
            )}

            {/* Formulário de Novo Produto */}
            {subAbaRegistoAvulso === 'produto' && (
              <form onSubmit={handleSalvarProdutoAvulso} className="space-y-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nome do Artigo *</label>
                  <input
                    type="text"
                    required
                    value={novoProduto.nome}
                    onChange={(e) => setNovoProduto({ ...novoProduto, nome: e.target.value })}
                    placeholder="Ex: Broa de Milho Tradicional"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Setor de Fabrico</label>
                    <select
                      value={novoProduto.categoria}
                      onChange={(e) => setNovoProduto({ ...novoProduto, categoria: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-bold"
                    >
                      <option value="padaria">Padaria</option>
                      <option value="pastelaria">Pastelaria</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Unidade de Medida</label>
                    <select
                      value={novoProduto.unidade}
                      onChange={(e) => setNovoProduto({ ...novoProduto, unidade: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-bold"
                    >
                      <option value="unidade">Unidade (un.)</option>
                      <option value="kg">Quilograma (kg)</option>
                      <option value="cento">Cento</option>
                      <option value="dose">Dose</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setModalRegistoAvulsoAberto(false)}
                    className="px-3 py-1.5 rounded-lg bg-gray-100 font-bold text-gray-700 hover:bg-gray-200 transition cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-bakery-600 hover:bg-bakery-700 font-bold text-white shadow-xs transition cursor-pointer"
                  >
                    Criar Produto
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE ARTIGO / PRODUTO */}
      {produtoEmEdicaoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-bakery-600" />
                Editar Artigo no Catálogo Central
              </h3>
              <button
                type="button"
                onClick={() => setProdutoEmEdicaoModal(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold cursor-pointer"
              ><X className="h-4 w-4" /></button>
            </div>

            <form onSubmit={handleSalvarEdicaoProdutoModal} className="space-y-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nome do Artigo *</label>
                <input
                  type="text"
                  required
                  value={produtoEmEdicaoModal.nome || ''}
                  onChange={(e) => setProdutoEmEdicaoModal({ ...produtoEmEdicaoModal, nome: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                />
                <span className="text-[10px] text-gray-500 mt-0.5 block">Formatado automaticamente em Title Case (Ex: Pão de Forma Tradicional).</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Setor de Fabrico</label>
                  <select
                    value={produtoEmEdicaoModal.categoria || 'padaria'}
                    onChange={(e) => setProdutoEmEdicaoModal({ ...produtoEmEdicaoModal, categoria: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-bold"
                  >
                    <option value="padaria">Padaria</option>
                    <option value="pastelaria">Pastelaria</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Unidade de Medida</label>
                  <select
                    value={produtoEmEdicaoModal.unidade || 'unidade'}
                    onChange={(e) => setProdutoEmEdicaoModal({ ...produtoEmEdicaoModal, unidade: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-bold"
                  >
                    <option value="unidade">Unidade (un.)</option>
                    <option value="kg">Quilograma (kg)</option>
                    <option value="cento">Cento</option>
                    <option value="dose">Dose</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={produtoEmEdicaoModal.ativo ?? true}
                    onChange={(e) => setProdutoEmEdicaoModal({ ...produtoEmEdicaoModal, ativo: e.target.checked })}
                    className="rounded text-emerald-600"
                  />
                  <span>Artigo Ativo no Catálogo de Encomendas</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setProdutoEmEdicaoModal(null)}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 font-bold text-gray-700 hover:bg-gray-200 transition cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-bakery-600 hover:bg-bakery-700 font-bold text-white shadow-xs transition cursor-pointer"
                >
                  Guardar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO / CRIAÇÃO DE CLIENTE EMPRESARIAL B2B */}
      {clienteB2BEmEdicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-indigo-200 space-y-4 text-xs max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-indigo-600" />
                  Configurar Cliente Empresarial B2B
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Defina os dados da entidade, credenciais de login e quantidades diárias para as rotas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setClienteB2BEmEdicao(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarClienteB2BModal} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-gray-50/70 p-3 rounded-xl border border-gray-200">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nome da Entidade / Cliente *</label>
                  <input
                    type="text"
                    required
                    value={clienteB2BEmEdicao.nome}
                    onChange={(e) => setClienteB2BEmEdicao({ ...clienteB2BEmEdicao, nome: e.target.value })}
                    placeholder="Ex: Hospital de Arouca"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-300 font-bold focus:outline-hidden focus:border-indigo-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">NIF da Empresa</label>
                  <input
                    type="text"
                    value={clienteB2BEmEdicao.nif || ''}
                    onChange={(e) => setClienteB2BEmEdicao({ ...clienteB2BEmEdicao, nif: e.target.value })}
                    placeholder="500 xxx xxx"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-300 font-mono font-bold focus:outline-hidden focus:border-indigo-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Telemóvel (Login App) *</label>
                  <input
                    type="text"
                    required
                    value={clienteB2BEmEdicao.telemovel || clienteB2BEmEdicao.telefone || ''}
                    onChange={(e) => setClienteB2BEmEdicao({ ...clienteB2BEmEdicao, telemovel: e.target.value, telefone: e.target.value })}
                    placeholder="910 xxx xxx"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-300 font-bold focus:outline-hidden focus:border-indigo-500 bg-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-gray-700">Email (Login & Reset) *</label>
                    {clienteB2BEmEdicao.email && (
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await enviarEmailRecuperacaoPassword(clienteB2BEmEdicao.email!);
                          alert(res.message);
                        }}
                        className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 cursor-pointer flex items-center gap-1"
                        title="Enviar e-mail para redefinição ou primeiro acesso do cliente"
                      >
                        <Mail className="h-3 w-3" />
                        <span>Enviar Link de Recuperação / Acesso</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="email"
                    value={clienteB2BEmEdicao.email || ''}
                    onChange={(e) => setClienteB2BEmEdicao({ ...clienteB2BEmEdicao, email: e.target.value })}
                    placeholder="empresa@email.pt"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-300 font-bold focus:outline-hidden focus:border-indigo-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Password de Acesso</label>
                  <input
                    type="text"
                    value={clienteB2BEmEdicao.password || ''}
                    onChange={(e) => setClienteB2BEmEdicao({ ...clienteB2BEmEdicao, password: e.target.value })}
                    placeholder="Definir ou alterar password"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-300 font-mono text-indigo-900 font-bold focus:outline-hidden focus:border-indigo-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Localidade / Morada</label>
                  <input
                    type="text"
                    value={clienteB2BEmEdicao.morada || ''}
                    onChange={(e) => setClienteB2BEmEdicao({ ...clienteB2BEmEdicao, morada: e.target.value })}
                    placeholder="Arouca"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-300 focus:outline-hidden focus:border-indigo-500 bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-gray-700 mb-1">Rota Operacional de Distribuição *</label>
                  <select
                    value={clienteB2BEmEdicao.carrinha_id || carrinhas[0]?.id || ''}
                    onChange={(e) => setClienteB2BEmEdicao({ ...clienteB2BEmEdicao, carrinha_id: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-indigo-300 font-bold text-indigo-950 focus:outline-hidden bg-white cursor-pointer"
                  >
                    {carrinhasBaseDiaria.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.rota || `Rota ${c.numero || ''}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-[11px] flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
                <span>
                  <strong>Acesso ao Portal de Clientes:</strong> Qualquer cliente empresarial registado aqui pode iniciar sessão ou redefinir a password diretamente no portal (/encomendar) usando o telemóvel ou e-mail configurado.
                </span>
              </div>

              {/* Abas de Dia da Semana dentro do Modal */}
              <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-indigo-950 uppercase text-[11px]">
                      Quantidades para: {diaSemanaB2B.toUpperCase()}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const semanaModal = clienteB2BEmEdicao.quantidades_semanais || clienteB2BEmEdicao.quantidades_semana || ({} as Record<DiaSemana, Record<string, number>>);
                        const atual = { ...(semanaModal[diaSemanaB2B] || {}) };
                        const novaSemanaModal: Record<DiaSemana, Record<string, number>> = {
                          seg: { ...atual },
                          ter: { ...atual },
                          qua: { ...atual },
                          qui: { ...atual },
                          sex: { ...atual },
                          sab: { ...atual },
                          dom: { ...atual },
                        };
                        setClienteB2BEmEdicao({
                          ...clienteB2BEmEdicao,
                          quantidades_semanais: novaSemanaModal,
                          quantidades_semana: novaSemanaModal,
                        });
                      }}
                      className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-bold text-[10px] hover:bg-indigo-700 transition cursor-pointer"
                      title="Copiar as quantidades deste dia para todos os outros dias da semana"
                    >
                      Aplicar a Todos os Dias
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {([
                      { id: 'seg', label: 'Seg' },
                      { id: 'ter', label: 'Ter' },
                      { id: 'qua', label: 'Qua' },
                      { id: 'qui', label: 'Qui' },
                      { id: 'sex', label: 'Sex' },
                      { id: 'sab', label: 'Sáb' },
                      { id: 'dom', label: 'Dom' },
                    ] as { id: DiaSemana; label: string }[]).map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDiaSemanaB2B(d.id)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer ${
                          diaSemanaB2B === d.id
                            ? 'bg-indigo-700 text-white'
                            : 'bg-white text-indigo-900 border border-indigo-200'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Barra de Filtros de Categoria & Pesquisa do Catálogo (Estilo UX Encomendas) */}
              <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
                  {/* Seletor de Categorias */}
                  <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                    {[
                      { id: 'todas', label: `Todos (${artigosCatalogoB2B.length})` },
                      { id: 'padaria', label: `Padaria (${totaisB2BModalDia.padariaTotal})` },
                      { id: 'pastelaria', label: `Pastelaria (${totaisB2BModalDia.pastelariaTotal})` },
                      { 
                        id: 'selecionados', 
                        label: `Com Carga (${totaisB2BModalDia.totalItens})`,
                        destaque: totaisB2BModalDia.totalItens > 0 
                      },
                    ].map((cat: any) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategoriaArtigoB2BModal(cat.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                          categoriaArtigoB2BModal === cat.id
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : cat.destaque
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        }`}
                      >
                        <span>{cat.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Campo de Pesquisa */}
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
                    <input
                      type="text"
                      value={buscaArtigoB2BModal}
                      onChange={(e) => setBuscaArtigoB2BModal(e.target.value)}
                      placeholder="Pesquisar pão, broa, bolo..."
                      className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-stone-200 bg-white focus:outline-hidden focus:border-indigo-500 font-medium text-stone-800"
                    />
                    {buscaArtigoB2BModal && (
                      <button
                        type="button"
                        onClick={() => setBuscaArtigoB2BModal('')}
                        className="absolute right-2 top-2 text-stone-400 hover:text-stone-700"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Resumo rápido do dia selecionado */}
                <div className="flex items-center justify-between text-[11px] text-stone-500 font-semibold px-1 pt-1 border-t border-stone-100">
                  <span>
                    Artigos visíveis: <strong>{artigosFiltradosB2BModal.length}</strong>
                  </span>
                  <span>
                    Total para <strong>{diaSemanaB2B.toUpperCase()}</strong>: <strong className="text-indigo-950 font-mono font-black">{totaisB2BModalDia.totalQtd} un.</strong> ({totaisB2BModalDia.totalItens} artigos com entrega)
                  </span>
                </div>
              </div>

              {/* Grelha de Artigos do Catálogo B2B (Estilo UX Encomendas) */}
              {artigosFiltradosB2BModal.length === 0 ? (
                <div className="bg-stone-50 rounded-2xl p-8 text-center border border-dashed border-stone-200 space-y-2">
                  <Package className="h-8 w-8 text-stone-300 mx-auto" />
                  <p className="text-xs font-bold text-stone-700">Nenhum artigo encontrado</p>
                  <p className="text-[11px] text-stone-400">
                    {categoriaArtigoB2BModal === 'selecionados' 
                      ? `Não existem artigos com quantidade definida para ${diaSemanaB2B.toUpperCase()}. Escolha 'Todos', 'Padaria' ou 'Pastelaria' para adicionar.`
                      : 'Tente outro termo de pesquisa ou selecione outra categoria.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto p-1">
                  {artigosFiltradosB2BModal.map((art) => {
                    const semanaModal = (clienteB2BEmEdicao.quantidades_semanais || clienteB2BEmEdicao.quantidades_semana || {}) as Record<string, Record<string, number>>;
                    const qtdAtual = Number(semanaModal[diaSemanaB2B]?.[art.nome] || 0);

                    return (
                      <div
                        key={art.nome}
                        className={`rounded-2xl border p-3 flex flex-col justify-between space-y-2 transition shadow-2xs ${
                          qtdAtual > 0
                            ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-200'
                            : 'bg-white border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <SectorBadge setor={art.categoria} />
                            <span className="text-[10px] font-black text-amber-900 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md uppercase">
                              {art.unidade}
                            </span>
                          </div>
                          <h4 className="text-xs font-black text-stone-900 leading-snug line-clamp-2" title={art.nome}>
                            {art.nome}
                          </h4>
                          <span className="text-[10px] text-stone-400 block mt-0.5">
                            {art.categoria === 'pastelaria' ? 'Pastelaria Fina' : 'Padaria Tradicional'}
                          </span>
                        </div>

                        {/* Controlo de Quantidade estilo UX encomendas */}
                        <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-stone-500 uppercase">
                            Qtd / Dia:
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDefinirQtdArtigoB2BModal(art.nome, Math.max(0, qtdAtual - 1))}
                              disabled={qtdAtual <= 0}
                              className={`h-7 w-7 rounded-lg border flex items-center justify-center font-bold text-xs transition ${
                                qtdAtual > 0
                                  ? 'bg-white border-indigo-300 text-indigo-900 hover:bg-indigo-100 cursor-pointer'
                                  : 'bg-stone-100 border-stone-200 text-stone-300 cursor-not-allowed'
                              }`}
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <input
                              type="number"
                              min={0}
                              value={qtdAtual === 0 ? '' : qtdAtual}
                              placeholder="0"
                              onChange={(e) => handleDefinirQtdArtigoB2BModal(art.nome, e.target.value)}
                              className="w-14 text-center py-1 px-1 rounded-lg border border-stone-300 bg-white font-mono font-black text-indigo-950 text-xs focus:border-indigo-500 focus:outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={() => handleDefinirQtdArtigoB2BModal(art.nome, qtdAtual + 1)}
                              className="h-7 w-7 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center font-bold text-xs shadow-2xs transition cursor-pointer"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t">
                {clienteB2BEmEdicao.id && clientesB2B.some((c) => c.id === clienteB2BEmEdicao.id) ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleEliminarClienteB2B(clienteB2BEmEdicao.id, clienteB2BEmEdicao.nome);
                      setClienteB2BEmEdicao(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 font-bold text-red-600 border border-red-200 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar Cliente
                  </button>
                ) : <div />}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setClienteB2BEmEdicao(null)}
                    className="px-3 py-1.5 rounded-lg bg-gray-100 font-bold text-gray-700 hover:bg-gray-200 transition cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 font-black text-white shadow-xs transition cursor-pointer"
                  >
                    Guardar Cliente Empresarial
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIGURAÇÃO DE MODO FÉRIAS */}
      {modalFeriasBase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-amber-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                  <span>🏖️</span>
                  Modo Férias / Pausa Temporária
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Suspende automaticamente as entregas diárias e subtrai do fabrico no período indicado.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalFeriasBase(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-950 font-bold space-y-1">
              <div>Cliente: {modalFeriasBase.cliente_nome || 'Cliente Selecionado'}</div>
              <div className="text-[11px] text-amber-800 font-normal">
                Durante o período de férias, nenhum pão desta entrega será incluído na folha de fabrico nem na carrinha.
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Data de Início da Pausa *</label>
                <input
                  type="date"
                  value={feriasInicio}
                  onChange={(e) => setFeriasInicio(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-300 font-bold focus:outline-hidden focus:border-amber-500 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Data de Fim da Pausa (inclusive) *</label>
                <input
                  type="date"
                  value={feriasFim}
                  onChange={(e) => setFeriasFim(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-300 font-bold focus:outline-hidden focus:border-amber-500 bg-white"
                />
              </div>

              {/* Atalhos Rápidos */}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[10px] text-gray-500 font-bold">Atalhos:</span>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    const inicio = d.toISOString().split('T')[0];
                    const fimD = new Date(d);
                    fimD.setDate(d.getDate() + 7);
                    setFeriasInicio(inicio);
                    setFeriasFim(fimD.toISOString().split('T')[0]);
                  }}
                  className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-[10px] font-bold text-gray-700 cursor-pointer"
                >
                  Próximos 7 dias
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    const inicio = d.toISOString().split('T')[0];
                    const fimD = new Date(d);
                    fimD.setDate(d.getDate() + 15);
                    setFeriasInicio(inicio);
                    setFeriasFim(fimD.toISOString().split('T')[0]);
                  }}
                  className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-[10px] font-bold text-gray-700 cursor-pointer"
                >
                  15 dias
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t">
              {modalFeriasBase.pausa_inicio ? (
                <button
                  type="button"
                  onClick={() => {
                    handleCancelarFerias(modalFeriasBase);
                    setModalFeriasBase(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-red-50 text-red-700 font-bold border border-red-200 hover:bg-red-100 transition cursor-pointer"
                >
                  Retomar Entregas
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalFeriasBase(null)}
                  className="px-3 py-1.5 rounded-xl bg-gray-100 font-bold text-gray-700 hover:bg-gray-200 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSalvarFerias}
                  className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 font-bold text-white shadow-xs transition cursor-pointer"
                >
                  Guardar Férias
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE ENTREGA RECORRENTE */}
      {baseRecorrenteEmEdicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-teal-200 space-y-4 text-xs max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                  <span className="text-teal-600">🏠</span>
                  Configurar Entrega Diária Recorrente (Porta-a-Porta)
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Defina o cliente, rota habitual e o plano semanal de artigos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBaseRecorrenteEmEdicao(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarBaseRecorrenteModal} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-teal-50/50 p-3 rounded-xl border border-teal-100">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Cliente Particular *</label>
                  <select
                    value={baseRecorrenteEmEdicao.cliente_id || ''}
                    onChange={(e) => {
                      const cli = clientes.find((c) => c.id === e.target.value);
                      setBaseRecorrenteEmEdicao({
                        ...baseRecorrenteEmEdicao,
                        cliente_id: e.target.value,
                        cliente_nome: cli?.nome,
                        cliente_telefone: cli?.telefone,
                        cliente_morada: cli?.morada,
                        carrinha_id: cli?.carrinha_id || baseRecorrenteEmEdicao.carrinha_id || carrinhas[0]?.id || '',
                      });
                    }}
                    required
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-300 font-bold focus:outline-hidden focus:border-teal-500 bg-white cursor-pointer"
                  >
                    <option value="">Selecione o cliente...</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome} ({c.telefone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Rota / Carrinha *</label>
                  <select
                    value={baseRecorrenteEmEdicao.carrinha_id || carrinhas[0]?.id || ''}
                    onChange={(e) => {
                      const car = carrinhas.find((c) => c.id === e.target.value);
                      setBaseRecorrenteEmEdicao({
                        ...baseRecorrenteEmEdicao,
                        carrinha_id: e.target.value,
                        carrinha_nome: car?.identificador,
                      });
                    }}
                    required
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-300 font-bold focus:outline-hidden focus:border-teal-500 bg-white cursor-pointer"
                  >
                    {carrinhas.map((car) => (
                      <option key={car.id} value={car.id}>
                        {car.identificador || car.rota || `Carrinha ${car.numero || ''}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Método de Pagamento</label>
                  <select
                    value={baseRecorrenteEmEdicao.metodo_pagamento || 'dinheiro_ao_motorista'}
                    onChange={(e) => setBaseRecorrenteEmEdicao({ ...baseRecorrenteEmEdicao, metodo_pagamento: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-300 font-bold focus:outline-hidden focus:border-teal-500 bg-white cursor-pointer"
                  >
                    <option value="dinheiro_ao_motorista">💵 Dinheiro ao motorista</option>
                    <option value="conta_mensal">📑 Conta mensal</option>
                    <option value="mbway_semanal">📱 MBWay semanal</option>
                    <option value="multibanco">🏦 Multibanco</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Notas para o Motorista</label>
                  <input
                    type="text"
                    value={baseRecorrenteEmEdicao.notas_motorista || ''}
                    onChange={(e) => setBaseRecorrenteEmEdicao({ ...baseRecorrenteEmEdicao, notas_motorista: e.target.value })}
                    placeholder="Ex: Deixar no saco azul na maçaneta"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-300 focus:outline-hidden focus:border-teal-500 bg-white"
                  />
                </div>
              </div>

              {/* Matriz Semanal de Pão */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-teal-600" />
                    Pão Diário para: <b className="uppercase text-teal-700">{diaSemanaBaseRecorrenteModal}</b>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const sem = baseRecorrenteEmEdicao.quantidades_semanais || { seg: {}, ter: {}, qua: {}, qui: {}, sex: {}, sab: {}, dom: {} };
                      const baseDia = { ...(sem[diaSemanaBaseRecorrenteModal] || {}) };
                      const novaSem: any = {};
                      ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].forEach((d) => {
                        novaSem[d] = { ...baseDia };
                      });
                      setBaseRecorrenteEmEdicao({ ...baseRecorrenteEmEdicao, quantidades_semanais: novaSem });
                    }}
                    className="text-[10px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2 py-1 rounded-lg cursor-pointer"
                  >
                    Copiar {diaSemanaBaseRecorrenteModal.toUpperCase()} para toda a semana
                  </button>
                </div>

                {/* Seletor de dia */}
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {([
                    { id: 'seg', label: 'Seg' },
                    { id: 'ter', label: 'Ter' },
                    { id: 'qua', label: 'Qua' },
                    { id: 'qui', label: 'Qui' },
                    { id: 'sex', label: 'Sex' },
                    { id: 'sab', label: 'Sáb' },
                    { id: 'dom', label: 'Dom' },
                  ] as { id: DiaSemana; label: string }[]).map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDiaSemanaBaseRecorrenteModal(d.id)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer ${
                        diaSemanaBaseRecorrenteModal === d.id ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>

                {/* Grelha de Artigos de Padaria */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-2 bg-gray-50/50">
                  {produtos
                    .filter((p) => p.ativo && p.categoria === 'padaria')
                    .map((prod) => {
                      const sem = baseRecorrenteEmEdicao.quantidades_semanais || { seg: {}, ter: {}, qua: {}, qui: {}, sex: {}, sab: {}, dom: {} };
                      const qtd = sem[diaSemanaBaseRecorrenteModal]?.[prod.nome] || 0;
                      return (
                        <div key={prod.id} className="flex items-center justify-between p-1.5 bg-white border border-gray-200 rounded-lg">
                          <span className="font-bold text-gray-800 text-[11px] truncate pr-1" title={prod.nome}>
                            {prod.nome}
                          </span>
                          <input
                            type="number"
                            min={0}
                            value={qtd === 0 ? '' : qtd}
                            placeholder="0"
                            onChange={(e) => {
                              const val = Math.max(0, Math.floor(Number(e.target.value) || 0));
                              const mapaDia = { ...(sem[diaSemanaBaseRecorrenteModal] || {}) };
                              if (val <= 0) {
                                delete mapaDia[prod.nome];
                              } else {
                                mapaDia[prod.nome] = val;
                              }
                              setBaseRecorrenteEmEdicao({
                                ...baseRecorrenteEmEdicao,
                                quantidades_semanais: {
                                  ...sem,
                                  [diaSemanaBaseRecorrenteModal]: mapaDia,
                                },
                              });
                            }}
                            className="w-14 text-center py-0.5 px-1 rounded border border-gray-300 font-mono font-bold text-teal-950 text-xs"
                          />
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                {baseRecorrenteEmEdicao.id ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleEliminarBaseRecorrente(baseRecorrenteEmEdicao.id!, baseRecorrenteEmEdicao.cliente_nome);
                      setBaseRecorrenteEmEdicao(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 font-bold text-red-600 border border-red-200 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar
                  </button>
                ) : <div />}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBaseRecorrenteEmEdicao(null)}
                    className="px-3 py-1.5 rounded-lg bg-gray-100 font-bold text-gray-700 hover:bg-gray-200 transition cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 font-black text-white shadow-xs transition cursor-pointer"
                  >
                    Guardar Entrega Recorrente
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de PDF (Folha de Carga das 7 Rotas e Comprovativos B2B) */}
      <PdfViewerModal
        isOpen={pdfModalOpen}
        tipo={pdfModalTipo}
        onClose={() => setPdfModalOpen(false)}
        dadosGuiaConjunta={pdfDadosGuiaConjunta}
        carrinha={pdfCarrinhaSelecionada}
        diaSemana={diaSemanaBaseFixa}
        dataReferencia={new Date().toISOString().split('T')[0]}
        itensCarga={pdfItensCarga}
        clientesB2BRota={clientesB2B.filter((cli) => cli.ativo && cli.carrinha_id === pdfCarrinhaSelecionada?.id)}
        encomendasRota={encomendas.filter(
          (e) => (pdfCarrinhaSelecionada ? e.carrinha_id === pdfCarrinhaSelecionada.id : true) &&
                 e.tipo === 'entrega_domicilio' &&
                 e.estado !== 'cancelado'
        )}
        clienteB2B={pdfClienteB2B}
        nomeCondutor={pdfCarrinhaSelecionada?.nome_condutor || "Condutor"}
        matriculaCarro={pdfCarrinhaSelecionada?.matricula}
      />

      {/* Modal de Teste do Talão Térmico */}
      {encomendaTesteTalão && (
        <ThermalReceipt
          encomenda={encomendaTesteTalão}
          config={receiptConfig}
          onClose={() => setEncomendaTesteTalão(null)}
        />
      )}
    </div>
  );
}
