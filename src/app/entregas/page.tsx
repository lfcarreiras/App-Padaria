'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '../../components/Navbar';
import { ThermalReceipt } from '../../components/ThermalReceipt';
import { LOJAS_MOCK, CARRINHAS_MOCK } from '../../lib/mockData';
import { supabase } from '../../lib/supabase';
import { 
  carregarEncomendasSupabase, 
  atualizarEstadoEncomendaDb,
  alternarTipoEntregaDb 
} from '../../lib/encomendasService';
import { Encomenda } from '../../types';
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
  DollarSign,
  Edit3,
  Store,
  Printer,
  Eye
} from 'lucide-react';

export default function EntregasPage() {
  const { t } = useTranslation();
  const { podeEditar } = useAuth();
  const temPermissaoEdicao = podeEditar('entregas');
  const [selectedLojaId, setSelectedLojaId] = useState<string>('todas');
  const [carrinhaSelecionadaId, setCarrinhaSelecionadaId] = useState<string>('todas');
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [encomendaParaImprimir, setEncomendaParaImprimir] = useState<Encomenda | null>(null);

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

  // Encomendas de entrega desta loja/carrinha
  const entregas = encomendas.filter((e) => {
    const isEntrega = e.tipo === 'entrega_domicilio';
    const matchLoja = selectedLojaId === 'todas' || e.loja_id === selectedLojaId;
    const matchCarrinha = !carrinhaSelecionadaId || carrinhaSelecionadaId === 'todas' || e.carrinha_id === carrinhaSelecionadaId;
    return isEntrega && matchLoja && matchCarrinha;
  });

  // Concluir entrega
  const confirmarEntrega = async (encomendaId: string) => {
    await atualizarEstadoEncomendaDb(encomendaId, 'entregue', 'pago');
    setEncomendas((prev) =>
      prev.map((e) =>
        e.id === encomendaId
          ? { ...e, estado: 'entregue', estado_pagamento: 'pago' }
          : e
      )
    );
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
    <div className="min-h-screen flex flex-col bg-gray-50/70">
      <Navbar selectedLojaId={selectedLojaId} onSelectLoja={setSelectedLojaId} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:px-6">
        {/* Aviso de Modo de Apenas Leitura */}
        {!temPermissaoEdicao && (
          <div className="mb-6 rounded-2xl bg-blue-50 border border-blue-300 p-4 flex items-center gap-3 text-blue-950 text-xs shadow-xs">
            <Eye className="h-5 w-5 text-blue-700 shrink-0" />
            <div>
              <p className="font-bold">{t.readOnlyNotice}</p>
              <p className="text-blue-900/80 mt-0.5">O seu perfil de utilizador tem apenas permissão de consulta neste painel. As ações de alteração de morada, tipo de entrega e conclusão estão desativadas.</p>
            </div>
          </div>
        )}

        {/* Cabeçalho do Motorista */}
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
                  {t.deliveriesDesc}
                </p>
              </div>
            </div>

            {/* Seletor de Carrinha */}
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl">
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
          </div>
        </div>

        {/* Lista de Paragens */}
        {entregas.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-200 p-12 text-center">
            <PackageCheck className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-gray-800">{t.noDeliveriesFound}</h3>
            <p className="text-xs text-gray-500 mt-1">{t.noOrdersFound}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {entregas.map((enc, index) => {
              const jaEntregue = enc.estado === 'entregue';
              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                enc.cliente.morada || 'Lisboa, Portugal'
              )}`;

              return (
                <div
                  key={enc.id}
                  className={`rounded-2xl bg-white border transition shadow-xs overflow-hidden ${
                    jaEntregue
                      ? 'border-emerald-200 opacity-70'
                      : 'border-blue-200 hover:border-blue-400'
                  }`}
                >
                  {/* Cabeçalho da Paragem */}
                  <div className={`p-4 flex items-center justify-between border-b ${
                    jaEntregue ? 'bg-emerald-50 text-emerald-900 border-emerald-100' : 'bg-blue-50/70 text-blue-950 border-blue-100'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-900 text-white text-xs font-black">
                        #{index + 1}
                      </span>
                      <div>
                        <span className="text-xs font-mono font-bold text-gray-600">{enc.codigo}</span>
                        <h4 className="text-sm font-bold text-gray-900">{enc.cliente.nome}</h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-bold bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-2xs">
                        <Clock className="h-3.5 w-3.5 text-blue-600" /> {enc.hora_agendamento}
                      </span>
                    </div>
                  </div>

                  {/* Corpo da Paragem com Morada e Telefone */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2 text-xs text-gray-800">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-gray-900">{enc.cliente.morada || 'Morada não especificada'}</p>
                          {enc.cliente.codigo_postal && (
                            <p className="text-gray-500">{enc.cliente.codigo_postal}</p>
                          )}
                          {enc.cliente.notas_entrega && (
                            <p className="text-amber-800 italic font-medium mt-1 bg-amber-50 p-1.5 rounded-md border border-amber-200">
                              Obs: {enc.cliente.notas_entrega}
                            </p>
                          )}
                        </div>
                      </div>
                      {temPermissaoEdicao && (
                        <button
                          type="button"
                          onClick={() => handleEditarMorada(enc)}
                          className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg border border-blue-200 shrink-0 transition"
                          title="Alterar Morada de Entrega"
                        >
                          <Edit3 className="h-3 w-3" />
                          {t.changeAddress}
                        </button>
                      )}
                    </div>

                    {/* Resumo de Artigos no Carrinho */}
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

                    {/* Estado do Pagamento */}
                    <div className="flex items-center justify-between pt-1 text-xs">
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

                    {/* Botões de Ação para o Motorista */}
                    <div className="pt-3 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold">
                      <a
                        href={`tel:${enc.cliente.telefone.replace(/\s+/g, '')}`}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-gray-100 py-2.5 px-2 text-gray-800 hover:bg-gray-200 transition"
                      >
                        <Phone className="h-4 w-4 text-emerald-600" />
                        {t.callClient}
                      </a>

                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-50 py-2.5 px-2 text-blue-700 hover:bg-blue-100 transition border border-blue-200"
                      >
                        <Navigation className="h-4 w-4 text-blue-600" />
                        {t.openGps}
                      </a>

                      <button
                        type="button"
                        onClick={() => temPermissaoEdicao && handleMudarParaLoja(enc)}
                        disabled={!temPermissaoEdicao}
                        className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-[11px] transition border ${
                          temPermissaoEdicao
                            ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                            : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                        }`}
                        title={temPermissaoEdicao ? "Converter em levantamento em loja" : "Apenas leitura"}
                      >
                        <Store className="h-4 w-4 text-amber-600" />
                        + {t.pickupStore}
                      </button>

                      <div>
                        {jaEntregue ? (
                          <div className="flex items-center justify-center gap-1 h-full rounded-xl bg-emerald-100 text-emerald-800 py-2.5">
                            <CheckCircle2 className="h-4 w-4" /> {t.stopDeliveryCompleted}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => temPermissaoEdicao && confirmarEntrega(enc.id)}
                            disabled={!temPermissaoEdicao}
                            className={`w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-white shadow-xs transition ${
                              temPermissaoEdicao
                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                : 'bg-gray-400 cursor-not-allowed opacity-60'
                            }`}
                          >
                            <CheckCircle2 className="h-4 w-4" /> {t.completeDelivery}
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
