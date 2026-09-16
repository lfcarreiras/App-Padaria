'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '../../components/Navbar';
import { ThermalReceipt } from '../../components/ThermalReceipt';
import { LOJAS_MOCK } from '../../lib/mockData';
import { 
  carregarEncomendasSupabase, 
  atualizarEstadoEncomendaDb, 
  alternarTipoEntregaDb 
} from '../../lib/encomendasService';
import { Encomenda, TipoEntrega } from '../../types';
import { useTranslation } from '../../lib/i18n';
import { useAuth } from '../../lib/authContext';
import { 
  Store, 
  Clock, 
  CheckCircle2, 
  Phone, 
  Printer, 
  Truck, 
  Search, 
  PackageCheck,
  Calendar,
  Eye,
  ArrowRightLeft
} from 'lucide-react';

export default function EntregaLojaPage() {
  const { t } = useTranslation();
  const { podeEditar } = useAuth();
  const temPermissaoEdicao = podeEditar('loja');
  const [selectedLojaId, setSelectedLojaId] = useState<string>('todas');
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<'pendentes' | 'concluidos' | 'todos'>('pendentes');
  const [busca, setBusca] = useState('');
  const [encomendaParaImprimir, setEncomendaParaImprimir] = useState<Encomenda | null>(null);

  // Filtro de Calendário
  const [filtroPeriodo, setFiltroPeriodo] = useState<'hoje' | 'amanha' | 'todos' | 'personalizado'>('hoje');
  const [dataPersonalizada, setDataPersonalizada] = useState('');

  useEffect(() => {
    async function carregar() {
      const dados = await carregarEncomendasSupabase();
      setEncomendas(dados);
    }
    carregar();
  }, []);

  const lojaAtual = LOJAS_MOCK.find((l) => l.id === selectedLojaId) || LOJAS_MOCK[0];

  const hoje = new Date().toISOString().split('T')[0];
  const dHoje = new Date();
  const dAmanha = new Date(dHoje);
  dAmanha.setDate(dHoje.getDate() + 1);
  const amanha = dAmanha.toISOString().split('T')[0];

  // Encomendas filtradas de acordo com Loja, Estado, Calendário e Pesquisa
  const encomendasFiltradas = encomendas.filter((e) => {
    // 1. Loja
    const matchLoja = selectedLojaId === 'todas' || e.loja_id === selectedLojaId;

    // 2. Estado
    const matchStatus = 
      filtroEstado === 'todos' ? true :
      filtroEstado === 'pendentes' ? e.estado !== 'entregue' && e.estado !== 'cancelado' :
      e.estado === 'entregue';

    // 3. Calendário
    let matchData = true;
    if (filtroPeriodo === 'hoje') {
      matchData = e.data_agendamento === hoje;
    } else if (filtroPeriodo === 'amanha') {
      matchData = e.data_agendamento === amanha;
    } else if (filtroPeriodo === 'personalizado' && dataPersonalizada) {
      matchData = e.data_agendamento === dataPersonalizada;
    }

    // 4. Pesquisa textual
    const matchBusca = busca.trim() === '' || 
      e.cliente.nome.toLowerCase().includes(busca.toLowerCase()) ||
      e.codigo.toLowerCase().includes(busca.toLowerCase()) ||
      e.cliente.telefone.includes(busca);

    return matchLoja && matchStatus && matchData && matchBusca;
  });

  // Concluir Levantamento no Balcão
  const handleConcluirLevantamento = async (encId: string) => {
    await atualizarEstadoEncomendaDb(encId, 'entregue', 'pago');
    setEncomendas((prev) =>
      prev.map((e) =>
        e.id === encId
          ? { ...e, estado: 'entregue', estado_pagamento: 'pago' }
          : e
      )
    );
  };

  // Mudar para Entrega ao Domicílio
  const handleMudarParaDomicilio = async (enc: Encomenda) => {
    const morada = window.prompt(
      `Indica a morada de entrega para ${enc.cliente.nome}:`,
      enc.cliente.morada || ''
    );
    if (!morada || !morada.trim()) return;

    const ok = await alternarTipoEntregaDb(enc.id, 'entrega_domicilio', enc.loja_id);
    if (ok) {
      setEncomendas((prev) =>
        prev.map((e) =>
          e.id === enc.id
            ? { ...e, tipo: 'entrega_domicilio', cliente: { ...e.cliente, morada: morada.trim() } }
            : e
        )
      );
      alert(`Encomenda ${enc.codigo} movida com sucesso para as Entregas ao Domicílio!`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/70">
      <Navbar selectedLojaId={selectedLojaId} onSelectLoja={setSelectedLojaId} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:px-6">
        {/* Aviso de Modo de Apenas Leitura */}
        {!temPermissaoEdicao && (
          <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-300 p-4 flex items-center gap-3 text-amber-900 text-xs shadow-xs">
            <Eye className="h-5 w-5 text-amber-700 shrink-0" />
            <div>
              <p className="font-bold">{t.readOnlyNotice}</p>
              <p className="text-amber-800/80 mt-0.5">O seu perfil de utilizador tem apenas permissão de consulta neste painel. As ações de alteração de entrega e conclusão estão desativadas.</p>
            </div>
          </div>
        )}

        {/* Cabeçalho do Balcão */}
        <div className="rounded-2xl bg-white p-5 border border-amber-200 shadow-xs mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-600 text-white shadow-sm">
                <Store className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-gray-900 leading-tight">
                  {t.storePickupTitle}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Organização hierárquica de levantamento em loja por loja e hora de agendamento
                </p>
              </div>
            </div>

            {/* Alternador de Estado */}
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setFiltroEstado('pendentes')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  filtroEstado === 'pendentes'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {t.pendingPickups}
              </button>
              <button
                type="button"
                onClick={() => setFiltroEstado('concluidos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  filtroEstado === 'concluidos'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {t.completedPickups}
              </button>
              <button
                type="button"
                onClick={() => setFiltroEstado('todos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  filtroEstado === 'todos'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Todos
              </button>
            </div>
          </div>
        </div>

        {/* Barra de Filtro de Calendário e Pesquisa */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs mb-6 space-y-3">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={t.searchPickupPlaceholder}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-hidden"
              />
            </div>

            {/* Seletor Rápido de Período */}
            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
              <span className="text-xs font-bold text-gray-500 mr-1 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-amber-600" />
                Período:
              </span>
              {[
                { id: 'hoje', label: 'Hoje' },
                { id: 'amanha', label: 'Amanhã' },
                { id: 'todos', label: 'Todas as Datas' },
                { id: 'personalizado', label: 'Calendário Específico' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setFiltroPeriodo(p.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    filtroPeriodo === p.id
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-stone-100 text-gray-700 hover:bg-stone-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {filtroPeriodo === 'personalizado' && (
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100 bg-amber-50/50 p-2.5 rounded-xl">
              <label className="text-xs font-bold text-amber-950">Data do Levantamento:</label>
              <input
                type="date"
                value={dataPersonalizada}
                onChange={(e) => setDataPersonalizada(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-white border border-amber-300 font-medium text-gray-900"
              />
            </div>
          )}
        </div>

        {/* Visualização Hierárquica: Tipo de Entrega -> Loja -> Ordem Crescente de Data e Hora */}
        {encomendasFiltradas.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-200 p-12 text-center">
            <PackageCheck className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-gray-800">{t.noPickupsFound}</h3>
            <p className="text-xs text-gray-500 mt-1">{t.noOrdersFound}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {(['levantamento_loja', 'entrega_domicilio'] as TipoEntrega[]).map((tipo) => {
              const pedidosDoTipo = encomendasFiltradas.filter((e) => e.tipo === tipo);
              if (pedidosDoTipo.length === 0) return null;

              // Agrupar por Loja
              const lojasMap = new Map<string, Encomenda[]>();
              for (const enc of pedidosDoTipo) {
                const lNome = enc.loja_nome || 'Padaria da Vila (Arouca)';
                if (!lojasMap.has(lNome)) {
                  lojasMap.set(lNome, []);
                }
                lojasMap.get(lNome)!.push(enc);
              }

              return (
                <div key={tipo} className="space-y-4">
                  {/* Cabeçalho do Tipo de Entrega */}
                  <div className={`p-4 rounded-2xl flex items-center justify-between border ${
                    tipo === 'levantamento_loja'
                      ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                      : 'bg-blue-50/90 border-blue-200 text-blue-950'
                  }`}>
                    <div className="flex items-center gap-2.5 font-black text-sm">
                      {tipo === 'levantamento_loja' ? (
                        <>
                          <Store className="h-5 w-5 text-amber-700" />
                          <span>LEVANTAMENTO NO BALCÃO DE LOJA</span>
                        </>
                      ) : (
                        <>
                          <Truck className="h-5 w-5 text-blue-700" />
                          <span>ENTREGAS AO DOMICÍLIO (REGISTADAS NA LOJA)</span>
                        </>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white font-bold border border-current opacity-80">
                        {pedidosDoTipo.length} pedido(s)
                      </span>
                    </div>
                  </div>

                  {/* Agrupamento por Loja */}
                  {Array.from(lojasMap.entries()).map(([nomeLoja, pedidosLoja]) => {
                    // Ordenação estrita crescente por data e hora de agendamento
                    const pedidosOrdenados = [...pedidosLoja].sort((a, b) => {
                      const dtA = `${a.data_agendamento} ${a.hora_agendamento}`;
                      const dtB = `${b.data_agendamento} ${b.hora_agendamento}`;
                      return dtA.localeCompare(dtB);
                    });

                    return (
                      <div key={nomeLoja} className="pl-2 sm:pl-4 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-700 border-b border-gray-200 pb-1.5">
                          <span className="h-2 w-2 rounded-full bg-amber-600"></span>
                          <span>{nomeLoja}</span>
                          <span className="text-[11px] text-gray-500 font-normal">
                            ({pedidosOrdenados.length} pedidos • ordenados por hora crescente)
                          </span>
                        </div>

                        <div className="space-y-3">
                          {pedidosOrdenados.map((enc) => {
                            const concluido = enc.estado === 'entregue';

                            return (
                              <div
                                key={enc.id}
                                className={`rounded-2xl bg-white border transition shadow-xs overflow-hidden ${
                                  concluido
                                    ? 'border-emerald-200 opacity-75'
                                    : 'border-amber-200 hover:border-amber-400'
                                }`}
                              >
                                {/* Cabeçalho do Cartão */}
                                <div className={`p-4 flex items-center justify-between border-b ${
                                  concluido ? 'bg-emerald-50/70 border-emerald-100' : 'bg-amber-50/60 border-amber-100'
                                }`}>
                                  <div className="flex items-center gap-2.5">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-800 text-white text-xs font-black">
                                      <Store className="h-3.5 w-3.5" />
                                    </span>
                                    <div>
                                      <span className="text-xs font-mono font-bold text-gray-600">{enc.codigo}</span>
                                      <h4 className="text-sm font-bold text-gray-900">{enc.cliente.nome}</h4>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1 text-xs font-bold bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                                      <Clock className="h-3.5 w-3.5 text-amber-700" />
                                      {enc.data_agendamento} às {enc.hora_agendamento}
                                    </span>
                                  </div>
                                </div>

                                {/* Corpo do Cartão */}
                                <div className="p-4 space-y-3">
                                  {/* Artigos a Descarregar */}
                                  <div className="rounded-xl bg-gray-50 p-3 text-xs border border-gray-100">
                                    <p className="text-[11px] font-bold text-gray-500 uppercase mb-1.5">{t.itemsToDeliver}</p>
                                    <ul className="space-y-1">
                                      {enc.itens.map((item) => (
                                        <li key={item.id} className="flex justify-between font-medium text-gray-800">
                                          <span>
                                            <b>{item.quantidade}x</b> {item.produto_nome}
                                            {item.notas_personalizacao && (
                                              <span className="block text-[11px] text-amber-800 italic pl-3">
                                                » {item.notas_personalizacao}
                                              </span>
                                            )}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>

                                  {/* Resumo de Artigos */}
                                  <div className="flex items-center justify-between text-xs pt-1 text-gray-600 font-semibold">
                                    <span>{t.totalItems}:</span>
                                    <span className="font-bold text-gray-900">
                                      {enc.itens.reduce((acc, i) => acc + i.quantidade, 0)} un.
                                    </span>
                                  </div>

                                  {/* Ações Rápidas */}
                                  <div className="pt-3 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold">
                                    <a
                                      href={`tel:${enc.cliente.telefone.replace(/\s+/g, '')}`}
                                      className="flex items-center justify-center gap-1.5 rounded-xl bg-gray-100 py-2 px-3 text-gray-800 hover:bg-gray-200 transition"
                                    >
                                      <Phone className="h-4 w-4 text-emerald-600" />
                                      {t.callClient}
                                    </a>

                                    <button
                                      type="button"
                                      onClick={() => setEncomendaParaImprimir(enc)}
                                      className="flex items-center justify-center gap-1.5 rounded-xl bg-gray-100 py-2 px-3 text-gray-800 hover:bg-gray-200 transition"
                                    >
                                      <Printer className="h-4 w-4" />
                                      {t.reprintTicket}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => temPermissaoEdicao && handleMudarParaDomicilio(enc)}
                                      disabled={!temPermissaoEdicao}
                                      className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 transition ${
                                        temPermissaoEdicao
                                          ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                                          : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
                                      }`}
                                      title={temPermissaoEdicao ? "Converter em entrega ao domicílio" : "Apenas leitura"}
                                    >
                                      <Truck className="h-4 w-4 text-blue-600" />
                                      + Domicílio
                                    </button>

                                    <div>
                                      {concluido ? (
                                        <div className="flex items-center justify-center gap-1 h-full rounded-xl bg-emerald-100 text-emerald-800 py-2">
                                          <CheckCircle2 className="h-4 w-4" /> Entregue
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => temPermissaoEdicao && handleConcluirLevantamento(enc.id)}
                                          disabled={!temPermissaoEdicao}
                                          className={`w-full flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-white shadow-xs transition ${
                                            temPermissaoEdicao
                                              ? 'bg-amber-600 hover:bg-amber-700'
                                              : 'bg-gray-400 cursor-not-allowed opacity-60'
                                          }`}
                                        >
                                          <CheckCircle2 className="h-4 w-4" /> Concluir
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal de Impressão */}
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
