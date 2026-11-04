/**
 * Construtor Nativo de PDFs de Continuidade de Negócio (BCP)
 * Gera ficheiros binários PDF 1.4 em memória para envio como anexos no Resend.
 * Réplica exata do layout e conteúdo oficial da aplicação (sem caixas e sem fundos preenchidos a tinta).
 * Economia de Tinteiro: Layout Wireframe sem fundos preenchidos (100% fundo branco e linhas de contorno finas).
 */

import type {
  Loja,
  Carrinha,
  Produto,
  Encomenda,
  ClienteEmpresarialB2B,
  BaseDiariaRecorrente,
  BaseFixaCarrinha,
  DiaSemana,
  LinhaArtigoFabrico,
} from '../types';
import {
  calcularDadosGuiaCargaConjunta,
  calcularPoolFabricoConsolidada,
  obterQuantidadeEfetivaBaseRota,
  obterQuantidadeEfetivaClienteB2B,
  obterArtigosAjustadosBaseRota,
  obterArtigosAjustadosClienteB2B,
  clienteEmModoFerias,
} from './encomendasService';
import {
  LOJAS_MOCK,
  CARRINHAS_MOCK,
  PRODUTOS_MOCK,
  BASE_FIXA_CARRINHAS_INICIAL,
  CLIENTES_EMPRESARIAIS_B2B_INICIAIS,
  ENCOMENDAS_MOCK,
} from './mockData';

export function wrapText(text: string, maxCharsPerLine: number): string[] {
  if (!text) return [''];
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const rawWord of words) {
    let word = rawWord;
    while (word.length > maxCharsPerLine) {
      const part = word.slice(0, maxCharsPerLine);
      word = word.slice(maxCharsPerLine);
      if (currentLine) {
        lines.push(currentLine);
        currentLine = '';
      }
      lines.push(part);
    }

    if (!word) continue;

    if (!currentLine) {
      currentLine = word;
    } else if (currentLine.length + 1 + word.length <= maxCharsPerLine) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines.length > 0 ? lines : [''];
}

export class PdfPageWriter {
  content: string = '';
  y: number = 780;

  drawText(text: string, x: number, y: number, size: number = 8, isBold: boolean = false, color: string = '0 0 0') {
    const font = isBold ? '/F2' : '/F1';
    let clean = text
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');

    const winAnsiMap: Record<string, string> = {
      'á': '\\341', 'à': '\\340', 'ã': '\\343', 'â': '\\342', 'ä': '\\344',
      'é': '\\351', 'è': '\\350', 'ê': '\\352', 'ë': '\\353',
      'í': '\\355', 'ì': '\\354', 'î': '\\356', 'ï': '\\357',
      'ó': '\\363', 'ò': '\\362', 'õ': '\\365', 'ô': '\\364', 'ö': '\\366',
      'ú': '\\372', 'ù': '\\371', 'û': '\\373', 'ü': '\\374',
      'ç': '\\347', 'ñ': '\\361',
      'Á': '\\301', 'À': '\\300', 'Ã': '\\303', 'Â': '\\302', 'Ä': '\\304',
      'É': '\\311', 'È': '\\310', 'Ê': '\\312', 'Ë': '\\313',
      'Í': '\\315', 'Ì': '\\314', 'Î': '\\316', 'Ï': '\\317',
      'Ó': '\\323', 'Ò': '\\322', 'Õ': '\\325', 'Ô': '\\324', 'Ö': '\\326',
      'Ú': '\\332', 'Ù': '\\331', 'Û': '\\332', 'Ü': '\\334',
      'Ç': '\\307', 'Ñ': '\\321',
      'º': '\\272', 'ª': '\\252',
      '•': '\\225', '–': '\\226', '—': '\\227', '€': '\\200',
      '✓': 'V', '✕': 'X',
      '⏰': '', '🥖': '', '🧁': '', '🚚': '', '🏪': '', '🏬': '', '⚠️': 'Obs:'
    };

    clean = clean.replace(/[\u0080-\uffff]/g, (c) => winAnsiMap[c] || '');

    this.content += `q ${color} rg BT ${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${clean}) Tj ET Q\n`;
  }

  drawRotatedText(text: string, x: number, y: number, size: number = 6.5, isBold: boolean = false, color: string = '0 0 0') {
    const font = isBold ? '/F2' : '/F1';
    let clean = text
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');

    const winAnsiMap: Record<string, string> = {
      'á': '\\341', 'à': '\\340', 'ã': '\\343', 'â': '\\342', 'ä': '\\344',
      'é': '\\351', 'è': '\\350', 'ê': '\\352', 'ë': '\\353',
      'í': '\\355', 'ì': '\\354', 'î': '\\356', 'ï': '\\357',
      'ó': '\\363', 'ò': '\\362', 'õ': '\\365', 'ô': '\\364', 'ö': '\\366',
      'ú': '\\372', 'ù': '\\371', 'û': '\\373', 'ü': '\\374',
      'ç': '\\347', 'ñ': '\\361',
      'Á': '\\301', 'À': '\\300', 'Ã': '\\303', 'Â': '\\302', 'Ä': '\\304',
      'É': '\\311', 'È': '\\310', 'Ê': '\\312', 'Ë': '\\313',
      'Í': '\\315', 'Ì': '\\314', 'Î': '\\316', 'Ï': '\\317',
      'Ó': '\\323', 'Ò': '\\322', 'Õ': '\\325', 'Ô': '\\324', 'Ö': '\\326',
      'Ú': '\\332', 'Ù': '\\331', 'Û': '\\332', 'Ü': '\\334',
      'Ç': '\\307', 'Ñ': '\\321',
      'º': '\\272', 'ª': '\\252',
      '•': '\\225', '–': '\\226', '—': '\\227', '€': '\\200',
      '✓': 'V', '✕': 'X',
      '⏰': '', '🥖': '', '🧁': '', '🚚': '', '🏪': '', '🏬': '', '⚠️': 'Obs:'
    };

    clean = clean.replace(/[\u0080-\uffff]/g, (c) => winAnsiMap[c] || '');

    // Rotação de 90 graus (de baixo para cima): [0 1 -1 0 x y]
    this.content += `q ${color} rg BT ${font} ${size} Tf 0 1 -1 0 ${x} ${y} Tm (${clean}) Tj ET Q\n`;
  }

  drawRect(x: number, y: number, w: number, h: number, fillColor: string | null = null, strokeColor: string | null = null) {
    let cmd = 'q\n';
    if (fillColor) cmd += `${fillColor} rg\n`;
    if (strokeColor) cmd += `${strokeColor} RG 0.5 w\n`;
    cmd += `${x} ${y} ${w} ${h} re\n`;
    if (fillColor && strokeColor) cmd += 'B\n';
    else if (fillColor) cmd += 'f\n';
    else if (strokeColor) cmd += 'S\n';
    cmd += 'Q\n';
    this.content += cmd;
  }

  drawLine(x1: number, y1: number, x2: number, y2: number, strokeColor: string = '0.8 0.8 0.8', width: number = 0.5) {
    this.content += `q ${strokeColor} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S Q\n`;
  }
}

export class NativePdfDocument {
  title: string;
  orientation: 'portrait' | 'landscape';
  pages: PdfPageWriter[] = [];
  currentPage: PdfPageWriter;

  constructor(title: string, orientation: 'portrait' | 'landscape' = 'portrait') {
    this.title = title;
    this.orientation = orientation;
    this.currentPage = new PdfPageWriter();
    this.pages.push(this.currentPage);
  }

  addPage(): PdfPageWriter {
    this.currentPage = new PdfPageWriter();
    this.pages.push(this.currentPage);
    return this.currentPage;
  }

  toBuffer(): Buffer {
    const objects: string[] = [];
    function addObj(str: string): number {
      objects.push(str);
      return objects.length;
    }

    const f1Obj = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const f2Obj = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

    const contentObjIds: number[] = [];
    const pageObjIds: number[] = [];

    for (let i = 0; i < this.pages.length; i++) {
      contentObjIds.push(0);
      pageObjIds.push(0);
    }

    const pagesObjId = objects.length + 1;
    const isLandscape = this.orientation === 'landscape';
    const mediaBoxStr = isLandscape ? '[0 0 842 595]' : '[0 0 595 842]';
    const footerX = isLandscape ? 280 : 160;

    for (let i = 0; i < this.pages.length; i++) {
      const p = this.pages[i];
      const footer = `Folha de Continuidade - Padaria da Vila | Página ${i + 1} de ${this.pages.length} | Inprooval Sistemas`;
      p.drawText(footer, footerX, 15, 7, false, '0.4 0.4 0.4');

      const streamLen = Buffer.byteLength(p.content, 'utf-8');
      const cId = addObj(`<< /Length ${streamLen} >>\nstream\n${p.content}\nendstream`);
      contentObjIds[i] = cId;
    }

    for (let i = 0; i < this.pages.length; i++) {
      const pId = addObj(`<< /Type /Page /Parent ${pagesObjId} 0 R /MediaBox ${mediaBoxStr} /Contents ${contentObjIds[i]} 0 R /Resources << /Font << /F1 ${f1Obj} 0 R /F2 ${f2Obj} 0 R >> >> >>`);
      pageObjIds[i] = pId;
    }

    const kidsStr = pageObjIds.map((id) => `${id} 0 R`).join(' ');
    const finalPagesObj = addObj(`<< /Type /Pages /Kids [${kidsStr}] /Count ${this.pages.length} >>`);
    const catalogObj = addObj(`<< /Type /Catalog /Pages ${finalPagesObj} 0 R >>`);

    let pdf = '%PDF-1.4\n';
    const xref: number[] = [0];
    let offset = Buffer.byteLength(pdf, 'utf-8');

    for (let i = 0; i < objects.length; i++) {
      xref.push(offset);
      const str = `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
      pdf += str;
      offset += Buffer.byteLength(str, 'utf-8');
    }

    const startXref = offset;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= objects.length; i++) {
      pdf += `${String(xref[i]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogObj} 0 R >>\nstartxref\n${startXref}\n%%EOF`;

    return Buffer.from(pdf, 'utf-8');
  }
}

// Parâmetros para geração da Folha de Fabrico
export interface ParametrosFolhaFabricoPdf {
  dataOperacao: string; // YYYY-MM-DD
  dataFormatada: string; // DD/MM/YYYY
  lojas?: Loja[];
  encomendas?: Encomenda[];
  carrinhas?: Carrinha[];
  baseFixaCarrinhas?: BaseFixaCarrinha[];
  clientesB2B?: ClienteEmpresarialB2B[];
  basesRecorrentes?: BaseDiariaRecorrente[];
  produtos?: Produto[];
  ajustesAdhoc?: Record<string, number>;
}

// Parâmetros para geração da Folha de Carga
export interface ParametrosFolhaCargaPdf {
  dataOperacao: string; // YYYY-MM-DD
  dataFormatada: string; // DD/MM/YYYY
  diaSemana: DiaSemana;
  carrinhas: Carrinha[];
  baseFixaCarrinhas: BaseFixaCarrinha[];
  clientesB2B: ClienteEmpresarialB2B[];
  basesRecorrentes: BaseDiariaRecorrente[];
  encomendas: Encomenda[];
  produtos: Produto[];
  ajustesAdhoc?: Record<string, number>;
}

/**
 * Constrói o PDF Oficial: Folha de Fabrico de Encomendas por Loja (e Domicílios)
 * Layout Wireframe profissional (100% fundo branco, contornos finos, economia de tinteiro).
 * Réplica exata do layout oficial gerado ao imprimir na aplicação ("Folha de Fabrico de Encomendas por Loja").
 * Inclui APENAS as encomendas reais do dia (excluindo quantidades de bases diárias e clientes B2B):
 * - Cabeçalho Oficial: PADARIA DA VILA • Folha de Fabrico de Encomendas por Loja • Data • Todas as Lojas
 * - 4 Caixas de Resumo: Total Encomendas, Total a Produzir, Padaria, Pastelaria
 * - Agrupamento por Loja (e Entregas ao Domicílio) com Banner da Loja e totais
 * - Cada encomenda em card dedicado: Código, Hora, Tipo (Domicílio/Balcão), Cliente, Telefone, Morada
 * - Tabela de itens da encomenda: Artigo, Setor, Quantidade, Personalizações, Checkbox Fabrico [ ]
 * - Rodapé da encomenda com contagem de itens e conferência de embalamento [ ]
 * - Subtotal da Loja com métricas de Padaria, Pastelaria e Total
 * - Bloco Oficial de Validação e Assinaturas (Chefe de Turno de Fabrico + Conferência de Expedição)
 */
export function gerarPdfFolhaFabricoLojas(params: ParametrosFolhaFabricoPdf | string): Buffer {
  let dataOperacao = '';
  let dataFormatada = '';
  let lojas: Loja[] = [];
  let encomendas: Encomenda[] = [];
  let produtos: Produto[] = [];

  if (typeof params === 'string') {
    dataOperacao = new Date().toISOString().split('T')[0];
    dataFormatada = params;
    lojas = LOJAS_MOCK;
    encomendas = ENCOMENDAS_MOCK;
    produtos = PRODUTOS_MOCK;
  } else {
    dataOperacao = params.dataOperacao;
    dataFormatada = params.dataFormatada;
    lojas = params.lojas && params.lojas.length > 0 ? params.lojas : LOJAS_MOCK;
    encomendas = params.encomendas || [];
    produtos = params.produtos && params.produtos.length > 0 ? params.produtos : PRODUTOS_MOCK;
  }

  const normalizarData = (d: any) => {
    if (!d) return '';
    const str = String(d).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
    if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) {
      const [dd, mm, aaaa] = str.split('/');
      return `${aaaa}-${mm}-${dd}`;
    }
    return str.slice(0, 10);
  };

  const dataAlvoNorm = normalizarData(dataOperacao);

  const doc = new NativePdfDocument(`Folha_Fabrico_Encomendas_${dataFormatada.replace(/\//g, '-')}`, 'portrait');
  let p = doc.currentPage;
  const xMargin = 35;
  const wContent = 525;

  // 1. Filtrar encomendas ativas da data alvo (não canceladas)
  const encsFiltradas = encomendas.filter((enc: any) => {
    const dataEncNorm = normalizarData(enc.data_agendamento);
    const matchesData = !dataAlvoNorm || dataEncNorm === dataAlvoNorm;
    const naoCancelada = enc.estado !== 'cancelado';
    return matchesData && naoCancelada;
  });

  const lojasAtivas = lojas.filter((l) => l.ativo !== false);
  const idsLojasAtivas = new Set(lojasAtivas.map((l) => l.id));

  interface EncomendaProcessada {
    id: string;
    codigo: string;
    hora_agendamento: string;
    tipo: string;
    cliente: { nome: string; telefone?: string; morada?: string };
    notas_cliente?: string;
    observacoes_producao?: string;
    itensValidos: {
      id: string;
      produto_nome: string;
      setor: 'padaria' | 'pastelaria';
      quantidade: number;
      notas_personalizacao?: string;
    }[];
    totalEnc: number;
    totalPadariaEnc: number;
    totalPastelariaEnc: number;
  }

  interface GrupoLojaProcessado {
    loja: Loja;
    encomendas: EncomendaProcessada[];
    totalLojaUnidades: number;
    totalLojaPadaria: number;
    totalLojaPastelaria: number;
  }

  function processarEncomenda(enc: any): EncomendaProcessada {
    const rawItens = Array.isArray(enc.itens) && enc.itens.length > 0 
      ? enc.itens 
      : (Array.isArray(enc.itens_encomenda) ? enc.itens_encomenda : []);

    const itensValidos = rawItens
      .filter((it: any) => it.estado_producao !== 'recusado' && Number(it.quantidade) > 0)
      .map((it: any) => {
        const prodNome = String(it.produtos?.nome || it.produto_nome || it.nome || 'Artigo de Padaria/Pastelaria').trim();
        const rawSetor = String(it.setor || it.produtos?.setor || 'padaria').toLowerCase();
        const setor: 'padaria' | 'pastelaria' = rawSetor === 'pastelaria' ? 'pastelaria' : 'padaria';
        const qtd = Number(it.quantidade) || 0;
        const notas = it.notas_personalizacao || it.notas || '';
        return {
          id: String(it.id || Math.random()),
          produto_nome: prodNome,
          setor,
          quantidade: qtd,
          notas_personalizacao: notas ? String(notas).trim() : undefined,
        };
      });

    const totalEnc = itensValidos.reduce((acc, it) => acc + it.quantidade, 0);
    const totalPadariaEnc = itensValidos.filter((i) => i.setor === 'padaria').reduce((s, i) => s + i.quantidade, 0);
    const totalPastelariaEnc = itensValidos.filter((i) => i.setor === 'pastelaria').reduce((s, i) => s + i.quantidade, 0);

    const horaRaw = enc.hora_agendamento ? String(enc.hora_agendamento).slice(0, 5) : '10:00';
    const clienteNome = enc.clientes?.nome || enc.cliente?.nome || 'Cliente';
    const clienteTel = enc.clientes?.telefone || enc.cliente?.telefone || '';
    const clienteMorada = enc.clientes?.morada || enc.cliente?.morada || '';

    // Limpar tags internas das notas
    let notasClienteLimpa = enc.notas_cliente ? String(enc.notas_cliente).trim() : '';
    if (notasClienteLimpa.startsWith('[CANAL:')) {
      notasClienteLimpa = notasClienteLimpa.replace(/\[CANAL:[^\]]+\]\s*/g, '').trim();
    }

    return {
      id: enc.id,
      codigo: enc.codigo || '#ENC',
      hora_agendamento: horaRaw,
      tipo: enc.tipo || 'levantamento_loja',
      cliente: {
        nome: clienteNome,
        telefone: clienteTel,
        morada: clienteMorada,
      },
      notas_cliente: notasClienteLimpa || undefined,
      observacoes_producao: enc.observacoes_producao,
      itensValidos,
      totalEnc,
      totalPadariaEnc,
      totalPastelariaEnc,
    };
  }

  const gruposLojaFabrico: GrupoLojaProcessado[] = [];

  // Agrupar por cada loja ativa
  lojasAtivas.forEach((loja) => {
    const encs = encsFiltradas
      .filter((enc: any) => enc.loja_id === loja.id)
      .map(processarEncomenda)
      .filter((e) => e.totalEnc > 0)
      .sort((a, b) => a.hora_agendamento.localeCompare(b.hora_agendamento));

    if (encs.length > 0) {
      gruposLojaFabrico.push({
        loja,
        encomendas: encs,
        totalLojaUnidades: encs.reduce((acc, e) => acc + e.totalEnc, 0),
        totalLojaPadaria: encs.reduce((acc, e) => acc + e.totalPadariaEnc, 0),
        totalLojaPastelaria: encs.reduce((acc, e) => acc + e.totalPastelariaEnc, 0),
      });
    }
  });

  // Encomendas sem loja_id ou de entrega ao domicílio com loja não listada
  const encsSemLoja = encsFiltradas
    .filter((enc: any) => !enc.loja_id || !idsLojasAtivas.has(enc.loja_id))
    .map(processarEncomenda)
    .filter((e) => e.totalEnc > 0)
    .sort((a, b) => a.hora_agendamento.localeCompare(b.hora_agendamento));

  if (encsSemLoja.length > 0) {
    gruposLojaFabrico.push({
      loja: {
        id: 'sem_loja',
        nome: 'Entregas ao Domicílio & Expedição Geral',
        codigo: 'domicilio',
        morada: 'Centro de Fabrico / Distribuição Central',
        telefone: '',
        ativo: true,
      } as Loja,
      encomendas: encsSemLoja,
      totalLojaUnidades: encsSemLoja.reduce((acc, e) => acc + e.totalEnc, 0),
      totalLojaPadaria: encsSemLoja.reduce((acc, e) => acc + e.totalPadariaEnc, 0),
      totalLojaPastelaria: encsSemLoja.reduce((acc, e) => acc + e.totalPastelariaEnc, 0),
    });
  }

  // Totais Globais
  const totalGeralEncsCount = gruposLojaFabrico.reduce((acc, g) => acc + g.encomendas.length, 0);
  const totalGeralFabricoUnidades = gruposLojaFabrico.reduce((acc, g) => acc + g.totalLojaUnidades, 0);
  const totalGeralPadaria = gruposLojaFabrico.reduce((acc, g) => acc + g.totalLojaPadaria, 0);
  const totalGeralPastelaria = gruposLojaFabrico.reduce((acc, g) => acc + g.totalLojaPastelaria, 0);

  // Função para desenhar Cabeçalho Principal no topo da página 1
  function desenharCabecalhoPrincipal(page: PdfPageWriter, startY: number): number {
    page.drawText('PADARIA DA VILA', xMargin, startY - 14, 15, true, '0 0 0');
    page.drawText('Fabrico Próprio de Pão Tradicional e Pastelaria Fina • Arouca', xMargin, startY - 26, 8, false, '0.3 0.3 0.3');
    page.drawText('Centro de Fabrico & Unidade Fabril Central • Folha de Fabrico de Encomendas por Loja', xMargin, startY - 37, 7.5, false, '0.4 0.4 0.4');

    // Box Topo Direito: ENCOMENDAS POR LOJA
    const boxW = 145;
    const boxH = 40;
    const boxX = xMargin + wContent - boxW;
    const boxY = startY - 42;
    page.drawRect(boxX, boxY, boxW, boxH, null, '0 0 0');
    page.drawText('ENCOMENDAS POR LOJA', boxX + 10, startY - 14, 8.5, true, '0 0 0');
    page.drawText(`Data: ${dataAlvoNorm || dataFormatada}`, boxX + 10, startY - 25, 8, true, '0 0 0');
    page.drawText('Todas as Lojas', boxX + 10, startY - 35, 7.5, false, '0.3 0.3 0.3');

    // Linha divisória sutil
    page.drawLine(xMargin, startY - 48, xMargin + wContent, startY - 48, '0.8 0.8 0.8', 0.5);

    // 4 Caixas Resumo Globais (sem transbordo de texto)
    const cardY = startY - 86;
    const cardH = 34;
    const cardW = 125;
    const gap = 8.33;

    // Card 1: TOTAL ENCOMENDAS
    const c1X = xMargin;
    page.drawRect(c1X, cardY, cardW, cardH, null, '0.3 0.3 0.3');
    page.drawText('TOTAL ENCOMENDAS', c1X + 8, cardY + 23, 6.5, true, '0.4 0.4 0.4');
    const s1Val = `${totalGeralEncsCount}`;
    page.drawText(s1Val, c1X + 8, cardY + 9, 13, true, '0 0 0');
    page.drawText('encomendas', c1X + 12 + s1Val.length * 8, cardY + 9.5, 6.5, false, '0.5 0.5 0.5');

    // Card 2: TOTAL A PRODUZIR
    const c2X = c1X + cardW + gap;
    page.drawRect(c2X, cardY, cardW, cardH, null, '0.3 0.3 0.3');
    page.drawText('TOTAL A PRODUZIR', c2X + 8, cardY + 23, 6.5, true, '0.4 0.4 0.4');
    const s2Val = `${totalGeralFabricoUnidades} un.`;
    page.drawText(s2Val, c2X + 8, cardY + 9, 13, true, '0 0 0');
    page.drawText('artigos', c2X + 12 + s2Val.length * 7.5, cardY + 9.5, 6.5, false, '0.5 0.5 0.5');

    // Card 3: PADARIA
    const c3X = c2X + cardW + gap;
    page.drawRect(c3X, cardY, cardW, cardH, null, '0.3 0.3 0.3');
    page.drawText('PADARIA', c3X + 8, cardY + 23, 6.5, true, '0.4 0.4 0.4');
    const s3Val = `${totalGeralPadaria} un.`;
    page.drawText(s3Val, c3X + 8, cardY + 9, 13, true, '0 0 0');
    page.drawText('pães', c3X + 12 + s3Val.length * 7.5, cardY + 9.5, 6.5, false, '0.5 0.5 0.5');

    // Card 4: PASTELARIA
    const c4X = c3X + cardW + gap;
    page.drawRect(c4X, cardY, cardW, cardH, null, '0.3 0.3 0.3');
    page.drawText('PASTELARIA', c4X + 8, cardY + 23, 6.5, true, '0.4 0.4 0.4');
    const s4Val = `${totalGeralPastelaria} un.`;
    page.drawText(s4Val, c4X + 8, cardY + 9, 13, true, '0 0 0');
    page.drawText('pastelaria', c4X + 12 + s4Val.length * 7.5, cardY + 9.5, 6.5, false, '0.5 0.5 0.5');

    return cardY - 14;
  }

  let curY = 795;
  curY = desenharCabecalhoPrincipal(p, curY);

  if (gruposLojaFabrico.length === 0) {
    p.drawRect(xMargin, curY - 32, wContent, 32, null, '0.5 0.5 0.5');
    p.drawText(`Nenhuma encomenda encontrada para produção na data ${dataAlvoNorm || dataFormatada}.`, xMargin + 80, curY - 19, 9, true, '0.3 0.3 0.3');
    curY -= 48;
  } else {
    gruposLojaFabrico.forEach((grupo, idxLoja) => {
      const loja = grupo.loja;

      // Se não for a primeira loja e o espaço restante for curto, quebra de página
      if (idxLoja > 0 && curY < 480) {
        p = doc.addPage();
        curY = 795;
      }

      // Banner da Loja
      const bannerH = 34;
      if (curY - bannerH < 65) {
        p = doc.addPage();
        curY = 795;
      }
      p.drawRect(xMargin, curY - bannerH, wContent, bannerH, null, '0 0 0');
      // Left info: Nome Loja + Morada + Contacto
      p.drawText(`${loja.nome.toUpperCase()} (${grupo.encomendas.length} ENCOMENDAS)`, xMargin + 10, curY - 14, 9.5, true, '0 0 0');
      const storeContact = `${loja.morada || 'Balcão de Atendimento'}${loja.telefone ? ` • Tel: ${loja.telefone}` : ''}`;
      p.drawText(storeContact.slice(0, 75), xMargin + 10, curY - 26, 7, false, '0.3 0.3 0.3');

      // Right info: TOTAL A PRODUZIR NA LOJA
      p.drawText('TOTAL A PRODUZIR NA LOJA', xMargin + wContent - 165, curY - 13, 6.5, true, '0.4 0.4 0.4');
      const totLojaStr = `${grupo.totalLojaUnidades} un.`;
      p.drawText(totLojaStr, xMargin + wContent - 55, curY - 13, 11, true, '0 0 0');
      p.drawText(`Padaria: ${grupo.totalLojaPadaria} un. • Pastelaria: ${grupo.totalLojaPastelaria} un.`, xMargin + wContent - 165, curY - 25, 7, true, '0.2 0.2 0.2');

      curY -= (bannerH + 10);

      // Encomendas dentro da loja
      grupo.encomendas.forEach((enc) => {
        const hasMorada = Boolean(enc.tipo === 'entrega_domicilio' && enc.cliente?.morada);
        const hasNotas = Boolean(enc.notas_cliente || enc.observacoes_producao);
        const extraLines = (hasMorada ? 1 : 0) + (hasNotas ? 1 : 0);
        const numItens = enc.itensValidos.length;

        const estCardH = 18 + (extraLines * 12) + 14 + (numItens * 13) + 14;

        if (curY - estCardH < 65) {
          p = doc.addPage();
          curY = 795;
          p.drawRect(xMargin, curY - 14, wContent, 14, null, '0.4 0.4 0.4');
          p.drawText(`${loja.nome.toUpperCase()} (Continuação) • ${dataAlvoNorm || dataFormatada}`, xMargin + 8, curY - 10, 7.5, true, '0.2 0.2 0.2');
          curY -= 20;
        }

        // Desenha a caixa exterior da encomenda
        p.drawRect(xMargin, curY - estCardH, wContent, estCardH, null, '0.5 0.5 0.5');

        // Barra de topo da encomenda
        const headerBarH = 18;
        p.drawLine(xMargin, curY - headerBarH, xMargin + wContent, curY - headerBarH, '0.8 0.8 0.8', 0.5);

        // Código pill
        p.drawRect(xMargin + 6, curY - 14, 82, 11, null, '0.4 0.4 0.4');
        p.drawText(enc.codigo, xMargin + 10, curY - 11, 7.5, true, '0 0 0');

        // Hora pill
        p.drawRect(xMargin + 93, curY - 14, 40, 11, null, '0.4 0.4 0.4');
        p.drawText(enc.hora_agendamento, xMargin + 99, curY - 11, 7.5, true, '0 0 0');

        // Tipo pill
        const tipoLabel = enc.tipo === 'entrega_domicilio' ? 'Domicílio' : 'Balcão';
        p.drawRect(xMargin + 138, curY - 14, 52, 11, null, '0.4 0.4 0.4');
        p.drawText(tipoLabel, xMargin + 143, curY - 11, 7, true, '0 0 0');

        // Cliente à direita
        p.drawText(enc.cliente.nome.slice(0, 28), xMargin + 310, curY - 11, 8, true, '0 0 0');
        if (enc.cliente.telefone) {
          p.drawText(enc.cliente.telefone, xMargin + wContent - 65, curY - 11, 7.5, false, '0.3 0.3 0.3');
        }

        curY -= headerBarH;

        // Linha de Morada se entrega ao domicílio
        if (hasMorada) {
          p.drawText(`Morada Entrega: ${enc.cliente.morada}`, xMargin + 8, curY - 9, 7, false, '0.2 0.2 0.2');
          curY -= 12;
        }

        // Linha de Notas se existir
        if (hasNotas) {
          const nTxt = [enc.notas_cliente ? `Nota: ${enc.notas_cliente}` : '', enc.observacoes_producao ? `Obs: ${enc.observacoes_producao}` : ''].filter(Boolean).join(' • ');
          p.drawText(nTxt.slice(0, 95), xMargin + 8, curY - 9, 6.5, false, '0.3 0.3 0.3');
          curY -= 12;
        }

        // Cabeçalho da tabela de artigos da encomenda
        const thH = 14;
        p.drawLine(xMargin, curY, xMargin + wContent, curY, '0.2 0.2 0.2', 0.8);
        p.drawLine(xMargin, curY - thH, xMargin + wContent, curY - thH, '0.2 0.2 0.2', 0.8);
        p.drawText('Artigo / Produto a Produzir', xMargin + 8, curY - 10, 7, true, '0 0 0');
        p.drawText('Setor', xMargin + 155, curY - 10, 7, true, '0 0 0');
        p.drawText('Quantidade', xMargin + 215, curY - 10, 7, true, '0 0 0');
        p.drawText('Personalização / Especificações', xMargin + 280, curY - 10, 7, true, '0 0 0');
        p.drawText('Fabrico [  ]', xMargin + 450, curY - 10, 7, true, '0 0 0');
        curY -= thH;

        // Linhas de artigos
        enc.itensValidos.forEach((it) => {
          const rowH = 13;
          p.drawLine(xMargin, curY - rowH, xMargin + wContent, curY - rowH, '0.9 0.9 0.9', 0.4);

          // Nome do artigo
          p.drawText(it.produto_nome.slice(0, 32), xMargin + 8, curY - 9.5, 7.5, true, '0 0 0');

          // Pill do Setor
          const setorLabel = it.setor === 'pastelaria' ? 'Pastelaria' : 'Padaria';
          p.drawRect(xMargin + 148, curY - 10.5, 48, 9.5, null, '0.6 0.6 0.6');
          p.drawText(setorLabel, xMargin + 155, curY - 8.5, 6.5, false, '0.2 0.2 0.2');

          // Quantidade
          p.drawText(`${it.quantidade} un.`, xMargin + 235, curY - 9.5, 8, true, '0 0 0');

          // Personalização
          const notasStr = it.notas_personalizacao || 'Padrão da receita';
          const isCustom = Boolean(it.notas_personalizacao);
          p.drawText(notasStr.slice(0, 34), xMargin + 280, curY - 9.5, 6.5, isCustom, isCustom ? '0 0 0' : '0.5 0.5 0.5');

          // Checkbox Fabrico
          p.drawText('[   ] Pronto / Embalado', xMargin + 440, curY - 9.5, 6.5, false, '0.4 0.4 0.4');

          curY -= rowH;
        });

        // Rodapé da encomenda
        const footerEncH = 14;
        p.drawLine(xMargin, curY, xMargin + wContent, curY, '0.7 0.7 0.7', 0.6);
        p.drawText(`${enc.itensValidos.length} artigo(s) nesta encomenda`, xMargin + 8, curY - 10, 6.5, false, '0.4 0.4 0.4');
        p.drawText(`${enc.totalEnc} un.`, xMargin + 235, curY - 10, 8, true, '0 0 0');
        p.drawText('Conferência de embalamento [   ]', xMargin + 410, curY - 10, 6.5, false, '0.4 0.4 0.4');

        curY -= (footerEncH + 8);
      });

      // Subtotal da Loja
      const subLojaH = 18;
      if (curY - subLojaH < 65) {
        p = doc.addPage();
        curY = 795;
      }
      p.drawRect(xMargin, curY - subLojaH, wContent, subLojaH, null, '0 0 0');
      p.drawText(`SUBTOTAL ${loja.nome.toUpperCase()}`, xMargin + 8, curY - 12, 7.5, true, '0 0 0');
      p.drawText(`${grupo.encomendas.length} Encomendas`, xMargin + 170, curY - 12, 7, false, '0.2 0.2 0.2');
      p.drawText(`Padaria: ${grupo.totalLojaPadaria} un.`, xMargin + 260, curY - 12, 7.5, true, '0 0 0');
      p.drawText(`Pastelaria: ${grupo.totalLojaPastelaria} un.`, xMargin + 355, curY - 12, 7.5, true, '0 0 0');
      // Total box pill
      p.drawRect(xMargin + wContent - 78, curY - 15, 72, 12, null, '0 0 0');
      p.drawText(`Total: ${grupo.totalLojaUnidades} un.`, xMargin + wContent - 72, curY - 11, 8, true, '0 0 0');

      curY -= (subLojaH + 16);
    });

    // Bloco Oficial de Validação e Assinaturas
    if (curY - 45 < 40) {
      p = doc.addPage();
      curY = 795;
    }
    const wAssinatura = (wContent - 15) / 2;

    // Box 1: Chefe de Turno de Fabrico
    p.drawRect(xMargin, curY - 42, wAssinatura, 42, null, '0.4 0.4 0.4');
    p.drawText('Chefe de Turno de Fabrico:', xMargin + 8, curY - 13, 7.5, true, '0.3 0.3 0.3');
    p.drawText('Mestre Padeiro / Responsável da Pastelaria', xMargin + 8, curY - 25, 7.5, true, '0 0 0');
    p.drawText('Conformidade e Embalamento HACCP', xMargin + 8, curY - 35, 6.5, false, '0.4 0.4 0.4');

    // Box 2: Conferência de Expedição para Lojas
    const xAssin2 = xMargin + wAssinatura + 15;
    p.drawRect(xAssin2, curY - 42, wAssinatura, 42, null, '0.4 0.4 0.4');
    p.drawText('Conferência de Expedição para Lojas:', xAssin2 + 8, curY - 13, 7.5, true, '0.3 0.3 0.3');
    p.drawLine(xAssin2 + 8, curY - 26, xAssin2 + wAssinatura - 8, curY - 26, '0.6 0.6 0.6', 0.5);
    p.drawText('Assinatura / Visto do Centro de Expedição', xAssin2 + 25, curY - 24, 6.5, false, '0.4 0.4 0.4');
    p.drawText('Hora de Saída: _____ : _____', xAssin2 + 8, curY - 36, 7, false, '0.2 0.2 0.2');

    curY -= 48;
  }

  return doc.toBuffer();
}

function extrairApenasNomeRota(rotaOuNome: string, numeroRota?: number): string {
  if (numeroRota && numeroRota >= 1 && numeroRota <= 20) {
    return `ROTA ${numeroRota}`;
  }
  let limpo = (rotaOuNome || '').replace(/\s*[\u2014\u2013\-\(].*$/, '').trim();
  if (!limpo && numeroRota) return `ROTA ${numeroRota}`;
  return (limpo || 'ROTA').toUpperCase();
}

/**
 * Constrói o PDF Oficial: Guia de Carga Conjunta (Matriz de Todas as Rotas)
 * Layout Wireframe profissional otimizado para impressão (100% fundo branco, sem caixas e sem fundos preenchidos a tinta).
 * Cada uma das tabelas (Padaria e Pastelaria) fica na HORIZONTAL mas REPARTIDA POR 2 FOLHAS com TAMANHO DE LETRA 8:
 * - Folha 1: 1. Secção Padaria (Parte 1 de 2: Colunas 1 a 17) + Subtotal P1
 * - Folha 2: 1. Secção Padaria (Parte 2 de 2: Colunas 18 a 34) + Total Geral Padaria
 * - Folha 3: 2. Secção Pastelaria Fina (Parte 1 de 2: Colunas 1 a 9) + Subtotal P1
 * - Folha 4: 2. Secção Pastelaria Fina (Parte 2 de 2: Colunas 10 a 18) + Total Geral Pastelaria + Resumo Geral a Bordo + Assinaturas
 */
export function gerarPdfGuiaCargaConjunta(params: ParametrosFolhaCargaPdf | string): Buffer {
  let dataOperacao = '';
  let dataFormatada = '';
  let diaSemana: DiaSemana = 'seg';
  let carrinhas: Carrinha[] = [];
  let baseFixaCarrinhas: BaseFixaCarrinha[] = [];
  let clientesB2B: ClienteEmpresarialB2B[] = [];
  let basesRecorrentes: BaseDiariaRecorrente[] = [];
  let encomendas: Encomenda[] = [];
  let produtos: Produto[] = [];
  let ajustesAdhoc: Record<string, number> | undefined;

  if (typeof params === 'string') {
    dataOperacao = new Date().toISOString().split('T')[0];
    dataFormatada = params;
    carrinhas = CARRINHAS_MOCK;
    baseFixaCarrinhas = BASE_FIXA_CARRINHAS_INICIAL;
    clientesB2B = CLIENTES_EMPRESARIAIS_B2B_INICIAIS;
    produtos = PRODUTOS_MOCK;
    encomendas = [];
  } else {
    dataOperacao = params.dataOperacao;
    dataFormatada = params.dataFormatada;
    diaSemana = params.diaSemana || 'seg';
    carrinhas = params.carrinhas && params.carrinhas.length > 0 ? params.carrinhas : CARRINHAS_MOCK;
    baseFixaCarrinhas = params.baseFixaCarrinhas || BASE_FIXA_CARRINHAS_INICIAL;
    clientesB2B = params.clientesB2B || CLIENTES_EMPRESARIAIS_B2B_INICIAIS;
    basesRecorrentes = params.basesRecorrentes || [];
    encomendas = params.encomendas || [];
    produtos = params.produtos && params.produtos.length > 0 ? params.produtos : PRODUTOS_MOCK;
    ajustesAdhoc = params.ajustesAdhoc;
  }

  const dados = calcularDadosGuiaCargaConjunta({
    dataAlvo: dataOperacao,
    carrinhas,
    baseFixaCarrinhas,
    clientesB2B,
    basesRecorrentes,
    encomendas,
    produtos,
    ajustesCustom: ajustesAdhoc,
  });

  const doc = new NativePdfDocument(`Guia_Carga_Conjunta_${dataFormatada.replace(/\//g, '-')}`, 'landscape');
  let p = doc.currentPage;

  const colunasPadaria = dados.colunasGrelhaPadaria || [];
  const colunasPastelaria = dados.colunasGrelhaPastelaria || [];
  const grupos = dados.gruposRotasGrelha || [];
  const colunasRotasAtivas = dados.colunasRotas || [];

  const xInicio = 22;
  const wTotalTabela = 798; // Largura útil A4 Landscape (842 - 2 * 22)

  // ==============================================================
  // 1. SECÇÃO PADARIA - REPARTIDA POR 2 FOLHAS HORIZONTAIS COM LETRA 8
  // Total de 34 colunas:
  // - Parte 1: 17 colunas (0 a 16) + Subtotal P1
  // - Parte 2: 17 colunas (17 a 33) + Total Geral Padaria
  // ==============================================================
  const colunasPadariaP1 = colunasPadaria.slice(0, 17);
  const colunasPadariaP2 = colunasPadaria.slice(17, 34);

  const wNomeColPad = 180;
  const wColPad = 33.5; // 17 * 33.5 = 569.5 pt
  const wTotPadCol = 48.5; // 180 + 569.5 + 48.5 = 798 pt
  const xTotPad = xInicio + wNomeColPad + 17 * wColPad; // 22 + 180 + 569.5 = 771.5 pt

  const subtotalGeralPadariaP1 = colunasPadariaP1.reduce((acc, col) => acc + (dados.totaisColunasPadaria?.[col.id] || 0), 0);
  const subtotalGeralPadariaP2 = colunasPadariaP2.reduce((acc, col) => acc + (dados.totaisColunasPadaria?.[col.id] || 0), 0);

  const gruposPadaria = grupos.filter((g) => (g.totalPadariaRota || 0) > 0);

  // --- FOLHA 1: PADARIA - PARTE 1 DE 2 ---
  function desenharCabecalhoPadariaParte(page: PdfPageWriter, startY: number, cols: typeof colunasPadariaP1, parteNum: 1 | 2): number {
    page.drawRect(xInicio, startY - 26, wTotalTabela, 26, null, '0 0 0');
    const subtituloParte = parteNum === 1
      ? '1. SECÇÃO PADARIA (PARTE 1 DE 2)'
      : '1. SECÇÃO PADARIA (PARTE 2 DE 2)';
    page.drawText(`PADARIA DA VILA - GUIA OFICIAL DE CARGA CONJUNTA • ${subtituloParte}`, xInicio + 8, startY - 11, 9, true, '0 0 0');
    page.drawText(`Operação de ${dados.data || dataFormatada} • (${colunasRotasAtivas.length} rotas ativas: Porta a Porta + Clientes Empresariais + Encomendas) • BCP`, xInicio + 8, startY - 21, 6.5, false, '0.3 0.3 0.3');

    const badgeTexto = parteNum === 1
      ? `Subtotal P1: ${subtotalGeralPadariaP1} un.`
      : `Total Padaria: ${dados.totalGeralPadaria ?? 0} un.`;
    page.drawText(badgeTexto, xInicio + wTotalTabela - 140, startY - 16, 8, true, '0 0 0');

    const tableTop = startY - 30;
    const headerH = 82;
    page.drawRect(xInicio, tableTop - headerH, wTotalTabela, headerH, null, '0 0 0');
    page.drawText('Rota / Cliente / Paragem', xInicio + 6, tableTop - 50, 8, true, '0 0 0');

    cols.forEach((col, idx) => {
      const cx = xInicio + wNomeColPad + idx * wColPad;
      page.drawLine(cx, tableTop, cx, tableTop - headerH, '0.7 0.7 0.7', 0.4);
      page.drawRotatedText(col.label.slice(0, 16), cx + 18, tableTop - 76, 7, true, '0 0 0');
    });

    page.drawLine(xTotPad, tableTop, xTotPad, tableTop - headerH, '0 0 0', 0.8);
    const labelTotCol = parteNum === 1 ? 'SUBTOTAL' : 'TOTAL';
    const subLabelTotCol = parteNum === 1 ? '(P1)' : 'PADARIA';
    page.drawText(labelTotCol, xTotPad + 4, tableTop - 42, 7, true, '0 0 0');
    page.drawText(subLabelTotCol, xTotPad + 4, tableTop - 54, 7, true, '0 0 0');

    return tableTop - headerH;
  }

  // Renderizar Tabela de Padaria para uma das metades
  function renderizarTabelaPadaria(cols: typeof colunasPadariaP1, parteNum: 1 | 2) {
    let curY = 565;
    curY = desenharCabecalhoPadariaParte(p, curY, cols, parteNum);

    gruposPadaria.forEach((grupo) => {
      const linhasComPadaria = (grupo.linhas || []).filter((linha) => {
        const totPad = colunasPadaria.reduce((acc, col) => acc + (linha.quantidades[col.id] || 0), 0);
        return totPad > 0;
      });

      if (linhasComPadaria.length === 0 && (grupo.totalPadariaRota || 0) === 0) return;

      if (curY - 13 - (linhasComPadaria.length * 12) < 35 && curY < 500) {
        p = doc.addPage();
        curY = 565;
        curY = desenharCabecalhoPadariaParte(p, curY, cols, parteNum);
      }

      // 1. Linha Divisória de Cabeçalho da Rota com Subtotais por Coluna (Letra 8)
      const rowHeaderH = 13;
      p.drawRect(xInicio, curY - rowHeaderH, wTotalTabela, rowHeaderH, '0.94 0.94 0.94', '0.2 0.2 0.2');
      const rotuloRotaHeader = extrairApenasNomeRota(grupo.rotaNome, grupo.numeroRota);
      p.drawText(rotuloRotaHeader.slice(0, 34), xInicio + 4, curY - (rowHeaderH - 3.5), 8, true, '0 0 0');

      let totGrupoParte = 0;
      cols.forEach((col, idx) => {
        const cx = xInicio + wNomeColPad + idx * wColPad;
        p.drawLine(cx, curY, cx, curY - rowHeaderH, '0.5 0.5 0.5', 0.4);
        const q = grupo.totaisPadaria[col.id] || 0;
        if (q > 0) {
          totGrupoParte += q;
          const sq = String(q);
          const posX = cx + wColPad / 2 - sq.length * 2.2;
          p.drawText(sq, posX, curY - (rowHeaderH - 3.5), 8, true, '0 0 0');
        }
      });

      p.drawLine(xTotPad, curY, xTotPad, curY - rowHeaderH, '0 0 0', 0.8);
      const valTotGrupo = parteNum === 1 ? totGrupoParte : grupo.totalPadariaRota;
      const strValTotGrupo = String(valTotGrupo);
      p.drawText(strValTotGrupo, xTotPad + wTotPadCol / 2 - strValTotGrupo.length * 2.2, curY - (rowHeaderH - 3.5), 8, true, '0 0 0');
      curY -= rowHeaderH;

      // 2. Linhas discriminadas da rota (Porta a Porta, Clientes B2B, Encomendas)
      linhasComPadaria.forEach((linha) => {
        if (curY - 12 < 35) {
          p = doc.addPage();
          curY = 565;
          curY = desenharCabecalhoPadariaParte(p, curY, cols, parteNum);
        }

        const rowH = 12;
        p.drawRect(xInicio, curY - rowH, wTotalTabela, rowH, null, '0.85 0.85 0.85');

        const isBase = linha.tipo === 'rota_base';
        const nomeText = isBase ? '   Porta a Porta' : `   ${linha.nomeExibicao.slice(0, 26)}`;
        p.drawText(nomeText, xInicio + 4, curY - (rowH - 3), isBase ? 8 : 7.5, isBase, '0 0 0');

        let totLinhaParte = 0;
        cols.forEach((col, idx) => {
          const cx = xInicio + wNomeColPad + idx * wColPad;
          p.drawLine(cx, curY, cx, curY - rowH, '0.9 0.9 0.9', 0.3);

          const q = linha.quantidades[col.id] || 0;
          if (q > 0) {
            totLinhaParte += q;
            const sq = String(q);
            const posX = cx + wColPad / 2 - sq.length * 2.2;
            p.drawText(sq, posX, curY - (rowH - 3), 8, isBase, '0 0 0');
          }
        });

        p.drawLine(xTotPad, curY, xTotPad, curY - rowH, '0.4 0.4 0.4', 0.6);
        const valTotLinha = parteNum === 1
          ? totLinhaParte
          : colunasPadaria.reduce((acc, c) => acc + (linha.quantidades[c.id] || 0), 0);
        if (valTotLinha > 0) {
          const strTotL = String(valTotLinha);
          p.drawText(strTotL, xTotPad + wTotPadCol / 2 - strTotL.length * 2.2, curY - (rowH - 3), 8, true, '0 0 0');
        }

        curY -= rowH;
      });
    });

    // Linha de Rodapé TOTAL PADARIA
    if (curY - 15 < 35) {
      p = doc.addPage();
      curY = 565;
      curY = desenharCabecalhoPadariaParte(p, curY, cols, parteNum);
    }
    p.drawLine(xInicio, curY, xInicio + wTotalTabela, curY, '0 0 0', 1.2);
    p.drawLine(xInicio, curY - 15, xInicio + wTotalTabela, curY - 15, '0 0 0', 1.2);
    const labelRodapePad = parteNum === 1 ? 'SUBTOTAL PADARIA (PARTE 1)' : 'TOTAL GERAL PADARIA';
    p.drawText(labelRodapePad, xInicio + 5, curY - 11, 8, true, '0 0 0');

    let sumTotalColsParte = 0;
    cols.forEach((col, idx) => {
      const cx = xInicio + wNomeColPad + idx * wColPad;
      p.drawLine(cx, curY, cx, curY - 15, '0.5 0.5 0.5', 0.5);
      const totCol = dados.totaisColunasPadaria?.[col.id] || 0;
      sumTotalColsParte += totCol;
      if (totCol > 0) {
        const stc = String(totCol);
        const posX = cx + wColPad / 2 - stc.length * 2.2;
        p.drawText(stc, posX, curY - 11, 8, true, '0 0 0');
      }
    });

    p.drawLine(xTotPad, curY, xTotPad, curY - 15, '0 0 0', 1.2);
    const valRodapeGeral = parteNum === 1 ? sumTotalColsParte : (dados.totalGeralPadaria ?? 0);
    const stTotPadFinal = String(valRodapeGeral);
    p.drawText(stTotPadFinal, xTotPad + wTotPadCol / 2 - stTotPadFinal.length * 2.3, curY - 11, 8.5, true, '0 0 0');
  }

  // 1. Folha 1: Padaria Parte 1 (Colunas 1 a 17)
  renderizarTabelaPadaria(colunasPadariaP1, 1);

  // 2. Folha 2: Padaria Parte 2 (Colunas 18 a 34)
  p = doc.addPage();
  renderizarTabelaPadaria(colunasPadariaP2, 2);

  // ==============================================================
  // 2. SECÇÃO PASTELARIA FINA - 1 ÚNICA PÁGINA (FOLHA 3) COM LETRA 8
  // Total de 18 colunas unificadas numa única folha horizontal
  // ==============================================================
  const colunasPastelariaUnica = colunasPastelaria; // Todas as 18 colunas

  const wNomeColPast = 150;
  const wColPast = 33.33; // 18 colunas * 33.33 = 600 pt
  const wTotPastCol = 48; // 150 + 600 + 48 = 798 pt
  const xTotPast = xInicio + wNomeColPast + 18 * wColPast; // 22 + 150 + 600 = 772 pt

  const gruposPastelaria = grupos.filter((g) => (g.totalPastelariaRota || 0) > 0);

  function desenharCabecalhoPastelaria(page: PdfPageWriter, startY: number): number {
    page.drawRect(xInicio, startY - 26, wTotalTabela, 26, null, '0 0 0');
    page.drawText('PADARIA DA VILA - GUIA OFICIAL DE CARGA CONJUNTA • 2. SECÇÃO PASTELARIA FINA', xInicio + 8, startY - 11, 9, true, '0 0 0');
    page.drawText(`Operação de ${dados.data || dataFormatada} • (${colunasRotasAtivas.length} rotas ativas: Porta a Porta + Clientes Empresariais + Encomendas) • BCP`, xInicio + 8, startY - 21, 6.5, false, '0.3 0.3 0.3');

    const badgeTexto = `Total Pastelaria: ${dados.totalGeralPastelaria ?? 0} un.`;
    page.drawText(badgeTexto, xInicio + wTotalTabela - 150, startY - 16, 8, true, '0 0 0');

    const tableTop = startY - 30;
    const headerH = 82; // Altura generosa para acomodar texto vertical sem corte
    page.drawRect(xInicio, tableTop - headerH, wTotalTabela, headerH, null, '0 0 0');
    page.drawText('Rota / Cliente / Paragem', xInicio + 6, tableTop - 50, 8, true, '0 0 0');

    colunasPastelariaUnica.forEach((col, idx) => {
      const cx = xInicio + wNomeColPast + idx * wColPast;
      page.drawLine(cx, tableTop, cx, tableTop - headerH, '0.7 0.7 0.7', 0.4);
      // Inicia em tableTop - 76, texto com max 16 chars termina em tableTop - 18, com margem de segurança de 18pt abaixo da linha superior
      page.drawRotatedText(col.label.slice(0, 16), cx + 19.5, tableTop - 76, 7, true, '0 0 0');
    });

    page.drawLine(xTotPast, tableTop, xTotPast, tableTop - headerH, '0 0 0', 0.8);
    page.drawText('TOTAL', xTotPast + 6, tableTop - 42, 7.5, true, '0 0 0');
    page.drawText('PASTELARIA', xTotPast + 6, tableTop - 54, 7, true, '0 0 0');

    return tableTop - headerH;
  }

  function renderizarTabelaPastelaria() {
    let curY = 565;
    curY = desenharCabecalhoPastelaria(p, curY);

    gruposPastelaria.forEach((grupo) => {
      const linhasComPastelaria = (grupo.linhas || []).filter((linha) => {
        const totPast = colunasPastelariaUnica.reduce((acc, col) => acc + (linha.quantidades[col.id] || 0), 0);
        return totPast > 0;
      });

      if (linhasComPastelaria.length === 0 && (grupo.totalPastelariaRota || 0) === 0) return;

      const espacoNecessario = 13 + (linhasComPastelaria.length * 12);
      if (curY - espacoNecessario < 85 && curY < 500) {
        p = doc.addPage();
        curY = 565;
        curY = desenharCabecalhoPastelaria(p, curY);
      }

      // 1. Linha Divisória de Cabeçalho da Rota com Subtotais por Coluna (Letra 8)
      const rowHeaderH = 13;
      p.drawRect(xInicio, curY - rowHeaderH, wTotalTabela, rowHeaderH, '0.94 0.94 0.94', '0.2 0.2 0.2');
      const rotuloRotaHeader = extrairApenasNomeRota(grupo.rotaNome, grupo.numeroRota);
      p.drawText(rotuloRotaHeader.slice(0, 36), xInicio + 4, curY - (rowHeaderH - 3.5), 8, true, '0 0 0');

      colunasPastelariaUnica.forEach((col, idx) => {
        const cx = xInicio + wNomeColPast + idx * wColPast;
        p.drawLine(cx, curY, cx, curY - rowHeaderH, '0.5 0.5 0.5', 0.4);
        const q = grupo.totaisPastelaria[col.id] || 0;
        if (q > 0) {
          const sq = String(q);
          const posX = cx + wColPast / 2 - sq.length * 2.2;
          p.drawText(sq, posX, curY - (rowHeaderH - 3.5), 8, true, '0 0 0');
        }
      });

      p.drawLine(xTotPast, curY, xTotPast, curY - rowHeaderH, '0 0 0', 0.8);
      const strValTotGrupo = String(grupo.totalPastelariaRota);
      p.drawText(strValTotGrupo, xTotPast + wTotPastCol / 2 - strValTotGrupo.length * 2.2, curY - (rowHeaderH - 3.5), 8, true, '0 0 0');
      curY -= rowHeaderH;

      // 2. Linhas discriminadas da rota (Porta a Porta, Clientes B2B, Encomendas)
      linhasComPastelaria.forEach((linha) => {
        if (curY - 12 < 85) {
          p = doc.addPage();
          curY = 565;
          curY = desenharCabecalhoPastelaria(p, curY);
        }

        const rowH = 12;
        p.drawRect(xInicio, curY - rowH, wTotalTabela, rowH, null, '0.85 0.85 0.85');

        const isBase = linha.tipo === 'rota_base';
        const nomeText = isBase ? '   Porta a Porta' : `   ${linha.nomeExibicao.slice(0, 24)}`;
        p.drawText(nomeText, xInicio + 4, curY - (rowH - 3), isBase ? 8 : 7.5, isBase, '0 0 0');

        colunasPastelariaUnica.forEach((col, idx) => {
          const cx = xInicio + wNomeColPast + idx * wColPast;
          p.drawLine(cx, curY, cx, curY - rowH, '0.9 0.9 0.9', 0.3);

          const q = linha.quantidades[col.id] || 0;
          if (q > 0) {
            const sq = String(q);
            const posX = cx + wColPast / 2 - sq.length * 2.2;
            p.drawText(sq, posX, curY - (rowH - 3), 8, isBase, '0 0 0');
          }
        });

        p.drawLine(xTotPast, curY, xTotPast, curY - rowH, '0.4 0.4 0.4', 0.6);
        const valTotLinha = colunasPastelariaUnica.reduce((acc, c) => acc + (linha.quantidades[c.id] || 0), 0);
        if (valTotLinha > 0) {
          const strTotL = String(valTotLinha);
          p.drawText(strTotL, xTotPast + wTotPastCol / 2 - strTotL.length * 2.2, curY - (rowH - 3), 8, true, '0 0 0');
        }

        curY -= rowH;
      });
    });

    // Linha de Rodapé TOTAL GERAL PASTELARIA
    if (curY - 15 < 80) {
      p = doc.addPage();
      curY = 565;
      curY = desenharCabecalhoPastelaria(p, curY);
    }
    p.drawLine(xInicio, curY, xInicio + wTotalTabela, curY, '0 0 0', 1.2);
    p.drawLine(xInicio, curY - 15, xInicio + wTotalTabela, curY - 15, '0 0 0', 1.2);
    p.drawText('TOTAL GERAL PASTELARIA', xInicio + 5, curY - 11, 8, true, '0 0 0');

    colunasPastelariaUnica.forEach((col, idx) => {
      const cx = xInicio + wNomeColPast + idx * wColPast;
      p.drawLine(cx, curY, cx, curY - 15, '0.5 0.5 0.5', 0.5);
      const totCol = dados.totaisColunasPastelaria?.[col.id] || 0;
      if (totCol > 0) {
        const stc = String(totCol);
        const posX = cx + wColPast / 2 - stc.length * 2.2;
        p.drawText(stc, posX, curY - 11, 8, true, '0 0 0');
      }
    });

    p.drawLine(xTotPast, curY, xTotPast, curY - 15, '0 0 0', 1.2);
    const stTotPastFinal = String(dados.totalGeralPastelaria ?? 0);
    p.drawText(stTotPastFinal, xTotPast + wTotPastCol / 2 - stTotPastFinal.length * 2.3, curY - 11, 8.5, true, '0 0 0');
    curY -= 20;

    // Resumo Geral Consolidado & Assinaturas de Expedição (sem qualquer texto cortado ou fora das caixas)
    if (curY - 60 < 25) {
      p = doc.addPage();
      curY = 565;
    }

    p.drawLine(xInicio, curY, xInicio + wTotalTabela, curY, '0 0 0', 1.2);
    p.drawLine(xInicio, curY - 18, xInicio + wTotalTabela, curY - 18, '0 0 0', 1.2);

    p.drawText('TOTAL GERAL A BORDO (PADARIA + PASTELARIA)', xInicio + 6, curY - 12.5, 8.5, true, '0 0 0');
    const grandTotStr = `${dados.totalGeralUnidades ?? dados.totalGeral ?? 0} un.`;
    p.drawText(grandTotStr, xInicio + wTotalTabela - 75, curY - 12.5, 9.5, true, '0 0 0');
    curY -= 26;

    const wAssinatura = (wTotalTabela - 20) / 2;
    const boxH = 30;
    // Caixa 1: Expedição / Fabrico
    p.drawRect(xInicio, curY - boxH, wAssinatura, boxH, null, '0.3 0.3 0.3');
    p.drawText('Chefe de Expedição / Fabrico:', xInicio + 8, curY - 11, 7.5, true, '0 0 0');
    p.drawText('Visto Expedição: [                                                ]', xInicio + 8, curY - 22, 7, false, '0.3 0.3 0.3');

    // Caixa 2: Conferência dos Condutores (perfeitamente alinhada e contida no contentor)
    const c2X = xInicio + wAssinatura + 20;
    p.drawRect(c2X, curY - boxH, wAssinatura, boxH, null, '0.3 0.3 0.3');
    p.drawText('Conferência dos Condutores:', c2X + 8, curY - 11, 7.5, true, '0 0 0');
    p.drawText('Conferido em Partida: [                          ]  •  Hora: ____ : ____', c2X + 8, curY - 22, 7, false, '0.3 0.3 0.3');
  }

  // 3. Folha 3: Pastelaria Completa (1 Página com Resumo Geral e Assinaturas)
  p = doc.addPage();
  renderizarTabelaPastelaria();

  return doc.toBuffer();
}

/**
 * Constrói o PDF Oficial da Folha de Carga (Guia de Carga Conjunta - Matriz de Todas as Rotas)
 * Substitui o modelo antigo segregado de carrinhas pelo formato consolidado solicitado pela gerência.
 */
export function gerarPdfFolhaCargaCarrinhas(params: ParametrosFolhaCargaPdf | string): Buffer {
  return gerarPdfGuiaCargaConjunta(params);
}
