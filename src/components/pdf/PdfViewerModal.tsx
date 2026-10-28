'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Carrinha, ClienteEmpresarialB2B, DiaSemana, Loja, Encomenda } from '../../types';
import { obterQuantidadeEfetivaClienteB2B, obterArtigosAjustadosClienteB2B } from '../../lib/encomendasService';
import { 
  X, 
  Printer, 
  Share2, 
  PenTool, 
  CheckCircle2, 
  Truck, 
  Building2, 
  Calendar, 
  FileText,
  Package,
  Layers,
  ShoppingBag,
  Store,
  Clock,
  User,
  Phone,
  Check
} from 'lucide-react';

export interface LinhaArtigoCarga {
  nome: string;
  categoria: 'padaria' | 'pastelaria';
  unidade: string;
  quantidade: number;
  caixasEstimadas: number;
  observacoes?: string;
}

export interface LinhaArtigoFabrico {
  produto_nome: string;
  setor: 'padaria' | 'pastelaria' | string;
  quantidade_total: number;
  unidade?: string;
  encomendas_count?: number;
  encomendas_codigos?: string[];
  personalizacoes?: string[];
  qtd_bases_diarias?: number;
  qtd_clientes_b2b?: number;
  qtd_encomendas?: number;
}

export interface PdfViewerModalProps {
  tipo: 'folha_carga' | 'comprovativo_b2b' | 'folha_fabrico';
  isOpen: boolean;
  onClose: () => void;
  // Dados para Folha de Carga
  carrinha?: Carrinha;
  diaSemana?: DiaSemana;
  dataReferencia?: string;
  itensCarga?: LinhaArtigoCarga[];
  clientesB2BRota?: ClienteEmpresarialB2B[];
  encomendasRota?: any[];
  // Dados para Comprovativo B2B
  clienteB2B?: ClienteEmpresarialB2B;
  nomeCondutor?: string;
  matriculaCarro?: string;
  horaEntrega?: string;
  // Dados para Folha de Fabrico
  itensFabrico?: LinhaArtigoFabrico[];
  lojaNome?: string;
  setorFiltro?: string;
  modoFabrico?: 'consolidado' | 'encomendas';
  encomendasFabrico?: Encomenda[] | any[];
  lojasFabrico?: Loja[];
  lojaIdFiltro?: string;
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
  encomendasRota = [],
  clienteB2B,
  nomeCondutor,
  matriculaCarro,
  horaEntrega,
  itensFabrico = [],
  lojaNome = 'Todas as Lojas',
  setorFiltro = 'todos',
  modoFabrico = 'consolidado',
  encomendasFabrico = [],
  lojasFabrico = [],
  lojaIdFiltro = 'todas',
}: PdfViewerModalProps) {
  const [nomeRecebedor, setNomeRecebedor] = useState<string>('');
  const [assinaturaDataUrl, setAssinaturaDataUrl] = useState<string | null>(null);
  const [modoAssinaturaAberto, setModoAssinaturaAberto] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const normalizarUnidade = (unid?: string) => {
    if (!unid) return 'un.';
    const u = unid.toLowerCase().trim();
    if (u === 'unidade' || u === 'un' || u === 'un.' || u === 'unidades') return 'un.';
    if (u.includes('kg') || u.includes('quilo')) return 'kg';
    if (u.includes('cento')) return 'cento';
    return 'un.';
  };

  const isDrawingRef = useRef<boolean>(false);

  // Estados locais para alternar Loja, Setor e Modo dentro do Modal
  const [lojaModalFiltro, setLojaModalFiltro] = useState<string>(lojaIdFiltro || 'todas');
  const [setorModalFiltro, setSetorModalFiltro] = useState<string>(setorFiltro || 'todos');
  const [modoFabricoModal, setModoFabricoModal] = useState<'consolidado' | 'encomendas'>(modoFabrico);

  useEffect(() => {
    if (lojaIdFiltro) setLojaModalFiltro(lojaIdFiltro);
  }, [lojaIdFiltro]);

  useEffect(() => {
    if (modoFabrico) setModoFabricoModal(modoFabrico);
  }, [modoFabrico]);

  useEffect(() => {
    if (setorFiltro) setSetorModalFiltro(setorFiltro);
  }, [setorFiltro]);

  // Lista unificada de todas as lojas para filtro e agrupamento
  const lojasAlvo = useMemo(() => {
    const mapaLojas = new Map<string, Loja>();
    (lojasFabrico || []).forEach((l) => mapaLojas.set(l.id, l));
    (encomendasFabrico as any[] || []).forEach((enc) => {
      const lid = enc.loja_id || 'sem_loja';
      if (!mapaLojas.has(lid)) {
        mapaLojas.set(lid, {
          id: lid,
          nome: enc.loja_nome || (lid === 'sem_loja' ? 'Balcão / Geral' : `Loja ${lid}`),
          morada: '',
          telefone: '',
          codigo: lid,
          ativo: true,
        });
      }
    });
    return Array.from(mapaLojas.values());
  }, [lojasFabrico, encomendasFabrico]);

  // Agrupamento de encomendas por loja para produção discriminada
  const lojasComEncomendas = useMemo(() => {
    if (modoFabricoModal !== 'encomendas' || !encomendasFabrico || encomendasFabrico.length === 0) {
      return [];
    }

    return lojasAlvo
      .filter((loja) => lojaModalFiltro === 'todas' || loja.id === lojaModalFiltro)
      .map((loja) => {
        const encsDaLoja = (encomendasFabrico as any[])
          .filter((enc) => (enc.loja_id === loja.id || (!enc.loja_id && loja.id === 'sem_loja')))
          .map((enc) => {
            const itensFiltrados = (enc.itens || [])
              .filter((it: any) => it.estado_producao !== 'recusado' && Number(it.quantidade) > 0)
              .filter((it: any) => setorModalFiltro === 'todos' || it.setor === setorModalFiltro)
              .map((it: any) => ({
                ...it,
                produto_nome: String(it.produto_nome || '').trim(),
                quantidade: Number(it.quantidade),
              }));

            const totalEnc = itensFiltrados.reduce((acc: number, it: any) => acc + it.quantidade, 0);
            return {
              ...enc,
              itensFiltrados,
              totalEnc,
            };
          })
          .filter((enc) => enc.totalEnc > 0)
          .sort((a, b) => (a.hora_agendamento || '10:00').localeCompare(b.hora_agendamento || '10:00'));

        const totalLojaUnidades = encsDaLoja.reduce((acc, e) => acc + e.totalEnc, 0);
        const totalLojaPadaria = encsDaLoja.reduce(
          (acc, e) => acc + e.itensFiltrados.filter((i: any) => i.setor === 'padaria').reduce((s: number, i: any) => s + i.quantidade, 0),
          0
        );
        const totalLojaPastelaria = encsDaLoja.reduce(
          (acc, e) => acc + e.itensFiltrados.filter((i: any) => i.setor === 'pastelaria' || i.setor !== 'padaria').reduce((s: number, i: any) => s + i.quantidade, 0),
          0
        );

        return {
          loja,
          encomendas: encsDaLoja,
          totalLojaUnidades,
          totalLojaPadaria,
          totalLojaPastelaria,
        };
      })
      .filter((g) => g.encomendas.length > 0);
  }, [modoFabricoModal, encomendasFabrico, lojasAlvo, lojaModalFiltro, setorModalFiltro]);

  const totalGeralFabricoEncs = useMemo(() => {
    return lojasComEncomendas.reduce((acc, g) => acc + g.totalLojaUnidades, 0);
  }, [lojasComEncomendas]);

  const totalGeralEncsCount = useMemo(() => {
    return lojasComEncomendas.reduce((acc, g) => acc + g.encomendas.length, 0);
  }, [lojasComEncomendas]);

  const dataFormatada = dataReferencia || new Date().toLocaleDateString('pt-PT');
  const horaAtual = horaEntrega || new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

  // Totais de Carga - Separando Base Diária, Clientes B2B e Encomendas Adicionais
  const totalBaseDiaria = useMemo(() => itensCarga.reduce((acc, it) => acc + it.quantidade, 0), [itensCarga]);
  const totalBaseCaixas = useMemo(() => itensCarga.reduce((acc, it) => acc + it.caixasEstimadas, 0), [itensCarga]);

  // Clientes B2B da Rota (filtrando estritamente clientes com entregas agendadas > 0 un. para o dia)
  const clientesB2BComCarga = useMemo(() => {
    return clientesB2BRota
      .map((cli) => {
        const semana = (cli.quantidades_semanais || cli.quantidades_semana || {}) as Record<string, Record<string, number>>;
        const mapa = semana[diaSemana] || {};
        const candidatos = new Set<string>();
        Object.keys(mapa).forEach((a) => candidatos.add(a.trim()));
        if (cli.quantidades_semanais) {
          Object.values(cli.quantidades_semanais).forEach((m) => {
            Object.keys(m || {}).forEach((a) => candidatos.add(a.trim()));
          });
        }
        if (cli.produtos_predefinidos) {
          Object.keys(cli.produtos_predefinidos).forEach((a) => candidatos.add(a.trim()));
        }
        if (dataReferencia) {
          obterArtigosAjustadosClienteB2B(dataReferencia, cli.id).forEach((a) => candidatos.add(a.trim()));
        }
        const itensDoCli = Array.from(candidatos)
          .map((artigo) => {
            let qtd = Number(mapa[artigo] || 0);
            if (dataReferencia) {
              const { quantidade } = obterQuantidadeEfetivaClienteB2B(dataReferencia, cli.id, artigo, semana, diaSemana);
              qtd = quantidade;
            }
            return {
              artigo: String(artigo || '').trim(),
              quantidade: qtd,
            };
          })
          .filter((it) => it.quantidade > 0);

        const totalCli = itensDoCli.reduce((acc, it) => acc + it.quantidade, 0);
        return {
          ...cli,
          itensDoCli,
          totalCli,
        };
      })
      .filter((cli) => cli.totalCli > 0);
  }, [clientesB2BRota, diaSemana, dataReferencia]);

  const totalB2B = useMemo(() => {
    return clientesB2BComCarga.reduce((acc, cli) => acc + cli.totalCli, 0);
  }, [clientesB2BComCarga]);

  // Encomendas Adicionais com entrega nesta carrinha para o dia
  const encomendasComCarga = useMemo(() => {
    return (encomendasRota || [])
      .map((enc) => {
        const itensValidos = (enc.itens || [])
          .filter((it: any) => it.estado_producao !== 'recusado' && Number(it.quantidade) > 0)
          .map((it: any) => ({
            produto_nome: String(it.produto_nome || '').trim(),
            quantidade: Number(it.quantidade),
            unidade: normalizarUnidade(it.unidade),
          }));
        const totalEnc = itensValidos.reduce((acc: number, it: any) => acc + it.quantidade, 0);
        return {
          ...enc,
          itensValidos,
          totalEnc,
        };
      })
      .filter((enc) => enc.totalEnc > 0);
  }, [encomendasRota]);

  const totalEncomendas = useMemo(() => {
    return encomendasComCarga.reduce((acc, enc) => acc + enc.totalEnc, 0);
  }, [encomendasComCarga]);

  const totalGeralCarga = totalBaseDiaria + totalB2B + totalEncomendas;
  const totalGeralCaixasEstimadas = totalBaseCaixas + Math.ceil((totalB2B + totalEncomendas) / 30);

  // Totais de Fabrico
  const totalFabricoUnidades = itensFabrico.reduce((acc, it) => acc + it.quantidade_total, 0);
  const totalFabricoPadaria = itensFabrico.filter(it => it.setor === 'padaria').reduce((acc, it) => acc + it.quantidade_total, 0);
  const totalFabricoPastelaria = itensFabrico.filter(it => it.setor === 'pastelaria' || it.setor !== 'padaria').reduce((acc, it) => acc + it.quantidade_total, 0);
  const totalFabricoEncs = itensFabrico.reduce((acc, it) => acc + (it.encomendas_count || 0), 0);

  const itensPadaria = itensFabrico.filter(it => it.setor === 'padaria');
  const itensPastelaria = itensFabrico.filter(it => it.setor === 'pastelaria' || it.setor !== 'padaria');

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

  // Impressão / Descarregar PDF Nativo (A4 Calibrado sem páginas em branco)
  const handleImprimir = () => {
    const existing = document.getElementById('dynamic-pdf-page-size');
    if (existing) existing.remove();

    const styleEl = document.createElement('style');
    styleEl.id = 'dynamic-pdf-page-size';
    styleEl.textContent = `
      @page { 
        size: A4 portrait !important; 
        margin: 8mm !important; 
      }
      body > *:not(#pdf-print-root) {
        display: none !important;
      }
      #receipt-print-root {
        display: none !important;
      }
      #pdf-print-root {
        display: block !important;
        position: static !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        overflow: visible !important;
      }
      #pdf-print-root,
      #pdf-print-root * {
        overflow: visible !important;
        max-height: none !important;
        box-shadow: none !important;
        background-color: transparent !important;
        background-image: none !important;
        color: #000000 !important;
        -webkit-print-color-adjust: economy !important;
        print-color-adjust: economy !important;
      }
      #pdf-print-root .print\\:hidden {
        display: none !important;
      }
      #pdf-print-root table,
      #pdf-print-root th,
      #pdf-print-root td,
      #pdf-print-root div,
      #pdf-print-root span {
        border-color: #555555 !important;
      }
    `;
    document.head.appendChild(styleEl);

    window.print();

    setTimeout(() => {
      const el = document.getElementById('dynamic-pdf-page-size');
      if (el) el.remove();
    }, 2000);
  };

  // Partilha via WhatsApp
  const handlePartilharWhatsApp = () => {
    if (tipo === 'folha_fabrico') {
      if (modoFabricoModal === 'encomendas') {
        const nomeLojaAtiva = lojaModalFiltro === 'todas' ? 'Todas as Lojas' : (lojasComEncomendas[0]?.loja?.nome || lojaNome);
        const linhasLojas = lojasComEncomendas.map((g) =>
          `📍 *${g.loja.nome}*: ${g.encomendas.length} enc. • ${g.totalLojaUnidades} un. (🥖 ${g.totalLojaPadaria} | 🧁 ${g.totalLojaPastelaria})`
        ).join('\n');

        const texto = encodeURIComponent(
          `📋 *PADARIA DA VILA — FOLHA DE FABRICO DE ENCOMENDAS POR LOJA*\n` +
          `Data: ${dataFormatada}\n` +
          `Loja(s): ${nomeLojaAtiva}\n` +
          `Setor: ${setorModalFiltro === 'todos' ? 'Todos' : setorModalFiltro.toUpperCase()}\n\n` +
          `*Resumo por Loja:*\n${linhasLojas || 'Sem encomendas'}\n\n` +
          `*TOTAL GERAL A FABRICAR:* ${totalGeralFabricoEncs} un. (${totalGeralEncsCount} encomendas)\n` +
          `Centro de Produção & Unidade Fabril • Arouca`
        );
        window.open(`https://wa.me/?text=${texto}`, '_blank');
        return;
      }
      const texto = encodeURIComponent(
        `📋 *PADARIA DA VILA — FOLHA DIÁRIA DE FABRICO (CONSOLIDADA)*\n` +
        `Data: ${dataFormatada}\n` +
        `Total de Unidades a Produzir: ${totalFabricoUnidades} un.\n` +
        `• Padaria: ${totalFabricoPadaria} un.\n` +
        `• Pastelaria: ${totalFabricoPastelaria} un.\n` +
        `Unidade Central de Produção • Arouca`
      );
      window.open(`https://wa.me/?text=${texto}`, '_blank');
      return;
    }

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
        `*PADARIA DA VILA — GUIA DE CARGA OFICIAL*\n` +
        `Rota: ${carrinha?.rota || 'Frota'} (${carrinha?.matricula || ''})\n` +
        `Condutor: ${carrinha?.nome_condutor || nomeCondutor || 'Condutor'}\n` +
        `Data: ${dataFormatada}\n\n` +
        `1. Base Diária Rota: ${totalBaseDiaria} un.\n` +
        `2. Clientes B2B: ${totalB2B} un. (${clientesB2BComCarga.length} paragens)\n` +
        `3. Encomendas: ${totalEncomendas} un. (${encomendasComCarga.length} entregas)\n` +
        `--------------------------------\n` +
        `*TOTAL GERAL A BORDO: ${totalGeralCarga} un.*`
      );
      window.open(`https://wa.me/?text=${texto}`, '_blank');
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div id="pdf-print-root" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-gray-300 overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:border-none print:w-full print:overflow-visible">
        {/* Barra Superior de Ações (Oculta na impressão física) */}
        <div className="p-4 bg-gray-900 text-white flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-400" />
            <span className="font-black text-sm">
              {tipo === 'folha_carga'
                ? `Folha de Carga Oficial — ${carrinha?.rota || 'Rota'}`
                : tipo === 'folha_fabrico'
                ? modoFabricoModal === 'encomendas'
                  ? `Folha de Fabrico de Encomendas por Loja — ${dataFormatada}`
                  : `Folha de Fabrico Consolidada — ${dataFormatada}`
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

        {/* Barra Secundária de Filtros do Fabrico (Consolidado vs Encomendas por Loja) */}
        {tipo === 'folha_fabrico' && (
          <div className="px-4 py-2.5 bg-gray-800 border-t border-gray-700 flex flex-wrap items-center justify-between gap-2.5 print:hidden">
            {/* Alternar Modo: Consolidado Global vs Por Encomenda */}
            <div className="flex items-center gap-1 bg-gray-900 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setModoFabricoModal('consolidado')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  modoFabricoModal === 'consolidado'
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Consolidado Global</span>
              </button>
              <button
                type="button"
                onClick={() => setModoFabricoModal('encomendas')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  modoFabricoModal === 'encomendas'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>Por Encomenda (Lojas)</span>
              </button>
            </div>

            {/* Filtros no Modo Encomendas */}
            {modoFabricoModal === 'encomendas' && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Seletor de Loja */}
                <div className="flex items-center gap-1.5 bg-gray-900 px-2.5 py-1 rounded-xl border border-gray-700">
                  <Store className="h-3.5 w-3.5 text-blue-400" />
                  <span className="text-gray-400 font-bold">Loja:</span>
                  <select
                    value={lojaModalFiltro}
                    onChange={(e) => setLojaModalFiltro(e.target.value)}
                    className="bg-transparent text-white font-bold outline-none cursor-pointer text-xs"
                  >
                    <option value="todas" className="bg-gray-800 text-white">Todas as Lojas</option>
                    {lojasAlvo.map((l) => (
                      <option key={l.id} value={l.id} className="bg-gray-800 text-white">
                        {l.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Seletor de Setor */}
                <div className="flex items-center gap-1.5 bg-gray-900 px-2.5 py-1 rounded-xl border border-gray-700">
                  <span className="text-gray-400 font-bold">Setor:</span>
                  <select
                    value={setorModalFiltro}
                    onChange={(e) => setSetorModalFiltro(e.target.value)}
                    className="bg-transparent text-white font-bold outline-none cursor-pointer text-xs"
                  >
                    <option value="todos" className="bg-gray-800 text-white">Todos os Setores</option>
                    <option value="padaria" className="bg-gray-800 text-white">🥖 Padaria</option>
                    <option value="pastelaria" className="bg-gray-800 text-white">🧁 Pastelaria</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

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
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 font-sans text-gray-900 bg-white print:p-0 print:overflow-visible print:h-auto">
          
          {/* ============================================================== */}
          {/* CASO 1: FOLHA DE CARGA POR ROTA (ROTAS 1 A 7)                */}
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
                    Centro de Expedição e Logística
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="inline-block px-3 py-1 rounded-lg border-2 border-stone-800 text-stone-900 bg-white font-black text-xs uppercase tracking-wider">
                    Guia de Carga de Expedição
                  </span>
                  <p className="text-xs font-bold text-gray-700 mt-1">Data: {dataFormatada}</p>
                </div>
              </div>

              {/* Informações da Rota e Viatura */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-stone-300 text-xs">
                <div>
                  <span className="block font-bold text-gray-500 uppercase text-[10px]">Identificação da Rota</span>
                  <span className="font-black text-base text-stone-900">
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
                  <span className="font-mono font-black text-gray-900 bg-white px-2 py-0.5 rounded border border-stone-400 inline-block">
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

              {/* Resumo de Carga Total da Viatura (Economia de Tinteiro - Sem Fundo de Preenchimento) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-white border border-stone-300">
                  <span className="text-[10px] font-bold text-stone-600 uppercase block">1. Base Diária Rota</span>
                  <span className="text-2xl font-black text-stone-950 font-mono">{totalBaseDiaria} un.</span>
                  <span className="text-[10px] text-stone-500 block mt-0.5">{itensCarga.length} artigos da rota</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-stone-300">
                  <span className="text-[10px] font-bold text-stone-600 uppercase block">2. Clientes B2B</span>
                  <span className="text-2xl font-black text-stone-950 font-mono">{totalB2B} un.</span>
                  <span className="text-[10px] text-stone-500 block mt-0.5">{clientesB2BComCarga.length} paragens com carga</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-stone-300">
                  <span className="text-[10px] font-bold text-stone-600 uppercase block">3. Encomendas</span>
                  <span className="text-2xl font-black text-stone-950 font-mono">{totalEncomendas} un.</span>
                  <span className="text-[10px] text-stone-500 block mt-0.5">{encomendasComCarga.length} entregas domicílio</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border-2 border-stone-900 text-stone-900">
                  <span className="text-[10px] font-bold text-stone-600 uppercase block">Total Geral a Bordo</span>
                  <span className="text-2xl font-black text-stone-950 font-mono">{totalGeralCarga} un.</span>
                  <span className="text-[10px] text-stone-500 block mt-0.5">unidades totais a bordo</span>
                </div>
              </div>

              {/* Tabela de Artigos Carregados (Quantidades Consolidadas da Base Diária) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-black uppercase text-stone-900 flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-stone-700" />
                    1. Quantidades da Base Diária Carregadas na Viatura (Abastecimento Rota + Particulares)
                  </h3>
                  <span className="text-[11px] text-stone-600 font-bold">
                    {itensCarga.length} artigos na rota
                  </span>
                </div>
                <table className="w-full text-xs border border-stone-300 border-collapse">
                  <thead>
                    <tr className="bg-white text-stone-900 border-b-2 border-stone-800 font-black">
                      <th className="py-2.5 px-4 text-left">Artigo / Produto</th>
                      <th className="py-2.5 px-3 text-center w-28">Setor</th>
                      <th className="py-2.5 px-4 text-right w-36">Quantidade Base</th>
                      <th className="py-2.5 px-4 text-left w-48">Conferência / Visto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {itensCarga.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-gray-400">
                          Nenhum artigo registado para esta rota.
                        </td>
                      </tr>
                    ) : (
                      itensCarga.map((item, idx) => (
                        <tr key={idx} className="bg-white border-b border-stone-150">
                          <td className="py-2.5 px-4 font-bold text-gray-900">{item.nome}</td>
                          <td className="py-2.5 px-3 text-center capitalize text-gray-600 font-medium">
                            {item.categoria}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-black text-stone-900">
                            {item.quantidade} {normalizarUnidade(item.unidade)}
                          </td>
                          <td className="py-2.5 px-4 text-gray-500">
                            [ &nbsp; ] Conferido na saída
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-white font-black border-t-2 border-stone-900">
                      <td className="py-2.5 px-4">SUBTOTAL BASE DIÁRIA (ROTA)</td>
                      <td className="py-2.5 px-3 text-center">-</td>
                      <td className="py-2.5 px-4 text-right font-mono text-sm text-stone-950">
                        {totalBaseDiaria} un.
                      </td>
                      <td className="py-2.5 px-4 text-gray-600">Conforme padrão de saída</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* NO FIM DA TABELA: DESDOBRAMENTO DAS QUANTIDADES DIVIDIDAS POR CLIENTE EMPRESARIAL */}
              <div className="pt-4 border-t-2 border-gray-300 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase text-stone-900 flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-stone-700" />
                    2. Desdobramento de Entregas por Cliente Empresarial (B2B)
                  </h3>
                  <span className="text-[11px] font-bold text-gray-500">
                    {clientesB2BComCarga.length} {clientesB2BComCarga.length === 1 ? 'cliente com carga hoje' : 'clientes com carga hoje'}
                  </span>
                </div>

                {clientesB2BComCarga.length === 0 ? (
                  <div className="p-3 rounded-xl bg-white border border-stone-300 text-xs text-gray-500 text-center">
                    Esta rota não tem entregas de clientes empresariais (B2B) agendadas para {diaSemana.toUpperCase()}. Distribuição porta-a-porta e particulares.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {clientesB2BComCarga.map((cli) => (
                      <div key={cli.id} className="border border-stone-300 rounded-xl overflow-hidden bg-white shadow-2xs">
                        <div className="bg-white px-3 py-2 border-b border-stone-300 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="font-black text-xs text-stone-950">{cli.nome}</span>
                            <span className="text-[10px] text-gray-600 block">
                              {cli.morada || 'Arouca'} {cli.telefone ? `• Tel: ${cli.telefone}` : ''} {cli.nif ? `• NIF: ${cli.nif}` : ''}
                            </span>
                          </div>
                          <span className="font-mono font-black text-xs bg-white border border-stone-800 text-stone-900 px-2.5 py-0.5 rounded-full">
                            Total Cliente: {cli.totalCli} un.
                          </span>
                        </div>

                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-white text-stone-900 border-b border-stone-300 font-bold text-[11px]">
                              <th className="py-1.5 px-3 text-left">Artigo / Produto</th>
                              <th className="py-1.5 px-3 text-right w-28">Quantidade</th>
                              <th className="py-1.5 px-3 text-center w-36">Conferência de Entrega</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {cli.itensDoCli.map((item: any, i: number) => (
                              <tr key={i} className="bg-white border-b border-stone-100">
                                <td className="py-1.5 px-3 font-semibold text-gray-900">{item.artigo}</td>
                                <td className="py-1.5 px-3 text-right font-mono font-black text-stone-900">
                                  {item.quantidade} un.
                                </td>
                                <td className="py-1.5 px-3 text-center text-gray-400 text-[11px]">
                                  [ &nbsp; ] Entregue Conforme
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}

                    {/* Subtotal Clientes B2B */}
                    <div className="p-2.5 bg-white border border-stone-400 rounded-xl flex items-center justify-between text-xs font-black text-stone-950">
                      <span>SUBTOTAL CLIENTES B2B</span>
                      <span className="font-mono">{totalB2B} un. ({clientesB2BComCarga.length} paragens)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* NO FIM DA TABELA: DESDOBRAMENTO DE ENCOMENDAS ADICIONAIS DA ROTA */}
              <div className="pt-4 border-t-2 border-gray-300 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase text-stone-900 flex items-center gap-1.5">
                    <ShoppingBag className="h-4 w-4 text-stone-700" />
                    3. Desdobramento de Encomendas Adicionais ao Domicílio
                  </h3>
                  <span className="text-[11px] font-bold text-gray-500">
                    {encomendasComCarga.length} {encomendasComCarga.length === 1 ? 'encomenda afeta' : 'encomendas afetas'}
                  </span>
                </div>

                {encomendasComCarga.length === 0 ? (
                  <div className="p-3 rounded-xl bg-white border border-stone-300 text-xs text-gray-500 text-center">
                    Nenhuma encomenda adicional ao domicílio afeta a esta viatura para a data selecionada.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {encomendasComCarga.map((enc: any, i: number) => (
                      <div key={enc.id || i} className="border border-stone-300 rounded-xl overflow-hidden bg-white shadow-2xs">
                        <div className="bg-white px-3 py-2 border-b border-stone-300 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-mono font-black text-stone-950 bg-white px-2 py-0.5 rounded border border-stone-400">
                              {enc.codigo || `#ENC-${i + 1}`}
                            </span>
                            <span className="font-bold text-gray-900">{enc.cliente?.nome || 'Cliente Particular'}</span>
                            {enc.cliente?.telefone && (
                              <span className="text-gray-500 text-[11px]">Tel: {enc.cliente.telefone}</span>
                            )}
                            {enc.hora_agendamento && (
                              <span className="text-stone-800 text-[11px] font-bold">⏰ {enc.hora_agendamento}</span>
                            )}
                          </div>
                          <span className="font-mono font-black text-xs bg-white border border-stone-800 text-stone-900 px-2.5 py-0.5 rounded-full">
                            Total Encomenda: {enc.totalEnc} un.
                          </span>
                        </div>

                        {(enc.cliente?.morada || enc.notas_cliente || enc.observacoes_producao) && (
                          <div className="px-3 py-1 bg-white border-b border-stone-200 text-[11px] text-stone-800 space-x-2">
                            {enc.cliente?.morada && <span><b>Morada:</b> {enc.cliente.morada}</span>}
                            {enc.notas_cliente && <span>• <b>Obs:</b> {enc.notas_cliente}</span>}
                          </div>
                        )}

                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-white text-stone-900 border-b border-stone-300 font-bold text-[11px]">
                              <th className="py-1.5 px-3 text-left">Artigo / Encomenda</th>
                              <th className="py-1.5 px-3 text-right w-28">Quantidade</th>
                              <th className="py-1.5 px-3 text-center w-36">Conferência de Entrega</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {enc.itensValidos.map((item: any, itIdx: number) => (
                              <tr key={itIdx} className="bg-white border-b border-stone-100">
                                <td className="py-1.5 px-3 font-semibold text-gray-900">{item.produto_nome}</td>
                                <td className="py-1.5 px-3 text-right font-mono font-black text-stone-900">
                                  {item.quantidade} {item.unidade}
                                </td>
                                <td className="py-1.5 px-3 text-center text-gray-400 text-[11px]">
                                  [ &nbsp; ] Entregue Conforme
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}

                    {/* Subtotal Encomendas Adicionais */}
                    <div className="p-2.5 bg-white border border-stone-400 rounded-xl flex items-center justify-between text-xs font-black text-stone-950">
                      <span>SUBTOTAL ENCOMENDAS ADICIONAIS</span>
                      <span className="font-mono">{totalEncomendas} un. ({encomendasComCarga.length} entregas)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* RESUMO GERAL CONSOLIDADO DA GUIA DE CARGA (SEM FUNDO PREENCHIDO) */}
              <div className="p-4 bg-white border-2 border-stone-900 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-stone-900">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase text-stone-600 font-bold block">Resumo Consolidado de Carga</span>
                  <div className="text-stone-800 text-[11px] space-x-3">
                    <span>1. Base Diária: <b>{totalBaseDiaria} un.</b></span>
                    <span>•</span>
                    <span>2. B2B: <b>{totalB2B} un.</b></span>
                    <span>•</span>
                    <span>3. Encomendas: <b>{totalEncomendas} un.</b></span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase text-stone-600 font-bold block">Total Geral a Bordo</span>
                  <span className="text-xl font-black text-stone-950">{totalGeralCarga} un.</span>
                  <span className="text-[10px] text-stone-500 block mt-0.5">Carga total conferida</span>
                </div>
              </div>

              {/* Assinatura do Motorista na Folha de Carga */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 text-xs">
                <div>
                  <span className="font-bold text-gray-600 block mb-1">Responsável pelo Carregamento:</span>
                  <div className="p-2.5 rounded-xl bg-white border border-stone-300">
                    <p className="font-bold text-gray-900">{carrinha?.nome_condutor || 'Condutor Responsável'}</p>
                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">Viatura: {carrinha?.matricula || 'Frota'}</p>
                  </div>
                </div>
                <div>
                  <span className="font-bold text-gray-600 block mb-1">Conferência da Expedição:</span>
                  <div className="p-2.5 rounded-xl bg-white border border-stone-300 text-center text-gray-500 py-3">
                    Visto do Centro de Expedição [ &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; ]
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
              <div className="border-b-2 border-stone-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                  <span className="inline-block px-3 py-1 rounded-lg border-2 border-stone-800 text-stone-900 bg-white font-black text-xs uppercase tracking-wider">
                    Comprovativo de Entrega B2B
                  </span>
                  <p className="text-xs font-bold text-gray-700 mt-1">Guia Nº: B2B-{clienteB2B?.id?.substring(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-gray-500">Data: {dataFormatada} às {horaAtual}</p>
                </div>
              </div>

              {/* Dados do Cliente Empresarial e Transporte */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-stone-300 text-xs space-y-1">
                  <span className="font-black text-stone-900 uppercase text-[10px] block">
                    Entidade / Destinatário
                  </span>
                  <h2 className="text-base font-black text-gray-900">{clienteB2B?.nome}</h2>
                  <p className="text-gray-600"><span className="font-bold">NIF:</span> {clienteB2B?.nif || 'Consumidor Final / Isento'}</p>
                  <p className="text-gray-600"><span className="font-bold">Morada de Entrega:</span> {clienteB2B?.morada || 'Arouca'}</p>
                  <p className="text-gray-600"><span className="font-bold">Telefone:</span> {clienteB2B?.telemovel || clienteB2B?.telefone || 'N/A'}</p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-stone-300 text-xs space-y-1">
                  <span className="font-black text-stone-900 uppercase text-[10px] block">
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
                <table className="w-full text-xs border border-stone-300 border-collapse">
                  <thead>
                    <tr className="bg-white text-stone-900 border-b-2 border-stone-800">
                      <th className="py-2.5 px-3 text-left font-black">Produto / Artigo</th>
                      <th className="py-2.5 px-3 text-right font-black w-28">Quantidade</th>
                      <th className="py-2.5 px-3 text-center font-black w-24">Unidade</th>
                      <th className="py-2.5 px-3 text-center font-black w-28">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {(() => {
                      const semana = (clienteB2B?.quantidades_semanais || clienteB2B?.quantidades_semana || {}) as Record<string, Record<string, number>>;
                      const mapa = semana[diaSemana] || {};
                      const candidatos = new Set<string>();
                      Object.keys(mapa).forEach((a) => candidatos.add(a.trim()));
                      if (clienteB2B?.quantidades_semanais) {
                        Object.values(clienteB2B.quantidades_semanais).forEach((m) => {
                          Object.keys(m || {}).forEach((a) => candidatos.add(a.trim()));
                        });
                      }
                      if (clienteB2B?.produtos_predefinidos) {
                        Object.keys(clienteB2B.produtos_predefinidos).forEach((a) => candidatos.add(a.trim()));
                      }
                      if (dataReferencia && clienteB2B) {
                        obterArtigosAjustadosClienteB2B(dataReferencia, clienteB2B.id).forEach((a) => candidatos.add(a.trim()));
                      }
                      const linhas = Array.from(candidatos).map((artigo) => {
                        let qtd = Number(mapa[artigo] || 0);
                        if (dataReferencia && clienteB2B) {
                          const { quantidade } = obterQuantidadeEfetivaClienteB2B(dataReferencia, clienteB2B.id, artigo, semana, diaSemana);
                          qtd = quantidade;
                        }
                        return [artigo, qtd] as [string, number];
                      }).filter(([_, qtd]) => Number(qtd) > 0);

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
                        <tr key={i} className="bg-white border-b border-stone-200">
                          <td className="py-2 px-3 font-bold text-gray-900">{artigo}</td>
                          <td className="py-2 px-3 text-right font-mono font-black text-stone-900 text-sm">
                            {qtd}
                          </td>
                          <td className="py-2 px-3 text-center text-gray-600">un.</td>
                          <td className="py-2 px-3 text-center">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-800 bg-white px-2 py-0.5 rounded-full border border-stone-400">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Conforme
                            </span>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                  <tfoot>
                    <tr className="bg-white font-black border-t-2 border-stone-800 text-stone-950">
                      <td className="py-2.5 px-3">TOTAL DE ARTIGOS RECEPCIONADOS</td>
                      <td className="py-2.5 px-3 text-right font-mono text-base text-stone-950">
                        {(() => {
                          const semana = (clienteB2B?.quantidades_semanais || clienteB2B?.quantidades_semana || {}) as Record<string, Record<string, number>>;
                          const mapa = semana[diaSemana] || {};
                          const candidatos = new Set<string>();
                          Object.keys(mapa).forEach((a) => candidatos.add(a.trim()));
                          if (clienteB2B?.quantidades_semanais) {
                            Object.values(clienteB2B.quantidades_semanais).forEach((m) => {
                              Object.keys(m || {}).forEach((a) => candidatos.add(a.trim()));
                            });
                          }
                          if (clienteB2B?.produtos_predefinidos) {
                            Object.keys(clienteB2B.produtos_predefinidos).forEach((a) => candidatos.add(a.trim()));
                          }
                          if (dataReferencia && clienteB2B) {
                            obterArtigosAjustadosClienteB2B(dataReferencia, clienteB2B.id).forEach((a) => candidatos.add(a.trim()));
                          }
                          return Array.from(candidatos).reduce((acc, artigo) => {
                            let qtd = Number(mapa[artigo] || 0);
                            if (dataReferencia && clienteB2B) {
                              const { quantidade } = obterQuantidadeEfetivaClienteB2B(dataReferencia, clienteB2B.id, artigo, semana, diaSemana);
                              qtd = quantidade;
                            }
                            return acc + qtd;
                          }, 0);
                        })()} un.
                      </td>
                      <td className="py-2.5 px-3 text-center">un.</td>
                      <td className="py-2.5 px-3 text-center text-stone-800 font-bold">100% Entregue</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Área de Validação e Assinatura Digital */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t-2 border-stone-300 text-xs">
                <div>
                  <span className="font-bold text-gray-600 block mb-1">Entregue por (Padaria da Vila):</span>
                  <p className="text-gray-800 font-bold">{nomeCondutor || carrinha?.nome_condutor || 'Motorista de Serviço'}</p>
                  <p className="text-[11px] text-gray-500 font-mono mt-0.5">Viatura: {carrinha?.rota} ({matriculaCarro || 'Matrícula Oficial'})</p>
                </div>

                <div className="border border-stone-300 rounded-2xl p-4 bg-white text-center space-y-2">
                  <span className="font-bold text-gray-700 block text-left">Recebido por (Cliente Institucional):</span>
                  
                  {assinaturaDataUrl ? (
                    <div className="space-y-1">
                      <img
                        src={assinaturaDataUrl}
                        alt="Assinatura Digital do Cliente"
                        className="max-h-20 mx-auto object-contain border-b border-gray-300 pb-1"
                      />
                      <p className="font-bold text-stone-950 text-xs">{nomeRecebedor || 'Responsável pela Receção'}</p>
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

          {/* ============================================================== */}
          {/* CASO 3.1: FOLHA DE FABRICO DE ENCOMENDAS POR LOJA             */}
          {/* ============================================================== */}
          {tipo === 'folha_fabrico' && modoFabricoModal === 'encomendas' && (
            <div className="space-y-6">
              {/* Cabeçalho Oficial de Fabrico de Encomendas por Loja */}
              <div className="border-b-2 border-stone-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-stone-900 uppercase">
                    Padaria da Vila
                  </h1>
                  <p className="text-xs text-stone-600">
                    Fabrico Próprio de Pão Tradicional e Pastelaria Fina • Arouca
                  </p>
                  <p className="text-[11px] font-mono text-stone-500 mt-0.5">
                    Centro de Produção & Unidade Fabril Central • Folha de Fabrico de Encomendas por Loja
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="inline-block px-3 py-1 rounded-lg border-2 border-stone-850 text-stone-900 bg-white font-black text-xs uppercase tracking-wider">
                    Encomendas por Loja
                  </span>
                  <p className="text-xs font-bold text-stone-900 mt-1">Data: {dataFormatada}</p>
                  <p className="text-xs text-stone-600">
                    {lojaModalFiltro === 'todas' ? 'Todas as Lojas' : (lojasComEncomendas[0]?.loja?.nome || lojaNome)}
                    {setorModalFiltro !== 'todos' ? ` • Setor: ${setorModalFiltro.toUpperCase()}` : ''}
                  </p>
                </div>
              </div>

              {/* Cartões Resumo Totais de Encomendas (Sem Fundo Preenchido) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-white border border-stone-300">
                  <span className="text-[10px] font-bold text-stone-600 uppercase block">Total Encomendas</span>
                  <span className="text-2xl font-black text-stone-950 font-mono">{totalGeralEncsCount}</span>
                  <span className="text-[10px] text-stone-500 block mt-0.5">{lojasComEncomendas.length} loja(s) ativa(s)</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-stone-300">
                  <span className="text-[10px] font-bold text-stone-600 uppercase block">Total a Produzir</span>
                  <span className="text-2xl font-black text-stone-950 font-mono">{totalGeralFabricoEncs} un.</span>
                  <span className="text-[10px] text-stone-500 block mt-0.5">artigos encomendados</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-stone-300">
                  <span className="text-[10px] font-bold text-stone-600 uppercase block">🥖 Padaria</span>
                  <span className="text-2xl font-black text-stone-950 font-mono">
                    {lojasComEncomendas.reduce((acc, g) => acc + g.totalLojaPadaria, 0)} un.
                  </span>
                  <span className="text-[10px] text-stone-500 block mt-0.5">pães e broas</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-stone-300">
                  <span className="text-[10px] font-bold text-stone-600 uppercase block">🧁 Pastelaria</span>
                  <span className="text-2xl font-black text-stone-950 font-mono">
                    {lojasComEncomendas.reduce((acc, g) => acc + g.totalLojaPastelaria, 0)} un.
                  </span>
                  <span className="text-[10px] text-stone-500 block mt-0.5">pastelaria e doçaria</span>
                </div>
              </div>

              {/* Se não houver encomendas com os filtros */}
              {lojasComEncomendas.length === 0 ? (
                <div className="p-10 text-center border-2 border-dashed border-stone-300 rounded-2xl text-stone-500 bg-white">
                  <ShoppingBag className="h-10 w-10 text-stone-400 mx-auto mb-2" />
                  <p className="font-bold text-sm">Nenhuma encomenda encontrada para produção com os filtros selecionados.</p>
                  <p className="text-xs text-stone-400 mt-1">Verifique a data ou altere o filtro de setor/loja.</p>
                </div>
              ) : (
                /* Agrupamento por Loja com quebra de página limpa */
                <div className="space-y-8">
                  {lojasComEncomendas.map((grupoLoja, idxLoja) => (
                    <div
                      key={grupoLoja.loja.id}
                      className={`space-y-4 ${idxLoja > 0 ? 'print:break-before-page pt-6 border-t-2 border-dashed border-stone-300 print:pt-0 print:border-none' : ''}`}
                    >
                      {/* Banner da Loja (Sem Fundo Preenchido) */}
                      <div className="bg-white text-stone-900 border-2 border-stone-850 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-none">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-white border border-stone-400 text-stone-900 rounded-xl font-black">
                            <Store className="h-5 w-5" />
                          </div>
                          <div>
                            <h2 className="text-base font-black uppercase tracking-tight text-stone-900 flex items-center gap-2">
                              <span>{grupoLoja.loja.nome}</span>
                              <span className="text-xs font-mono font-normal text-stone-500">({grupoLoja.encomendas.length} encomendas)</span>
                            </h2>
                            <p className="text-xs text-stone-600">
                              {grupoLoja.loja.morada || 'Balcão de Atendimento'} {grupoLoja.loja.telefone ? `• Tel: ${grupoLoja.loja.telefone}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs text-stone-500 uppercase font-bold block">Total a Produzir na Loja</span>
                          <span className="text-xl font-black font-mono text-stone-950">
                            {grupoLoja.totalLojaUnidades} un.
                          </span>
                          <div className="text-[11px] text-stone-600 space-x-2 mt-0.5">
                            <span>🥖 {grupoLoja.totalLojaPadaria} un.</span>
                            <span>•</span>
                            <span>🧁 {grupoLoja.totalLojaPastelaria} un.</span>
                          </div>
                        </div>
                      </div>

                      {/* Listagem Encomenda por Encomenda */}
                      <div className="space-y-3">
                        {grupoLoja.encomendas.map((enc: any, idxEnc: number) => (
                          <div
                            key={enc.id || idxEnc}
                            className="border border-stone-300 rounded-2xl overflow-hidden bg-white shadow-none print:shadow-none print:break-inside-avoid"
                          >
                            {/* Cabeçalho da Encomenda */}
                            <div className="bg-white p-2.5 px-3.5 border-b border-stone-300 flex flex-wrap items-center justify-between gap-2 text-xs">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono font-black text-stone-950 bg-white px-2.5 py-0.5 rounded-lg border border-stone-400">
                                  {enc.codigo || `#${idxEnc + 1}`}
                                </span>

                                <span className="flex items-center gap-1 font-bold text-stone-700 bg-white px-2 py-0.5 rounded-lg border border-stone-300">
                                  <Clock className="h-3 w-3 text-stone-700" />
                                  <span>{enc.hora_agendamento || '10:00'}</span>
                                </span>

                                <span className="px-2 py-0.5 rounded-lg font-bold text-[11px] border border-stone-400 bg-white text-stone-900">
                                  {enc.tipo === 'entrega_domicilio' ? '🚚 Domicílio' : '🏪 Balcão'}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-stone-700">
                                <span className="flex items-center gap-1 font-bold text-stone-900">
                                  <User className="h-3.5 w-3.5 text-stone-500" />
                                  <span>{enc.cliente?.nome || 'Cliente'}</span>
                                </span>
                                {enc.cliente?.telefone && (
                                  <span className="flex items-center gap-1 text-[11px] text-stone-600 font-mono">
                                    <Phone className="h-3 w-3 text-stone-400" />
                                    <span>{enc.cliente.telefone}</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Observações da Encomenda se existirem */}
                            {(enc.notas_cliente || enc.observacoes_producao || (enc.tipo === 'entrega_domicilio' && enc.cliente?.morada)) && (
                              <div className="px-3.5 py-1.5 bg-white border-b border-stone-300 text-xs text-stone-900 flex flex-wrap items-center gap-3">
                                {enc.notas_cliente && (
                                  <div>
                                    <span className="font-bold">Nota do Cliente:</span> {enc.notas_cliente}
                                  </div>
                                )}
                                {enc.observacoes_producao && (
                                  <div>
                                    <span className="font-bold text-stone-900">⚠️ Obs Produção:</span> {enc.observacoes_producao}
                                  </div>
                                )}
                                {enc.tipo === 'entrega_domicilio' && enc.cliente?.morada && (
                                  <div className="text-[11px] text-stone-900">
                                    <span className="font-bold">Morada Entrega:</span> {enc.cliente.morada}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Tabela de Artigos desta Encomenda */}
                            <table className="w-full text-xs border-collapse">
                              <thead>
                                <tr className="bg-white text-stone-800 border-b-2 border-stone-800 text-[11px] font-bold">
                                  <th className="py-1.5 px-3.5 text-left">Artigo / Produto a Produzir</th>
                                  <th className="py-1.5 px-2 text-center w-24">Setor</th>
                                  <th className="py-1.5 px-3 text-right w-24">Quantidade</th>
                                  <th className="py-1.5 px-3 text-left">Personalização / Especificações</th>
                                  <th className="py-1.5 px-3 text-center w-36">Fabrico [  ]</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-stone-200">
                                {enc.itensFiltrados.map((it: any, itIdx: number) => (
                                  <tr key={it.id || itIdx} className="bg-white border-b border-stone-100">
                                    <td className="py-2 px-3.5 font-black text-stone-900">
                                      {it.produto_nome}
                                    </td>
                                    <td className="py-2 px-2 text-center">
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-stone-300 bg-white text-stone-800">
                                        {it.setor === 'pastelaria' ? 'Pastelaria' : 'Padaria'}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono font-black text-stone-950 text-sm">
                                      {it.quantidade} {normalizarUnidade(it.unidade)}
                                    </td>
                                    <td className="py-2 px-3 text-stone-700 text-[11px]">
                                      {it.notas_personalizacao ? (
                                        <span className="font-bold text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-300 block">
                                          {it.notas_personalizacao}
                                        </span>
                                      ) : (
                                        <span className="text-stone-400">Padrão da receita</span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 text-center text-stone-500 font-medium whitespace-nowrap">
                                      [ &nbsp; ] Pronto / Embalado
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="bg-white border-t border-stone-300 text-stone-800 text-[11px] font-bold">
                                  <td colSpan={2} className="py-1.5 px-3.5 text-stone-500">
                                    {enc.itensFiltrados.length} artigo(s) nesta encomenda
                                  </td>
                                  <td className="py-1.5 px-3 text-right font-mono font-black text-stone-900">
                                    {enc.totalEnc} un.
                                  </td>
                                  <td colSpan={2} className="py-1.5 px-3 text-stone-500 text-right">
                                    Conferência de embalamento [ &nbsp; ]
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        ))}
                      </div>

                      {/* Subtotal da Loja */}
                      <div className="bg-white border-2 border-stone-850 p-2.5 px-4 rounded-xl flex flex-wrap items-center justify-between text-xs font-black text-stone-900 gap-2">
                        <span>SUBTOTAL {grupoLoja.loja.nome.toUpperCase()}</span>
                        <div className="flex items-center gap-3 font-mono">
                          <span>{grupoLoja.encomendas.length} Encomendas</span>
                          <span className="text-stone-800">🥖 Padaria: {grupoLoja.totalLojaPadaria} un.</span>
                          <span className="text-stone-800">🧁 Pastelaria: {grupoLoja.totalLojaPastelaria} un.</span>
                          <span className="text-sm bg-white border-2 border-stone-850 text-stone-950 px-2.5 py-1 rounded-lg">
                            Total: {grupoLoja.totalLojaUnidades} un.
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Resumo Geral de Todas as Lojas (quando há mais de uma) */}
                  {lojasComEncomendas.length > 1 && (
                    <div className="p-4 bg-white border-2 border-stone-850 text-stone-900 rounded-2xl flex flex-wrap items-center justify-between gap-3 font-mono">
                      <div>
                        <span className="text-xs uppercase text-stone-500 font-bold block">Resumo Global de Expedição</span>
                        <span className="text-lg font-black">{totalGeralEncsCount} Encomendas em {lojasComEncomendas.length} Lojas</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs uppercase text-stone-500 font-bold block">Total Global a Produzir</span>
                        <span className="text-2xl font-black text-stone-950">{totalGeralFabricoEncs} un.</span>
                      </div>
                    </div>
                  )}

                  {/* Área de Validação e Assinatura do Chefe de Produção */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t-2 border-stone-300 text-xs">
                    <div>
                      <span className="font-bold text-stone-600 block mb-1">Chefe de Turno de Fabrico:</span>
                      <div className="p-3 rounded-xl bg-white border border-stone-300">
                        <p className="font-bold text-stone-900">Mestre Padeiro / Responsável da Pastelaria</p>
                        <p className="text-[11px] text-stone-500 mt-1">Conformidade e Embalamento HACCP</p>
                      </div>
                    </div>

                    <div className="border border-stone-300 rounded-xl p-3 bg-white text-center space-y-1">
                      <span className="font-bold text-stone-700 block text-left">Conferência de Expedição para Lojas:</span>
                      <div className="py-3 border-b border-dashed border-stone-400 text-stone-400 text-xs">
                        Assinatura / Visto do Centro de Expedição
                      </div>
                      <p className="text-[10px] text-stone-500 font-mono pt-1">Hora de Saída: _____ : _____</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* CASO 3.2: FOLHA DE FABRICO CONSOLIDADA (PADARIA & PASTELARIA)  */}
          {/* ============================================================== */}
          {tipo === 'folha_fabrico' && modoFabricoModal === 'consolidado' && (
            <div className="space-y-6">
              {/* Cabeçalho Oficial de Fabrico */}
              <div className="border-b-2 border-stone-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-stone-900 uppercase">
                    Padaria da Vila
                  </h1>
                  <p className="text-xs text-stone-600">
                    Fabrico Próprio de Pão Tradicional e Pastelaria Fina • Arouca
                  </p>
                  <p className="text-[11px] font-mono text-stone-500 mt-0.5">
                    Centro de Produção & Unidade Fabril Central • Fabrico Diário
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="inline-block px-3 py-1 rounded-lg border-2 border-stone-850 text-stone-900 bg-white font-black text-xs uppercase tracking-wider">
                    Folha Diária de Fabrico
                  </span>
                  <p className="text-xs font-bold text-stone-900 mt-1">Data: {dataFormatada}</p>
                  <p className="text-xs text-stone-600">Loja / Destino: {lojaNome}</p>
                </div>
              </div>

              {/* Cartões Resumo Totais de Fabrico (Sem Fundo Preenchido) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-white border border-stone-300">
                  <span className="text-[10px] font-bold text-stone-600 uppercase block">Total a Produzir</span>
                  <span className="text-2xl font-black text-stone-950 font-mono">{totalFabricoUnidades} un.</span>
                  <span className="text-[10px] text-stone-500 block mt-0.5">unidades globais</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-stone-300">
                  <span className="text-[10px] font-bold text-stone-600 uppercase block">Setor Padaria</span>
                  <span className="text-2xl font-black text-stone-950 font-mono">{totalFabricoPadaria} un.</span>
                  <span className="text-[10px] text-stone-500 block mt-0.5">pães e broas</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-stone-300">
                  <span className="text-[10px] font-bold text-stone-600 uppercase block">Setor Pastelaria</span>
                  <span className="text-2xl font-black text-stone-950 font-mono">{totalFabricoPastelaria} un.</span>
                  <span className="text-[10px] text-stone-500 block mt-0.5">pastelaria e doçaria</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-stone-300">
                  <span className="text-[10px] font-bold text-stone-600 uppercase block">Linhas de Fabrico</span>
                  <span className="text-2xl font-black text-stone-900 font-mono">{itensFabrico.length}</span>
                  <span className="text-[10px] text-stone-500 block mt-0.5">artigos distintos</span>
                </div>
              </div>

              {/* Tabela de Padaria */}
              {itensPadaria.length > 0 && (
                <div>
                  <h3 className="text-xs font-black uppercase text-stone-900 mb-2 flex items-center justify-between border-b-2 border-stone-800 pb-1.5">
                    <span className="flex items-center gap-1.5">
                      <span>🥖</span> Setor de Padaria & Pão Tradicional
                    </span>
                    <span className="font-mono font-bold text-stone-900">Subtotal: {totalFabricoPadaria} un.</span>
                  </h3>
                  <table className="w-full text-xs border border-stone-300 border-collapse mb-4">
                    <thead>
                      <tr className="bg-white text-stone-900 border-b-2 border-stone-800 font-black">
                        <th className="py-2 px-3 text-left">Artigo / Pão</th>
                        <th className="py-2 px-3 text-right w-28">Quantidade</th>
                        <th className="py-2 px-3 text-center w-28">Encomendas</th>
                        <th className="py-2 px-3 text-left">Personalizações / Códigos</th>
                        <th className="py-2 px-3 text-center w-32">Fornada [  ]</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {itensPadaria.map((it, idx) => (
                        <tr key={idx} className="bg-white border-b border-stone-100">
                          <td className="py-2 px-3 font-bold text-stone-950">{it.produto_nome}</td>
                          <td className="py-2 px-3 text-right font-mono font-black text-stone-950 text-sm">
                            {it.quantidade_total} {normalizarUnidade(it.unidade)}
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-stone-700">
                            {it.encomendas_count ? `${it.encomendas_count} enc.` : '-'}
                          </td>
                          <td className="py-2 px-3 text-stone-600 text-[11px]">
                            {it.qtd_bases_diarias || it.qtd_clientes_b2b ? (
                              <div className="space-y-0.5">
                                <div className="text-[10px] font-mono font-bold text-stone-800">
                                  Base: {it.qtd_bases_diarias || 0} • B2B: {it.qtd_clientes_b2b || 0} • Enc: {it.qtd_encomendas || 0}
                                </div>
                                {it.personalizacoes && it.personalizacoes.length > 0 && (
                                  <div className="text-stone-800 font-medium">{it.personalizacoes.join(' • ')}</div>
                                )}
                              </div>
                            ) : it.personalizacoes && it.personalizacoes.length > 0 ? (
                              it.personalizacoes.join(' • ')
                            ) : it.encomendas_codigos && it.encomendas_codigos.length > 0 ? (
                              it.encomendas_codigos.slice(0, 4).join(', ') + (it.encomendas_codigos.length > 4 ? '...' : '')
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="py-2 px-3 text-center text-stone-400 font-medium">
                            [ &nbsp; ] Cozido
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-white font-black border-t-2 border-stone-800 text-stone-950">
                        <td className="py-2 px-3">SUBTOTAL PADARIA</td>
                        <td className="py-2 px-3 text-right font-mono text-stone-950">{totalFabricoPadaria} un.</td>
                        <td colSpan={3} className="py-2 px-3"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Tabela de Pastelaria */}
              {itensPastelaria.length > 0 && (
                <div>
                  <h3 className="text-xs font-black uppercase text-stone-900 mb-2 flex items-center justify-between border-b-2 border-stone-800 pb-1.5">
                    <span className="flex items-center gap-1.5">
                      <span>🧁</span> Setor de Pastelaria Fina & Confeitaria
                    </span>
                    <span className="font-mono font-bold text-stone-900">Subtotal: {totalFabricoPastelaria} un.</span>
                  </h3>
                  <table className="w-full text-xs border border-stone-300 border-collapse mb-4">
                    <thead>
                      <tr className="bg-white text-stone-900 border-b-2 border-stone-800 font-black">
                        <th className="py-2 px-3 text-left">Artigo / Doce</th>
                        <th className="py-2 px-3 text-right w-28">Quantidade</th>
                        <th className="py-2 px-3 text-center w-28">Encomendas</th>
                        <th className="py-2 px-3 text-left">Personalizações / Códigos</th>
                        <th className="py-2 px-3 text-center w-32">Confeção [  ]</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {itensPastelaria.map((it, idx) => (
                        <tr key={idx} className="bg-white border-b border-stone-100">
                          <td className="py-2 px-3 font-bold text-stone-950">{it.produto_nome}</td>
                          <td className="py-2 px-3 text-right font-mono font-black text-stone-950 text-sm">
                            {it.quantidade_total} {normalizarUnidade(it.unidade)}
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-stone-700">
                            {it.encomendas_count ? `${it.encomendas_count} enc.` : '-'}
                          </td>
                          <td className="py-2 px-3 text-stone-600 text-[11px]">
                            {it.qtd_bases_diarias || it.qtd_clientes_b2b ? (
                              <div className="space-y-0.5">
                                <div className="text-[10px] font-mono font-bold text-stone-800">
                                  Base: {it.qtd_bases_diarias || 0} • B2B: {it.qtd_clientes_b2b || 0} • Enc: {it.qtd_encomendas || 0}
                                </div>
                                {it.personalizacoes && it.personalizacoes.length > 0 && (
                                  <div className="text-stone-800 font-medium">{it.personalizacoes.join(' • ')}</div>
                                )}
                              </div>
                            ) : it.personalizacoes && it.personalizacoes.length > 0 ? (
                              it.personalizacoes.join(' • ')
                            ) : it.encomendas_codigos && it.encomendas_codigos.length > 0 ? (
                              it.encomendas_codigos.slice(0, 4).join(', ') + (it.encomendas_codigos.length > 4 ? '...' : '')
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="py-2 px-3 text-center text-stone-400 font-medium">
                            [ &nbsp; ] Pronto
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-white font-black border-t-2 border-stone-800 text-stone-950">
                        <td className="py-2 px-3">SUBTOTAL PASTELARIA</td>
                        <td className="py-2 px-3 text-right font-mono text-stone-950">{totalFabricoPastelaria} un.</td>
                        <td colSpan={3} className="py-2 px-3"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Área de Validação e Assinatura do Chefe de Produção */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t-2 border-stone-300 text-xs">
                <div>
                  <span className="font-bold text-stone-600 block mb-1">Chefe de Turno de Fabrico:</span>
                  <div className="p-3 rounded-xl bg-white border border-stone-300">
                    <p className="font-bold text-stone-900">Mestre Padeiro / Responsável da Produção</p>
                    <p className="text-[11px] text-stone-500 mt-1">Conforme Normas HACCP</p>
                  </div>
                </div>

                <div className="border border-stone-300 rounded-xl p-3 bg-white text-center space-y-1">
                  <span className="font-bold text-stone-700 block text-left">Validação de Saída das Fornadas:</span>
                  <div className="py-3 border-b border-dashed border-stone-400 text-stone-400 text-xs">
                    Assinatura / Visto do Chefe de Produção
                  </div>
                  <p className="text-[10px] text-stone-500 font-mono pt-1">Hora de Conclusão: _____ : _____</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
