'use client';

import React, { useState, useRef } from 'react';
import { Carrinha, ClienteEmpresarialB2B, DiaSemana } from '../../types';
import { 
  X, 
  Download, 
  Printer, 
  Share2, 
  PenTool, 
  RotateCcw, 
  CheckCircle2, 
  Truck, 
  Building2, 
  Calendar, 
  FileText,
  Package,
  Layers
} from 'lucide-react';

export interface LinhaArtigoCarga {
  nome: string;
  categoria: 'padaria' | 'pastelaria';
  unidade: string;
  quantidade: number;
  caixasEstimadas: number;
  observacoes?: string;
}

export interface PdfViewerModalProps {
  tipo: 'folha_carga' | 'comprovativo_b2b';
  isOpen: boolean;
  onClose: () => void;
  // Dados para Folha de Carga
  carrinha?: Carrinha;
  diaSemana?: DiaSemana;
  dataReferencia?: string;
  itensCarga?: LinhaArtigoCarga[];
  clientesB2BRota?: ClienteEmpresarialB2B[];
  // Dados para Comprovativo B2B
  clienteB2B?: ClienteEmpresarialB2B;
  nomeCondutor?: string;
  matriculaCarro?: string;
  horaEntrega?: string;
}

export function PdfViewerModal({
  tipo,
  isOpen,
  onClose,
  carrinha,
  diaSemana = 'seg',
  dataReferencia,
  itensCarga = [],
  clientesB2BRota = [],
  clienteB2B,
  nomeCondutor,
  matriculaCarro,
  horaEntrega,
}: PdfViewerModalProps) {
  const [nomeRecebedor, setNomeRecebedor] = useState<string>('');
  const [assinaturaDataUrl, setAssinaturaDataUrl] = useState<string | null>(null);
  const [modoAssinaturaAberto, setModoAssinaturaAberto] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);

  if (!isOpen) return null;

  const dataFormatada = dataReferencia || new Date().toLocaleDateString('pt-PT');
  const horaAtual = horaEntrega || new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

  // Totais de Carga
  const totalPaoUnidades = itensCarga.reduce((acc, it) => acc + it.quantidade, 0);
  const totalCaixas = itensCarga.reduce((acc, it) => acc + it.caixasEstimadas, 0);

  // Lógica do Canvas de Assinatura no Ecrã Touch do Telemóvel
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
    isDrawingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const handleTouchEnd = () => {
    isDrawingRef.current = false;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    isDrawingRef.current = true;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const handleMouseUp = () => {
    isDrawingRef.current = false;
  };

  const limparCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setAssinaturaDataUrl(null);
  };

  const salvarAssinatura = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setAssinaturaDataUrl(canvas.toDataURL('image/png'));
    setModoAssinaturaAberto(false);
  };

  // Impressão / Descarregar PDF Nativo
  const handleImprimir = () => {
    window.print();
  };

  // Partilha via WhatsApp para o responsável da instituição
  const handlePartilharWhatsApp = () => {
    if (tipo === 'comprovativo_b2b' && clienteB2B) {
      const telefone = (clienteB2B.telemovel || clienteB2B.telefone || '').replace(/\D+/g, '');
      const itensResumo = Object.entries(
        (clienteB2B.quantidades_semanais || clienteB2B.quantidades_semana || {})[diaSemana] || {}
      )
        .map(([art, qtd]) => `• ${art}: ${qtd} un.`)
        .join('\n');

      const texto = encodeURIComponent(
        `🍞 *PADARIA DA VILA — COMPROVATIVO DE ENTREGA B2B*\n\n` +
        `*Entidade:* ${clienteB2B.nome}\n` +
        `*Data:* ${dataFormatada} às ${horaAtual}\n` +
        `*Rota:* ${carrinha?.rota || 'Rota de Distribuição'} (${matriculaCarro || 'Viatura Padaria'})\n` +
        `*Condutor:* ${nomeCondutor || 'Motorista'}\n\n` +
        `*Artigos Entregues Conformes:*\n${itensResumo}\n\n` +
        `*Recebido por:* ${nomeRecebedor || 'Receção da Instituição'}\n` +
        `Obrigado pela preferência!`
      );
      window.open(`https://wa.me/351${telefone}?text=${texto}`, '_blank');
    } else {
      const texto = encodeURIComponent(
        `📋 *PADARIA DA VILA — GUIA DE CARGA (${carrinha?.rota || 'Rota'})*\n` +
        `Data: ${dataFormatada}\n` +
        `Total de Unidades: ${totalPaoUnidades} pães/peças\n` +
        `Total de Caixas: ${totalCaixas} caixas carregadas.`
      );
      window.open(`https://wa.me/?text=${texto}`, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-gray-300 overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:border-none print:w-full">
        {/* Barra Superior de Ações (Oculta na impressão física) */}
        <div className="p-4 bg-gray-900 text-white flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-400" />
            <span className="font-black text-sm">
              {tipo === 'folha_carga'
                ? `Folha de Carga Oficial — ${carrinha?.rota || 'Rota'}`
                : `Comprovativo de Entrega B2B — ${clienteB2B?.nome || 'Entidade'}`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {tipo === 'comprovativo_b2b' && (
              <button
                type="button"
                onClick={() => setModoAssinaturaAberto(true)}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <PenTool className="h-3.5 w-3.5" />
                <span>{assinaturaDataUrl ? 'Assinado ✓' : 'Assinar no Ecrã'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePartilharWhatsApp}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              title="Partilhar resumo no WhatsApp"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleImprimir}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-gray-950 font-black text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Imprimir / PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal de Assinatura no Ecrã (Touchpad para motoristas) */}
        {modoAssinaturaAberto && (
          <div className="p-4 bg-indigo-50 border-b border-indigo-200 print:hidden space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                <PenTool className="h-4 w-4 text-indigo-600" />
                Assinatura do Responsável da Instituição (Touchscreen)
              </span>
              <button
                type="button"
                onClick={() => setModoAssinaturaAberto(false)}
                className="text-xs text-gray-500 hover:text-gray-800 font-bold"
              >
                Fechar
              </button>
            </div>

            <div className="border-2 border-dashed border-indigo-300 rounded-2xl bg-white overflow-hidden p-1">
              <canvas
                ref={canvasRef}
                width={500}
                height={160}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className="w-full h-40 bg-white cursor-crosshair touch-none"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                value={nomeRecebedor}
                onChange={(e) => setNomeRecebedor(e.target.value)}
                placeholder="Nome do recebedor (ex: Enf. Maria Santos)"
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-gray-300 bg-white font-bold"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={limparCanvas}
                  className="px-3 py-1.5 rounded-xl bg-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-300 transition"
                >
                  Limpar
                </button>
                <button
                  type="button"
                  onClick={salvarAssinatura}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 transition"
                >
                  Confirmar Assinatura
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ÁREA DO DOCUMENTO FORMATO A4 LIMPO */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 font-sans text-gray-900 bg-white print:p-0">
          
          {/* ============================================================== */}
          {/* CASO 1: FOLHA DE CARGA POR ROTA (ROTAS 1 A 8)                */}
          {/* ============================================================== */}
          {tipo === 'folha_carga' && (
            <div className="space-y-6">
              {/* Cabeçalho da Empresa */}
              <div className="border-b-2 border-gray-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 uppercase">
                    Padaria da Vila
                  </h1>
                  <p className="text-xs text-gray-600">
                    Fabrico Próprio de Pão Tradicional e Pastelaria Fina • Arouca
                  </p>
                  <p className="text-[11px] font-mono text-gray-500 mt-0.5">
                    Centro de Expedição e Logística da Madrugada
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="inline-block px-3 py-1 rounded-lg bg-gray-900 text-white font-black text-xs uppercase tracking-wider">
                    Guia de Carga de Expedição
                  </span>
                  <p className="text-xs font-bold text-gray-700 mt-1">Data: {dataFormatada}</p>
                  <p className="text-xs text-gray-500">Turno da Madrugada (04h00 – 06h00)</p>
                </div>
              </div>

              {/* Informações da Rota e Viatura */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-200 text-xs">
                <div>
                  <span className="block font-bold text-gray-500 uppercase text-[10px]">Identificação da Rota</span>
                  <span className="font-black text-base text-blue-900">
                    {carrinha?.rota || carrinha?.identificador || 'Rota'}
                  </span>
                </div>
                <div>
                  <span className="block font-bold text-gray-500 uppercase text-[10px]">Viatura</span>
                  <span className="font-bold text-gray-900">
                    {carrinha?.nome_carro || 'Viatura de Distribuição'}
                  </span>
                </div>
                <div>
                  <span className="block font-bold text-gray-500 uppercase text-[10px]">Matrícula</span>
                  <span className="font-mono font-black text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-300 inline-block">
                    {carrinha?.matricula || '00-00-00'}
                  </span>
                </div>
                <div>
                  <span className="block font-bold text-gray-500 uppercase text-[10px]">Condutor Responsável</span>
                  <span className="font-bold text-gray-900">
                    {carrinha?.nome_condutor || 'Condutor da Frota'}
                  </span>
                </div>
              </div>

              {/* Resumo de Carga Total */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200">
                  <span className="text-[11px] font-bold text-blue-900 block">Total Pães & Peças</span>
                  <span className="text-2xl font-black text-blue-950 font-mono">{totalPaoUnidades}</span>
                  <span className="text-[10px] text-blue-700 block mt-0.5">unidades a bordo</span>
                </div>
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-[11px] font-bold text-amber-900 block">Caixas / Cestas Estimadas</span>
                  <span className="text-2xl font-black text-amber-950 font-mono">{totalCaixas}</span>
                  <span className="text-[10px] text-amber-700 block mt-0.5">caixas empilhadas</span>
                </div>
                <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 col-span-2 sm:col-span-1">
                  <span className="text-[11px] font-bold text-purple-900 block">Clientes B2B na Rota</span>
                  <span className="text-2xl font-black text-purple-950 font-mono">{clientesB2BRota.length}</span>
                  <span className="text-[10px] text-purple-700 block mt-0.5">paragens institucionais</span>
                </div>
              </div>

              {/* Tabela de Artigos Carregados */}
              <div>
                <h3 className="text-xs font-black uppercase text-gray-700 mb-2 flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-blue-600" />
                  Discriminação de Artigos Carregados
                </h3>
                <table className="w-full text-xs border border-gray-300 border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-800 border-b border-gray-300">
                      <th className="py-2 px-3 text-left font-black">Artigo / Produto</th>
                      <th className="py-2 px-3 text-center font-black w-24">Setor</th>
                      <th className="py-2 px-3 text-right font-black w-28">Quantidade</th>
                      <th className="py-2 px-3 text-right font-black w-24">Caixas Est.</th>
                      <th className="py-2 px-3 text-left font-black">Conferência / Notas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {itensCarga.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-gray-400">
                          Nenhum artigo registado para esta rota.
                        </td>
                      </tr>
                    ) : (
                      itensCarga.map((item, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                          <td className="py-2 px-3 font-bold text-gray-900">{item.nome}</td>
                          <td className="py-2 px-3 text-center capitalize text-gray-600 font-medium">
                            {item.categoria}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-black text-blue-900">
                            {item.quantidade} {item.unidade}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-amber-900">
                            {item.caixasEstimadas} cx
                          </td>
                          <td className="py-2 px-3 text-gray-500">
                            [ &nbsp; ] Conferido na saída
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-black border-t-2 border-gray-400">
                      <td className="py-2.5 px-3">TOTAL GERAL DE CARGA</td>
                      <td className="py-2.5 px-3 text-center">-</td>
                      <td className="py-2.5 px-3 text-right font-mono text-sm text-blue-950">
                        {totalPaoUnidades} un.
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-sm text-amber-950">
                        {totalCaixas} cx
                      </td>
                      <td className="py-2.5 px-3 text-gray-600">Conforme padrão de saída</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Clientes B2B afetos a esta Rota */}
              {clientesB2BRota.length > 0 && (
                <div>
                  <h3 className="text-xs font-black uppercase text-gray-700 mb-2 flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-purple-600" />
                    Entregas Institucionais B2B nesta Rota
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {clientesB2BRota.map((cli) => {
                      const semana = cli.quantidades_semanais || cli.quantidades_semana || {};
                      const mapa = semana[diaSemana] || {};
                      const qtdTotalCli = Object.values(mapa).reduce((a, b) => a + Number(b || 0), 0);
                      return (
                        <div key={cli.id} className="p-2.5 rounded-xl border border-gray-200 bg-gray-50/70 flex items-center justify-between">
                          <div>
                            <span className="font-black text-gray-900 block">{cli.nome}</span>
                            <span className="text-[10px] text-gray-500">{cli.morada} • Tel: {cli.telemovel || cli.telefone}</span>
                          </div>
                          <span className="font-mono font-black text-purple-900 bg-purple-50 px-2 py-1 rounded border border-purple-200">
                            {qtdTotalCli} un.
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bloco de Assinaturas de Expedição */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-gray-200 text-xs">
                <div>
                  <span className="font-bold text-gray-600 block mb-12">Conferido por (Chefe de Fabrico / Expedição):</span>
                  <div className="border-t border-gray-400 pt-1 text-center font-mono text-gray-700">
                    Visto & Carimbo de Saída
                  </div>
                </div>
                <div>
                  <span className="font-bold text-gray-600 block mb-12">Recebido e Conferido (Motorista da Rota):</span>
                  <div className="border-t border-gray-400 pt-1 text-center font-mono text-gray-700">
                    Assinatura do Motorista
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* CASO 2: COMPROVATIVO DE ENTREGA B2B (HOSPITAIS, LARES, ETC.)    */}
          {/* ============================================================== */}
          {tipo === 'comprovativo_b2b' && (
            <div className="space-y-6">
              {/* Cabeçalho */}
              <div className="border-b-2 border-indigo-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 uppercase">
                    Padaria da Vila
                  </h1>
                  <p className="text-xs text-gray-600">
                    Matriz: Rua Principal de Arouca • NIF: 509 123 456
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Tel: 256 940 000 • Email: encomendas@padariadavila.pt
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="inline-block px-3 py-1 rounded-lg bg-indigo-900 text-white font-black text-xs uppercase tracking-wider">
                    Comprovativo de Entrega B2B
                  </span>
                  <p className="text-xs font-bold text-gray-700 mt-1">Guia Nº: B2B-{clienteB2B?.id?.substring(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-gray-500">Data: {dataFormatada} às {horaAtual}</p>
                </div>
              </div>

              {/* Dados do Cliente Empresarial e Transporte */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 text-xs space-y-1">
                  <span className="font-black text-indigo-950 uppercase text-[10px] block">
                    Entidade / Destinatário
                  </span>
                  <h2 className="text-base font-black text-gray-900">{clienteB2B?.nome}</h2>
                  <p className="text-gray-600"><span className="font-bold">NIF:</span> {clienteB2B?.nif || 'Consumidor Final / Isento'}</p>
                  <p className="text-gray-600"><span className="font-bold">Morada de Entrega:</span> {clienteB2B?.morada || 'Arouca'}</p>
                  <p className="text-gray-600"><span className="font-bold">Telefone:</span> {clienteB2B?.telemovel || clienteB2B?.telefone || 'N/A'}</p>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs space-y-1">
                  <span className="font-black text-gray-700 uppercase text-[10px] block">
                    Logística & Transporte
                  </span>
                  <p className="text-gray-700"><span className="font-bold">Rota:</span> {carrinha?.rota || 'Rota de Entrega'}</p>
                  <p className="text-gray-700"><span className="font-bold">Viatura:</span> {carrinha?.nome_carro || 'Viatura Padaria'}</p>
                  <p className="text-gray-700"><span className="font-bold">Matrícula:</span> <span className="font-mono font-bold">{matriculaCarro || carrinha?.matricula || '42-AB-90'}</span></p>
                  <p className="text-gray-700"><span className="font-bold">Motorista:</span> {nomeCondutor || carrinha?.nome_condutor || 'Motorista de Serviço'}</p>
                </div>
              </div>

              {/* Tabela de Produtos Entregues */}
              <div>
                <h3 className="text-xs font-black uppercase text-gray-700 mb-2">
                  Artigos Entregues Conformes
                </h3>
                <table className="w-full text-xs border border-gray-300 border-collapse">
                  <thead>
                    <tr className="bg-indigo-950 text-white border-b border-indigo-900">
                      <th className="py-2.5 px-3 text-left font-black">Produto / Artigo</th>
                      <th className="py-2.5 px-3 text-right font-black w-28">Quantidade</th>
                      <th className="py-2.5 px-3 text-center font-black w-24">Unidade</th>
                      <th className="py-2.5 px-3 text-center font-black w-28">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(() => {
                      const semana = clienteB2B?.quantidades_semanais || clienteB2B?.quantidades_semana || {};
                      const mapa = semana[diaSemana] || {};
                      const linhas = Object.entries(mapa).filter(([_, qtd]) => Number(qtd) > 0);

                      if (linhas.length === 0) {
                        return (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-gray-400">
                              Sem artigos fixos registados para {diaSemana.toUpperCase()}.
                            </td>
                          </tr>
                        );
                      }

                      return linhas.map(([artigo, qtd], i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                          <td className="py-2 px-3 font-bold text-gray-900">{artigo}</td>
                          <td className="py-2 px-3 text-right font-mono font-black text-indigo-950 text-sm">
                            {qtd}
                          </td>
                          <td className="py-2 px-3 text-center text-gray-600">un.</td>
                          <td className="py-2 px-3 text-center">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Conforme
                            </span>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-black border-t-2 border-gray-400">
                      <td className="py-2.5 px-3">TOTAL DE ARTIGOS RECEPCIONADOS</td>
                      <td className="py-2.5 px-3 text-right font-mono text-base text-indigo-950">
                        {(() => {
                          const semana = clienteB2B?.quantidades_semanais || clienteB2B?.quantidades_semana || {};
                          const mapa = semana[diaSemana] || {};
                          return Object.values(mapa).reduce((a, b) => a + Number(b || 0), 0);
                        })()} un.
                      </td>
                      <td className="py-2.5 px-3 text-center">unidades</td>
                      <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">100% Entregue</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Área de Validação e Assinatura Digital */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t-2 border-gray-200 text-xs">
                <div>
                  <span className="font-bold text-gray-600 block mb-1">Entregue por (Padaria da Vila):</span>
                  <p className="text-gray-800 font-bold">{nomeCondutor || carrinha?.nome_condutor || 'Motorista de Serviço'}</p>
                  <p className="text-[11px] text-gray-500 font-mono mt-0.5">Viatura: {carrinha?.rota} ({matriculaCarro || 'Matrícula Oficial'})</p>
                </div>

                <div className="border border-gray-300 rounded-2xl p-4 bg-gray-50/70 text-center space-y-2">
                  <span className="font-bold text-gray-700 block text-left">Recebido por (Cliente Institucional):</span>
                  
                  {assinaturaDataUrl ? (
                    <div className="space-y-1">
                      <img
                        src={assinaturaDataUrl}
                        alt="Assinatura Digital do Cliente"
                        className="max-h-20 mx-auto object-contain border-b border-gray-300 pb-1"
                      />
                      <p className="font-bold text-indigo-950 text-xs">{nomeRecebedor || 'Responsável pela Receção'}</p>
                      <p className="text-[10px] text-gray-500 font-mono">Assinado Digitalmente no Telemóvel às {horaAtual}</p>
                    </div>
                  ) : (
                    <div className="py-6 border-b border-dashed border-gray-400 text-gray-400 text-xs">
                      {nomeRecebedor ? (
                        <p className="font-bold text-gray-800">{nomeRecebedor}</p>
                      ) : (
                        <span>Carimbo da Instituição e Assinatura Legível</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Nota Legal */}
              <div className="pt-4 border-t border-gray-200 text-[10px] text-gray-400 text-center">
                Documento de conferência de entrega emitido nos termos da faturação periódica e contrato de fornecimento institucional.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
