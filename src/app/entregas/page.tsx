'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from '../../components/Navbar';
import { ThermalReceipt } from '../../components/ThermalReceipt';
import { LOJAS_MOCK, CARRINHAS_MOCK, PRODUTOS_MOCK, COLUNAS_MAPA_DIARIO_OFICIAL } from '../../lib/mockData';
import { supabase } from '../../lib/supabase';
import { 
  carregarEncomendasSupabase, 
  carregarLojasSupabase,
  carregarCarrinhasSupabase,
  carregarProdutosSupabase,
  carregarBaseFixaCarrinhas,
  carregarArtigosBaseFixa,
  carregarClientesEmpresariaisB2B,
  sincronizarClientesB2BComSupabase,
  subscreverAlteracoesClientesB2B,
  obterDiaSemanaDeData,
  atualizarEstadoEncomendaDb,
  alternarTipoEntregaDb,
  atribuirCarrinhaDb,
  concluirEntregaComTimestampDb,
  obterQuantidadeEfetivaBaseRota,
  obterQuantidadeEfetivaClienteB2B,
  obterArtigosAjustadosBaseRota,
  registarLogAuditoria,
  carregarBasesDiariasRecorrentes,
  salvarBaseDiariaRecorrente,
  clienteEmModoFerias,
  subscreverAlteracoesBasesRecorrentes
} from '../../lib/encomendasService';
import { Encomenda, EstadoRota, Loja, Carrinha, Produto, BaseFixaCarrinha, ClienteEmpresarialB2B } from '../../types';
import { useTranslation } from '../../lib/i18n';
import { useAuth } from '../../lib/authContext';
import { obterConfiguracaoMarca } from '../../lib/tinaContent';
import { 
  Truck, 
  MapPin, 
  Phone, 
  Navigation, 
  CheckCircle2, 
  Clock, 
  PackageCheck,
  Edit3, 
  Store, 
  Eye, 
  Play, 
  Flag, 
  Lock, 
  Map as MapIcon,
  Sparkles,
  GripVertical,
  Inbox,
  RotateCcw,
  Check,
  MessageSquare,
  Globe,
  FileSpreadsheet,
  Building2,
  Package,
  ChevronUp,
  ChevronDown,
  Home,
  Calendar,
  Palmtree,
  CalendarRange,
  Sun,
  AlertCircle,
  X
} from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge';
import { OriginBadge } from '../../components/InproovalBadges';

import { PdfViewerModal, LinhaArtigoCarga } from '../../components/pdf/PdfViewerModal';
import { FileText, PenTool } from 'lucide-react';

export default function EntregasPage() {
  const { t } = useTranslation();
  const { podeEditar, usuario } = useAuth();
  const currentUser = usuario || { id: 'user-motorista', nome: 'Rui Oliveira (Motorista Carrinha 1)', role: 'motorista' };
  const temPermissaoEdicao = podeEditar('entregas');
  const configMarca = obterConfiguracaoMarca();
  const [selectedLojaId, setSelectedLojaId] = useState<string>('todas');
  const [lojas, setLojas] = useState<Loja[]>(LOJAS_MOCK);
  const [carrinhas, setCarrinhas] = useState<Carrinha[]>(CARRINHAS_MOCK);
  const [produtos, setProdutos] = useState<Produto[]>(PRODUTOS_MOCK);
  const [baseFixaCarrinhas, setBaseFixaCarrinhas] = useState<BaseFixaCarrinha[]>([]);
  const [clientesB2B, setClientesB2B] = useState<ClienteEmpresarialB2B[]>([]);
  // Bases Diárias Recorrentes (Porta-a-Porta & Modo Férias)
  const [basesRecorrentes, setBasesRecorrentes] = useState<BaseDiariaRecorrente[]>([]);
  const [modalFeriasBase, setModalFeriasBase] = useState<BaseDiariaRecorrente | null>(null);
  const [feriasInicio, setFeriasInicio] = useState<string>('');
  const [feriasFim, setFeriasFim] = useState<string>('');
  const [salvandoFerias, setSalvandoFerias] = useState<boolean>(false);
  const [carrinhaSelecionadaId, setCarrinhaSelecionadaId] = useState<string>('todas');
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [encomendaParaImprimir, setEncomendaParaImprimir] = useState<Encomenda | null>(null);
  const [mapaAbertoId, setMapaAbertoId] = useState<string | null>(null);
  const [mostrarPool, setMostrarPool] = useState<boolean>(true);
  const [draggedEncId, setDraggedEncId] = useState<string | null>(null);
  const [draggedStopIndex, setDraggedStopIndex] = useState<number | null>(null);
  const [isDragOverPool, setIsDragOverPool] = useState<boolean>(false);
  const [isDragOverVan, setIsDragOverVan] = useState<string | null>(null);

  // Estados do Modal de PDF (Folhas de Carga & Comprovativos B2B)
  const [pdfModalOpen, setPdfModalOpen] = useState<boolean>(false);
  const [pdfModalTipo, setPdfModalTipo] = useState<'folha_carga' | 'comprovativo_b2b'>('folha_carga');
  const [pdfCarrinhaSelecionada, setPdfCarrinhaSelecionada] = useState<Carrinha | undefined>(undefined);
  const [pdfClienteB2B, setPdfClienteB2B] = useState<ClienteEmpresarialB2B | undefined>(undefined);
  const [pdfItensCarga, setPdfItensCarga] = useState<LinhaArtigoCarga[]>([]);

  // Ordem personalizada de paragens por carrinha (carrinhaId -> lista de encomenda IDs)
  const [ordensCustomizadas, setOrdensCustomizadas] = useState<Record<string, string[]>>({});

  // Estado do ciclo de vida da rota por carrinha (persiste no turno atual)
  const [rotasEstado, setRotasEstado] = useState<Record<string, {
    estado: EstadoRota;
    horaInicio?: string;
    horaFim?: string;
  }>>({});

  useEffect(() => {
    async function carregar() {
      const [dados, ljs, cars, prods, bRec] = await Promise.all([
        carregarEncomendasSupabase(),
        carregarLojasSupabase(),
        carregarCarrinhasSupabase(),
        carregarProdutosSupabase(),
        carregarBasesDiariasRecorrentes(),
      ]);
      setEncomendas(dados);
      if (ljs && ljs.length > 0) setLojas(ljs);
      if (cars && cars.length > 0) setCarrinhas(cars);
      if (prods && prods.length > 0) setProdutos(prods);
      setBaseFixaCarrinhas(carregarBaseFixaCarrinhas());
      setClientesB2B(carregarClientesEmpresariaisB2B());
      if (bRec && bRec.length > 0) setBasesRecorrentes(bRec);
      sincronizarClientesB2BComSupabase().then((res) => {
        if (res && res.length > 0) setClientesB2B(res);
      });
    }
    carregar();

    const unsubB2B = subscreverAlteracoesClientesB2B((lista) => {
      setClientesB2B(lista);
    });
    const unsubBases = subscreverAlteracoesBasesRecorrentes((novasBases) => {
      setBasesRecorrentes(novasBases);
    });

    return () => {
      unsubB2B();
      unsubBases();
    };
  }, []);

  const lojaAtual = lojas.find((l) => l.id === selectedLojaId) || lojas[0] || LOJAS_MOCK[0];
  // As 7 rotas e carros servem toda a operação central de Arouca (Rota 8 desativada)
  const carrinhasDaLoja = carrinhas.filter((c) => c.rota !== 'Rota 8' && c.identificador !== 'Rota 8' && c.numero !== 8);

  // Data operacional de hoje (AAAA-MM-DD) e Dia da Semana
  const hoje = new Date().toISOString().split('T')[0];
  const diaSemanaHoje = obterDiaSemanaDeData(hoje);
  const nomesDiaSemana: Record<string, string> = {
    seg: 'SEGUNDA-FEIRA',
    ter: 'TERÇA-FEIRA',
    qua: 'QUARTA-FEIRA',
    qui: 'QUINTA-FEIRA',
    sex: 'SEXTA-FEIRA',
    sab: 'SÁBADO',
    dom: 'DOMINGO',
  };

  // 1. POOL DE ENCOMENDAS POR ATRIBUIR (Apenas HOJE, Entrega ao Domicílio, Sem carrinha definida)
  const encomendasPool = useMemo(() => {
    return encomendas.filter((e) => {
      const isHoje = e.data_agendamento === hoje;
      const isEntrega = e.tipo === 'entrega_domicilio';
      const matchLoja = selectedLojaId === 'todas' || e.loja_id === selectedLojaId;
      const naoAtribuida = !e.carrinha_id || e.carrinha_id === 'pool';
      return isHoje && isEntrega && matchLoja && naoAtribuida;
    }).sort((a, b) => a.hora_agendamento.localeCompare(b.hora_agendamento));
  }, [encomendas, hoje, selectedLojaId]);

  // 2. ENCOMENDAS ATRIBUÍDAS A CARRINHAS (Apenas HOJE, Entrega ao Domicílio)
  const entregasAtribuidas = useMemo(() => {
    return encomendas.filter((e) => {
      const isHoje = e.data_agendamento === hoje;
      const isEntrega = e.tipo === 'entrega_domicilio';
      const matchLoja = selectedLojaId === 'todas' || e.loja_id === selectedLojaId;
      const atribuida = !!e.carrinha_id && e.carrinha_id !== 'pool';
      const matchCarrinha = carrinhaSelecionadaId === 'todas' || e.carrinha_id === carrinhaSelecionadaId;
      return isHoje && isEntrega && matchLoja && atribuida && matchCarrinha;
    });
  }, [encomendas, hoje, selectedLojaId, carrinhaSelecionadaId]);

  // Identificador da rota ativa
  const rotaKey = carrinhaSelecionadaId === 'todas' ? 'geral' : carrinhaSelecionadaId;
  const infoRota = rotasEstado[rotaKey] || { estado: 'nao_iniciada' as EstadoRota };

  // 3. ORDENAÇÃO DE PARAGENS (Ordem customizada manual OU por hora de agendamento)
  const entregasOrdenadas = useMemo(() => {
    const customList = ordensCustomizadas[rotaKey];
    if (customList && customList.length > 0) {
      return [...entregasAtribuidas].sort((a, b) => {
        const idxA = customList.indexOf(a.id);
        const idxB = customList.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.hora_agendamento.localeCompare(b.hora_agendamento);
      });
    }
    return [...entregasAtribuidas].sort((a, b) => a.hora_agendamento.localeCompare(b.hora_agendamento));
  }, [entregasAtribuidas, ordensCustomizadas, rotaKey]);

  // Índice da paragem atualmente ativa na sequência
  const activeStopIndex = entregasOrdenadas.findIndex((e) => e.estado !== 'entregue');
  const todasEntregues = entregasOrdenadas.length > 0 && activeStopIndex === -1;
  const totalParagens = entregasOrdenadas.length;
  const paragensConcluidas = entregasOrdenadas.filter((e) => e.estado === 'entregue').length;

  // Iniciar Rota de Entregas
  const handleIniciarRota = () => {
    const agora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setRotasEstado((prev) => ({
      ...prev,
      [rotaKey]: {
        estado: 'em_curso',
        horaInicio: agora,
      },
    }));
    const carrinhaObj = carrinhas.find((c) => c.id === carrinhaSelecionadaId);
    registarLogAuditoria({
      utilizador_id: currentUser.id,
      utilizador_nome: currentUser.nome,
      utilizador_role: currentUser.role,
      loja_id: lojaAtual.id,
      loja_nome: lojaAtual.nome,
      painel: 'entregas',
      acao: 'Início de Rota de Entregas',
      detalhes: `Motorista ${currentUser.nome} iniciou o circuito de distribuição da ${carrinhaObj?.identificador || 'Carrinha'}. Total de ${totalParagens} paragem(ns).`,
    });
  };

  // Concluir Rota de Entregas
  const handleConcluirRota = () => {
    const agora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setRotasEstado((prev) => ({
      ...prev,
      [rotaKey]: {
        ...prev[rotaKey],
        estado: 'concluida',
        horaFim: agora,
      },
    }));
    const carrinhaObj = carrinhas.find((c) => c.id === carrinhaSelecionadaId);
    registarLogAuditoria({
      utilizador_id: currentUser.id,
      utilizador_nome: currentUser.nome,
      utilizador_role: currentUser.role,
      loja_id: lojaAtual.id,
      loja_nome: lojaAtual.nome,
      painel: 'entregas',
      acao: 'Conclusão de Rota de Entregas',
      detalhes: `Circuito de distribuição da ${carrinhaObj?.identificador || 'Carrinha'} finalizado com ${paragensConcluidas} entrega(s) concluídas.`,
    });
  };

  // Concluir entrega com registo de data e hora real
  const confirmarEntrega = async (encomendaId: string) => {
    const agora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dataReal = new Date().toISOString().split('T')[0];
    await concluirEntregaComTimestampDb(encomendaId, agora, dataReal);
    const enc = encomendas.find((e) => e.id === encomendaId);
    if (enc) {
      await registarLogAuditoria({
        encomenda_id: enc.id,
        codigo_encomenda: enc.codigo,
        cliente_nome: enc.cliente.nome,
        utilizador_id: currentUser.id,
        utilizador_nome: currentUser.nome,
        utilizador_role: currentUser.role,
        loja_id: enc.loja_id,
        loja_nome: enc.loja_nome,
        painel: 'entregas',
        acao: 'Entrega Efetuada ao Domicílio',
        detalhes: `Entrega física concluída com sucesso na morada ${enc.cliente.morada || 'Arouca'} em ${dataReal} às ${agora}. Registado por ${currentUser.nome}.`,
      });
    }

    setEncomendas((prev) =>
      prev.map((e) =>
        e.id === encomendaId
          ? { ...e, estado: 'entregue', hora_entrega_real: agora, data_entrega_real: dataReal }
          : e
      )
    );
  };

  // ---------------------------------------------------------------------------
  // NOTA OPERACIONAL: O mapa diário legado em formato Excel (.xlsx) foi inativado.
  // A operação oficial assenta a 100% nos relatórios gerados em PDF especializados:
  // - Folha de Carga Oficial por Carrinha (Rotas 1 a 7) com totais de caixas e pão;
  // - Folha de Fabrico Oficial para o Forno (Dashboard de Produção);
  // - Comprovativos de Entrega B2B com Assinatura Digital Touchscreen.
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // HANDLERS DE MODO FÉRIAS E PAUSA DE ENTREGAS DIÁRIAS (PORTA-A-PORTA)
  // ---------------------------------------------------------------------------
  const handleAbrirModalFerias = (base: BaseDiariaRecorrente) => {
    setModalFeriasBase(base);
    setFeriasInicio(base.pausa_inicio || hoje);
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setFeriasFim(base.pausa_fim || d.toISOString().split('T')[0]);
  };

  const handleSalvarFerias = async () => {
    if (!modalFeriasBase) return;
    setSalvandoFerias(true);
    try {
      const atualizada = await salvarBaseDiariaRecorrente({
        ...modalFeriasBase,
        pausa_inicio: feriasInicio || null,
        pausa_fim: feriasFim || null,
        ativo: true,
      });
      if (atualizada) {
        setBasesRecorrentes((prev) =>
          prev.map((b) => (b.id === atualizada.id ? atualizada : b))
        );
      }
      setModalFeriasBase(null);
    } catch (err) {
      console.error('Erro ao guardar modo férias da entrega diária:', err);
    } finally {
      setSalvandoFerias(false);
    }
  };

  const handleCancelarFerias = async (base: BaseDiariaRecorrente) => {
    if (!window.confirm(`Deseja retomar de imediato as entregas diárias porta-a-porta para "${base.cliente_nome || 'este cliente'}"?`)) {
      return;
    }
    setSalvandoFerias(true);
    try {
      const atualizada = await salvarBaseDiariaRecorrente({
        ...base,
        pausa_inicio: null,
        pausa_fim: null,
        ativo: true,
      });
      if (atualizada) {
        setBasesRecorrentes((prev) =>
          prev.map((b) => (b.id === atualizada.id ? atualizada : b))
        );
      }
    } catch (err) {
      console.error('Erro ao retomar entregas diárias:', err);
    } finally {
      setSalvandoFerias(false);
    }
  };

  // Clientes Empresariais B2B com entregas ativas e quantidade > 0 un. hoje (exclui escolas/empresas a 0)
  const clientesB2BAtivosComCargaHoje = useMemo(() => {
    return clientesB2B
      .filter((cli) => cli.ativo && (carrinhaSelecionadaId === 'todas' || cli.carrinha_id === carrinhaSelecionadaId))
      .map((cli) => {
        const semCli = (cli.quantidades_semanais || cli.quantidades_semana || {}) as Record<string, Record<string, number>>;
        const mapaHoje = semCli[diaSemanaHoje] || {};
        const itensHoje = Object.keys(mapaHoje)
          .map((art) => {
            const { quantidade } = obterQuantidadeEfetivaClienteB2B(hoje, cli.id, art, semCli, diaSemanaHoje);
            return [art.trim(), quantidade] as [string, number];
          })
          .filter(([, q]) => q > 0);
        const totalQtd = itensHoje.reduce((acc, [, q]) => acc + q, 0);
        return { cli, itensHoje, totalQtd };
      })
      .filter(({ totalQtd }) => totalQtd > 0);
  }, [clientesB2B, carrinhaSelecionadaId, diaSemanaHoje, hoje]);

  // ---------------------------------------------------------------------------
  // GERAÇÃO DE FOLHA DE CARGA (PDF) E COMPROVATIVOS B2B VIA @react-pdf/renderer
  // ---------------------------------------------------------------------------
  const prepararItensFolhaCarga = (car: Carrinha): LinhaArtigoCarga[] => {
    const mapaItens = new Map<string, { quantidade: number; categoria: 'padaria' | 'pastelaria'; unidade: string }>();

    // 1. Quantidades da Base Fixa da carrinha para hoje (com eventuais ajustes ad-hoc)
    const bf = baseFixaCarrinhas.find((b) => b.carrinha_id === car.id);
    const semana = (bf?.quantidades_semanais || bf?.quantidades_semana || {}) as Record<string, Record<string, number>>;
    const mapaHoje = semana?.[diaSemanaHoje] || bf?.quantidades_por_produto || {};

    const candidatos = new Set<string>();
    Object.keys(mapaHoje).forEach((a) => candidatos.add(a.trim()));
    if (bf?.quantidades_semanais) {
      Object.values(bf.quantidades_semanais).forEach((m) => {
        Object.keys(m || {}).forEach((a) => candidatos.add(a.trim()));
      });
    }
    if (bf?.quantidades_por_produto) {
      Object.keys(bf.quantidades_por_produto).forEach((a) => candidatos.add(a.trim()));
    }
    obterArtigosAjustadosBaseRota(hoje, car.id).forEach((a) => candidatos.add(a.trim()));

    candidatos.forEach((artigo) => {
      const { quantidade } = obterQuantidadeEfetivaBaseRota(hoje, car.id, artigo, semana, diaSemanaHoje);
      if (quantidade > 0) {
        const qtd = quantidade;
        const prodRef = produtos.find((p) => p.nome.toLowerCase() === artigo.toLowerCase());
        const cat: 'padaria' | 'pastelaria' = prodRef?.categoria || (artigo.toLowerCase().includes('bolo') || artigo.toLowerCase().includes('croissant') ? 'pastelaria' : 'padaria');
        const unid = prodRef?.unidade?.toLowerCase().includes('kg') ? 'kg' : 'un.';
        const artigoCanonico = artigo.trim();
        mapaItens.set(artigoCanonico, {
          quantidade: qtd,
          categoria: cat,
          unidade: unid,
        });
      }
    });

    // NOTA: Clientes B2B e Encomendas foram desdobrados para o fim da Folha de Carga,
    // garantindo que a Tabela Principal reflita estritamente a Base Diária da rota (porta-a-porta e particulares).

    // 4. Entregas Recorrentes Diárias Porta-a-Porta (excluindo clientes em modo férias)
    const basesDestaCarrinha = basesRecorrentes.filter(
      (b) => b.ativo && b.carrinha_id === car.id && !clienteEmModoFerias(b, hoje)
    );
    basesDestaCarrinha.forEach((b) => {
      const mapaBase = b.quantidades_semanais?.[diaSemanaHoje] || {};
      Object.entries(mapaBase).forEach(([artigo, qtd]) => {
        if (typeof qtd === 'number' && qtd > 0) {
          const prodRef = produtos.find((p) => p.nome.toLowerCase() === artigo.toLowerCase());
          const cat: 'padaria' | 'pastelaria' = prodRef?.categoria || (artigo.toLowerCase().includes('bolo') || artigo.toLowerCase().includes('croissant') ? 'pastelaria' : 'padaria');
          const unid = prodRef?.unidade?.toLowerCase().includes('kg') ? 'kg' : 'un.';
          const artigoCanonico = artigo.trim();
          const atual = mapaItens.get(artigoCanonico);
          if (atual) {
            atual.quantidade += qtd;
          } else {
            mapaItens.set(artigoCanonico, {
              quantidade: qtd,
              categoria: cat,
              unidade: unid,
            });
          }
        }
      });
    });

    const resultado: LinhaArtigoCarga[] = [];
    mapaItens.forEach((val, nome) => {
      const fatorCaixa = val.categoria === 'pastelaria' ? 20 : 30;
      resultado.push({
        nome,
        categoria: val.categoria,
        unidade: val.unidade,
        quantidade: val.quantidade,
        caixasEstimadas: Math.ceil(val.quantidade / fatorCaixa),
      });
    });

    return resultado.sort((a, b) => {
      if (a.categoria !== b.categoria) return a.categoria.localeCompare(b.categoria);
      return a.nome.localeCompare(b.nome);
    });
  };

  const abrirFolhaCargaPdf = (carrinhaIdAlvo?: string) => {
    let carAlvo: Carrinha | undefined;
    if (carrinhaIdAlvo) {
      carAlvo = carrinhasDaLoja.find((c) => c.id === carrinhaIdAlvo);
    } else if (carrinhaSelecionadaId !== 'todas') {
      carAlvo = carrinhasDaLoja.find((c) => c.id === carrinhaSelecionadaId);
    } else {
      carAlvo = carrinhasDaLoja[0];
    }

    if (!carAlvo) return;

    const itens = prepararItensFolhaCarga(carAlvo);
    setPdfItensCarga(itens);
    setPdfCarrinhaSelecionada(carAlvo);
    setPdfModalTipo('folha_carga');
    setPdfModalOpen(true);
  };

  const abrirComprovativoB2BPdf = (cliente: ClienteEmpresarialB2B) => {
    const car = carrinhas.find((c) => c.id === cliente.carrinha_id) || carrinhas[0];
    setPdfModalTipo('comprovativo_b2b');
    setPdfClienteB2B(cliente);
    setPdfCarrinhaSelecionada(car);
    setPdfModalOpen(true);
  };

  const abrirComprovativoEncomenda = (enc: Encomenda) => {
    const car = carrinhas.find((c) => c.id === enc.carrinha_id) || carrinhas[0];
    const mapaItens: Record<string, number> = {};
    enc.itens.filter((i) => i.estado_producao !== 'recusado').forEach((i) => {
      mapaItens[i.produto_nome] = i.quantidade;
    });

    const clienteAdapter: ClienteEmpresarialB2B = {
      id: enc.id,
      nome: enc.cliente.nome,
      telefone: enc.cliente.telefone,
      telemovel: enc.cliente.telefone,
      email: enc.cliente.email || '',
      morada: enc.cliente.morada || 'Arouca',
      carrinha_id: enc.carrinha_id || car?.id || '',
      ativo: true,
      quantidades_semanais: {
        [diaSemanaHoje]: mapaItens,
        seg: {}, ter: {}, qua: {}, qui: {}, sex: {}, sab: {}, dom: {},
      },
    };

    setPdfModalTipo('comprovativo_b2b');
    setPdfClienteB2B(clienteAdapter);
    setPdfCarrinhaSelecionada(car);
    setPdfModalOpen(true);
  };

  // Otimizar rota automaticamente por horário e código postal
  const handleOtimizarRota = () => {
    const sorted = [...entregasAtribuidas].sort((a, b) => {
      const timeCmp = a.hora_agendamento.localeCompare(b.hora_agendamento);
      if (timeCmp !== 0) return timeCmp;
      return (a.cliente.morada || '').localeCompare(b.cliente.morada || '');
    });
    setOrdensCustomizadas((prev) => ({
      ...prev,
      [rotaKey]: sorted.map((e) => e.id),
    }));
    registarLogAuditoria({
      utilizador_id: currentUser.id,
      utilizador_nome: currentUser.nome,
      utilizador_role: currentUser.role,
      loja_id: lojaAtual.id,
      loja_nome: lojaAtual.nome,
      painel: 'entregas',
      acao: 'Otimização de Rota',
      detalhes: `Sequência de paragens reordenada e otimizada automaticamente por horário e proximidade geográfica por ${currentUser.nome}.`,
    });
  };

  // Atribuir encomenda a uma carrinha
  const handleAtribuirCarrinha = async (encomendaId: string, carrinhaId: string | null) => {
    await atribuirCarrinhaDb(encomendaId, carrinhaId);
    const enc = encomendas.find((e) => e.id === encomendaId);
    const carrinhaObj = CARRINHAS_MOCK.find((c) => c.id === carrinhaId);
    if (enc) {
      await registarLogAuditoria({
        encomenda_id: enc.id,
        codigo_encomenda: enc.codigo,
        cliente_nome: enc.cliente.nome,
        utilizador_id: currentUser.id,
        utilizador_nome: currentUser.nome,
        utilizador_role: currentUser.role,
        loja_id: enc.loja_id,
        loja_nome: enc.loja_nome,
        painel: 'entregas',
        acao: 'Atribuição a Carrinha',
        detalhes: carrinhaId 
          ? `Pedido ${enc.codigo} atribuído à ${carrinhaObj?.identificador || 'carrinha'} por ${currentUser.nome}.`
          : `Pedido ${enc.codigo} desatribuído da carrinha (devolvido ao pool) por ${currentUser.nome}.`,
      });
    }

    setEncomendas((prev) =>
      prev.map((e) =>
        e.id === encomendaId
          ? { ...e, carrinha_id: carrinhaId || undefined, carrinha_nome: carrinhaObj?.identificador }
          : e
      )
    );
  };

  // Drag & drop de paragens na rota da carrinha (Reordenação do Motorista)
  const handleDropStop = (targetIndex: number) => {
    if (draggedStopIndex === null || draggedStopIndex === targetIndex) {
      setDraggedStopIndex(null);
      return;
    }
    const currentOrder = entregasOrdenadas.map((e) => e.id);
    const itemToMove = currentOrder[draggedStopIndex];
    currentOrder.splice(draggedStopIndex, 1);
    currentOrder.splice(targetIndex, 0, itemToMove);

    setOrdensCustomizadas((prev) => ({
      ...prev,
      [rotaKey]: currentOrder,
    }));
    setDraggedStopIndex(null);
  };

  // Alterar morada diretamente
  const handleEditarMorada = async (enc: Encomenda) => {
    const novaMorada = window.prompt(
      `Atualizar morada de entrega para ${enc.cliente.nome}:`,
      enc.cliente.morada || ''
    );
    if (novaMorada === null || !novaMorada.trim()) return;

    const moradaLimpa = novaMorada.trim();
    if (supabase && enc.cliente.id) {
      await supabase
        .from('clientes')
        .update({ morada: moradaLimpa })
        .eq('id', enc.cliente.id);
    }

    await registarLogAuditoria({
      encomenda_id: enc.id,
      codigo_encomenda: enc.codigo,
      cliente_nome: enc.cliente.nome,
      utilizador_id: currentUser.id,
      utilizador_nome: currentUser.nome,
      utilizador_role: currentUser.role,
      loja_id: enc.loja_id,
      loja_nome: enc.loja_nome,
      painel: 'entregas',
      acao: 'Alteração de Morada de Entrega',
      detalhes: `Morada de entrega atualizada para "${moradaLimpa}" por ${currentUser.nome}.`,
    });

    setEncomendas((prev) =>
      prev.map((e) =>
        e.id === enc.id
          ? { ...e, cliente: { ...e.cliente, morada: moradaLimpa } }
          : e
      )
    );
  };

  // Mudar para Levantamento em Loja
  const handleMudarParaLoja = async (enc: Encomenda) => {
    if (!window.confirm(`Deseja converter a encomenda ${enc.codigo} para LEVANTAMENTO EM LOJA? Ela sairá da rota da carrinha.`)) {
      return;
    }

    const ok = await alternarTipoEntregaDb(enc.id, 'levantamento_loja');
    if (ok) {
      setEncomendas((prev) =>
        prev.map((e) =>
          e.id === enc.id ? { ...e, tipo: 'levantamento_loja', carrinha_id: undefined } : e
        )
      );
      alert(`Encomenda ${enc.codigo} movida para o Balcão de Entrega em Loja!`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <Navbar selectedLojaId={selectedLojaId} onSelectLoja={setSelectedLojaId} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:px-6">
        {/* Aviso de Modo de Apenas Leitura */}
        {!temPermissaoEdicao && (
          <div className="mb-6 rounded-2xl bg-blue-50 border border-blue-300 p-4 flex items-center gap-3 text-blue-950 text-xs shadow-xs">
            <Eye className="h-5 w-5 text-blue-700 shrink-0" />
            <div>
              <p className="font-bold">{t.readOnlyNotice}</p>
              <p className="text-blue-900/80 mt-0.5">O seu perfil de utilizador tem apenas permissão de consulta neste painel. As ações de alteração de rota, carrinhas e conclusão estão desativadas.</p>
            </div>
          </div>
        )}

        {/* Notificação Operacional de Turno (Apenas Hoje) */}
        <div className="mb-4 flex items-center justify-between text-xs bg-white border border-stone-200 rounded-xl px-4 py-2.5 shadow-2xs">
          <div className="flex items-center gap-2 text-stone-700">
            <Clock className="h-4 w-4 text-amber-600" />
            <span className="font-semibold">{t.todayOrdersOnlyNotice}</span>
          </div>
          <span className="font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md">
            {hoje}
          </span>
        </div>

        {/* SEÇÃO: POOL DE ENCOMENDAS POR ATRIBUIR */}
        <div 
          onDragOver={(e) => {
            if (!temPermissaoEdicao) return;
            e.preventDefault();
            setIsDragOverPool(true);
          }}
          onDragLeave={() => setIsDragOverPool(false)}
          onDrop={async (e) => {
            if (!temPermissaoEdicao) return;
            e.preventDefault();
            setIsDragOverPool(false);
            const encId = e.dataTransfer.getData('text/plain') || draggedEncId;
            if (encId) {
              await handleAtribuirCarrinha(encId, null);
              setDraggedEncId(null);
            }
          }}
          className={`mb-6 rounded-2xl border-2 transition-all p-4 ${
            isDragOverPool 
              ? 'bg-amber-100/70 border-amber-500 ring-4 ring-amber-300' 
              : 'bg-white border-amber-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500 text-white shadow-2xs">
                <Inbox className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-stone-900 uppercase tracking-wide">
                    Pool de Encomendas por Atribuir
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                    {encomendasPool.length} {encomendasPool.length === 1 ? 'encomenda' : 'encomendas'}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500">
                  Arraste ou atribua diretamente as encomendas deste dia para os carros e rotas de distribuição
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMostrarPool(!mostrarPool)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
            >
              <span>{mostrarPool ? 'Ocultar Pool' : 'Mostrar Pool'}</span>
              {mostrarPool ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>

          {mostrarPool && (
            encomendasPool.length === 0 ? (
              <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 p-6 text-center text-xs text-emerald-800 font-medium flex items-center justify-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Todas as encomendas de entrega ao domicílio de hoje já estão atribuídas aos carros e rotas!</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {encomendasPool.map((enc) => (
                  <div
                    key={enc.id}
                    draggable={temPermissaoEdicao}
                    onDragStart={(e) => {
                      if (!temPermissaoEdicao) return;
                      e.dataTransfer.setData('text/plain', enc.id);
                      setDraggedEncId(enc.id);
                    }}
                    onDragEnd={() => setDraggedEncId(null)}
                    className="p-3 rounded-xl bg-amber-50/40 border border-amber-200 hover:border-amber-400 shadow-2xs hover:shadow-sm transition cursor-grab active:cursor-grabbing flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5 flex-wrap">
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-black text-xs text-amber-950 bg-amber-200/80 px-1.5 py-0.5 rounded">
                            {enc.codigo}
                          </span>
                          <OriginBadge origem={enc.canal_origem} compact />
                        </div>
                        <span className="text-[11px] font-bold text-stone-600 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-amber-600" />
                          {enc.hora_agendamento}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-stone-900 truncate">{enc.cliente.nome}</h4>
                      <p className="text-[11px] text-stone-600 flex items-start gap-1 mt-1 truncate">
                        <MapPin className="h-3 w-3 text-red-500 shrink-0 mt-0.5" />
                        <span className="truncate">{enc.cliente.morada || 'Arouca'}</span>
                      </p>
                      <p className="text-[10px] text-stone-500 mt-1">
                        {enc.itens.reduce((acc, i) => acc + i.quantidade, 0)} itens • Loja: {enc.loja_nome}
                      </p>
                    </div>

                    {/* Botões Rápidos de Atribuição Direta (ótimo para touch/mobile) */}
                    {temPermissaoEdicao && (
                      <div className="mt-3 pt-2 border-t border-amber-200/60 flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold text-stone-500">Atribuir:</span>
                        <div className="flex items-center gap-1">
                          {carrinhasDaLoja.map((car) => (
                            <button
                              key={car.id}
                              type="button"
                              onClick={() => handleAtribuirCarrinha(enc.id, car.id)}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-stone-300 hover:border-blue-500 hover:bg-blue-50 text-stone-800 transition cursor-pointer"
                              title={`Atribuir à ${car.rota || car.identificador}`}
                            >
                              {(car.rota || car.identificador).replace('Rota ', 'R').replace('Carrinha ', 'R')}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* CABEÇALHO DA FROTA E GESTÃO DE ROTA */}
        <div className="rounded-2xl bg-white p-5 border border-blue-200 shadow-xs mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-blue-600 text-white shadow-sm">
                <Truck className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg md:text-xl font-black text-gray-900 leading-tight whitespace-nowrap flex items-center gap-2">
                  <span className="truncate">{configMarca.tituloEntregas || t.deliveriesTitle}</span>
                  <span className="text-xs font-bold text-blue-900 bg-blue-100/90 border border-blue-300 px-2.5 py-0.5 rounded-lg shrink-0">
                    {selectedLojaId === 'todas' ? t.allStores : lojaAtual.nome}
                  </span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {configMarca.subtituloEntregas || t.deliveriesDesc} • {configMarca.avisoEntregas || 'Carga na Unidade Central de Fabrico & Sede'}
                </p>
              </div>
            </div>

            {/* Dropzone & Seletor de Loja e Carrinha */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Seletor de Loja do Painel de Entregas */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-stone-50 border-stone-200">
                <Store className="h-4 w-4 text-stone-700 shrink-0" />
                <span className="text-xs font-semibold text-stone-900">{t.store}:</span>
                <select
                  value={selectedLojaId}
                  onChange={(e) => setSelectedLojaId(e.target.value)}
                  className="bg-transparent text-xs font-bold text-stone-950 focus:outline-hidden cursor-pointer"
                >
                  <option value="todas">{t.allStores}</option>
                  {lojas.map((l) => (
                    <option key={l.id} value={l.id}>{l.nome}</option>
                  ))}
                </select>
              </div>
              <div 
                onDragOver={(e) => {
                  if (!temPermissaoEdicao) return;
                  e.preventDefault();
                  setIsDragOverVan(carrinhaSelecionadaId);
                }}
                onDragLeave={() => setIsDragOverVan(null)}
                onDrop={async (e) => {
                  if (!temPermissaoEdicao) return;
                  e.preventDefault();
                  setIsDragOverVan(null);
                  const encId = e.dataTransfer.getData('text/plain') || draggedEncId;
                  if (encId && carrinhaSelecionadaId !== 'todas') {
                    await handleAtribuirCarrinha(encId, carrinhaSelecionadaId);
                    setDraggedEncId(null);
                  }
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition ${
                  isDragOverVan 
                    ? 'bg-blue-200 border-blue-600 ring-2 ring-blue-400' 
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <Truck className="h-4 w-4 text-blue-700" />
                <span className="text-xs font-semibold text-blue-900">{t.van}:</span>
                <select
                  value={carrinhaSelecionadaId}
                  onChange={(e) => setCarrinhaSelecionadaId(e.target.value)}
                  className="bg-transparent text-xs font-bold text-blue-950 focus:outline-hidden cursor-pointer"
                >
                  <option value="todas">{t.allVans}</option>
                  {carrinhasDaLoja.map((car) => (
                    <option key={car.id} value={car.id}>
                      {car.rota || car.identificador} — {car.nome_carro || car.matricula} ({car.matricula})
                    </option>
                  ))}
                </select>
              </div>

              {/* Botão de Folha de Carga em PDF (@react-pdf/renderer) */}
              <button
                type="button"
                onClick={() => abrirFolhaCargaPdf()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-xs transition cursor-pointer"
                title="Gerar Folha de Carga em PDF oficial com totais de caixas e pão por carrinha (Rotas 1 a 7)"
              >
                <FileText className="h-4 w-4 shrink-0" />
                <span>Folha de Carga</span>
              </button>

              {/* Botão de Otimizar Rota Automática */}
              {temPermissaoEdicao && entregasAtribuidas.length > 1 && (
                <button
                  type="button"
                  onClick={handleOtimizarRota}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold shadow-2xs transition cursor-pointer"
                  title="Ordenar automaticamente por hora de entrega e percurso"
                >
                  <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                  <span>Otimizar Rota</span>
                </button>
              )}
            </div>
          </div>



          {/* Painel de Controlo do Ciclo da Rota */}
          {entregasOrdenadas.length > 0 && (
            <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/80 p-3.5 rounded-xl border">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white font-bold shadow-xs ${
                  infoRota.estado === 'concluida' 
                    ? 'bg-emerald-600' 
                    : infoRota.estado === 'em_curso' 
                    ? 'bg-amber-500 animate-pulse' 
                    : 'bg-stone-400'
                }`}>
                  {infoRota.estado === 'concluida' ? (
                    <Flag className="h-5 w-5" />
                  ) : infoRota.estado === 'em_curso' ? (
                    <Truck className="h-5 w-5" />
                  ) : (
                    <Clock className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-gray-900 uppercase">
                      {infoRota.estado === 'concluida' 
                        ? t.routeCompleted 
                        : infoRota.estado === 'em_curso' 
                        ? t.routeInProgress 
                        : t.routeNotStarted}
                    </span>
                    <span className="text-[11px] font-bold text-gray-500">
                      ({paragensConcluidas} de {totalParagens} paragens concluídas)
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    {infoRota.horaInicio && `Partida da Central: ${infoRota.horaInicio}`}
                    {infoRota.horaFim && ` • Retorno à Central: ${infoRota.horaFim}`}
                    {!infoRota.horaInicio && 'As paragens serão desbloqueadas sequencialmente após iniciar a rota. O motorista pode reordenar as paragens arrastando os cartões.'}
                  </p>
                </div>
              </div>

              {/* Botões de Ação de Ciclo */}
              <div className="flex items-center gap-2">
                {infoRota.estado === 'nao_iniciada' && (
                  <button
                    type="button"
                    disabled={!temPermissaoEdicao}
                    onClick={handleIniciarRota}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50"
                  >
                    <Play className="h-4 w-4 fill-white" />
                    <span>{t.startRoute}</span>
                  </button>
                )}

                {infoRota.estado === 'em_curso' && todasEntregues && (
                  <button
                    type="button"
                    disabled={!temPermissaoEdicao}
                    onClick={handleConcluirRota}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg transition cursor-pointer"
                  >
                    <Flag className="h-4 w-4" />
                    <span>{t.endRoute}</span>
                  </button>
                )}

                {infoRota.estado === 'concluida' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Turno de Entregas Finalizado
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* CLIENTES EMPRESARIAIS B2B DA ROTA (FILTRANDO QUEM TEM 0 UN. HOJE) */}
        {clientesB2BAtivosComCargaHoje.length > 0 && (
          <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 border-2 border-amber-300 p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-600 text-white font-black text-xs shadow-xs">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-stone-900">
                    Clientes Empresariais B2B da Rota ({clientesB2BAtivosComCargaHoje.length})
                  </h3>
                  <p className="text-[11px] text-stone-600">
                    Paragens institucionais fixas com entregas agendadas para hoje ({nomesDiaSemana[diaSemanaHoje] || diaSemanaHoje.toUpperCase()})
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {clientesB2BAtivosComCargaHoje.map(({ cli, itensHoje, totalQtd }) => {
                const carrinhaDoCli = carrinhas.find((c) => c.id === cli.carrinha_id);

                return (
                  <div
                    key={cli.id}
                    className="rounded-xl bg-white border border-amber-200/90 p-3 shadow-2xs hover:shadow-sm transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-black text-stone-900 truncate">{cli.nome}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 shrink-0">
                          {carrinhaDoCli?.rota || carrinhaDoCli?.identificador || 'Rota'}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 flex items-center gap-1 mb-2">
                        <MapPin className="h-3 w-3 text-red-500 shrink-0" />
                        <span className="truncate">{cli.morada || 'Arouca'}</span>
                      </p>

                      <div className="rounded-lg bg-stone-50 p-2 mb-3 text-[11px] space-y-1">
                        <div className="font-bold text-stone-700 flex justify-between">
                          <span>Total Hoje ({nomesDiaSemana[diaSemanaHoje]}):</span>
                          <span className="font-black text-amber-800">{totalQtd} un.</span>
                        </div>
                        {itensHoje
                          .slice(0, 3)
                          .map(([art, q]) => (
                            <div key={art} className="text-stone-600 flex justify-between text-[10px]">
                              <span className="truncate mr-1">{art}:</span>
                              <span className="font-semibold">{q} un.</span>
                            </div>
                          ))}
                        {itensHoje.length > 3 && (
                          <p className="text-[10px] text-stone-400 italic">
                            +{itensHoje.length - 3} outros artigos...
                          </p>
                        )}
                      </div>
                    </div>

                    {cli.telefone && (
                      <div className="pt-2 border-t border-stone-100 flex items-center justify-end">
                        <a
                          href={`tel:${cli.telefone.replace(/\s+/g, '')}`}
                          className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition"
                          title="Ligar para o cliente"
                        >
                          <Phone className="h-3.5 w-3.5 text-emerald-600" />
                          <span>{cli.telefone}</span>
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ENTREGAS RECORRENTES PORTA-A-PORTA DA ROTA (CLIENTES PARTICULARES & MODO FÉRIAS) */}
        {(() => {
          const basesDaRota = basesRecorrentes.filter(
            (b) => b.ativo && (carrinhaSelecionadaId === 'todas' || b.carrinha_id === carrinhaSelecionadaId)
          );
          if (basesDaRota.length === 0) return null;

          const totalAtivasHoje = basesDaRota.filter((b) => !clienteEmModoFerias(b, hoje)).length;
          const totalEmFerias = basesDaRota.filter((b) => clienteEmModoFerias(b, hoje)).length;

          return (
            <div className="rounded-2xl bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-teal-500/10 border-2 border-teal-300 p-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-600 text-white font-black text-xs shadow-xs">
                    <Home className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-stone-900">
                        Entregas Diárias Porta-a-Porta ({basesDaRota.length})
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {totalAtivasHoje} ativas hoje
                      </span>
                      {totalEmFerias > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                          <Palmtree className="h-3 w-3" />
                          {totalEmFerias} em férias
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-600">
                      Clientes particulares fixos com entrega diária. O motorista pode ativar a pausa de férias de imediato no terreno.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {basesDaRota.map((base) => {
                  const mapaHoje = base.quantidades_semanais?.[diaSemanaHoje] || {};
                  const totalQtdHoje = Object.values(mapaHoje).reduce((acc: number, val) => acc + (typeof val === 'number' ? val : 0), 0);
                  const carrinhaDaBase = carrinhas.find((c) => c.id === base.carrinha_id);
                  const estaEmFerias = clienteEmModoFerias(base, hoje);

                  const rotuloPagamento: Record<string, string> = {
                    dinheiro_ao_motorista: 'Dinheiro',
                    conta_mensal: 'Mensal',
                    mbway_semanal: 'MBWay',
                    multibanco: 'Multibanco'
                  };

                  return (
                    <div
                      key={base.id}
                      className={`rounded-xl border p-3 shadow-2xs hover:shadow-sm transition flex flex-col justify-between ${
                        estaEmFerias ? 'bg-amber-50/70 border-amber-300' : 'bg-white border-teal-200/90'
                      }`}
                    >
                      <div>
                        {/* Cabeçalho do Cartão */}
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-xs font-black text-stone-900 truncate">
                            {base.cliente_nome || 'Cliente Particular'}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-900 shrink-0">
                            {carrinhaDaBase?.rota || carrinhaDaBase?.identificador || 'Rota'}
                          </span>
                        </div>

                        {/* Morada e Maps */}
                        {base.cliente_morada && (
                          <p className="text-[11px] text-stone-500 flex items-center gap-1 mb-1.5">
                            <MapPin className="h-3 w-3 text-red-500 shrink-0" />
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(base.cliente_morada + ', Arouca, Portugal')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="truncate hover:text-blue-600 hover:underline"
                              title="Abrir no Google Maps"
                            >
                              {base.cliente_morada}
                            </a>
                          </p>
                        )}

                        {/* Notas do Motorista */}
                        {base.notas_motorista && (
                          <div className="text-[10px] bg-amber-50 text-amber-900 border border-amber-200/70 rounded-md px-2 py-1 mb-2 font-medium flex items-center gap-1">
                            <span className="font-bold">💡</span>
                            <span className="truncate">{base.notas_motorista}</span>
                          </div>
                        )}

                        {/* Banner de Modo Férias ou Detalhe de Pão */}
                        {estaEmFerias ? (
                          <div className="rounded-lg bg-amber-100/80 border border-amber-300 p-2 mb-3 text-[11px] text-amber-950 font-bold space-y-1">
                            <div className="flex items-center gap-1.5 text-amber-900">
                              <Palmtree className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                              <span>Em Modo Férias</span>
                            </div>
                            <div className="text-[10px] text-amber-800 font-normal">
                              {base.pausa_fim ? `Pausa até ${base.pausa_fim}` : 'Pausa de entregas ativa'}
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-lg bg-stone-50 p-2 mb-3 text-[11px] space-y-1">
                            <div className="font-bold text-stone-700 flex justify-between">
                              <span>Hoje ({nomesDiaSemana[diaSemanaHoje]}):</span>
                              <span className="font-black text-teal-800">
                                {totalQtdHoje > 0 ? `${totalQtdHoje} un.` : '0 un.'}
                              </span>
                            </div>
                            {totalQtdHoje > 0 ? (
                              Object.entries(mapaHoje)
                                .filter(([, q]) => typeof q === 'number' && q > 0)
                                .slice(0, 3)
                                .map(([art, q]) => (
                                  <div key={art} className="text-stone-600 flex justify-between text-[10px]">
                                    <span className="truncate mr-1">{art}:</span>
                                    <span className="font-semibold">{q} un.</span>
                                  </div>
                                ))
                            ) : (
                              <p className="text-[10px] text-stone-400 italic">Sem pão configurado para hoje</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Rodapé com Telefone e Botão de Férias */}
                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                            {rotuloPagamento[base.metodo_pagamento] || 'Dinheiro'}
                          </span>
                          {base.cliente_telefone && (
                            <a
                              href={`tel:${base.cliente_telefone.replace(/\s+/g, '')}`}
                              className="flex items-center gap-1 py-1 px-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-semibold transition"
                              title="Ligar"
                            >
                              <Phone className="h-3 w-3 text-emerald-600" />
                              <span>{base.cliente_telefone}</span>
                            </a>
                          )}
                        </div>

                        {estaEmFerias ? (
                          <button
                            type="button"
                            onClick={() => handleCancelarFerias(base)}
                            disabled={salvandoFerias}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-2xs transition cursor-pointer flex items-center gap-1"
                          >
                            <Check className="h-3 w-3" />
                            Retomar
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAbrirModalFerias(base)}
                            disabled={salvandoFerias}
                            className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                          >
                            <Palmtree className="h-3 w-3 text-amber-600" />
                            Férias
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* LISTA SEQUENCIAL DE PARAGENS COM REORDENAÇÃO ARRASTAR & LARGAR */}
        {entregasOrdenadas.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-200 p-12 text-center">
            <PackageCheck className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-gray-800">{t.noDeliveriesFound}</h3>
            <p className="text-xs text-gray-500 mt-1">
              Não existem entregas ao domicílio atribuídas a esta carrinha para hoje.
              {encomendasPool.length > 0 && ' Atribua encomendas a partir do Pool acima.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {entregasOrdenadas.map((enc, index) => {
              const jaEntregue = enc.estado === 'entregue';
              const isActiveStop = index === activeStopIndex;
              const isLocked = infoRota.estado !== 'em_curso' || (!jaEntregue && index > activeStopIndex);
              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                enc.cliente.morada || 'Arouca, Portugal'
              )}`;

              return (
                <div
                  key={enc.id}
                  draggable={temPermissaoEdicao && !jaEntregue}
                  onDragStart={(e) => {
                    if (!temPermissaoEdicao || jaEntregue) return;
                    setDraggedStopIndex(index);
                    e.dataTransfer.setData('text/plain', enc.id);
                  }}
                  onDragOver={(e) => {
                    if (!temPermissaoEdicao) return;
                    e.preventDefault();
                  }}
                  onDrop={(e) => {
                    if (!temPermissaoEdicao) return;
                    e.preventDefault();
                    handleDropStop(index);
                  }}
                  className={`rounded-2xl bg-white border-2 transition shadow-xs overflow-hidden ${
                    jaEntregue
                      ? 'border-emerald-200 bg-emerald-50/20 opacity-80'
                      : isActiveStop && infoRota.estado === 'em_curso'
                      ? 'border-blue-500 ring-2 ring-blue-400/20 shadow-md'
                      : isLocked
                      ? 'border-gray-200 bg-stone-50/60 opacity-85'
                      : 'border-blue-200'
                  }`}
                >
                  {/* Cabeçalho da Paragem */}
                  <div className={`p-4 flex items-center justify-between border-b ${
                    jaEntregue 
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-100' 
                      : isActiveStop && infoRota.estado === 'em_curso'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-stone-100 text-stone-900 border-stone-200'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      {temPermissaoEdicao && !jaEntregue && (
                        <span 
                          className="cursor-grab active:cursor-grabbing text-stone-400 hover:text-stone-700" 
                          title="Arrastar para reordenar a sequência de paragens"
                        >
                          <GripVertical className="h-5 w-5" />
                        </span>
                      )}

                      <span className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black shadow-xs ${
                        jaEntregue 
                          ? 'bg-emerald-700 text-white' 
                          : isActiveStop && infoRota.estado === 'em_curso'
                          ? 'bg-white text-blue-700 font-black'
                          : 'bg-stone-800 text-white'
                      }`}>
                        #{index + 1}
                      </span>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-mono font-bold ${
                            isActiveStop && infoRota.estado === 'em_curso' ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {enc.codigo}
                          </span>
                          <OriginBadge origem={enc.canal_origem} compact />
                          {enc.carrinha_nome && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isActiveStop && infoRota.estado === 'em_curso' ? 'bg-blue-800 text-blue-100' : 'bg-stone-200 text-stone-800'
                            }`}>
                              {enc.carrinha_nome}
                            </span>
                          )}
                          {isActiveStop && infoRota.estado === 'em_curso' && (
                            <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-stone-950 px-2 py-0.5 rounded-md shadow-xs animate-pulse">
                              A Entregar Agora
                            </span>
                          )}
                          {isLocked && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-gray-200 px-2 py-0.5 rounded-md">
                              <Lock className="h-3 w-3" /> Paragem Bloqueada
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold leading-tight mt-0.5">{enc.cliente.nome}</h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border shadow-2xs ${
                        isActiveStop && infoRota.estado === 'em_curso'
                          ? 'bg-blue-700 text-white border-blue-500'
                          : 'bg-white text-stone-800 border-gray-200'
                      }`}>
                        <Clock className="h-3.5 w-3.5" /> {enc.hora_agendamento}
                      </span>
                    </div>
                  </div>

                  {/* Corpo da Paragem com Morada e Instruções */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2 text-xs text-gray-800">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{enc.cliente.morada || 'Morada não especificada'}</p>
                          {enc.cliente.codigo_postal && (
                            <p className="text-gray-500 font-medium">{enc.cliente.codigo_postal} • Arouca</p>
                          )}
                          {enc.cliente.notas_entrega && (
                            <p className="text-amber-900 italic font-medium mt-1 bg-amber-50 p-2 rounded-lg border border-amber-200">
                              Obs: {enc.cliente.notas_entrega}
                            </p>
                          )}
                        </div>
                      </div>
                      {temPermissaoEdicao && !jaEntregue && (
                        <button
                          type="button"
                          onClick={() => handleEditarMorada(enc)}
                          className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 shrink-0 transition cursor-pointer"
                          title="Alterar Morada de Entrega"
                        >
                          <Edit3 className="h-3 w-3" />
                          {t.changeAddress}
                        </button>
                      )}
                    </div>

                    {/* Resumo Operacional dos Artigos (sem preços nem pagamentos) */}
                    <div className="rounded-xl bg-gray-50 p-3 text-xs border border-gray-200/80">
                      <p className="text-[11px] font-bold text-gray-500 uppercase mb-1.5 tracking-wider">{t.itemsToDeliver}</p>
                      <ul className="space-y-1.5">
                        {enc.itens.map((item) => {
                          const isRecusado = item.estado_producao === 'recusado';
                          return (
                            <li
                              key={item.id}
                              className={`flex items-center justify-between font-medium ${
                                isRecusado ? 'text-red-700 line-through opacity-75' : 'text-gray-800'
                              }`}
                            >
                              <span>
                                <b className={`${isRecusado ? 'text-red-700' : 'text-amber-800'} font-bold mr-1`}>
                                  {item.quantidade}x
                                </b>{' '}
                                {item.produto_nome}
                                {item.notas_personalizacao && (
                                  <span className="block text-[11px] text-amber-800 italic pl-3">
                                    » {item.notas_personalizacao}
                                  </span>
                                )}
                              </span>
                              {isRecusado && (
                                <StatusBadge variant="alerta" label="Não Produzido" className="ml-2 text-[10px] py-0 px-1.5 no-underline shrink-0" />
                              )}
                            </li>
                          );
                        })}
                      </ul>
                      {enc.observacoes_producao && (
                        <div className="mt-2 rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-950">
                          <span className="text-[10px] font-bold uppercase text-amber-800 flex items-center gap-1 mb-0.5">
                            <MessageSquare className="h-3 w-3 text-amber-700 shrink-0" />
                            Observações da Produção:
                          </span>
                          <p className="font-medium">{enc.observacoes_producao}</p>
                        </div>
                      )}
                      <div className="mt-2.5 pt-2 border-t border-gray-200 flex justify-between text-xs font-bold text-gray-700">
                        <span>{t.totalItems}:</span>
                        <span className="font-black text-gray-900">
                          {enc.itens
                            .filter((i) => i.estado_producao !== 'recusado')
                            .reduce((acc, i) => acc + i.quantidade, 0)}{' '}
                          un.
                        </span>
                      </div>
                    </div>

                    {/* Registo de Data e Hora Real se Entregue */}
                    {jaEntregue && (enc.hora_entrega_real || enc.data_entrega_real) && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-600" />
                        <span>
                          Entregue com sucesso em {enc.data_entrega_real || enc.data_agendamento}
                          {enc.hora_entrega_real ? ` às ${enc.hora_entrega_real}` : ''} (Agendado: {enc.hora_agendamento})
                        </span>
                      </div>
                    )}

                    {/* Visualizador de Navegação GPS Embutido (Google Maps iframe) */}
                    {mapaAbertoId === enc.id && (
                      <div className="rounded-2xl overflow-hidden border-2 border-blue-400 shadow-md bg-stone-100">
                        <div className="bg-blue-600 text-white px-3 py-1.5 text-xs font-bold flex items-center justify-between">
                          <span className="flex items-center gap-1.5 truncate mr-2">
                            <MapPin className="h-3.5 w-3.5 shrink-0" /> {enc.cliente.morada || 'Arouca'}
                          </span>
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline text-[11px] text-blue-100 hover:text-white flex items-center gap-1 shrink-0"
                          >
                            <Navigation className="h-3 w-3" /> Abrir no App Google Maps
                          </a>
                        </div>
                        <iframe
                          title={`Navegação - ${enc.cliente.nome}`}
                          width="100%"
                          height="280"
                          style={{ border: 0 }}
                          loading="lazy"
                          allowFullScreen
                          src={`https://maps.google.com/maps?q=${encodeURIComponent(enc.cliente.morada || 'Arouca, Portugal')}&output=embed`}
                        />
                      </div>
                    )}

                    {/* Aviso de bloqueio sequencial */}
                    {isLocked && infoRota.estado === 'em_curso' && (
                      <div className="p-2.5 rounded-xl bg-stone-100 border border-stone-200 text-stone-600 text-xs font-semibold flex items-center gap-2">
                        <Lock className="h-4 w-4 text-stone-500 shrink-0" />
                        <span>{t.nextDeliveryLocked}</span>
                      </div>
                    )}

                    {/* Botões de Ação para o Motorista */}
                    <div className="pt-2 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-bold">
                      {/* Comprovativo de Entrega em PDF assinado */}
                      <button
                        type="button"
                        onClick={() => abrirComprovativoEncomenda(enc)}
                        className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-[11px] bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition cursor-pointer font-bold"
                        title="Gerar Comprovativo de Entrega em PDF com assinatura digital no telemóvel"
                      >
                        <FileText className="h-4 w-4 text-rose-600" />
                        Comprovativo
                      </button>
                      <a
                        href={`tel:${enc.cliente.telefone.replace(/\s+/g, '')}`}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-gray-100 py-2.5 px-2 text-gray-800 hover:bg-gray-200 transition"
                      >
                        <Phone className="h-4 w-4 text-emerald-600" />
                        {t.callClient}
                      </a>

                      {/* Botão de Alternar Mapa Integrado */}
                      <button
                        type="button"
                        onClick={() => setMapaAbertoId(mapaAbertoId === enc.id ? null : enc.id)}
                        className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 transition border cursor-pointer ${
                          mapaAbertoId === enc.id
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                        }`}
                      >
                        <MapIcon className="h-4 w-4" />
                        {mapaAbertoId === enc.id ? t.hideMap : t.embeddedMap}
                      </button>

                      {/* Mudar para Levantamento em Loja se o cliente preferir */}
                      <button
                        type="button"
                        onClick={() => temPermissaoEdicao && handleMudarParaLoja(enc)}
                        disabled={!temPermissaoEdicao || jaEntregue}
                        className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-[11px] transition border ${
                          temPermissaoEdicao && !jaEntregue
                            ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 cursor-pointer'
                            : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                        }`}
                        title="Transferir para balcão de loja"
                      >
                        <Store className="h-4 w-4 text-amber-600" />
                        + {t.pickupStore}
                      </button>

                      {/* Concluir Entrega */}
                      <div>
                        {jaEntregue ? (
                          <div className="flex items-center justify-center gap-1 h-full rounded-xl bg-emerald-100 text-emerald-800 py-2.5 font-bold">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> {t.stopDeliveryCompleted}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => temPermissaoEdicao && confirmarEntrega(enc.id)}
                            disabled={!temPermissaoEdicao || isLocked}
                            className={`w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-white shadow-xs transition ${
                              temPermissaoEdicao && !isLocked
                                ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 cursor-pointer font-bold'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60 font-bold'
                            }`}
                          >
                            <CheckCircle2 className="h-4 w-4" /> {t.completeDelivery}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Ação Operacional: Devolver para o Pool ou Transferir Carrinha */}
                    {temPermissaoEdicao && !jaEntregue && (
                      <div className="pt-2 border-t border-stone-200/70 flex items-center justify-between text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleAtribuirCarrinha(enc.id, null)}
                          className="text-stone-500 hover:text-amber-800 font-semibold flex items-center gap-1 transition cursor-pointer"
                        >
                          <RotateCcw className="h-3 w-3" /> Devolver ao Pool de Encomendas
                        </button>

                        <div className="flex items-center gap-1 text-stone-500">
                          <span>Mudar:</span>
                          {carrinhasDaLoja.filter((c) => c.id !== enc.carrinha_id).map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleAtribuirCarrinha(enc.id, c.id)}
                              className="px-1.5 py-0.5 rounded bg-stone-100 hover:bg-blue-100 text-stone-700 hover:text-blue-900 font-bold text-[10px] transition cursor-pointer"
                            >
                              {c.identificador.replace('Carrinha ', 'C')}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal de PDF (Folha de Carga ou Comprovativo B2B com Assinatura Digital Touchscreen) */}
      <PdfViewerModal
        isOpen={pdfModalOpen}
        tipo={pdfModalTipo}
        onClose={() => setPdfModalOpen(false)}
        carrinha={pdfCarrinhaSelecionada}
        diaSemana={diaSemanaHoje as any}
        dataReferencia={hoje}
        itensCarga={pdfItensCarga}
        clientesB2BRota={clientesB2B.filter((cli) => cli.ativo && cli.carrinha_id === pdfCarrinhaSelecionada?.id)}
        encomendasRota={encomendas.filter(
          (e) => (pdfCarrinhaSelecionada ? e.carrinha_id === pdfCarrinhaSelecionada.id : true) &&
                 e.data_agendamento === hoje &&
                 e.tipo === 'entrega_domicilio' &&
                 e.estado !== 'cancelado'
        )}
        clienteB2B={pdfClienteB2B}
        nomeCondutor={currentUser.nome}
        matriculaCarro={pdfCarrinhaSelecionada?.matricula}
      />

      {/* Modal de Modo Férias (Motorista no Terreno) */}
      {modalFeriasBase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-amber-300 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <Palmtree className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">Ativar Modo Férias / Pausa</h3>
                  <p className="text-[11px] text-gray-500">Pausa temporária de entregas porta-a-porta</p>
                </div>
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
                Durante o período de férias, o pão deste cliente não entrará nas contas do forno nem na folha de carga da carrinha.
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
                <label className="block font-bold text-gray-700 mb-1">Data de Retorno / Fim da Pausa (inclusive) *</label>
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
                    fimD.setDate(d.getDate() + 3);
                    setFeriasInicio(inicio);
                    setFeriasFim(fimD.toISOString().split('T')[0]);
                  }}
                  className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-[10px] font-bold text-gray-700 cursor-pointer"
                >
                  3 dias
                </button>
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
                  7 dias
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
                  disabled={salvandoFerias}
                  className="px-3 py-1.5 rounded-xl bg-red-50 text-red-700 font-bold border border-red-200 hover:bg-red-100 transition cursor-pointer"
                >
                  Retomar Entregas
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalFeriasBase(null)}
                  disabled={salvandoFerias}
                  className="px-3 py-1.5 rounded-xl bg-gray-100 font-bold text-gray-700 hover:bg-gray-200 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSalvarFerias}
                  disabled={salvandoFerias}
                  className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 font-bold text-white shadow-xs transition cursor-pointer"
                >
                  {salvandoFerias ? 'A guardar...' : 'Confirmar Férias'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal do Talão */}
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
