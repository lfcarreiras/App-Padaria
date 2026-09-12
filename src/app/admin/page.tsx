'use client';

import React, { useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { ThermalReceipt } from '../../components/ThermalReceipt';
import { LOJAS_MOCK, ENCOMENDAS_INICIAIS, PRODUTOS_MOCK } from '../../lib/mockData';
import { Encomenda } from '../../types';
import { 
  BarChart3, 
  Store, 
  TrendingUp, 
  ShoppingBag, 
  Truck, 
  Printer, 
  CheckCircle2, 
  Clock, 
  Calendar,
  Layers,
  Filter
} from 'lucide-react';

export default function AdminPage() {
  const [selectedLojaId, setSelectedLojaId] = useState<string>('todas');
  const [encomendas, setEncomendas] = useState<Encomenda[]>(ENCOMENDAS_INICIAIS);
  const [encomendaParaImprimir, setEncomendaParaImprimir] = useState<Encomenda | null>(null);

  const encomendasFiltradas = selectedLojaId === 'todas'
    ? encomendas
    : encomendas.filter((e) => e.loja_id === selectedLojaId);

  const totalFaturado = encomendasFiltradas.reduce((acc, curr) => acc + curr.total, 0);
  const totalEntregas = encomendasFiltradas.filter((e) => e.tipo === 'entrega_domicilio').length;
  const totalLevantamentos = encomendasFiltradas.filter((e) => e.tipo === 'levantamento_loja').length;

  // Cálculo consolidado de produção: somatório de quantidades de cada produto encomendado
  const mapaProducao: { [nome: string]: { quantidade: number; setor: string; unidade: string } } = {};
  encomendasFiltradas.forEach((enc) => {
    enc.itens.forEach((item) => {
      const prod = PRODUTOS_MOCK.find((p) => p.id === item.produto_id);
      if (!mapaProducao[item.produto_nome]) {
        mapaProducao[item.produto_nome] = {
          quantidade: 0,
          setor: item.setor,
          unidade: prod?.unidade || 'un',
        };
      }
      mapaProducao[item.produto_nome].quantidade += item.quantidade;
    });
  });

  const itensProducaoConsolidados = Object.entries(mapaProducao).sort(
    (a, b) => b[1].quantidade - a[1].quantidade
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/70">
      <Navbar selectedLojaId={selectedLojaId} onSelectLoja={setSelectedLojaId} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:px-6">
        {/* Cabeçalho do Painel */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-bakery-600" />
              Painel de Gestão & Relatórios
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              Visão consolidada das 4 lojas de padaria e pastelaria.
            </p>
          </div>

          {/* Seletor rápido de Loja */}
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-2xs">
            <Filter className="h-4 w-4 text-bakery-600" />
            <select
              value={selectedLojaId}
              onChange={(e) => setSelectedLojaId(e.target.value)}
              className="text-xs font-bold text-gray-900 bg-transparent focus:outline-hidden"
            >
              <option value="todas">Consolidado (Todas as 4 Lojas)</option>
              {LOJAS_MOCK.map((l) => (
                <option key={l.id} value={l.id}>{l.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Cartões de Indicadores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <span className="text-xs font-semibold text-gray-500">Faturação Total Agendada</span>
            <p className="text-2xl font-black text-bakery-800 mt-1">{totalFaturado.toFixed(2)} €</p>
            <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" /> Em encomendas ativas
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <span className="text-xs font-semibold text-gray-500">Volume de Encomendas</span>
            <p className="text-2xl font-black text-gray-900 mt-1">{encomendasFiltradas.length}</p>
            <span className="text-[11px] text-gray-500 block mt-1">
              {totalEntregas} entregas / {totalLevantamentos} loja
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <span className="text-xs font-semibold text-gray-500">Loja em Análise</span>
            <p className="text-sm font-black text-gray-800 mt-1 truncate">
              {selectedLojaId === 'todas' ? 'Todas as 4 Lojas' : LOJAS_MOCK.find(l => l.id === selectedLojaId)?.nome}
            </p>
            <span className="text-[11px] text-bakery-600 font-medium block mt-1">
              Operação descentralizada
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <span className="text-xs font-semibold text-gray-500">Impressão & Segurança</span>
            <p className="text-sm font-black text-emerald-700 mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Talões Térmicos 80mm
            </p>
            <span className="text-[11px] text-gray-500 block mt-1">CSS Print Ativo</span>
          </div>
        </div>

        {/* 2 Painéis: Necessidades de Fabrico vs Lista de Encomendas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* PAINEL 1: Mapa de Produção Consolidado (5 colunas) */}
          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Layers className="h-4 w-4 text-bakery-600" />
                Mapa de Fabrico (Totais a Produzir)
              </h3>
              <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                {itensProducaoConsolidados.length} Artigos
              </span>
            </div>

            <p className="text-xs text-gray-500 mb-3">
              Total consolidado de pão e bolos necessários para satisfazer as encomendas selecionadas:
            </p>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {itensProducaoConsolidados.length === 0 ? (
                <p className="text-xs text-gray-400 italic text-center py-6">Sem artigos a produzir.</p>
              ) : (
                itensProducaoConsolidados.map(([nome, dados]) => (
                  <div
                    key={nome}
                    className="flex items-center justify-between rounded-xl bg-gray-50 p-2.5 text-xs border border-gray-100"
                  >
                    <div>
                      <span className="font-bold text-gray-900">{nome}</span>
                      <span className="block text-[10px] text-gray-400 uppercase font-semibold">
                        Setor: {dados.setor}
                      </span>
                    </div>
                    <span className="rounded-lg bg-stone-900 text-white font-black px-2.5 py-1 text-xs">
                      {dados.quantidade} {dados.unidade}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* PAINEL 2: Histórico e Estado das Encomendas (7 colunas) */}
          <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-bakery-600" />
                Registo de Encomendas
              </h3>
              <span className="text-xs font-semibold text-gray-500">
                {encomendasFiltradas.length} Registos
              </span>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {encomendasFiltradas.map((enc) => (
                <div
                  key={enc.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-gray-200 hover:border-bakery-300 transition text-xs bg-white shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-bakery-700">{enc.codigo}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        enc.tipo === 'entrega_domicilio' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {enc.tipo === 'entrega_domicilio' ? 'Entrega' : 'Balcão'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        enc.estado === 'entregue' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {enc.estado}
                      </span>
                    </div>

                    <p className="font-bold text-gray-900">{enc.cliente.nome} ({enc.cliente.telefone})</p>
                    <p className="text-gray-500 text-[11px] flex items-center gap-2">
                      <Clock className="h-3 w-3" /> {enc.data_agendamento} às {enc.hora_agendamento} | Loja: {enc.loja_nome?.split('(')[0]}
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                    <span className="font-black text-sm text-bakery-800">{enc.total.toFixed(2)} €</span>
                    <button
                      onClick={() => setEncomendaParaImprimir(enc)}
                      className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-700 hover:bg-gray-50 shadow-2xs"
                    >
                      <Printer className="h-3 w-3" /> Reemitir Talão
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal de Impressão Térmica se solicitado */}
        {encomendaParaImprimir && (
          <ThermalReceipt
            encomenda={encomendaParaImprimir}
            loja={LOJAS_MOCK.find(l => l.id === encomendaParaImprimir.loja_id)}
            onClose={() => setEncomendaParaImprimir(null)}
          />
        )}
      </main>
    </div>
  );
}
