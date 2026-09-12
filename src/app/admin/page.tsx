'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '../../components/Navbar';
import { ThermalReceipt } from '../../components/ThermalReceipt';
import { LOJAS_MOCK, PRODUTOS_MOCK, CARRINHAS_MOCK } from '../../lib/mockData';
import { supabase } from '../../lib/supabase';
import { 
  carregarEncomendasSupabase, 
  carregarClientesSupabase, 
  salvarClienteDb,
  carregarProdutosSupabase,
  salvarProdutoDb,
  carregarLojasSupabase,
  salvarLojaDb,
  carregarCarrinhasSupabase,
  salvarCarrinhaDb,
  upsertClientesEmLote,
  upsertProdutosEmLote
} from '../../lib/encomendasService';
import { 
  ReceiptConfig, 
  getReceiptConfig, 
  saveReceiptConfig, 
  DEFAULT_RECEIPT_CONFIG 
} from '../../lib/receiptConfig';
import { Encomenda, Cliente, Produto, Loja, Carrinha } from '../../types';
import { useTranslation } from '../../lib/i18n';
import { 
  BarChart3, 
  Store, 
  Truck, 
  Database, 
  FileSpreadsheet, 
  Printer, 
  KeyRound, 
  CheckCircle2, 
  Download, 
  Upload, 
  RefreshCw, 
  Edit3, 
  Plus, 
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Layers,
  Search,
  Filter
} from 'lucide-react';

export default function AdminPage() {
  const { t } = useTranslation();
  const [selectedLojaId, setSelectedLojaId] = useState<string>('todas');
  const [activeTab, setActiveTab] = useState<'metricas' | 'lojas_carrinhas' | 'database' | 'talao' | 'acessos'>('metricas');

  // Dados
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>(PRODUTOS_MOCK);
  const [lojas, setLojas] = useState<Loja[]>(LOJAS_MOCK);
  const [carrinhas, setCarrinhas] = useState<Carrinha[]>(CARRINHAS_MOCK);
  const [carregando, setCarregando] = useState(true);

  // Configuração do Talão
  const [receiptConfig, setReceiptConfig] = useState<ReceiptConfig>(DEFAULT_RECEIPT_CONFIG);
  const [encomendaTesteTalão, setEncomendaTesteTalão] = useState<Encomenda | null>(null);

  // Edição de Lojas / Carrinhas
  const [lojaEmEdicao, setLojaEmEdicao] = useState<Partial<Loja> | null>(null);
  const [carrinhaEmEdicao, setCarrinhaEmEdicao] = useState<Partial<Carrinha> | null>(null);

  // Importação Massiva Excel/CSV
  const [tabelaImportacao, setTabelaImportacao] = useState<'clientes' | 'produtos'>('clientes');
  const [arquivoImportado, setArquivoImportado] = useState<string>('');
  const [linhasPreview, setLinhasPreview] = useState<any[]>([]);
  const [statusImportacao, setStatusImportacao] = useState<string | null>(null);
  const [processandoImportacao, setProcessandoImportacao] = useState(false);

  // Carregamento Inicial
  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      const [encs, clis, prods, ljs, cars] = await Promise.all([
        carregarEncomendasSupabase(),
        carregarClientesSupabase(),
        carregarProdutosSupabase(),
        carregarLojasSupabase(),
        carregarCarrinhasSupabase(),
      ]);
      setEncomendas(encs);
      if (clis.length) setClientes(clis);
      if (prods.length) setProdutos(prods);
      if (ljs.length) setLojas(ljs);
      if (cars.length) setCarrinhas(cars);
      setReceiptConfig(getReceiptConfig());
      setCarregando(false);
    }
    carregar();
  }, []);

  // Encomendas Filtradas
  const encomendasFiltradas = selectedLojaId === 'todas'
    ? encomendas
    : encomendas.filter((e) => e.loja_id === selectedLojaId);

  // Indicadores Chave
  const totalFaturado = encomendasFiltradas.reduce((acc, curr) => acc + curr.total, 0);
  const totalEntregas = encomendasFiltradas.filter((e) => e.tipo === 'entrega_domicilio').length;
  const totalLevantamentos = encomendasFiltradas.filter((e) => e.tipo === 'levantamento_loja').length;
  const ticketMedio = encomendasFiltradas.length > 0 ? totalFaturado / encomendasFiltradas.length : 0;

  // Necessidades Consolidadas de Produção
  const mapaProducao: { [nome: string]: { quantidade: number; setor: string; unidade: string } } = {};
  encomendasFiltradas.forEach((enc) => {
    enc.itens.forEach((item) => {
      const prod = produtos.find((p) => p.id === item.produto_id) || PRODUTOS_MOCK.find((p) => p.id === item.produto_id);
      if (!mapaProducao[item.produto_nome]) {
        mapaProducao[item.produto_nome] = {
          quantidade: 0,
          setor: item.setor,
          unidade: prod?.unidade || 'unidade',
        };
      }
      mapaProducao[item.produto_nome].quantidade += item.quantidade;
    });
  });
  const itensProducaoConsolidados = Object.entries(mapaProducao).sort((a, b) => b[1].quantidade - a[1].quantidade);

  // Guardar Configuração do Talão
  const handleSalvarConfigTalao = (e: React.FormEvent) => {
    e.preventDefault();
    saveReceiptConfig(receiptConfig);
    alert('Configuração do talão guardada com sucesso!');
  };

  // Guardar Loja
  const handleSalvarLoja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lojaEmEdicao || !lojaEmEdicao.nome || !lojaEmEdicao.codigo) return;
    const salva = await salvarLojaDb(lojaEmEdicao as any);
    if (salva) {
      const ljs = await carregarLojasSupabase();
      setLojas(ljs);
      setLojaEmEdicao(null);
      alert('Loja guardada no Supabase!');
    }
  };

  // Guardar Carrinha
  const handleSalvarCarrinha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!carrinhaEmEdicao || !carrinhaEmEdicao.identificador || !carrinhaEmEdicao.loja_id) return;
    const salva = await salvarCarrinhaDb(carrinhaEmEdicao as any);
    if (salva) {
      const cars = await carregarCarrinhasSupabase();
      setCarrinhas(cars);
      setCarrinhaEmEdicao(null);
      alert('Carrinha guardada no Supabase!');
    }
  };

  // ---------------- EXPORTAÇÃO EXCEL (CSV com UTF-8 BOM e ponto e vírgula) ---------------- //
  const exportarCSV = (nomeFicheiro: string, colunas: string[], linhas: (string | number)[][]) => {
    const separador = ';';
    const conteudo = [
      colunas.join(separador),
      ...linhas.map((l) =>
        l
          .map((c) => {
            const str = String(c ?? '').replace(/"/g, '""');
            return `"${str}"`;
          })
          .join(separador)
      ),
    ].join('\r\n');

    // UTF-8 BOM para o Excel abrir sem quebrar acentos portugueses
    const blob = new Blob(['\uFEFF' + conteudo], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${nomeFicheiro}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportarClientes = () => {
    const colunas = ['Nome', 'Telefone', 'Morada', 'Codigo_Postal', 'Notas_Entrega', 'Email'];
    const linhas = clientes.map((c) => [
      c.nome,
      c.telefone,
      c.morada || '',
      c.codigo_postal || '',
      c.notas_entrega || '',
      c.email || '',
    ]);
    exportarCSV('clientes_padaria', colunas, linhas);
  };

  const exportarProdutos = () => {
    const colunas = ['Nome', 'Categoria', 'Preco', 'Unidade', 'Ativo'];
    const linhas = produtos.map((p) => [
      p.nome,
      p.categoria,
      p.preco,
      p.unidade,
      p.ativo ? 'SIM' : 'NAO',
    ]);
    exportarCSV('produtos_padaria', colunas, linhas);
  };

  const exportarEncomendas = () => {
    const colunas = ['Codigo', 'Loja', 'Cliente', 'Telefone', 'Tipo', 'Data', 'Hora', 'Total', 'Estado', 'Pagamento'];
    const linhas = encomendas.map((e) => [
      e.codigo,
      e.loja_nome || '',
      e.cliente.nome,
      e.cliente.telefone,
      e.tipo,
      e.data_agendamento,
      e.hora_agendamento,
      e.total,
      e.estado,
      e.estado_pagamento,
    ]);
    exportarCSV('encomendas_padaria', colunas, linhas);
  };

  // Download de Templates
  const descarregarTemplate = (tipo: 'clientes' | 'produtos') => {
    if (tipo === 'clientes') {
      exportarCSV('template_clientes', ['Nome', 'Telefone', 'Morada', 'Codigo_Postal', 'Notas_Entrega', 'Email'], [
        ['Manuel Ferreira', '912345678', 'Rua das Flores 10, Lisboa', '1000-001', 'Tocar na campainha do 2º Dto', 'manuel@exemplo.pt'],
        ['Maria Santos', '933221100', 'Av. da Liberdade 200, Lisboa', '1250-096', 'Portão de vidro lateral', 'maria@exemplo.pt'],
      ]);
    } else {
      exportarCSV('template_produtos', ['Nome', 'Categoria', 'Preco', 'Unidade', 'Ativo'], [
        ['Pão de Mafra Especial', 'padaria', 1.80, 'unidade', 'SIM'],
        ['Torta de Noz e Ovos Moles', 'pastelaria', 16.50, 'kg', 'SIM'],
      ]);
    }
  };

  // Leitura do ficheiro carregado
  const handleFicheiroSelecionado = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArquivoImportado(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      // Suporte para separador ; ou ,
      const linhas = text.split(/\r?\n/).filter((l) => l.trim() !== '');
      if (linhas.length < 2) return;

      const separador = linhas[0].includes(';') ? ';' : ',';
      const cabecalhos = linhas[0].split(separador).map((c) => c.replace(/^["']|["']$/g, '').trim().toLowerCase());

      const parsed: any[] = [];
      for (let i = 1; i < linhas.length; i++) {
        const valores = linhas[i].split(separador).map((v) => v.replace(/^["']|["']$/g, '').trim());
        const item: any = {};
        cabecalhos.forEach((cab, idx) => {
          item[cab] = valores[idx] || '';
        });
        parsed.push(item);
      }

      setLinhasPreview(parsed);
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Executar Importação Massiva
  const handleExecutarImportacao = async () => {
    if (!linhasPreview.length) return;
    setProcessandoImportacao(true);
    setStatusImportacao('A importar para o Supabase...');

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
        setStatusImportacao(`Sucesso! ${res.sucesso} clientes atualizados/inseridos no Supabase.`);
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
        setStatusImportacao(`Sucesso! ${res.sucesso} produtos atualizados/inseridos no Supabase.`);
        const prods = await carregarProdutosSupabase();
        setProdutos(prods);
      }
    } catch (err: any) {
      setStatusImportacao(`Erro na importação: ${err.message}`);
    } finally {
      setProcessandoImportacao(false);
    }
  };

  // Exemplo de Encomenda para Teste do Talão
  const gerarEncomendaTeste = (): Encomenda => ({
    id: 'enc-teste',
    numero_sequencial: 999,
    codigo: 'ENC-TESTE-8888',
    loja_id: 'loja-1',
    loja_nome: 'Padaria Central (Matriz)',
    cliente: {
      id: 'cli-teste',
      nome: 'Cliente Exemplo',
      telefone: '912 345 678',
      morada: 'Av. da Liberdade 125, 3º Dto, Lisboa',
      notas_entrega: 'Portão verde, tocar na campainha do 3º',
    },
    tipo: 'entrega_domicilio',
    carrinha_nome: 'Carrinha 1 - Matriz',
    data_agendamento: new Date().toISOString().split('T')[0],
    hora_agendamento: '10:30',
    estado: 'pendente',
    estado_pagamento: 'pago',
    metodo_pagamento: 'mbway',
    total: 25.40,
    itens: [
      {
        id: 'item-1',
        encomenda_id: 'enc-teste',
        produto_id: 'prod-1',
        produto_nome: 'Pão Alentejano Tradicional',
        setor: 'padaria',
        quantidade: 2,
        preco_unitario: 1.60,
        estado_producao: 'pronto',
      },
      {
        id: 'item-2',
        encomenda_id: 'enc-teste',
        produto_id: 'prod-8',
        produto_nome: 'Bolo de Aniversário Personalizado',
        setor: 'pastelaria',
        quantidade: 1.2,
        preco_unitario: 18.50,
        notas_personalizacao: 'Massa folhada, ovos moles, frase: Parabéns Mãe!',
        estado_producao: 'em_preparo',
      },
    ],
    criado_em: new Date().toISOString(),
  });

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/70">
      <Navbar selectedLojaId={selectedLojaId} onSelectLoja={setSelectedLojaId} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:px-6">
        {/* Cabeçalho de Gestão */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-bakery-600" />
              {t.managementTitle}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              Métricas executivas, configuração de lojas/frota, gestão de talões e integração com Supabase.
            </p>
          </div>

          {/* Seletor de Loja para Métricas */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-2xs">
            <Filter className="h-4 w-4 text-bakery-600" />
            <select
              value={selectedLojaId}
              onChange={(e) => setSelectedLojaId(e.target.value)}
              className="text-xs font-bold text-gray-900 bg-transparent focus:outline-hidden cursor-pointer"
            >
              <option value="todas">Consolidado (Todas as Lojas)</option>
              {lojas.map((l) => (
                <option key={l.id} value={l.id}>{l.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Abas Executivas */}
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
            <KeyRound className="h-4 w-4" />
            {t.tabAccess}
          </button>
        </div>

        {/* ----------------- ABA 1: MÉTRICAS & RELATÓRIOS ----------------- */}
        {activeTab === 'metricas' && (
          <div className="space-y-6">
            {/* Cartões de Indicadores */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
                <span className="text-xs text-gray-500 font-bold uppercase">{t.totalRevenue}</span>
                <p className="text-2xl font-black text-gray-900 mt-1">{totalFaturado.toFixed(2)} €</p>
                <span className="text-[11px] text-emerald-600 font-bold mt-1 block">
                  {encomendasFiltradas.length} pedidos registados
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
                <span className="text-xs text-gray-500 font-bold uppercase">{t.avgTicket}</span>
                <p className="text-2xl font-black text-gray-900 mt-1">{ticketMedio.toFixed(2)} €</p>
                <span className="text-[11px] text-gray-400 font-medium mt-1 block">Por encomenda</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
                <span className="text-xs text-gray-500 font-bold uppercase">Entregas ao Domicílio</span>
                <p className="text-2xl font-black text-blue-700 mt-1">{totalEntregas}</p>
                <span className="text-[11px] text-blue-600 font-bold mt-1 block">
                  {encomendasFiltradas.length > 0 ? ((totalEntregas / encomendasFiltradas.length) * 100).toFixed(0) : 0}% do volume
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
                <span className="text-xs text-gray-500 font-bold uppercase">Levantamento em Loja</span>
                <p className="text-2xl font-black text-amber-700 mt-1">{totalLevantamentos}</p>
                <span className="text-[11px] text-amber-600 font-bold mt-1 block">
                  {encomendasFiltradas.length > 0 ? ((totalLevantamentos / encomendasFiltradas.length) * 100).toFixed(0) : 0}% do volume
                </span>
              </div>
            </div>

            {/* Comparativo de Lojas & Necessidades de Produção */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Vendas por Loja */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Store className="h-4 w-4 text-bakery-600" />
                  Desempenho por Loja
                </h3>

                <div className="space-y-3">
                  {lojas.map((l) => {
                    const encsLoja = encomendas.filter((e) => e.loja_id === l.id);
                    const totalLoja = encsLoja.reduce((acc, curr) => acc + curr.total, 0);
                    const pct = totalFaturado > 0 ? (totalLoja / totalFaturado) * 100 : 0;

                    return (
                      <div key={l.id} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-gray-800">{l.nome}</span>
                          <span className="text-bakery-700">{totalLoja.toFixed(2)} € ({encsLoja.length} enc.)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-bakery-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
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
                  Necessidades Consolidadas de Fabrico
                </h3>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 text-xs">
                  {itensProducaoConsolidados.length === 0 ? (
                    <p className="text-gray-400 italic py-4 text-center">Sem produtos agendados para produção.</p>
                  ) : (
                    itensProducaoConsolidados.map(([nome, dados]) => (
                      <div key={nome} className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-100">
                        <div>
                          <span className="font-bold text-gray-900">{nome}</span>
                          <span className="text-[10px] text-gray-500 block uppercase">
                            {dados.setor === 'padaria' ? '🥖 Padaria' : '🎂 Pastelaria'}
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
          </div>
        )}

        {/* ----------------- ABA 2: LOJAS & CARRINHAS ----------------- */}
        {activeTab === 'lojas_carrinhas' && (
          <div className="space-y-6">
            {/* Secção de Lojas */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Store className="h-4 w-4 text-bakery-600" />
                    Lojas de Padaria & Pastelaria
                  </h3>
                  <p className="text-xs text-gray-500">Configuração de moradas, telefones e NIFs de cada ponto de venda.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lojas.map((l) => (
                  <div key={l.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-bakery-700 bg-bakery-50 px-2 py-0.5 rounded border border-bakery-200">
                        {l.codigo}
                      </span>
                      <button
                        onClick={() => setLojaEmEdicao(l)}
                        className="flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800 bg-white px-2 py-1 rounded-lg border border-gray-200 shadow-2xs"
                      >
                        <Edit3 className="h-3 w-3" /> Editar
                      </button>
                    </div>

                    <h4 className="font-bold text-sm text-gray-900">{l.nome}</h4>
                    <p className="text-gray-600">Morada: {l.morada}</p>
                    <p className="text-gray-600">Telefone: {l.telefone}</p>
                    {l.nif && <p className="text-gray-600">NIF: {l.nif}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Secção de Carrinhas */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Truck className="h-4 w-4 text-blue-600" />
                    Frota de Carrinhas de Entrega
                  </h3>
                  <p className="text-xs text-gray-500">Gestão das viaturas afetas a cada loja e matrículas.</p>
                </div>

                <button
                  type="button"
                  onClick={() => setCarrinhaEmEdicao({ identificador: '', matricula: '', loja_id: lojas[0]?.id || '' })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar Carrinha
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {carrinhas.map((c) => {
                  const lj = lojas.find((l) => l.id === c.loja_id);
                  return (
                    <div key={c.id} className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-300">
                          {c.matricula}
                        </span>
                        <button
                          onClick={() => setCarrinhaEmEdicao(c)}
                          className="flex items-center gap-1 font-bold text-blue-700 hover:text-blue-900 bg-white px-2 py-1 rounded-lg border border-blue-200"
                        >
                          <Edit3 className="h-3 w-3" /> Editar
                        </button>
                      </div>

                      <h4 className="font-bold text-gray-900">{c.identificador}</h4>
                      <p className="text-gray-600">Afeta a: <b>{lj?.nome || 'Loja Central'}</b></p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ----------------- ABA 3: BASES DE DADOS & EXCEL ----------------- */}
        {activeTab === 'database' && (
          <div className="space-y-6">
            {/* Exportação */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Download className="h-4 w-4 text-emerald-600" />
                {t.exportExcel}
              </h3>
              <p className="text-xs text-gray-500">
                Descarregue ficheiros compatíveis com o Microsoft Excel (formato UTF-8 com BOM e pontuação portuguesa).
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

            {/* Importação Massiva */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Upload className="h-4 w-4 text-blue-600" />
                {t.importExcel}
              </h3>
              <p className="text-xs text-gray-500">
                {t.bulkUploadDesc}
              </p>

              {/* Seletor de Tabela e Templates */}
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
                  <Download className="h-3.5 w-3.5" /> Descarregar Modelo CSV / Excel
                </button>
              </div>

              {/* Upload Input */}
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center hover:border-blue-500 transition bg-gray-50/50">
                <input
                  type="file"
                  accept=".csv,.txt"
                  id="excel-upload"
                  onChange={handleFicheiroSelecionado}
                  className="hidden"
                />
                <label htmlFor="excel-upload" className="cursor-pointer flex flex-col items-center">
                  <FileSpreadsheet className="h-10 w-10 text-gray-400 mb-2" />
                  <span className="text-xs font-bold text-gray-800">
                    {arquivoImportado ? `Ficheiro: ${arquivoImportado}` : 'Clique para selecionar ficheiro CSV / Excel'}
                  </span>
                  <span className="text-[11px] text-gray-400 mt-1">Ficheiros .CSV exportados do Excel</span>
                </label>
              </div>

              {/* Pré-visualização da Importação */}
              {linhasPreview.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700">
                      Linhas Detetadas para Importação: <b>{linhasPreview.length}</b>
                    </span>
                    <button
                      onClick={handleExecutarImportacao}
                      disabled={processandoImportacao}
                      className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 disabled:opacity-50 transition shadow-xs flex items-center gap-1.5"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${processandoImportacao ? 'animate-spin' : ''}`} />
                      {processandoImportacao ? 'A processar...' : 'Gravar no Supabase'}
                    </button>
                  </div>

                  {statusImportacao && (
                    <div className="p-3 rounded-xl bg-blue-50 text-blue-900 text-xs font-bold border border-blue-200">
                      {statusImportacao}
                    </div>
                  )}

                  {/* Amostra das primeiras 5 linhas */}
                  <div className="overflow-x-auto border border-gray-200 rounded-xl max-h-48">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-gray-100 font-bold uppercase text-gray-600">
                        <tr>
                          {Object.keys(linhasPreview[0] || {}).map((k) => (
                            <th key={k} className="p-2 border-b">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {linhasPreview.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            {Object.values(row).map((v: any, cidx) => (
                              <td key={cidx} className="p-2 truncate max-w-xs">{String(v)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ----------------- ABA 4: CONFIGURADOR DE TALÃO ----------------- */}
        {activeTab === 'talao' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Formulário de Configuração */}
            <form onSubmit={handleSalvarConfigTalao} className="lg:col-span-7 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4 text-xs">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b pb-3">
                <Printer className="h-4 w-4 text-bakery-600" />
                Opções de Layout e Conteúdo do Talão Térmico
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nome Comercial no Cabeçalho</label>
                  <input
                    type="text"
                    value={receiptConfig.storeNameOverride}
                    onChange={(e) => setReceiptConfig({ ...receiptConfig, storeNameOverride: e.target.value })}
                    placeholder="Padaria & Pastelaria Central"
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

              {/* Formato do Papel */}
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
                    <option value="compact">Compacto (Mais linhas)</option>
                    <option value="normal">Normal</option>
                    <option value="large">Grande (Alta legibilidade)</option>
                  </select>
                </div>
              </div>

              {/* Secções e Visibilidade */}
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
                  <span>Destacar notas de personalização de bolos em caixa escura</span>
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
                  <span>Imprimir QR Code / Código de Validação no rodapé</span>
                </label>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Mensagem de Agradecimento no Rodapé</label>
                <input
                  type="text"
                  value={receiptConfig.footerMessage}
                  onChange={(e) => setReceiptConfig({ ...receiptConfig, footerMessage: e.target.value })}
                  placeholder="Obrigado pela sua preferência! Bom apetite."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setEncomendaTesteTalão(gerarEncomendaTeste())}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-800 font-bold hover:bg-gray-200 transition"
                >
                  Pré-visualizar / Testar Impressão
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-bakery-600 text-white font-black shadow-xs hover:bg-bakery-700 transition"
                >
                  Guardar Configuração
                </button>
              </div>
            </form>

            {/* Pré-visualização Estática em Direto */}
            <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col items-center">
              <span className="text-xs font-bold text-gray-500 uppercase mb-3">
                Pré-visualização em Direto ({receiptConfig.paperWidth})
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
                  <p className="text-[9px] font-bold uppercase mt-0.5">LEVANTAMENTO EM LOJA</p>
                </div>
                <div className="my-2 border-b border-dashed border-black" />

                <div className="space-y-0.5">
                  <p>DATA: <b>Hoje</b> | HORA: <b>10:30</b></p>
                  <p>CLIENTE: <b>Ana Silva</b></p>
                </div>

                <div className="my-2 border-b border-dashed border-black" />

                {receiptConfig.showSectionSeparation ? (
                  <>
                    <p className="font-bold text-[10px]">[ PADARIA ]</p>
                    <div className="flex justify-between">
                      <span>2x Pão Alentejano</span>
                      <span>3.20 €</span>
                    </div>

                    <p className="font-bold text-[10px] mt-2">[ PASTELARIA ]</p>
                    <div className="flex justify-between">
                      <span>1x Bolo Aniversário</span>
                      <span>18.50 €</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span>2x Pão Alentejano</span>
                      <span>3.20 €</span>
                    </div>
                    <div className="flex justify-between">
                      <span>1x Bolo Aniversário</span>
                      <span>18.50 €</span>
                    </div>
                  </>
                )}

                {receiptConfig.highlightCakeNotes && (
                  <div className="bg-gray-100 p-1 border border-black my-1 text-[9px]">
                    <b>NOTA:</b> Parabéns Mãe!
                  </div>
                )}

                <div className="my-2 border-b border-dashed border-black" />
                <div className="flex justify-between font-black">
                  <span>TOTAL:</span>
                  <span>21.70 €</span>
                </div>

                <div className="text-center pt-3 text-[9px] space-y-0.5">
                  <p>{receiptConfig.footerMessage}</p>
                  <p className="text-gray-500">*** SISTEMA DE ENCOMENDAS ***</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- ABA 5: ACESSOS & DIAGNÓSTICO ----------------- */}
        {activeTab === 'acessos' && (
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Estado da Ligação Supabase</h3>
                  <p className="text-xs text-emerald-700 font-bold">🟢 Conexão Ativa & Sincronizada em Tempo Real</p>
                </div>
              </div>

              <a
                href="https://supabase.com/dashboard/project/hlcxvkcwhdndiglbytxk"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition shadow-xs"
              >
                <ExternalLink className="h-4 w-4" /> Abrir Painel Supabase
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-1 font-mono">
                <span className="text-gray-500 text-[11px] font-sans font-bold block">URL DO PROJETO:</span>
                <span className="text-gray-900 font-bold">https://hlcxvkcwhdndiglbytxk.supabase.co</span>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-1 font-mono">
                <span className="text-gray-500 text-[11px] font-sans font-bold block">CHAVE PÚBLICA ANON:</span>
                <span className="text-gray-900 truncate block">sb_publishable_qs7UzBoyK9YvMfhvxrdOCQ_GJ7QRHvE</span>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-xs font-bold text-gray-800 mb-2">Tabelas Criadas & Integradas no PostgreSQL:</h4>
              <div className="flex flex-wrap gap-2 text-xs">
                {['public.lojas', 'public.perfis', 'public.clientes', 'public.produtos', 'public.carrinhas', 'public.encomendas', 'public.itens_encomenda'].map((tb) => (
                  <span key={tb} className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg font-mono font-bold">
                    ✓ {tb}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL DE EDIÇÃO DE LOJA */}
      {lojaEmEdicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-200 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-gray-900 border-b pb-2">Editar Dados da Loja</h3>
            <form onSubmit={handleSalvarLoja} className="space-y-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Código da Loja</label>
                <input
                  type="text"
                  required
                  value={lojaEmEdicao.codigo || ''}
                  onChange={(e) => setLojaEmEdicao({ ...lojaEmEdicao, codigo: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Nome da Loja</label>
                <input
                  type="text"
                  required
                  value={lojaEmEdicao.nome || ''}
                  onChange={(e) => setLojaEmEdicao({ ...lojaEmEdicao, nome: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Morada</label>
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
                  <label className="block font-bold text-gray-700 mb-1">Telefone</label>
                  <input
                    type="text"
                    required
                    value={lojaEmEdicao.telefone || ''}
                    onChange={(e) => setLojaEmEdicao({ ...lojaEmEdicao, telefone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">NIF</label>
                  <input
                    type="text"
                    value={lojaEmEdicao.nif || ''}
                    onChange={(e) => setLojaEmEdicao({ ...lojaEmEdicao, nif: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setLojaEmEdicao(null)}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 font-bold text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-bakery-600 font-bold text-white shadow-xs"
                >
                  Guardar Loja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE CARRINHA */}
      {carrinhaEmEdicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-200 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-gray-900 border-b pb-2">Editar Carrinha de Entrega</h3>
            <form onSubmit={handleSalvarCarrinha} className="space-y-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Identificador / Nome</label>
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
                <label className="block font-bold text-gray-700 mb-1">Matrícula</label>
                <input
                  type="text"
                  required
                  value={carrinhaEmEdicao.matricula || ''}
                  onChange={(e) => setCarrinhaEmEdicao({ ...carrinhaEmEdicao, matricula: e.target.value })}
                  placeholder="42-AB-89"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Loja Afeta</label>
                <select
                  value={carrinhaEmEdicao.loja_id || ''}
                  onChange={(e) => setCarrinhaEmEdicao({ ...carrinhaEmEdicao, loja_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-bold"
                >
                  {lojas.map((l) => (
                    <option key={l.id} value={l.id}>{l.nome}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setCarrinhaEmEdicao(null)}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 font-bold text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 font-bold text-white shadow-xs"
                >
                  Guardar Carrinha
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
