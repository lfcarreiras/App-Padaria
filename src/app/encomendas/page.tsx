'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '../../components/Navbar';
import { ThermalReceipt } from '../../components/ThermalReceipt';
import { LOJAS_MOCK, PRODUTOS_MOCK } from '../../lib/mockData';
import { supabase } from '../../lib/supabase';
import { 
  carregarEncomendasSupabase, 
  carregarClientesSupabase, 
  salvarClienteDb,
  alternarTipoEntregaDb 
} from '../../lib/encomendasService';
import { Encomenda, Produto, ItemEncomenda, TipoEntrega, MetodoPagamento, Cliente } from '../../types';
import { useTranslation } from '../../lib/i18n';
import { 
  ShoppingBag, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Printer, 
  CheckCircle2, 
  Clock, 
  Truck, 
  Store, 
  Users, 
  Edit3, 
  ArrowRightLeft,
  Calendar,
  Phone,
  MapPin,
  X
} from 'lucide-react';

export default function EncomendasPage() {
  const { t, language } = useTranslation();
  const [selectedLojaId, setSelectedLojaId] = useState<string>('todas');
  const [activeTab, setActiveTab] = useState<'novo' | 'clientes' | 'historico'>('novo');

  // Dados Globais
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>(PRODUTOS_MOCK);
  const [carregando, setCarregando] = useState(true);

  // Estados do Formulário de Novo Pedido
  const [carrinho, setCarrinho] = useState<ItemEncomenda[]>([]);
  const [nomeCliente, setNomeCliente] = useState('');
  const [telefoneCliente, setTelefoneCliente] = useState('');
  const [moradaCliente, setMoradaCliente] = useState('');
  const [notasEntrega, setNotasEntrega] = useState('');
  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega>('levantamento_loja');
  const [dataAgendamento, setDataAgendamento] = useState(new Date().toISOString().split('T')[0]);
  const [horaAgendamento, setHoraAgendamento] = useState('10:00');
  const [metodoPagamento, setMetodoPagamento] = useState<MetodoPagamento>('multibanco');
  const [estadoPagamento, setEstadoPagamento] = useState<'pendente' | 'pago'>('pendente');
  const [notasGerais, setNotasGerais] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState<'todas' | 'padaria' | 'pastelaria'>('todas');
  const [buscaProduto, setBuscaProduto] = useState('');
  const [aGravar, setAGravar] = useState(false);

  // Modal de Talão
  const [encomendaParaImprimir, setEncomendaParaImprimir] = useState<Encomenda | null>(null);

  // Modal de Edição de Cliente
  const [clienteModal, setClienteModal] = useState<Partial<Cliente> | null>(null);
  const [buscaCliente, setBuscaCliente] = useState('');

  // Carregamento Inicial
  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      const [encs, clis] = await Promise.all([
        carregarEncomendasSupabase(),
        carregarClientesSupabase(),
      ]);
      setEncomendas(encs);
      setClientes(clis);
      setCarregando(false);
    }
    carregar();
  }, []);

  const lojaAtual = LOJAS_MOCK.find((l) => l.id === selectedLojaId) || LOJAS_MOCK[0];

  // Pesquisa automática de cliente no formulário de pedido
  const handleTelefoneChange = async (tel: string) => {
    setTelefoneCliente(tel);
    if (!supabase || tel.trim().length < 9) return;
    try {
      const { data: cli } = await supabase
        .from('clientes')
        .select('*')
        .eq('telefone', tel.trim())
        .maybeSingle();

      if (cli) {
        setNomeCliente(cli.nome);
        if (cli.morada) setMoradaCliente(cli.morada);
        if (cli.notas_entrega) setNotasEntrega(cli.notas_entrega);
      }
    } catch (e) {
      console.warn('Erro ao pesquisar cliente:', e);
    }
  };

  // Funções do Carrinho
  const adicionarAoCarrinho = (prod: Produto) => {
    setCarrinho((prev) => {
      const existente = prev.find((item) => item.produto_id === prod.id);
      if (existente) {
        return prev.map((item) =>
          item.produto_id === prod.id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          id: `item-${Date.now()}-${Math.random()}`,
          encomenda_id: '',
          produto_id: prod.id,
          produto_nome: prod.nome,
          setor: prod.categoria === 'padaria' ? 'padaria' : 'pastelaria',
          quantidade: 1,
          preco_unitario: prod.preco,
          estado_producao: 'pendente',
          notas_personalizacao: '',
        },
      ];
    });
  };

  const alterarQuantidade = (itemId: string, delta: number) => {
    setCarrinho((prev) =>
      prev
        .map((item) => {
          if (item.id === itemId) {
            const nova = item.quantidade + delta;
            return nova > 0 ? { ...item, quantidade: nova } : null;
          }
          return item;
        })
        .filter(Boolean) as ItemEncomenda[]
    );
  };

  const atualizarNotaItem = (itemId: string, nota: string) => {
    setCarrinho((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, notas_personalizacao: nota } : i))
    );
  };

  const totalCarrinho = carrinho.reduce(
    (acc, curr) => acc + curr.quantidade * curr.preco_unitario,
    0
  );

  // Submeter Encomenda
  const handleGravarEncomenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeCliente || !telefoneCliente) {
      alert('Por favor, indica pelo menos o nome e o telefone do cliente.');
      return;
    }
    if (carrinho.length === 0) {
      alert('Adiciona pelo menos um produto à encomenda.');
      return;
    }

    setAGravar(true);

    try {
      let clienteId = null;
      const codigoGerado = `ENC-${lojaAtual.codigo}-${Math.floor(1000 + Math.random() * 9000)}`;
      const encomendaId = `enc-${Date.now()}`;

      if (supabase) {
        // 1. Guardar ou Atualizar Cliente
        const { data: cliExistente } = await supabase
          .from('clientes')
          .select('id')
          .eq('telefone', telefoneCliente.trim())
          .maybeSingle();

        if (cliExistente) {
          clienteId = cliExistente.id;
          const updates: any = { nome: nomeCliente.trim() };
          if (tipoEntrega === 'entrega_domicilio') {
            updates.morada = moradaCliente.trim() || null;
            updates.notas_entrega = notasEntrega.trim() || null;
          }
          await supabase.from('clientes').update(updates).eq('id', clienteId);
        } else {
          const { data: novoCli } = await supabase
            .from('clientes')
            .insert({
              nome: nomeCliente.trim(),
              telefone: telefoneCliente.trim(),
              morada: tipoEntrega === 'entrega_domicilio' ? moradaCliente.trim() : null,
              notas_entrega: tipoEntrega === 'entrega_domicilio' ? notasEntrega.trim() : null,
            })
            .select('id')
            .single();
          if (novoCli) clienteId = novoCli.id;
        }

        // 2. Resolver UUID da Loja e Carrinha
        const { data: lojaDb } = await supabase
          .from('lojas')
          .select('id')
          .eq('codigo', lojaAtual.codigo)
          .maybeSingle();

        const lojaIdFinal = lojaDb?.id || lojaAtual.id;

        let carrinhaIdFinal: string | null = null;
        if (tipoEntrega === 'entrega_domicilio') {
          const { data: carDb } = await supabase
            .from('carrinhas')
            .select('id')
            .eq('loja_id', lojaIdFinal)
            .limit(1)
            .maybeSingle();
          if (carDb) carrinhaIdFinal = carDb.id;
        }

        // 3. Inserir Encomenda
        const { data: encDb, error: errEnc } = await supabase
          .from('encomendas')
          .insert({
            codigo: codigoGerado,
            loja_id: lojaIdFinal,
            cliente_id: clienteId,
            tipo: tipoEntrega,
            carrinha_id: carrinhaIdFinal,
            data_agendamento: dataAgendamento,
            hora_agendamento: horaAgendamento,
            estado: 'pendente',
            estado_pagamento: estadoPagamento,
            metodo_pagamento: metodoPagamento,
            total: totalCarrinho,
            notas_cliente: notasGerais.trim() || null,
          })
          .select('id, codigo')
          .single();

        if (errEnc) throw errEnc;

        // 4. Inserir Itens
        if (encDb) {
          const itensPayload = carrinho.map((item) => ({
            encomenda_id: encDb.id,
            produto_id: item.produto_id,
            setor: item.setor,
            quantidade: item.quantidade,
            preco_unitario: item.preco_unitario,
            notas_personalizacao: item.notas_personalizacao || null,
            estado_producao: 'pendente',
          }));

          await supabase.from('itens_encomenda').insert(itensPayload);
        }
      }

      // Criar Objeto Local para Impressão Imediata
      const novaEncomenda: Encomenda = {
        id: encomendaId,
        numero_sequencial: encomendas.length + 1,
        codigo: codigoGerado,
        loja_id: lojaAtual.id,
        loja_nome: lojaAtual.nome,
        cliente: {
          id: clienteId || `cli-${Date.now()}`,
          nome: nomeCliente.trim(),
          telefone: telefoneCliente.trim(),
          morada: tipoEntrega === 'entrega_domicilio' ? moradaCliente.trim() : undefined,
          notas_entrega: tipoEntrega === 'entrega_domicilio' ? notasEntrega.trim() : undefined,
        },
        tipo: tipoEntrega,
        data_agendamento: dataAgendamento,
        hora_agendamento: horaAgendamento,
        estado: 'pendente',
        estado_pagamento: estadoPagamento,
        metodo_pagamento: metodoPagamento,
        total: totalCarrinho,
        notas_cliente: notasGerais.trim() || undefined,
        itens: [...carrinho],
        criado_em: new Date().toISOString(),
      };

      setEncomendas((prev) => [novaEncomenda, ...prev]);
      setEncomendaParaImprimir(novaEncomenda);

      // Limpar Formulário
      setCarrinho([]);
      setNomeCliente('');
      setTelefoneCliente('');
      setMoradaCliente('');
      setNotasEntrega('');
      setNotasGerais('');

      // Recarregar Clientes
      const clisAtualizados = await carregarClientesSupabase();
      setClientes(clisAtualizados);
    } catch (err: any) {
      console.error('Erro ao registar encomenda:', err);
      alert('Erro ao guardar encomenda: ' + err.message);
    } finally {
      setAGravar(false);
    }
  };

  // Guardar Cliente (Modal)
  const handleSalvarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteModal || !clienteModal.nome || !clienteModal.telefone) {
      alert('Nome e telefone são obrigatórios.');
      return;
    }

    const salvo = await salvarClienteDb({
      id: clienteModal.id,
      nome: clienteModal.nome,
      telefone: clienteModal.telefone,
      email: clienteModal.email,
      morada: clienteModal.morada,
      codigo_postal: clienteModal.codigo_postal,
      notas_entrega: clienteModal.notas_entrega,
    });

    if (salvo) {
      const lista = await carregarClientesSupabase();
      setClientes(lista);
      setClienteModal(null);
    }
  };

  // Alternar Tipo de Entrega na Lista de Encomendas
  const handleAlternarEntrega = async (enc: Encomenda) => {
    const novoTipo: TipoEntrega = 
      enc.tipo === 'levantamento_loja' ? 'entrega_domicilio' : 'levantamento_loja';

    const confirmMsg = novoTipo === 'entrega_domicilio'
      ? `Deseja converter a encomenda ${enc.codigo} em ENTREGA AO DOMICÍLIO?`
      : `Deseja converter a encomenda ${enc.codigo} em LEVANTAMENTO EM LOJA?`;

    if (!window.confirm(confirmMsg)) return;

    let moradaDestino = enc.cliente.morada;
    if (novoTipo === 'entrega_domicilio' && !moradaDestino) {
      const inputMorada = window.prompt('Indique a morada de entrega para esta encomenda:', '');
      if (!inputMorada || !inputMorada.trim()) {
        alert('A morada de entrega é obrigatória para entrega ao domicílio.');
        return;
      }
      moradaDestino = inputMorada.trim();
      if (supabase && enc.cliente.id) {
        await supabase.from('clientes').update({ morada: moradaDestino }).eq('id', enc.cliente.id);
      }
    }

    const sucesso = await alternarTipoEntregaDb(enc.id, novoTipo, enc.loja_id);
    if (sucesso) {
      setEncomendas((prev) =>
        prev.map((e) =>
          e.id === enc.id
            ? { 
                ...e, 
                tipo: novoTipo, 
                cliente: { ...e.cliente, morada: moradaDestino || e.cliente.morada } 
              }
            : e
        )
      );
    }
  };

  // Pré-preencher formulário com cliente selecionado
  const handleCriarPedidoParaCliente = (cli: Cliente) => {
    setNomeCliente(cli.nome);
    setTelefoneCliente(cli.telefone);
    if (cli.morada) setMoradaCliente(cli.morada);
    if (cli.notas_entrega) setNotasEntrega(cli.notas_entrega);
    setActiveTab('novo');
  };

  // Filtros de Produtos
  const produtosFiltrados = produtos.filter((p) => {
    const matchCat = categoriaAtiva === 'todas' || p.categoria === categoriaAtiva;
    const matchBusca = p.nome.toLowerCase().includes(buscaProduto.toLowerCase());
    return matchCat && matchBusca;
  });

  // Filtros de Clientes
  const clientesFiltrados = clientes.filter((c) => {
    const termo = buscaCliente.toLowerCase();
    return (
      c.nome.toLowerCase().includes(termo) ||
      c.telefone.includes(termo) ||
      (c.morada && c.morada.toLowerCase().includes(termo))
    );
  });

  // Filtros de Encomendas
  const encomendasFiltradas = selectedLojaId === 'todas'
    ? encomendas
    : encomendas.filter((e) => e.loja_id === selectedLojaId);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/70">
      <Navbar selectedLojaId={selectedLojaId} onSelectLoja={setSelectedLojaId} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:px-6">
        {/* Barra Superior com Título e Seletor de Abas */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2">
              <ShoppingBag className="h-6 w-6 text-bakery-600" />
              {t.navEncomendas}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              Registo rápido, gestão de contactos de clientes e histórico de pedidos.
            </p>
          </div>

          {/* Abas Principais */}
          <div className="flex bg-white p-1 rounded-2xl border border-gray-200 shadow-2xs">
            <button
              onClick={() => setActiveTab('novo')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'novo'
                  ? 'bg-bakery-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Plus className="h-4 w-4" />
              {t.newOrder}
            </button>
            <button
              onClick={() => setActiveTab('clientes')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'clientes'
                  ? 'bg-bakery-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="h-4 w-4" />
              {t.clientManagement} ({clientes.length})
            </button>
            <button
              onClick={() => setActiveTab('historico')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'historico'
                  ? 'bg-bakery-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Clock className="h-4 w-4" />
              {t.ordersHistory} ({encomendasFiltradas.length})
            </button>
          </div>
        </div>

        {/* ----------------- ABA 1: NOVO PEDIDO (BALCÃO) ----------------- */}
        {activeTab === 'novo' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Coluna Esquerda: Catálogo de Produtos */}
            <div className="lg:col-span-7 space-y-4">
              {/* Pesquisa e Filtros de Categoria */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={buscaProduto}
                    onChange={(e) => setBuscaProduto(e.target.value)}
                    placeholder="Pesquisar pão, bolo, pastel..."
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-hidden focus:border-bakery-500"
                  />
                </div>

                <div className="flex gap-1.5 overflow-x-auto">
                  {(['todas', 'padaria', 'pastelaria'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoriaAtiva(cat)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition shrink-0 ${
                        categoriaAtiva === cat
                          ? 'bg-bakery-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cat === 'todas' ? 'Todos' : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grelha de Produtos */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {produtosFiltrados.map((prod) => (
                  <button
                    key={prod.id}
                    onClick={() => adicionarAoCarrinho(prod)}
                    className="flex flex-col text-left p-3.5 rounded-2xl bg-white border border-gray-200 shadow-2xs hover:border-bakery-400 hover:shadow-xs transition group"
                  >
                    <span className="text-xl mb-1">
                      {prod.categoria === 'padaria' ? '🥖' : '🎂'}
                    </span>
                    <h4 className="text-xs font-bold text-gray-900 group-hover:text-bakery-700 line-clamp-2">
                      {prod.nome}
                    </h4>
                    <span className="text-xs font-black text-bakery-700 mt-auto pt-2">
                      {prod.preco.toFixed(2)} €
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Coluna Direita: Dados do Pedido & Carrinho */}
            <div className="lg:col-span-5 space-y-4">
              <form onSubmit={handleGravarEncomenda} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                {/* Tipo de Entrega */}
                <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setTipoEntrega('levantamento_loja')}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition ${
                      tipoEntrega === 'levantamento_loja'
                        ? 'bg-white text-gray-900 shadow-2xs'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <Store className="h-4 w-4 text-bakery-600" />
                    {t.pickupStore}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoEntrega('entrega_domicilio')}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition ${
                      tipoEntrega === 'entrega_domicilio'
                        ? 'bg-white text-gray-900 shadow-2xs'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <Truck className="h-4 w-4 text-blue-600" />
                    {t.deliveryHome}
                  </button>
                </div>

                {/* Cliente: Telefone e Nome */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      {t.phone} (Pesquisa Auto)
                    </label>
                    <input
                      type="tel"
                      required
                      value={telefoneCliente}
                      onChange={(e) => handleTelefoneChange(e.target.value)}
                      placeholder="9xxxxxxxx"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-hidden focus:border-bakery-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      {t.client}
                    </label>
                    <input
                      type="text"
                      required
                      value={nomeCliente}
                      onChange={(e) => setNomeCliente(e.target.value)}
                      placeholder="Nome do cliente"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-hidden focus:border-bakery-500"
                    />
                  </div>
                </div>

                {/* Campos Específicos para Entrega ao Domicílio */}
                {tipoEntrega === 'entrega_domicilio' && (
                  <div className="space-y-3 bg-blue-50/60 p-3 rounded-xl border border-blue-200">
                    <div>
                      <label className="block text-[11px] font-bold text-blue-950 mb-1 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-red-500" />
                        {t.deliveryAddress} *
                      </label>
                      <input
                        type="text"
                        required
                        value={moradaCliente}
                        onChange={(e) => setMoradaCliente(e.target.value)}
                        placeholder="Rua, Número, Andar / Código Postal"
                        className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-blue-200 focus:outline-hidden focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-blue-950 mb-1">
                        {t.accessNotes}
                      </label>
                      <input
                        type="text"
                        value={notasEntrega}
                        onChange={(e) => setNotasEntrega(e.target.value)}
                        placeholder="Portão verde, código do prédio, etc."
                        className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-blue-200 focus:outline-hidden focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                {/* Agendamento: Data e Hora */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      {t.date}
                    </label>
                    <input
                      type="date"
                      value={dataAgendamento}
                      onChange={(e) => setDataAgendamento(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      {t.time}
                    </label>
                    <input
                      type="time"
                      value={horaAgendamento}
                      onChange={(e) => setHoraAgendamento(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Lista de Itens no Carrinho */}
                <div className="border-t border-gray-100 pt-3">
                  <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">
                    {t.itemsInCart} ({carrinho.length})
                  </h4>

                  {carrinho.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-3 text-center">
                      {t.cartEmpty}
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {carrinho.map((item) => (
                        <div key={item.id} className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-xs space-y-1.5">
                          <div className="flex items-center justify-between font-bold text-gray-900">
                            <span>{item.produto_nome}</span>
                            <span>{(item.quantidade * item.preco_unitario).toFixed(2)} €</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => alterarQuantidade(item.id, -1)}
                                className="h-6 w-6 rounded-md bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="font-black text-xs">{item.quantidade}</span>
                              <button
                                type="button"
                                onClick={() => alterarQuantidade(item.id, 1)}
                                className="h-6 w-6 rounded-md bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>

                            <input
                              type="text"
                              value={item.notas_personalizacao || ''}
                              onChange={(e) => atualizarNotaItem(item.id, e.target.value)}
                              placeholder="Personalização (frase no bolo, etc.)"
                              className="w-44 text-[11px] px-2 py-1 bg-white border border-gray-200 rounded-md"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pagamento e Total */}
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">{t.paymentMethod}:</span>
                    <select
                      value={metodoPagamento}
                      onChange={(e) => setMetodoPagamento(e.target.value as MetodoPagamento)}
                      className="text-xs font-bold border border-gray-200 rounded-lg px-2 py-1 bg-white"
                    >
                      <option value="multibanco">Multibanco</option>
                      <option value="dinheiro">Dinheiro</option>
                      <option value="mbway">MBWay</option>
                      <option value="transferencia">Transferência</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Cobrança:</span>
                    <button
                      type="button"
                      onClick={() => setEstadoPagamento(estadoPagamento === 'pago' ? 'pendente' : 'pago')}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition ${
                        estadoPagamento === 'pago'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}
                    >
                      {estadoPagamento === 'pago' ? t.paid : t.toPay}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-base font-black text-gray-900 pt-2 border-t border-gray-100">
                    <span>{t.total}:</span>
                    <span className="text-xl text-bakery-700">{totalCarrinho.toFixed(2)} €</span>
                  </div>
                </div>

                {/* Botão Submeter */}
                <button
                  type="submit"
                  disabled={aGravar || carrinho.length === 0}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-bakery-600 text-white font-black text-sm shadow-md hover:bg-bakery-700 disabled:opacity-50 transition"
                >
                  <Printer className="h-4 w-4" />
                  {aGravar ? 'A registar...' : t.registerOrder}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ----------------- ABA 2: GESTÃO DE CLIENTES ----------------- */}
        {activeTab === 'clientes' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={buscaCliente}
                  onChange={(e) => setBuscaCliente(e.target.value)}
                  placeholder="Pesquisar por nome, telefone ou morada..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-hidden"
                />
              </div>

              <button
                type="button"
                onClick={() => setClienteModal({ nome: '', telefone: '', morada: '', notas_entrega: '' })}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-bakery-600 text-white text-xs font-bold shadow-xs hover:bg-bakery-700 transition"
              >
                <Plus className="h-4 w-4" />
                {t.newClient}
              </button>
            </div>

            {/* Tabela de Clientes */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3.5">{t.client}</th>
                      <th className="p-3.5">{t.phone}</th>
                      <th className="p-3.5">{t.address}</th>
                      <th className="p-3.5">{t.notes}</th>
                      <th className="p-3.5 text-right">{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                    {clientesFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-gray-400 italic">
                          Nenhum cliente encontrado.
                        </td>
                      </tr>
                    ) : (
                      clientesFiltrados.map((cli) => (
                        <tr key={cli.id} className="hover:bg-gray-50/80 transition">
                          <td className="p-3.5 font-bold text-gray-900">{cli.nome}</td>
                          <td className="p-3.5 font-mono">{cli.telefone}</td>
                          <td className="p-3.5 text-gray-600">
                            {cli.morada || <span className="text-gray-300 italic">Sem morada</span>}
                          </td>
                          <td className="p-3.5 text-gray-500 italic max-w-xs truncate">
                            {cli.notas_entrega || '-'}
                          </td>
                          <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => handleSalvarCliente}
                              onClickCapture={() => setClienteModal(cli)}
                              className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[11px] transition"
                            >
                              {t.edit}
                            </button>
                            <button
                              onClick={() => handleCriarPedidoParaCliente(cli)}
                              className="px-2.5 py-1 rounded-lg bg-bakery-50 hover:bg-bakery-100 text-bakery-700 font-bold text-[11px] border border-bakery-200 transition"
                            >
                              + Pedido
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- ABA 3: HISTÓRICO DE ENCOMENDAS ----------------- */}
        {activeTab === 'historico' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {encomendasFiltradas.map((enc) => (
                <div
                  key={enc.id}
                  className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono font-bold text-xs text-gray-600">{enc.codigo}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        enc.tipo === 'entrega_domicilio'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        {enc.tipo === 'entrega_domicilio' ? t.deliveryHome : t.pickupStore}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-gray-900">{enc.cliente.nome}</h4>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3" /> {enc.cliente.telefone}
                    </p>

                    {enc.tipo === 'entrega_domicilio' && enc.cliente.morada && (
                      <p className="text-xs text-gray-700 mt-1 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                        <MapPin className="h-3 w-3 inline mr-1 text-red-500" />
                        {enc.cliente.morada}
                      </p>
                    )}

                    <div className="text-xs text-gray-600 mt-2 flex items-center justify-between">
                      <span>{enc.data_agendamento} às {enc.hora_agendamento}</span>
                      <span className="font-black text-sm text-gray-900">{enc.total.toFixed(2)} €</span>
                    </div>
                  </div>

                  {/* Ações da Encomenda */}
                  <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setEncomendaParaImprimir(enc)}
                      className="flex items-center justify-center gap-1 py-2 rounded-xl bg-gray-100 text-gray-800 hover:bg-gray-200 transition"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Talão
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAlternarEntrega(enc)}
                      className="flex items-center justify-center gap-1 py-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition text-[11px]"
                      title="Mudar entre Entrega ao Domicílio e Levantamento em Loja"
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                      Mudar Tipo
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL DE EDIÇÃO DE CLIENTE */}
      {clienteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-bakery-600" />
                {clienteModal.id ? t.editClient : t.newClient}
              </h3>
              <button onClick={() => setClienteModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarCliente} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">{t.client} *</label>
                <input
                  type="text"
                  required
                  value={clienteModal.nome || ''}
                  onChange={(e) => setClienteModal({ ...clienteModal, nome: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">{t.phone} *</label>
                <input
                  type="tel"
                  required
                  value={clienteModal.telefone || ''}
                  onChange={(e) => setClienteModal({ ...clienteModal, telefone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">{t.deliveryAddress}</label>
                <input
                  type="text"
                  value={clienteModal.morada || ''}
                  onChange={(e) => setClienteModal({ ...clienteModal, morada: e.target.value })}
                  placeholder="Rua, número, andar, localidade"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">{t.accessNotes}</label>
                <textarea
                  rows={2}
                  value={clienteModal.notas_entrega || ''}
                  onChange={(e) => setClienteModal({ ...clienteModal, notas_entrega: e.target.value })}
                  placeholder="Instruções para o estafeta ou balcão"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setClienteModal(null)}
                  className="px-3.5 py-2 rounded-xl bg-gray-100 font-bold text-gray-700 hover:bg-gray-200 transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-bakery-600 font-bold text-white shadow-xs hover:bg-bakery-700 transition"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DO TALÃO TÉRMICO */}
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
