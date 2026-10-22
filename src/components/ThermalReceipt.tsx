'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Encomenda, Loja } from '../types';
import { Printer, X, QrCode } from 'lucide-react';
import { ReceiptConfig, getReceiptConfig } from '../lib/receiptConfig';
import { useTranslation } from '../lib/i18n';
import { obterConfiguracaoMarca } from '../lib/tinaContent';

interface ThermalReceiptProps {
  encomenda: Encomenda;
  loja?: Loja;
  config?: ReceiptConfig;
  onClose?: () => void;
}

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({ encomenda, loja, config, onClose }) => {
  const { t, language } = useTranslation();
  const cfg = config || getReceiptConfig(encomenda.loja_id || loja?.id);
  const tinaMarca = obterConfiguracaoMarca();
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);
  }, []);

  const handlePrint = () => {
    const existing = document.getElementById('dynamic-thermal-page-size');
    if (existing) existing.remove();

    const styleEl = document.createElement('style');
    styleEl.id = 'dynamic-thermal-page-size';
    styleEl.textContent = `
      @page { 
        size: ${cfg.paperWidth === '58mm' ? '58mm auto' : '80mm auto'} !important; 
        margin: 0mm !important; 
      }
      body > *:not(#receipt-print-root) {
        display: none !important;
      }
      #pdf-print-root {
        display: none !important;
      }
    `;
    document.head.appendChild(styleEl);

    window.print();

    setTimeout(() => {
      const el = document.getElementById('dynamic-thermal-page-size');
      if (el) el.remove();
    }, 2000);
  };

  const itensPadaria = cfg.showSectionSeparation 
    ? encomenda.itens.filter((i) => i.setor === 'padaria')
    : [];
  const itensPastelaria = cfg.showSectionSeparation 
    ? encomenda.itens.filter((i) => i.setor === 'pastelaria')
    : [];
  const todosItens = !cfg.showSectionSeparation ? encomenda.itens : [];

  const widthClass = cfg.paperWidth === '58mm' ? 'w-[230px]' : 'w-[280px]';
  const fontSizeClass = 
    cfg.fontSize === 'compact' ? 'text-[10px]' :
    cfg.fontSize === 'large' ? 'text-xs' : 'text-[11px]';

  if (!montado) return null;

  return createPortal(
    <div id="receipt-print-root">
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        {/* Caixa do Modal de Pré-visualização do Talão */}
        <div className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Barra superior de ações (não impressa) */}
        <div className="no-print flex items-center justify-between border-b border-gray-200 p-4 shrink-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-bakery-600" />
            <div>
              <h3 className="text-sm font-bold text-gray-900 leading-tight">
                {t.receiptTitle} ({cfg.paperWidth} — Epson TM-T20 M249A)
              </h3>
              <p className="text-[10px] text-gray-500">Formato térmico calibrado: rolo 80mm (68mm área segura útil)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-bakery-600 px-3.5 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-bakery-700 transition cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              {t.print}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* ÁREA DE IMPRESSÃO TÉRMICA (Epson M249A TM-T20 - 80mm / 68mm útil calibrada) */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 pb-20 bg-gray-100">
          <div
            id="thermal-print-area"
            data-paper-width={cfg.paperWidth}
            data-font-size={cfg.fontSize}
            className={`${widthClass} ${fontSizeClass} mx-auto block h-auto border border-dashed border-gray-400 bg-white p-3 sm:p-4 pb-10 font-mono text-black shadow-md my-2 box-border`}
          >
            {/* Cabeçalho da Loja */}
            <div className="text-center px-1">
              <p className="font-bold text-sm uppercase break-words">
                {cfg.storeNameOverride || loja?.nome || encomenda.loja_nome || tinaMarca.nomeEmpresa || 'Padaria & Pastelaria'}
              </p>
              {(cfg.slogan || tinaMarca.slogan) && (
                <p className="text-[10px] text-black italic break-words">{cfg.slogan || tinaMarca.slogan}</p>
              )}
              {cfg.showAddress && <p className="text-[10.5px] break-words">{loja?.morada || 'Arouca, Portugal'}</p>}
              {cfg.showPhone && <p className="text-[10.5px]">{t.phone}: {loja?.telefone || tinaMarca.telefoneGeral || '256 940 000'}</p>}
              {cfg.showNif && (loja?.nif || tinaMarca.nif || '500100201') && (
                <p className="text-[10px]">{t.nif}: {loja?.nif || tinaMarca.nif || '500100201'}</p>
              )}
            </div>

            <div className="my-2 border-b border-dashed border-black" />

            {/* Número da Encomenda em Grande Destaque */}
            <div className="text-center my-1 px-1">
              <p className="text-[10px] uppercase tracking-wider">{t.receiptOrderNumber}</p>
              <p className="text-base font-black tracking-tight my-0.5">{encomenda.codigo}</p>
              <div className="flex justify-center gap-1 mt-1 flex-wrap">
                <span className="px-1.5 py-0.5 text-[9.5px] font-black uppercase rounded border border-black whitespace-nowrap">
                  {encomenda.tipo === 'entrega_domicilio' ? t.receiptHomeDelivery : t.receiptPickup}
                </span>
                <span className="px-1.5 py-0.5 text-[9.5px] font-bold uppercase rounded border border-black whitespace-nowrap">
                  {encomenda.canal_origem === 'site_online' ? 'Site Online' :
                   encomenda.canal_origem === 'whatsapp' ? 'WhatsApp' :
                   encomenda.canal_origem === 'telefone' ? 'Telefone' : 'Presencial'}
                </span>
              </div>
            </div>

            <div className="my-2 border-b border-dashed border-black" />

            {/* Agendamento e Cliente */}
            <div className="space-y-1 px-1">
              <div className="flex justify-between items-center text-[11px]">
                <span>{t.date.toUpperCase()}: <b>{encomenda.data_agendamento}</b></span>
                <span>{t.time.toUpperCase()}: <b>{encomenda.hora_agendamento}</b></span>
              </div>
              <p className="text-[11px] break-words">{t.receiptCustomer}: <b>{encomenda.cliente?.nome || 'Cliente'}</b></p>
              <p className="text-[11px]">{t.receiptPhone}: <b>{encomenda.cliente?.telefone || '—'}</b></p>

              {encomenda.tipo === 'entrega_domicilio' && (
                <div className="mt-1 pt-1 border-t border-dotted border-gray-400 text-[10.5px]">
                  <p className="font-bold">{t.receiptDeliveryAddress}:</p>
                  <p className="break-words">{encomenda.cliente?.morada || 'Morada a confirmar'}</p>
                  {encomenda.cliente?.codigo_postal && <p>{encomenda.cliente.codigo_postal}</p>}
                  {encomenda.carrinha_nome && <p className="font-bold mt-0.5">{t.receiptRoute}: {encomenda.carrinha_nome}</p>}
                  {encomenda.cliente?.notas_entrega && (
                    <p className="italic text-[10px] mt-0.5 break-words">{t.receiptObs}: {encomenda.cliente.notas_entrega}</p>
                  )}
                </div>
              )}
            </div>

            <div className="my-2 border-b border-dashed border-black" />

            {/* Lista com Separação Padaria / Pastelaria */}
            {cfg.showSectionSeparation ? (
              <>
                {itensPadaria.length > 0 && (
                  <div className="mb-2 px-1">
                    <p className="font-bold uppercase tracking-wider text-[10.5px] mb-1">{t.receiptBakerySection}</p>
                    {itensPadaria.map((item) => {
                      const isRecusado = item.estado_producao === 'recusado';
                      return (
                        <div key={item.id} className="mb-1 text-[11px]">
                          <div className="flex justify-between items-center gap-1 pr-1">
                            <span className={`font-bold ${isRecusado ? 'line-through opacity-70' : ''}`}>
                              {item.quantidade}x {item.produto_nome}
                            </span>
                            {isRecusado && (
                              <span className="text-[9px] font-black uppercase border border-black px-1 shrink-0">
                                NÃO PROD.
                              </span>
                            )}
                          </div>
                          {item.notas_personalizacao && cfg.highlightCakeNotes && (
                            <p className="text-[10px] italic pl-2 break-words">» {item.notas_personalizacao}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {itensPastelaria.length > 0 && (
                  <div className="mb-2 px-1">
                    <p className="font-bold uppercase tracking-wider text-[10.5px] mb-1">{t.receiptPastrySection}</p>
                    {itensPastelaria.map((item) => {
                      const isRecusado = item.estado_producao === 'recusado';
                      return (
                        <div key={item.id} className="mb-1 text-[11px]">
                          <div className="flex justify-between items-center gap-1 pr-1">
                            <span className={`font-bold ${isRecusado ? 'line-through opacity-70' : ''}`}>
                              {item.quantidade}x {item.produto_nome}
                            </span>
                            {isRecusado && (
                              <span className="text-[9px] font-black uppercase border border-black px-1 shrink-0">
                                NÃO PROD.
                              </span>
                            )}
                          </div>
                          {item.notas_personalizacao && cfg.highlightCakeNotes && (
                            <div className="bg-gray-100 p-1 border border-black my-0.5">
                              <p className="text-[10px] font-bold">{t.customizationNotes}</p>
                              <p className="text-[10px] break-words">{item.notas_personalizacao}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="mb-2 px-1">
                <p className="font-bold uppercase tracking-wider text-[10.5px] mb-1">{t.receiptAllItemsSection}</p>
                {todosItens.map((item) => {
                  const isRecusado = item.estado_producao === 'recusado';
                  return (
                    <div key={item.id} className="mb-1 text-[11px]">
                      <div className="flex justify-between items-center gap-1 pr-1">
                        <span className={`font-bold ${isRecusado ? 'line-through opacity-70' : ''}`}>
                          {item.quantidade}x {item.produto_nome}
                        </span>
                        {isRecusado && (
                          <span className="text-[9px] font-black uppercase border border-black px-1 shrink-0">
                            NÃO PROD.
                          </span>
                        )}
                      </div>
                      {item.notas_personalizacao && cfg.highlightCakeNotes && (
                        <p className="text-[10px] italic pl-2 break-words">» {item.notas_personalizacao}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="my-2 border-b border-dashed border-black" />

            {/* Resumo de Artigos (excluindo artigos não produzidos/recusados) */}
            <div className="space-y-1 px-1">
              <div className="flex justify-between items-center text-xs font-bold uppercase border-t border-b border-black py-1 pr-1">
                <span>{t.totalItems}:</span>
                <span className="font-black">
                  {encomenda.itens
                    .filter((item: any) => item.estado_producao !== 'recusado')
                    .reduce((acc: number, item: any) => acc + item.quantidade, 0)} un.
                </span>
              </div>
            </div>

            {encomenda.observacoes_producao && (
              <div className="mt-2 pt-1 border-t border-dotted border-black text-[10px] px-1">
                <p className="font-bold uppercase">Obs. Produção:</p>
                <p className="break-words">{encomenda.observacoes_producao}</p>
              </div>
            )}

            {encomenda.notas_cliente && (
              <div className="mt-2 pt-1 border-t border-dotted border-gray-400 text-[10px] px-1">
                <p className="font-bold">{t.receiptGeneralNotes}:</p>
                <p className="break-words">{encomenda.notas_cliente}</p>
              </div>
            )}

            <div className="my-3 border-b border-dashed border-black" />

            {/* Rodapé do Talão */}
            <div className="text-center text-[10px] space-y-1 pt-1 pb-8 px-1">
              {cfg.showQrCode && (
                <div className="flex justify-center my-1.5 opacity-80">
                  <div className="border border-black p-1 text-[8px] flex flex-col items-center">
                    <QrCode className="h-7 w-7" />
                    <span className="font-mono">{encomenda.codigo}</span>
                  </div>
                </div>
              )}
              <p className="text-[9.5px]">{t.receiptIssuedAt}: {new Date().toLocaleString(language === 'en' ? 'en-GB' : 'pt-PT')}</p>
              <p className="font-bold text-xs mt-1 break-words">{cfg.footerMessage || tinaMarca.rodapeTalao || t.receiptThankYou}</p>
              <p className="text-[8.5px] tracking-wider text-gray-700 mt-1">{t.receiptSystemNotice}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>,
  document.body
);
};
