'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '../../components/Navbar';
import { ThermalReceipt } from '../../components/ThermalReceipt';
import { LOJAS_MOCK } from '../../lib/mockData';
import { 
  carregarEncomendasSupabase, 
  atualizarEstadoItemDb, 
  atualizarEstadoEncomendaDb 
} from '../../lib/encomendasService';
import { Encomenda, SetorProducao, EstadoProducaoItem } from '../../types';
import { useTranslation } from '../../lib/i18n';
import { useAuth } from '../../lib/authContext';
import { ChefHat, Clock, CheckCircle2, AlertTriangle, Printer, Sparkles, Flame, Store, Eye } from 'lucide-react';

export default function ProducaoPage() {
  const { t } = useTranslation();
  const { podeEditar } = useAuth();
  const temPermissaoEdicao = podeEditar('producao');
  const [selectedLojaId, setSelectedLojaId] = useState<string>('todas');
  const [setorAtivo, setSetorAtivo] = useState<SetorProducao | 'todos'>('todos');
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [encomendaParaImprimir, setEncomendaParaImprimir] = useState<Encomenda | null>(null);

  // Carregar encomendas reais da base de dados Supabase
  useEffect(() => {
    async function carregar() {
      const dados = await carregarEncomendasSupabase();
      setEncomendas(dados);
    }
    carregar();
  }, []);

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

  // Atualizar estado de produção de um item (em memória e no Supabase)
  const atualizarEstadoItem = async (encomendaId: string, itemId: string, novoEstado: EstadoProducaoItem) => {
    await atualizarEstadoItemDb(itemId, novoEstado);

    setEncomendas((prev) =>
      prev.map((enc) => {
        if (enc.id !== encomendaId) return enc;
        const novosItens = enc.itens.map((item) =>
          item.id === itemId ? { ...item, estado_producao: novoEstado } : item
        );
        const todosProntos = novosItens.every((i) => i.estado_producao === 'pronto');
        if (todosProntos) {
          atualizarEstadoEncomendaDb(encomendaId, 'pronto_loja');
        }
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
        {/* Aviso de Modo de Leitura */}
        {!temPermissaoEdicao && (
          <div className="mb-6 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-2.5 shadow-2xs">
            <Eye className="h-4 w-4 text-amber-600 shrink-0" />
            <span>{t.readOnlyNotice}</span>
          </div>
        )}

        {/* Barra Superior do KDS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
                <ChefHat className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 leading-tight">
                  {t.productionTitle} ({selectedLojaId === 'todas' ? t.allStores : lojaAtual.nome})
                </h2>
                <p className="text-xs text-gray-500">
                  {t.productionSubtitle}
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
              {t.allDepartments}
            </button>
            <button
              onClick={() => setSetorAtivo('padaria')}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                setorAtivo === 'padaria'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Flame className="h-3.5 w-3.5" />
              {t.bakeryTab}
            </button>
            <button
              onClick={() => setSetorAtivo('pastelaria')}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                setorAtivo === 'pastelaria'
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t.pastryTab}
            </button>
          </div>
        </div>

        {/* Grelha de Pedidos no KDS */}
        {encomendasDaLoja.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-200 p-12 text-center">
            <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-800">{t.noProductionItems}</h3>
            <p className="text-xs text-gray-500 mt-1">{t.noOrdersFound}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {encomendasDaLoja.map((enc) => {
              const itensFiltrados = enc.itens.filter(
                (item) => setorAtivo === 'todos' || item.setor === setorAtivo
              );

              return (
                <div
                  key={enc.id}
                  className="rounded-2xl bg-white border-2 border-stone-200 shadow-sm overflow-hidden flex flex-col justify-between"
                >
                  {/* Cabeçalho da Ficha */}
                  <div className="bg-stone-800 text-white p-3.5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-amber-400">{enc.codigo}</span>
                        <span className="text-xs bg-stone-700 px-2 py-0.5 rounded-md font-medium text-stone-200">
                          #{enc.numero_sequencial}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-white mt-0.5">{enc.cliente.nome}</p>
                    </div>

                    <div className="text-right flex items-center gap-2">
                      <div className="bg-stone-700 px-2.5 py-1 rounded-lg border border-stone-600 text-right">
                        <div className="flex items-center gap-1 text-xs font-bold text-amber-300">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{enc.hora_agendamento}</span>
                        </div>
                        <span className="text-[10px] text-stone-300 block">{enc.data_agendamento}</span>
                      </div>

                      <button
                        onClick={() => setEncomendaParaImprimir(enc)}
                        className="p-1.5 rounded-lg bg-stone-700 hover:bg-stone-600 text-white transition"
                        title="Imprimir talão de produção"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Lista de Artigos a Fabricar */}
                  <div className="p-4 space-y-3 flex-1 bg-stone-50/50">
                    {itensFiltrados.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border transition ${
                          item.estado_producao === 'pronto'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 opacity-80'
                            : item.estado_producao === 'em_preparo'
                            ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-xs'
                            : 'bg-white border-stone-200 text-stone-900'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-black text-stone-500 uppercase block mb-0.5">
                              {item.setor === 'padaria' ? `🥖 ${t.bakeryTab}` : `🎂 ${t.pastryTab}`}
                            </span>
                            <h4 className="text-sm font-black text-gray-900 leading-tight">
                              <span className="text-amber-700 mr-1.5">{item.quantidade}x</span>
                              {item.produto_nome}
                            </h4>
                          </div>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                            item.estado_producao === 'pronto'
                              ? 'bg-emerald-200 text-emerald-900 border-emerald-400'
                              : item.estado_producao === 'em_preparo'
                              ? 'bg-amber-200 text-amber-900 border-amber-400'
                              : 'bg-stone-200 text-stone-700 border-stone-300'
                          }`}>
                            {item.estado_producao === 'pronto' ? t.readyPrep : item.estado_producao === 'em_preparo' ? t.inPrep : t.pendingPrep}
                          </span>
                        </div>

                        {/* Notas de Personalização */}
                        {item.notas_personalizacao && (
                          <div className="mt-2 p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-950 flex items-start gap-1.5">
                            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-black text-[11px] uppercase block tracking-wider text-red-800">
                                {t.customizationNotes}
                              </span>
                              <p className="font-bold">{item.notas_personalizacao}</p>
                            </div>
                          </div>
                        )}

                        {/* Botões Táteis de Mudança de Estado */}
                        <div className="mt-3 pt-2 border-t border-stone-200/60 grid grid-cols-3 gap-1.5 text-xs font-bold">
                          <button
                            disabled={!temPermissaoEdicao}
                            onClick={() => atualizarEstadoItem(enc.id, item.id, 'pendente')}
                            className={`py-1.5 rounded-lg border transition ${
                              !temPermissaoEdicao ? 'opacity-60 cursor-not-allowed' : ''
                            } ${
                              item.estado_producao === 'pendente'
                                ? 'bg-stone-800 text-white border-stone-800'
                                : 'bg-white text-stone-600 hover:bg-stone-100 border-stone-300'
                            }`}
                          >
                            {t.pendingPrep}
                          </button>
                          <button
                            disabled={!temPermissaoEdicao}
                            onClick={() => atualizarEstadoItem(enc.id, item.id, 'em_preparo')}
                            className={`py-1.5 rounded-lg border transition ${
                              !temPermissaoEdicao ? 'opacity-60 cursor-not-allowed' : ''
                            } ${
                              item.estado_producao === 'em_preparo'
                                ? 'bg-amber-600 text-white border-amber-600'
                                : 'bg-white text-stone-600 hover:bg-amber-100 border-stone-300'
                            }`}
                          >
                            {t.inPrep}
                          </button>
                          <button
                            disabled={!temPermissaoEdicao}
                            onClick={() => atualizarEstadoItem(enc.id, item.id, 'pronto')}
                            className={`py-1.5 rounded-lg border transition flex items-center justify-center gap-1 ${
                              !temPermissaoEdicao ? 'opacity-60 cursor-not-allowed' : ''
                            } ${
                              item.estado_producao === 'pronto'
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white text-stone-600 hover:bg-emerald-100 border-stone-300'
                            }`}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            {t.readyPrep}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Rodapé do Cartão */}
                  <div className="p-3 bg-stone-100 border-t border-stone-200 flex items-center justify-between text-xs text-stone-600">
                    <span className="font-semibold">
                      {t.destination}: {enc.tipo === 'entrega_domicilio' ? t.destinationVan : t.destinationStore}
                    </span>
                    <span className="font-bold text-stone-800">
                      {enc.itens.filter((i) => i.estado_producao === 'pronto').length} / {enc.itens.length} {t.readyPrep}
                    </span>
                  </div>
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
