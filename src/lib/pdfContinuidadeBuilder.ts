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
 * Constrói o PDF Oficial: Folha Diária de Fabrico (Plano BCP)
 * Réplica exata do layout e conteúdo da aplicação:
 * - CADERNO 1: Folha Diária de Fabrico Consolidada (Totais gerais, Padaria com Subtotal,
 *   Pastelaria com Subtotal, discriminação Base • B2B • Enc, checkboxes de fornada/confeção).
 * - CADERNO 2: Folha de Fabrico de Encomendas Discriminadas por Loja e Domicílio
 *   (Cards de encomenda com cliente, hora, itens e checkboxes de embalamento).
 * Economia de Tinteiro: 100% fundo branco e sem caixas com preenchimento sólido de tinta.
 */
export function gerarPdfFolhaFabricoLojas(params: ParametrosFolhaFabricoPdf | string): Buffer {
  let dataOperacao = '';
  let dataFormatada = '';
  let lojas: Loja[] = [];
  let encomendas: Encomenda[] = [];
  let carrinhas: Carrinha[] = [];
  let baseFixaCarrinhas: BaseFixaCarrinha[] = [];
  let clientesB2B: ClienteEmpresarialB2B[] = [];
  let basesRecorrentes: BaseDiariaRecorrente[] = [];
  let produtos: Produto[] = [];
  let ajustesAdhoc: Record<string, number> | undefined;

  if (typeof params === 'string') {
    dataOperacao = new Date().toISOString().split('T')[0];
    dataFormatada = params;
    lojas = LOJAS_MOCK;
    encomendas = ENCOMENDAS_MOCK;
    carrinhas = CARRINHAS_MOCK;
    baseFixaCarrinhas = BASE_FIXA_CARRINHAS_INICIAL;
    clientesB2B = CLIENTES_EMPRESARIAIS_B2B_INICIAIS;
    produtos = PRODUTOS_MOCK;
  } else {
    dataOperacao = params.dataOperacao;
    dataFormatada = params.dataFormatada;
    lojas = params.lojas && params.lojas.length > 0 ? params.lojas : LOJAS_MOCK;
    encomendas = params.encomendas || [];
    carrinhas = params.carrinhas && params.carrinhas.length > 0 ? params.carrinhas : CARRINHAS_MOCK;
    baseFixaCarrinhas = params.baseFixaCarrinhas || BASE_FIXA_CARRINHAS_INICIAL;
    clientesB2B = params.clientesB2B || CLIENTES_EMPRESARIAIS_B2B_INICIAIS;
    basesRecorrentes = params.basesRecorrentes || [];
    produtos = params.produtos && params.produtos.length > 0 ? params.produtos : PRODUTOS_MOCK;
    ajustesAdhoc = params.ajustesAdhoc;
  }

  const doc = new NativePdfDocument(`Folha_Fabrico_${dataFormatada.replace(/\//g, '-')}`, 'portrait');

  // =============================================================
  // CADERNO 1: FOLHA DIÁRIA DE FABRICO CONSOLIDADA
  // Exata tabela de fabrico da app (Bases Diárias + Clientes B2B + Encomendas)
  // =============================================================
  const poolConsolidada = calcularPoolFabricoConsolidada({
    dataAlvo: dataOperacao,
    carrinhas,
    baseFixaCarrinhas,
    clientesB2B,
    basesRecorrentes,
    encomendas,
    produtos,
    ajustesCustom: ajustesAdhoc,
    selectedLojaId: 'todas',
    selectedCarrinhaId: 'todas',
    filtroTipologia: 'todas',
    setorAtivo: 'todos',
  });

  const itensPadaria = poolConsolidada.filter((it) => it.setor === 'padaria');
  const itensPastelaria = poolConsolidada.filter((it) => it.setor === 'pastelaria');
  const totalPadaria = itensPadaria.reduce((acc, it) => acc + it.quantidade_total, 0);
  const totalPastelaria = itensPastelaria.reduce((acc, it) => acc + it.quantidade_total, 0);
  const totalGeral = totalPadaria + totalPastelaria;

  let p = doc.currentPage;
  const xMargin = 35;
  const wContent = 525;

  function desenharCabecalhoCaderno1(page: PdfPageWriter, startY: number): number {
    page.drawRect(xMargin, startY - 42, wContent, 42, null, '0.2 0.2 0.2');
    page.drawText('PADARIA DA VILA - CENTRO DE FABRICO', xMargin + 10, startY - 14, 11, true, '0 0 0');
    page.drawText(`FOLHA DIÁRIA DE FABRICO CONSOLIDADA • OPERAÇÃO DE ${dataFormatada}`, xMargin + 10, startY - 26, 8, true, '0.2 0.2 0.2');
    page.drawText('Fabrico Próprio de Pão Tradicional e Pastelaria Fina • Centro de Fabrico Arouca', xMargin + 10, startY - 36, 7, false, '0.3 0.3 0.3');

    page.drawRect(xMargin + wContent - 145, startY - 38, 135, 34, null, '0.3 0.3 0.3');
    page.drawText('CADERNO 1: FABRICO GERAL', xMargin + wContent - 138, startY - 18, 6.5, true, '0 0 0');
    page.drawText(`Data: ${dataFormatada}`, xMargin + wContent - 138, startY - 30, 8, true, '0 0 0');

    // 4 Caixas Resumo (Sem fundo preenchido)
    const cardY = startY - 76;
    const cardW = 125;
    page.drawRect(xMargin, cardY, cardW, 28, null, '0.3 0.3 0.3');
    page.drawText('TOTAL A PRODUZIR', xMargin + 7, cardY + 18, 6.5, true, '0.4 0.4 0.4');
    page.drawText(`${totalGeral} un.`, xMargin + 7, cardY + 6, 10, true, '0 0 0');
    page.drawText('unidades globais', xMargin + 65, cardY + 6, 6.5, false, '0.4 0.4 0.4');

    page.drawRect(xMargin + 133, cardY, cardW, 28, null, '0.3 0.3 0.3');
    page.drawText('SETOR PADARIA', xMargin + 140, cardY + 18, 6.5, true, '0.4 0.4 0.4');
    page.drawText(`${totalPadaria} un.`, xMargin + 140, cardY + 6, 10, true, '0 0 0');
    page.drawText('pães e broas', xMargin + 195, cardY + 6, 6.5, false, '0.4 0.4 0.4');

    page.drawRect(xMargin + 266, cardY, cardW, 28, null, '0.3 0.3 0.3');
    page.drawText('SETOR PASTELARIA', xMargin + 273, cardY + 18, 6.5, true, '0.4 0.4 0.4');
    page.drawText(`${totalPastelaria} un.`, xMargin + 273, cardY + 6, 10, true, '0 0 0');
    page.drawText('pastelaria e doçaria', xMargin + 328, cardY + 6, 6.5, false, '0.4 0.4 0.4');

    page.drawRect(xMargin + 399, cardY, 126, 28, null, '0.3 0.3 0.3');
    page.drawText('LINHAS DE FABRICO', xMargin + 406, cardY + 18, 6.5, true, '0.4 0.4 0.4');
    page.drawText(`${poolConsolidada.length}`, xMargin + 406, cardY + 6, 10, true, '0 0 0');
    page.drawText('artigos distintos', xMargin + 435, cardY + 6, 6.5, false, '0.4 0.4 0.4');

    return cardY - 14;
  }

  let curY = desenharCabecalhoCaderno1(p, 792);

  // TABELA 1: PADARIA
  if (itensPadaria.length > 0) {
    p.drawRect(xMargin, curY - 14, wContent, 14, '0.95 0.95 0.95', '0.2 0.2 0.2');
    p.drawText('SETOR DE PADARIA & PÃO TRADICIONAL', xMargin + 6, curY - 10, 8, true, '0 0 0');
    p.drawText(`Subtotal: ${totalPadaria} un.`, xMargin + wContent - 100, curY - 10, 8, true, '0 0 0');
    curY -= 14;

    p.drawRect(xMargin, curY - 12, wContent, 12, null, '0.4 0.4 0.4');
    p.drawText('Artigo / Pão', xMargin + 6, curY - 9, 7, true, '0 0 0');
    p.drawText('Quantidade', xMargin + 165, curY - 9, 7, true, '0 0 0');
    p.drawText('Encomendas', xMargin + 225, curY - 9, 7, true, '0 0 0');
    p.drawText('Discriminação (Base • B2B • Enc) / Personalizações', xMargin + 285, curY - 9, 7, true, '0 0 0');
    p.drawText('Fornada [  ]', xMargin + wContent - 55, curY - 9, 7, true, '0 0 0');
    curY -= 12;

    itensPadaria.forEach((it) => {
      if (curY - 12 < 45) {
        p = doc.addPage();
        curY = 790;
        p.drawRect(xMargin, curY - 12, wContent, 12, null, '0.3 0.3 0.3');
        p.drawText(`SETOR DE PADARIA (Continuação) • ${dataFormatada}`, xMargin + 6, curY - 9, 7.5, true, '0.2 0.2 0.2');
        curY -= 16;
      }

      p.drawRect(xMargin, curY - 12, wContent, 12, null, '0.8 0.8 0.8');
      p.drawText(it.produto_nome.slice(0, 32), xMargin + 6, curY - 9, 7.5, true, '0 0 0');
      p.drawText(`${it.quantidade_total} ${it.unidade || 'un.'}`, xMargin + 165, curY - 9, 8, true, '0 0 0');
      p.drawText(it.encomendas_count ? `${it.encomendas_count} enc.` : '-', xMargin + 230, curY - 9, 7, false, '0.3 0.3 0.3');

      let discrim = `Base: ${it.qtd_bases_diarias || 0} • B2B: ${it.qtd_clientes_b2b || 0} • Enc: ${it.qtd_encomendas || 0}`;
      if (it.personalizacoes && it.personalizacoes.length > 0) {
        discrim += ` • ${it.personalizacoes.join(', ')}`;
      }
      p.drawText(discrim.slice(0, 52), xMargin + 285, curY - 9, 6.5, false, '0.2 0.2 0.2');
      p.drawText('[ ] Cozido', xMargin + wContent - 55, curY - 9, 6.5, false, '0.4 0.4 0.4');
      curY -= 12;
    });

    // Linha de Subtotal Padaria
    p.drawRect(xMargin, curY - 13, wContent, 13, null, '0.2 0.2 0.2');
    p.drawText('SUBTOTAL PADARIA', xMargin + 6, curY - 10, 7.5, true, '0 0 0');
    p.drawText(`${totalPadaria} un.`, xMargin + 165, curY - 10, 8, true, '0 0 0');
    curY -= 18;
  }

  // TABELA 2: PASTELARIA
  if (itensPastelaria.length > 0) {
    if (curY - 35 < 45) {
      p = doc.addPage();
      curY = 790;
    }

    p.drawRect(xMargin, curY - 14, wContent, 14, '0.95 0.95 0.95', '0.2 0.2 0.2');
    p.drawText('SETOR DE PASTELARIA FINA & CONFEITARIA', xMargin + 6, curY - 10, 8, true, '0 0 0');
    p.drawText(`Subtotal: ${totalPastelaria} un.`, xMargin + wContent - 100, curY - 10, 8, true, '0 0 0');
    curY -= 14;

    p.drawRect(xMargin, curY - 12, wContent, 12, null, '0.4 0.4 0.4');
    p.drawText('Artigo / Doce', xMargin + 6, curY - 9, 7, true, '0 0 0');
    p.drawText('Quantidade', xMargin + 165, curY - 9, 7, true, '0 0 0');
    p.drawText('Encomendas', xMargin + 225, curY - 9, 7, true, '0 0 0');
    p.drawText('Discriminação (Base • B2B • Enc) / Personalizações', xMargin + 285, curY - 9, 7, true, '0 0 0');
    p.drawText('Confeção [  ]', xMargin + wContent - 55, curY - 9, 7, true, '0 0 0');
    curY -= 12;

    itensPastelaria.forEach((it) => {
      if (curY - 12 < 45) {
        p = doc.addPage();
        curY = 790;
        p.drawRect(xMargin, curY - 12, wContent, 12, null, '0.3 0.3 0.3');
        p.drawText(`SETOR DE PASTELARIA (Continuação) • ${dataFormatada}`, xMargin + 6, curY - 9, 7.5, true, '0.2 0.2 0.2');
        curY -= 16;
      }

      p.drawRect(xMargin, curY - 12, wContent, 12, null, '0.8 0.8 0.8');
      p.drawText(it.produto_nome.slice(0, 32), xMargin + 6, curY - 9, 7.5, true, '0 0 0');
      p.drawText(`${it.quantidade_total} ${it.unidade || 'un.'}`, xMargin + 165, curY - 9, 8, true, '0 0 0');
      p.drawText(it.encomendas_count ? `${it.encomendas_count} enc.` : '-', xMargin + 230, curY - 9, 7, false, '0.3 0.3 0.3');

      let discrim = `Base: ${it.qtd_bases_diarias || 0} • B2B: ${it.qtd_clientes_b2b || 0} • Enc: ${it.qtd_encomendas || 0}`;
      if (it.personalizacoes && it.personalizacoes.length > 0) {
        discrim += ` • ${it.personalizacoes.join(', ')}`;
      }
      p.drawText(discrim.slice(0, 52), xMargin + 285, curY - 9, 6.5, false, '0.2 0.2 0.2');
      p.drawText('[ ] Pronto', xMargin + wContent - 55, curY - 9, 6.5, false, '0.4 0.4 0.4');
      curY -= 12;
    });

    // Linha de Subtotal Pastelaria
    p.drawRect(xMargin, curY - 13, wContent, 13, null, '0.2 0.2 0.2');
    p.drawText('SUBTOTAL PASTELARIA', xMargin + 6, curY - 10, 7.5, true, '0 0 0');
    p.drawText(`${totalPastelaria} un.`, xMargin + 165, curY - 10, 8, true, '0 0 0');
    curY -= 18;
  }

  // Bloco de Assinaturas de Turno do Caderno 1
  if (curY - 24 < 45) {
    p = doc.addPage();
    curY = 790;
  }
  p.drawRect(xMargin, curY - 24, wContent, 24, null, '0.3 0.3 0.3');
  p.drawText('Chefe de Turno de Fabrico: ________________________', xMargin + 10, curY - 15, 7, false, '0.3 0.3 0.3');
  p.drawText('Conferência de Expedição: ________________________', xMargin + 280, curY - 15, 7, false, '0.3 0.3 0.3');

  // =============================================================
  // CADERNO 2: FOLHA DE FABRICO DE ENCOMENDAS DISCRIMINADAS POR LOJA E DOMICÍLIO
  // Garante que todas as encomendas ativas são discriminadas sem omitir nenhuma.
  // =============================================================
  const lojasAtivas = lojas.filter((l) => l.ativo !== false);
  const idsLojasAtivas = new Set(lojasAtivas.map((l) => l.id));

  const gruposLojaFabrico: { loja: Loja; encomendas: Encomenda[] }[] = [];

  lojasAtivas.forEach((loja) => {
    const encsLoja = encomendas.filter((enc) => {
      const matchesLoja = enc.loja_id === loja.id;
      const matchesData = enc.data_agendamento === dataOperacao;
      const naoCancelada = enc.estado !== 'cancelado';
      return matchesLoja && matchesData && naoCancelada;
    });
    if (encsLoja.length > 0) {
      gruposLojaFabrico.push({ loja, encomendas: encsLoja });
    }
  });

  // Encomendas sem loja_id ou de entrega ao domicílio não associadas às lojas da lista
  const encsDomicilioGerais = encomendas.filter((enc) => {
    const semLojaOuVirtual = !enc.loja_id || !idsLojasAtivas.has(enc.loja_id);
    const matchesData = enc.data_agendamento === dataOperacao;
    const naoCancelada = enc.estado !== 'cancelado';
    return semLojaOuVirtual && matchesData && naoCancelada;
  });

  if (encsDomicilioGerais.length > 0) {
    gruposLojaFabrico.push({
      loja: {
        id: 'sem_loja',
        nome: 'Entregas ao Domicílio & Expedição Geral',
        codigo: 'domicilio',
        morada: 'Centro de Fabrico / Distribuição Central',
        telefone: '',
        ativo: true,
      } as Loja,
      encomendas: encsDomicilioGerais,
    });
  }

  // Se houver encomendas para imprimir em Caderno 2, adiciona cada grupo
  if (gruposLojaFabrico.length > 0) {
    gruposLojaFabrico.forEach((grupo, idxLoja) => {
      p = doc.addPage();
      const loja = grupo.loja;

      const encsLoja = grupo.encomendas
        .map((enc) => {
          const itensValidos = (enc.itens || [])
            .filter((it) => it.estado_producao !== 'recusado' && Number(it.quantidade) > 0)
            .map((it) => ({
              ...it,
              quantidade: Number(it.quantidade),
              produto_nome: String(it.produto_nome || '').trim(),
            }));
          const totalEnc = itensValidos.reduce((acc, it) => acc + it.quantidade, 0);
          return {
            ...enc,
            itensValidos,
            totalEnc,
          };
        })
        .filter((enc) => enc.totalEnc > 0)
        .sort((a, b) => (a.hora_agendamento || '10:00').localeCompare(b.hora_agendamento || '10:00'));

      const totalEncsLoja = encsLoja.length;
      const totalUnidadesLoja = encsLoja.reduce((acc, e) => acc + e.totalEnc, 0);
      const totalPadariaLoja = encsLoja.reduce(
        (acc, e) => acc + e.itensValidos.filter((i) => i.setor === 'padaria').reduce((s, i) => s + i.quantidade, 0),
        0
      );
      const totalPastelariaLoja = encsLoja.reduce(
        (acc, e) => acc + e.itensValidos.filter((i) => i.setor === 'pastelaria' || i.setor !== 'padaria').reduce((s, i) => s + i.quantidade, 0),
        0
      );

      // Cabeçalho da Loja / Domicílios
      p.drawRect(35, 750, 525, 42, null, '0.2 0.2 0.2');
      p.drawText('PADARIA DA VILA - CENTRO DE FABRICO', 45, 776, 11, true, '0 0 0');
      p.drawText(`CADERNO 2: ENCOMENDAS POR LOJA • OPERAÇÃO DE ${dataFormatada}`, 45, 764, 8, true, '0.2 0.2 0.2');
      p.drawText(`${loja.nome} • ${loja.morada || 'Arouca'}${loja.telefone ? ` • Tel: ${loja.telefone}` : ''}`, 45, 754, 7, false, '0.3 0.3 0.3');

      p.drawRect(425, 755, 125, 32, null, '0.3 0.3 0.3');
      p.drawText('CADERNO 2: ENCOMENDAS', 432, 774, 6.5, true, '0 0 0');
      p.drawText(`Data: ${dataFormatada}`, 432, 763, 7.5, true, '0 0 0');

      // Cartões de Resumo da Loja
      p.drawRect(35, 714, 125, 28, null, '0.3 0.3 0.3');
      p.drawText('TOTAL ENCOMENDAS', 42, 730, 6.5, true, '0.4 0.4 0.4');
      p.drawText(`${totalEncsLoja}`, 42, 718, 10, true, '0 0 0');
      p.drawText('encomendas ativas', 68, 718, 6.5, false, '0.4 0.4 0.4');

      p.drawRect(168, 714, 125, 28, null, '0.3 0.3 0.3');
      p.drawText('TOTAL A PRODUZIR', 175, 730, 6.5, true, '0.4 0.4 0.4');
      p.drawText(`${totalUnidadesLoja} un.`, 175, 718, 10, true, '0 0 0');
      p.drawText('artigos encomendados', 225, 718, 6.5, false, '0.4 0.4 0.4');

      p.drawRect(301, 714, 125, 28, null, '0.3 0.3 0.3');
      p.drawText('PADARIA (PÃES)', 308, 730, 6.5, true, '0.4 0.4 0.4');
      p.drawText(`${totalPadariaLoja} un.`, 308, 718, 10, true, '0 0 0');
      p.drawText('pães e broas', 355, 718, 6.5, false, '0.4 0.4 0.4');

      p.drawRect(434, 714, 126, 28, null, '0.3 0.3 0.3');
      p.drawText('PASTELARIA (DOCES)', 441, 730, 6.5, true, '0.4 0.4 0.4');
      p.drawText(`${totalPastelariaLoja} un.`, 441, 718, 10, true, '0 0 0');
      p.drawText('pastelaria e doçaria', 495, 718, 6.5, false, '0.4 0.4 0.4');

      let currentY = 700;

      if (encsLoja.length === 0) {
        p.drawRect(35, currentY - 20, 525, 20, null, '0.4 0.4 0.4');
        p.drawText('Sem encomendas agendadas para este grupo na data indicada.', 150, currentY - 12, 8, false, '0.4 0.4 0.4');
        currentY -= 30;
      } else {
        encsLoja.forEach((enc) => {
          const hasNotes = Boolean(
            enc.notas_cliente || enc.observacoes_producao || (enc.tipo === 'entrega_domicilio' && enc.cliente?.morada)
          );
          const itemRowsCount = enc.itensValidos.length;
          const estimatedHeight = 15 + (hasNotes ? 11 : 0) + 12 + (itemRowsCount * 12) + 12 + 10;

          if (currentY - estimatedHeight < 65) {
            p = doc.addPage();
            currentY = 790;
            p.drawRect(35, currentY - 14, 525, 14, null, '0.3 0.3 0.3');
            p.drawText(`${loja.nome} (Continuação) • ${dataFormatada}`, 45, currentY - 10, 7.5, true, '0.2 0.2 0.2');
            currentY -= 20;
          }

          // Cabeçalho da Encomenda
          p.drawRect(35, currentY - 14, 525, 14, null, '0.4 0.4 0.4');
          p.drawText(enc.codigo || '#ENC', 42, currentY - 10, 7.5, true, '0 0 0');
          p.drawText(enc.hora_agendamento || '10:00', 145, currentY - 10, 7.5, true, '0 0 0');
          p.drawText(enc.tipo === 'entrega_domicilio' ? '[Domicílio]' : '[Balcão]', 185, currentY - 10, 7, false, '0.2 0.2 0.2');
          p.drawText((enc.cliente?.nome || 'Cliente').slice(0, 32), 245, currentY - 10, 7.5, true, '0 0 0');
          if (enc.cliente?.telefone) {
            p.drawText(`Tel: ${enc.cliente.telefone}`, 440, currentY - 10, 7, false, '0.3 0.3 0.3');
          }
          currentY -= 14;

          // Notas / Observações / Morada
          if (hasNotes) {
            const notesParts: string[] = [];
            if (enc.notas_cliente) notesParts.push(`Nota: ${enc.notas_cliente}`);
            if (enc.observacoes_producao) notesParts.push(`Obs Produção: ${enc.observacoes_producao}`);
            if (enc.tipo === 'entrega_domicilio' && enc.cliente?.morada) notesParts.push(`Morada: ${enc.cliente.morada}`);
            const notesStr = notesParts.join(' • ');

            p.drawRect(35, currentY - 11, 525, 11, null, '0.5 0.5 0.5');
            p.drawText(notesStr.slice(0, 95), 42, currentY - 8, 6.5, false, '0.2 0.2 0.2');
            currentY -= 11;
          }

          // Tabela de Artigos desta Encomenda
          p.drawRect(35, currentY - 12, 525, 12, null, '0.3 0.3 0.3');
          p.drawText('Artigo / Produto a Produzir', 42, currentY - 9, 6.5, true, '0 0 0');
          p.drawText('Setor', 240, currentY - 9, 6.5, true, '0 0 0');
          p.drawText('Quantidade', 300, currentY - 9, 6.5, true, '0 0 0');
          p.drawText('Personalização / Especificações', 370, currentY - 9, 6.5, true, '0 0 0');
          p.drawText('Fabrico [  ]', 485, currentY - 9, 6.5, true, '0 0 0');
          currentY -= 12;

          enc.itensValidos.forEach((it) => {
            p.drawRect(35, currentY - 12, 525, 12, null, '0.6 0.6 0.6');
            p.drawText(it.produto_nome.slice(0, 36), 42, currentY - 9, 7, true, '0 0 0');
            p.drawText(it.setor === 'pastelaria' ? 'Pastelaria' : 'Padaria', 240, currentY - 9, 6.5, false, '0.3 0.3 0.3');
            p.drawText(`${it.quantidade} un.`, 300, currentY - 9, 7.5, true, '0 0 0');
            p.drawText((it.notas_personalizacao || 'Padrão da receita').slice(0, 32), 370, currentY - 9, 6.5, false, '0.3 0.3 0.3');
            p.drawText('[ ] Pronto / Emb.', 485, currentY - 9, 6.5, false, '0.4 0.4 0.4');
            currentY -= 12;
          });

          // Rodapé da Encomenda
          p.drawRect(35, currentY - 12, 525, 12, null, '0.4 0.4 0.4');
          p.drawText(`${enc.itensValidos.length} artigo(s) nesta encomenda`, 42, currentY - 9, 6.5, false, '0.4 0.4 0.4');
          p.drawText(`Total: ${enc.totalEnc} un.`, 300, currentY - 9, 7.5, true, '0 0 0');
          p.drawText('Conferência de embalamento [ ]', 415, currentY - 9, 6.5, false, '0.4 0.4 0.4');
          currentY -= 18;
        });
      }

      // Subtotal da Loja
      if (currentY - 24 < 55) {
        p = doc.addPage();
        currentY = 790;
      }
      p.drawRect(35, currentY - 18, 525, 18, null, '0.2 0.2 0.2');
      p.drawText(`SUBTOTAL ${loja.nome.toUpperCase()}`, 42, currentY - 12, 7.5, true, '0 0 0');
      const strMetricas = `${encsLoja.length} Enc. • Padaria: ${totalPadariaLoja} un. • Pastelaria: ${totalPastelariaLoja} un. • Total: ${totalUnidadesLoja} un.`;
      const wMetricas = strMetricas.length * 3.8;
      const posMetricasX = Math.max(240, 555 - wMetricas);
      p.drawText(strMetricas, posMetricasX, currentY - 12, 7.5, true, '0 0 0');
      currentY -= 26;

      // Bloco de Assinaturas da Loja
      if (currentY - 26 < 45) {
        p = doc.addPage();
        currentY = 790;
      }
      p.drawRect(35, currentY - 24, 525, 24, null, '0.3 0.3 0.3');
      p.drawText('Chefe de Turno de Fabrico: ________________________', 45, currentY - 15, 7, false, '0.3 0.3 0.3');
      p.drawText('Conferência de Expedição: ________________________', 310, currentY - 15, 7, false, '0.3 0.3 0.3');
    });
  }

  return doc.toBuffer();
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
      ? '1. SECÇÃO PADARIA (PARTE 1 DE 2: COLUNAS 1 A 17)'
      : '1. SECÇÃO PADARIA (PARTE 2 DE 2: COLUNAS 18 A 34)';
    page.drawText(`PADARIA DA VILA - GUIA OFICIAL DE CARGA CONJUNTA • ${subtituloParte}`, xInicio + 8, startY - 11, 9, true, '0 0 0');
    page.drawText(`Operação de ${dados.data || dataFormatada} • (${colunasRotasAtivas.length} rotas ativas: Porta a Porta + Clientes Empresariais + Encomendas) • BCP`, xInicio + 8, startY - 21, 6.5, false, '0.3 0.3 0.3');

    const badgeTexto = parteNum === 1
      ? `Subtotal P1: ${subtotalGeralPadariaP1} un.`
      : `Total Padaria: ${dados.totalGeralPadaria ?? 0} un.`;
    page.drawText(badgeTexto, xInicio + wTotalTabela - 140, startY - 16, 8, true, '0 0 0');

    const tableTop = startY - 30;
    const headerH = 72;
    page.drawRect(xInicio, tableTop - headerH, wTotalTabela, headerH, null, '0 0 0');
    page.drawText('Rota / Cliente / Paragem', xInicio + 6, tableTop - 45, 8, true, '0 0 0');

    cols.forEach((col, idx) => {
      const cx = xInicio + wNomeColPad + idx * wColPad;
      page.drawLine(cx, tableTop, cx, tableTop - headerH, '0.7 0.7 0.7', 0.4);
      page.drawRotatedText(col.label, cx + 20, tableTop - 68, 7.5, true, '0 0 0');
    });

    page.drawLine(xTotPad, tableTop, xTotPad, tableTop - headerH, '0 0 0', 0.8);
    const labelTotCol = parteNum === 1 ? 'SUBTOTAL' : 'TOTAL';
    const subLabelTotCol = parteNum === 1 ? '(P1)' : 'PADARIA';
    page.drawText(labelTotCol, xTotPad + 4, tableTop - 38, 7, true, '0 0 0');
    page.drawText(subLabelTotCol, xTotPad + 4, tableTop - 50, 7, true, '0 0 0');

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
      const rotuloRotaHeader = `${grupo.rotaNome} — ${grupo.nomeCondutor || 'Condutor'} ${grupo.matricula ? '(' + grupo.matricula + ')' : ''}`.toUpperCase();
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
  // 2. SECÇÃO PASTELARIA FINA - REPARTIDA POR 2 FOLHAS HORIZONTAIS COM LETRA 8
  // Total de 18 colunas:
  // - Parte 1: 9 colunas (0 a 8) + Subtotal P1
  // - Parte 2: 9 colunas (9 a 17) + Total Pastelaria + Assinaturas
  // ==============================================================
  const colunasPastelariaP1 = colunasPastelaria.slice(0, 9);
  const colunasPastelariaP2 = colunasPastelaria.slice(9, 18);

  const wNomeColPast = 190;
  const wColPast = 61; // 9 colunas * 61 = 549 pt
  const wTotPastCol = 59; // 190 + 549 + 59 = 798 pt
  const xTotPast = xInicio + wNomeColPast + 9 * wColPast; // 22 + 190 + 549 = 761 pt

  const subtotalGeralPastP1 = colunasPastelariaP1.reduce((acc, col) => acc + (dados.totaisColunasPastelaria?.[col.id] || 0), 0);
  const subtotalGeralPastP2 = colunasPastelariaP2.reduce((acc, col) => acc + (dados.totaisColunasPastelaria?.[col.id] || 0), 0);

  const gruposPastelaria = grupos.filter((g) => (g.totalPastelariaRota || 0) > 0);

  function desenharCabecalhoPastelariaParte(page: PdfPageWriter, startY: number, cols: typeof colunasPastelariaP1, parteNum: 1 | 2): number {
    page.drawRect(xInicio, startY - 26, wTotalTabela, 26, null, '0 0 0');
    const subtituloParte = parteNum === 1
      ? '2. SECÇÃO PASTELARIA FINA (PARTE 1 DE 2: COLUNAS 1 A 9)'
      : '2. SECÇÃO PASTELARIA FINA (PARTE 2 DE 2: COLUNAS 10 A 18)';
    page.drawText(`PADARIA DA VILA - GUIA OFICIAL DE CARGA CONJUNTA • ${subtituloParte}`, xInicio + 8, startY - 11, 9, true, '0 0 0');
    page.drawText(`Operação de ${dados.data || dataFormatada} • (${colunasRotasAtivas.length} rotas ativas: Porta a Porta + Clientes Empresariais + Encomendas) • BCP`, xInicio + 8, startY - 21, 6.5, false, '0.3 0.3 0.3');

    const badgeTexto = parteNum === 1
      ? `Subtotal P1: ${subtotalGeralPastP1} un.`
      : `Total Pastelaria: ${dados.totalGeralPastelaria ?? 0} un.`;
    page.drawText(badgeTexto, xInicio + wTotalTabela - 150, startY - 16, 8, true, '0 0 0');

    const tableTop = startY - 30;
    const headerH = 65;
    page.drawRect(xInicio, tableTop - headerH, wTotalTabela, headerH, null, '0 0 0');
    page.drawText('Rota / Cliente / Paragem', xInicio + 6, tableTop - 40, 8, true, '0 0 0');

    cols.forEach((col, idx) => {
      const cx = xInicio + wNomeColPast + idx * wColPast;
      page.drawLine(cx, tableTop, cx, tableTop - headerH, '0.7 0.7 0.7', 0.4);
      page.drawRotatedText(col.label, cx + 33, tableTop - 60, 8, true, '0 0 0');
    });

    page.drawLine(xTotPast, tableTop, xTotPast, tableTop - headerH, '0 0 0', 0.8);
    const labelTotCol = parteNum === 1 ? 'SUBTOTAL' : 'TOTAL';
    const subLabelTotCol = parteNum === 1 ? '(P1)' : 'PASTELARIA';
    page.drawText(labelTotCol, xTotPast + 8, tableTop - 34, 7.5, true, '0 0 0');
    page.drawText(subLabelTotCol, xTotPast + 8, tableTop - 46, 7.5, true, '0 0 0');

    return tableTop - headerH;
  }

  function renderizarTabelaPastelaria(cols: typeof colunasPastelariaP1, parteNum: 1 | 2) {
    let curY = 565;
    curY = desenharCabecalhoPastelariaParte(p, curY, cols, parteNum);

    gruposPastelaria.forEach((grupo) => {
      const linhasComPastelaria = (grupo.linhas || []).filter((linha) => {
        const totPast = colunasPastelaria.reduce((acc, col) => acc + (linha.quantidades[col.id] || 0), 0);
        return totPast > 0;
      });

      if (linhasComPastelaria.length === 0 && (grupo.totalPastelariaRota || 0) === 0) return;

      const espacoNecessario = 13 + (linhasComPastelaria.length * 12);
      const margemInferior = parteNum === 2 ? 85 : 35;
      if (curY - espacoNecessario < margemInferior && curY < 500) {
        p = doc.addPage();
        curY = 565;
        curY = desenharCabecalhoPastelariaParte(p, curY, cols, parteNum);
      }

      // 1. Linha Divisória de Cabeçalho da Rota com Subtotais por Coluna (Letra 8)
      const rowHeaderH = 13;
      p.drawRect(xInicio, curY - rowHeaderH, wTotalTabela, rowHeaderH, '0.94 0.94 0.94', '0.2 0.2 0.2');
      const rotuloRotaHeader = `${grupo.rotaNome} — ${grupo.nomeCondutor || 'Condutor'} ${grupo.matricula ? '(' + grupo.matricula + ')' : ''}`.toUpperCase();
      p.drawText(rotuloRotaHeader.slice(0, 36), xInicio + 4, curY - (rowHeaderH - 3.5), 8, true, '0 0 0');

      let totGrupoParte = 0;
      cols.forEach((col, idx) => {
        const cx = xInicio + wNomeColPast + idx * wColPast;
        p.drawLine(cx, curY, cx, curY - rowHeaderH, '0.5 0.5 0.5', 0.4);
        const q = grupo.totaisPastelaria[col.id] || 0;
        if (q > 0) {
          totGrupoParte += q;
          const sq = String(q);
          const posX = cx + wColPast / 2 - sq.length * 2.2;
          p.drawText(sq, posX, curY - (rowHeaderH - 3.5), 8, true, '0 0 0');
        }
      });

      p.drawLine(xTotPast, curY, xTotPast, curY - rowHeaderH, '0 0 0', 0.8);
      const valTotGrupo = parteNum === 1 ? totGrupoParte : grupo.totalPastelariaRota;
      const strValTotGrupo = String(valTotGrupo);
      p.drawText(strValTotGrupo, xTotPast + wTotPastCol / 2 - strValTotGrupo.length * 2.2, curY - (rowHeaderH - 3.5), 8, true, '0 0 0');
      curY -= rowHeaderH;

      // 2. Linhas discriminadas da rota (Porta a Porta, Clientes B2B, Encomendas)
      linhasComPastelaria.forEach((linha) => {
        const margemInfLinha = parteNum === 2 ? 85 : 35;
        if (curY - 12 < margemInfLinha) {
          p = doc.addPage();
          curY = 565;
          curY = desenharCabecalhoPastelariaParte(p, curY, cols, parteNum);
        }

        const rowH = 12;
        p.drawRect(xInicio, curY - rowH, wTotalTabela, rowH, null, '0.85 0.85 0.85');

        const isBase = linha.tipo === 'rota_base';
        const nomeText = isBase ? '   Porta a Porta' : `   ${linha.nomeExibicao.slice(0, 28)}`;
        p.drawText(nomeText, xInicio + 4, curY - (rowH - 3), isBase ? 8 : 7.5, isBase, '0 0 0');

        let totLinhaParte = 0;
        cols.forEach((col, idx) => {
          const cx = xInicio + wNomeColPast + idx * wColPast;
          p.drawLine(cx, curY, cx, curY - rowH, '0.9 0.9 0.9', 0.3);

          const q = linha.quantidades[col.id] || 0;
          if (q > 0) {
            totLinhaParte += q;
            const sq = String(q);
            const posX = cx + wColPast / 2 - sq.length * 2.2;
            p.drawText(sq, posX, curY - (rowH - 3), 8, isBase, '0 0 0');
          }
        });

        p.drawLine(xTotPast, curY, xTotPast, curY - rowH, '0.4 0.4 0.4', 0.6);
        const valTotLinha = parteNum === 1
          ? totLinhaParte
          : colunasPastelaria.reduce((acc, c) => acc + (linha.quantidades[c.id] || 0), 0);
        if (valTotLinha > 0) {
          const strTotL = String(valTotLinha);
          p.drawText(strTotL, xTotPast + wTotPastCol / 2 - strTotL.length * 2.2, curY - (rowH - 3), 8, true, '0 0 0');
        }

        curY -= rowH;
      });
    });

    // Linha de Rodapé TOTAL PASTELARIA
    const margemInfRodape = parteNum === 2 ? 80 : 35;
    if (curY - 15 < margemInfRodape) {
      p = doc.addPage();
      curY = 565;
      curY = desenharCabecalhoPastelariaParte(p, curY, cols, parteNum);
    }
    p.drawLine(xInicio, curY, xInicio + wTotalTabela, curY, '0 0 0', 1.2);
    p.drawLine(xInicio, curY - 15, xInicio + wTotalTabela, curY - 15, '0 0 0', 1.2);
    const labelRodapePast = parteNum === 1 ? 'SUBTOTAL PASTELARIA (PARTE 1)' : 'TOTAL GERAL PASTELARIA';
    p.drawText(labelRodapePast, xInicio + 5, curY - 11, 8, true, '0 0 0');

    let sumTotalColsParte = 0;
    cols.forEach((col, idx) => {
      const cx = xInicio + wNomeColPast + idx * wColPast;
      p.drawLine(cx, curY, cx, curY - 15, '0.5 0.5 0.5', 0.5);
      const totCol = dados.totaisColunasPastelaria?.[col.id] || 0;
      sumTotalColsParte += totCol;
      if (totCol > 0) {
        const stc = String(totCol);
        const posX = cx + wColPast / 2 - stc.length * 2.2;
        p.drawText(stc, posX, curY - 11, 8, true, '0 0 0');
      }
    });

    p.drawLine(xTotPast, curY, xTotPast, curY - 15, '0 0 0', 1.2);
    const valRodapeGeral = parteNum === 1 ? sumTotalColsParte : (dados.totalGeralPastelaria ?? 0);
    const stTotPastFinal = String(valRodapeGeral);
    p.drawText(stTotPastFinal, xTotPast + wTotPastCol / 2 - stTotPastFinal.length * 2.3, curY - 11, 8.5, true, '0 0 0');
    curY -= 20;

    // Se for a Parte 2, adiciona Resumo Geral Consolidado e Assinaturas de Expedição
    if (parteNum === 2) {
      if (curY - 55 < 30) {
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
      p.drawRect(xInicio, curY - 24, wAssinatura, 24, null, '0.3 0.3 0.3');
      p.drawText('Chefe de Expedição / Fabrico: Visto [                    ]', xInicio + 8, curY - 15, 7, false, '0.2 0.2 0.2');

      p.drawRect(xInicio + wAssinatura + 20, curY - 24, wAssinatura, 24, null, '0.3 0.3 0.3');
      p.drawText('Conferência dos Condutores: Conferido em Partida [                    ] • Hora: ____ : ____', xInicio + wAssinatura + 16, curY - 15, 6.5, false, '0.2 0.2 0.2');
    }
  }

  // 3. Folha 3: Pastelaria Parte 1 (Colunas 1 a 9)
  p = doc.addPage();
  renderizarTabelaPastelaria(colunasPastelariaP1, 1);

  // 4. Folha 4: Pastelaria Parte 2 (Colunas 10 a 18 + Assinaturas)
  p = doc.addPage();
  renderizarTabelaPastelaria(colunasPastelariaP2, 2);

  return doc.toBuffer();
}

/**
 * Constrói o PDF Oficial da Folha de Carga (Guia de Carga Conjunta - Matriz de Todas as Rotas)
 * Substitui o modelo antigo segregado de carrinhas pelo formato consolidado solicitado pela gerência.
 */
export function gerarPdfFolhaCargaCarrinhas(params: ParametrosFolhaCargaPdf | string): Buffer {
  return gerarPdfGuiaCargaConjunta(params);
}
