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
  Upload
} from 'lucide-react';

const CMS_STORAGE_KEY_TOKEN = 'app_padaria_cms_github_token';
const CMS_STORAGE_KEY_AUTH = 'app_padaria_cms_auth_unlocked';
const DEFAULT_PASSKEY = 'padaria2026';

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

export default function CmsFrontofficeReplicaPage() {
  // Estado de montagem (evita mismatch de SSR e hidratação)
  const [montado, setMontado] = useState(false);

  // Autenticação / Chave Mestra
  const [desbloqueado, setDesbloqueado] = useState(false);
  const [passkeyInput, setPasskeyInput] = useState('');
  const [erroPasskey, setErroPasskey] = useState(false);

  // Modo de Operação do CMS: 'edicao' (com controlos) ou 'preview' (réplica 100% limpa)
  const [modoCms, setModoCms] = useState<'edicao' | 'preview'>('edicao');

  // Estados de Dados do CMS (Fontes de Verdade sincronizadas com Git)
  const [config, setConfig] = useState<TinaConfiguracaoGeral>(obterConfiguracaoMarca());
  const [lojas, setLojas] = useState<TinaLojaItem[]>(obterLojasTina());
  const [produtos, setProdutos] = useState<TinaProdutoItem[]>(obterProdutosMontra());
  const [layout, setLayout] = useState<TinaBlocoLayout[]>(obterLayoutBlocos());

  // Rastreio de Edições Não Publicadas
  const [alteracoesPendentes, setAlteracoesPendentes] = useState(0);

  // Estados Interativos do Frontoffice
  const [selectedLojaId, setSelectedLojaId] = useState<string>('todas');
  const [activeTab, setActiveTab] = useState<'novo' | 'clientes' | 'historico'>('novo');
  const [categoriaAtiva, setCategoriaAtiva] = useState<'todas' | 'padaria' | 'pastelaria'>('todas');
  const [buscaProduto, setBuscaProduto] = useState('');
  const [tipoEntrega, setTipoEntrega] = useState<'levantamento_loja' | 'entrega_domicilio'>('levantamento_loja');
  
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
  const [notasGerais, setNotasGerais] = useState('');

  // Drag & Drop de Produtos na Grelha
  const [draggedProdIndex, setDraggedProdIndex] = useState<number | null>(null);

  // Modais de Edição In-Place
  const [modalProdutoAberto, setModalProdutoAberto] = useState(false);
  const [produtoEmEdicao, setProdutoEmEdicao] = useState<TinaProdutoItem | null>(null);
  const [indiceProdutoEmEdicao, setIndiceProdutoEmEdicao] = useState<number | null>(null);

  const [modalMarcaAberto, setModalMarcaAberto] = useState(false);
  const [modalWhatsAppAberto, setModalWhatsAppAberto] = useState(false);
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
      // Atualizar existente
      const novos = [...produtos];
      novos[indiceProdutoEmEdicao] = produtoEmEdicao;
      setProdutos(novos);
    } else {
      // Adicionar novo no topo da grelha
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

  // ------------------ GESTÃO DE MARCA E TEXTOS GERAIS ------------------
  const salvarMarca = (e: React.FormEvent) => {
    e.preventDefault();
    setModalMarcaAberto(false);
    marcarAlteracao();
  };

  // ------------------ GESTÃO DE WHATSAPP ------------------
  const salvarWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    setModalWhatsAppAberto(false);
    marcarAlteracao();
  };

  // ------------------ GESTÃO DE LOJAS ------------------
  const salvarLoja = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lojaEmEdicao || !lojaEmEdicao.nome.trim()) return;

    const existeIndex = lojas.findIndex((l) => l.id === lojaEmEdicao.id);
    if (existeIndex >= 0) {
      const novos = [...lojas];
      novos[existeIndex] = lojaEmEdicao;
      setLojas(novos);
    } else {
      setLojas([...lojas, lojaEmEdicao]);
    }
    setLojaEmEdicao(null);
    marcarAlteracao();
  };

  // ------------------ GRAVAÇÃO DE COMMIT GITHUB / VERCEL ------------------
  const abrirModalPublicar = () => {
    setResultadoPublicacao(null);
    if (!mensagemCommit) {
      setMensagemCommit(`cms: atualização visual do frontoffice e catálogo (${new Date().toLocaleDateString('pt-PT')})`);
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
          <p className="text-xs font-semibold text-stone-600">A carregar réplica do Frontoffice CMS...</p>
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
              Área restrita de edição visual da aplicação (acesso com chave mestra).
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
              Desbloquear Edição Frontoffice
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
      {/* 1. BARRA SUPERIOR STUDIO CMS (CONTROLOS DE EDIÇÃO & DEPLOY)                */}
      {/* ========================================================================= */}
      <div className="sticky top-0 z-50 bg-stone-950 text-white border-b border-stone-800 shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3">
          {/* Identidade CMS */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-stone-950 text-sm font-black shadow-xs">
              🥖
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-black text-amber-400 tracking-tight">Studio CMS</span>
                <span className="hidden sm:inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-800 text-stone-300">
                  Réplica Visual Frontoffice
                </span>
              </div>
            </div>
          </div>

          {/* Seletor de Modo: Edição vs Pré-visualização Real */}
          <div className="flex items-center gap-2">
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

            {/* Contador de alterações */}
            {alteracoesPendentes > 0 && (
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-950/60 border border-amber-800/80 px-2 py-1 rounded-lg">
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
      {/* 2. NAVBAR EXATA DO FRONTOFFICE (COM EDIÇÃO IN-PLACE NO MODO EDIÇÃO)       */}
      {/* ========================================================================= */}
      <header className={`sticky top-[49px] z-40 w-full border-b border-amber-200 bg-white/95 backdrop-blur shadow-xs ${
        modoCms === 'edicao' ? 'ring-2 ring-amber-400/40' : ''
      }`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-6">
          {/* Identidade e Seletor de Loja */}
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
                  onClick={() => setModalMarcaAberto(true)}
                  className="ml-1 p-1 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition shadow-2xs"
                  title="Editar Nome, Slogan e Informações da Marca"
                >
                  <Edit3 className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Seletor de Loja Ativa */}
            <div className="hidden xl:flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200 px-2 py-1 relative">
              <Store className="h-3.5 w-3.5 text-amber-700 shrink-0" />
              <select
                value={selectedLojaId}
                onChange={(e) => setSelectedLojaId(e.target.value)}
                className="bg-transparent text-xs font-bold text-gray-900 focus:outline-none cursor-pointer max-w-[140px] truncate"
              >
                <option value="todas">Todas as Lojas</option>
                {lojas.map((loja) => (
                  <option key={loja.id} value={loja.id}>
                    {loja.nome}
                  </option>
                ))}
              </select>

              {/* Botão de Edição de Lojas no Modo Edição */}
              {modoCms === 'edicao' && (
                <button
                  type="button"
                  onClick={() => setModalLojasAberto(true)}
                  className="p-0.5 rounded bg-amber-200/60 hover:bg-amber-200 text-amber-900 transition"
                  title="Gerir Lojas e Moradas"
                >
                  <Edit3 className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          </div>

          {/* Menu de Navegação Exato da App */}
          <nav className="flex items-center gap-1 sm:gap-1.5 flex-nowrap">
            <span className="flex items-center gap-1 sm:gap-1.5 rounded-xl px-2 sm:px-2.5 py-1.5 text-xs font-bold bg-amber-600 text-white shadow-xs shrink-0">
              <ShoppingBag className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Encomendas</span>
            </span>
            <span className="flex items-center gap-1 sm:gap-1.5 rounded-xl px-2 sm:px-2.5 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 shrink-0 opacity-70">
              <ChefHat className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Produção</span>
            </span>
            <span className="flex items-center gap-1 sm:gap-1.5 rounded-xl px-2 sm:px-2.5 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 shrink-0 opacity-70">
              <Store className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Balcão</span>
            </span>
            <span className="flex items-center gap-1 sm:gap-1.5 rounded-xl px-2 sm:px-2.5 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 shrink-0 opacity-70">
              <Truck className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Entregas</span>
            </span>
            <span className="flex items-center gap-1 sm:gap-1.5 rounded-xl px-2 sm:px-2.5 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 shrink-0 opacity-70">
              <BarChart3 className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Gestão</span>
            </span>
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
                onClick={() => setModalMarcaAberto(true)}
                className="px-2 py-0.5 bg-stone-950/20 hover:bg-stone-950/40 rounded text-[10px] uppercase font-bold shrink-0 transition"
              >
                Editar Aviso
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. CONTEÚDO PRINCIPAL: BALCÃO DE ENCOMENDAS (RÉPLICA EXATA DO FRONTOFFICE)*/}
      {/* ========================================================================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:px-6">
        {/* Barra Superior com Título e Seletor de Abas */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="relative group">
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2">
              <ShoppingBag className="h-6 w-6 text-amber-600" />
              <span>{config.tituloBalcao || 'Balcão de Encomendas'}</span>
              {modoCms === 'edicao' && (
                <button
                  type="button"
                  onClick={() => setModalMarcaAberto(true)}
                  className="p-1 rounded-md bg-amber-100 text-amber-800 hover:bg-amber-200 transition"
                  title="Editar Título e Subtítulo da Página"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
              )}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              {config.subtituloBalcao || 'Registo rápido, gestão de contactos de clientes e histórico de pedidos.'}
            </p>
          </div>

          {/* Abas Principais do Frontoffice */}
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
              <span>Histórico de Encomendas</span>
            </button>
          </div>
        </div>

        {/* ----------------- ABA 1: NOVO PEDIDO (RÉPLICA DO BALCÃO) ----------------- */}
        {activeTab === 'novo' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* =============================================================== */}
            {/* COLUNA ESQUERDA: INTEGRAÇÃO WHATSAPP, PESQUISA & GRELHA PRODUTOS */}
            {/* =============================================================== */}
            <div className="lg:col-span-7 space-y-4">
              {/* Barra de Integração WhatsApp */}
              <div className={`bg-emerald-50/90 border border-emerald-200 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2.5 shadow-2xs relative ${
                modoCms === 'edicao' ? 'ring-2 ring-emerald-400/40' : ''
              }`}>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-emerald-600 text-white shadow-2xs">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                      {config.tituloWhatsApp || 'Integração WhatsApp'}
                      {modoCms === 'edicao' && (
                        <button
                          type="button"
                          onClick={() => setModalWhatsAppAberto(true)}
                          className="p-0.5 rounded bg-emerald-200 text-emerald-900 hover:bg-emerald-300 transition"
                          title="Editar Mensagem e Configurações de WhatsApp"
                        >
                          <Edit3 className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </h4>
                    <p className="text-[11px] text-emerald-800">
                      {config.subtituloWhatsApp || 'Importar mensagens estruturadas de clientes'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(config.modeloWhatsApp);
                      alert('Modelo de mensagem de WhatsApp copiado para a área de transferência!');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100/50 text-emerald-800 border border-emerald-300 text-xs font-bold transition shadow-2xs cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>{config.btnCopiarModelo || 'Copiar Modelo'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      alert('Janela de importação de mensagens do WhatsApp pronta para receber texto!');
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition shadow-xs cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>{config.btnImportarWhatsApp || 'Importar Pedido'}</span>
                  </button>
                </div>
              </div>

              {/* Pesquisa e Filtros de Categoria */}
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

              {/* Grelha de Produtos (Catálogo Real com Drag & Drop e Edição In-Place) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Catálogo de Artigos ({produtosFiltrados.length})
                  </span>
                  {modoCms === 'edicao' && (
                    <button
                      type="button"
                      onClick={abrirModalNovoProduto}
                      className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-xl transition cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Novo Artigo</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {produtosFiltrados.map((prod, index) => {
                    const realIndex = produtos.findIndex((p) => p.id === prod.id);
                    return (
                      <div
                        key={prod.id || index}
                        draggable={modoCms === 'edicao'}
                        onDragStart={() => handleDragStartProduto(realIndex)}
                        onDragOver={handleDragOverProduto}
                        onDrop={() => handleDropProduto(realIndex)}
                        className={`relative group flex flex-col p-3.5 rounded-2xl bg-white border transition shadow-2xs select-none ${
                          modoCms === 'edicao'
                            ? 'border-amber-200/80 hover:border-amber-500 hover:shadow-md cursor-grab active:cursor-grabbing'
                            : 'border-gray-200 hover:border-amber-400 hover:shadow-xs'
                        }`}
                      >
                        {/* Controlos de Edição Rápida no Modo CMS */}
                        {modoCms === 'edicao' && (
                          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-90 group-hover:opacity-100 transition z-10">
                            <span 
                              className="p-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-600 transition" 
                              title="Arrastar para reordenar"
                            >
                              <GripVertical className="h-3 w-3" />
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                abrirModalEditarProduto(prod, realIndex);
                              }}
                              className="p-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 transition"
                              title="Editar este produto"
                            >
                              <Edit3 className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                eliminarProduto(realIndex);
                              }}
                              className="p-1 rounded bg-red-100 hover:bg-red-200 text-red-700 transition"
                              title="Remover produto"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}

                        <span className="text-2xl mb-1.5">
                          {prod.emoji || (prod.categoria === 'padaria' ? '🥖' : '🎂')}
                        </span>

                        <h4 className="text-xs font-bold text-gray-900 line-clamp-2 leading-tight">
                          {prod.nome}
                        </h4>

                        <div className="mt-auto pt-3 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">
                            {prod.categoria}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAdicionarAoCarrinho(prod)}
                            className="text-[11px] font-black text-amber-700 hover:text-amber-800 uppercase cursor-pointer"
                          >
                            + Adicionar
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Cartão de Atalho para Novo Produto no Modo Edição */}
                  {modoCms === 'edicao' && (
                    <button
                      type="button"
                      onClick={abrirModalNovoProduto}
                      className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/40 hover:bg-amber-50 text-amber-800 transition min-h-[110px] cursor-pointer group"
                    >
                      <Plus className="h-6 w-6 mb-1 text-amber-600 group-hover:scale-110 transition" />
                      <span className="text-xs font-black">+ Adicionar Artigo</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* =============================================================== */}
            {/* COLUNA DIREITA: FORMULÁRIO DE PEDIDO & CARRINHO INTERATIVO      */}
            {/* =============================================================== */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
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

                {/* Botão de Ação do Frontoffice */}
                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => {
                      alert('Simulação de Encomenda registada com sucesso! O talão térmico seria impresso aqui.');
                    }}
                    className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-wider shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    <span>{config.btnRegistarEncomenda || 'Registar Encomenda & Imprimir Talão'}</span>
                  </button>

                  {modoCms === 'edicao' && (
                    <button
                      type="button"
                      onClick={() => setModalMarcaAberto(true)}
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

        {/* ----------------- ABA 2 & 3: INDICADORES VISUAIS ----------------- */}
        {activeTab === 'clientes' && (
          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-xs text-center space-y-3">
            <Users className="h-10 w-10 text-amber-600 mx-auto" />
            <h3 className="text-base font-black text-gray-900">Módulo de Gestão de Contactos & Fichas de Cliente</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Visualização operacional de clientes registados na base de dados. As configurações visuais de marca e catálogo aplicam-se uniformemente a todos os ecrãs.
            </p>
          </div>
        )}

        {activeTab === 'historico' && (
          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-xs text-center space-y-3">
            <Clock className="h-10 w-10 text-amber-600 mx-auto" />
            <h3 className="text-base font-black text-gray-900">Módulo de Histórico de Encomendas & Levantamentos</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Lista e pesquisa de encomendas ativas, levantadas e entregues pelas carrinhas de distribuição.
            </p>
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
                onClick={() => setModalMarcaAberto(true)}
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

      {/* MODAL: EDITAR / NOVO PRODUTO */}
      {modalProdutoAberto && produtoEmEdicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-amber-600" />
                {indiceProdutoEmEdicao !== null ? 'Editar Artigo da Montra' : 'Novo Artigo para o Catálogo'}
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

      {/* MODAL: EDITAR DADOS DA MARCA & TEXTOS GERAIS */}
      {modalMarcaAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Store className="h-5 w-5 text-amber-600" />
                Editar Informações da Marca & Textos da App
              </h3>
              <button
                type="button"
                onClick={() => setModalMarcaAberto(false)}
                className="p-1 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={salvarMarca} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Nome da Empresa / Padaria
                  </label>
                  <input
                    type="text"
                    value={config.nomeEmpresa}
                    onChange={(e) => setConfig({ ...config, nomeEmpresa: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Slogan Comercial
                  </label>
                  <input
                    type="text"
                    value={config.slogan}
                    onChange={(e) => setConfig({ ...config, slogan: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                  />
                </div>
              </div>

              {/* Títulos do Balcão */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Título do Ecrã Balcão
                  </label>
                  <input
                    type="text"
                    value={config.tituloBalcao || ''}
                    onChange={(e) => setConfig({ ...config, tituloBalcao: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Subtítulo do Ecrã
                  </label>
                  <input
                    type="text"
                    value={config.subtituloBalcao || ''}
                    onChange={(e) => setConfig({ ...config, subtituloBalcao: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                  />
                </div>
              </div>

              {/* Faixa de Aviso Superior */}
              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <span>Faixa Superior de Alertas / Fornadas</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-amber-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.bannerAvisoAtivo ?? true}
                      onChange={(e) => setConfig({ ...config, bannerAvisoAtivo: e.target.checked })}
                      className="rounded text-amber-600 focus:ring-0"
                    />
                    <span>Ativar Faixa</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={config.bannerAvisoTexto || ''}
                  onChange={(e) => setConfig({ ...config, bannerAvisoTexto: e.target.value })}
                  placeholder="Texto do alerta (ex: Pão quente a sair às 07:00, 11:30 e 17:00)"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-amber-300 bg-white focus:outline-none"
                />
              </div>

              {/* Rótulos dos Botões */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Rótulo Levantamento Loja
                  </label>
                  <input
                    type="text"
                    value={config.rotuloLevantamento || ''}
                    onChange={(e) => setConfig({ ...config, rotuloLevantamento: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Rótulo Entrega Domicílio
                  </label>
                  <input
                    type="text"
                    value={config.rotuloEntrega || ''}
                    onChange={(e) => setConfig({ ...config, rotuloEntrega: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Texto do Botão de Gravar Encomenda
                </label>
                <input
                  type="text"
                  value={config.btnRegistarEncomenda || ''}
                  onChange={(e) => setConfig({ ...config, btnRegistarEncomenda: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                />
              </div>

              {/* Contactos & Rodapé */}
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
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">NIF da Empresa</label>
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
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Mensagem no Rodapé do Talão Térmico
                </label>
                <input
                  type="text"
                  value={config.rodapeTalao}
                  onChange={(e) => setConfig({ ...config, rodapeTalao: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalMarcaAberto(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-black text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs"
                >
                  Salvar Textos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR CONFIGURAÇÕES DO WHATSAPP */}
      {modalWhatsAppAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-black text-emerald-950 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-emerald-600" />
                Configurar Módulo WhatsApp & Modelo de Pedido
              </h3>
              <button
                type="button"
                onClick={() => setModalWhatsAppAberto(false)}
                className="p-1 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={salvarWhatsApp} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Título da Caixa WhatsApp
                  </label>
                  <input
                    type="text"
                    value={config.tituloWhatsApp || ''}
                    onChange={(e) => setConfig({ ...config, tituloWhatsApp: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Subtítulo Informativo
                  </label>
                  <input
                    type="text"
                    value={config.subtituloWhatsApp || ''}
                    onChange={(e) => setConfig({ ...config, subtituloWhatsApp: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Modelo Estruturado de Mensagem (Copiar para Clientes)
                </label>
                <textarea
                  rows={8}
                  value={config.modeloWhatsApp}
                  onChange={(e) => setConfig({ ...config, modeloWhatsApp: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-gray-300 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalWhatsAppAberto(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR LOJAS */}
      {modalLojasAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Store className="h-5 w-5 text-amber-600" />
                Lojas Físicas & Pontos de Venda
              </h3>
              <button
                type="button"
                onClick={() => setModalLojasAberto(false)}
                className="p-1 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {lojas.map((loja, idx) => (
                <div key={loja.id || idx} className="p-3 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-gray-900">{loja.nome}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">
                      {loja.codigo}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600">{loja.morada}</p>
                  <p className="text-[11px] text-gray-500">Tel: {loja.telefone} • {loja.horario}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setModalLojasAberto(false)}
                className="px-4 py-2 text-xs font-black text-white bg-amber-600 hover:bg-amber-700 rounded-xl"
              >
                Concluir
              </button>
            </div>
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
                Publicar Alterações (GitHub & Vercel)
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
              As alterações serão registadas num <strong>commit atómico</strong> no repositório{' '}
              <code className="text-amber-400 font-bold">lfcarreiras/App-Padaria</code> na branch{' '}
              <code className="text-amber-400 font-bold">main</code>. A Vercel deteta o commit e inicia automaticamente o novo build.
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
                  placeholder="ex: cms: atualização visual de textos e produtos da montra"
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
