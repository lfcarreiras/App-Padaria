'use client';

import React from 'react';
import { Encomenda, Loja } from '../types';
import { Printer, X, QrCode } from 'lucide-react';
import { ReceiptConfig, getReceiptConfig } from '../lib/receiptConfig';

interface ThermalReceiptProps {
  encomenda: Encomenda;
  loja?: Loja;
  config?: ReceiptConfig;
  onClose?: () => void;
}

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({ encomenda, loja, config, onClose }) => {
  const cfg = config || getReceiptConfig();

  const handlePrint = () => {
    window.print();
  };

  const itensPadaria = cfg.showSectionSeparation 
    ? encomenda.itens.filter((i) => i.setor === 'padaria')
    : [];
  const itensPastelaria = cfg.showSectionSeparation 
    ? encomenda.itens.filter((i) => i.setor === 'pastelaria')
    : [];
  const todosItens = !cfg.showSectionSeparation ? encomenda.itens : [];

  const widthClass = cfg.paperWidth === '58mm' ? 'w-[230px]' : 'w-[300px]';
  const fontSizeClass = 
    cfg.fontSize === 'compact' ? 'text-[11px]' :
    cfg.fontSize === 'large' ? 'text-sm' : 'text-xs';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      {/* Caixa do Modal de Pré-visualização do Talão */}
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl">
        {/* Barra superior de ações (não impressa) */}
        <div className="no-print flex items-center justify-between border-b border-gray-200 p-4">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-bakery-600" />
            <h3 className="text-base font-semibold text-gray-900">
              Talão de Encomenda ({cfg.paperWidth})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-bakery-600 px-3.5 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-bakery-700 transition"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* ÁREA DE IMPRESSÃO TÉRMICA (80mm / 58mm) */}
        <div className="overflow-y-auto p-6 bg-gray-50 flex justify-center">
          <div
            id="thermal-print-area"
            className={`${widthClass} ${fontSizeClass} border border-dashed border-gray-300 bg-white p-4 font-mono text-black shadow-sm`}
          >
            {/* Cabeçalho da Loja */}
            <div className="text-center">
              <p className="font-bold text-sm uppercase">
                {cfg.storeNameOverride || loja?.nome || encomenda.loja_nome || 'Padaria & Pastelaria'}
              </p>
              {cfg.slogan && <p className="text-[10px] text-gray-700 italic">{cfg.slogan}</p>}
              {cfg.showAddress && <p className="text-[11px]">{loja?.morada || 'Lisboa, Portugal'}</p>}
              {cfg.showPhone && <p className="text-[11px]">Tel: {loja?.telefone || '210 000 000'}</p>}
              {cfg.showNif && (loja?.nif || '500100201') && (
                <p className="text-[10px]">NIF: {loja?.nif || '500100201'}</p>
              )}
            </div>

            <div className="my-2 border-b border-dashed border-black" />

            {/* Número da Encomenda em Grande Destaque */}
            <div className="text-center my-1">
              <p className="text-[10px] uppercase tracking-wider">Número de Encomenda</p>
              <p className="text-lg font-black tracking-widest">{encomenda.codigo}</p>
              <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${
                encomenda.tipo === 'entrega_domicilio' ? 'border-black bg-black text-white' : 'border-black'
              }`}>
                {encomenda.tipo === 'entrega_domicilio' ? '>> ENTREGA AO DOMICÍLIO <<' : 'LEVANTAMENTO EM LOJA'}
              </span>
            </div>

            <div className="my-2 border-b border-dashed border-black" />

            {/* Agendamento e Cliente */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>DATA: <b>{encomenda.data_agendamento}</b></span>
                <span>HORA: <b>{encomenda.hora_agendamento}</b></span>
              </div>
              <p>CLIENTE: <b>{encomenda.cliente.nome}</b></p>
              <p>TEL: <b>{encomenda.cliente.telefone}</b></p>

              {encomenda.tipo === 'entrega_domicilio' && (
                <div className="mt-1 pt-1 border-t border-dotted border-gray-400">
                  <p className="font-bold">MORADA DE ENTREGA:</p>
                  <p>{encomenda.cliente.morada || 'Morada a confirmar'}</p>
                  {encomenda.cliente.codigo_postal && <p>{encomenda.cliente.codigo_postal}</p>}
                  {encomenda.carrinha_nome && <p className="font-bold mt-0.5">ROTA: {encomenda.carrinha_nome}</p>}
                  {encomenda.cliente.notas_entrega && (
                    <p className="italic text-[11px] mt-0.5">Obs: {encomenda.cliente.notas_entrega}</p>
                  )}
                </div>
              )}
            </div>

            <div className="my-2 border-b border-dashed border-black" />

            {/* Lista com Separação Padaria / Pastelaria */}
            {cfg.showSectionSeparation ? (
              <>
                {itensPadaria.length > 0 && (
                  <div className="mb-2">
                    <p className="font-bold uppercase tracking-wider text-[11px] mb-1">[ SETOR PADARIA ]</p>
                    {itensPadaria.map((item) => (
                      <div key={item.id} className="mb-1">
                        <div className="flex justify-between">
                          <span className="font-bold">
                            {item.quantidade}x {item.produto_nome}
                          </span>
                          <span>{(item.quantidade * item.preco_unitario).toFixed(2)}€</span>
                        </div>
                        {item.notas_personalizacao && cfg.highlightCakeNotes && (
                          <p className="text-[10px] italic pl-2">» {item.notas_personalizacao}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {itensPastelaria.length > 0 && (
                  <div className="mb-2">
                    <p className="font-bold uppercase tracking-wider text-[11px] mb-1">[ SETOR PASTELARIA ]</p>
                    {itensPastelaria.map((item) => (
                      <div key={item.id} className="mb-1">
                        <div className="flex justify-between">
                          <span className="font-bold">
                            {item.quantidade}x {item.produto_nome}
                          </span>
                          <span>{(item.quantidade * item.preco_unitario).toFixed(2)}€</span>
                        </div>
                        {item.notas_personalizacao && cfg.highlightCakeNotes && (
                          <div className="bg-gray-100 p-1 border border-black my-0.5">
                            <p className="text-[10px] font-bold">NOTA DE PERSONALIZAÇÃO:</p>
                            <p className="text-[10px]">{item.notas_personalizacao}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* Lista Sem Separação de Setor */
              <div className="mb-2">
                <p className="font-bold uppercase tracking-wider text-[11px] mb-1">[ ARTIGOS DO PEDIDO ]</p>
                {todosItens.map((item) => (
                  <div key={item.id} className="mb-1">
                    <div className="flex justify-between">
                      <span className="font-bold">
                        {item.quantidade}x {item.produto_nome}
                      </span>
                      <span>{(item.quantidade * item.preco_unitario).toFixed(2)}€</span>
                    </div>
                    {item.notas_personalizacao && cfg.highlightCakeNotes && (
                      <p className="text-[10px] italic pl-2">» {item.notas_personalizacao}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="my-2 border-b border-dashed border-black" />

            {/* Totais e Pagamento */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm font-black">
                <span>TOTAL A PAGAR:</span>
                <span>{encomenda.total.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>ESTADO:</span>
                <span className="font-bold uppercase">
                  {encomenda.estado_pagamento === 'pago' ? `[ PAGO - ${encomenda.metodo_pagamento || 'MBWAY'} ]` : '[ A COBRAR NO ATO ]'}
                </span>
              </div>
            </div>

            {encomenda.notas_cliente && (
              <div className="mt-2 pt-1 border-t border-dotted border-gray-400 text-[10px]">
                <p className="font-bold">NOTAS GERAIS:</p>
                <p>{encomenda.notas_cliente}</p>
              </div>
            )}

            <div className="my-3 border-b border-dashed border-black" />

            {/* Rodapé do Talão com margem de corte segura */}
            <div className="text-center text-[10px] space-y-1 pt-1 pb-8">
              {cfg.showQrCode && (
                <div className="flex justify-center my-1.5 opacity-80">
                  <div className="border border-black p-1 text-[8px] flex flex-col items-center">
                    <QrCode className="h-7 w-7" />
                    <span className="font-mono">{encomenda.codigo}</span>
                  </div>
                </div>
              )}
              <p>Emitido em: {new Date().toLocaleString('pt-PT')}</p>
              <p className="font-bold text-xs mt-1">{cfg.footerMessage}</p>
              <p className="text-[9px] tracking-widest text-gray-700 mt-1">*** SISTEMA DE ENCOMENDAS ***</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
