'use client';

import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Navbar } from '../../components/Navbar';
import { ThermalReceipt } from '../../components/ThermalReceipt';
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
  eliminarCarrinhaDb,
  carregarPerfisAcessoSupabase,
  salvarPerfilAcessoDb,
  eliminarPerfilAcessoDb,
  salvarClienteDb,
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
  salvarClientesEmpresariaisB2B
} from '../../lib/encomendasService';
import { 
  ReceiptConfig, 
  getReceiptConfig, 
  saveReceiptConfig, 
  DEFAULT_RECEIPT_CONFIG 
} from '../../lib/receiptConfig';
import { Encomenda, Cliente, Produto, Loja, Carrinha, PerfilUtilizador, Role, NivelAcesso, LogAuditoria, BaseFixaCarrinha, ClienteEmpresarialB2B, DiaSemana } from '../../types';
import { useTranslation } from '../../lib/i18n';
import { useAuth } from '../../lib/authContext';
import { obterConfiguracaoMarca } from '../../lib/tinaContent';
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
} from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge';
import { OriginBadge, SectorBadge } from '../../components/InproovalBadges';

export default function AdminPage() {
  const { t, language } = useTranslation();
  const { podeEditar } = useAuth();
  const temPermissaoEdicaoGestao = podeEditar('gestao');
  const configMarca = obterConfiguracaoMarca();
  const [selectedLojaId, setSelectedLojaId] = useState<string>('todas');
  const [activeTab, setActiveTab] = useState<'metricas' | 'lojas_carrinhas' | 'database' | 'logs' | 'talao' | 'acessos'>('metricas');

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

  // Configuração do Talão
  const [receiptConfig, setReceiptConfig] = useState<ReceiptConfig>(DEFAULT_RECEIPT_CONFIG);
  const [encomendaTesteTalão, setEncomendaTesteTalão] = useState<Encomenda | null>(null);

  // Edição de Lojas / Carrinhas / Utilizadores
  const [lojaEmEdicao, setLojaEmEdicao] = useState<Partial<Loja> | null>(null);
  const [carrinhaEmEdicao, setCarrinhaEmEdicao] = useState<Partial<Carrinha> | null>(null);
  const [perfilEmEdicao, setPerfilEmEdicao] = useState<Partial<PerfilUtilizador> | null>(null);

  // Inserção de Registo Avulso na BD
  const [modalRegistoAvulsoAberto, setModalRegistoAvulsoAberto] = useState<boolean>(false);
  const [subAbaRegistoAvulso, setSubAbaRegistoAvulso] = useState<'cliente' | 'produto'>('cliente');
  const [novoCliente, setNovoCliente] = useState<{ nome: string; telefone: string; morada: string; codigo_postal: string; notas_entrega: string }>({
    nome: '', telefone: '', morada: '', codigo_postal: '', notas_entrega: ''
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
  const [novoArtigoBaseFixa, setNovoArtigoBaseFixa] = useState<string>('');
  const [feedbackBaseFixa, setFeedbackBaseFixa] = useState<string | null>(null);
  const [feedbackB2B, setFeedbackB2B] = useState<string | null>(null);

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
        const setCombinado = new Set<string>(Array.isArray(artsGuardados) ? artsGuardados : []);
        (bfCarregada || []).forEach((bf) => {
          if (!bf) return;
          const mapa = bf?.quantidades_por_produto || bf?.quantidades || {};
          Object.keys(mapa).forEach((prod) => setCombinado.add(prod));
          if (bf?.quantidades_semanais) {
            Object.values(bf.quantidades_semanais).forEach((m) => {
              Object.keys(m || {}).forEach((prod) => setCombinado.add(prod));
            });
          }
        });
        setArtigosBaseFixa(Array.from(setCombinado));
        const b2b = carregarClientesEmpresariaisB2B();
        if (Array.isArray(b2b)) setClientesB2B(b2b);
      } catch (err) {
        console.error('Erro no carregamento inicial de dados em gestao:', err);
      }
    }
    carregar();
  }, []);

  // Artigos visíveis na grelha de Base Fixa (Editáveis e elimináveis pelo Administrador)
  const artigosGrelhaBaseFixa = useMemo(() => {
    if (artigosBaseFixa && artigosBaseFixa.length > 0) return artigosBaseFixa;
    return COLUNAS_MAPA_DIARIO_OFICIAL || [];
  }, [artigosBaseFixa]);

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

    // 2. Migrar quantidades nas 4 carrinhas da Base Fixa
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
      return {
        ...bf,
        quantidades_por_produto: mapaAtual,
        quantidades: mapaAtual,
      };
    });
    setBaseFixaCarrinhas(novaBaseFixa);
    salvarBaseFixaCarrinhas(novaBaseFixa);

    // 3. Migrar também nos clientes B2B caso usassem o nome antigo
    const todosDias: DiaSemana[] = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
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
      const cabecalho = ['Produto_Artigo', ...carrinhas.map((c) => c.identificador || c.nome), 'Total_Dia'];
      const linhas: any[] = artigosGrelhaBaseFixa.map((prodNome) => {
        const qtds = carrinhas.map((c) => obterQtdBaseCarrinha(c.id, d.id, prodNome));
        const total = qtds.reduce((a, b) => a + b, 0);
        return [prodNome, ...qtds, total];
      });

      const totaisPorCarrinha = carrinhas.map((c) => {
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

  const handleEliminarClienteB2B = (id: string, nome: string) => {
    if (!window.confirm(`Deseja remover o cliente empresarial "${nome}" da rota do 5º Carro?`)) return;
    const novaLista = clientesB2B.filter((c) => c.id !== id);
    setClientesB2B(novaLista);
    salvarClientesEmpresariaisB2B(novaLista);
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
    saveReceiptConfig(receiptConfig);
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
    if (!carrinhaEmEdicao || !carrinhaEmEdicao.identificador) return;
    const salva = await salvarCarrinhaDb({
      ...carrinhaEmEdicao,
      loja_id: carrinhaEmEdicao.loja_id || lojas[0]?.id || 'a9982e9f-7899-4a7c-8ce3-bc30f16c99a2',
    } as any);
    if (salva) {
      const cars = await carregarCarrinhasSupabase();
      setCarrinhas(cars);
      setCarrinhaEmEdicao(null);
      alert(t.success);
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
      setNovoCliente({ nome: '', telefone: '', morada: '', codigo_postal: '', notas_entrega: '' });
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
    let accessLevels: {
      acesso_encomendas: NivelAcesso;
      acesso_producao: NivelAcesso;
      acesso_loja: NivelAcesso;
      acesso_entregas: NivelAcesso;
      acesso_gestao: NivelAcesso;
    } = {
      acesso_encomendas: 'edicao',
      acesso_producao: 'leitura',
      acesso_loja: 'edicao',
      acesso_entregas: 'sem_acesso',
      acesso_gestao: 'sem_acesso',
    };

    if (cargo === 'admin') {
      accessLevels = {
        acesso_encomendas: 'edicao',
        acesso_producao: 'edicao',
        acesso_loja: 'edicao',
        acesso_entregas: 'edicao',
        acesso_gestao: 'edicao',
      };
    } else if (cargo === 'gerente_loja') {
      accessLevels = {
        acesso_encomendas: 'edicao',
        acesso_producao: 'edicao',
        acesso_loja: 'edicao',
        acesso_entregas: 'edicao',
        acesso_gestao: 'leitura',
      };
    } else if (cargo === 'operador_padaria' || cargo === 'operador_pastelaria') {
      accessLevels = {
        acesso_encomendas: 'sem_acesso',
        acesso_producao: 'edicao',
        acesso_loja: 'sem_acesso',
        acesso_entregas: 'sem_acesso',
        acesso_gestao: 'sem_acesso',
      };
    } else if (cargo === 'motorista') {
      accessLevels = {
        acesso_encomendas: 'sem_acesso',
        acesso_producao: 'sem_acesso',
        acesso_loja: 'leitura',
        acesso_entregas: 'edicao',
        acesso_gestao: 'sem_acesso',
      };
    }

    setPerfilEmEdicao({
      ...perfilEmEdicao,
      role: cargo,
      ...accessLevels,
      painel_encomendas: accessLevels.acesso_encomendas !== 'sem_acesso',
      painel_producao: accessLevels.acesso_producao !== 'sem_acesso',
      painel_loja: accessLevels.acesso_loja !== 'sem_acesso',
      painel_entregas: accessLevels.acesso_entregas !== 'sem_acesso',
      painel_gestao: accessLevels.acesso_gestao !== 'sem_acesso',
    });
  };

  const handleSalvarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!perfilEmEdicao || !perfilEmEdicao.nome) return;

    const encNivel: NivelAcesso = perfilEmEdicao.acesso_encomendas || (perfilEmEdicao.painel_encomendas ? 'edicao' : 'sem_acesso');
    const prodNivel: NivelAcesso = perfilEmEdicao.acesso_producao || (perfilEmEdicao.painel_producao ? 'edicao' : 'sem_acesso');
    const lojaNivel: NivelAcesso = perfilEmEdicao.acesso_loja || (perfilEmEdicao.painel_loja ? 'edicao' : 'sem_acesso');
    const entNivel: NivelAcesso = perfilEmEdicao.acesso_entregas || (perfilEmEdicao.painel_entregas ? 'edicao' : 'sem_acesso');
    const gestNivel: NivelAcesso = perfilEmEdicao.acesso_gestao || (perfilEmEdicao.painel_gestao ? 'edicao' : 'sem_acesso');

    const perfilParaGravar: PerfilUtilizador = {
      id: perfilEmEdicao.id || `user-${Date.now()}`,
      nome: perfilEmEdicao.nome.trim(),
      telefone: perfilEmEdicao.telefone?.trim() || '9xxxxxxxx',
      email: perfilEmEdicao.email?.trim() || '',
      password: perfilEmEdicao.password?.trim() || (perfilEmEdicao.role === 'admin' ? 'admin' : '123'),
      role: (perfilEmEdicao.role as Role) || 'atendente',
      loja_id: perfilEmEdicao.loja_id || undefined,
      acesso_encomendas: encNivel,
      acesso_producao: prodNivel,
      acesso_loja: lojaNivel,
      acesso_entregas: entNivel,
      acesso_gestao: gestNivel,
      painel_encomendas: encNivel !== 'sem_acesso',
      painel_producao: prodNivel !== 'sem_acesso',
      painel_loja: lojaNivel !== 'sem_acesso',
      painel_entregas: entNivel !== 'sem_acesso',
      painel_gestao: gestNivel !== 'sem_acesso',
      ativo: perfilEmEdicao.ativo ?? true,
    };

    const novaLista = await salvarPerfilAcessoDb(perfilParaGravar);
    setPerfis(novaLista);
    setPerfilEmEdicao(null);
    alert(t.success);
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
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-bakery-600" />
              {configMarca.tituloGestao || t.managementTitle}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
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
            onClick={() => setActiveTab('metricas')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'metricas' ? 'bg-bakery-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            {t.tabMetrics}
          </button>

          <button
            onClick={() => setActiveTab('lojas_carrinhas')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'lojas_carrinhas' ? 'bg-bakery-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Store className="h-4 w-4" />
            {t.tabStoresVans}
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'database' ? 'bg-bakery-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            {t.tabDatabase}
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'logs' ? 'bg-bakery-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Clock className="h-4 w-4" />
            Auditoria & Histórico ({logsAuditoria.length})
          </button>

          <button
            onClick={() => setActiveTab('talao')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'talao' ? 'bg-bakery-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Printer className="h-4 w-4" />
            {t.tabReceiptConfig}
          </button>

          <button
            onClick={() => setActiveTab('acessos')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'acessos' ? 'bg-bakery-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="h-4 w-4" />
            {t.tabAccess} ({perfis.length})
          </button>
        </div>

        {/* ----------------- ABA 1: MÉTRICAS & REPORTS COM FILTROS TEMPORAIS ----------------- */}
        {activeTab === 'metricas' && (
          <div className="space-y-6">
            {/* Barra de Filtros Combinados: Período Temporal + Formato de Entrega */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              {/* Seleção do Período */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-gray-500 mr-1 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-bakery-600" />
                  {t.timePeriod}:
                </span>
                {[
                  { id: 'dia', label: t.periodToday },
                  { id: 'semana', label: t.periodWeek },
                  { id: 'mes', label: t.periodMonth },
                  { id: 'ano', label: t.periodYear },
                  { id: 'todos', label: t.periodAll },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPeriodoSelecionado(item.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      periodoSelecionado === item.id
                        ? 'bg-bakery-600 text-white shadow-2xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Seleção de Formato de Entrega */}
              <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-200">
                <span className="text-xs font-bold text-gray-500 px-2">{t.deliveryFormat}:</span>
                <select
                  value={formatoEntrega}
                  onChange={(e) => setFormatoEntrega(e.target.value as any)}
                  className="bg-white border border-gray-200 text-xs font-bold rounded-lg px-2.5 py-1 text-gray-900 focus:outline-hidden cursor-pointer"
                >
                  <option value="todos">{t.allFormats}</option>
                  <option value="levantamento_loja">{t.pickupStore}</option>
                  <option value="entrega_domicilio">{t.deliveryHome}</option>
                </select>
              </div>
            </div>

            {/* Cartões de Indicadores Operacionais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                <span className="text-xs text-gray-500 font-bold uppercase">{t.totalOrders}</span>
                <p className="text-2xl font-black text-gray-900 mt-1">{totalVolumeEncomendas}</p>
                <span className="text-[11px] text-emerald-600 font-bold mt-1 block">
                  {periodoSelecionado === 'todos' ? t.periodAll : t.timePeriod}
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                <span className="text-xs text-gray-500 font-bold uppercase">{t.totalItems}</span>
                <p className="text-2xl font-black text-amber-700 mt-1">{totalArtigos} un.</p>
                <span className="text-[11px] text-gray-500 font-medium mt-1 block">
                  Padaria & Pastelaria consolidados
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                <span className="text-xs text-gray-500 font-bold uppercase">{t.deliveryHome}</span>
                <p className="text-2xl font-black text-blue-700 mt-1">{totalEntregas}</p>
                <span className="text-[11px] text-blue-600 font-bold mt-1 block">
                  {totalVolumeEncomendas > 0 ? ((totalEntregas / totalVolumeEncomendas) * 100).toFixed(0) : 0}% das encomendas
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                <span className="text-xs text-gray-500 font-bold uppercase">{t.pickupStore}</span>
                <p className="text-2xl font-black text-amber-700 mt-1">{totalLevantamentos}</p>
                <span className="text-[11px] text-amber-600 font-bold mt-1 block">
                  {totalVolumeEncomendas > 0 ? ((totalLevantamentos / totalVolumeEncomendas) * 100).toFixed(0) : 0}% das encomendas
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                <span className="text-xs text-gray-500 font-bold uppercase">Taxa On-Time</span>
                <p className={`text-2xl font-black mt-1 ${taxaPontualidade >= 90 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {taxaPontualidade}%
                </p>
                <span className="text-[11px] text-gray-500 font-medium mt-1 block">
                  {entregasNoPrazo.length} de {entregasFinalizadas.length} entregas a horas
                </span>
              </div>
            </div>

            {/* Canais de Origem das Encomendas */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-bakery-600" />
                  Origem das Encomendas por Canal
                </h3>
                <span className="text-xs text-gray-500 font-semibold">
                  Total: {totalVolumeEncomendas} pedidos
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/70">
                  <div className="flex items-center gap-1.5 text-stone-700 text-xs font-bold mb-1">
                    <Store className="h-3.5 w-3.5 text-stone-600" />
                    <span>Presencial</span>
                  </div>
                  <p className="text-xl font-black text-stone-900">{canaisOrigemStats.presencial}</p>
                  <p className="text-[10px] text-stone-500 font-semibold mt-0.5">
                    {totalVolumeEncomendas > 0 ? ((canaisOrigemStats.presencial / totalVolumeEncomendas) * 100).toFixed(0) : 0}% do total
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70">
                  <div className="flex items-center gap-1.5 text-amber-900 text-xs font-bold mb-1">
                    <Phone className="h-3.5 w-3.5 text-amber-600" />
                    <span>Telefone</span>
                  </div>
                  <p className="text-xl font-black text-amber-950">{canaisOrigemStats.telefone}</p>
                  <p className="text-[10px] text-amber-700 font-semibold mt-0.5">
                    {totalVolumeEncomendas > 0 ? ((canaisOrigemStats.telefone / totalVolumeEncomendas) * 100).toFixed(0) : 0}% do total
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70">
                  <div className="flex items-center gap-1.5 text-emerald-900 text-xs font-bold mb-1">
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                    <span>WhatsApp</span>
                  </div>
                  <p className="text-xl font-black text-emerald-950">{canaisOrigemStats.whatsapp}</p>
                  <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                    {totalVolumeEncomendas > 0 ? ((canaisOrigemStats.whatsapp / totalVolumeEncomendas) * 100).toFixed(0) : 0}% do total
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/70">
                  <div className="flex items-center gap-1.5 text-indigo-900 text-xs font-bold mb-1">
                    <Globe className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Site Online</span>
                  </div>
                  <p className="text-xl font-black text-indigo-950">{canaisOrigemStats.site_online}</p>
                  <p className="text-[10px] text-indigo-700 font-semibold mt-0.5">
                    {totalVolumeEncomendas > 0 ? ((canaisOrigemStats.site_online / totalVolumeEncomendas) * 100).toFixed(0) : 0}% do total
                  </p>
                </div>
              </div>
            </div>

            {/* Comparativo de Lojas & Necessidades de Produção */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Desempenho por Loja */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Store className="h-4 w-4 text-bakery-600" />
                  {t.storePerformance}
                </h3>

                <div className="space-y-3">
                  {(lojas || []).map((l) => {
                    const encsLoja = encomendasFiltradas.filter((e) => e?.loja_id === l?.id);
                    const itensLoja = encsLoja.reduce((acc, curr) => 
                      acc + (curr?.itens || []).reduce((iAcc, item) => iAcc + (Number(item?.quantidade) || 0), 0), 0
                    );
                    const pct = totalVolumeEncomendas > 0 ? (encsLoja.length / totalVolumeEncomendas) * 100 : 0;

                    return (
                      <div key={l?.id || Math.random()} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-gray-800">{l?.nome || 'Loja'}</span>
                          <span className="text-bakery-700">{encsLoja.length} enc. ({itensLoja} un.)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-bakery-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Necessidades Consolidadas de Fabrico */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-amber-600" />
                  {t.consolidatedNeeds}
                </h3>

                <div className="max-h-64 overflow-y-auto space-y-2 pr-1 text-xs">
                  {itensProducaoConsolidados.length === 0 ? (
                    <p className="text-gray-400 italic py-4 text-center">{t.noProductionItems}</p>
                  ) : (
                    itensProducaoConsolidados.map(([nome, dados]) => (
                      <div key={nome} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                        <div>
                          <span className="font-bold text-gray-900">{nome}</span>
                          <span className="text-[10px] text-gray-500 block uppercase">
                            <span className="inline-flex items-center gap-1.5">{dados.setor === 'padaria' ? <Flame className="w-3.5 h-3.5 text-amber-600" /> : <Layers className="w-3.5 h-3.5 text-purple-600" />}<span>{dados.setor === 'padaria' ? t.categoryBakery : t.categoryPastry}</span></span>
                          </span>
                        </div>
                        <span className="font-black text-sm text-bakery-800">
                          {dados.quantidade} {dados.unidade}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Secção Top Clientes e Top Artigos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Clientes */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-600" />
                  Top Clientes com Mais Encomendas
                </h3>
                {topClientes.length === 0 ? (
                  <p className="text-gray-400 italic py-4 text-center text-xs">Sem dados de clientes no período selecionado.</p>
                ) : (
                  <div className="space-y-2 text-xs">
                    {topClientes.map((c, idx) => (
                      <div key={c.telefone || idx} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="flex items-center gap-2.5">
                          <span className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-black ${
                            idx === 0 ? 'bg-amber-400 text-stone-950 shadow-2xs' : 'bg-stone-200 text-stone-700'
                          }`}>
                            #{idx + 1}
                          </span>
                          <div>
                            <p className="font-bold text-gray-900">{c.nome}</p>
                            <p className="text-[11px] text-gray-500">{c.telefone} {c.morada ? `• ${c.morada}` : ''}</p>
                          </div>
                        </div>
                        <span className="font-black text-sm text-bakery-800 bg-bakery-50 px-2 py-0.5 rounded-md border border-bakery-200">
                          {c.total} enc.
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top Artigos */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  Top Artigos Mais Pedidos
                </h3>
                {topArtigos.length === 0 ? (
                  <p className="text-gray-400 italic py-4 text-center text-xs">Sem dados de artigos no período selecionado.</p>
                ) : (
                  <div className="space-y-2 text-xs">
                    {topArtigos.map((a, idx) => (
                      <div key={a.nome} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="flex items-center gap-2.5">
                          <span className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-black ${
                            idx === 0 ? 'bg-amber-400 text-stone-950 shadow-2xs' : 'bg-stone-200 text-stone-700'
                          }`}>
                            #{idx + 1}
                          </span>
                          <div>
                            <p className="font-bold text-gray-900">{a.nome}</p>
                            <span className="text-[10px] text-gray-500 uppercase">
                              <SectorBadge setor={a.setor} />
                            </span>
                          </div>
                        </div>
                        <span className="font-black text-sm text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {a.quantidade} un.
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tabela de Detalhe Consolidado de Planeamento vs Real */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    Detalhe Consolidado de Planeamento vs Real
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Auditoria de cumprimento dos horários de agendamento e tempos reais de entrega / levantamento
                  </p>
                </div>

                {/* Filtro de Calendário para a Tabela */}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-stone-400" />
                  <span className="text-xs font-bold text-stone-600">Filtrar Data:</span>
                  <input
                    type="date"
                    value={filtroDataConsolidada}
                    onChange={(e) => setFiltroDataConsolidada(e.target.value)}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg border border-gray-300 bg-white"
                  />
                  {filtroDataConsolidada && (
                    <button
                      type="button"
                      onClick={() => setFiltroDataConsolidada('')}
                      className="text-xs text-stone-500 hover:text-stone-800 font-bold px-1.5 py-1 cursor-pointer"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider select-none">
                      <th onClick={() => handleToggleSortConsolidada('codigo')} className="py-2.5 px-3 cursor-pointer hover:bg-gray-100 transition">
                        <div className="flex items-center gap-1">
                          <span>Código</span>
                          <ArrowUpDown className="h-3 w-3 text-gray-400" />
                        </div>
                      </th>
                      <th onClick={() => handleToggleSortConsolidada('cliente')} className="py-2.5 px-3 cursor-pointer hover:bg-gray-100 transition">
                        <div className="flex items-center gap-1">
                          <span>Cliente</span>
                          <ArrowUpDown className="h-3 w-3 text-gray-400" />
                        </div>
                      </th>
                      <th onClick={() => handleToggleSortConsolidada('formato')} className="py-2.5 px-3 cursor-pointer hover:bg-gray-100 transition">
                        <div className="flex items-center gap-1">
                          <span>Formato / Destino</span>
                          <ArrowUpDown className="h-3 w-3 text-gray-400" />
                        </div>
                      </th>
                      <th onClick={() => handleToggleSortConsolidada('data_agendamento')} className="py-2.5 px-3 cursor-pointer hover:bg-gray-100 transition">
                        <div className="flex items-center gap-1">
                          <span>Data</span>
                          <ArrowUpDown className="h-3 w-3 text-gray-400" />
                        </div>
                      </th>
                      <th onClick={() => handleToggleSortConsolidada('hora_agendamento')} className="py-2.5 px-3 cursor-pointer hover:bg-gray-100 transition">
                        <div className="flex items-center gap-1">
                          <span>Hora Planeada</span>
                          <ArrowUpDown className="h-3 w-3 text-gray-400" />
                        </div>
                      </th>
                      <th onClick={() => handleToggleSortConsolidada('hora_entrega_real')} className="py-2.5 px-3 cursor-pointer hover:bg-gray-100 transition">
                        <div className="flex items-center gap-1">
                          <span>Hora Real</span>
                          <ArrowUpDown className="h-3 w-3 text-gray-400" />
                        </div>
                      </th>
                      <th onClick={() => handleToggleSortConsolidada('pontualidade')} className="py-2.5 px-3 cursor-pointer hover:bg-gray-100 transition">
                        <div className="flex items-center gap-1">
                          <span>Pontualidade / Desvio</span>
                          <ArrowUpDown className="h-3 w-3 text-gray-400" />
                        </div>
                      </th>
                      <th onClick={() => handleToggleSortConsolidada('estado')} className="py-2.5 px-3 cursor-pointer hover:bg-gray-100 transition">
                        <div className="flex items-center gap-1">
                          <span>Estado</span>
                          <ArrowUpDown className="h-3 w-3 text-gray-400" />
                        </div>
                      </th>
                    </tr>
                    {/* Linha de Filtros Em Cada Coluna */}
                    <tr className="bg-stone-50 border-b border-gray-200 text-[10px]">
                      <th className="p-1.5 font-normal">
                        <input
                          type="text"
                          placeholder="Filtrar cód..."
                          value={filtroConsolidada.codigo}
                          onChange={(e) => setFiltroConsolidada(prev => ({ ...prev, codigo: e.target.value }))}
                          className="w-full px-1.5 py-1 bg-white border border-gray-300 rounded font-normal text-xs"
                        />
                      </th>
                      <th className="p-1.5 font-normal">
                        <input
                          type="text"
                          placeholder="Nome/Tel..."
                          value={filtroConsolidada.cliente}
                          onChange={(e) => setFiltroConsolidada(prev => ({ ...prev, cliente: e.target.value }))}
                          className="w-full px-1.5 py-1 bg-white border border-gray-300 rounded font-normal text-xs"
                        />
                      </th>
                      <th className="p-1.5 font-normal">
                        <select
                          value={filtroConsolidada.formato}
                          onChange={(e) => setFiltroConsolidada(prev => ({ ...prev, formato: e.target.value }))}
                          className="w-full px-1 py-1 bg-white border border-gray-300 rounded font-normal text-xs"
                        >
                          <option value="todos">Todos</option>
                          <option value="levantamento_loja">Loja</option>
                          <option value="entrega_domicilio">Carrinha</option>
                        </select>
                      </th>
                      <th className="p-1.5 font-normal">
                        <input
                          type="date"
                          value={filtroConsolidada.data}
                          onChange={(e) => setFiltroConsolidada(prev => ({ ...prev, data: e.target.value }))}
                          className="w-full px-1 py-1 bg-white border border-gray-300 rounded font-normal text-xs"
                        />
                      </th>
                      <th className="p-1.5 font-normal">
                        <input
                          type="text"
                          placeholder="HH:MM"
                          value={filtroConsolidada.horaPlaneada}
                          onChange={(e) => setFiltroConsolidada(prev => ({ ...prev, horaPlaneada: e.target.value }))}
                          className="w-full px-1.5 py-1 bg-white border border-gray-300 rounded font-normal text-xs"
                        />
                      </th>
                      <th className="p-1.5 font-normal">
                        <input
                          type="text"
                          placeholder="HH:MM"
                          value={filtroConsolidada.horaReal}
                          onChange={(e) => setFiltroConsolidada(prev => ({ ...prev, horaReal: e.target.value }))}
                          className="w-full px-1.5 py-1 bg-white border border-gray-300 rounded font-normal text-xs"
                        />
                      </th>
                      <th className="p-1.5 font-normal">
                        <select
                          value={filtroConsolidada.pontualidade}
                          onChange={(e) => setFiltroConsolidada(prev => ({ ...prev, pontualidade: e.target.value }))}
                          className="w-full px-1 py-1 bg-white border border-gray-300 rounded font-normal text-xs"
                        >
                          <option value="todos">Todos</option>
                          <option value="no_prazo">No Prazo</option>
                          <option value="atraso">Atraso</option>
                          <option value="pendente">Por Entregar</option>
                        </select>
                      </th>
                      <th className="p-1.5 font-normal">
                        <div className="flex items-center gap-1">
                          <select
                            value={filtroConsolidada.estado}
                            onChange={(e) => setFiltroConsolidada(prev => ({ ...prev, estado: e.target.value }))}
                            className="w-full px-1 py-1 bg-white border border-gray-300 rounded font-normal text-xs"
                          >
                            <option value="todos">Todos</option>
                            <option value="pendente">Pendente</option>
                            <option value="em_producao">Em Produção</option>
                            <option value="pronto_loja">Pronto</option>
                            <option value="em_rota">Em Rota</option>
                            <option value="entregue">Entregue</option>
                            <option value="cancelado">Cancelado</option>
                          </select>
                          {(filtroConsolidada.codigo || filtroConsolidada.cliente || filtroConsolidada.formato !== 'todos' || filtroConsolidada.data || filtroConsolidada.horaPlaneada || filtroConsolidada.horaReal || filtroConsolidada.pontualidade !== 'todos' || filtroConsolidada.estado !== 'todos') && (
                            <button
                              type="button"
                              onClick={() => setFiltroConsolidada({
                                codigo: '', cliente: '', formato: 'todos', data: '', horaPlaneada: '', horaReal: '', pontualidade: 'todos', estado: 'todos'
                              })}
                              className="text-[9px] text-red-600 hover:underline font-bold px-1"
                              title="Limpar filtros"
                            ><X className="h-4 w-4" /></button>
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {encomendasTabelaConsolidada.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-gray-400 italic">
                          Nenhuma encomenda encontrada para o filtro selecionado.
                        </td>
                      </tr>
                    ) : (
                      encomendasTabelaConsolidada.map((enc) => {
                        const horaReal = enc.hora_entrega_real;
                        const desvioMin = horaReal ? calcularDesvioMinutos(enc.hora_agendamento, horaReal) : null;
                        const jaEntregue = enc.estado === 'entregue';

                        return (
                          <tr key={enc.id} className="hover:bg-gray-50 transition">
                            <td className="py-2.5 px-3">
                              <span className="font-mono font-bold text-gray-900 block">{enc.codigo}</span>
                              <div className="mt-0.5">
                                <OriginBadge origem={enc.canal_origem} compact />
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <p className="font-bold text-gray-900">{enc.cliente?.nome || 'Cliente'}</p>
                              <p className="text-[10px] text-gray-500">{enc.cliente?.telefone || '—'}</p>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                enc.tipo === 'entrega_domicilio' ? 'bg-blue-50 text-blue-800' : 'bg-amber-50 text-amber-800'
                              }`}>
                                {enc.tipo === 'entrega_domicilio' ? <Truck className="h-3 w-3 text-cyan-600 shrink-0" /> : <Store className="h-3 w-3 text-amber-600 shrink-0" />}
                                <span>{enc.tipo === 'entrega_domicilio' ? (enc.carrinha_nome || 'Carrinha') : enc.loja_nome}</span>
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-medium text-gray-700">{enc.data_agendamento}</td>
                            <td className="py-2.5 px-3 font-bold text-stone-900 font-mono">{enc.hora_agendamento}</td>
                            <td className="py-2.5 px-3 font-bold font-mono">
                              {horaReal ? (
                                <span className="text-gray-900 block">
                                  {enc.data_entrega_real ? `${enc.data_entrega_real} ` : ''}{horaReal}
                                </span>
                              ) : (
                                <span className="text-gray-400 font-normal italic">--:--</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {jaEntregue ? (
                                desvioMin !== null && desvioMin <= 10 ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                    <CheckCircle2 className="h-3 w-3" /> No Prazo ({desvioMin <= 0 ? 'Adiantado' : `+${desvioMin}m`})
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold text-[10px]">
                                    <Clock className="h-3 w-3" /> Atraso (+{desvioMin || 0}m)
                                  </span>
                                )
                              ) : (
                                <span className="text-gray-400 text-[10px] italic">Por entregar</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                jaEntregue
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : enc.estado === 'em_preparacao'
                                  ? 'bg-amber-100 text-amber-800'
                                  : enc.estado === 'pronto'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-stone-100 text-stone-700'
                              }`}>
                                {jaEntregue
                                  ? 'Entregue'
                                  : enc.estado === 'em_preparacao'
                                  ? 'Em Produção'
                                  : enc.estado === 'pronto'
                                  ? 'Em Distribuição'
                                  : 'Encomendado'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- ABA 2: LOJAS & CARRINHAS ----------------- */}
        {activeTab === 'lojas_carrinhas' && (
          <div className="space-y-6">
            {/* Secção de Lojas */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <div className="border-b pb-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Store className="h-4 w-4 text-bakery-600" />
                  {t.storesSectionTitle}
                </h3>
                <p className="text-xs text-gray-500">{t.storesSectionDesc}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {lojas.map((l) => (
                  <div key={l.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-bakery-700 bg-bakery-50 px-2 py-0.5 rounded border border-bakery-200">
                        {l.codigo}
                      </span>
                      {temPermissaoEdicaoGestao && (
                        <button
                          onClick={() => setLojaEmEdicao(l)}
                          className="flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800 bg-white px-2 py-1 rounded-lg border border-gray-200 shadow-2xs"
                        >
                          <Edit3 className="h-3 w-3" /> {t.edit}
                        </button>
                      )}
                    </div>

                    <h4 className="font-bold text-sm text-gray-900">{l.nome}</h4>
                    <p className="text-gray-600">{t.address}: {l.morada}</p>
                    <p className="text-gray-600">{t.phone}: {l.telefone}</p>
                    {l.nif && <p className="text-gray-600">{t.nif}: {l.nif}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Secção das Carrinhas da Frota */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Truck className="h-4 w-4 text-blue-600" />
                    Frota de Distribuição — Carrinhas
                  </h3>
                  <p className="text-xs text-gray-500">
                    Gestão e configuração de viaturas da frota para distribuição de encomendas.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {carrinhas.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-300">
                        {c.matricula}
                      </span>
                      {temPermissaoEdicaoGestao && (
                        <button
                          onClick={() => setCarrinhaEmEdicao(c)}
                          className="flex items-center gap-1 font-bold text-blue-700 hover:text-blue-900 bg-white px-2 py-1 rounded-lg border border-blue-200"
                        >
                          <Edit3 className="h-3 w-3" /> {t.edit}
                        </button>
                      )}
                    </div>

                    <div className="pt-1">
                      <h4 className="font-black text-sm text-gray-900">{c.identificador || c.nome}</h4>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECÇÃO 1: BASE DIÁRIA POR CARRINHA (POR DIA DA SEMANA) */}
            <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-xs space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-blue-600" />
                    Base Diária por Carrinha
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Quantidades de cada produto por carrinha para cada dia de semana (somadas ao Mapa Diário e ao Centro de Produção).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {temPermissaoEdicaoGestao && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAdicionarArtigoBaseFixa(e.target.value);
                          }
                        }}
                        className="text-xs font-bold bg-gray-50 border border-gray-300 rounded-xl px-2.5 py-2 text-gray-800"
                      >
                        <option value="">+ Escolher artigo do catálogo...</option>
                        {produtos
                          .filter((p) => !artigosGrelhaBaseFixa.includes(p.nome))
                          .map((p) => (
                            <option key={p.id} value={p.nome}>
                              {p.nome}
                            </option>
                          ))}
                      </select>

                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={novoArtigoBaseFixa}
                          onChange={(e) => setNovoArtigoBaseFixa(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAdicionarArtigoBaseFixa(novoArtigoBaseFixa);
                            }
                          }}
                          placeholder="Ou escrever novo artigo..."
                          className="text-xs font-medium bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 text-gray-800 w-44 focus:outline-hidden focus:border-blue-500"
                        />
                        {novoArtigoBaseFixa.trim() && (
                          <button
                            type="button"
                            onClick={() => handleAdicionarArtigoBaseFixa(novoArtigoBaseFixa)}
                            className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition cursor-pointer flex items-center gap-1"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Adicionar
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleExportarExcelBaseFixaConsolidado}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-900 text-xs font-bold hover:bg-blue-100 transition cursor-pointer"
                    title="Exportar Excel consolidado de todas as carrinhas para todos os dias da semana"
                  >
                    <Download className="h-3.5 w-3.5 text-blue-700" />
                    Excel Consolidado (.xlsx)
                  </button>

                  <div className="flex items-center gap-1 bg-blue-50/70 p-1 rounded-xl border border-blue-200">
                    <select
                      value={carrinhaExportacaoId}
                      onChange={(e) => setCarrinhaExportacaoId(e.target.value)}
                      className="text-xs font-bold bg-white border border-gray-300 rounded-lg px-2 py-1 text-gray-800"
                      title="Selecionar carrinha para exportar individualmente"
                    >
                      {carrinhas.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.identificador || c.nome}
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

                  {temPermissaoEdicaoGestao && (
                    <>
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
                    </>
                  )}
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

                {temPermissaoEdicaoGestao && (
                  <button
                    type="button"
                    onClick={() => handleCopiarDiaParaTodaSemanaBaseFixa(diaSemanaBaseFixa)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-300 bg-white hover:bg-blue-50 text-blue-800 text-xs font-bold transition cursor-pointer shrink-0"
                    title="Copiar quantidades deste dia para todos os outros dias da semana"
                  >
                    <Copy className="h-3.5 w-3.5 text-blue-600" />
                    Replicar {DIAS_SEMANA_NOMES.find((d) => d.id === diaSemanaBaseFixa)?.abrev} para Toda a Semana
                  </button>
                )}
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

              <div className="overflow-x-auto border border-gray-200 rounded-xl max-h-[460px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-blue-50/80 text-gray-800 border-b border-blue-200 sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3 font-black uppercase text-[11px]">Produto / Artigo (Mapa Diário)</th>
                      {carrinhas.map((c) => (
                        <th key={c.id} className="py-2.5 px-3 font-black text-center uppercase text-[11px] w-28">
                          <span className="inline-flex items-center gap-1.5">
                            <Truck className="h-3.5 w-3.5 text-cyan-600" />
                            <span>{c.identificador || c.nome}</span>
                          </span>
                        </th>
                      ))}
                      <th className="py-2.5 px-3 font-black text-right uppercase text-[11px] w-32 bg-blue-100/70">
                        Total Diário
                      </th>
                      {temPermissaoEdicaoGestao && (
                        <th className="py-2.5 px-3 font-black text-right uppercase text-[11px] w-28 bg-blue-50/90">
                          Ações
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {artigosGrelhaBaseFixa.map((prodNome) => {
                      const somaLinha = carrinhas.reduce(
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
                                    if (temPermissaoEdicaoGestao) {
                                      setArtigoBaseFixaEmEdicao(prodNome);
                                      setNovoNomeArtigoBaseFixa(prodNome);
                                    }
                                  }}
                                  className={temPermissaoEdicaoGestao ? 'cursor-pointer hover:text-blue-700 hover:underline' : ''}
                                  title={temPermissaoEdicaoGestao ? 'Clique para editar o nome do artigo' : undefined}
                                >
                                  {prodNome}
                                </span>
                                {temPermissaoEdicaoGestao && (
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
                                )}
                              </div>
                            )}
                          </td>
                          {carrinhas.map((c) => {
                            const valQtd = obterQtdBaseCarrinha(c.id, diaSemanaBaseFixa, prodNome);
                            return (
                              <td key={c.id} className="py-1.5 px-3 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  disabled={!temPermissaoEdicaoGestao}
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
                          {temPermissaoEdicaoGestao && (
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
                          )}
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
                    Clientes Empresariais (B2B)
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Quantidades fixas frequentes por dia da semana para cada cliente empresarial.
                  </p>
                </div>

                {temPermissaoEdicaoGestao && (
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
                          telefone: '',
                          morada: 'Arouca',
                          carrinha_id: 'b555db95-c427-4ed5-83fc-01403bd24cf5',
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
                )}
              </div>

              {feedbackB2B && (
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>{feedbackB2B}</span>
                </div>
              )}

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

                {temPermissaoEdicaoGestao && (
                  <button
                    type="button"
                    onClick={() => handleCopiarDiaParaTodaSemanaB2B(diaSemanaB2B)}
                    className="text-xs font-bold text-indigo-700 hover:text-indigo-950 bg-white px-3 py-1.5 rounded-xl border border-indigo-200 shadow-2xs transition cursor-pointer shrink-0"
                  >
                    Replicar este dia para Seg–Dom
                  </button>
                )}
              </div>

              {/* Tabela Interativa de Clientes Empresariais B2B */}
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-3 font-black uppercase text-[11px] w-48">Cliente Empresarial (B2B)</th>
                      <th className="py-2.5 px-3 font-black uppercase text-[11px] w-32">Rota / Carrinha</th>
                      <th className="py-2.5 px-3 font-black uppercase text-[11px]">
                        Quantidades Fixas no Dia ({diaSemanaB2B.toUpperCase()})
                      </th>
                      <th className="py-2.5 px-3 font-black uppercase text-[11px] text-right w-28">Total Dia</th>
                      <th className="py-2.5 px-3 font-black uppercase text-[11px] text-right w-28">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {clientesB2B.map((cli) => {
                      const semanaCli = cli.quantidades_semanais || cli.quantidades_semana || ({} as Record<DiaSemana, Record<string, number>>);
                      const mapaDia = semanaCli[diaSemanaB2B] || {};
                      const entries = Object.entries(mapaDia).filter(([, q]) => q > 0);
                      const totalCliDia = entries.reduce((acc, [, q]) => acc + q, 0);

                      return (
                        <tr key={cli.id} className="hover:bg-indigo-50/30 transition">
                          <td className="py-2.5 px-3">
                            <p className="font-black text-gray-900 text-xs">{cli.nome}</p>
                            <p className="text-[10px] text-gray-500">
                              {cli.morada || 'Arouca'} {cli.telefone ? `• ${cli.telefone}` : ''}
                            </p>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-900 font-black text-[10px]">
                              <span className="inline-flex items-center gap-1.5"><Truck className="h-3.5 w-3.5 text-cyan-600" /><span>5º Carro</span></span>
                            </span>
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
                                      disabled={!temPermissaoEdicaoGestao}
                                      value={qtd}
                                      onChange={(e) =>
                                        handleAlterarQtdClienteB2B(cli.id, diaSemanaB2B, prodNome, Number(e.target.value))
                                      }
                                      className="w-12 text-center bg-white border border-indigo-300 rounded font-mono font-black text-indigo-900 px-1 py-0.5 text-[11px]"
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
                            {temPermissaoEdicaoGestao && (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setClienteB2BEmEdicao(cli)}
                                  className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                                  title="Configurar artigos e quantidades do cliente empresarial"
                                >
                                  <Edit3 className="h-3 w-3" />
                                  Artigos
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
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- ABA 3: BASES DE DADOS & EXCEL ----------------- */}
        {activeTab === 'database' && (
          <div className="space-y-6">
            {/* Secção de Inserção de Registo Avulso */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Plus className="h-4 w-4 text-bakery-600" />
                    Inserir Registo na Base de Dados
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Adicione rapidamente um novo cliente ou produto de forma manual sem necessidade de carregar ficheiro Excel.
                  </p>
                </div>
                {temPermissaoEdicaoGestao && (
                  <button
                    type="button"
                    onClick={() => {
                      setSubAbaRegistoAvulso('cliente');
                      setModalRegistoAvulsoAberto(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-bakery-600 hover:bg-bakery-700 text-white text-xs font-bold shadow-xs transition cursor-pointer shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    Inserir registo
                  </button>
                )}
              </div>
            </div>

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
                                  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">Atendente</span>;
                                }
                                if (r === 'operador_padaria') {
                                  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">Chefe Padeiro</span>;
                                }
                                if (r === 'operador_pastelaria') {
                                  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-pink-100 text-pink-800 border border-pink-200">Pastelaria</span>;
                                }
                                if (r === 'motorista') {
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form onSubmit={handleSalvarConfigTalao} className="lg:col-span-7 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4 text-xs">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b pb-3">
                <Printer className="h-4 w-4 text-bakery-600" />
                {t.tabReceiptConfig}
              </h3>

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
                {temPermissaoEdicaoGestao ? (
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-bakery-600 text-white font-black shadow-xs hover:bg-bakery-700 transition"
                  >
                    {t.save}
                  </button>
                ) : (
                  <span className="text-xs font-bold text-gray-400 italic">
                    {t.levelReadOnly}
                  </span>
                )}
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

              {temPermissaoEdicaoGestao && (
                <button
                  type="button"
                  onClick={() => {
                    setPerfilEmEdicao({
                      nome: '',
                      telefone: '',
                      email: '',
                      password: '123',
                      role: 'atendente',
                      loja_id: lojas[0]?.id,
                      acesso_encomendas: 'edicao',
                      acesso_producao: 'leitura',
                      acesso_loja: 'edicao',
                      acesso_entregas: 'sem_acesso',
                      acesso_gestao: 'sem_acesso',
                      ativo: true,
                    });
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-bakery-600 text-white text-xs font-bold hover:bg-bakery-700 transition shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  {t.newUser}
                </button>
              )}
            </div>

            {/* Tabela de Utilizadores & Permissões */}
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
                      p.role === 'operador_padaria' || p.role === 'operador_pastelaria' ? t.roleBaker :
                      p.role === 'motorista' ? t.roleDriver : t.roleCounter;

                    const paineisUtilizador = [
                      { key: 'acesso_encomendas', label: t.navEncomendas, nivel: p.acesso_encomendas || (p.painel_encomendas ? 'edicao' : 'sem_acesso') },
                      { key: 'acesso_producao', label: t.navProducao, nivel: p.acesso_producao || (p.painel_producao ? 'edicao' : 'sem_acesso') },
                      { key: 'acesso_loja', label: t.navLoja, nivel: p.acesso_loja || (p.painel_loja ? 'edicao' : 'sem_acesso') },
                      { key: 'acesso_entregas', label: t.navEntregas, nivel: p.acesso_entregas || (p.painel_entregas ? 'edicao' : 'sem_acesso') },
                      { key: 'acesso_gestao', label: t.navGestao, nivel: p.acesso_gestao || (p.painel_gestao ? 'edicao' : 'sem_acesso') },
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
                          {temPermissaoEdicaoGestao ? (
                            <>
                              <button
                                onClick={() => setPerfilEmEdicao(p)}
                                className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[11px] transition"
                              >
                                {t.edit}
                              </button>
                              {p.role !== 'admin' && (
                                <button
                                  onClick={() => handleEliminarPerfil(p.id)}
                                  className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[11px] transition"
                                >
                                  <Trash2 className="h-3.5 w-3.5 inline" />
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-[11px] text-gray-400 font-semibold italic">
                              {t.levelReadOnly}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
                  <label className="block font-bold text-gray-700 mb-1">Loja Afeta</label>
                  <select
                    value={perfilEmEdicao.loja_id || 'todas'}
                    onChange={(e) => setPerfilEmEdicao({ ...perfilEmEdicao, loja_id: e.target.value === 'todas' ? undefined : e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-bold"
                  >
                    <option value="todas">{t.allStores}</option>
                    {lojas.map((l) => (
                      <option key={l.id} value={l.id}>{l.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">{t.role}</label>
                <select
                  value={perfilEmEdicao.role || 'atendente'}
                  onChange={(e) => aplicarPredefinicoesCargo(e.target.value as Role)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-bold text-gray-900"
                >
                  <option value="admin">{t.roleAdmin}</option>
                  <option value="gerente_loja">{t.roleStoreManager}</option>
                  <option value="atendente">{t.roleCounter}</option>
                  <option value="operador_padaria">{t.roleBaker} (Padaria)</option>
                  <option value="operador_pastelaria">{t.roleBaker} (Pastelaria)</option>
                  <option value="motorista">{t.roleDriver}</option>
                </select>
              </div>

              {/* Seletores Granulares de Acesso aos 5 Painéis (Sem Acesso / Leitura / Edição) */}
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2.5">
                <div className="flex items-center justify-between border-b border-gray-200 pb-1.5">
                  <span className="font-bold text-gray-900 block">{t.allowedPanels}:</span>
                  <span className="text-[10px] text-gray-500 italic">Defina se tem acesso de Leitura ou Edição</span>
                </div>

                {[
                  { key: 'acesso_encomendas', label: t.navEncomendas },
                  { key: 'acesso_producao', label: t.navProducao },
                  { key: 'acesso_loja', label: t.navLoja },
                  { key: 'acesso_entregas', label: t.navEntregas },
                  { key: 'acesso_gestao', label: `${t.navGestao} (Métricas, Lojas, Frota e Acessos)` },
                ].map((item) => {
                  const val = (perfilEmEdicao as any)?.[item.key] ?? (perfilEmEdicao as any)?.[item.key.replace('acesso_', 'painel_')];
                  const nivelAtual: NivelAcesso = (val === 'sem_acesso' || val === 'leitura' || val === 'edicao') ? val : 'sem_acesso';

                  return (
                    <div key={item.key} className="p-2 rounded-xl bg-white border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="font-bold text-gray-800">{item.label}</span>

                      <div className="flex bg-gray-100 p-0.5 rounded-lg text-[10px] font-bold shrink-0">
                        <button
                          type="button"
                          onClick={() => setPerfilEmEdicao({ ...perfilEmEdicao, [item.key]: 'sem_acesso' })}
                          className={`px-2 py-1 rounded-md transition ${
                            nivelAtual === 'sem_acesso'
                              ? 'bg-red-600 text-white shadow-2xs font-black'
                              : 'text-gray-500 hover:text-gray-900'
                          }`}
                        >
                          <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-red-600" /><span>{t.levelNoAccess}</span></span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPerfilEmEdicao({ ...perfilEmEdicao, [item.key]: 'leitura' })}
                          className={`px-2 py-1 rounded-md transition ${
                            nivelAtual === 'leitura'
                              ? 'bg-blue-600 text-white shadow-2xs font-black'
                              : 'text-gray-500 hover:text-gray-900'
                          }`}
                        >
                          <span className="inline-flex items-center gap-1.5"><Eye className="h-3.5 w-3.5 text-blue-600" /><span>{t.levelReadOnly}</span></span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPerfilEmEdicao({ ...perfilEmEdicao, [item.key]: 'edicao' })}
                          className={`px-2 py-1 rounded-md transition ${
                            nivelAtual === 'edicao'
                              ? 'bg-emerald-600 text-white shadow-2xs font-black'
                              : 'text-gray-500 hover:text-gray-900'
                          }`}
                        >
                          <span className="inline-flex items-center gap-1.5"><Edit3 className="h-3.5 w-3.5 text-emerald-600" /><span>{t.levelFullEdit}</span></span>
                        </button>
                      </div>
                    </div>
                  );
                })}
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

      {/* MODAL DE EDIÇÃO DE CARRINHA */}
      {carrinhaEmEdicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-200 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-gray-900 border-b pb-2">{t.vansSectionTitle}</h3>
            <form onSubmit={handleSalvarCarrinha} className="space-y-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">{t.vanName}</label>
                <input
                  type="text"
                  required
                  value={carrinhaEmEdicao.identificador || ''}
                  onChange={(e) => setCarrinhaEmEdicao({ ...carrinhaEmEdicao, identificador: e.target.value })}
                  placeholder="Carrinha 1 - Matriz"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">{t.licensePlate}</label>
                <input
                  type="text"
                  required
                  value={carrinhaEmEdicao.matricula || ''}
                  onChange={(e) => setCarrinhaEmEdicao({ ...carrinhaEmEdicao, matricula: e.target.value })}
                  placeholder="42-AB-89"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                />
              </div>



              <div className="flex items-center justify-between pt-2 border-t">
                {carrinhaEmEdicao.id ? (
                  <button
                    type="button"
                    onClick={() => handleEliminarCarrinha(carrinhaEmEdicao.id!)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs transition cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar Carrinha
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
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
                    <label className="block font-bold text-gray-700 mb-1">Código Postal</label>
                    <input
                      type="text"
                      value={novoCliente.codigo_postal}
                      onChange={(e) => setNovoCliente({ ...novoCliente, codigo_postal: e.target.value })}
                      placeholder="4540-102"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                    />
                  </div>
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

      {/* MODAL DE EDIÇÃO / CRIAÇÃO DE CLIENTE EMPRESARIAL B2B (5º CARRO) */}
      {clienteB2BEmEdicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-indigo-200 space-y-4 text-xs max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-indigo-600" />
                  Configurar Cliente Empresarial B2B (5º Carro)
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Defina os dados da entidade e as quantidades fixas diárias de cada artigo para o Mapa Diário.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setClienteB2BEmEdicao(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold cursor-pointer"
              ><X className="h-4 w-4" /></button>
            </div>

            <form onSubmit={handleSalvarClienteB2BModal} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nome da Entidade / Cliente *</label>
                  <input
                    type="text"
                    required
                    value={clienteB2BEmEdicao.nome}
                    onChange={(e) => setClienteB2BEmEdicao({ ...clienteB2BEmEdicao, nome: e.target.value })}
                    placeholder="Ex: Hospital de Arouca"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 font-bold focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Telefone</label>
                  <input
                    type="text"
                    value={clienteB2BEmEdicao.telefone || ''}
                    onChange={(e) => setClienteB2BEmEdicao({ ...clienteB2BEmEdicao, telefone: e.target.value })}
                    placeholder="256 xxx xxx"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Localidade / Morada</label>
                  <input
                    type="text"
                    value={clienteB2BEmEdicao.morada || ''}
                    onChange={(e) => setClienteB2BEmEdicao({ ...clienteB2BEmEdicao, morada: e.target.value })}
                    placeholder="Arouca"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Abas de Dia da Semana dentro do Modal */}
              <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
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
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold text-[10px] hover:bg-indigo-700 transition cursor-pointer"
                  >
                    Aplicar estas quantidades a Todos os Dias (Seg–Dom)
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

              {/* Grelha dos 29 Artigos do Mapa Diário */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto p-1">
                {COLUNAS_MAPA_DIARIO_OFICIAL.map((prodNome) => {
                  const semanaModal = clienteB2BEmEdicao.quantidades_semanais || clienteB2BEmEdicao.quantidades_semana || ({} as Record<DiaSemana, Record<string, number>>);
                  const qtdAtual = semanaModal[diaSemanaB2B]?.[prodNome] || 0;
                  return (
                    <div
                      key={prodNome}
                      className={`flex items-center justify-between p-2 rounded-xl border ${
                        qtdAtual > 0 ? 'bg-indigo-50 border-indigo-300' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <span className="font-bold text-gray-800 truncate pr-2" title={prodNome}>
                        {prodNome}
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={qtdAtual === 0 ? '' : qtdAtual}
                        placeholder="0"
                        onChange={(e) => {
                          const val = Math.max(0, Math.floor(Number(e.target.value) || 0));
                          const mapaDia = { ...(semanaModal[diaSemanaB2B] || {}) };
                          if (val <= 0) {
                            delete mapaDia[prodNome];
                          } else {
                            mapaDia[prodNome] = val;
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
                        }}
                        className="w-16 text-center py-1 px-1.5 rounded-lg border border-gray-300 bg-white font-mono font-black text-indigo-950"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
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
            </form>
          </div>
        </div>
      )}

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
