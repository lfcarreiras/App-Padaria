'use client';

import React, { useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { ThermalReceipt } from '../../components/ThermalReceipt';
import { LOJAS_MOCK, ENCOMENDAS_INICIAIS } from '../../lib/mockData';
import { Encomenda, SetorProducao, EstadoProducaoItem } from '../../types';
import { ChefHat, Clock, CheckCircle2, AlertTriangle, Printer, Sparkles, Flame, Store } from 'lucide-react';

export default function ProducaoPage() {
  const [selectedLojaId, setSelectedLojaId] = useState<string>('loja-1');
  const [setorAtivo, setSetorAtivo] = useState<SetorProducao | 'todos'>('todos');
  const [encomendas, setEncomendas] = useState<Encomenda[]>(ENCOMENDAS_INICIAIS);
  const [encomendaParaImprimir, setEncomendaParaImprimir] = useState<Encomenda | null>(null);

  const lojaAtual = LOJAS_MOCK.find((l) => l.id === selectedLojaId) || LOJAS_MOCK[0];

  // Filtrar encomendas da loja atual que contenham itens do setor selecionado
  const encomendasDaLoja = encomendas.filter((e) => {
    const matchLoja = selectedLojaId === 'todas' || e.loja_id === selectedLojaId;
    const temItensDoSetor =
      setorAtivo === 'todos'
        ? true
        : e.itens.some((item) => item.setor === setorAtivo);
    return matchLoja && temItensDoSetor;
  });

  // Atualizar estado de produção de um item
  const atualizarEstadoItem = (encomendaId: string, itemId: string, novoEstado: EstadoProducaoItem) => {
    setEncomendas((prev) =>
      prev.map((enc) => {
        if (enc.id !== encomendaId) return enc;
        const novosItens = enc.itens.map((item) =>
          item.id === itemId ? { ...item, estado_producao: novoEstado } : item
        );
        // Se todos os itens estiverem prontos, marcar a encomenda como pronta para loja/entrega
        const todosProntos = novosItens.every((i) => i.estado_producao === 'pronto');
        return {
          ...enc,
          itens: novosItens,
          estado: todosProntos ? 'pronto_loja' : 'em_producao',
        };
      })
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-100/70">
      <Navbar selectedLojaId={selectedLojaId} onSelectLoja={setSelectedLojaId} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:px-6">
        {/* Barra Superior do KDS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
                <ChefHat className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 leading-tight">
                  KDS - Ecrã de Produção ({selectedLojaId === 'todas' ? 'Todas as Lojas' : lojaAtual.nome})
                </h2>
                <p className="text-xs text-gray-500">
                  Fila tátil de fabrico em tempo real para os padeiros e pasteleiros da loja.
                </p>
              </div>
            </div>
          </div>

          {/* Abas de Setor: Padaria vs Pastelaria */}
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setSetorAtivo('todos')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                setorAtivo === 'todos'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Todos os Setores
            </button>
            <button
              onClick={() => setSetorAtivo('padaria')}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                setorAtivo === 'padaria'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Flame className="h-3.5 w-3.5" /> Forno & Padaria
            </button>
            <button
              onClick={() => setSetorAtivo('pastelaria')}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                setorAtivo === 'pastelaria'
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" /> Bancada de Pastelaria
            </button>
          </div>
        </div>

        {/* Fila de Cartões de Produção Táteis */}
        {encomendasDaLoja.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-200">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-800">Sem pedidos pendentes neste setor</h3>
            <p className="text-xs text-gray-500 mt-1">Todos os artigos já foram confecionados ou ainda não há encomendas agendadas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {encomendasDaLoja.map((enc) => {
              const itensFiltrados = enc.itens.filter(
                (i) => setorAtivo === 'todos' || i.setor === setorAtivo
              );

              return (
                <div
                  key={enc.id}
                  className="flex flex-col justify-between rounded-2xl bg-white border-2 border-gray-200 shadow-sm overflow-hidden"
                >
                  {/* Cabeçalho do Cartão */}
                  <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono font-bold tracking-widest text-amber-400">
                        {enc.codigo}
                      </span>
                      <p className="text-sm font-bold truncate">{enc.cliente.nome}</p>
                    </div>
                    <div className="text-right">
                      <span className="flex items-center gap-1 text-xs font-bold text-white bg-white/20 px-2.5 py-1 rounded-lg">
                        <Clock className="h-3.5 w-3.5 text-amber-300" /> {enc.hora_agendamento}
                      </span>
                      <span className="text-[10px] text-gray-300 block mt-0.5">
                        {enc.data_agendamento}
                      </span>
                    </div>
                  </div>

                  {/* Indicador de Modalidade */}
                  <div className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider flex items-center justify-between ${
                    enc.tipo === 'entrega_domicilio'
                      ? 'bg-blue-50 text-blue-800 border-b border-blue-100'
                      : 'bg-amber-50 text-amber-800 border-b border-amber-100'
                  }`}>
                    <span>{enc.tipo === 'entrega_domicilio' ? 'Carrinha de Entrega' : 'Levantamento no Balcão'}</span>
                    <button
                      onClick={() => setEncomendaParaImprimir(enc)}
                      className="text-gray-500 hover:text-black flex items-center gap-1 text-[10px]"
                    >
                      <Printer className="h-3 w-3" /> Talão
                    </button>
                  </div>

                  {/* Lista de Itens do Cartão */}
                  <div className="p-4 space-y-3 flex-1">
                    {itensFiltrados.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-xl p-3 border text-xs transition ${
                          item.estado_producao === 'pronto'
                            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                            : item.estado_producao === 'em_preparo'
                            ? 'bg-amber-50/70 border-amber-300 text-amber-950'
                            : 'bg-gray-50 border-gray-200 text-gray-900'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="inline-block rounded-md bg-stone-900 text-white font-black px-2 py-0.5 text-xs mr-1.5">
                              {item.quantidade}x
                            </span>
                            <span className="font-bold text-sm">{item.produto_nome}</span>
                          </div>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            item.setor === 'padaria' ? 'bg-amber-100 text-amber-800' : 'bg-pink-100 text-pink-800'
                          }`}>
                            {item.setor}
                          </span>
                        </div>

                        {/* Destaque para Personalização de Bolos de Pastelaria */}
                        {item.notas_personalizacao && (
                          <div className="mt-2 rounded-lg bg-amber-100 border border-amber-400 p-2 text-amber-950 font-medium">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
                              ⚠️ Instruções de Personalização:
                            </p>
                            <p className="text-xs font-bold mt-0.5">"{item.notas_personalizacao}"</p>
                          </div>
                        )}

                        {/* Botões Táteis de Estado do Item */}
                        <div className="mt-3 flex items-center justify-end gap-2 pt-2 border-t border-gray-200/60">
                          {item.estado_producao === 'pendente' && (
                            <button
                              onClick={() => atualizarEstadoItem(enc.id, item.id, 'em_preparo')}
                              className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition"
                            >
                              Iniciar Preparo
                            </button>
                          )}
                          {item.estado_producao === 'em_preparo' && (
                            <button
                              onClick={() => atualizarEstadoItem(enc.id, item.id, 'pronto')}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition flex items-center gap-1"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Marcar Pronto
                            </button>
                          )}
                          {item.estado_producao === 'pronto' && (
                            <span className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                              <CheckCircle2 className="h-4 w-4" /> Pronto na Bancada
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Rodapé do Cartão */}
                  <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex items-center justify-between text-xs text-gray-500">
                    <span>Loja: <b>{enc.loja_nome?.split('(')[0] || 'Matriz'}</b></span>
                    <span className="font-semibold text-gray-900">Total: {enc.total.toFixed(2)} €</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal de Impressão Térmica se solicitado */}
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
