'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  LOJAS_MOCK, 
  PRODUTOS_MOCK 
} from '../../lib/mockData';
import { supabase } from '../../lib/supabase';
import { 
  carregarEncomendasSupabase,
  carregarProdutosSupabase, 
  carregarLojasSupabase, 
  carregarClientesSupabase,
  salvarClienteDb,
  registarLogAuditoria,
  guardarCanalOrigemLocal
} from '../../lib/encomendasService';
import { 
  Produto, 
  Loja, 
  Cliente, 
  Encomenda, 
  TipoEntrega 
} from '../../types';
import { obterConfiguracaoMarca } from '../../lib/tinaContent';
import { 
  ShoppingBag, 
  Store, 
  Truck, 
  Clock, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle2, 
  Search, 
  Calendar, 
  Phone, 
  MapPin, 
  MessageSquare, 
  User, 
  LogIn, 
  LogOut, 
  ChevronRight, 
  ArrowLeft, 
  AlertCircle,
  Package,
  Sparkles,
  ShieldCheck,
  Check
} from 'lucide-react';

interface ItemCarrinhoCliente {
  id: string;
  produtoId: string;
  nome: string;
  categoria: string;
  quantidade: number;
  preco: number;
  emoji: string;
  notas: string;
}

export default function EncomendarClientePage() {
  const configMarca = obterConfiguracaoMarca();

  // Estados Globais de Dados
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [lojas, setLojas] = useState<Loja[]>(LOJAS_MOCK);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregandoDados, setCarregandoDados] = useState(true);

  // Cliente Autenticado na Sessão do Portal (Ecrã de Login Dedicado ao Cliente)
  const [clienteLogado, setClienteLogado] = useState<Cliente | null>(null);
  const [modalAuthAberto, setModalAuthAberto] = useState(false);
  const [authModo, setAuthModo] = useState<'login' | 'registo'>('login');
  const [authTelefone, setAuthTelefone] = useState('');
  const [authNome, setAuthNome] = useState('');
  const [authMorada, setAuthMorada] = useState('');
  const [authErro, setAuthErro] = useState('');

  // Aba / Vista do Portal ('catalogo' | 'checkout' | 'minhas_encomendas')
  const [vistaAtiva, setVistaAtiva] = useState<'catalogo' | 'checkout' | 'minhas_encomendas'>('catalogo');

  // Carrinho de Compras
  const [carrinho, setCarrinho] = useState<ItemCarrinhoCliente[]>([]);

  // Filtros de Catálogo
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('todas');
  const [buscaProduto, setBuscaProduto] = useState('');

  // Configuração da Entrega
  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega>('levantamento_loja');
  const [lojaLevantamentoId, setLojaLevantamentoId] = useState<string>('loja-1');
  const [moradaEntrega, setMoradaEntrega] = useState('');
  const [notasAcessoEntrega, setNotasAcessoEntrega] = useState('');
  
  // Datas e Horas (Pré-definido para amanhã para garantir fabrico atempado)
  const dHoje = new Date();
  const dAmanha = new Date(dHoje);
  dAmanha.setDate(dHoje.getDate() + 1);
  const dataAmanhaStr = dAmanha.toISOString().split('T')[0];

  const [dataAgendamento, setDataAgendamento] = useState(dataAmanhaStr);
  const [horaAgendamento, setHoraAgendamento] = useState('09:30');
  const [notasGeraisPedido, setNotasGeraisPedido] = useState('');

  // Submissão do Pedido
  const [aSubmeter, setASubmeter] = useState(false);
  const [encomendaSucesso, setEncomendaSucesso] = useState<{
    codigo: string;
    numeroSequencial: number;
    lojaNome: string;
    tipo: TipoEntrega;
    data: string;
    hora: string;
    totalItens: number;
  } | null>(null);

  // Encomendas do Cliente (para tracking em tempo real)
  const [minhasEncomendas, setMinhasEncomendas] = useState<Encomenda[]>([]);
  const [carregandoMinhasEnc, setCarregandoMinhasEnc] = useState(false);

  // Carregar Catálogo e Lojas ao Abrir
  useEffect(() => {
    async function carregarTudo() {
      setCarregandoDados(true);
      try {
        const [prodsDb, lojasDb, clisDb] = await Promise.all([
          carregarProdutosSupabase(),
          carregarLojasSupabase(),
          carregarClientesSupabase(),
        ]);
        if (prodsDb && prodsDb.length > 0) {
          setProdutos(prodsDb.filter(p => p.ativo !== false));
        } else {
          setProdutos(PRODUTOS_MOCK);
        }
        if (lojasDb && lojasDb.length > 0) {
          setLojas(lojasDb);
          setLojaLevantamentoId(lojasDb[0].id);
        }
        if (clisDb && clisDb.length > 0) {
          setClientes(clisDb);
        }
      } catch (err) {
        console.error('Erro ao carregar dados do portal:', err);
        setProdutos(PRODUTOS_MOCK);
      } finally {
        setCarregandoDados(false);
      }
    }
    carregarTudo();

    // Recuperar sessão salva do cliente em localStorage
    if (typeof window !== 'undefined') {
      const savedCliente = localStorage.getItem('cliente_portal_padaria');
      if (savedCliente) {
        try {
          const cli = JSON.parse(savedCliente);
          setClienteLogado(cli);
          if (cli.morada) setMoradaEntrega(cli.morada);
        } catch {
          // ignore
        }
      }
    }
  }, []);

  // Atualizar Encomendas do Cliente Sempre que o cliente estiver logado ou mudar para 'minhas_encomendas'
  useEffect(() => {
    if (!clienteLogado) return;

    async function buscarEncomendasCliente() {
      setCarregandoMinhasEnc(true);
      try {
        const telClienteLimpo = (clienteLogado?.telefone || '').replace(/\D/g, '');
        const nomeClienteLimpo = (clienteLogado?.nome || '').toLowerCase().trim();

        // 1. Ler cache local de encomendas submetidas neste navegador para garantir visibilidade imediata
        let locaisCliente: Encomenda[] = [];
        if (typeof window !== 'undefined') {
          try {
            const rawLocal = localStorage.getItem('encomendas_portal_cliente_v1');
            if (rawLocal) {
              const parsed: Encomenda[] = JSON.parse(rawLocal);
              locaisCliente = parsed.filter((e) => {
                const telEnc = (e.cliente?.telefone || '').replace(/\D/g, '');
                return (
                  e.cliente?.id === clienteLogado?.id ||
                  (telClienteLimpo && telEnc === telClienteLimpo)
                );
              });
            }
          } catch {}
        }

        // 2. Carregar encomendas reais do Supabase (usa a coluna correta criado_em e junta produtos)
        const todasDb = await carregarEncomendasSupabase();
        const doClienteDb = todasDb.filter((enc) => {
          const telEnc = (enc.cliente?.telefone || '').replace(/\D/g, '');
          const matchId = clienteLogado?.id && !clienteLogado.id.startsWith('cli-') && enc.cliente?.id === clienteLogado.id;
          const matchTel = telClienteLimpo.length >= 9 && (telEnc === telClienteLimpo || (enc.notas_cliente || '').replace(/\D/g, '').includes(telClienteLimpo));
          const matchNome = nomeClienteLimpo.length > 2 && enc.cliente?.nome?.toLowerCase().trim() === nomeClienteLimpo;
          return matchId || matchTel || matchNome;
        });

        // 3. Combinar resultados do Supabase com a cache local (atualizando o estado em tempo real do Supabase)
        const mapaCombinado = new Map<string, Encomenda>();
        for (const encDb of doClienteDb) {
          const localMatch = locaisCliente.find((l) => l.id === encDb.id || l.codigo === encDb.codigo);
          // Se o Supabase tiver itens vazios ou sem nome, preservar os itens detalhados guardados localmente
          const itensFinais =
            encDb.itens && encDb.itens.length > 0
              ? encDb.itens.map((it, idx) => ({
                  ...it,
                  produto_nome:
                    it.produto_nome && it.produto_nome !== 'Artigo de Padaria/Pastelaria'
                      ? it.produto_nome
                      : localMatch?.itens?.[idx]?.produto_nome || it.produto_nome,
                }))
              : localMatch?.itens || [];

          mapaCombinado.set(encDb.codigo, {
            ...encDb,
            itens: itensFinais,
          });
        }

        for (const encLocal of locaisCliente) {
          if (!mapaCombinado.has(encLocal.codigo)) {
            mapaCombinado.set(encLocal.codigo, encLocal);
          }
        }

        setMinhasEncomendas(Array.from(mapaCombinado.values()));
      } catch (err) {
        console.error('Erro ao buscar encomendas do cliente:', err);
      } finally {
        setCarregandoMinhasEnc(false);
      }
    }

    buscarEncomendasCliente();
  }, [clienteLogado, vistaAtiva]);

  // Ações do Carrinho
  const adicionarAoCarrinho = (prod: Produto) => {
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
          id: `item-${Date.now()}-${Math.random()}`,
          produtoId: prod.id,
          nome: prod.nome,
          categoria: prod.categoria,
          quantidade: 1,
          preco: prod.preco || 0,
          emoji: prod.categoria === 'padaria' ? '🥖' : '🎂',
          notas: '',
        },
      ];
    });
  };

  const alterarQuantidade = (itemId: string, delta: number) => {
    setCarrinho((prev) =>
      prev
        .map((item) => (item.id === itemId ? { ...item, quantidade: item.quantidade + delta } : item))
        .filter((item) => item.quantidade > 0)
    );
  };

  const atualizarNotasItem = (itemId: string, notas: string) => {
    setCarrinho((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, notas } : item))
    );
  };

  const totalArtigosCarrinho = useMemo(() => {
    return carrinho.reduce((acc, curr) => acc + curr.quantidade, 0);
  }, [carrinho]);

  // Filtro de Produtos
  const produtosFiltrados = useMemo(() => {
    return produtos.filter((p) => {
      const matchCat = categoriaAtiva === 'todas' || p.categoria === categoriaAtiva;
      const matchBusca = p.nome.toLowerCase().includes(buscaProduto.toLowerCase().trim());
      return matchCat && matchBusca;
    });
  }, [produtos, categoriaAtiva, buscaProduto]);

  // Autenticação / Registo Rápido do Cliente
  const handleLoginOuRegisto = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErro('');

    const telLimpo = authTelefone.replace(/\D/g, '').trim();
    if (!telLimpo || telLimpo.length < 9) {
      setAuthErro('Por favor, indique um número de telefone válido (mínimo 9 dígitos).');
      return;
    }

    if (authModo === 'registo' && (!authNome.trim() || authNome.trim().length < 2)) {
      setAuthErro('Por favor, indique o seu nome completo.');
      return;
    }

    try {
      let clienteEncontrado = clientes.find((c) => c.telefone.replace(/\D/g, '') === telLimpo);

      if (authModo === 'login') {
        if (!clienteEncontrado) {
          setAuthModo('registo');
          setAuthErro('Número não encontrado. Por favor, introduza o seu nome para criar a sua conta de cliente.');
          return;
        }
      } else {
        if (!clienteEncontrado) {
          const novoCli: Omit<Cliente, 'id'> = {
            nome: authNome.trim(),
            telefone: authTelefone.trim(),
            morada: authMorada.trim() || undefined,
          };
          const criado = await salvarClienteDb(novoCli);
          if (criado) {
            clienteEncontrado = criado;
            setClientes((prev) => [criado, ...prev]);
          } else {
            clienteEncontrado = {
              id: `cli-${Date.now()}`,
              nome: authNome.trim(),
              telefone: authTelefone.trim(),
              morada: authMorada.trim() || undefined,
            };
          }
        } else {
          if (authNome.trim()) clienteEncontrado.nome = authNome.trim();
          if (authMorada.trim()) clienteEncontrado.morada = authMorada.trim();
        }
      }

      if (clienteEncontrado) {
        setClienteLogado(clienteEncontrado);
        if (clienteEncontrado.morada && !moradaEntrega) {
          setMoradaEntrega(clienteEncontrado.morada);
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem('cliente_portal_padaria', JSON.stringify(clienteEncontrado));
        }
        setModalAuthAberto(false);
      }
    } catch (err: any) {
      setAuthErro(`Erro ao processar: ${err.message || 'Tente novamente.'}`);
    }
  };

  const handleLogout = () => {
    setClienteLogado(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cliente_portal_padaria');
    }
  };

  // Submeter Encomenda do Cliente Online
  const handleSubmeterEncomenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (carrinho.length === 0) {
      alert('O seu carrinho de encomenda está vazio.');
      return;
    }

    if (!clienteLogado) {
      setModalAuthAberto(true);
      return;
    }

    if (tipoEntrega === 'entrega_domicilio' && !moradaEntrega.trim()) {
      alert('Por favor, indique a morada para entrega ao domicílio.');
      return;
    }

    setASubmeter(true);

    try {
      const lojaAlvo = lojas.find((l) => l.id === lojaLevantamentoId) || lojas[0] || LOJAS_MOCK[0];

      // Garantir que o cliente existe na tabela de clientes
      let clienteIdReal = clienteLogado.id.startsWith('cli-') ? null : clienteLogado.id;
      if (!clienteIdReal) {
        const criadoDb = await salvarClienteDb({
          nome: clienteLogado.nome,
          telefone: clienteLogado.telefone,
          morada: moradaEntrega || clienteLogado.morada,
        });
        if (criadoDb && !criadoDb.id.startsWith('cli-')) {
          clienteIdReal = criadoDb.id;
          setClienteLogado(criadoDb);
        }
      }

      // Gerar número sequencial e código de encomenda oficial
      let numSeq = Math.floor(1000 + Math.random() * 9000);
      let codigoOficial = `ENC-${new Date().getFullYear()}-${numSeq}`;

      // Se conectado ao Supabase
      if (supabase) {
        const { data: ultimas } = await supabase
          .from('encomendas')
          .select('numero_sequencial')
          .order('numero_sequencial', { ascending: false })
          .limit(1);

        if (ultimas && ultimas.length > 0 && ultimas[0].numero_sequencial) {
          numSeq = ultimas[0].numero_sequencial + 1;
          codigoOficial = `ENC-${new Date().getFullYear()}-${numSeq}`;
        }

        const notasComCanal = `[CANAL:site_online] [Online Site] ${notasGeraisPedido.trim() || 'Pedido realizado pelo cliente no portal direto.'} • Contacto: ${clienteLogado.telefone}${tipoEntrega === 'entrega_domicilio' ? ` • Morada: ${moradaEntrega}` : ''}`;

        const payloadBase: Record<string, any> = {
          numero_sequencial: numSeq,
          codigo: codigoOficial,
          loja_id: tipoEntrega === 'levantamento_loja' ? lojaAlvo.id : (lojas[0]?.id || lojaAlvo.id),
          cliente_id: clienteIdReal,
          tipo: tipoEntrega,
          data_agendamento: dataAgendamento,
          hora_agendamento: horaAgendamento,
          estado: 'pendente',
          notas_cliente: notasComCanal,
        };

        let { data: encCriada, error: encError } = await supabase
          .from('encomendas')
          .insert({
            ...payloadBase,
            canal_origem: 'site_online',
          })
          .select()
          .single();

        if (encError && encError.message.includes('canal_origem')) {
          const retry = await supabase
            .from('encomendas')
            .insert(payloadBase)
            .select()
            .single();
          encCriada = retry.data;
          encError = retry.error;
        }

        if (encError) {
          throw new Error(encError.message);
        }

        if (encCriada) {
          guardarCanalOrigemLocal(encCriada.id, 'site_online');

          const itensDb = carrinho.map((it) => ({
            encomenda_id: encCriada.id,
            produto_id: it.produtoId && !it.produtoId.startsWith('prod-') && !it.produtoId.startsWith('temp-') ? it.produtoId : null,
            quantidade: Number(it.quantidade) || 1,
            preco_unitario: Number(it.preco) || 0,
            setor: it.categoria === 'pastelaria' ? 'pastelaria' : 'padaria',
            estado_producao: 'pendente',
            notas_personalizacao: it.notas || null,
          }));

          await supabase.from('itens_encomenda').insert(itensDb);

          const novaEncObj: Encomenda = {
            id: encCriada.id,
            numero_sequencial: numSeq,
            codigo: codigoOficial,
            loja_id: tipoEntrega === 'levantamento_loja' ? lojaAlvo.id : (lojas[0]?.id || lojaAlvo.id),
            loja_nome: lojaAlvo.nome,
            cliente: {
              id: clienteIdReal || clienteLogado.id,
              nome: clienteLogado.nome,
              telefone: clienteLogado.telefone,
              morada: moradaEntrega || clienteLogado.morada,
            },
            tipo: tipoEntrega,
            canal_origem: 'site_online',
            data_agendamento: dataAgendamento,
            hora_agendamento: horaAgendamento,
            estado: 'pendente',
            estado_pagamento: 'pendente',
            total: 0,
            notas_cliente: notasGeraisPedido.trim() || undefined,
            itens: carrinho.map((it, i) => ({
              id: `item-${Date.now()}-${i}`,
              encomenda_id: encCriada.id,
              produto_id: it.produtoId,
              produto_nome: it.nome,
              quantidade: it.quantidade,
              preco_unitario: it.preco || 0,
              setor: it.categoria === 'pastelaria' ? 'pastelaria' : 'padaria',
              estado_producao: 'pendente',
              notas_personalizacao: it.notas || undefined,
            })),
            criado_em: new Date().toISOString(),
          };

          setMinhasEncomendas((prev) => [novaEncObj, ...prev.filter((e) => e.codigo !== codigoOficial)]);
          if (typeof window !== 'undefined') {
            try {
              const rawLocal = localStorage.getItem('encomendas_portal_cliente_v1');
              const listaLocal: Encomenda[] = rawLocal ? JSON.parse(rawLocal) : [];
              localStorage.setItem(
                'encomendas_portal_cliente_v1',
                JSON.stringify([novaEncObj, ...listaLocal.filter((e) => e.codigo !== codigoOficial)])
              );
            } catch {}
          }

          await registarLogAuditoria({
            encomenda_id: encCriada.id,
            codigo_encomenda: codigoOficial,
            cliente_nome: clienteLogado.nome,
            utilizador_id: clienteLogado.id,
            utilizador_nome: `${clienteLogado.nome} (Cliente Online)`,
            utilizador_role: 'cliente' as any,
            loja_id: lojaAlvo.id,
            loja_nome: lojaAlvo.nome,
            painel: 'encomendas',
            acao: 'Novo Pedido Online (Site)',
            detalhes: `Encomenda submetida pelo cliente através da App de Pedidos Diretos. Modalidade: ${tipoEntrega === 'entrega_domicilio' ? 'Entrega ao Domicílio' : `Levantamento em ${lojaAlvo.nome}`}. Canal: site_online.`,
          });
        }
      }

      // Sucesso na submissão
      setEncomendaSucesso({
        codigo: codigoOficial,
        numeroSequencial: numSeq,
        lojaNome: lojaAlvo.nome,
        tipo: tipoEntrega,
        data: dataAgendamento,
        hora: horaAgendamento,
        totalItens: totalArtigosCarrinho,
      });

      setCarrinho([]);
      setVistaAtiva('catalogo');
    } catch (err: any) {
      alert(`Ocorreu um erro ao registar a sua encomenda: ${err.message || 'Tente novamente.'}`);
    } finally {
      setASubmeter(false);
    }
  };

  // ECRÃ DE LOGIN DEDICADO AO CLIENTE (Separado do login da equipa)
  if (!clienteLogado) {
    return (
      <div className="h-dvh max-h-dvh overflow-y-auto flex flex-col justify-between bg-gradient-to-br from-stone-900 via-stone-950 to-amber-950 text-white px-4 py-2.5 sm:py-3">
        <div className="flex-1 flex items-center justify-center py-2">
          <div className="max-w-md w-full bg-white text-stone-900 rounded-3xl shadow-2xl border border-amber-200/40 p-5 sm:p-6 space-y-4">
            <div className="text-center space-y-1.5">
              <img
                src="/logo-padaria.jpg"
                alt="Padaria da Vila"
                className="h-12 w-12 rounded-2xl object-cover mx-auto border-2 border-amber-400 shadow-md"
              />
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-wider">
                Área Exclusiva de Clientes
              </span>
              <h1 className="text-lg font-black text-stone-900 leading-tight">
                {configMarca.nomeEmpresa || 'Padaria da Vila'}
              </h1>
              <p className="text-[11px] text-stone-500 leading-snug">
                Faça as suas encomendas diretas e acompanhe o estado do seu pedido em tempo real (Encomendado, Em Produção, Em Distribuição ou Entregue).
              </p>
            </div>

            {/* Alternador Entrar / Registar */}
            <div className="grid grid-cols-2 gap-1.5 bg-stone-100 p-1 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setAuthModo('login');
                  setAuthErro('');
                }}
                className={`py-1.5 rounded-xl transition cursor-pointer ${
                  authModo === 'login' ? 'bg-amber-600 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Já sou Cliente
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthModo('registo');
                  setAuthErro('');
                }}
                className={`py-1.5 rounded-xl transition cursor-pointer ${
                  authModo === 'registo' ? 'bg-amber-600 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Novo Registo
              </button>
            </div>

            {authErro && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <span>{authErro}</span>
              </div>
            )}

            <form onSubmit={handleLoginOuRegisto} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Número de Telemóvel *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2 h-4 w-4 text-stone-400" />
                  <input
                    type="tel"
                    required
                    value={authTelefone}
                    onChange={(e) => setAuthTelefone(e.target.value)}
                    placeholder="912 345 678"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 font-mono text-xs focus:outline-hidden focus:border-amber-600"
                  />
                </div>
              </div>

              {authModo === 'registo' && (
                <>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={authNome}
                      onChange={(e) => setAuthNome(e.target.value)}
                      placeholder="Ex: Maria Ferreira"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-hidden focus:border-amber-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Morada Habitual em Arouca (opcional)
                    </label>
                    <input
                      type="text"
                      value={authMorada}
                      onChange={(e) => setAuthMorada(e.target.value)}
                      placeholder="Rua, número, freguesia..."
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-hidden focus:border-amber-600"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-wider shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                <LogIn className="h-4 w-4" />
                <span>{authModo === 'login' ? 'Aceder à Minha Área de Encomendas' : 'Criar Conta & Começar a Encomendar'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Rodapé com Badge Oficial Inprooval */}
        <footer className="pt-2 pb-1 shrink-0 text-center space-y-1">
          <div className="flex justify-center">
            <img
              src="/badge_powered_by_white.svg"
              alt="Powered by Inprooval"
              className="h-6 sm:h-7 w-auto opacity-95 hover:opacity-100 transition"
            />
          </div>
          <p className="text-[10px] text-stone-400">
            © {new Date().getFullYear()} {configMarca.nomeEmpresa || 'Padaria da Vila'} — Portal Direto de Clientes
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 font-sans selection:bg-amber-100 selection:text-amber-900">
      {/* ---------------- CABEÇALHO DO CLIENTE ---------------- */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <img
                src="/logo-padaria.jpg"
                alt="Padaria da Vila"
                className="h-9 w-9 rounded-xl object-cover border border-amber-300 shadow-xs"
              />
              <div>
                <span className="text-sm font-black text-stone-900 tracking-tight block leading-tight group-hover:text-amber-700 transition">
                  {configMarca.nomeEmpresa || 'Padaria da Vila'}
                </span>
                <span className="text-[10px] text-amber-700 font-bold tracking-wider uppercase block">
                  Portal de Encomendas Online
                </span>
              </div>
            </Link>
          </div>

          {/* Navegação Rápida do Portal */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setVistaAtiva('catalogo')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                vistaAtiva === 'catalogo'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Catálogo</span>
            </button>

            {clienteLogado && (
              <button
                type="button"
                onClick={() => setVistaAtiva('minhas_encomendas')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  vistaAtiva === 'minhas_encomendas'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-stone-700 hover:bg-stone-100'
                }`}
              >
                <Package className="h-3.5 w-3.5" />
                <span>As Minhas Encomendas</span>
              </button>
            )}

            {/* Carrinho Flutuante / Botão */}
            <button
              type="button"
              onClick={() => setVistaAtiva('checkout')}
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <ShoppingBag className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden sm:inline">Carrinho</span>
              {totalArtigosCarrinho > 0 && (
                <span className="bg-amber-500 text-stone-950 text-[10px] font-black h-4 min-w-4 px-1 rounded-full flex items-center justify-center">
                  {totalArtigosCarrinho}
                </span>
              )}
            </button>

            {/* Perfil do Cliente */}
            {clienteLogado ? (
              <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
                <div className="hidden md:block text-right">
                  <span className="text-xs font-bold text-stone-900 block leading-tight truncate max-w-[120px]">
                    {clienteLogado.nome}
                  </span>
                  <span className="text-[10px] text-stone-500 block">
                    {clienteLogado.telefone}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition"
                  title="Terminar Sessão"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthModo('login');
                  setModalAuthAberto(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-bold transition cursor-pointer"
              >
                <User className="h-3.5 w-3.5 text-stone-500" />
                <span>Entrar / Registar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ---------------- BANNER INFORMATIVO SCENÁRIO A ---------------- */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white py-2 px-4 shadow-xs text-xs font-medium">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase">Online</span>
            <span>Encomende comodamente online e levante quentinho na loja ou receba em casa em Arouca.</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-amber-100">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-300" />
            <span>Fabrico Próprio & Artesanal Diário</span>
          </div>
        </div>
      </div>

      {/* ---------------- CORPO PRINCIPAL ---------------- */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">

        {/* MENSAGEM DE SUCESSO APÓS GRAVAÇÃO */}
        {encomendaSucesso && (
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-6 shadow-md space-y-4 animate-fade-in">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-emerald-950">
                  A sua encomenda foi registada com sucesso!
                </h3>
                <p className="text-xs text-emerald-800">
                  Código de Acompanhamento: <span className="font-mono font-black text-sm bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-950">{encomendaSucesso.codigo}</span>
                </p>
                <p className="text-xs text-emerald-700 mt-1">
                  Modalidade: <strong>{encomendaSucesso.tipo === 'levantamento_loja' ? `Levantamento em ${encomendaSucesso.lojaNome}` : 'Entrega ao Domicílio em Arouca'}</strong> • Data: <strong>{encomendaSucesso.data} às {encomendaSucesso.hora}</strong>
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-emerald-200 flex flex-wrap gap-2 justify-end">
              <a
                href={`https://wa.me/351912345678?text=${encodeURIComponent(
                  `Olá Padaria da Vila! Acabei de fazer a encomenda ${encomendaSucesso.codigo} no site para levantamento/entrega a ${encomendaSucesso.data} às ${encomendaSucesso.hora}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Confirmar via WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  setEncomendaSucesso(null);
                  setVistaAtiva('minhas_encomendas');
                }}
                className="px-4 py-2 rounded-xl bg-white text-emerald-900 border border-emerald-300 text-xs font-bold hover:bg-emerald-100 transition"
              >
                Ver Estado da Encomenda
              </button>

              <button
                type="button"
                onClick={() => setEncomendaSucesso(null)}
                className="px-4 py-2 rounded-xl bg-transparent text-emerald-800 text-xs font-bold hover:underline"
              >
                Fazer Outro Pedido
              </button>
            </div>
          </div>
        )}

        {/* ---------------- VISTA 1: CATÁLOGO DE ARTIGOS ---------------- */}
        {vistaAtiva === 'catalogo' && (
          <div className="space-y-6">
            {/* Barra de Filtros de Categoria & Pesquisa */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Categorias */}
              <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                {[
                  { id: 'todas', label: 'Todos os Artigos' },
                  { id: 'padaria', label: '🥖 Pão & Padaria' },
                  { id: 'pastelaria', label: '🎂 Pastelaria & Bolos' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoriaAtiva(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      categoriaAtiva === cat.id
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Campo de Pesquisa */}
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  value={buscaProduto}
                  onChange={(e) => setBuscaProduto(e.target.value)}
                  placeholder="Pesquisar pão, broa, bolo de aniversário..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-hidden focus:border-amber-500 font-medium"
                />
              </div>
            </div>

            {/* Grelha de Produtos */}
            {carregandoDados ? (
              <div className="py-12 text-center text-xs font-bold text-stone-400">
                A carregar montra de produtos da Padaria da Vila...
              </div>
            ) : produtosFiltrados.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 space-y-2">
                <Package className="h-10 w-10 text-stone-300 mx-auto" />
                <h4 className="text-sm font-bold text-stone-700">Nenhum artigo encontrado</h4>
                <p className="text-xs text-stone-400">Tente pesquisar por outro termo ou escolha outra categoria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {produtosFiltrados.map((prod) => {
                  const itemNoCarrinho = carrinho.find((it) => it.produtoId === prod.id || it.nome === prod.nome);

                  return (
                    <div
                      key={prod.id}
                      className="bg-white rounded-2xl border border-stone-200 hover:border-amber-400 shadow-2xs hover:shadow-sm transition p-3 flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-3xl">
                            {prod.categoria === 'pastelaria' ? '🎂' : '🥖'}
                          </span>
                          <span className="text-[10px] font-black text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg uppercase">
                            {prod.unidade || 'un.'}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-stone-900 line-clamp-2 leading-tight">
                          {prod.nome}
                        </h4>
                        <span className="text-[10px] text-stone-400 capitalize block mt-0.5">
                          {prod.categoria === 'pastelaria' ? 'Pastelaria Fina' : 'Padaria Tradicional'}
                        </span>
                      </div>

                      {/* Botão de Adição / Contador */}
                      {itemNoCarrinho ? (
                        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl p-1">
                          <button
                            type="button"
                            onClick={() => alterarQuantidade(itemNoCarrinho.id, -1)}
                            className="h-6 w-6 rounded-lg bg-white border border-amber-300 text-amber-900 flex items-center justify-center font-bold text-xs hover:bg-amber-100"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-xs font-black text-amber-950 font-mono">
                            {itemNoCarrinho.quantidade}
                          </span>
                          <button
                            type="button"
                            onClick={() => alterarQuantidade(itemNoCarrinho.id, 1)}
                            className="h-6 w-6 rounded-lg bg-white border border-amber-300 text-amber-900 flex items-center justify-center font-bold text-xs hover:bg-amber-100"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => adicionarAoCarrinho(prod)}
                          className="w-full py-1.5 px-3 rounded-xl bg-stone-100 hover:bg-amber-600 hover:text-white text-stone-800 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Encomendar</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Barra Flutuante de Avanço para Checkout se houver artigos */}
            {totalArtigosCarrinho > 0 && (
              <div className="fixed bottom-4 left-4 right-4 max-w-xl mx-auto z-40">
                <div className="bg-stone-900 text-white p-3.5 rounded-2xl shadow-2xl border border-stone-800 flex items-center justify-between gap-3 animate-slide-up">
                  <div>
                    <span className="text-xs font-bold text-stone-300 block">
                      Quantidade Total a Encomendar
                    </span>
                    <span className="text-sm font-black text-amber-400">
                      {totalArtigosCarrinho} {totalArtigosCarrinho === 1 ? 'unidade selecionada' : 'unidades selecionadas'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setVistaAtiva('checkout')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-md transition cursor-pointer"
                  >
                    <span>Finalizar Pedido</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------- VISTA 2: CHECKOUT & CONFIGURAÇÃO DA ENTREGA ---------------- */}
        {vistaAtiva === 'checkout' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setVistaAtiva('catalogo')}
                className="flex items-center gap-1 text-xs font-bold text-stone-600 hover:text-stone-900"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Voltar ao Catálogo</span>
              </button>

              <h2 className="text-base font-black text-stone-900">
                Finalizar Encomenda Direta
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Coluna Esquerda: Dados de Entrega e Agendamento */}
              <div className="lg:col-span-7 space-y-4">
                <form onSubmit={handleSubmeterEncomenda} className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs space-y-5">
                  {/* Modalidade de Entrega */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                      1. Modalidade de Recebimento
                    </label>
                    <div className="grid grid-cols-2 gap-2 bg-stone-100 p-1.5 rounded-2xl">
                      <button
                        type="button"
                        onClick={() => setTipoEntrega('levantamento_loja')}
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition cursor-pointer ${
                          tipoEntrega === 'levantamento_loja'
                            ? 'bg-white text-stone-950 shadow-2xs border border-stone-200'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        <Store className="h-4 w-4 text-amber-600" />
                        <span>Levantamento em Loja</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTipoEntrega('entrega_domicilio')}
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition cursor-pointer ${
                          tipoEntrega === 'entrega_domicilio'
                            ? 'bg-white text-stone-950 shadow-2xs border border-stone-200'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        <Truck className="h-4 w-4 text-blue-600" />
                        <span>Entrega ao Domicílio</span>
                      </button>
                    </div>
                  </div>

                  {/* Escolha da Loja (se levantamento em loja) */}
                  {tipoEntrega === 'levantamento_loja' ? (
                    <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 space-y-2">
                      <label className="block text-xs font-black text-amber-950 flex items-center gap-1.5">
                        <Store className="h-4 w-4 text-amber-700" />
                        <span>Em qual loja pretende levantar o seu pedido?</span>
                      </label>
                      <select
                        value={lojaLevantamentoId}
                        onChange={(e) => setLojaLevantamentoId(e.target.value)}
                        className="w-full px-3 py-2 bg-white rounded-xl border border-amber-300 font-bold text-xs text-stone-900 focus:outline-hidden cursor-pointer"
                      >
                        {lojas.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.nome}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-amber-800">
                        Os artigos serão embalados e guardados na loja escolhida para a data e hora indicadas.
                      </p>
                    </div>
                  ) : (
                    /* Morada de Entrega (se entrega ao domicílio) */
                    <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 space-y-3">
                      <label className="block text-xs font-black text-blue-950 flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-blue-700" />
                        <span>Morada de Entrega em Arouca *</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={moradaEntrega}
                        onChange={(e) => setMoradaEntrega(e.target.value)}
                        placeholder="Rua, número de porta, andar, freguesia..."
                        className="w-full px-3 py-2 text-xs font-medium bg-white rounded-xl border border-blue-300 focus:outline-hidden"
                      />
                      <input
                        type="text"
                        value={notasAcessoEntrega}
                        onChange={(e) => setNotasAcessoEntrega(e.target.value)}
                        placeholder="Instruções para o estafeta (ex: código do portão, deixar na receção)..."
                        className="w-full px-3 py-2 text-xs font-medium bg-white rounded-xl border border-blue-200 focus:outline-hidden"
                      />
                    </div>
                  )}

                  {/* Agendamento de Data e Hora */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-stone-500" />
                        <span>Data Prevista *</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={dataAgendamento}
                        onChange={(e) => setDataAgendamento(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-stone-200 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-stone-500" />
                        <span>Hora Prevista *</span>
                      </label>
                      <input
                        type="time"
                        required
                        value={horaAgendamento}
                        onChange={(e) => setHoraAgendamento(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-stone-200 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Observações Gerais */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Observações ou Notas Adicionais
                    </label>
                    <textarea
                      rows={2}
                      value={notasGeraisPedido}
                      onChange={(e) => setNotasGeraisPedido(e.target.value)}
                      placeholder="Alguma recomendação especial para a confeção ou embalamento..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden"
                    />
                  </div>

                  {/* Identificação do Cliente */}
                  <div className="pt-3 border-t border-stone-100">
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                      2. Identificação do Cliente
                    </label>

                    <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black text-stone-900">{clienteLogado.nome}</p>
                        <p className="text-[11px] text-stone-500">{clienteLogado.telefone}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthModo('registo');
                          setModalAuthAberto(true);
                        }}
                        className="text-xs text-amber-700 font-bold hover:underline"
                      >
                        Alterar Dados
                      </button>
                    </div>
                  </div>

                  {/* Botão Final de Submissão */}
                  <button
                    type="submit"
                    disabled={aSubmeter || carrinho.length === 0}
                    className="w-full py-3.5 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-sm uppercase tracking-wider shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <span>{aSubmeter ? 'A registar encomenda...' : 'Confirmar Quantidades & Encomendar'}</span>
                    <Check className="h-4 w-4" />
                  </button>
                </form>
              </div>

              {/* Coluna Direita: Resumo das Quantidades a Encomendar (Sem Preços) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                      <ShoppingBag className="h-4 w-4 text-amber-600" />
                      <span>Quantidades a Encomendar ({totalArtigosCarrinho} un.)</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setCarrinho([])}
                      className="text-[11px] text-red-600 font-bold hover:underline"
                    >
                      Limpar
                    </button>
                  </div>

                  {carrinho.length === 0 ? (
                    <div className="py-8 text-center text-xs text-stone-400">
                      O carrinho está vazio. Adicione artigos no catálogo.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                      {carrinho.map((item) => (
                        <div key={item.id} className="p-3 bg-stone-50 rounded-2xl border border-stone-100 text-xs space-y-2">
                          <div className="flex items-center justify-between font-bold text-stone-900">
                            <span className="flex items-center gap-1.5">
                              <span>{item.emoji}</span>
                              <span>{item.nome}</span>
                            </span>
                            <span className="font-mono text-amber-900 bg-amber-100 px-2 py-0.5 rounded-lg font-black">
                              {item.quantidade} un.
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-stone-200">
                              <button
                                type="button"
                                onClick={() => alterarQuantidade(item.id, -1)}
                                className="h-5 w-5 rounded text-stone-600 hover:text-stone-900 flex items-center justify-center font-bold"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="font-black text-xs min-w-4 text-center">{item.quantidade}</span>
                              <button
                                type="button"
                                onClick={() => alterarQuantidade(item.id, 1)}
                                className="h-5 w-5 rounded text-stone-600 hover:text-stone-900 flex items-center justify-center font-bold"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>

                            <input
                              type="text"
                              value={item.notas}
                              onChange={(e) => atualizarNotasItem(item.id, e.target.value)}
                              placeholder="Personalização (ex: fatiado, frase no bolo)"
                              className="text-[11px] px-2 py-1 bg-white border border-stone-200 rounded-lg flex-1 focus:outline-hidden"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Resumo de Quantidades */}
                  <div className="pt-3 border-t border-stone-100 space-y-1.5">
                    <div className="flex justify-between text-sm font-black text-stone-900">
                      <span>Total de Unidades a Encomendar:</span>
                      <span className="text-base text-amber-700 font-mono">{totalArtigosCarrinho} un.</span>
                    </div>
                    <p className="text-[10px] text-stone-400">
                      Pode acompanhar o estado da sua encomenda (Encomendado, Em Produção, Em Distribuição ou Entregue) no menu «As Minhas Encomendas».
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- VISTA 3: AS MINHAS ENCOMENDAS (TRACKING DO CLIENTE) ---------------- */}
        {vistaAtiva === 'minhas_encomendas' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setVistaAtiva('catalogo')}
                className="flex items-center gap-1 text-xs font-bold text-stone-600 hover:text-stone-900"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Voltar ao Catálogo</span>
              </button>

              <h2 className="text-base font-black text-stone-900 flex items-center gap-2">
                <Package className="h-5 w-5 text-amber-600" />
                <span>As Minhas Encomendas — Estado em Tempo Real</span>
              </h2>
            </div>

            {carregandoMinhasEnc ? (
              <div className="py-12 text-center text-xs font-bold text-stone-400">
                A carregar as suas encomendas...
              </div>
            ) : minhasEncomendas.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 space-y-3">
                <Package className="h-10 w-10 text-stone-300 mx-auto" />
                <h3 className="text-sm font-bold text-stone-800">
                  Ainda não tem encomendas registadas
                </h3>
                <p className="text-xs text-stone-500">
                  Explore a nossa montra de pães e pastelaria artesanal e faça o seu primeiro pedido!
                </p>
                <button
                  type="button"
                  onClick={() => setVistaAtiva('catalogo')}
                  className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs shadow-xs hover:bg-amber-700 transition"
                >
                  Ver Catálogo de Produtos
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {minhasEncomendas.map((enc) => {
                  // 4 Estados Oficiais: 1. Encomendado | 2. Em Produção | 3. Em Distribuição | 4. Entregue
                  const estStr = String(enc.estado);
                  const etapa =
                    estStr === 'pendente'
                      ? 1
                      : estStr === 'em_preparacao' || estStr === 'em_producao'
                      ? 2
                      : estStr === 'pronto' || estStr === 'pronto_loja' || estStr === 'em_rota'
                      ? 3
                      : 4;

                  return (
                    <div
                      key={enc.id}
                      className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm text-stone-900 bg-stone-100 px-2 py-0.5 rounded border border-stone-300">
                              {enc.codigo}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              enc.tipo === 'levantamento_loja'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}>
                              {enc.tipo === 'levantamento_loja' ? `🏪 Levantamento em ${enc.loja_nome}` : '🚚 Entrega ao Domicílio'}
                            </span>
                          </div>
                          <p className="text-xs text-stone-500 mt-1">
                            Agendado para <strong>{enc.data_agendamento} às {enc.hora_agendamento}</strong>
                            {enc.hora_entrega_real && (
                              <span className="ml-2 text-emerald-700 font-bold">
                                • Entregue em {enc.data_entrega_real || enc.data_agendamento} às {enc.hora_entrega_real}
                              </span>
                            )}
                          </p>
                        </div>

                        <span className={`self-start sm:self-auto text-xs font-black px-3 py-1 rounded-xl uppercase tracking-wider ${
                          etapa === 4
                            ? 'bg-emerald-100 text-emerald-900'
                            : etapa === 3
                            ? 'bg-blue-100 text-blue-900 animate-pulse'
                            : etapa === 2
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-stone-100 text-stone-800'
                        }`}>
                          {etapa === 4
                            ? '✅ Entregue'
                            : etapa === 3
                            ? '🚚 Em Distribuição'
                            : etapa === 2
                            ? '👨‍🍳 Em Produção'
                            : '📝 Encomendado'}
                        </span>
                      </div>

                      {/* Barra de Progresso Visual de 4 Etapas Oficiais */}
                      <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div className={`space-y-1 ${etapa >= 1 ? 'text-amber-700 font-bold' : 'text-stone-400'}`}>
                            <div className={`h-2 rounded-full ${etapa >= 1 ? 'bg-amber-600' : 'bg-stone-200'}`} />
                            <span className="text-[10px] block">1. Encomendado</span>
                          </div>
                          <div className={`space-y-1 ${etapa >= 2 ? 'text-amber-700 font-bold' : 'text-stone-400'}`}>
                            <div className={`h-2 rounded-full ${etapa >= 2 ? 'bg-amber-600' : 'bg-stone-200'}`} />
                            <span className="text-[10px] block">2. Em Produção</span>
                          </div>
                          <div className={`space-y-1 ${etapa >= 3 ? 'text-blue-700 font-bold' : 'text-stone-400'}`}>
                            <div className={`h-2 rounded-full ${etapa >= 3 ? 'bg-blue-600' : 'bg-stone-200'}`} />
                            <span className="text-[10px] block">3. Em Distribuição</span>
                          </div>
                          <div className={`space-y-1 ${etapa >= 4 ? 'text-emerald-700 font-bold' : 'text-stone-400'}`}>
                            <div className={`h-2 rounded-full ${etapa >= 4 ? 'bg-emerald-600' : 'bg-stone-200'}`} />
                            <span className="text-[10px] block">4. Entregue</span>
                          </div>
                        </div>
                      </div>

                      {/* Artigos e Quantidades da Encomenda (Sem Preços) */}
                      <div className="space-y-1 text-xs">
                        <span className="font-bold text-stone-700 uppercase text-[10px] tracking-wider block">
                          Quantidades Encomendadas:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {enc.itens.map((it) => (
                            <div key={it.id} className="p-2 rounded-xl bg-stone-50 flex items-center justify-between text-stone-800">
                              <span>• {it.produto_nome}</span>
                              <span className="font-mono font-bold text-amber-900">{it.quantidade} un.</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Botão de Contacto de Suporte via WhatsApp */}
                      <div className="pt-2 border-t border-stone-100 flex justify-end">
                        <a
                          href={`https://wa.me/351912345678?text=${encodeURIComponent(
                            `Olá Padaria da Vila! Gostaria de esclarecer uma dúvida sobre a minha encomenda ${enc.codigo}.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition"
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Falar com o Balcão</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ---------------- MODAL DE EDIÇÃO DE DADOS DO CLIENTE ---------------- */}
      {modalAuthAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-black text-stone-900">
                  Atualizar Dados de Cliente
                </h3>
                <p className="text-xs text-stone-500">
                  Preencha os seus dados de contacto e morada
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalAuthAberto(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {authErro && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <span>{authErro}</span>
              </div>
            )}

            <form onSubmit={handleLoginOuRegisto} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Número de Telemóvel *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                  <input
                    type="tel"
                    required
                    value={authTelefone}
                    onChange={(e) => setAuthTelefone(e.target.value)}
                    placeholder="912 345 678"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 font-mono text-xs focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={authNome}
                  onChange={(e) => setAuthNome(e.target.value)}
                  placeholder="Manuel Silva"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Morada Principal (opcional)
                </label>
                <input
                  type="text"
                  value={authMorada}
                  onChange={(e) => setAuthMorada(e.target.value)}
                  placeholder="Rua, número, andar, freguesia em Arouca"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-wider shadow-xs transition cursor-pointer"
              >
                Guardar Dados
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- RODAPÉ DO CLIENTE COM BADGE INPROOVAL ---------------- */}
      <footer className="bg-stone-900 text-white py-6 border-t border-stone-800 text-xs">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img
              src="/logo-padaria.jpg"
              alt="Padaria da Vila"
              className="h-6 w-6 rounded-lg object-cover"
            />
            <span className="font-bold text-stone-200">
              © {new Date().getFullYear()} {configMarca.nomeEmpresa || 'Padaria da Vila'} — Arouca
            </span>
          </div>

          <div className="flex items-center gap-4">
            <img
              src="/badge_powered_by_white.svg"
              alt="Powered by Inprooval"
              className="h-6 w-auto opacity-90 hover:opacity-100 transition"
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
