/**
 * Construtor Nativo de PDFs de Continuidade de Negócio (BCP)
 * Gera ficheiros binários PDF 1.4 em memória para envio como anexos no Resend.
 * Réplica exata do layout e conteúdo oficial da aplicação (sem caixas e sem fundos preenchidos a tinta).
 * Economia de Tinteiro: Layout Wireframe sem fundos preenchidos (100% fundo branco e linhas de contorno finas).
 */

import {
  Loja,
  Carrinha,
  Produto,
  Encomenda,
  ClienteEmpresarialB2B,
  BaseDiariaRecorrente,
  BaseFixaCarrinha,
  DiaSemana,
} from '@/types';
import {
  obterQuantidadeEfetivaBaseRota,
  obterQuantidadeEfetivaClienteB2B,
  obterArtigosAjustadosBaseRota,
  obterArtigosAjustadosClienteB2B,
  clienteEmModoFerias,
} from '@/lib/encomendasService';
import {
  LOJAS_MOCK,
  CARRINHAS_MOCK,
  BASE_FIXA_CARRINHAS_INICIAL,
  CLIENTES_EMPRESARIAIS_B2B_INICIAIS,
  PRODUTOS_MOCK,
  ENCOMENDAS_MOCK,
} from '@/lib/mockData';

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
  pages: PdfPageWriter[] = [];
  currentPage: PdfPageWriter;

  constructor(title: string) {
    this.title = title;
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

    for (let i = 0; i < this.pages.length; i++) {
      const p = this.pages[i];
      const footer = `Folha de Continuidade - Padaria da Vila | Página ${i + 1} de ${this.pages.length} | Inprooval Sistemas`;
      p.drawText(footer, 160, 20, 7, false, '0.4 0.4 0.4');

      const streamLen = Buffer.byteLength(p.content, 'utf-8');
      const cId = addObj(`<< /Length ${streamLen} >>\nstream\n${p.content}\nendstream`);
      contentObjIds[i] = cId;
    }

    for (let i = 0; i < this.pages.length; i++) {
      const pId = addObj(`<< /Type /Page /Parent ${pagesObjId} 0 R /MediaBox [0 0 595 842] /Contents ${contentObjIds[i]} 0 R /Resources << /Font << /F1 ${f1Obj} 0 R /F2 ${f2Obj} 0 R >> >> >>`);
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
    p.drawText('PADARIA DA VILA - CENTRO DE PRODUÇÃO', 45, 776, 11, true, '0 0 0');
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

    // 4. Subtotal da Loja
    if (currentY - 20 < 55) {
      p = doc.addPage();
      currentY = 790;
    }
    p.drawRect(35, currentY - 16, 525, 16, null, '0.2 0.2 0.2');
    p.drawText(`SUBTOTAL ${loja.nome.toUpperCase()}`, 45, currentY - 11, 7.5, true, '0 0 0');
    p.drawText(
      `${encsLoja.length} Encomendas • Padaria: ${totalPadariaLoja} un. • Pastelaria: ${totalPastelariaLoja} un. • Total a Produzir: ${totalUnidadesLoja} un.`,
      170,
      currentY - 11,
      7.5,
      true,
      '0 0 0'
    );
    currentY -= 24;

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
 * Constrói o PDF Oficial: Folha de Carga Segregada das Rotas 1 a 7
 * Réplica exata do layout e conteúdo da aplicação (tabela da Base Diária sem caixas,
 * desdobramento de cada cliente B2B em sub-tabela própria e desdobramento de encomendas ao domicílio).
 */
export function gerarPdfFolhaCargaCarrinhas(params: ParametrosFolhaCargaPdf | string): Buffer {
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
    encomendas = ENCOMENDAS_MOCK;
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

  const doc = new NativePdfDocument(`Folha_Carga_Rotas_${dataFormatada.replace(/\//g, '-')}`);

  // Filtrar apenas viaturas de entrega (Rotas 1 a 7, excluindo Rota 8 / Fábrica), ordenadas por número
  const carrinhasRotas = carrinhas
    .filter(
      (c) =>
        c.ativo !== false &&
        c.identificador !== 'Rota 8' &&
        c.id !== 'carrinha-8' &&
        c.id !== 'e888db95-c427-4ed5-83fc-01403bd24cf8' &&
        c.numero !== 8 &&
        c.rota !== 'Rota 8'
    )
    .sort((a, b) => (a.numero || 0) - (b.numero || 0));

  carrinhasRotas.forEach((car, idx) => {
    if (idx > 0) doc.addPage();
    let p = doc.currentPage;

    // 1. CÁLCULO REAL DA BASE DIÁRIA DA CARRINHA
    const bf = baseFixaCarrinhas.find((b) => b.carrinha_id === car.id);
    const semana = (bf?.quantidades_semanais || bf?.quantidades_semana || {}) as Record<string, Record<string, number>>;
    const mapaDia = semana?.[diaSemana] || bf?.quantidades_por_produto || {};

    const mapaItens = new Map<string, { quantidade: number; categoria: 'padaria' | 'pastelaria'; unidade: string }>();

    const candidatos = new Set<string>();
    Object.keys(mapaDia).forEach((a) => candidatos.add(a.trim()));
    if (bf?.quantidades_semanais) {
      Object.values(bf.quantidades_semanais).forEach((m) => {
        Object.keys(m || {}).forEach((a) => candidatos.add(a.trim()));
      });
    }
    if (bf?.quantidades_por_produto) {
      Object.keys(bf.quantidades_por_produto).forEach((a) => candidatos.add(a.trim()));
    }
    obterArtigosAjustadosBaseRota(dataOperacao, car.id, ajustesAdhoc).forEach((a) => candidatos.add(a.trim()));

    candidatos.forEach((artigo) => {
      const { quantidade } = obterQuantidadeEfetivaBaseRota(dataOperacao, car.id, artigo, semana, diaSemana, ajustesAdhoc);
      if (quantidade > 0) {
        const prodRef = produtos.find((pr) => pr.nome.toLowerCase() === artigo.toLowerCase());
        const cat: 'padaria' | 'pastelaria' =
          prodRef?.categoria ||
          (artigo.toLowerCase().includes('bolo') || artigo.toLowerCase().includes('croissant') ? 'pastelaria' : 'padaria');
        const unid = prodRef?.unidade?.toLowerCase().includes('kg') ? 'kg' : 'un.';
        mapaItens.set(artigo.trim(), { quantidade, categoria: cat, unidade: unid });
      }
    });

    // 1.1 Quantidades das Bases Diárias Recorrentes desta rota (excluindo clientes em Modo Férias)
    basesRecorrentes
      .filter((b) => b.ativo && b.carrinha_id === car.id && !clienteEmModoFerias(b, dataOperacao))
      .forEach((b) => {
        const mapaRec = b.quantidades_semanais?.[diaSemana] || {};
        Object.entries(mapaRec).forEach(([artigo, qtd]) => {
          const quantidade = Number(qtd) || 0;
          if (quantidade > 0) {
            const prodRef = produtos.find((pr) => pr.nome.toLowerCase() === artigo.toLowerCase());
            const cat =
              prodRef?.categoria ||
              (artigo.toLowerCase().includes('bolo') || artigo.toLowerCase().includes('croissant') ? 'pastelaria' : 'padaria');
            const unid = prodRef?.unidade?.toLowerCase().includes('kg') ? 'kg' : 'un.';
            const atual = mapaItens.get(artigo.trim());
            if (atual) {
              atual.quantidade += quantidade;
            } else {
              mapaItens.set(artigo.trim(), { quantidade, categoria: cat, unidade: unid });
            }
          }
        });
      });

    const itensBaseDiaria: { nome: string; categoria: string; unidade: string; quantidade: number }[] = [];
    mapaItens.forEach((val, nome) => {
      itensBaseDiaria.push({
        nome,
        categoria: val.categoria,
        unidade: val.unidade,
        quantidade: val.quantidade,
      });
    });
    itensBaseDiaria.sort((a, b) => {
      if (a.categoria !== b.categoria) return a.categoria.localeCompare(b.categoria);
      return a.nome.localeCompare(b.nome);
    });

    const totalBaseDiaria = itensBaseDiaria.reduce((acc, it) => acc + it.quantidade, 0);

    // 2. CÁLCULO REAL DOS CLIENTES B2B DESTA ROTA
    const clientesB2BRota = clientesB2B
      .filter((cli) => cli.ativo && cli.carrinha_id === car.id)
      .map((cli) => {
        const semanaCli = (cli.quantidades_semanais || cli.quantidades_semana || {}) as Record<string, Record<string, number>>;
        const mapaDiaCli = semanaCli[diaSemana] || {};
        const candidatosCli = new Set<string>();
        Object.keys(mapaDiaCli).forEach((a) => candidatosCli.add(a.trim()));
        if (cli.quantidades_semanais) {
          Object.values(cli.quantidades_semanais).forEach((m) => {
            Object.keys(m || {}).forEach((a) => candidatosCli.add(a.trim()));
          });
        }
        if (cli.produtos_predefinidos) {
          Object.keys(cli.produtos_predefinidos).forEach((a) => candidatosCli.add(a.trim()));
        }
        obterArtigosAjustadosClienteB2B(dataOperacao, cli.id, ajustesAdhoc).forEach((a) => candidatosCli.add(a.trim()));

        const itensDoCli = Array.from(candidatosCli)
          .map((artigo) => {
            let qtd = Number(mapaDiaCli[artigo] || 0);
            const { quantidade } = obterQuantidadeEfetivaClienteB2B(dataOperacao, cli.id, artigo, semanaCli, diaSemana, ajustesAdhoc);
            qtd = quantidade;
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

    const totalB2B = clientesB2BRota.reduce((acc, cli) => acc + cli.totalCli, 0);

    // 3. CÁLCULO REAL DAS ENCOMENDAS ADICIONAIS AO DOMICÍLIO
    const encomendasDomicilio = encomendas
      .filter((enc) => {
        const matchesCar = enc.carrinha_id === car.id;
        const matchesData = enc.data_agendamento === dataOperacao;
        const matchesTipo = enc.tipo === 'entrega_domicilio';
        const naoCancelada = enc.estado !== 'cancelado';
        return matchesCar && matchesData && matchesTipo && naoCancelada;
      })
      .map((enc) => {
        const itensValidos = (enc.itens || [])
          .filter((it) => it.estado_producao !== 'recusado' && Number(it.quantidade) > 0)
          .map((it) => ({
            produto_nome: String(it.produto_nome || '').trim(),
            quantidade: Number(it.quantidade),
          }));
        const totalEnc = itensValidos.reduce((acc, it) => acc + it.quantidade, 0);
        return {
          ...enc,
          itensValidos,
          totalEnc,
        };
      })
      .filter((enc) => enc.totalEnc > 0);

    const totalEncomendas = encomendasDomicilio.reduce((acc, enc) => acc + enc.totalEnc, 0);
    const totalGeralCarga = totalBaseDiaria + totalB2B + totalEncomendas;

    // Header Principal da Viatura (Wireframe sem preenchimento a tinta)
    p.drawRect(35, 750, 525, 42, null, '0.2 0.2 0.2');
    p.drawText('PADARIA DA VILA - EXPEDIÇÃO E LOGÍSTICA DE ROTAS', 45, 776, 11, true, '0 0 0');
    p.drawText(`GUIA OFICIAL DE CARGA DE EXPEDIÇÃO • OPERAÇÃO DE ${dataFormatada}`, 45, 764, 8, false, '0.2 0.2 0.2');
    p.drawText('Centro de Expedição e Logística • Padaria da Vila Arouca', 45, 754, 7, false, '0.3 0.3 0.3');

    p.drawRect(435, 755, 115, 32, null, '0.3 0.3 0.3');
    p.drawText('GUIA DE CARGA', 442, 774, 6.5, true, '0 0 0');
    p.drawText(`Data: ${dataFormatada}`, 442, 763, 7.5, true, '0 0 0');

    // Identificação da Rota (Box Wireframe)
    p.drawRect(35, 720, 525, 22, null, '0.3 0.3 0.3');
    p.drawText(`Rota: ${car.rota || car.identificador}`, 45, 727, 8, true, '0 0 0');
    p.drawText(`Viatura: ${car.nome_carro || 'Viatura'}`, 180, 727, 7.5, false, '0 0 0');
    p.drawText(`Matrícula: ${car.matricula || '00-00-00'}`, 305, 727, 8, true, '0 0 0');
    p.drawText(`Condutor: ${car.nome_condutor || 'Manuel Silva'}`, 415, 727, 8, true, '0 0 0');

    // Resumo de Carga Total da Viatura (4 Caixas Wireframe - SEM QUALQUER REFERÊNCIA A CAIXAS)
    p.drawRect(35, 686, 125, 28, null, '0.3 0.3 0.3');
    p.drawText('1. BASE DIÁRIA ROTA', 42, 702, 6.5, true, '0.4 0.4 0.4');
    p.drawText(`${totalBaseDiaria} un.`, 42, 690, 10, true, '0 0 0');
    p.drawText(`${itensBaseDiaria.length} artigos rota`, 82, 690, 6.5, false, '0.4 0.4 0.4');

    p.drawRect(168, 686, 125, 28, null, '0.3 0.3 0.3');
    p.drawText('2. CLIENTES B2B', 175, 702, 6.5, true, '0.4 0.4 0.4');
    p.drawText(`${totalB2B} un.`, 175, 690, 10, true, '0 0 0');
    p.drawText(`${clientesB2BRota.length} paragens`, 218, 690, 6.5, false, '0.4 0.4 0.4');

    p.drawRect(301, 686, 125, 28, null, '0.3 0.3 0.3');
    p.drawText('3. ENCOMENDAS', 308, 702, 6.5, true, '0.4 0.4 0.4');
    p.drawText(`${totalEncomendas} un.`, 308, 690, 10, true, '0 0 0');
    p.drawText(`${encomendasDomicilio.length} entregas`, 350, 690, 6.5, false, '0.4 0.4 0.4');

    p.drawRect(434, 686, 126, 28, null, '0.2 0.2 0.2');
    p.drawText('TOTAL A BORDO', 441, 702, 6.5, true, '0.4 0.4 0.4');
    p.drawText(`${totalGeralCarga} un.`, 441, 690, 10, true, '0 0 0');
    p.drawText('unidades a bordo', 488, 690, 6.5, false, '0.4 0.4 0.4');

    let currentY = 672;

    // 1. QUANTIDADES DA BASE DIÁRIA (ABASTECIMENTO ROTA)
    p.drawRect(35, currentY - 14, 525, 14, null, '0.2 0.2 0.2');
    p.drawText('1. QUANTIDADES DA BASE DIÁRIA CARREGADAS NA VIATURA (PORTA-A-PORTA)', 42, currentY - 10, 7, true, '0 0 0');
    p.drawText(`${itensBaseDiaria.length} artigos na rota`, 430, currentY - 10, 6.5, false, '0.3 0.3 0.3');
    currentY -= 14;

    p.drawRect(35, currentY - 12, 525, 12, null, '0.3 0.3 0.3');
    p.drawText('Artigo / Produto', 42, currentY - 9, 6.5, true, '0 0 0');
    p.drawText('Setor', 260, currentY - 9, 6.5, true, '0 0 0');
    p.drawText('Quantidade Base', 380, currentY - 9, 6.5, true, '0 0 0');
    p.drawText('Conferência / Visto', 470, currentY - 9, 6.5, true, '0 0 0');
    currentY -= 12;

    if (itensBaseDiaria.length === 0) {
      p.drawRect(35, currentY - 14, 525, 14, null, '0.5 0.5 0.5');
      p.drawText('Sem artigos de base diária configurados para esta rota.', 45, currentY - 10, 7, false, '0.4 0.4 0.4');
      currentY -= 18;
    } else {
      itensBaseDiaria.forEach((it) => {
        if (currentY - 12 < 65) {
          p = doc.addPage();
          currentY = 790;
          p.drawRect(35, currentY - 14, 525, 14, null, '0.3 0.3 0.3');
          p.drawText(`${car.rota || car.identificador} - Base Diária (Continuação) • ${dataFormatada}`, 45, currentY - 10, 7.5, true, '0.2 0.2 0.2');
          currentY -= 20;
        }

        p.drawRect(35, currentY - 12, 525, 12, null, '0.6 0.6 0.6');
        p.drawText(it.nome.slice(0, 38), 42, currentY - 9, 7, true, '0 0 0');
        p.drawText(it.categoria === 'pastelaria' ? 'Pastelaria' : 'Padaria', 260, currentY - 9, 6.5, false, '0.3 0.3 0.3');
        p.drawText(`${it.quantidade} ${it.unidade}`, 380, currentY - 9, 7.5, true, '0 0 0');
        p.drawText('[ ] Conferido na saída', 470, currentY - 9, 6.5, false, '0 0 0');
        currentY -= 12;
      });

      // Subtotal Base Diária
      p.drawRect(35, currentY - 13, 525, 13, null, '0.3 0.3 0.3');
      p.drawText('SUBTOTAL BASE DIÁRIA (ROTA)', 42, currentY - 9.5, 7, true, '0 0 0');
      p.drawText(`${totalBaseDiaria} un.`, 380, currentY - 9.5, 7.5, true, '0 0 0');
      p.drawText('Conforme padrão de saída', 470, currentY - 9.5, 6.5, false, '0.4 0.4 0.4');
      currentY -= 18;
    }

    // 2. DESDOBRAMENTO DE CLIENTES EMPRESARIAIS (B2B)
    if (currentY - 26 < 65) {
      p = doc.addPage();
      currentY = 790;
    }
    p.drawRect(35, currentY - 14, 525, 14, null, '0.2 0.2 0.2');
    p.drawText('2. DESDOBRAMENTO DE ENTREGAS POR CLIENTE EMPRESARIAL (B2B)', 42, currentY - 10, 7, true, '0 0 0');
    p.drawText(`${clientesB2BRota.length} clientes com carga hoje`, 430, currentY - 10, 6.5, false, '0.3 0.3 0.3');
    currentY -= 14;

    if (clientesB2BRota.length === 0) {
      p.drawRect(35, currentY - 14, 525, 14, null, '0.5 0.5 0.5');
      p.drawText(`Esta rota não tem entregas de clientes empresariais (B2B) agendadas para ${diaSemana.toUpperCase()}.`, 42, currentY - 10, 6.5, false, '0.4 0.4 0.4');
      currentY -= 20;
    } else {
      clientesB2BRota.forEach((cli) => {
        const heightNeeded = 14 + 11 + (cli.itensDoCli.length * 11) + 4;
        if (currentY - heightNeeded < 65) {
          p = doc.addPage();
          currentY = 790;
          p.drawRect(35, currentY - 14, 525, 14, null, '0.3 0.3 0.3');
          p.drawText(`${car.rota || car.identificador} - Clientes B2B (Continuação) • ${dataFormatada}`, 45, currentY - 10, 7.5, true, '0.2 0.2 0.2');
          currentY -= 20;
        }

        // Cabeçalho do Cliente B2B
        p.drawRect(35, currentY - 13, 525, 13, null, '0.4 0.4 0.4');
        const cliInfo = `${cli.nome}${cli.morada ? ` • ${cli.morada}` : ''}${cli.telefone ? ` • Tel: ${cli.telefone}` : ''}${cli.nif ? ` • NIF: ${cli.nif}` : ''}`;
        p.drawText(cliInfo.slice(0, 75), 42, currentY - 9.5, 7, true, '0 0 0');
        p.drawText(`Total Cliente: ${cli.totalCli} un.`, 430, currentY - 9.5, 7.5, true, '0 0 0');
        currentY -= 13;

        // Sub-tabela de Artigos do Cliente B2B
        p.drawRect(35, currentY - 11, 525, 11, null, '0.3 0.3 0.3');
        p.drawText('Artigo / Produto', 42, currentY - 8.5, 6.5, true, '0 0 0');
        p.drawText('Quantidade', 380, currentY - 8.5, 6.5, true, '0 0 0');
        p.drawText('Conferência de Entrega', 470, currentY - 8.5, 6.5, true, '0 0 0');
        currentY -= 11;

        cli.itensDoCli.forEach((item) => {
          p.drawRect(35, currentY - 11, 525, 11, null, '0.6 0.6 0.6');
          p.drawText(item.artigo.slice(0, 48), 42, currentY - 8.5, 7, false, '0 0 0');
          p.drawText(`${item.quantidade} un.`, 380, currentY - 8.5, 7.5, true, '0 0 0');
          p.drawText('[ ] Entregue Conforme', 470, currentY - 8.5, 6.5, false, '0 0 0');
          currentY -= 11;
        });

        currentY -= 5;
      });

      // Subtotal B2B
      p.drawRect(35, currentY - 13, 525, 13, null, '0.3 0.3 0.3');
      p.drawText('SUBTOTAL CLIENTES B2B', 42, currentY - 9.5, 7, true, '0 0 0');
      p.drawText(`${totalB2B} un. (${clientesB2BRota.length} paragens)`, 380, currentY - 9.5, 7.5, true, '0 0 0');
      currentY -= 18;
    }

    // 3. DESDOBRAMENTO DE ENCOMENDAS ADICIONAIS AO DOMICÍLIO
    if (currentY - 26 < 65) {
      p = doc.addPage();
      currentY = 790;
    }
    p.drawRect(35, currentY - 14, 525, 14, null, '0.2 0.2 0.2');
    p.drawText('3. DESDOBRAMENTO DE ENCOMENDAS ADICIONAIS AO DOMICÍLIO', 42, currentY - 10, 7, true, '0 0 0');
    p.drawText(`${encomendasDomicilio.length} entregas domicílio`, 430, currentY - 10, 6.5, false, '0.3 0.3 0.3');
    currentY -= 14;

    if (encomendasDomicilio.length === 0) {
      p.drawRect(35, currentY - 14, 525, 14, null, '0.5 0.5 0.5');
      p.drawText('Nenhuma encomenda adicional ao domicílio afeta a esta viatura para a data selecionada.', 42, currentY - 10, 6.5, false, '0.4 0.4 0.4');
      currentY -= 20;
    } else {
      encomendasDomicilio.forEach((enc) => {
        const heightNeeded = 14 + 11 + (enc.itensValidos.length * 11) + 4;
        if (currentY - heightNeeded < 65) {
          p = doc.addPage();
          currentY = 790;
          p.drawRect(35, currentY - 14, 525, 14, null, '0.3 0.3 0.3');
          p.drawText(`${car.rota || car.identificador} - Encomendas (Continuação) • ${dataFormatada}`, 45, currentY - 10, 7.5, true, '0.2 0.2 0.2');
          currentY -= 20;
        }

        // Cabeçalho da Encomenda
        p.drawRect(35, currentY - 13, 525, 13, null, '0.4 0.4 0.4');
        const encInfo = `${enc.codigo || '#ENC'} • ${enc.cliente?.nome || 'Cliente'}${enc.cliente?.telefone ? ` (Tel: ${enc.cliente.telefone})` : ''} - ${enc.cliente?.morada || 'Arouca'}${enc.hora_agendamento ? ` • ⏰ ${enc.hora_agendamento}` : ''}`;
        p.drawText(encInfo.slice(0, 75), 42, currentY - 9.5, 7, true, '0 0 0');
        p.drawText(`Total Encomenda: ${enc.totalEnc} un.`, 430, currentY - 9.5, 7.5, true, '0 0 0');
        currentY -= 13;

        // Sub-tabela de Artigos da Encomenda
        p.drawRect(35, currentY - 11, 525, 11, null, '0.3 0.3 0.3');
        p.drawText('Artigo / Encomenda', 42, currentY - 8.5, 6.5, true, '0 0 0');
        p.drawText('Quantidade', 380, currentY - 8.5, 6.5, true, '0 0 0');
        p.drawText('Conferência de Entrega', 470, currentY - 8.5, 6.5, true, '0 0 0');
        currentY -= 11;

        enc.itensValidos.forEach((item) => {
          p.drawRect(35, currentY - 11, 525, 11, null, '0.6 0.6 0.6');
          p.drawText(item.produto_nome.slice(0, 48), 42, currentY - 8.5, 7, false, '0 0 0');
          p.drawText(`${item.quantidade} un.`, 380, currentY - 8.5, 7.5, true, '0 0 0');
          p.drawText('[ ] Entregue Conforme', 470, currentY - 8.5, 6.5, false, '0 0 0');
          currentY -= 11;
        });

        currentY -= 5;
      });

      // Subtotal Encomendas
      p.drawRect(35, currentY - 13, 525, 13, null, '0.3 0.3 0.3');
      p.drawText('SUBTOTAL ENCOMENDAS ADICIONAIS', 42, currentY - 9.5, 7, true, '0 0 0');
      p.drawText(`${totalEncomendas} un. (${encomendasDomicilio.length} entregas)`, 380, currentY - 9.5, 7.5, true, '0 0 0');
      currentY -= 18;
    }

    // 4. RESUMO GERAL CONSOLIDADO DA GUIA DE CARGA E ASSINATURAS (SEM QUALQUER MENÇÃO A CAIXAS)
    if (currentY - 48 < 50) {
      p = doc.addPage();
      currentY = 790;
    }
    p.drawRect(35, currentY - 22, 525, 22, null, '0.2 0.2 0.2');
    p.drawText('Resumo Consolidado de Carga:', 45, currentY - 10, 6.5, true, '0.3 0.3 0.3');
    p.drawText(
      `1. Base Diária: ${totalBaseDiaria} un. • 2. B2B: ${totalB2B} un. • 3. Encomendas: ${totalEncomendas} un.`,
      45,
      currentY - 18,
      7,
      false,
      '0 0 0'
    );
    p.drawText(`TOTAL GERAL A BORDO: ${totalGeralCarga} un.`, 370, currentY - 11, 8.5, true, '0 0 0');
    p.drawText('Carga total conferida', 370, currentY - 19, 6.5, false, '0.4 0.4 0.4');
    currentY -= 26;

    // Assinaturas
    p.drawRect(35, currentY - 22, 525, 22, null, '0.3 0.3 0.3');
    p.drawText(
      `Responsável Carregamento: ${car.nome_condutor || 'Condutor'} (${car.matricula || 'Frota'})`,
      45,
      currentY - 14,
      7,
      false,
      '0.2 0.2 0.2'
    );
    p.drawText('Conferência Expedição: Visto [                    ]', 330, currentY - 14, 7, false, '0.2 0.2 0.2');
  });

  return doc.toBuffer();
}
