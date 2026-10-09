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
  GripVertical, 
  MoveUp, 
  MoveDown, 
  Plus, 
  Trash2, 
  Edit3, 
  Eye, 
  Check, 
  AlertCircle, 
  Sparkles, 
  Layers, 
  Store, 
  ChefHat, 
  Lock, 
  Unlock, 
  ExternalLink, 
  RefreshCw, 
  Send, 
  Key, 
  X
} from 'lucide-react';

const CMS_STORAGE_KEY_TOKEN = 'app_padaria_cms_github_token';
const CMS_STORAGE_KEY_AUTH = 'app_padaria_cms_auth_unlocked';
const DEFAULT_PASSKEY = 'padaria2026';

export default function CmsStudioPage() {
  // Estado de montagem (evita mismatch de SSR e hidratação)
  const [montado, setMontado] = useState(false);

  // Autenticação / Chave Mestra
  const [desbloqueado, setDesbloqueado] = useState(false);
  const [passkeyInput, setPasskeyInput] = useState('');
  const [erroPasskey, setErroPasskey] = useState(false);

  // Estados de Dados do CMS
  const [tabAtiva, setTabAtiva] = useState<'layout' | 'marca' | 'lojas' | 'produtos' | 'preview'>('layout');
  const [config, setConfig] = useState<TinaConfiguracaoGeral>(obterConfiguracaoMarca());
  const [lojas, setLojas] = useState<TinaLojaItem[]>(obterLojasTina());
  const [produtos, setProdutos] = useState<TinaProdutoItem[]>(obterProdutosMontra());
  const [layout, setLayout] = useState<TinaBlocoLayout[]>(obterLayoutBlocos());

  // Rastreio de Edições Não Publicadas
  const [alteracoesPendentes, setAlteracoesPendentes] = useState(0);

  // Modal de Publicação GitHub / Vercel
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

  // Estados de Edição de Itens
  const [blocoEmEdicao, setBlocoEmEdicao] = useState<TinaBlocoLayout | null>(null);
  const [lojaEmEdicao, setLojaEmEdicao] = useState<TinaLojaItem | null>(null);
  const [produtoEmEdicao, setProdutoEmEdicao] = useState<TinaProdutoItem | null>(null);
  const [modalNovoBlocoAberto, setModalNovoBlocoAberto] = useState(false);

  // Drag & Drop State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Inicializar autenticação e token guardado
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
    if (passkeyInput.trim() === DEFAULT_PASSKEY || passkeyInput.trim() === 'admin' || passkeyInput.trim() === '1234') {
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

  // ------------------ REORDENAÇÃO DRAG & DROP ------------------
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDropBlocos = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    const novos = [...layout];
    const [removido] = novos.splice(draggedIndex, 1);
    novos.splice(targetIndex, 0, removido);
    setLayout(novos);
    setDraggedIndex(null);
    marcarAlteracao();
  };

  const handleDropLojas = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    const novos = [...lojas];
    const [removido] = novos.splice(draggedIndex, 1);
    novos.splice(targetIndex, 0, removido);
    setLojas(novos);
    setDraggedIndex(null);
    marcarAlteracao();
  };

  const handleDropProdutos = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    const novos = [...produtos];
    const [removido] = novos.splice(draggedIndex, 1);
    novos.splice(targetIndex, 0, removido);
    setProdutos(novos);
    setDraggedIndex(null);
    marcarAlteracao();
  };

  // ------------------ MOVIMENTAÇÃO POR BOTÕES (▲ / ▼) ------------------
  const moverBloco = (index: number, direcao: 'cima' | 'baixo') => {
    const target = direcao === 'cima' ? index - 1 : index + 1;
    if (target < 0 || target >= layout.length) return;
    const novos = [...layout];
    const [item] = novos.splice(index, 1);
    novos.splice(target, 0, item);
    setLayout(novos);
    marcarAlteracao();
  };

  const alternarAtivoBloco = (index: number) => {
    const novos = [...layout];
    novos[index].ativo = !novos[index].ativo;
    setLayout(novos);
    marcarAlteracao();
  };

  // ------------------ GRAVAÇÃO DE COMMIT GITHUB / VERCEL ------------------
  const abrirModalPublicar = () => {
    setResultadoPublicacao(null);
    if (!mensagemCommit) {
      setMensagemCommit(`cms: atualização visual de conteúdos, montra e lojas (${new Date().toLocaleDateString('pt-PT')})`);
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
          mensagem: data.message || 'Commit registado com sucesso no GitHub! O deploy da Vercel foi acionado.',
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

  // Prevenir desfasamentos de renderização entre SSR e Cliente
  if (!montado) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center text-2xl font-black animate-bounce shadow-lg">
            🥖
          </div>
          <p className="text-xs font-semibold text-stone-400">A carregar Studio CMS...</p>
        </div>
      </div>
    );
  }

  // ------------------ TELA DE BLOQUEIO / LOGIN ------------------
  if (!desbloqueado) {
    return (
      <div className="min-h-screen bg-stone-900 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-stone-950 border border-stone-800 rounded-3xl p-8 shadow-2xl space-y-6 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500 text-stone-950 text-3xl font-black shadow-lg">
            🥖
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Backoffice & CMS Studio</h1>
            <p className="text-xs text-stone-400 mt-1">Acesso reservado ao proprietário / administrador de desenvolvimento.</p>
          </div>

          <form onSubmit={handleDesbloquear} className="space-y-4">
            <div className="text-left">
              <label className="text-xs font-bold text-stone-300 block mb-1.5">Chave Mestra de Acesso (PIN)</label>
              <div className="relative">
                <input
                  type="password"
                  value={passkeyInput}
                  onChange={(e) => setPasskeyInput(e.target.value)}
                  placeholder="Introduza a chave (ex: padaria2026)"
                  className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
                />
                <Key className="absolute right-3.5 top-3.5 h-4 w-4 text-stone-500" />
              </div>
              {erroPasskey && (
                <p className="text-xs font-semibold text-rose-400 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" /> Chave incorreta. Tente "padaria2026" ou "admin".
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl font-black text-sm bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-lg transition flex items-center justify-center gap-2"
            >
              <Unlock className="h-4 w-4" />
              Entrar no CMS Studio
            </button>
          </form>

          <div className="pt-2 border-t border-stone-800/80">
            <Link href="/gestao" className="text-xs text-stone-400 hover:text-white transition">
              ← Voltar ao Painel da Padaria
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 pb-20">
      {/* ================= BARRA DE TOPO & PUBLICAÇÃO GITHUB ================= */}
      <header className="sticky top-0 z-40 bg-stone-950 text-white border-b border-stone-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="h-9 w-9 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center text-lg font-black shrink-0">
              🥖
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm sm:text-base tracking-tight">Padaria Studio CMS</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Git-Backed
                </span>
              </div>
              <p className="text-[11px] text-stone-400 hidden sm:block">Editor visual com reordenação drag & drop e commit automático no GitHub</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {alteracoesPendentes > 0 ? (
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse flex items-center gap-1.5">
                🟡 {alteracoesPendentes} {alteracoesPendentes === 1 ? 'edição pronta' : 'edições prontas'}
              </span>
            ) : (
              <span className="hidden md:inline-flex px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 items-center gap-1.5">
                <Check className="h-3.5 w-3.5" /> Sincronizado
              </span>
            )}

            <button
              onClick={abrirModalPublicar}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-stone-950 shadow-lg shadow-emerald-950/40 transition active:scale-95"
            >
              <Send className="h-4 w-4" />
              <span>Gravar no GitHub & Deploy Vercel</span>
            </button>

            <button
              onClick={() => {
                sessionStorage.removeItem(CMS_STORAGE_KEY_AUTH);
                setDesbloqueado(false);
              }}
              title="Bloquear sessão"
              className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white transition border border-stone-800"
            >
              <Lock className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* NAVEGAÇÃO DE ABAS DO STUDIO */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex overflow-x-auto gap-1 border-t border-stone-800/70 pt-2 pb-2">
          <button
            onClick={() => setTabAtiva('layout')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              tabAtiva === 'layout' ? 'bg-amber-500 text-stone-950 shadow-sm' : 'text-stone-300 hover:bg-stone-900'
            }`}
          >
            <Layers className="h-4 w-4" />
            1. Layout & Blocos (Drag & Drop)
          </button>
          <button
            onClick={() => setTabAtiva('marca')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              tabAtiva === 'marca' ? 'bg-amber-500 text-stone-950 shadow-sm' : 'text-stone-300 hover:bg-stone-900'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            2. Identidade & Textos de Marca
          </button>
          <button
            onClick={() => setTabAtiva('lojas')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              tabAtiva === 'lojas' ? 'bg-amber-500 text-stone-950 shadow-sm' : 'text-stone-300 hover:bg-stone-900'
            }`}
          >
            <Store className="h-4 w-4" />
            3. Lojas Físicas ({lojas.length})
          </button>
          <button
            onClick={() => setTabAtiva('produtos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              tabAtiva === 'produtos' ? 'bg-amber-500 text-stone-950 shadow-sm' : 'text-stone-300 hover:bg-stone-900'
            }`}
          >
            <ChefHat className="h-4 w-4" />
            4. Montra de Produtos ({produtos.length})
          </button>
          <button
            onClick={() => setTabAtiva('preview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ml-auto ${
              tabAtiva === 'preview' ? 'bg-teal-500 text-stone-950 shadow-sm' : 'text-teal-300 hover:bg-stone-900 border border-teal-500/30'
            }`}
          >
            <Eye className="h-4 w-4" />
            Pré-visualização ao Vivo
          </button>
        </div>
      </header>

      {/* ================= CONTEÚDO PRINCIPAL ================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* ================= ABA 1: LAYOUT & BLOCOS (DRAG & DROP) ================= */}
        {tabAtiva === 'layout' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-stone-900 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-amber-600" />
                  Estrutura e Ordem de Secções da Aplicação
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  Arraste os blocos com o rato (Drag & Drop) para alterar a ordem no site, ou use os botões ▲ e ▼.
                </p>
              </div>
              <button
                onClick={() => setModalNovoBlocoAberto(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-xs transition"
              >
                <Plus className="h-4 w-4" />
                Novo Bloco / Secção
              </button>
            </div>

            {/* LISTA DRAGGABLE DE BLOCOS */}
            <div className="space-y-3">
              {layout.map((bloco, idx) => (
                <div
                  key={bloco.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={() => handleDropBlocos(idx)}
                  className={`bg-white rounded-2xl border transition shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    bloco.ativo ? 'border-stone-200 hover:border-amber-300' : 'border-stone-200 opacity-60 bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="cursor-grab active:cursor-grabbing p-1.5 text-stone-400 hover:text-stone-700 bg-stone-100 rounded-lg">
                      <GripVertical className="h-5 w-5" />
                    </div>

                    <span className="h-7 w-7 rounded-lg bg-stone-100 text-stone-700 text-xs font-black flex items-center justify-center">
                      {idx + 1}
                    </span>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-stone-900">{bloco.titulo}</span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
                          {bloco.tipo}
                        </span>
                        {!bloco.ativo && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">
                            Desativado
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5 truncate max-w-md">
                        {bloco.dados?.mensagem || bloco.dados?.tituloPrincipal || bloco.dados?.tituloSecao || 'Sem descrição'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => moverBloco(idx, 'cima')}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none text-stone-600"
                      title="Mover para cima"
                    >
                      <MoveUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => moverBloco(idx, 'baixo')}
                      disabled={idx === layout.length - 1}
                      className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none text-stone-600"
                      title="Mover para baixo"
                    >
                      <MoveDown className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => alternarAtivoBloco(idx)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition border ${
                        bloco.ativo
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-stone-300 bg-stone-100 text-stone-600'
                      }`}
                    >
                      {bloco.ativo ? 'Visível' : 'Oculto'}
                    </button>
                    <button
                      onClick={() => setBlocoEmEdicao(bloco)}
                      className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-700"
                      title="Editar campos do bloco"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Remover o bloco "${bloco.titulo}"?`)) {
                          const novos = layout.filter((b) => b.id !== bloco.id);
                          setLayout(novos);
                          marcarAlteracao();
                        }
                      }}
                      className="p-1.5 rounded-lg border border-stone-200 hover:bg-rose-50 text-rose-600"
                      title="Eliminar bloco"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= ABA 2: IDENTIDADE & TEXTOS DE MARCA ================= */}
        {tabAtiva === 'marca' && (
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-black text-stone-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-600" />
                Textos Institucionais, Marca & Talão
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Altere o nome da padaria, o slogan oficial, contactos e os modelos predefinidos de mensagem.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Nome da Empresa / Padaria</label>
                <input
                  type="text"
                  value={config.nomeEmpresa}
                  onChange={(e) => {
                    setConfig({ ...config, nomeEmpresa: e.target.value });
                    marcarAlteracao();
                  }}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-stone-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Slogan Oficial da Marca</label>
                <input
                  type="text"
                  value={config.slogan}
                  onChange={(e) => {
                    setConfig({ ...config, slogan: e.target.value });
                    marcarAlteracao();
                  }}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-stone-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Telefone Geral de Apoio</label>
                <input
                  type="text"
                  value={config.telefoneGeral}
                  onChange={(e) => {
                    setConfig({ ...config, telefoneGeral: e.target.value });
                    marcarAlteracao();
                  }}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-stone-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">NIF da Empresa</label>
                <input
                  type="text"
                  value={config.nif}
                  onChange={(e) => {
                    setConfig({ ...config, nif: e.target.value });
                    marcarAlteracao();
                  }}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-stone-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Email de Apoio ao Cliente</label>
                <input
                  type="email"
                  value={config.email}
                  onChange={(e) => {
                    setConfig({ ...config, email: e.target.value });
                    marcarAlteracao();
                  }}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-stone-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Mensagem de Rodapé do Talão Térmico</label>
                <input
                  type="text"
                  value={config.rodapeTalao}
                  onChange={(e) => {
                    setConfig({ ...config, rodapeTalao: e.target.value });
                    marcarAlteracao();
                  }}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-stone-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold text-stone-700 block mb-1">Modelo de Encomenda por WhatsApp</label>
                <textarea
                  rows={4}
                  value={config.modeloWhatsApp}
                  onChange={(e) => {
                    setConfig({ ...config, modeloWhatsApp: e.target.value });
                    marcarAlteracao();
                  }}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm font-mono text-stone-900 focus:outline-none focus:border-amber-500"
                />
                <p className="text-[11px] text-stone-500 mt-1">Este modelo é carregado quando o operador ou cliente clica para encomendar via WhatsApp.</p>
              </div>
            </div>
          </div>
        )}

        {/* ================= ABA 3: LOJAS FÍSICAS (DRAG & DROP) ================= */}
        {tabAtiva === 'lojas' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-stone-900 flex items-center gap-2">
                  <Store className="h-5 w-5 text-amber-600" />
                  Rede de Lojas Físicas & Contactos
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  Arraste as lojas para definir a prioridade e ordem de apresentação.
                </p>
              </div>
              <button
                onClick={() => {
                  const nova: TinaLojaItem = {
                    id: `loja-${Date.now()}`,
                    codigo: `LOJA-${lojas.length + 1}`,
                    nome: `Loja ${lojas.length + 1}`,
                    morada: 'Nova Morada, Portugal',
                    telefone: '210 000 000',
                    horario: 'Seg-Sáb: 07h00 - 20h00',
                    nif: '500100201',
                    ativo: true,
                  };
                  setLojaEmEdicao(nova);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-xs transition"
              >
                <Plus className="h-4 w-4" />
                Adicionar Nova Loja
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lojas.map((loja, idx) => (
                <div
                  key={loja.codigo || idx}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={() => handleDropLojas(idx)}
                  className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5 flex flex-col justify-between gap-4 hover:border-amber-400 transition"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="cursor-grab active:cursor-grabbing p-1 text-stone-400 hover:text-stone-700 bg-stone-100 rounded">
                          <GripVertical className="h-4 w-4" />
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-100 text-amber-800">
                          {loja.codigo}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${loja.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-500'}`}>
                        {loja.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>

                    <h3 className="text-base font-black text-stone-900">{loja.nome}</h3>
                    <p className="text-xs text-stone-500 mt-1">{loja.morada}</p>
                    <p className="text-xs font-semibold text-stone-700 mt-2">📞 {loja.telefone}</p>
                    <p className="text-xs text-stone-500">⏰ {loja.horario}</p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                    <button
                      onClick={() => setLojaEmEdicao(loja)}
                      className="px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-xs font-bold text-stone-700 flex items-center gap-1.5"
                    >
                      <Edit3 className="h-3.5 w-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Eliminar a loja "${loja.nome}"?`)) {
                          const novos = lojas.filter((l) => l.codigo !== loja.codigo);
                          setLojas(novos);
                          marcarAlteracao();
                        }
                      }}
                      className="p-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= ABA 4: PRODUTOS DA MONTRA (DRAG & DROP) ================= */}
        {tabAtiva === 'produtos' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-stone-900 flex items-center gap-2">
                  <ChefHat className="h-5 w-5 text-amber-600" />
                  Catálogo Visual da Montra & Fabrico
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  Arraste os produtos para definir os que aparecem primeiro na montra principal.
                </p>
              </div>
              <button
                onClick={() => {
                  const novo: TinaProdutoItem = {
                    nome: 'Novo Artigo de Fornada',
                    categoria: 'padaria',
                    unidade: 'unidade',
                    descricao: 'Descrição comercial e segredos do fabrico artesanal.',
                    alergenios: 'Contém glúten.',
                    destaqueMontra: true,
                  };
                  setProdutoEmEdicao(novo);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-xs transition"
              >
                <Plus className="h-4 w-4" />
                Adicionar Produto
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {produtos.map((prod, idx) => (
                <div
                  key={prod.nome || idx}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={() => handleDropProdutos(idx)}
                  className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5 flex flex-col justify-between gap-4 hover:border-amber-400 transition"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="cursor-grab active:cursor-grabbing p-1 text-stone-400 hover:text-stone-700 bg-stone-100 rounded">
                          <GripVertical className="h-4 w-4" />
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                          prod.categoria === 'padaria' ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {prod.categoria}
                        </span>
                      </div>
                      {prod.destaqueMontra && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-800">
                          ⭐ Destaque
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-black text-stone-900">{prod.nome}</h3>
                    <p className="text-xs text-stone-500 mt-1 line-clamp-2">{prod.descricao}</p>
                    <p className="text-xs text-stone-400 mt-2 font-mono">Unidade: {prod.unidade}</p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                    <button
                      onClick={() => setProdutoEmEdicao(prod)}
                      className="px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-xs font-bold text-stone-700 flex items-center gap-1.5"
                    >
                      <Edit3 className="h-3.5 w-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Eliminar o produto "${prod.nome}" da montra?`)) {
                          const novos = produtos.filter((p) => p.nome !== prod.nome);
                          setProdutos(novos);
                          marcarAlteracao();
                        }
                      }}
                      className="p-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= ABA 5: PRÉ-VISUALIZAÇÃO AO VIVO ================= */}
        {tabAtiva === 'preview' && (
          <div className="space-y-6">
            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Eye className="h-5 w-5 text-amber-600" />
                <span className="text-xs sm:text-sm font-bold text-stone-900">
                  Pré-visualização Dinâmica: Reflete em tempo real as edições de blocos, marca, montra e lojas.
                </span>
              </div>
              <button
                onClick={() => setTabAtiva('layout')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-stone-950 hover:bg-amber-400"
              >
                Voltar ao Editor
              </button>
            </div>

            {/* RENDERIZAÇÃO DOS BLOCOS ATIVOS NA ORDEM ESCOLHIDA */}
            <div className="bg-white rounded-3xl border border-stone-200 shadow-xl overflow-hidden divide-y divide-stone-100">
              {layout.filter((b) => b.ativo).map((bloco) => {
                if (bloco.tipo === 'banner_aviso') {
                  return (
                    <div key={bloco.id} className="bg-amber-500 text-stone-950 px-4 py-2.5 text-center text-xs font-black flex items-center justify-center gap-3">
                      <span>{bloco.dados?.mensagem || 'Aviso informativo'}</span>
                      {bloco.dados?.linkTexto && (
                        <span className="underline cursor-pointer hover:opacity-80">{bloco.dados.linkTexto} →</span>
                      )}
                    </div>
                  );
                }

                if (bloco.tipo === 'hero_marca') {
                  return (
                    <div key={bloco.id} className="p-8 sm:p-12 text-center bg-stone-900 text-white space-y-4">
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        {bloco.dados?.badge || 'Tradição & Qualidade'}
                      </span>
                      <h1 className="text-2xl sm:text-4xl font-black tracking-tight">{bloco.dados?.tituloPrincipal || config.nomeEmpresa}</h1>
                      <p className="text-sm sm:text-base text-stone-300 max-w-2xl mx-auto">{bloco.dados?.subtitulo || config.slogan}</p>
                    </div>
                  );
                }

                if (bloco.tipo === 'montra_destaques') {
                  return (
                    <div key={bloco.id} className="p-8 space-y-6">
                      <div className="text-center">
                        <h2 className="text-xl font-black text-stone-900">{bloco.dados?.tituloSecao || 'Especialidades em Destaque'}</h2>
                        <p className="text-xs text-stone-500 mt-1">{bloco.dados?.descricao}</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {produtos.map((p, pIdx) => (
                          <div key={pIdx} className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">{p.categoria}</span>
                              <span className="text-xs font-semibold text-stone-500">{p.unidade}</span>
                            </div>
                            <h3 className="font-bold text-sm text-stone-900">{p.nome}</h3>
                            <p className="text-xs text-stone-500 line-clamp-2">{p.descricao}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                if (bloco.tipo === 'rede_lojas') {
                  return (
                    <div key={bloco.id} className="p-8 bg-stone-50 space-y-6">
                      <div className="text-center">
                        <h2 className="text-xl font-black text-stone-900">{bloco.dados?.tituloSecao || 'Nossas Lojas'}</h2>
                        <p className="text-xs text-stone-500 mt-1">{bloco.dados?.descricao}</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {lojas.map((l, lIdx) => (
                          <div key={lIdx} className="p-4 rounded-2xl bg-white border border-stone-200 space-y-1.5 shadow-xs">
                            <span className="text-[10px] font-bold text-amber-700">{l.codigo}</span>
                            <h3 className="font-bold text-sm text-stone-900">{l.nome}</h3>
                            <p className="text-xs text-stone-500">{l.morada}</p>
                            <p className="text-xs font-semibold text-stone-700 pt-1">📞 {l.telefone}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                if (bloco.tipo === 'info_encomendas') {
                  return (
                    <div key={bloco.id} className="p-8 bg-amber-500/10 border-t border-amber-500/20 text-center space-y-3">
                      <h2 className="text-xl font-black text-stone-900">{bloco.dados?.tituloSecao || 'Encomendas Rápidas via WhatsApp'}</h2>
                      <p className="text-xs text-stone-600 max-w-lg mx-auto">{bloco.dados?.descricao}</p>
                      {bloco.dados?.telefoneApoio && (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md">
                          💬 WhatsApp: {bloco.dados?.telefoneApoio}
                        </span>
                      )}
                    </div>
                  );
                }

                return null;
              })}
            </div>
          </div>
        )}
      </main>

      {/* ================= MODAL DE PUBLICAÇÃO GITHUB & VERCEL ================= */}
      {modalPublicarAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-stone-950 border border-stone-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-white shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-emerald-500 text-stone-950">
                  <Send className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-black">Publicar no GitHub & Vercel</h3>
                  <p className="text-xs text-stone-400">Gera um commit atómico no branch main e aciona o deploy.</p>
                </div>
              </div>
              <button
                onClick={() => setModalPublicarAberto(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-300 block mb-1">Mensagem do Commit</label>
                <input
                  type="text"
                  value={mensagemCommit}
                  onChange={(e) => setMensagemCommit(e.target.value)}
                  placeholder="Ex: cms: atualizar novos bolos e horários de feriado"
                  className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-stone-300">GitHub Personal Access Token (PAT)</label>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo&description=Padaria-CMS-Token"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    Gerar token no GitHub <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-stone-400 mt-1">
                  Requer permissão de <code className="text-emerald-400">repo</code> (ou <code className="text-emerald-400">contents: write</code>).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="lembrarToken"
                  checked={lembrarToken}
                  onChange={(e) => setLembrarToken(e.target.checked)}
                  className="rounded border-stone-700 text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="lembrarToken" className="text-xs text-stone-300 cursor-pointer">
                  Lembrar token com segurança neste navegador
                </label>
              </div>

              {resultadoPublicacao && (
                <div
                  className={`p-4 rounded-2xl text-xs font-semibold border ${
                    resultadoPublicacao.sucesso
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  <p>{resultadoPublicacao.mensagem}</p>
                  {resultadoPublicacao.commitUrl && (
                    <a
                      href={resultadoPublicacao.commitUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-emerald-400 underline font-bold"
                    >
                      Ver commit no GitHub ({resultadoPublicacao.commitSha}) <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-stone-800">
              <button
                onClick={() => setModalPublicarAberto(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-stone-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={executarPublicacao}
                disabled={publicando}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-stone-950 shadow-lg transition"
              >
                {publicando ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    A criar commit no GitHub...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Criar Commit & Fazer Deploy
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL EDIÇÃO DE BLOCO ================= */}
      {blocoEmEdicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full text-stone-900 shadow-2xl space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-amber-600" />
                Editar Bloco: {blocoEmEdicao.titulo}
              </h3>
              <button onClick={() => setBlocoEmEdicao(null)} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Título do Bloco</label>
                <input
                  type="text"
                  value={blocoEmEdicao.titulo}
                  onChange={(e) => setBlocoEmEdicao({ ...blocoEmEdicao, titulo: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2 text-sm font-semibold text-stone-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              {blocoEmEdicao.tipo === 'banner_aviso' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">Mensagem de Alerta</label>
                    <input
                      type="text"
                      value={blocoEmEdicao.dados.mensagem || ''}
                      onChange={(e) =>
                        setBlocoEmEdicao({
                          ...blocoEmEdicao,
                          dados: { ...blocoEmEdicao.dados, mensagem: e.target.value },
                        })
                      }
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2 text-sm text-stone-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">Texto do Link (opcional)</label>
                    <input
                      type="text"
                      value={blocoEmEdicao.dados.linkTexto || ''}
                      onChange={(e) =>
                        setBlocoEmEdicao({
                          ...blocoEmEdicao,
                          dados: { ...blocoEmEdicao.dados, linkTexto: e.target.value },
                        })
                      }
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2 text-sm text-stone-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </>
              )}

              {blocoEmEdicao.tipo === 'hero_marca' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">Badge Superior</label>
                    <input
                      type="text"
                      value={blocoEmEdicao.dados.badge || ''}
                      onChange={(e) =>
                        setBlocoEmEdicao({
                          ...blocoEmEdicao,
                          dados: { ...blocoEmEdicao.dados, badge: e.target.value },
                        })
                      }
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2 text-sm text-stone-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">Título Principal</label>
                    <input
                      type="text"
                      value={blocoEmEdicao.dados.tituloPrincipal || ''}
                      onChange={(e) =>
                        setBlocoEmEdicao({
                          ...blocoEmEdicao,
                          dados: { ...blocoEmEdicao.dados, tituloPrincipal: e.target.value },
                        })
                      }
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2 text-sm text-stone-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">Subtítulo / Descrição</label>
                    <textarea
                      rows={3}
                      value={blocoEmEdicao.dados.subtitulo || ''}
                      onChange={(e) =>
                        setBlocoEmEdicao({
                          ...blocoEmEdicao,
                          dados: { ...blocoEmEdicao.dados, subtitulo: e.target.value },
                        })
                      }
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2 text-sm text-stone-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </>
              )}

              {(blocoEmEdicao.tipo === 'montra_destaques' || blocoEmEdicao.tipo === 'rede_lojas' || blocoEmEdicao.tipo === 'info_encomendas') && (
                <>
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">Título da Secção</label>
                    <input
                      type="text"
                      value={blocoEmEdicao.dados.tituloSecao || ''}
                      onChange={(e) =>
                        setBlocoEmEdicao({
                          ...blocoEmEdicao,
                          dados: { ...blocoEmEdicao.dados, tituloSecao: e.target.value },
                        })
                      }
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2 text-sm text-stone-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">Descrição</label>
                    <textarea
                      rows={3}
                      value={blocoEmEdicao.dados.descricao || ''}
                      onChange={(e) =>
                        setBlocoEmEdicao({
                          ...blocoEmEdicao,
                          dados: { ...blocoEmEdicao.dados, descricao: e.target.value },
                        })
                      }
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2 text-sm text-stone-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
              <button
                onClick={() => setBlocoEmEdicao(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-500 hover:text-stone-800"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const novos = layout.map((b) => (b.id === blocoEmEdicao.id ? blocoEmEdicao : b));
                  setLayout(novos);
                  setBlocoEmEdicao(null);
                  marcarAlteracao();
                }}
                className="px-4 py-2 rounded-xl text-xs font-black bg-amber-500 text-stone-950 hover:bg-amber-400"
              >
                Guardar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL ADICIONAR NOVO BLOCO ================= */}
      {modalNovoBlocoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full text-stone-900 shadow-2xl space-y-4">
            <h3 className="text-base font-black">Escolha o Tipo de Bloco a Adicionar</h3>
            <div className="space-y-2">
              {[
                { tipo: 'banner_aviso', label: 'Faixa de Aviso / Horário Especial', desc: 'Barra colorida no topo com mensagem urgente' },
                { tipo: 'hero_marca', label: 'Apresentação da Marca', desc: 'Destaque visual com títulos e fotos' },
                { tipo: 'montra_destaques', label: 'Montra de Bolos & Pães', desc: 'Grelha com produtos artesanais' },
                { tipo: 'rede_lojas', label: 'Lojas Físicas & Contactos', desc: 'Moradas, telefones e horários' },
                { tipo: 'info_encomendas', label: 'Caixa de WhatsApp / Apoio', desc: 'Call-to-action para encomendas rápidas' },
              ].map((opt) => (
                <button
                  key={opt.tipo}
                  onClick={() => {
                    const novo: TinaBlocoLayout = {
                      id: `bloco-${Date.now()}`,
                      tipo: opt.tipo as any,
                      titulo: opt.label,
                      ativo: true,
                      dados: {
                        tituloSecao: opt.label,
                        descricao: opt.desc,
                        mensagem: opt.label,
                      },
                    };
                    setLayout([...layout, novo]);
                    setModalNovoBlocoAberto(false);
                    marcarAlteracao();
                  }}
                  className="w-full text-left p-3.5 rounded-2xl border border-stone-200 hover:border-amber-500 hover:bg-amber-50/50 transition group"
                >
                  <div className="font-bold text-xs text-stone-900 group-hover:text-amber-900">{opt.label}</div>
                  <div className="text-[11px] text-stone-500">{opt.desc}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setModalNovoBlocoAberto(false)}
              className="w-full py-2 text-xs font-bold text-stone-500 hover:text-stone-800"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL EDIÇÃO DE LOJA ================= */}
      {lojaEmEdicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full text-stone-900 shadow-2xl space-y-4">
            <h3 className="text-base font-black">Editar Loja Física</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Código</label>
                <input
                  type="text"
                  value={lojaEmEdicao.codigo}
                  onChange={(e) => setLojaEmEdicao({ ...lojaEmEdicao, codigo: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Nome da Loja</label>
                <input
                  type="text"
                  value={lojaEmEdicao.nome}
                  onChange={(e) => setLojaEmEdicao({ ...lojaEmEdicao, nome: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Morada</label>
                <input
                  type="text"
                  value={lojaEmEdicao.morada}
                  onChange={(e) => setLojaEmEdicao({ ...lojaEmEdicao, morada: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Telefone</label>
                <input
                  type="text"
                  value={lojaEmEdicao.telefone}
                  onChange={(e) => setLojaEmEdicao({ ...lojaEmEdicao, telefone: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Horário</label>
                <input
                  type="text"
                  value={lojaEmEdicao.horario}
                  onChange={(e) => setLojaEmEdicao({ ...lojaEmEdicao, horario: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="lojaAtivaCheck"
                  checked={lojaEmEdicao.ativo}
                  onChange={(e) => setLojaEmEdicao({ ...lojaEmEdicao, ativo: e.target.checked })}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="lojaAtivaCheck" className="text-xs font-bold text-stone-700 cursor-pointer">
                  Loja Ativa
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
              <button onClick={() => setLojaEmEdicao(null)} className="px-3 py-2 text-xs font-bold text-stone-500">
                Cancelar
              </button>
              <button
                onClick={() => {
                  const existe = lojas.some((l) => l.codigo === lojaEmEdicao.codigo);
                  let novos: TinaLojaItem[] = [];
                  if (existe) {
                    novos = lojas.map((l) => (l.codigo === lojaEmEdicao.codigo ? lojaEmEdicao : l));
                  } else {
                    novos = [...lojas, lojaEmEdicao];
                  }
                  setLojas(novos);
                  setLojaEmEdicao(null);
                  marcarAlteracao();
                }}
                className="px-4 py-2 rounded-xl text-xs font-black bg-amber-500 text-stone-950 hover:bg-amber-400"
              >
                Guardar Loja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL EDIÇÃO DE PRODUTO ================= */}
      {produtoEmEdicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full text-stone-900 shadow-2xl space-y-4">
            <h3 className="text-base font-black">Editar Artigo da Montra</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Nome do Artigo</label>
                <input
                  type="text"
                  value={produtoEmEdicao.nome}
                  onChange={(e) => setProdutoEmEdicao({ ...produtoEmEdicao, nome: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-semibold"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Setor</label>
                  <select
                    value={produtoEmEdicao.categoria}
                    onChange={(e) => setProdutoEmEdicao({ ...produtoEmEdicao, categoria: e.target.value as any })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-semibold"
                  >
                    <option value="padaria">Padaria</option>
                    <option value="pastelaria">Pastelaria</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Unidade</label>
                  <select
                    value={produtoEmEdicao.unidade}
                    onChange={(e) => setProdutoEmEdicao({ ...produtoEmEdicao, unidade: e.target.value as any })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-semibold"
                  >
                    <option value="unidade">Unidade (un)</option>
                    <option value="kg">Quilograma (kg)</option>
                    <option value="cento">Cento</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={produtoEmEdicao.descricao}
                  onChange={(e) => setProdutoEmEdicao({ ...produtoEmEdicao, descricao: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Alergénios</label>
                <input
                  type="text"
                  value={produtoEmEdicao.alergenios}
                  onChange={(e) => setProdutoEmEdicao({ ...produtoEmEdicao, alergenios: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="prodDestaqueCheck"
                  checked={produtoEmEdicao.destaqueMontra}
                  onChange={(e) => setProdutoEmEdicao({ ...produtoEmEdicao, destaqueMontra: e.target.checked })}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="prodDestaqueCheck" className="text-xs font-bold text-stone-700 cursor-pointer">
                  Destaque na Montra Principal
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
              <button onClick={() => setProdutoEmEdicao(null)} className="px-3 py-2 text-xs font-bold text-stone-500">
                Cancelar
              </button>
              <button
                onClick={() => {
                  const existe = produtos.some((p) => p.nome === produtoEmEdicao.nome);
                  let novos: TinaProdutoItem[] = [];
                  if (existe) {
                    novos = produtos.map((p) => (p.nome === produtoEmEdicao.nome ? produtoEmEdicao : p));
                  } else {
                    novos = [...produtos, produtoEmEdicao];
                  }
                  setProdutos(novos);
                  setProdutoEmEdicao(null);
                  marcarAlteracao();
                }}
                className="px-4 py-2 rounded-xl text-xs font-black bg-amber-500 text-stone-950 hover:bg-amber-400"
              >
                Guardar Artigo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
