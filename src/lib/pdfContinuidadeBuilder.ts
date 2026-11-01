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
} from '../types';
import {
  calcularDadosGuiaCargaConjunta,
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
  lojas: Loja[];
  encomendas: Encomenda[];
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
 * Constrói o PDF Oficial: Folha de Fabrico de Encomendas por Loja
 * Réplica exata do layout e conteúdo da aplicação (agrupado por loja, card individual por encomenda,
 * tabela de artigos discriminados e sem fundos preenchidos a tinta).
 */
export function gerarPdfFolhaFabricoLojas(params: ParametrosFolhaFabricoPdf | string): Buffer {
  let dataOperacao = '';
  let dataFormatada = '';
  let lojas: Loja[] = [];
  let encomendas: Encomenda[] = [];

  if (typeof params === 'string') {
    dataOperacao = new Date().toISOString().split('T')[0];
    dataFormatada = params;
    lojas = LOJAS_MOCK;
    encomendas = ENCOMENDAS_MOCK;
  } else {
    dataOperacao = params.dataOperacao;
    dataFormatada = params.dataFormatada;
    lojas = params.lojas && params.lojas.length > 0 ? params.lojas : LOJAS_MOCK;
    encomendas = params.encomendas || [];
  }

  const doc = new NativePdfDocument(`Folha_Fabrico_${dataFormatada.replace(/\//g, '-')}`);

  // Filtrar apenas lojas ativas
  const lojasAtivas = lojas.filter((l) => l.ativo !== false);

  lojasAtivas.forEach((loja, idx) => {
    if (idx > 0) doc.addPage();
    let p = doc.currentPage;

    // Encomendas ativas para esta loja na data da operação
    const encsLoja = encomendas
      .filter((enc) => {
        const matchesLoja = enc.loja_id === loja.id || (!enc.loja_id && loja.codigo === 'loja-1');
        const matchesData = enc.data_agendamento === dataOperacao;
        const naoCancelada = enc.estado !== 'cancelado';
        return matchesLoja && matchesData && naoCancelada;
      })
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

    // 1. Cabeçalho Oficial da Loja (Wireframe sem fundo preenchido)
    p.drawRect(35, 750, 525, 42, null, '0.2 0.2 0.2');
    p.drawText('PADARIA DA VILA - CENTRO DE FABRICO', 45, 776, 11, true, '0 0 0');
    p.drawText(`FOLHA DE FABRICO DE ENCOMENDAS POR LOJA • OPERAÇÃO DE ${dataFormatada}`, 45, 764, 8, false, '0.2 0.2 0.2');
    p.drawText(`${loja.nome} • ${loja.morada || 'Arouca'}${loja.telefone ? ` • Tel: ${loja.telefone}` : ''}`, 45, 754, 7, false, '0.3 0.3 0.3');

    p.drawRect(435, 755, 115, 32, null, '0.3 0.3 0.3');
    p.drawText('ENCOMENDAS POR LOJA', 442, 774, 6.5, true, '0 0 0');
    p.drawText(`Data: ${dataFormatada}`, 442, 763, 7.5, true, '0 0 0');

    // 2. Cartões de Resumo Wireframe (4 caixas sem fundo preenchido a tinta)
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
      p.drawText('Sem encomendas agendadas para esta loja na data indicada.', 150, currentY - 12, 8, false, '0.4 0.4 0.4');
      currentY -= 30;
    } else {
      // 3. Renderização Encomenda a Encomenda (Card discriminado idêntico à app)
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

        // Cabeçalho da Encomenda (Código com espaço dedicado, Hora, Canal e Contacto)
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
          p.drawText('[ ] Pronto / Emb.', 485, currentY - 9, 6.5, false, '0 0 0');
          currentY -= 12;
        });

        // Rodapé da Encomenda
        p.drawRect(35, currentY - 12, 525, 12, null, '0.4 0.4 0.4');
        p.drawText(`${enc.itensValidos.length} artigo(s) nesta encomenda`, 42, currentY - 9, 6.5, false, '0.4 0.4 0.4');
        p.drawText(`Total: ${enc.totalEnc} un.`, 300, currentY - 9, 7.5, true, '0 0 0');
        p.drawText('Conferência de embalamento [ ]', 415, currentY - 9, 6.5, false, '0.4 0.4 0.4');
        currentY -= 18; // Espaçamento entre encomendas
      });
    }

    // 4. Subtotal da Loja (Sem sobreposição de texto e 100% fundo branco)
    if (currentY - 24 < 55) {
      p = doc.addPage();
      currentY = 790;
    }
    p.drawRect(35, currentY - 18, 525, 18, null, '0.2 0.2 0.2');
    p.drawText(`SUBTOTAL ${loja.nome.toUpperCase()}`, 42, currentY - 12, 7.5, true, '0 0 0');
    const strMetricas = `${encsLoja.length} Enc. • Padaria: ${totalPadariaLoja} un. • Pastelaria: ${totalPastelariaLoja} un. • Total a Produzir: ${totalUnidadesLoja} un.`;
    const wMetricas = strMetricas.length * 3.8;
    const posMetricasX = Math.max(240, 555 - wMetricas);
    p.drawText(strMetricas, posMetricasX, currentY - 12, 7.5, true, '0 0 0');
    currentY -= 26;

    // 5. Bloco de Assinaturas (Sem preenchimento a tinta)
    if (currentY - 26 < 45) {
      p = doc.addPage();
      currentY = 790;
    }
    p.drawRect(35, currentY - 24, 525, 24, null, '0.3 0.3 0.3');
    p.drawText('Chefe de Turno de Fabrico: ________________________', 45, currentY - 15, 7, false, '0.3 0.3 0.3');
    p.drawText('Conferência de Expedição: ________________________', 310, currentY - 15, 7, false, '0.3 0.3 0.3');
  });

  return doc.toBuffer();
}

/**
 * Constrói o PDF Oficial: Guia de Carga Conjunta (Matriz de Todas as Rotas)
 * Layout Wireframe profissional otimizado para impressão (100% fundo branco, sem caixas e sem fundos preenchidos a tinta no rodapé).
 * Consolida Rotas 1 a 7 com identificação do condutor, matrícula, segregação por Padaria e Pastelaria, subtotais e total a bordo.
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

  // ==============================================================
  // PÁGINA 1: TABELA 1 - PADARIA (34 COLUNAS DE PRODUTOS + ROTAS E CLIENTES)
  // Layout horizontal idêntico ao modelo físico de fábrica (Word docx anexo)
  // ==============================================================
  const xInicio = 22;
  const wTotalTabela = 798;
  const wNomeColPad = 152;
  const wColPad = 18; // 34 colunas * 18 = 612 pt
  const wTotPadCol = 34; // 152 + 612 + 34 = 798 pt
  const xTotPad = xInicio + wNomeColPad + 34 * wColPad;

  function desenharCabecalhoPadaria(page: PdfPageWriter, startY: number): number {
    page.drawRect(xInicio, startY - 26, wTotalTabela, 26, null, '0 0 0');
    page.drawText('PADARIA DA VILA - GUIA OFICIAL DE CARGA CONJUNTA • SECÇÃO PADARIA', xInicio + 8, startY - 11, 9, true, '0 0 0');
    page.drawText(`Operação de ${dados.data || dataFormatada} • Mapa Global Consolidado (Rotas 1 a 7 & Clientes B2B) • BCP`, xInicio + 8, startY - 21, 6.5, false, '0.3 0.3 0.3');
    page.drawText(`Total Padaria: ${dados.totalGeralPadaria ?? 0} un.`, xInicio + wTotalTabela - 130, startY - 16, 8, true, '0 0 0');

    const tableTop = startY - 30;
    const headerH = 72;
    page.drawRect(xInicio, tableTop - headerH, wTotalTabela, headerH, null, '0 0 0');

    page.drawText('Rota / Cliente / Paragem', xInicio + 6, tableTop - 45, 7.5, true, '0 0 0');

    colunasPadaria.forEach((col, idx) => {
      const cx = xInicio + wNomeColPad + idx * wColPad;
      page.drawLine(cx, tableTop, cx, tableTop - headerH, '0.7 0.7 0.7', 0.4);
      page.drawRotatedText(col.label, cx + 11.5, tableTop - 68, 5.2, true, '0 0 0');
    });

    page.drawLine(xTotPad, tableTop, xTotPad, tableTop - headerH, '0 0 0', 0.8);
    page.drawText('TOT', xTotPad + 8, tableTop - 45, 7, true, '0 0 0');

    return tableTop - headerH;
  }

  let currentY = 565;
  currentY = desenharCabecalhoPadaria(p, currentY);

  grupos.forEach((grupo) => {
    grupo.linhas.forEach((linha) => {
      if (currentY - 11 < 35) {
        p = doc.addPage();
        currentY = 565;
        currentY = desenharCabecalhoPadaria(p, currentY);
      }

      const isBaseRota = linha.tipo === 'rota_base';
      const rowH = isBaseRota ? 11 : 9.5;
      const strokeC = isBaseRota ? '0.3 0.3 0.3' : '0.85 0.85 0.85';
      const fontSz = isBaseRota ? 6 : 5.2;

      p.drawRect(xInicio, currentY - rowH, wTotalTabela, rowH, null, strokeC);

      const nomeText = isBaseRota
        ? linha.nomeExibicao
        : `   ${linha.nomeExibicao.slice(0, 24)}`;
      p.drawText(nomeText, xInicio + (isBaseRota ? 4 : 8), currentY - (rowH - 3), fontSz, isBaseRota, '0 0 0');

      colunasPadaria.forEach((col, idx) => {
        const cx = xInicio + wNomeColPad + idx * wColPad;
        p.drawLine(cx, currentY, cx, currentY - rowH, isBaseRota ? '0.6 0.6 0.6' : '0.9 0.9 0.9', 0.3);

        const q = linha.quantidades[col.id] || 0;
        if (q > 0) {
          const sq = String(q);
          const posX = cx + wColPad / 2 - sq.length * 1.6;
          p.drawText(sq, posX, currentY - (rowH - 3), isBaseRota ? 6.5 : 5.8, isBaseRota, '0 0 0');
        }
      });

      p.drawLine(xTotPad, currentY, xTotPad, currentY - rowH, '0.4 0.4 0.4', 0.6);
      if (linha.totalLinha > 0) {
        const st = String(linha.totalLinha);
        p.drawText(st, xTotPad + 4, currentY - (rowH - 3), 6, true, '0 0 0');
      }

      currentY -= rowH;
    });
  });

  // Linha de Rodapé TOTAL PADARIA
  if (currentY - 14 < 35) {
    p = doc.addPage();
    currentY = 565;
    currentY = desenharCabecalhoPadaria(p, currentY);
  }
  p.drawLine(xInicio, currentY, xInicio + wTotalTabela, currentY, '0 0 0', 1.2);
  p.drawLine(xInicio, currentY - 13, xInicio + wTotalTabela, currentY - 13, '0 0 0', 1.2);
  p.drawText('TOTAL PADARIA', xInicio + 5, currentY - 9.5, 7, true, '0 0 0');

  colunasPadaria.forEach((col, idx) => {
    const cx = xInicio + wNomeColPad + idx * wColPad;
    p.drawLine(cx, currentY, cx, currentY - 13, '0.5 0.5 0.5', 0.5);
    const totCol = dados.totaisColunasPadaria?.[col.id] || 0;
    if (totCol > 0) {
      const stc = String(totCol);
      const posX = cx + wColPad / 2 - stc.length * 1.6;
      p.drawText(stc, posX, currentY - 9.5, 6, true, '0 0 0');
    }
  });

  p.drawLine(xTotPad, currentY, xTotPad, currentY - 13, '0 0 0', 1.2);
  const stTotPad = String(dados.totalGeralPadaria ?? 0);
  p.drawText(stTotPad, xTotPad + 4, currentY - 9.5, 7, true, '0 0 0');

  // ==============================================================
  // PÁGINA 2: TABELA 2 - PASTELARIA (18 COLUNAS DE PRODUTOS + ASSINATURAS)
  // ==============================================================
  p = doc.addPage();
  currentY = 565;

  const wNomeColPast = 186;
  const wColPast = 31; // 18 colunas * 31 = 558 pt
  const wTotPastCol = 54; // 186 + 558 + 54 = 798 pt
  const xTotPast = xInicio + wNomeColPast + 18 * wColPast;

  function desenharCabecalhoPastelaria(page: PdfPageWriter, startY: number): number {
    page.drawRect(xInicio, startY - 26, wTotalTabela, 26, null, '0 0 0');
    page.drawText('PADARIA DA VILA - GUIA OFICIAL DE CARGA CONJUNTA • SECÇÃO PASTELARIA', xInicio + 8, startY - 11, 9, true, '0 0 0');
    page.drawText(`Operação de ${dados.data || dataFormatada} • Mapa Global Consolidado (Rotas 1 a 7 & Clientes B2B) • BCP`, xInicio + 8, startY - 21, 6.5, false, '0.3 0.3 0.3');
    page.drawText(`Total Pastelaria: ${dados.totalGeralPastelaria ?? 0} un.`, xInicio + wTotalTabela - 140, startY - 16, 8, true, '0 0 0');

    const tableTop = startY - 30;
    const headerH = 60;
    page.drawRect(xInicio, tableTop - headerH, wTotalTabela, headerH, null, '0 0 0');

    page.drawText('Rota / Cliente / Paragem', xInicio + 6, tableTop - 38, 8, true, '0 0 0');

    colunasPastelaria.forEach((col, idx) => {
      const cx = xInicio + wNomeColPast + idx * wColPast;
      page.drawLine(cx, tableTop, cx, tableTop - headerH, '0.7 0.7 0.7', 0.4);
      page.drawRotatedText(col.label, cx + 18, tableTop - 56, 6, true, '0 0 0');
    });

    page.drawLine(xTotPast, tableTop, xTotPast, tableTop - headerH, '0 0 0', 0.8);
    page.drawText('TOTAL', xTotPast + 12, tableTop - 38, 7.5, true, '0 0 0');

    return tableTop - headerH;
  }

  currentY = desenharCabecalhoPastelaria(p, currentY);

  grupos.forEach((grupo) => {
    grupo.linhas.forEach((linha) => {
      if (currentY - 11 < 80) {
        p = doc.addPage();
        currentY = 565;
        currentY = desenharCabecalhoPastelaria(p, currentY);
      }

      const isBaseRota = linha.tipo === 'rota_base';
      const rowH = isBaseRota ? 11 : 9.5;
      const strokeC = isBaseRota ? '0.3 0.3 0.3' : '0.85 0.85 0.85';
      const fontSz = isBaseRota ? 6.5 : 5.5;

      p.drawRect(xInicio, currentY - rowH, wTotalTabela, rowH, null, strokeC);

      const nomeText = isBaseRota
        ? linha.nomeExibicao
        : `   ${linha.nomeExibicao.slice(0, 28)}`;
      p.drawText(nomeText, xInicio + (isBaseRota ? 4 : 8), currentY - (rowH - 3), fontSz, isBaseRota, '0 0 0');

      colunasPastelaria.forEach((col, idx) => {
        const cx = xInicio + wNomeColPast + idx * wColPast;
        p.drawLine(cx, currentY, cx, currentY - rowH, isBaseRota ? '0.6 0.6 0.6' : '0.9 0.9 0.9', 0.3);

        const q = linha.quantidades[col.id] || 0;
        if (q > 0) {
          const sq = String(q);
          const posX = cx + wColPast / 2 - sq.length * 2.0;
          p.drawText(sq, posX, currentY - (rowH - 3), isBaseRota ? 7 : 6.2, isBaseRota, '0 0 0');
        }
      });

      p.drawLine(xTotPast, currentY, xTotPast, currentY - rowH, '0.4 0.4 0.4', 0.6);
      if (linha.totalLinha > 0) {
        const st = String(linha.totalLinha);
        p.drawText(st, xTotPast + 10, currentY - (rowH - 3), 6.5, true, '0 0 0');
      }

      currentY -= rowH;
    });
  });

  // Linha de Rodapé TOTAL PASTELARIA
  p.drawLine(xInicio, currentY, xInicio + wTotalTabela, currentY, '0 0 0', 1.2);
  p.drawLine(xInicio, currentY - 14, xInicio + wTotalTabela, currentY - 14, '0 0 0', 1.2);
  p.drawText('TOTAL PASTELARIA', xInicio + 5, currentY - 10, 7.5, true, '0 0 0');

  colunasPastelaria.forEach((col, idx) => {
    const cx = xInicio + wNomeColPast + idx * wColPast;
    p.drawLine(cx, currentY, cx, currentY - 14, '0.5 0.5 0.5', 0.5);
    const totCol = dados.totaisColunasPastelaria?.[col.id] || 0;
    if (totCol > 0) {
      const stc = String(totCol);
      const posX = cx + wColPast / 2 - stc.length * 2.0;
      p.drawText(stc, posX, currentY - 10, 6.5, true, '0 0 0');
    }
  });

  p.drawLine(xTotPast, currentY, xTotPast, currentY - 14, '0 0 0', 1.2);
  const stTotPast = String(dados.totalGeralPastelaria ?? 0);
  p.drawText(stTotPast, xTotPast + 10, currentY - 10, 7.5, true, '0 0 0');
  currentY -= 20;

  // ==============================================================
  // RESUMO GERAL CONSOLIDADO & ASSINATURAS (100% FUNDO BRANCO, SEM CAIXAS)
  // ==============================================================
  p.drawLine(xInicio, currentY, xInicio + wTotalTabela, currentY, '0 0 0', 1.2);
  p.drawLine(xInicio, currentY - 18, xInicio + wTotalTabela, currentY - 18, '0 0 0', 1.2);

  p.drawText('TOTAL GERAL A BORDO (PADARIA + PASTELARIA)', xInicio + 6, currentY - 12.5, 8.5, true, '0 0 0');
  const grandTotStr = `${dados.totalGeralUnidades ?? dados.totalGeral ?? 0} un.`;
  p.drawText(grandTotStr, xInicio + wTotalTabela - 75, currentY - 12.5, 9.5, true, '0 0 0');
  currentY -= 26;

  // Assinaturas de Conferência
  const wAssinatura = (wTotalTabela - 20) / 2;
  p.drawRect(xInicio, currentY - 24, wAssinatura, 24, null, '0.3 0.3 0.3');
  p.drawText('Chefe de Expedição / Fabrico: Visto [                    ]', xInicio + 8, currentY - 15, 7, false, '0.2 0.2 0.2');

  p.drawRect(xInicio + wAssinatura + 20, currentY - 24, wAssinatura, 24, null, '0.3 0.3 0.3');
  p.drawText('Conferência dos Condutores: Conferido em Partida [                    ] • Hora: ____ : ____', xInicio + wAssinatura + 26, currentY - 15, 6.5, false, '0.2 0.2 0.2');

  return doc.toBuffer();
}

/**
 * Constrói o PDF Oficial da Folha de Carga (Guia de Carga Conjunta - Matriz de Todas as Rotas)
 * Substitui o modelo antigo segregado de carrinhas pelo formato consolidado solicitado pela gerência.
 */
export function gerarPdfFolhaCargaCarrinhas(params: ParametrosFolhaCargaPdf | string): Buffer {
  return gerarPdfGuiaCargaConjunta(params);
}
