'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  TinaConfiguracaoGeral, 
  TinaLojaItem, 
  TinaProdutoItem, 
  TinaBlocoLayout, 
  obterConfiguracaoMarca, 
  obterLojasTina, 
  obterProdutosMontra, 
  obterLayoutBlocos 
} from '../../lib/tinaContent';
import { 
  Store, 
  ShoppingBag, 
  ChefHat, 
  Truck, 
  BarChart3, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Printer, 
  CheckCircle2, 
  Clock, 
  Users, 
  Edit3, 
  ArrowRightLeft, 
  Calendar, 
  Phone, 
  MapPin, 
  X, 
  Eye, 
  MessageSquare, 
  Copy, 
  FileText, 
  GripVertical, 
  Sparkles, 
  Lock, 
  Unlock, 
  RefreshCw, 
  Key, 
  Send, 
  AlertCircle, 
  Check, 
  ExternalLink,
  Layers,
  Save,
  Upload,
  Flame,
  Inbox,
  Filter,
  TrendingUp,
  DollarSign,
  Columns,
  Globe
} from 'lucide-react';

const CMS_STORAGE_KEY_TOKEN = 'app_padaria_cms_github_token';
const CMS_STORAGE_KEY_AUTH = 'app_padaria_cms_auth_unlocked';
const DEFAULT_PASSKEY = 'padaria2026';

type PainelCms = 'encomendas' | 'producao' | 'loja' | 'entregas' | 'gestao';

interface ItemCarrinhoSimulado {
  id: string;
  produtoId: string;
  nome: string;
  categoria: string;
  quantidade: number;
  emoji: string;
  preco: number;
  notas: string;
}

interface EncomendaSimulada {
  id: string;
  codigo: string;
  cliente_nome: string;
  cliente_telefone: string;
  cliente_morada: string;
  tipo: 'levantamento_loja' | 'entrega_domicilio';
  canal_origem?: 'presencial' | 'telefone' | 'whatsapp' | 'site_online';
  loja_id: string;
  loja_nome: string;
  carrinha_id?: string;
  data_agendamento: string;
  hora_agendamento: string;
  estado: 'pendente' | 'em_producao' | 'pronto_loja' | 'em_rota' | 'entregue';
  total: number;
  itens: Array<{
    id: string;
    nome: string;
    quantidade: number;
    emoji: string;
    setor: 'padaria' | 'pastelaria';
    concluido?: boolean;
  }>;
  observacoes: string;
}

const ENCOMENDAS_DEMO_INICIAIS: EncomendaSimulada[] = [
  {
    id: 'enc-101',
    codigo: 'ENC-2026-101',
    cliente_nome: 'Manuel Silva',
    cliente_telefone: '912 345 678',
    cliente_morada: 'Rua Central de Arouca, nº 12',
    tipo: 'levantamento_loja',
    loja_id: 'loja-1',
    loja_nome: 'Padaria Central (Praça Brandão de Vasconcelos)',
    data_agendamento: new Date().toISOString().split('T')[0],
    hora_agendamento: '08:30',
    estado: 'pendente',
    total: 14.90,
    itens: [
      { id: 'it-1', nome: 'Pão de Arouca', quantidade: 2, emoji: '🥖', setor: 'padaria', concluido: false },
      { id: 'it-2', nome: 'Pão de Ló de Arouca', quantidade: 1, emoji: '🎂', setor: 'pastelaria', concluido: false },
    ],
    observacoes: 'Pão fatiado fino e embalagem de oferta para o pão de ló.',
  },
  {
    id: 'enc-102',
    codigo: 'ENC-2026-102',
    cliente_nome: 'D. Maria Teresa Rocha',
    cliente_telefone: '965 432 109',
    cliente_morada: 'Avenida 25 de Abril, Bloco B, 2º Esq',
    tipo: 'levantamento_loja',
    loja_id: 'loja-2',
    loja_nome: 'Loja 25 de Abril',
    data_agendamento: new Date().toISOString().split('T')[0],
    hora_agendamento: '10:00',
    estado: 'em_producao',
    total: 21.00,
    itens: [
      { id: 'it-3', nome: 'Broa de Milho Tradicional', quantidade: 2, emoji: '🍞', setor: 'padaria', concluido: true },
      { id: 'it-4', nome: 'Castanhas Doces de Arouca', quantidade: 6, emoji: '🧁', setor: 'pastelaria', concluido: false },
    ],
    observacoes: 'Cliente prefere broa bem estaladiça.',
  },
  {
    id: 'enc-103',
    codigo: 'ENC-2026-103',
    cliente_nome: 'Café & Snack Central',
    cliente_telefone: '918 765 432',
    cliente_morada: 'Largo da Feira, nº 45, Arouca',
    tipo: 'entrega_domicilio',
    loja_id: 'loja-1',
    loja_nome: 'Padaria Central',
    carrinha_id: 'carrinha-1',
    data_agendamento: new Date().toISOString().split('T')[0],
    hora_agendamento: '07:30',
    estado: 'pronto_loja',
    total: 48.60,
    itens: [
      { id: 'it-5', nome: 'Pão de Arouca', quantidade: 25, emoji: '🥖', setor: 'padaria', concluido: true },
      { id: 'it-6', nome: 'Croissant Simples', quantidade: 15, emoji: '🥐', setor: 'pastelaria', concluido: true },
    ],
    observacoes: 'Entrega na porta das traseiras do café antes das 08h00.',
  },
  {
    id: 'enc-104',
    codigo: 'ENC-2026-104',
    cliente_nome: 'Restaurante O Pedrógão',
    cliente_telefone: '933 221 100',
    cliente_morada: 'Zona Industrial da Farrapa, Lote 4',
    tipo: 'entrega_domicilio',
    loja_id: 'loja-3',
    loja_nome: 'Unidade Central de Fabrico & Sede',
    carrinha_id: 'carrinha-2',
    data_agendamento: new Date().toISOString().split('T')[0],
    hora_agendamento: '11:15',
    estado: 'pendente',
    total: 36.50,
    itens: [
      { id: 'it-7', nome: 'Broa de Milho Tradicional', quantidade: 8, emoji: '🍞', setor: 'padaria', concluido: false },
      { id: 'it-8', nome: 'Pão de Centeio Rústico', quantidade: 10, emoji: '🥖', setor: 'padaria', concluido: false },
    ],
    observacoes: 'Fatura com NIF 509876543.',
  }
];

export default function CmsFrontofficeReplicaPage() {
  // Estado de montagem (evita mismatch de SSR e hidratação)
  const [montado, setMontado] = useState(false);

  // Autenticação / Chave Mestra
  const [desbloqueado, setDesbloqueado] = useState(false);
  const [passkeyInput, setPasskeyInput] = useState('');
  const [erroPasskey, setErroPasskey] = useState(false);

  // Modo de Operação do CMS: 'edicao' (com controlos) ou 'preview' (réplica 100% limpa)
  const [modoCms, setModoCms] = useState<'edicao' | 'preview'>('edicao');

  // Painel Ativo no CMS (Navegação completa entre os 5 painéis da aplicação)
  const [painelAtivoCms, setPainelAtivoCms] = useState<PainelCms>('encomendas');

  // Estados de Dados do CMS (Fontes de Verdade sincronizadas com Git)
  const [config, setConfig] = useState<TinaConfiguracaoGeral>(obterConfiguracaoMarca());
  const [lojas, setLojas] = useState<TinaLojaItem[]>(obterLojasTina());
  const [produtos, setProdutos] = useState<TinaProdutoItem[]>(obterProdutosMontra());
  const [layout, setLayout] = useState<TinaBlocoLayout[]>(obterLayoutBlocos());
  const [encomendasDemo, setEncomendasDemo] = useState<EncomendaSimulada[]>(ENCOMENDAS_DEMO_INICIAIS);

  // Rastreio de Edições Não Publicadas
  const [alteracoesPendentes, setAlteracoesPendentes] = useState(0);

  // Estados Interativos Comuns e do Balcão de Encomendas
  const [selectedLojaId, setSelectedLojaId] = useState<string>('todas');
  const [activeTab, setActiveTab] = useState<'novo' | 'clientes' | 'historico'>('novo');
  const [categoriaAtiva, setCategoriaAtiva] = useState<'todas' | 'padaria' | 'pastelaria'>('todas');
  const [buscaProduto, setBuscaProduto] = useState('');
  const [tipoEntrega, setTipoEntrega] = useState<'levantamento_loja' | 'entrega_domicilio'>('levantamento_loja');
  const [lojaPedidoId, setLojaPedidoId] = useState<string>(lojas[0]?.id || 'loja-1');
  
  // Carrinho Interativo de Demonstração
  const [carrinho, setCarrinho] = useState<ItemCarrinhoSimulado[]>([
    {
      id: 'item-demo-1',
      produtoId: 'prod-1',
      nome: 'Pão de Arouca',
      categoria: 'padaria',
      quantidade: 2,
      emoji: '🥖',
      preco: 1.20,
      notas: 'Bem cozido',
    },
    {
      id: 'item-demo-2',
      produtoId: 'prod-2',
      nome: 'Pão de Ló de Arouca',
      categoria: 'pastelaria',
      quantidade: 1,
      emoji: '🎂',
      preco: 12.50,
      notas: 'Embalagem de oferta',
    }
  ]);
  const [telefoneCliente, setTelefoneCliente] = useState('912 345 678');
  const [nomeCliente, setNomeCliente] = useState('Manuel Silva');
  const [moradaCliente, setMoradaCliente] = useState('Rua Central de Arouca, nº 12');
  const [dataAgendamento, setDataAgendamento] = useState(new Date().toISOString().split('T')[0]);
  const [horaAgendamento, setHoraAgendamento] = useState('10:30');
  const [canalOrigem, setCanalOrigem] = useState<'presencial' | 'telefone' | 'whatsapp' | 'site_online'>('presencial');
  const [notasGerais, setNotasGerais] = useState('');

  // Drag & Drop de Produtos na Grelha
  const [draggedProdIndex, setDraggedProdIndex] = useState<number | null>(null);

  // Estados dos Painéis Interativos
  const [setorProducao, setSetorProducao] = useState<'todos' | 'padaria' | 'pastelaria'>('todos');
  const [visualizacaoProducao, setVisualizacaoProducao] = useState<'kanban' | 'hierarquica'>('kanban');
  const [filtroBalcao, setFiltroBalcao] = useState<'pendentes' | 'concluidos' | 'todos'>('pendentes');
  const [carrinhaAtiva, setCarrinhaAtiva] = useState<'carrinha-1' | 'carrinha-2'>('carrinha-1');
  const [abaGestao, setAbaGestao] = useState<'metricas' | 'lojas' | 'catalogo' | 'auditoria'>('metricas');

  // Modais de Edição In-Place
  const [modalProdutoAberto, setModalProdutoAberto] = useState(false);
  const [produtoEmEdicao, setProdutoEmEdicao] = useState<TinaProdutoItem | null>(null);
  const [indiceProdutoEmEdicao, setIndiceProdutoEmEdicao] = useState<number | null>(null);

  // Modal Centralizado e Tabulado de Conteúdos de TODOS os Painéis
  const [modalTextosAberto, setModalTextosAberto] = useState(false);
  const [abaModalTextos, setAbaModalTextos] = useState<PainelCms | 'marca'>('marca');

  // Modal de Edição de Encomenda (com seleção da Loja de Levantamento)
  const [modalEditarEncomendaAberto, setModalEditarEncomendaAberto] = useState(false);
  const [encomendaEmEdicao, setEncomendaEmEdicao] = useState<EncomendaSimulada | null>(null);

  const [modalLojasAberto, setModalLojasAberto] = useState(false);
  const [lojaEmEdicao, setLojaEmEdicao] = useState<TinaLojaItem | null>(null);

  // Modal de Publicação / Commit GitHub & Vercel
  const [modalPublicarAberto, setModalPublicarAberto] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [lembrarToken, setLembrarToken] = useState(true);
  const [mensagemCommit, setMensagemCommit] = useState('');
  const [publicando, setPublicando] = useState(false);
  const [resultadoPublicacao, setResultadoPublicacao] = useState<{
    sucesso: boolean;
    mensagem: string;
    commitSha?: string;
    commitUrl?: string;
  } | null>(null);

  // Inicialização no Navegador
  useEffect(() => {
    setMontado(true);
    if (typeof window !== 'undefined') {
      const isAuth = sessionStorage.getItem(CMS_STORAGE_KEY_AUTH);
      if (isAuth === 'true') {
        setDesbloqueado(true);
      }
      const savedToken = localStorage.getItem(CMS_STORAGE_KEY_TOKEN);
      if (savedToken) {
        setGithubToken(savedToken);
      }
    }
  }, []);

  const handleDesbloquear = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      passkeyInput.trim() === DEFAULT_PASSKEY || 
      passkeyInput.trim() === 'admin' || 
      passkeyInput.trim() === '1234'
    ) {
      setDesbloqueado(true);
      setErroPasskey(false);
      sessionStorage.setItem(CMS_STORAGE_KEY_AUTH, 'true');
    } else {
      setErroPasskey(true);
    }
  };

  const marcarAlteracao = () => {
    setAlteracoesPendentes((prev) => prev + 1);
  };

  const abrirEditorTextosParaPainel = (painel: PainelCms | 'marca') => {
    setAbaModalTextos(painel);
    setModalTextosAberto(true);
  };

  // ------------------ OPERAÇÕES DO CARRINHO INTERATIVO ------------------
  const handleAdicionarAoCarrinho = (prod: TinaProdutoItem) => {
    setCarrinho((prev) => {
      const existe = prev.find((item) => item.produtoId === prod.id || item.nome === prod.nome);
      if (existe) {
        return prev.map((item) =>
          item.id === existe.id ? { ...item, quantidade: item.quantidade + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: `item-${Date.now()}`,
          produtoId: prod.id || `prod-${Date.now()}`,
          nome: prod.nome,
          categoria: prod.categoria,
          quantidade: 1,
          emoji: prod.emoji || (prod.categoria === 'padaria' ? '🥖' : '🎂'),
          preco: prod.preco || 0,
          notas: '',
        },
      ];
    });
  };

  const alterarQtdCarrinho = (id: string, delta: number) => {
    setCarrinho((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, quantidade: Math.max(1, item.quantidade + delta) } : item))
        .filter((item) => item.quantidade > 0)
    );
  };

  const removerDoCarrinho = (id: string) => {
    setCarrinho((prev) => prev.filter((item) => item.id !== id));
  };

  // ------------------ REORDENAÇÃO DRAG & DROP DE PRODUTOS ------------------
  const handleDragStartProduto = (index: number) => {
    if (modoCms !== 'edicao') return;
    setDraggedProdIndex(index);
  };

  const handleDragOverProduto = (e: React.DragEvent) => {
    if (modoCms !== 'edicao') return;
    e.preventDefault();
  };

  const handleDropProduto = (targetIndex: number) => {
    if (modoCms !== 'edicao' || draggedProdIndex === null || draggedProdIndex === targetIndex) return;
    const novos = [...produtos];
    const [movido] = novos.splice(draggedProdIndex, 1);
    novos.splice(targetIndex, 0, movido);
    setProdutos(novos);
    setDraggedProdIndex(null);
    marcarAlteracao();
  };

  // ------------------ GESTÃO DE PRODUTOS (ADICIONAR / EDITAR / ELIMINAR) ------------------
  const abrirModalNovoProduto = () => {
    setProdutoEmEdicao({
      id: `prod-${Date.now()}`,
      nome: '',
      categoria: 'padaria',
      preco: 1.00,
      unidade: 'unidade',
      tempo_preparo_minutos: 60,
      emoji: '🥖',
      ativo: true,
    });
    setIndiceProdutoEmEdicao(null);
    setModalProdutoAberto(true);
  };

  const abrirModalEditarProduto = (prod: TinaProdutoItem, index: number) => {
    setProdutoEmEdicao({ ...prod });
    setIndiceProdutoEmEdicao(index);
    setModalProdutoAberto(true);
  };

  const salvarProduto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoEmEdicao || !produtoEmEdicao.nome.trim()) return;

    if (indiceProdutoEmEdicao !== null) {
      const novos = [...produtos];
      novos[indiceProdutoEmEdicao] = produtoEmEdicao;
      setProdutos(novos);
    } else {
      setProdutos([produtoEmEdicao, ...produtos]);
    }
    setModalProdutoAberto(false);
    marcarAlteracao();
  };

  const eliminarProduto = (index: number) => {
    const nome = produtos[index]?.nome || 'o artigo';
    if (window.confirm(`Tem a certeza de que deseja remover "${nome}" do catálogo?`)) {
      const novos = [...produtos];
      novos.splice(index, 1);
      setProdutos(novos);
      marcarAlteracao();
    }
  };

  // ------------------ GESTÃO DE ENCOMENDAS DEMO (EDITAR LOJA DE LEVANTAMENTO) ------------------
  const abrirEditarEncomenda = (enc: EncomendaSimulada) => {
    setEncomendaEmEdicao({ ...enc });
    setModalEditarEncomendaAberto(true);
  };

  const salvarEdicaoEncomenda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!encomendaEmEdicao) return;

    setEncomendasDemo((prev) =>
      prev.map((item) => (item.id === encomendaEmEdicao.id ? encomendaEmEdicao : item))
    );
    setModalEditarEncomendaAberto(false);
    marcarAlteracao();
  };

  // ------------------ GRAVAÇÃO DE COMMIT GITHUB / VERCEL ------------------
  const abrirModalPublicar = () => {
    setResultadoPublicacao(null);
    if (!mensagemCommit) {
      setMensagemCommit(`cms: atualização dos 5 painéis e catálogo (${new Date().toLocaleDateString('pt-PT')})`);
    }
    setModalPublicarAberto(true);
  };

  const executarPublicacao = async () => {
    setPublicando(true);
    setResultadoPublicacao(null);

    if (lembrarToken && githubToken.trim()) {
      localStorage.setItem(CMS_STORAGE_KEY_TOKEN, githubToken.trim());
    }

    try {
      const res = await fetch('/api/cms/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          lojas,
          produtos,
          layout,
          commitMessage: mensagemCommit,
          githubToken: githubToken.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setResultadoPublicacao({
          sucesso: false,
          mensagem: data.error || data.details || 'Ocorreu um erro ao gravar o commit no GitHub.',
        });
      } else {
        setResultadoPublicacao({
          sucesso: true,
          mensagem: data.message || 'Alterações gravadas com sucesso no GitHub! O deploy da Vercel foi acionado.',
          commitSha: data.commitSha,
          commitUrl: data.commitUrl,
        });
        setAlteracoesPendentes(0);
      }
    } catch (err: any) {
      setResultadoPublicacao({
        sucesso: false,
        mensagem: err.message || 'Falha na ligação à API do servidor.',
      });
    } finally {
      setPublicando(false);
    }
  };

  // Filtro de Produtos para Exibição na Grelha
  const produtosFiltrados = produtos.filter((p) => {
    const matchCat = categoriaAtiva === 'todas' || p.categoria === categoriaAtiva;
    const matchBusca = p.nome.toLowerCase().includes(buscaProduto.toLowerCase());
    return matchCat && matchBusca;
  });

  // Prevenir desfasamentos de renderização entre SSR e Cliente
  if (!montado) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center text-2xl font-black animate-bounce shadow-lg">
            🥖
          </div>
          <p className="text-xs font-semibold text-stone-600">A carregar Studio CMS • Editor de Todos os Painéis...</p>
        </div>
      </div>
    );
  }

  // ------------------ TELA DE BLOQUEIO / PIN DE SEGURANÇA ------------------
  if (!desbloqueado) {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-white border border-stone-200 rounded-3xl p-8 shadow-xl space-y-6 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500 text-stone-950 text-3xl font-black shadow-md">
            🥖
          </div>
          <div>
            <h1 className="text-xl font-black text-stone-900 tracking-tight">Studio CMS • Editor Frontoffice</h1>
            <p className="text-xs text-stone-500 mt-1">
              Área restrita de edição visual de todos os painéis da aplicação (acesso com chave mestra).
            </p>
          </div>

          <form onSubmit={handleDesbloquear} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                Palavra-passe Mestra
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={passkeyInput}
                  onChange={(e) => {
                    setPasskeyInput(e.target.value);
                    setErroPasskey(false);
                  }}
                  placeholder="Insira a chave mestre (ex: padaria2026)"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                  autoFocus
                />
                <Key className="absolute right-3.5 top-3.5 h-4 w-4 text-stone-400" />
              </div>
              {erroPasskey && (
                <p className="text-xs font-medium text-red-600 mt-2 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  Chave mestra incorreta. Tente novamente.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Unlock className="h-4 w-4" />
              Desbloquear Edição CMS
            </button>
          </form>

          <div className="pt-4 border-t border-stone-200">
            <Link
              href="/encomendas"
              className="text-xs text-stone-500 hover:text-stone-800 font-bold transition flex items-center justify-center gap-1"
            >
              Voltar ao Balcão Operacional
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/70 relative">
      {/* ========================================================================= */}
      {/* 1. BARRA SUPERIOR STUDIO CMS (CONTROLOS DE EDIÇÃO, PAINEL & DEPLOY)        */}
      {/* ========================================================================= */}
      <div className="sticky top-0 z-50 bg-stone-950 text-white border-b border-stone-800 shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3">
          {/* Identidade CMS & Seletor Rápido de Painel */}
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-stone-950 text-sm font-black shadow-xs">
                🥖
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-black text-amber-400 tracking-tight">Studio CMS</span>
                  <span className="hidden sm:inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-800 text-stone-300">
                    Editor de Todos os Painéis
                  </span>
                </div>
              </div>
            </div>

            {/* Abas Rápidas de Seleção de Painel no Topo */}
            <div className="hidden lg:flex items-center gap-1 bg-stone-900/90 p-1 rounded-xl border border-stone-800">
              <button
                type="button"
                onClick={() => setPainelAtivoCms('encomendas')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  painelAtivoCms === 'encomendas'
                    ? 'bg-amber-600 text-white'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <ShoppingBag className="h-3 w-3" />
                <span>Encomendas</span>
              </button>
              <button
                type="button"
                onClick={() => setPainelAtivoCms('producao')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  painelAtivoCms === 'producao'
                    ? 'bg-amber-600 text-white'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <ChefHat className="h-3 w-3" />
                <span>Produção</span>
              </button>
              <button
                type="button"
                onClick={() => setPainelAtivoCms('loja')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  painelAtivoCms === 'loja'
                    ? 'bg-amber-600 text-white'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <Store className="h-3 w-3" />
                <span>Balcão</span>
              </button>
              <button
                type="button"
                onClick={() => setPainelAtivoCms('entregas')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  painelAtivoCms === 'entregas'
                    ? 'bg-amber-600 text-white'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <Truck className="h-3 w-3" />
                <span>Entregas</span>
              </button>
              <button
                type="button"
                onClick={() => setPainelAtivoCms('gestao')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  painelAtivoCms === 'gestao'
                    ? 'bg-amber-600 text-white'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <BarChart3 className="h-3 w-3" />
                <span>Gestão</span>
              </button>
            </div>
          </div>

          {/* Controlos de Modo, Edição dos Textos e Gravar & Deploy */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Seletor de Modo: Edição vs Pré-visualização Real */}
            <div className="flex bg-stone-900 p-0.5 rounded-xl border border-stone-800">
              <button
                type="button"
                onClick={() => setModoCms('edicao')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  modoCms === 'edicao'
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Modo Edição</span>
              </button>
              <button
                type="button"
                onClick={() => setModoCms('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  modoCms === 'preview'
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Pré-visualização</span>
              </button>
            </div>

            {/* Botão de Edição Global de Textos dos Painéis */}
            {modoCms === 'edicao' && (
              <button
                type="button"
                onClick={() => abrirEditorTextosParaPainel(painelAtivoCms)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-bold border border-amber-500/30 transition cursor-pointer"
                title="Editar Títulos, Subtítulos e Avisos de Todos os Painéis"
              >
                <Edit3 className="h-3.5 w-3.5 text-amber-400" />
                <span>Editar Textos do Painel</span>
              </button>
            )}

            {/* Contador de alterações */}
            {alteracoesPendentes > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-950/60 border border-amber-800/80 px-2 py-1 rounded-lg">
                <Sparkles className="h-3 w-3 animate-spin" />
                {alteracoesPendentes} alteraç{alteracoesPendentes === 1 ? 'ão' : 'ões'}
              </span>
            )}

            {/* Botão de Gravar & Deploy */}
            <button
              type="button"
              onClick={abrirModalPublicar}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 text-xs font-black shadow-md transition transform active:scale-95 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Gravar & Deploy Vercel</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. NAVBAR EXATA DO FRONTOFFICE (SEM SELETOR NO CABEÇALHO, TABS ATIVAS)     */}
      {/* ========================================================================= */}
      <header className={`sticky top-[49px] z-40 w-full border-b border-amber-200 bg-white/95 backdrop-blur shadow-xs ${
        modoCms === 'edicao' ? 'ring-2 ring-amber-400/40' : ''
      }`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-6">
          {/* Identidade da Marca (Sem seletor de loja no cabeçalho geral) */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-2 relative group">
              <img
                src="/logo-padaria.jpg"
                alt={config.nomeEmpresa}
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl object-cover shadow-xs border border-amber-200 shrink-0"
              />
              <span className="text-xs sm:text-sm font-black text-gray-900 tracking-tight whitespace-nowrap">
                {config.nomeEmpresa}
              </span>

              {/* Botão de Edição da Marca no Modo Edição */}
              {modoCms === 'edicao' && (
                <button
                  type="button"
                  onClick={() => abrirEditorTextosParaPainel('marca')}
                  className="ml-1 p-1 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition shadow-2xs"
                  title="Editar Nome, Slogan e Informações da Marca"
                >
                  <Edit3 className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Menu de Navegação Exato da App (Clicável para Alternar e Editar Qualquer Painel) */}
          <nav className="flex items-center gap-1 sm:gap-1.5 flex-nowrap overflow-x-auto">
            <button
              type="button"
              onClick={() => setPainelAtivoCms('encomendas')}
              className={`flex items-center gap-1 sm:gap-1.5 rounded-xl px-2 sm:px-2.5 py-1.5 text-xs font-bold transition shrink-0 cursor-pointer ${
                painelAtivoCms === 'encomendas'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-amber-50 hover:text-gray-900'
              }`}
            >
              <ShoppingBag className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Encomendas</span>
            </button>

            <button
              type="button"
              onClick={() => setPainelAtivoCms('producao')}
              className={`flex items-center gap-1 sm:gap-1.5 rounded-xl px-2 sm:px-2.5 py-1.5 text-xs font-bold transition shrink-0 cursor-pointer ${
                painelAtivoCms === 'producao'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-amber-50 hover:text-gray-900'
              }`}
            >
              <ChefHat className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Produção</span>
            </button>

            <button
              type="button"
              onClick={() => setPainelAtivoCms('loja')}
              className={`flex items-center gap-1 sm:gap-1.5 rounded-xl px-2 sm:px-2.5 py-1.5 text-xs font-bold transition shrink-0 cursor-pointer ${
                painelAtivoCms === 'loja'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-amber-50 hover:text-gray-900'
              }`}
            >
              <Store className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Balcão</span>
            </button>

            <button
              type="button"
              onClick={() => setPainelAtivoCms('entregas')}
              className={`flex items-center gap-1 sm:gap-1.5 rounded-xl px-2 sm:px-2.5 py-1.5 text-xs font-bold transition shrink-0 cursor-pointer ${
                painelAtivoCms === 'entregas'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-amber-50 hover:text-gray-900'
              }`}
            >
              <Truck className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Entregas</span>
            </button>

            <button
              type="button"
              onClick={() => setPainelAtivoCms('gestao')}
              className={`flex items-center gap-1 sm:gap-1.5 rounded-xl px-2 sm:px-2.5 py-1.5 text-xs font-bold transition shrink-0 cursor-pointer ${
                painelAtivoCms === 'gestao'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-amber-50 hover:text-gray-900'
              }`}
            >
              <BarChart3 className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Gestão</span>
            </button>
          </nav>

          {/* Área do Utilizador Demonstrativo */}
          <div className="flex items-center gap-1.5 sm:gap-2 pl-1 sm:pl-2 border-l border-gray-200 shrink-0">
            <div className="hidden lg:block text-right">
              <span className="text-xs font-bold text-gray-900 block leading-tight truncate max-w-[110px]">
                Marta Santos
              </span>
              <span className="text-[10px] text-gray-500 font-semibold block capitalize leading-tight">
                Atendente Balcão
              </span>
            </div>
            <div className="h-8 w-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-xs font-black text-amber-900">
              MS
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 3. BANNER DE AVISO SUPERIOR (SE ATIVADO)                                  */}
      {/* ========================================================================= */}
      {config.bannerAvisoAtivo && (
        <div className="bg-amber-500 text-stone-950 font-black text-xs py-2 px-4 shadow-xs relative">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <span className="truncate">{config.bannerAvisoTexto}</span>
            {modoCms === 'edicao' && (
              <button
                type="button"
                onClick={() => abrirEditorTextosParaPainel('marca')}
                className="px-2 py-0.5 bg-stone-950/20 hover:bg-stone-950/40 rounded text-[10px] uppercase font-bold shrink-0 transition"
              >
                Editar Aviso
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ÁREA PRINCIPAL: RÉPLICA COMPLETA E EDITÁVEL DO PAINEL SELECIONADO      */}
      {/* ========================================================================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:px-6">

        {/* ----------------------------------------------------------------------- */}
        {/* PAINEL 1: ENCOMENDAS (RÉPLICA DO BALCÃO OPERACIONAL DE ENCOMENDAS)      */}
        {/* ----------------------------------------------------------------------- */}
        {painelAtivoCms === 'encomendas' && (
          <div className="space-y-6">
            {/* Barra Superior com Título, Seletor de Loja e Abas */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative group">
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2">
                  <ShoppingBag className="h-6 w-6 text-amber-600" />
                  <span>{config.tituloBalcao || 'Balcão de Encomendas'}</span>
                  {modoCms === 'edicao' && (
                    <button
                      type="button"
                      onClick={() => abrirEditorTextosParaPainel('encomendas')}
                      className="p-1 rounded-md bg-amber-100 text-amber-800 hover:bg-amber-200 transition"
                      title="Editar Título e Subtítulo deste Painel"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </h2>
                <p className="text-xs sm:text-sm text-gray-500">
                  {config.subtituloBalcao || 'Registo rápido, gestão de contactos de clientes e histórico de pedidos.'}
                </p>
              </div>

              {/* Seletor de Loja do Painel + Abas do Frontoffice */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Seletor de Loja no Painel (Conforme anexo 1) */}
                <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-2xl border border-gray-200 shadow-2xs">
                  <Store className="h-4 w-4 text-amber-600 shrink-0" />
                  <select
                    value={selectedLojaId}
                    onChange={(e) => setSelectedLojaId(e.target.value)}
                    className="text-xs font-bold text-gray-900 bg-transparent focus:outline-none cursor-pointer"
                  >
                    <option value="todas">Todas as Lojas</option>
                    {lojas.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Abas Principais */}
                <div className="flex bg-white p-1 rounded-2xl border border-gray-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setActiveTab('novo')}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                      activeTab === 'novo'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Novo Pedido</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('clientes')}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                      activeTab === 'clientes'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Users className="h-4 w-4" />
                    <span>Gestão de Clientes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('historico')}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                      activeTab === 'historico'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Clock className="h-4 w-4" />
                    <span>Histórico de Encomendas ({encomendasDemo.length})</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ABA: NOVO PEDIDO */}
            {activeTab === 'novo' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* COLUNA ESQUERDA: PESQUISA, CATEGORIAS & GRELHA DE PRODUTOS */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Pesquisa e Filtros */}
                  <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={buscaProduto}
                        onChange={(e) => setBuscaProduto(e.target.value)}
                        placeholder="Pesquisar artigo por nome..."
                        className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="flex gap-1.5 overflow-x-auto">
                      {(['todas', 'padaria', 'pastelaria'] as const).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCategoriaAtiva(cat)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition shrink-0 cursor-pointer ${
                            categoriaAtiva === cat
                              ? 'bg-amber-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {cat === 'todas' ? 'Todas as Categorias' : cat === 'padaria' ? '🥖 Padaria' : '🎂 Pastelaria'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Grelha de Produtos com Drag & Drop */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-amber-600" />
                        <span className="text-xs font-black text-gray-900 uppercase tracking-wide">
                          Montra de Artigos ({produtosFiltrados.length})
                        </span>
                      </div>
                      {modoCms === 'edicao' && (
                        <button
                          type="button"
                          onClick={abrirModalNovoProduto}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold shadow-xs transition cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Adicionar Artigo</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {produtosFiltrados.map((prod, index) => {
                        const originalIndex = produtos.findIndex((p) => p.id === prod.id);
                        return (
                          <div
                            key={prod.id || index}
                            draggable={modoCms === 'edicao'}
                            onDragStart={() => handleDragStartProduto(originalIndex)}
                            onDragOver={handleDragOverProduto}
                            onDrop={() => handleDropProduto(originalIndex)}
                            onClick={() => handleAdicionarAoCarrinho(prod)}
                            className={`group relative p-3 rounded-2xl border bg-white hover:border-amber-400 hover:shadow-md transition cursor-pointer select-none flex flex-col justify-between ${
                              draggedProdIndex === originalIndex ? 'opacity-40 border-dashed border-amber-600' : 'border-gray-200'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-2xl">{prod.emoji || (prod.categoria === 'padaria' ? '🥖' : '🎂')}</span>
                                <span className="text-xs font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg">
                                  {prod.preco ? `${prod.preco.toFixed(2)} €` : '0.00 €'}
                                </span>
                              </div>
                              <h4 className="text-xs font-bold text-gray-900 group-hover:text-amber-800 transition line-clamp-2">
                                {prod.nome}
                              </h4>
                              <p className="text-[10px] text-gray-400 capitalize mt-0.5">
                                {prod.categoria} • {prod.tempo_preparo_minutos || 60}m
                              </p>
                            </div>

                            {/* Controlos de Edição no Modo Edição */}
                            {modoCms === 'edicao' && (
                              <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-1 text-[10px] text-gray-400 cursor-grab active:cursor-grabbing" title="Arrastar para reordenar montra">
                                  <GripVertical className="h-3 w-3" />
                                  <span>Mover</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => abrirModalEditarProduto(prod, originalIndex)}
                                    className="p-1 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900 transition"
                                    title="Editar Nome, Preço e Detalhes"
                                  >
                                    <Edit3 className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => eliminarProduto(originalIndex)}
                                    className="p-1 rounded-md bg-red-100 hover:bg-red-200 text-red-900 transition"
                                    title="Eliminar do Catálogo"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* COLUNA DIREITA: FORMULÁRIO DE NOVO PEDIDO (COM ESCOLHA DA LOJA DE LEVANTAMENTO) */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                    {/* Canal de Origem do Pedido */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span>Canal de Origem do Pedido</span>
                        <span className="text-[10px] text-gray-500 font-normal lowercase">como chegou o pedido</span>
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-gray-100 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setCanalOrigem('presencial')}
                          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                            canalOrigem === 'presencial'
                              ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <Store className="h-3.5 w-3.5 text-stone-600" />
                          <span>Presencial</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCanalOrigem('telefone')}
                          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                            canalOrigem === 'telefone'
                              ? 'bg-white text-amber-900 shadow-2xs border border-amber-300'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <Phone className="h-3.5 w-3.5 text-amber-600" />
                          <span>Telefone</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCanalOrigem('whatsapp')}
                          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                            canalOrigem === 'whatsapp'
                              ? 'bg-white text-emerald-900 shadow-2xs border border-emerald-300'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                          <span>WhatsApp</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCanalOrigem('site_online')}
                          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                            canalOrigem === 'site_online'
                              ? 'bg-white text-indigo-900 shadow-2xs border border-indigo-300'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <Globe className="h-3.5 w-3.5 text-indigo-600" />
                          <span>Site Online</span>
                        </button>
                      </div>
                    </div>

                    {/* Modalidade de Entrega */}
                    <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setTipoEntrega('levantamento_loja')}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                          tipoEntrega === 'levantamento_loja'
                            ? 'bg-white text-gray-900 shadow-2xs'
                            : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        <Store className="h-4 w-4 text-amber-600" />
                        <span>{config.rotuloLevantamento || 'Levantamento em Loja'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipoEntrega('entrega_domicilio')}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                          tipoEntrega === 'entrega_domicilio'
                            ? 'bg-white text-gray-900 shadow-2xs'
                            : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        <Truck className="h-4 w-4 text-blue-600" />
                        <span>{config.rotuloEntrega || 'Entrega ao Domicílio'}</span>
                      </button>
                    </div>

                    {/* LOJA DE LEVANTAMENTO (Conforme Anexo 2: Obrigatório quando Levantamento em Loja) */}
                    {tipoEntrega === 'levantamento_loja' && (
                      <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                        <label className="block text-[11px] font-bold text-amber-950 mb-1 flex items-center gap-1.5">
                          <Store className="h-3.5 w-3.5 text-amber-700" />
                          <span>Loja de Levantamento *</span>
                        </label>
                        <select
                          value={lojaPedidoId}
                          onChange={(e) => setLojaPedidoId(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-amber-300 font-bold text-gray-900 focus:outline-none focus:border-amber-500 cursor-pointer"
                        >
                          {lojas.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.nome}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Cliente: Telefone e Nome */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 mb-1">
                          Telefone (Contacto)
                        </label>
                        <input
                          type="tel"
                          value={telefoneCliente}
                          onChange={(e) => setTelefoneCliente(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 mb-1">
                          Nome do Cliente
                        </label>
                        <input
                          type="text"
                          value={nomeCliente}
                          onChange={(e) => setNomeCliente(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* Se Domicílio: Morada */}
                    {tipoEntrega === 'entrega_domicilio' && (
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 mb-1">
                          Morada Completa de Entrega
                        </label>
                        <input
                          type="text"
                          value={moradaCliente}
                          onChange={(e) => setMoradaCliente(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    )}

                    {/* Agendamento */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 mb-1">
                          Data Agendamento
                        </label>
                        <input
                          type="date"
                          value={dataAgendamento}
                          onChange={(e) => setDataAgendamento(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 mb-1">
                          Hora Prevista
                        </label>
                        <input
                          type="time"
                          value={horaAgendamento}
                          onChange={(e) => setHoraAgendamento(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Carrinho de Artigos */}
                    <div className="pt-2 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-gray-900">
                          Artigos Encomendados ({carrinho.length})
                        </span>
                        {carrinho.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setCarrinho([])}
                            className="text-[11px] text-red-600 font-bold hover:underline cursor-pointer"
                          >
                            Limpar
                          </button>
                        )}
                      </div>

                      {carrinho.length === 0 ? (
                        <div className="p-6 text-center rounded-xl bg-gray-50 border border-dashed border-gray-200 text-xs text-gray-400">
                          Nenhum artigo adicionado. Clique nos produtos à esquerda para adicionar ao pedido.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                          {carrinho.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-base">{item.emoji}</span>
                                <span className="font-bold text-gray-900 truncate">{item.nome}</span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => alterarQtdCarrinho(item.id, -1)}
                                  className="p-1 rounded bg-white border border-gray-200 hover:bg-gray-100 font-bold cursor-pointer"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="font-black w-5 text-center">{item.quantidade}</span>
                                <button
                                  type="button"
                                  onClick={() => alterarQtdCarrinho(item.id, 1)}
                                  className="p-1 rounded bg-white border border-gray-200 hover:bg-gray-100 font-bold cursor-pointer"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removerDoCarrinho(item.id)}
                                  className="p-1 rounded text-red-500 hover:bg-red-50 ml-1 cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Observações Gerais */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">
                        Observações do Pedido
                      </label>
                      <textarea
                        rows={2}
                        value={notasGerais}
                        onChange={(e) => setNotasGerais(e.target.value)}
                        placeholder="Instruções especiais de confeção, fatiamento ou embalagem..."
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none"
                      />
                    </div>

                    {/* Botão de Gravar do Frontoffice */}
                    <div className="relative group">
                      <button
                        type="button"
                        onClick={() => {
                          const lojaEscolhida = lojas.find((l) => l.id === lojaPedidoId);
                          alert(`Simulação de Encomenda registada com sucesso na ${lojaEscolhida ? lojaEscolhida.nome : 'loja selecionada'}! O talão térmico seria impresso aqui.`);
                        }}
                        className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-wider shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Printer className="h-4 w-4" />
                        <span>{config.btnRegistarEncomenda || 'Registar Encomenda & Imprimir Talão'}</span>
                      </button>

                      {modoCms === 'edicao' && (
                        <button
                          type="button"
                          onClick={() => abrirEditorTextosParaPainel('encomendas')}
                          className="absolute right-2 top-2 p-1 rounded bg-amber-800 text-amber-200 hover:bg-amber-900 transition"
                          title="Editar Rótulo deste Botão"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ABA: HISTÓRICO DE ENCOMENDAS (COM AÇÃO EDITAR E ESCOLHER LOJA DE LEVANTAMENTO) */}
            {activeTab === 'historico' && (
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <span>Histórico de Encomendas & Levantamentos Registados</span>
                  </h3>
                  <span className="text-xs text-gray-500 font-semibold">
                    Clique em "Editar" para testar a alteração da Loja de Levantamento (Conforme Anexo 3)
                  </span>
                </div>

                <div className="space-y-3">
                  {encomendasDemo.map((enc) => (
                    <div
                      key={enc.id}
                      className="p-4 rounded-2xl border border-gray-200 hover:border-amber-300 bg-stone-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-xs text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-300">
                            {enc.codigo}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            enc.tipo === 'levantamento_loja'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-blue-100 text-blue-900 border border-blue-300'
                          }`}>
                            {enc.tipo === 'levantamento_loja' ? '🏪 Levantamento em Loja' : '🚚 Entrega ao Domicílio'}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            enc.canal_origem === 'site_online' ? 'bg-indigo-50 text-indigo-800 border-indigo-200' :
                            enc.canal_origem === 'whatsapp' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                            enc.canal_origem === 'telefone' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                            'bg-stone-100 text-stone-700 border-stone-200'
                          }`}>
                            {enc.canal_origem === 'site_online' ? '🌐 Site' :
                             enc.canal_origem === 'whatsapp' ? '💬 WhatsApp' :
                             enc.canal_origem === 'telefone' ? '📞 Telefone' : '🏪 Presencial'}
                          </span>
                          <span className="text-xs text-gray-600 font-semibold">
                            {enc.data_agendamento} às {enc.hora_agendamento}
                          </span>
                        </div>

                        <h4 className="text-sm font-black text-gray-900">
                          {enc.cliente_nome} <span className="text-xs text-gray-500 font-normal">({enc.cliente_telefone})</span>
                        </h4>

                        <p className="text-xs text-gray-600 flex items-center gap-1.5">
                          <Store className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                          <span>Loja: <strong>{enc.loja_nome}</strong></span>
                        </p>

                        <div className="text-xs text-gray-500">
                          Artigos: {enc.itens.map((i) => `${i.quantidade}x ${i.nome}`).join(', ')}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-black text-amber-900">
                          {enc.total.toFixed(2)} €
                        </span>
                        <button
                          type="button"
                          onClick={() => abrirEditarEncomenda(enc)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold shadow-xs transition cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Editar Encomenda</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ABA: GESTÃO DE CLIENTES */}
            {activeTab === 'clientes' && (
              <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-xs text-center space-y-3">
                <Users className="h-10 w-10 text-amber-600 mx-auto" />
                <h3 className="text-base font-black text-gray-900">Módulo de Fichas e Contactos de Clientes</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  Os clientes registados são partilhados de forma integrada entre todos os postos de atendimento e lojas físicas da {config.nomeEmpresa}.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* PAINEL 2: PRODUÇÃO (RÉPLICA DO KANBAN DE FABRICO DE PADARIA/PASTELARIA) */}
        {/* ----------------------------------------------------------------------- */}
        {painelAtivoCms === 'producao' && (
          <div className="space-y-6">
            {/* Banner de Aviso de Produção Editável */}
            {config.avisoProducao && (
              <div className="bg-amber-500 text-stone-950 font-black text-xs py-2 px-4 rounded-2xl shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4" />
                  <span>{config.avisoProducao}</span>
                </div>
                {modoCms === 'edicao' && (
                  <button
                    type="button"
                    onClick={() => abrirEditorTextosParaPainel('producao')}
                    className="p-1 rounded bg-stone-950/20 hover:bg-stone-950/40 text-stone-950 transition"
                    title="Editar Aviso de Produção"
                  >
                    <Edit3 className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}

            {/* Barra Superior do Painel de Produção */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500 text-white shadow-xs">
                  <ChefHat className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 leading-tight flex items-center gap-2">
                    <span>{config.tituloProducao || 'Painel de Produção'}</span>
                    {modoCms === 'edicao' && (
                      <button
                        type="button"
                        onClick={() => abrirEditorTextosParaPainel('producao')}
                        className="p-1 rounded bg-amber-100 text-amber-800 hover:bg-amber-200 transition"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {config.subtituloProducao || 'Fila de fabrico com visualização Kanban e hierárquica por tipo e loja'}
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
                    className="bg-transparent text-xs font-bold text-gray-900 focus:outline-none cursor-pointer"
                  >
                    <option value="todas">Todas as Lojas</option>
                    {lojas.map((l) => (
                      <option key={l.id} value={l.id}>{l.nome}</option>
                    ))}
                  </select>
                </div>

                {/* Filtro de Setor */}
                <div className="flex bg-stone-100 p-1 rounded-xl font-bold text-xs">
                  {(['todos', 'padaria', 'pastelaria'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSetorProducao(s)}
                      className={`px-3 py-1.5 rounded-lg transition capitalize ${
                        setorProducao === s ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500'
                      }`}
                    >
                      {s === 'todos' ? 'Todos os Setores' : s === 'padaria' ? '🥖 Padaria' : '🎂 Pastelaria'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quadro Kanban de Produção (Réplica Frontoffice) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Coluna 1: A Iniciar */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <span className="text-xs font-black text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-amber-600" />
                    Aguardando Fabrico (2)
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono font-bold text-gray-900">ENC-2026-101</span>
                      <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold">08:30</span>
                    </div>
                    <p className="text-xs font-black text-gray-900">Manuel Silva</p>
                    <p className="text-[11px] text-gray-600">🥖 2x Pão de Arouca • 🎂 1x Pão de Ló</p>
                    <button type="button" className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 text-[10px] font-black uppercase rounded-lg">
                      Iniciar Fornada
                    </button>
                  </div>
                </div>
              </div>

              {/* Coluna 2: No Forno / Em Fabrico */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <span className="text-xs font-black text-blue-900 uppercase tracking-wide flex items-center gap-1.5">
                    <Flame className="h-4 w-4 text-orange-600" />
                    No Forno / Em Preparação (1)
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="p-3 bg-white rounded-xl border border-blue-200 shadow-2xs space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono font-bold text-gray-900">ENC-2026-102</span>
                      <span className="text-[10px] bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded font-bold">10:00</span>
                    </div>
                    <p className="text-xs font-black text-gray-900">D. Maria Teresa Rocha</p>
                    <p className="text-[11px] text-gray-600">🍞 2x Broa de Milho • 🧁 6x Castanhas</p>
                    <button type="button" className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase rounded-lg">
                      Concluir Fabrico
                    </button>
                  </div>
                </div>
              </div>

              {/* Coluna 3: Pronto para Embalar / Loja */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <span className="text-xs font-black text-emerald-900 uppercase tracking-wide flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Pronto para Embalar (1)
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono font-bold text-gray-900">ENC-2026-103</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded font-bold">07:30</span>
                    </div>
                    <p className="text-xs font-black text-gray-900">Café & Snack Central</p>
                    <p className="text-[11px] text-gray-600">🥖 25x Pão de Arouca • 🥐 15x Croissant</p>
                    <span className="block text-center text-[10px] font-bold text-emerald-700 bg-emerald-50 py-1 rounded">
                      ✅ Fornada Concluída
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* PAINEL 3: BALCÃO / LOJA (RÉPLICA DO CONTROLO DE LEVANTAMENTOS EM LOJA)   */}
        {/* ----------------------------------------------------------------------- */}
        {painelAtivoCms === 'loja' && (
          <div className="space-y-6">
            {/* Cabeçalho do Balcão */}
            <div className="rounded-2xl bg-white p-5 border border-amber-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-amber-600 text-white shadow-sm">
                    <Store className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-gray-900 leading-tight flex items-center gap-2">
                      <span>{config.tituloLojaBalcao || 'Balcão de Levantamentos'}</span>
                      {modoCms === 'edicao' && (
                        <button
                          type="button"
                          onClick={() => abrirEditorTextosParaPainel('loja')}
                          className="p-1 rounded bg-amber-100 text-amber-800 hover:bg-amber-200 transition"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {config.subtituloLojaBalcao || 'Organização hierárquica de levantamento em loja por loja e hora de agendamento'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Seletor de Loja do Painel de Balcão */}
                  <div className="flex items-center gap-1.5 bg-stone-50 border border-amber-200 px-2.5 py-1.5 rounded-xl shadow-2xs">
                    <Store className="h-4 w-4 text-amber-700 shrink-0" />
                    <select
                      value={selectedLojaId}
                      onChange={(e) => setSelectedLojaId(e.target.value)}
                      className="bg-transparent text-xs font-bold text-gray-900 focus:outline-none cursor-pointer"
                    >
                      <option value="todas">Todas as Lojas</option>
                      {lojas.map((l) => (
                        <option key={l.id} value={l.id}>{l.nome}</option>
                      ))}
                    </select>
                  </div>

                  {/* Alternador de Estado */}
                  <div className="flex bg-gray-100 p-1 rounded-xl">
                    {(['pendentes', 'concluidos', 'todos'] as const).map((est) => (
                      <button
                        key={est}
                        type="button"
                        onClick={() => setFiltroBalcao(est)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition capitalize ${
                          filtroBalcao === est ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500'
                        }`}
                      >
                        {est === 'pendentes' ? 'Pendentes' : est === 'concluidos' ? 'Concluídos' : 'Todos'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Caixa de Instruções Operacionais do Balcão */}
              {config.instrucoesBalcao && (
                <div className="mt-4 p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-700 shrink-0" />
                    <span>{config.instrucoesBalcao}</span>
                  </div>
                  {modoCms === 'edicao' && (
                    <button
                      type="button"
                      onClick={() => abrirEditorTextosParaPainel('loja')}
                      className="p-1 rounded bg-amber-200 hover:bg-amber-300 text-amber-900 transition"
                      title="Editar Instruções do Balcão"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Lista de Levantamentos em Loja */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {encomendasDemo.filter((e) => e.tipo === 'levantamento_loja').map((enc) => (
                <div key={enc.id} className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-gray-900 bg-stone-100 px-2 py-0.5 rounded">
                      {enc.codigo}
                    </span>
                    <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="h-3 w-3 text-amber-600" />
                      Levantamento às {enc.hora_agendamento}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-gray-900">{enc.cliente_nome}</h4>
                    <p className="text-xs text-gray-500">{enc.cliente_telefone} • {enc.loja_nome}</p>
                  </div>

                  <div className="p-2.5 bg-stone-50 rounded-xl text-xs text-gray-700 space-y-1">
                    {enc.itens.map((it, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{it.emoji} {it.quantidade}x {it.nome}</span>
                        <span className="font-bold">✓</span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => alert(`Levantamento da encomenda ${enc.codigo} concluído!`)}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition"
                  >
                    Confirmar Entrega ao Cliente
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* PAINEL 4: ENTREGAS & ROTAS (RÉPLICA DA DISTRIBUIÇÃO E FROTAS)            */}
        {/* ----------------------------------------------------------------------- */}
        {painelAtivoCms === 'entregas' && (
          <div className="space-y-6">
            {/* Aviso do Centro de Expedição */}
            {config.avisoEntregas && (
              <div className="bg-blue-600 text-white font-black text-xs py-2 px-4 rounded-2xl shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  <span>{config.avisoEntregas}</span>
                </div>
                {modoCms === 'edicao' && (
                  <button
                    type="button"
                    onClick={() => abrirEditorTextosParaPainel('entregas')}
                    className="p-1 rounded bg-white/20 hover:bg-white/30 text-white transition"
                    title="Editar Aviso de Entregas"
                  >
                    <Edit3 className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}

            {/* Cabeçalho de Entregas */}
            <div className="rounded-2xl bg-white p-5 border border-blue-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-blue-600 text-white shadow-sm">
                    <Truck className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-gray-900 leading-tight flex items-center gap-2">
                      <span>{config.tituloEntregas || 'Gestão de Entregas & Rotas'}</span>
                      {modoCms === 'edicao' && (
                        <button
                          type="button"
                          onClick={() => abrirEditorTextosParaPainel('entregas')}
                          className="p-1 rounded bg-blue-100 text-blue-800 hover:bg-blue-200 transition"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {config.subtituloEntregas || 'Gestão e atribuição de rotas de distribuição porta a porta'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-stone-50 border border-blue-200 px-2.5 py-1.5 rounded-xl shadow-2xs">
                    <Store className="h-4 w-4 text-blue-700 shrink-0" />
                    <select
                      value={selectedLojaId}
                      onChange={(e) => setSelectedLojaId(e.target.value)}
                      className="bg-transparent text-xs font-bold text-gray-900 focus:outline-none cursor-pointer"
                    >
                      <option value="todas">Todas as Lojas</option>
                      {lojas.map((l) => (
                        <option key={l.id} value={l.id}>{l.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Pool de Encomendas & Carrinhas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Carrinha 1 */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-blue-600" />
                    <h3 className="text-xs font-black text-gray-900 uppercase">Carrinha 1 • Rota Arouca Centro</h3>
                  </div>
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full">
                    1 Encomenda
                  </span>
                </div>
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1 text-xs">
                  <div className="flex justify-between font-bold text-gray-900">
                    <span>ENC-2026-103 • Café & Snack Central</span>
                    <span>07:30</span>
                  </div>
                  <p className="text-gray-500 text-[11px]">📍 Largo da Feira, nº 45, Arouca</p>
                </div>
              </div>

              {/* Carrinha 2 */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-blue-600" />
                    <h3 className="text-xs font-black text-gray-900 uppercase">Carrinha 2 • Rota Periferia & Indústria</h3>
                  </div>
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full">
                    1 Encomenda
                  </span>
                </div>
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1 text-xs">
                  <div className="flex justify-between font-bold text-gray-900">
                    <span>ENC-2026-104 • Restaurante O Pedrógão</span>
                    <span>11:15</span>
                  </div>
                  <p className="text-gray-500 text-[11px]">📍 Zona Industrial da Farrapa, Lote 4</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* PAINEL 5: GESTÃO & MÉTRICAS (RÉPLICA DO PAINEL DE CONTROLO GLOBAL)       */}
        {/* ----------------------------------------------------------------------- */}
        {painelAtivoCms === 'gestao' && (
          <div className="space-y-6">
            {/* Cabeçalho de Gestão */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-amber-600" />
                  <span>{config.tituloGestao || 'Painel de Gestão & Indicadores'}</span>
                  {modoCms === 'edicao' && (
                    <button
                      type="button"
                      onClick={() => abrirEditorTextosParaPainel('gestao')}
                      className="p-1 rounded-md bg-amber-100 text-amber-800 hover:bg-amber-200 transition"
                      title="Editar Título e Subtítulo da Gestão"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </h2>
                <p className="text-xs sm:text-sm text-gray-500">
                  {config.subtituloGestao || 'Métricas operacionais, análise de vendas e auditoria de sistema'}
                </p>
              </div>

              {/* Seletor Rápido de Loja para Métricas */}
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-2xs">
                <Filter className="h-4 w-4 text-amber-600" />
                <select
                  value={selectedLojaId}
                  onChange={(e) => setSelectedLojaId(e.target.value)}
                  className="text-xs font-bold text-gray-900 bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="todas">Todas as Lojas</option>
                  {lojas.map((l) => (
                    <option key={l.id} value={l.id}>{l.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cartões de Indicadores Rápidos (KPIs) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-gray-500 uppercase">Total Encomendas Hoje</span>
                <p className="text-2xl font-black text-gray-900">24 pedidos</p>
                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" /> +12% face a ontem
                </span>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-gray-500 uppercase">Faturação Estimada</span>
                <p className="text-2xl font-black text-amber-800">348.50 €</p>
                <span className="text-[10px] font-bold text-gray-400">Em todas as lojas</span>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-gray-500 uppercase">Taxa de Pontualidade</span>
                <p className="text-2xl font-black text-emerald-700">98.2%</p>
                <span className="text-[10px] font-bold text-emerald-600">Dentro da janela</span>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-gray-500 uppercase">Entregas Domicílio</span>
                <p className="text-2xl font-black text-blue-700">9 concluídas</p>
                <span className="text-[10px] font-bold text-blue-600">Frota ativa</span>
              </div>
            </div>

            {/* Abas e Resumo Operacional */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-sm font-black text-gray-900">Desempenho por Loja Física</h3>
                <span className="text-xs text-gray-500">Sincronização em tempo real</span>
              </div>
              <div className="space-y-3">
                {lojas.map((l) => (
                  <div key={l.id} className="p-3 bg-stone-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-black text-gray-900">{l.nome}</p>
                      <p className="text-gray-500 text-[11px]">{l.morada} • {l.telefone}</p>
                    </div>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                      Operacional
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 5. RODAPÉ INSTITUCIONAL (COM DADOS FISCAIS E TALÃO EDITÁVEIS)             */}
      {/* ========================================================================= */}
      <footer className="mt-auto border-t border-gray-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <span className="font-bold text-gray-900">{config.nomeEmpresa}</span>
            <span>NIF: {config.nif}</span>
            <span>Tel: {config.telefoneGeral}</span>
            <span>Email: {config.email}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="italic text-gray-400">"{config.rodapeTalao}"</span>
            {modoCms === 'edicao' && (
              <button
                type="button"
                onClick={() => abrirEditorTextosParaPainel('marca')}
                className="p-1 rounded bg-amber-100 text-amber-800 hover:bg-amber-200 transition"
                title="Editar Dados Fiscais e Rodapé do Talão"
              >
                <Edit3 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 6. MODAIS DE EDIÇÃO IN-PLACE                                              */}
      {/* ========================================================================= */}

      {/* MODAL UNIFICADO: EDITAR TEXTOS DE TODOS OS PAINÉIS & MARCA */}
      {modalTextosAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-amber-600" />
                <span>Personalizar Textos e Conteúdos da Aplicação</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalTextosAberto(false)}
                className="p-1 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Abas do Editor de Textos (Marca + 5 Painéis) */}
            <div className="flex gap-1.5 p-1 bg-stone-100 rounded-2xl overflow-x-auto">
              <button
                type="button"
                onClick={() => setAbaModalTextos('marca')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  abaModalTextos === 'marca' ? 'bg-amber-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🏷️ Identidade & Marca
              </button>
              <button
                type="button"
                onClick={() => setAbaModalTextos('encomendas')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  abaModalTextos === 'encomendas' ? 'bg-amber-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🛍️ Encomendas
              </button>
              <button
                type="button"
                onClick={() => setAbaModalTextos('producao')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  abaModalTextos === 'producao' ? 'bg-amber-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                👨‍🍳 Produção
              </button>
              <button
                type="button"
                onClick={() => setAbaModalTextos('loja')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  abaModalTextos === 'loja' ? 'bg-amber-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🏪 Balcão / Loja
              </button>
              <button
                type="button"
                onClick={() => setAbaModalTextos('entregas')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  abaModalTextos === 'entregas' ? 'bg-amber-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🚚 Entregas
              </button>
              <button
                type="button"
                onClick={() => setAbaModalTextos('gestao')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  abaModalTextos === 'gestao' ? 'bg-amber-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📊 Gestão
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setModalTextosAberto(false);
                marcarAlteracao();
              }}
              className="space-y-4"
            >
              {/* ABA: IDENTIDADE & MARCA */}
              {abaModalTextos === 'marca' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Nome da Empresa</label>
                      <input
                        type="text"
                        value={config.nomeEmpresa}
                        onChange={(e) => setConfig({ ...config, nomeEmpresa: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Slogan Comercial</label>
                      <input
                        type="text"
                        value={config.slogan}
                        onChange={(e) => setConfig({ ...config, slogan: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Faixa de Aviso Global */}
                  <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-amber-950">Faixa Superior de Alertas / Fornadas</label>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-amber-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.bannerAvisoAtivo ?? true}
                          onChange={(e) => setConfig({ ...config, bannerAvisoAtivo: e.target.checked })}
                          className="rounded text-amber-600"
                        />
                        <span>Ativar Faixa</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={config.bannerAvisoTexto || ''}
                      onChange={(e) => setConfig({ ...config, bannerAvisoTexto: e.target.value })}
                      placeholder="Texto do alerta (ex: Fornadas quentes a sair às 07:00, 11:30 e 17:00)"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-amber-300 bg-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Telefone Geral</label>
                      <input
                        type="text"
                        value={config.telefoneGeral}
                        onChange={(e) => setConfig({ ...config, telefoneGeral: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-gray-300 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">NIF</label>
                      <input
                        type="text"
                        value={config.nif}
                        onChange={(e) => setConfig({ ...config, nif: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-gray-300 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={config.email}
                        onChange={(e) => setConfig({ ...config, email: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-gray-300 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Rodapé do Talão Térmico</label>
                    <input
                      type="text"
                      value={config.rodapeTalao}
                      onChange={(e) => setConfig({ ...config, rodapeTalao: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* ABA: PAINEL ENCOMENDAS */}
              {abaModalTextos === 'encomendas' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Título do Painel</label>
                      <input
                        type="text"
                        value={config.tituloBalcao || ''}
                        onChange={(e) => setConfig({ ...config, tituloBalcao: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Subtítulo do Painel</label>
                      <input
                        type="text"
                        value={config.subtituloBalcao || ''}
                        onChange={(e) => setConfig({ ...config, subtituloBalcao: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Rótulo Levantamento Loja</label>
                      <input
                        type="text"
                        value={config.rotuloLevantamento || ''}
                        onChange={(e) => setConfig({ ...config, rotuloLevantamento: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Rótulo Entrega Domicílio</label>
                      <input
                        type="text"
                        value={config.rotuloEntrega || ''}
                        onChange={(e) => setConfig({ ...config, rotuloEntrega: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Texto do Botão de Registar Encomenda</label>
                    <input
                      type="text"
                      value={config.btnRegistarEncomenda || ''}
                      onChange={(e) => setConfig({ ...config, btnRegistarEncomenda: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* ABA: PAINEL PRODUÇÃO */}
              {abaModalTextos === 'producao' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Título do Painel</label>
                      <input
                        type="text"
                        value={config.tituloProducao || ''}
                        onChange={(e) => setConfig({ ...config, tituloProducao: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Subtítulo do Painel</label>
                      <input
                        type="text"
                        value={config.subtituloProducao || ''}
                        onChange={(e) => setConfig({ ...config, subtituloProducao: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Aviso / Lembrete de Produção (Faixa Superior)</label>
                    <input
                      type="text"
                      value={config.avisoProducao || ''}
                      onChange={(e) => setConfig({ ...config, avisoProducao: e.target.value })}
                      placeholder="ex: Forno a lenha aquecido para fornadas contínuas de padaria tradicional."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* ABA: PAINEL BALCÃO / LOJA */}
              {abaModalTextos === 'loja' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Título do Painel</label>
                      <input
                        type="text"
                        value={config.tituloLojaBalcao || ''}
                        onChange={(e) => setConfig({ ...config, tituloLojaBalcao: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Subtítulo do Painel</label>
                      <input
                        type="text"
                        value={config.subtituloLojaBalcao || ''}
                        onChange={(e) => setConfig({ ...config, subtituloLojaBalcao: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Instruções Operacionais ao Balcão</label>
                    <textarea
                      rows={2}
                      value={config.instrucoesBalcao || ''}
                      onChange={(e) => setConfig({ ...config, instrucoesBalcao: e.target.value })}
                      placeholder="ex: Confirmar identificação do cliente e conferir artigos embalados antes da entrega."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* ABA: PAINEL ENTREGAS */}
              {abaModalTextos === 'entregas' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Título do Painel</label>
                      <input
                        type="text"
                        value={config.tituloEntregas || ''}
                        onChange={(e) => setConfig({ ...config, tituloEntregas: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Subtítulo do Painel</label>
                      <input
                        type="text"
                        value={config.subtituloEntregas || ''}
                        onChange={(e) => setConfig({ ...config, subtituloEntregas: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Aviso / Centro de Carga</label>
                    <input
                      type="text"
                      value={config.avisoEntregas || ''}
                      onChange={(e) => setConfig({ ...config, avisoEntregas: e.target.value })}
                      placeholder="ex: Carga na Unidade Central de Fabrico & Sede"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* ABA: PAINEL GESTÃO */}
              {abaModalTextos === 'gestao' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Título do Painel</label>
                      <input
                        type="text"
                        value={config.tituloGestao || ''}
                        onChange={(e) => setConfig({ ...config, tituloGestao: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Subtítulo do Painel</label>
                      <input
                        type="text"
                        value={config.subtituloGestao || ''}
                        onChange={(e) => setConfig({ ...config, subtituloGestao: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalTextosAberto(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs"
                >
                  Salvar Textos do Painel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR ENCOMENDA (COM ALTERAÇÃO DA LOJA DE LEVANTAMENTO - CONFORME ANEXO 3) */}
      {modalEditarEncomendaAberto && encomendaEmEdicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-amber-600" />
                  <span>Editar Encomenda {encomendaEmEdicao.codigo}</span>
                </h3>
                <p className="text-xs text-gray-500">Alteração de dados, morada e loja física de levantamento</p>
              </div>
              <button
                type="button"
                onClick={() => setModalEditarEncomendaAberto(false)}
                className="p-1 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={salvarEdicaoEncomenda} className="space-y-4">
              {/* Canal de Origem da Encomenda */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Canal de Origem do Pedido</span>
                  <span className="text-[10px] text-gray-500 font-normal lowercase">como chegou o pedido</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-gray-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setEncomendaEmEdicao({ ...encomendaEmEdicao, canal_origem: 'presencial' })}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                      (!encomendaEmEdicao.canal_origem || encomendaEmEdicao.canal_origem === 'presencial')
                        ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Store className="h-3.5 w-3.5 text-stone-600" />
                    <span>Presencial</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEncomendaEmEdicao({ ...encomendaEmEdicao, canal_origem: 'telefone' })}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                      encomendaEmEdicao.canal_origem === 'telefone'
                        ? 'bg-white text-amber-900 shadow-2xs border border-amber-300'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Phone className="h-3.5 w-3.5 text-amber-600" />
                    <span>Telefone</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEncomendaEmEdicao({ ...encomendaEmEdicao, canal_origem: 'whatsapp' })}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                      encomendaEmEdicao.canal_origem === 'whatsapp'
                        ? 'bg-white text-emerald-900 shadow-2xs border border-emerald-300'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEncomendaEmEdicao({ ...encomendaEmEdicao, canal_origem: 'site_online' })}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                      encomendaEmEdicao.canal_origem === 'site_online'
                        ? 'bg-white text-indigo-900 shadow-2xs border border-indigo-300'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Globe className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Site Online</span>
                  </button>
                </div>
              </div>

              {/* Modalidade de Entrega */}
              <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setEncomendaEmEdicao({ ...encomendaEmEdicao, tipo: 'levantamento_loja' })}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    encomendaEmEdicao.tipo === 'levantamento_loja'
                      ? 'bg-white text-gray-900 shadow-2xs'
                      : 'text-gray-500'
                  }`}
                >
                  <Store className="h-4 w-4 text-amber-600" />
                  <span>Levantamento em Loja</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEncomendaEmEdicao({ ...encomendaEmEdicao, tipo: 'entrega_domicilio' })}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    encomendaEmEdicao.tipo === 'entrega_domicilio'
                      ? 'bg-white text-gray-900 shadow-2xs'
                      : 'text-gray-500'
                  }`}
                >
                  <Truck className="h-4 w-4 text-blue-600" />
                  <span>Entrega Domicílio</span>
                </button>
              </div>

              {/* LOJA DE LEVANTAMENTO (Conforme Anexo 3: Permite alterar a loja na edição da encomenda) */}
              {encomendaEmEdicao.tipo === 'levantamento_loja' && (
                <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                  <label className="block font-bold text-amber-950 mb-1 flex items-center gap-1.5 text-xs">
                    <Store className="h-4 w-4 text-amber-700" />
                    <span>Loja de Levantamento *</span>
                  </label>
                  <select
                    value={encomendaEmEdicao.loja_id}
                    onChange={(e) => {
                      const novaLoja = lojas.find((l) => l.id === e.target.value);
                      setEncomendaEmEdicao({
                        ...encomendaEmEdicao,
                        loja_id: e.target.value,
                        loja_nome: novaLoja ? novaLoja.nome : encomendaEmEdicao.loja_nome,
                      });
                    }}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-amber-300 font-bold text-gray-900 focus:outline-none text-xs cursor-pointer"
                  >
                    {lojas.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Dados do Cliente */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nome do Cliente</label>
                  <input
                    type="text"
                    value={encomendaEmEdicao.cliente_nome}
                    onChange={(e) => setEncomendaEmEdicao({ ...encomendaEmEdicao, cliente_nome: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Telefone</label>
                  <input
                    type="tel"
                    value={encomendaEmEdicao.cliente_telefone}
                    onChange={(e) => setEncomendaEmEdicao({ ...encomendaEmEdicao, cliente_telefone: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                  />
                </div>
              </div>

              {/* Se entrega ao domicílio: morada */}
              {encomendaEmEdicao.tipo === 'entrega_domicilio' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Morada de Entrega</label>
                  <input
                    type="text"
                    value={encomendaEmEdicao.cliente_morada}
                    onChange={(e) => setEncomendaEmEdicao({ ...encomendaEmEdicao, cliente_morada: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                  />
                </div>
              )}

              {/* Data e Hora */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Data Agendamento</label>
                  <input
                    type="date"
                    value={encomendaEmEdicao.data_agendamento}
                    onChange={(e) => setEncomendaEmEdicao({ ...encomendaEmEdicao, data_agendamento: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Hora Prevista</label>
                  <input
                    type="time"
                    value={encomendaEmEdicao.hora_agendamento}
                    onChange={(e) => setEncomendaEmEdicao({ ...encomendaEmEdicao, hora_agendamento: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Observações</label>
                <textarea
                  rows={2}
                  value={encomendaEmEdicao.observacoes}
                  onChange={(e) => setEncomendaEmEdicao({ ...encomendaEmEdicao, observacoes: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalEditarEncomendaAberto(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs"
                >
                  Guardar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR / NOVO PRODUTO */}
      {modalProdutoAberto && produtoEmEdicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-amber-600" />
                <span>{indiceProdutoEmEdicao !== null ? 'Editar Artigo da Montra' : 'Novo Artigo para o Catálogo'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalProdutoAberto(false)}
                className="p-1 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={salvarProduto} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nome do Artigo
                </label>
                <input
                  type="text"
                  required
                  value={produtoEmEdicao.nome}
                  onChange={(e) => setProdutoEmEdicao({ ...produtoEmEdicao, nome: e.target.value })}
                  placeholder="ex: Pão de Arouca Especial"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Categoria
                  </label>
                  <select
                    value={produtoEmEdicao.categoria}
                    onChange={(e) => setProdutoEmEdicao({ ...produtoEmEdicao, categoria: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                  >
                    <option value="padaria">🥖 Padaria</option>
                    <option value="pastelaria">🎂 Pastelaria</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Ícone / Emoji
                  </label>
                  <input
                    type="text"
                    value={produtoEmEdicao.emoji || ''}
                    onChange={(e) => setProdutoEmEdicao({ ...produtoEmEdicao, emoji: e.target.value })}
                    placeholder="🥖, 🎂, 🍞, 🥧, 👑"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Preço Sugerido (€)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={produtoEmEdicao.preco ?? 0}
                    onChange={(e) => setProdutoEmEdicao({ ...produtoEmEdicao, preco: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Tempo Fabrico (min)
                  </label>
                  <input
                    type="number"
                    value={produtoEmEdicao.tempo_preparo_minutos ?? 60}
                    onChange={(e) => setProdutoEmEdicao({ ...produtoEmEdicao, tempo_preparo_minutos: parseInt(e.target.value) || 60 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalProdutoAberto(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-black text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs"
                >
                  Confirmar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL DE PUBLICAÇÃO: COMMIT GITHUB & DEPLOY NA VERCEL                 */}
      {/* ========================================================================= */}
      {modalPublicarAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-stone-900 border border-stone-800 p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Send className="h-5 w-5 text-amber-500" />
                <span>Publicar Alterações (GitHub & Vercel)</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalPublicarAberto(false)}
                className="p-1 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-stone-400">
              As alterações efetuadas em qualquer um dos 5 painéis ou na montra de produtos serão registadas num <strong>commit atómico</strong> no repositório{' '}
              <code className="text-amber-400 font-bold">lfcarreiras/App-Padaria</code> na branch{' '}
              <code className="text-amber-400 font-bold">main</code>. A Vercel deteta o commit e inicia automaticamente o novo deploy.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Mensagem do Commit
                </label>
                <input
                  type="text"
                  value={mensagemCommit}
                  onChange={(e) => setMensagemCommit(e.target.value)}
                  placeholder="ex: cms: atualização dos 5 painéis e catálogo de produtos"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-950 border border-stone-700 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-stone-300">
                    GitHub Personal Access Token (PAT)
                  </label>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo&description=AppPadariaCMS"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-amber-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>Criar Token</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-950 border border-stone-700 text-white font-mono focus:outline-none focus:border-amber-500"
                />
                <label className="flex items-center gap-2 mt-1.5 text-[11px] text-stone-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lembrarToken}
                    onChange={(e) => setLembrarToken(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-0"
                  />
                  <span>Lembrar token com segurança neste navegador</span>
                </label>
              </div>

              {resultadoPublicacao && (
                <div className={`p-3 rounded-2xl text-xs ${
                  resultadoPublicacao.sucesso
                    ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-200'
                    : 'bg-red-950/70 border border-red-800 text-red-200'
                }`}>
                  <div className="flex items-start gap-2">
                    {resultadoPublicacao.sucesso ? (
                      <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <p className="font-bold">{resultadoPublicacao.mensagem}</p>
                      {resultadoPublicacao.commitUrl && (
                        <a
                          href={resultadoPublicacao.commitUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-mono"
                        >
                          Ver Commit {resultadoPublicacao.commitSha?.slice(0, 7)} no GitHub
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setModalPublicarAberto(false)}
                disabled={publicando}
                className="px-4 py-2 text-xs font-bold text-stone-400 hover:text-white rounded-xl"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={executarPublicacao}
                disabled={publicando}
                className="px-5 py-2 text-xs font-black text-stone-950 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
              >
                {publicando ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>A Criar Commit...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    <span>Publicar Agora</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
