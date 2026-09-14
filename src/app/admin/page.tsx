'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from '../../components/Navbar';
import { ThermalReceipt } from '../../components/ThermalReceipt';
import { LOJAS_MOCK, PRODUTOS_MOCK, CARRINHAS_MOCK } from '../../lib/mockData';
import { 
  carregarEncomendasSupabase, 
  carregarClientesSupabase, 
  carregarProdutosSupabase,
  carregarLojasSupabase,
  salvarLojaDb,
  carregarCarrinhasSupabase,
  salvarCarrinhaDb,
  carregarPerfisAcessoSupabase,
  salvarPerfilAcessoDb,
  eliminarPerfilAcessoDb,
  upsertClientesEmLote,
  upsertProdutosEmLote
} from '../../lib/encomendasService';
import { 
  ReceiptConfig, 
  getReceiptConfig, 
  saveReceiptConfig, 
  DEFAULT_RECEIPT_CONFIG 
} from '../../lib/receiptConfig';
import { Encomenda, Cliente, Produto, Loja, Carrinha, PerfilUtilizador, Role, NivelAcesso } from '../../types';
import { useTranslation } from '../../lib/i18n';
import { useAuth } from '../../lib/authContext';
import { 
  BarChart3, 
  Store, 
  Truck, 
  FileSpreadsheet, 
  Printer, 
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
  AlertTriangle
} from 'lucide-react';

export default function AdminPage() {
  const { t, language } = useTranslation();
  const { podeEditar } = useAuth();
  const temPermissaoEdicaoGestao = podeEditar('gestao');
  const [selectedLojaId, setSelectedLojaId] = useState<string>('todas');
  const [activeTab, setActiveTab] = useState<'metricas' | 'lojas_carrinhas' | 'database' | 'talao' | 'acessos'>('metricas');

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

  // Importação Massiva Excel/CSV
  const [tabelaImportacao, setTabelaImportacao] = useState<'clientes' | 'produtos'>('clientes');
  const [arquivoImportado, setArquivoImportado] = useState<string>('');
  const [linhasPreview, setLinhasPreview] = useState<any[]>([]);
  const [statusImportacao, setStatusImportacao] = useState<string | null>(null);
  const [processandoImportacao, setProcessandoImportacao] = useState(false);

  // Carregamento Inicial
  useEffect(() => {
    async function carregar() {
      const [encs, clis, prods, ljs, cars, pfs] = await Promise.all([
        carregarEncomendasSupabase(),
        carregarClientesSupabase(),
        carregarProdutosSupabase(),
        carregarLojasSupabase(),
        carregarCarrinhasSupabase(),
        carregarPerfisAcessoSupabase(),
      ]);
      setEncomendas(encs);
      if (clis.length) setClientes(clis);
      if (prods.length) setProdutos(prods);
      if (ljs.length) setLojas(ljs);
      if (cars.length) setCarrinhas(cars);
      if (pfs.length) setPerfis(pfs);
      setReceiptConfig(getReceiptConfig());
    }
    carregar();
  }, []);

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
      // 1. Filtro de Loja
      const matchLoja = selectedLojaId === 'todas' || e.loja_id === selectedLojaId;

      // 2. Filtro de Formato de Entrega
      const matchFormato = formatoEntrega === 'todos' || e.tipo === formatoEntrega;

      // 3. Filtro Temporal
      let matchTempo = true;
      const dataEnc = e.data_agendamento;

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
    (acc, curr) => acc + curr.itens.reduce((iAcc, item) => iAcc + item.quantidade, 0),
    0
  );
  const totalEntregas = encomendasFiltradas.filter((e) => e.tipo === 'entrega_domicilio').length;
  const totalLevantamentos = encomendasFiltradas.filter((e) => e.tipo === 'levantamento_loja').length;

  // Necessidades Consolidadas de Produção com o filtro ativo
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

  const handleSalvarCarrinha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!carrinhaEmEdicao || !carrinhaEmEdicao.identificador || !carrinhaEmEdicao.loja_id) return;
    const salva = await salvarCarrinhaDb(carrinhaEmEdicao as any);
    if (salva) {
      const cars = await carregarCarrinhasSupabase();
      setCarrinhas(cars);
      setCarrinhaEmEdicao(null);
      alert(t.success);
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
        acesso_encomendas: 'leitura',
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

  // Exportação CSV com UTF-8 BOM
  const exportarCSV = (nomeFicheiro: string, colunas: string[], linhas: (string | number)[][]) => {
    const separador = ';';
    const conteudo = [
      colunas.join(separador),
      ...linhas.map((l) =>
        l.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(separador)
      ),
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + conteudo], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${nomeFicheiro}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportarClientes = () => {
    exportarCSV('clientes_padaria', ['Nome', 'Telefone', 'Morada', 'Codigo_Postal', 'Notas_Entrega', 'Email'], clientes.map((c) => [
      c.nome, c.telefone, c.morada || '', c.codigo_postal || '', c.notas_entrega || '', c.email || ''
    ]));
  };

  const exportarProdutos = () => {
    exportarCSV('produtos_padaria', ['Nome', 'Categoria', 'Preco', 'Unidade', 'Ativo'], produtos.map((p) => [
      p.nome, p.categoria, p.preco, p.unidade, p.ativo ? 'SIM' : 'NAO'
    ]));
  };

  const exportarEncomendas = () => {
    exportarCSV('encomendas_padaria', ['Codigo', 'Loja', 'Cliente', 'Telefone', 'Tipo', 'Data', 'Hora', 'Total', 'Estado', 'Pagamento'], encomendas.map((e) => [
      e.codigo, e.loja_nome || '', e.cliente.nome, e.cliente.telefone, e.tipo, e.data_agendamento, e.hora_agendamento, e.total, e.estado, e.estado_pagamento
    ]));
  };

  // Download de Templates
  const descarregarTemplate = (tipo: 'clientes' | 'produtos') => {
    if (tipo === 'clientes') {
      exportarCSV('template_clientes', ['Nome', 'Telefone', 'Morada', 'Codigo_Postal', 'Notas_Entrega', 'Email'], [
        ['Manuel Ferreira', '912345678', 'Rua Dr. Teixeira de Brito, Arouca', '4540-100', 'Campainha 2º Dto', 'manuel@exemplo.pt'],
        ['Maria Santos', '933221100', 'Praça Brandão de Vasconcelos, Arouca', '4540-111', 'Portão lateral', 'maria@exemplo.pt'],
      ]);
    } else {
      exportarCSV('template_produtos_padaria_da_vila', ['Nome', 'Categoria', 'Unidade', 'Ativo'], [
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
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
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
        setStatusImportacao(`${t.success} ${res.sucesso} registos.`);
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
        setStatusImportacao(`${t.success} ${res.sucesso} registos.`);
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
              {t.managementTitle}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              {t.managementSubtitle}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  {lojas.map((l) => {
                    const encsLoja = encomendasFiltradas.filter((e) => e.loja_id === l.id);
                    const itensLoja = encsLoja.reduce((acc, curr) => 
                      acc + curr.itens.reduce((iAcc, item) => iAcc + item.quantidade, 0), 0
                    );
                    const pct = totalVolumeEncomendas > 0 ? (encsLoja.length / totalVolumeEncomendas) * 100 : 0;

                    return (
                      <div key={l.id} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-gray-800">{l.nome}</span>
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
                            {dados.setor === 'padaria' ? `🥖 ${t.categoryBakery}` : `🎂 ${t.categoryPastry}`}
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
              <div className="border-b pb-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Store className="h-4 w-4 text-bakery-600" />
                  {t.storesSectionTitle}
                </h3>
                <p className="text-xs text-gray-500">{t.storesSectionDesc}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Secção de Carrinhas */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Truck className="h-4 w-4 text-blue-600" />
                    {t.vansSectionTitle}
                  </h3>
                  <p className="text-xs text-gray-500">{t.vansSectionDesc}</p>
                </div>

                {temPermissaoEdicaoGestao && (
                  <button
                    type="button"
                    onClick={() => setCarrinhaEmEdicao({ identificador: '', matricula: '', loja_id: lojas[0]?.id || '' })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
                  >
                    <Plus className="h-3.5 w-3.5" /> {t.addVan}
                  </button>
                )}
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
                        {temPermissaoEdicaoGestao && (
                          <button
                            onClick={() => setCarrinhaEmEdicao(c)}
                            className="flex items-center gap-1 font-bold text-blue-700 hover:text-blue-900 bg-white px-2 py-1 rounded-lg border border-blue-200"
                          >
                            <Edit3 className="h-3 w-3" /> {t.edit}
                          </button>
                        )}
                      </div>

                      <h4 className="font-bold text-gray-900">{c.identificador}</h4>
                      <p className="text-gray-600">{t.assignedStore}: <b>{lj?.nome || 'Loja Central'}</b></p>
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
                  <Download className="h-3.5 w-3.5" /> Descarregar Modelo CSV / Excel
                </button>
              </div>

              <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition ${
                temPermissaoEdicaoGestao
                  ? 'border-gray-300 hover:border-blue-500 bg-gray-50/50 cursor-pointer'
                  : 'border-gray-200 bg-gray-100/70 cursor-not-allowed opacity-75'
              }`}>
                <input
                  type="file"
                  accept=".csv,.txt"
                  id="excel-upload"
                  disabled={!temPermissaoEdicaoGestao}
                  onChange={handleFicheiroSelecionado}
                  className="hidden"
                />
                <label htmlFor={temPermissaoEdicaoGestao ? "excel-upload" : undefined} className={`flex flex-col items-center ${temPermissaoEdicaoGestao ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                  <FileSpreadsheet className="h-10 w-10 text-gray-400 mb-2" />
                  <span className="text-xs font-bold text-gray-800">
                    {!temPermissaoEdicaoGestao ? `🚫 ${t.readOnlyMode} - ${t.importExcel}` : arquivoImportado ? `Ficheiro: ${arquivoImportado}` : 'Clique para selecionar ficheiro CSV / Excel'}
                  </span>
                  <span className="text-[11px] text-gray-400 mt-1">Ficheiros .CSV exportados do Excel</span>
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

        {/* ----------------- ABA 4: CONFIGURADOR DE TALÃO ----------------- */}
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
                    <p className="font-bold text-[10px]">{t.receiptBakerySection}</p>
                    <div className="flex justify-between">
                      <span>2x Pão Alentejano</span>
                      <span>3.20 €</span>
                    </div>

                    <p className="font-bold text-[10px] mt-2">{t.receiptPastrySection}</p>
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
                  <span>{t.total}:</span>
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
                  const nivelAtual: NivelAcesso =
                    (perfilEmEdicao as any)[item.key] ||
                    (perfilEmEdicao as any)[item.key.replace('acesso_', 'painel_')] ? 'edicao' : 'sem_acesso';

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
                          🚫 {t.levelNoAccess}
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
                          👁️ {t.levelReadOnly}
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
                          ✏️ {t.levelFullEdit}
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

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPerfilEmEdicao(null)}
                    className="px-3 py-1.5 rounded-lg bg-gray-100 font-bold text-gray-700"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-bakery-600 font-bold text-white shadow-xs"
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

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setLojaEmEdicao(null)}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 font-bold text-gray-700"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-bakery-600 font-bold text-white shadow-xs"
                >
                  {t.save}
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

              <div>
                <label className="block font-bold text-gray-700 mb-1">{t.assignedStore}</label>
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
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 font-bold text-white shadow-xs"
                >
                  {t.save}
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
