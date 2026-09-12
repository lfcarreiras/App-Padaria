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
import { Encomenda } from '../../types';
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
  DollarSign, 
  PackageCheck,
  AlertCircle,
  Eye
} from 'lucide-react';

export default function EntregaLojaPage() {
  const { t } = useTranslation();
  const { podeEditar } = useAuth();
  const temPermissaoEdicao = podeEditar('loja');
  const [selectedLojaId, setSelectedLojaId] = useState<string>('todas');
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<'pendentes' | 'concluidos'>('pendentes');
  const [busca, setBusca] = useState('');
  const [encomendaParaImprimir, setEncomendaParaImprimir] = useState<Encomenda | null>(null);

  useEffect(() => {
    async function carregar() {
      const dados = await carregarEncomendasSupabase();
      setEncomendas(dados);
    }
    carregar();
  }, []);

  const lojaAtual = LOJAS_MOCK.find((l) => l.id === selectedLojaId) || LOJAS_MOCK[0];

  // Encomendas de levantamento em loja
  const levantamentos = encomendas.filter((e) => {
    const isLoja = e.tipo === 'levantamento_loja';
    const matchLoja = selectedLojaId === 'todas' || e.loja_id === selectedLojaId;
    const matchStatus = filtroEstado === 'pendentes'
      ? e.estado !== 'entregue' && e.estado !== 'cancelado'
      : e.estado === 'entregue';
    const matchBusca = busca.trim() === '' || 
      e.cliente.nome.toLowerCase().includes(busca.toLowerCase()) ||
      e.codigo.toLowerCase().includes(busca.toLowerCase()) ||
      e.cliente.telefone.includes(busca);

    return isLoja && matchLoja && matchStatus && matchBusca;
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

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 sm:px-6">
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
                  {t.storePickupDesc}
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
            </div>
          </div>
        </div>

        {/* Barra de Pesquisa */}
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t.searchPickupPlaceholder}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-hidden"
          />
        </div>

        {/* Lista de Levantamentos */}
        {levantamentos.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-200 p-12 text-center">
            <PackageCheck className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-gray-800">{t.noPickupsFound}</h3>
            <p className="text-xs text-gray-500 mt-1">{t.noOrdersFound}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {levantamentos.map((enc) => {
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
                        <Clock className="h-3.5 w-3.5 text-amber-700" /> {enc.hora_agendamento}
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
                            <span className="text-gray-500">{(item.quantidade * item.preco_unitario).toFixed(2)} €</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Pagamento */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-gray-500">{t.total}:</span>
                      <span className="font-black text-sm text-gray-900">{enc.total.toFixed(2)} €</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">{t.paymentMethod}:</span>
                      {enc.estado_pagamento === 'pago' ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" /> {t.paid} ({enc.metodo_pagamento || 'MBWay'})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                          <DollarSign className="h-3 w-3" /> {t.toPay}: {enc.total.toFixed(2)} €
                        </span>
                      )}
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
                        + {t.deliveryHome}
                      </button>

                      <div>
                        {concluido ? (
                          <div className="flex items-center justify-center gap-1 h-full rounded-xl bg-emerald-100 text-emerald-800 py-2">
                            <CheckCircle2 className="h-4 w-4" /> {t.pickupCollected}
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
                            <CheckCircle2 className="h-4 w-4" /> {t.completePickup}
                          </button>
                        )}
                      </div>
                    </div>
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
