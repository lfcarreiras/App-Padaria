'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from '../../components/Navbar';
import { ThermalReceipt } from '../../components/ThermalReceipt';
import { LOJAS_MOCK, CARRINHAS_MOCK } from '../../lib/mockData';
import { supabase } from '../../lib/supabase';
import { 
  carregarEncomendasSupabase, 
  atualizarEstadoEncomendaDb,
  alternarTipoEntregaDb,
  atribuirCarrinhaDb,
  concluirEntregaComTimestampDb
} from '../../lib/encomendasService';
import { Encomenda, EstadoRota } from '../../types';
import { useTranslation } from '../../lib/i18n';
import { useAuth } from '../../lib/authContext';
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
  Check
} from 'lucide-react';

export default function EntregasPage() {
  const { t } = useTranslation();
  const { podeEditar } = useAuth();
  const temPermissaoEdicao = podeEditar('entregas');
  const [selectedLojaId, setSelectedLojaId] = useState<string>('todas');
  const [carrinhaSelecionadaId, setCarrinhaSelecionadaId] = useState<string>('todas');
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [encomendaParaImprimir, setEncomendaParaImprimir] = useState<Encomenda | null>(null);
  const [mapaAbertoId, setMapaAbertoId] = useState<string | null>(null);
  const [mostrarPool, setMostrarPool] = useState<boolean>(true);
  const [draggedEncId, setDraggedEncId] = useState<string | null>(null);
  const [draggedStopIndex, setDraggedStopIndex] = useState<number | null>(null);
  const [isDragOverPool, setIsDragOverPool] = useState<boolean>(false);
  const [isDragOverVan, setIsDragOverVan] = useState<string | null>(null);

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
      const dados = await carregarEncomendasSupabase();
      setEncomendas(dados);
    }
    carregar();
  }, []);

  const lojaAtual = LOJAS_MOCK.find((l) => l.id === selectedLojaId) || LOJAS_MOCK[0];
  const carrinhasDaLoja = CARRINHAS_MOCK.filter(
    (c) => selectedLojaId === 'todas' || c.loja_id === selectedLojaId
  );

  // Data operacional de hoje (AAAA-MM-DD)
  const hoje = new Date().toISOString().split('T')[0];

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
  };

  // Concluir entrega com registo de timestamp real
  const confirmarEntrega = async (encomendaId: string) => {
    const agora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    await concluirEntregaComTimestampDb(encomendaId, agora);
    setEncomendas((prev) =>
      prev.map((e) =>
        e.id === encomendaId
          ? { ...e, estado: 'entregue', hora_entrega_real: agora }
          : e
      )
    );
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
  };

  // Atribuir encomenda a uma carrinha
  const handleAtribuirCarrinha = async (encomendaId: string, carrinhaId: string | null) => {
    await atribuirCarrinhaDb(encomendaId, carrinhaId);
    const carrinhaObj = CARRINHAS_MOCK.find((c) => c.id === carrinhaId);
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
                  Arraste ou atribua diretamente as encomendas deste dia para as carrinhas de distribuição
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMostrarPool(!mostrarPool)}
              className="text-xs font-bold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
            >
              {mostrarPool ? 'Ocultar Pool ▲' : 'Mostrar Pool ▼'}
            </button>
          </div>

          {mostrarPool && (
            encomendasPool.length === 0 ? (
              <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-6 text-center text-xs text-amber-800 font-medium">
                ✅ Todas as encomendas de entrega ao domicílio de hoje já estão atribuídas às carrinhas!
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
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="font-mono font-black text-xs text-amber-950 bg-amber-200/80 px-1.5 py-0.5 rounded">
                          {enc.codigo}
                        </span>
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
                              title={`Atribuir à ${car.identificador}`}
                            >
                              {car.identificador.replace('Carrinha ', 'C')}
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
              <div>
                <h2 className="text-lg sm:text-xl font-black text-gray-900 leading-tight">
                  {t.deliveriesTitle}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t.deliveriesDesc} • Carga na Unidade Central de Fabrico & Sede
                </p>
              </div>
            </div>

            {/* Dropzone & Seletor de Carrinha */}
            <div className="flex flex-wrap items-center gap-2">
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
                      {car.identificador} ({car.matricula})
                    </option>
                  ))}
                </select>
              </div>

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
                  {infoRota.estado === 'concluida' ? '🏁' : infoRota.estado === 'em_curso' ? '🚚' : '⏳'}
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
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-mono font-bold ${
                            isActiveStop && infoRota.estado === 'em_curso' ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {enc.codigo}
                          </span>
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
                      <ul className="space-y-1">
                        {enc.itens.map((item) => (
                          <li key={item.id} className="font-medium text-gray-800">
                            <span>
                              <b className="text-amber-800 font-bold mr-1">{item.quantidade}x</b> {item.produto_nome}
                              {item.notas_personalizacao && (
                                <span className="block text-[11px] text-amber-800 italic pl-3">
                                  » {item.notas_personalizacao}
                                </span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-2.5 pt-2 border-t border-gray-200 flex justify-between text-xs font-bold text-gray-700">
                        <span>{t.totalItems}:</span>
                        <span className="font-black text-gray-900">
                          {enc.itens.reduce((acc, i) => acc + i.quantidade, 0)} un.
                        </span>
                      </div>
                    </div>

                    {/* Registo de Hora Real se Entregue */}
                    {jaEntregue && enc.hora_entrega_real && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-600" />
                        <span>Entregue com sucesso às {enc.hora_entrega_real} (Agendado: {enc.hora_agendamento})</span>
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
                    <div className="pt-2 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold">
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
