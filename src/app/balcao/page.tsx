'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '../../components/Navbar';
import { ThermalReceipt } from '../../components/ThermalReceipt';
import { 
  LOJAS_MOCK, 
  PRODUTOS_MOCK, 
  ENCOMENDAS_INICIAIS, 
  CARRINHAS_MOCK 
} from '../../lib/mockData';
import { supabase } from '../../lib/supabase';
import { carregarEncomendasSupabase } from '../../lib/encomendasService';
import { 
  Produto, 
  ItemEncomenda, 
  Encomenda, 
  TipoEntrega, 
  CategoriaProduto,
  MetodoPagamento,
  EstadoPagamento 
} from '../../types';
import { 
  Plus, 
  Minus, 
  Trash2, 
  Printer, 
  Phone, 
  MapPin, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Search, 
  Store,
  Sparkles,
  ShoppingBag,
  Loader2
} from 'lucide-react';

export default function BalcaoPage() {
  const [selectedLojaId, setSelectedLojaId] = useState<string>('loja-1');
  const [encomendas, setEncomendas] = useState<Encomenda[]>(ENCOMENDAS_INICIAIS);
  const [produtos, setProdutos] = useState<Produto[]>(PRODUTOS_MOCK);
  const [aGravar, setAGravar] = useState(false);

  // Formulário do Cliente
  const [nomeCliente, setNomeCliente] = useState('');
  const [telefoneCliente, setTelefoneCliente] = useState('');
  const [moradaCliente, setMoradaCliente] = useState('');
  const [notasEntrega, setNotasEntrega] = useState('');

  // Configuração da Encomenda
  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega>('levantamento_loja');
  const [carrinhaId, setCarrinhaId] = useState<string>('car-1');
  const [dataAgendamento, setDataAgendamento] = useState(() => {
    const hoje = new Date();
    return hoje.toISOString().split('T')[0];
  });
  const [horaAgendamento, setHoraAgendamento] = useState('10:00');
  const [estadoPagamento, setEstadoPagamento] = useState<EstadoPagamento>('pendente');
  const [metodoPagamento, setMetodoPagamento] = useState<MetodoPagamento>('multibanco');
  const [notasGerais, setNotasGerais] = useState('');

  // Carrinho de Itens
  const [carrinho, setCarrinho] = useState<ItemEncomenda[]>([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState<CategoriaProduto | 'todas'>('todas');
  const [buscaProduto, setBuscaProduto] = useState('');

  // Estado para Talão de Impressão
  const [encomendaParaImprimir, setEncomendaParaImprimir] = useState<Encomenda | null>(null);

  const lojaAtual = LOJAS_MOCK.find((l) => l.id === selectedLojaId) || LOJAS_MOCK[0];
  const carrinhasDaLoja = CARRINHAS_MOCK.filter((c) => c.loja_id === selectedLojaId);

  // Carregar produtos e encomendas reais da base de dados Supabase
  useEffect(() => {
    async function carregarDadosIniciais() {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from('produtos')
          .select('*')
          .eq('ativo', true);

        if (!error && data && data.length > 0) {
          setProdutos(data);
        }

        const encsReais = await carregarEncomendasSupabase();
        setEncomendas(encsReais);
      } catch (e) {
        console.warn('Dados locais em uso:', e);
      }
    }
    carregarDadosIniciais();
  }, []);

  // Pesquisa automática de cliente por telefone
  const handleTelefoneChange = async (tel: string) => {
    setTelefoneCliente(tel);
    if (!supabase || tel.trim().length < 9) return;
    try {
      const { data: cliente } = await supabase
        .from('clientes')
        .select('*')
        .eq('telefone', tel.trim())
        .maybeSingle();

      if (cliente) {
        setNomeCliente(cliente.nome);
        if (cliente.morada) setMoradaCliente(cliente.morada);
        if (cliente.notas_entrega) setNotasEntrega(cliente.notas_entrega);
      }
    } catch (e) {
      console.warn('Erro ao pesquisar cliente:', e);
    }
  };

  // Filtragem de Produtos
  const produtosFiltrados = produtos.filter((p) => {
    const matchCat = categoriaAtiva === 'todas' || p.categoria === categoriaAtiva;
    const matchBusca = p.nome.toLowerCase().includes(buscaProduto.toLowerCase());
    return matchCat && matchBusca;
  });

  // Adicionar Produto ao Carrinho
  const adicionarAoCarrinho = (produto: Produto) => {
    setCarrinho((prev) => {
      const existente = prev.find((item) => item.produto_id === produto.id);
      if (existente) {
        return prev.map((item) =>
          item.produto_id === produto.id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          id: `item-${Date.now()}-${Math.random()}`,
          encomenda_id: '',
          produto_id: produto.id,
          produto_nome: produto.nome,
          setor: produto.categoria === 'padaria' ? 'padaria' : 'pastelaria',
          quantidade: 1,
          preco_unitario: produto.preco,
          estado_producao: 'pendente',
          notas_personalizacao: '',
        },
      ];
    });
  };

  // Alterar Quantidade
  const alterarQuantidade = (itemId: string, delta: number) => {
    setCarrinho((prev) =>
      prev
        .map((item) => {
          if (item.id === itemId) {
            const novaQtd = item.quantidade + delta;
            return novaQtd > 0 ? { ...item, quantidade: novaQtd } : null;
          }
          return item;
        })
        .filter(Boolean) as ItemEncomenda[]
    );
  };

  // Atualizar Nota de Personalização
  const atualizarNotaItem = (itemId: string, nota: string) => {
    setCarrinho((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, notas_personalizacao: nota } : item
      )
    );
  };

  // Total do Carrinho
  const totalCarrinho = carrinho.reduce(
    (acc, curr) => acc + curr.quantidade * curr.preco_unitario,
    0
  );

  // Submeter Encomenda (grava no Supabase e abre talão)
  const handleGravarEncomenda = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nomeCliente || !telefoneCliente) {
      alert('Por favor, indica pelo menos o nome e telefone do cliente.');
      return;
    }

    if (carrinho.length === 0) {
      alert('Adiciona pelo menos um produto à encomenda.');
      return;
    }

    setAGravar(true);

    try {
      let clienteId = null;
      let codigoGerado = `ENC-${lojaAtual.codigo}-${Math.floor(1000 + Math.random() * 9000)}`;
      let encomendaId = `enc-${Date.now()}`;

      if (supabase) {
        // 1. Verificar ou Criar Cliente
        const { data: cliExistente } = await supabase
          .from('clientes')
          .select('id')
          .eq('telefone', telefoneCliente.trim())
          .maybeSingle();

        if (cliExistente) {
          clienteId = cliExistente.id;
        } else {
          const { data: novoCli, error: errCli } = await supabase
            .from('clientes')
            .insert({
              nome: nomeCliente.trim(),
              telefone: telefoneCliente.trim(),
              morada: tipoEntrega === 'entrega_domicilio' ? moradaCliente.trim() : null,
              notas_entrega: tipoEntrega === 'entrega_domicilio' ? notasEntrega.trim() : null,
            })
            .select('id')
            .single();

          if (errCli) {
            console.error('Erro ao guardar cliente:', errCli);
          } else if (novoCli) {
            clienteId = novoCli.id;
          }
        }

        // 2. Obter UUID da loja na base de dados
        const { data: lojaDb } = await supabase
          .from('lojas')
          .select('id')
          .eq('codigo', lojaAtual.codigo)
          .maybeSingle();

        const lojaIdFinal = lojaDb?.id || lojaAtual.id;

        // 3. Inserir Encomenda
        const { data: encDb, error: errEnc } = await supabase
          .from('encomendas')
          .insert({
            codigo: codigoGerado,
            loja_id: lojaIdFinal,
            cliente_id: clienteId,
            tipo: tipoEntrega,
            carrinha_id: null,
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

        if (errEnc) {
          console.error('Erro ao guardar encomenda:', errEnc);
        } else if (encDb) {
          encomendaId = encDb.id;
          codigoGerado = encDb.codigo;

          // 4. Inserir Itens da Encomenda
          for (const item of carrinho) {
            let prodId = item.produto_id;
            // Se for ID de mock, encontrar o UUID real na tabela produtos pelo nome
            if (prodId.startsWith('prod-')) {
              const { data: pDb } = await supabase
                .from('produtos')
                .select('id')
                .eq('nome', item.produto_nome)
                .maybeSingle();
              if (pDb) prodId = pDb.id;
            }

            await supabase.from('itens_encomenda').insert({
              encomenda_id: encomendaId,
              produto_id: prodId,
              setor: item.setor,
              quantidade: item.quantidade,
              preco_unitario: item.preco_unitario,
              notas_personalizacao: item.notas_personalizacao?.trim() || null,
              estado_producao: 'pendente',
            });
          }
        }
      }

      const novaEncomenda: Encomenda = {
        id: encomendaId,
        numero_sequencial: encomendas.length + 101,
        codigo: codigoGerado,
        loja_id: lojaAtual.id,
        loja_nome: lojaAtual.nome,
        cliente: {
          id: clienteId || `cli-${Date.now()}`,
          nome: nomeCliente,
          telefone: telefoneCliente,
          morada: tipoEntrega === 'entrega_domicilio' ? moradaCliente : undefined,
          notas_entrega: tipoEntrega === 'entrega_domicilio' ? notasEntrega : undefined,
        },
        tipo: tipoEntrega,
        carrinha_id: tipoEntrega === 'entrega_domicilio' ? carrinhaId : undefined,
        carrinha_nome:
          tipoEntrega === 'entrega_domicilio'
            ? carrinhasDaLoja.find((c) => c.id === carrinhaId)?.identificador
            : undefined,
        data_agendamento: dataAgendamento,
        hora_agendamento: horaAgendamento,
        estado: 'pendente',
        estado_pagamento: estadoPagamento,
        metodo_pagamento: metodoPagamento,
        total: totalCarrinho,
        notas_cliente: notasGerais,
        itens: carrinho,
        criado_em: new Date().toISOString(),
      };

      setEncomendas((prev) => [novaEncomenda, ...prev]);
      setEncomendaParaImprimir(novaEncomenda);

      // Limpar formulário
      setNomeCliente('');
      setTelefoneCliente('');
      setMoradaCliente('');
      setNotasEntrega('');
      setNotasGerais('');
      setCarrinho([]);
    } catch (err: any) {
      console.error('Erro na submissão:', err);
      alert(`Aviso: ${err?.message || err}.`);
    } finally {
      setAGravar(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar selectedLojaId={selectedLojaId} onSelectLoja={setSelectedLojaId} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:px-6">
        {/* Cabeçalho da Página */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2">
              <ShoppingBag className="h-6 w-6 text-bakery-600" />
              Atendimento de Balcão & Telefone
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              Loja Selecionada: <span className="font-bold text-bakery-700">{lojaAtual.nome}</span> ({lojaAtual.morada})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" /> Impressora 80mm Pronta
            </span>
          </div>
        </div>

        {/* Layout Principal: 2 Colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* COLUNA ESQUERDA: Catálogo e Seleção (7 colunas) */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Detalhes do Cliente e Agendamento */}
            <div className="rounded-2xl bg-white p-5 border border-bakery-200 shadow-xs">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Phone className="h-4 w-4 text-bakery-600" /> 1. Cliente & Agendamento
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Telefone (Busca Rápida)</label>
                  <input
                    type="tel"
                    placeholder="912 345 678"
                    value={telefoneCliente}
                    onChange={(e) => handleTelefoneChange(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-bakery-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nome do Cliente</label>
                  <input
                    type="text"
                    placeholder="Nome completo"
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-bakery-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Toggle de Tipo de Entrega */}
              <div className="mt-4 pt-3 border-t border-gray-100">
                <label className="block text-xs font-semibold text-gray-600 mb-2">Modalidade de Encomenda</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTipoEntrega('levantamento_loja')}
                    className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-bold border transition ${
                      tipoEntrega === 'levantamento_loja'
                        ? 'border-bakery-600 bg-bakery-50 text-bakery-800'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Store className="h-4 w-4" /> Levantamento no Balcão
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoEntrega('entrega_domicilio')}
                    className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-bold border transition ${
                      tipoEntrega === 'entrega_domicilio'
                        ? 'border-blue-600 bg-blue-50 text-blue-800'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <MapPin className="h-4 w-4" /> Entrega ao Domicílio
                  </button>
                </div>
              </div>

              {/* Campos adicionais se for Entrega */}
              {tipoEntrega === 'entrega_domicilio' && (
                <div className="mt-4 rounded-xl bg-blue-50/60 p-4 border border-blue-100 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-blue-900 mb-1">Morada de Entrega</label>
                    <input
                      type="text"
                      placeholder="Rua, Número, Andar / Porta"
                      value={moradaCliente}
                      onChange={(e) => setMoradaCliente(e.target.value)}
                      className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-blue-900 mb-1">Carrinha da Loja Afeta</label>
                      <select
                        value={carrinhaId}
                        onChange={(e) => setCarrinhaId(e.target.value)}
                        className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-900 focus:outline-hidden"
                      >
                        {carrinhasDaLoja.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.identificador} ({c.matricula})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-blue-900 mb-1">Obs. de Entrega (Campainha, etc.)</label>
                      <input
                        type="text"
                        placeholder="ex: Ligar ao chegar"
                        value={notasEntrega}
                        onChange={(e) => setNotasEntrega(e.target.value)}
                        className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Data e Hora de Prontidão */}
              <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> Data de Saída
                  </label>
                  <input
                    type="date"
                    value={dataAgendamento}
                    onChange={(e) => setDataAgendamento(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-bakery-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Hora de Prontidão
                  </label>
                  <input
                    type="time"
                    value={horaAgendamento}
                    onChange={(e) => setHoraAgendamento(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-bakery-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* 2. Catálogo de Produtos Rápido */}
            <div className="rounded-2xl bg-white p-5 border border-bakery-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-bakery-600" /> 2. Escolher Produtos
                </h3>
                {/* Campo de Busca */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Pesquisar pão, bolo..."
                    value={buscaProduto}
                    onChange={(e) => setBuscaProduto(e.target.value)}
                    className="w-full sm:w-48 rounded-xl border border-gray-200 pl-8 pr-3 py-1.5 text-xs focus:border-bakery-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Filtros de Categoria */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                {(['todas', 'padaria', 'pastelaria', 'bebidas_outros'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoriaAtiva(cat)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                      categoriaAtiva === cat
                        ? 'bg-bakery-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat === 'todas'
                      ? 'Todos os Artigos'
                      : cat === 'padaria'
                      ? '🍞 Padaria'
                      : cat === 'pastelaria'
                      ? '🎂 Pastelaria'
                      : '🥤 Bebidas/Outros'}
                  </button>
                ))}
              </div>

              {/* Grelha de Produtos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                {produtosFiltrados.map((prod) => {
                  const noCarrinho = carrinho.find((i) => i.produto_id === prod.id);
                  return (
                    <div
                      key={prod.id}
                      onClick={() => adicionarAoCarrinho(prod)}
                      className="cursor-pointer group flex items-center justify-between rounded-xl border border-gray-200 p-3 hover:border-bakery-400 hover:bg-bakery-50/40 transition shadow-2xs"
                    >
                      <div>
                        <p className="text-xs font-bold text-gray-900 group-hover:text-bakery-700 transition">
                          {prod.nome}
                        </p>
                        <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                          {prod.preco.toFixed(2)} € / {prod.unidade}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {noCarrinho && (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-bakery-600 text-[11px] font-bold text-white">
                            {noCarrinho.quantidade}
                          </span>
                        )}
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-600 group-hover:bg-bakery-600 group-hover:text-white transition">
                          <Plus className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: Resumo da Encomenda & Gravação (5 colunas) */}
          <div className="lg:col-span-5">
            <div className="sticky top-20 rounded-2xl bg-white p-5 border border-bakery-300 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                  <h3 className="text-sm font-bold text-gray-900">Resumo da Encomenda</h3>
                  <span className="rounded-full bg-bakery-100 px-2.5 py-0.5 text-xs font-bold text-bakery-800">
                    {carrinho.length} {carrinho.length === 1 ? 'artigo' : 'artigos'}
                  </span>
                </div>

                {/* Lista de Artigos no Carrinho */}
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 mb-4">
                  {carrinho.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 py-8 italic">
                      Nenhum artigo adicionado ainda. Clica nos produtos à esquerda.
                    </p>
                  ) : (
                    carrinho.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-900">{item.produto_nome}</span>
                          <span className="font-bold text-bakery-700">
                            {(item.quantidade * item.preco_unitario).toFixed(2)} €
                          </span>
                        </div>

                        {/* Controles de Quantidade */}
                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => alterarQuantidade(item.id, -1)}
                              className="h-6 w-6 flex items-center justify-center rounded-md bg-white border border-gray-300 text-gray-600 hover:bg-gray-100"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="font-bold text-xs w-6 text-center">{item.quantidade}</span>
                            <button
                              type="button"
                              onClick={() => alterarQuantidade(item.id, 1)}
                              className="h-6 w-6 flex items-center justify-center rounded-md bg-white border border-gray-300 text-gray-600 hover:bg-gray-100"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                            Setor: {item.setor}
                          </span>
                        </div>

                        {/* Campo de Personalização (Crucial para Bolos de Pastelaria) */}
                        {item.setor === 'pastelaria' && (
                          <div className="pt-1">
                            <input
                              type="text"
                              placeholder="Personalização (ex: 'Parabéns Joana', ovos moles)"
                              value={item.notas_personalizacao || ''}
                              onChange={(e) => atualizarNotaItem(item.id, e.target.value)}
                              className="w-full rounded-lg border border-amber-300 bg-amber-50/40 px-2.5 py-1 text-[11px] text-amber-900 placeholder:text-amber-700/60 focus:border-amber-500 focus:outline-hidden"
                            />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Pagamento e Notas */}
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">Estado Pagamento</label>
                      <select
                        value={estadoPagamento}
                        onChange={(e) => setEstadoPagamento(e.target.value as EstadoPagamento)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs font-semibold text-gray-800"
                      >
                        <option value="pendente">A Pagar no Ato</option>
                        <option value="pago">Pago Imediatamente</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">Método Preferencial</label>
                      <select
                        value={metodoPagamento}
                        onChange={(e) => setMetodoPagamento(e.target.value as MetodoPagamento)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs font-semibold text-gray-800"
                      >
                        <option value="multibanco">Multibanco</option>
                        <option value="mbway">MBWay</option>
                        <option value="dinheiro">Dinheiro</option>
                        <option value="transferencia">Transferência</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Notas Gerais da Encomenda</label>
                    <input
                      type="text"
                      placeholder="ex: Cliente VIP, colocar saco extra"
                      value={notasGerais}
                      onChange={(e) => setNotasGerais(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-bakery-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Total e Botão de Impressão */}
              <div className="pt-5 mt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-gray-600">Total a Pagar:</span>
                  <span className="text-2xl font-black text-bakery-800">{totalCarrinho.toFixed(2)} €</span>
                </div>

                <button
                  type="button"
                  onClick={handleGravarEncomenda}
                  disabled={carrinho.length === 0 || aGravar}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-bakery-600 py-3.5 px-4 text-sm font-bold text-white shadow-md hover:bg-bakery-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {aGravar ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      A gravar na Base de Dados...
                    </>
                  ) : (
                    <>
                      <Printer className="h-5 w-5" />
                      Gravar & Imprimir Talão Térmico
                    </>
                  )}
                </button>
                <p className="text-center text-[11px] text-gray-400 mt-2">
                  Envia imediatamente para o KDS da Cozinha e Carrinhas da loja.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal do Talão Térmico de Impressão */}
        {encomendaParaImprimir && (
          <ThermalReceipt
            encomenda={encomendaParaImprimir}
            loja={lojaAtual}
            onClose={() => setEncomendaParaImprimir(null)}
          />
        )}
      </main>
    </div>
  );
}
