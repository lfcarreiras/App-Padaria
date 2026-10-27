/**
 * Construtor Nativo de PDFs de Continuidade de Negócio (BCP)
 * Gera ficheiros binários PDF 1.4 em memória para envio como anexos no Resend.
 * Formatação dinâmica (Auto-Wrap / Multi-line) que se molda ao tamanho do texto sem qualquer corte.
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
    // Se uma palavra isolada for maior que o limite da coluna, segmenta-a
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
      '✓': 'V', '✕': 'X'
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
      const footer = `Folha de Contingência - Padaria da Vila | Página ${i + 1} de ${this.pages.length} | Inprooval Sistemas`;
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
}

/**
 * Constrói o PDF Oficial: Folha de Fabrico de Encomendas por Loja
 * Réplica exata dos dados reais e layout da app, sem caixas preenchidas a tinta (Wireframe puro).
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

  // Filtrar apenas lojas ativas (Lojas 1 a 4)
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

    // Header Principal da Loja (Wireframe sem fundo preenchido)
    p.drawRect(35, 745, 525, 52, null, '0.2 0.2 0.2');
    p.drawText('PADARIA DA VILA - CENTRO DE PRODUÇÃO', 45, 778, 11, true, '0 0 0');
    p.drawText(`FOLHA DE FABRICO DE ENCOMENDAS POR LOJA • OPERAÇÃO DE ${dataFormatada}`, 45, 765, 8.5, false, '0.2 0.2 0.2');
    p.drawText(
      `${loja.nome} • ${loja.morada || 'Arouca'}${loja.telefone ? ` • Tel: ${loja.telefone}` : ''}`,
      45,
      753,
      7.5,
      false,
      '0.3 0.3 0.3'
    );

    // Cartões de Resumo Wireframe (4 caixas sem fundo preenchido)
    p.drawRect(35, 706, 125, 30, null, '0.3 0.3 0.3');
    p.drawText('TOTAL ENCOMENDAS', 42, 725, 7, true, '0.4 0.4 0.4');
    p.drawText(`${totalEncsLoja}`, 42, 712, 11, true, '0 0 0');

    p.drawRect(168, 706, 125, 30, null, '0.3 0.3 0.3');
    p.drawText('TOTAL A PRODUZIR', 175, 725, 7, true, '0.4 0.4 0.4');
    p.drawText(`${totalUnidadesLoja} un.`, 175, 712, 11, true, '0 0 0');

    p.drawRect(301, 706, 125, 30, null, '0.3 0.3 0.3');
    p.drawText('PADARIA (PÃES)', 308, 725, 7, true, '0.4 0.4 0.4');
    p.drawText(`${totalPadariaLoja} un.`, 308, 712, 11, true, '0 0 0');

    p.drawRect(434, 706, 126, 30, null, '0.3 0.3 0.3');
    p.drawText('PASTELARIA (DOCES)', 441, 725, 7, true, '0.4 0.4 0.4');
    p.drawText(`${totalPastelariaLoja} un.`, 441, 712, 11, true, '0 0 0');

    // Tabela Header (Wireframe puro)
    p.drawRect(35, 680, 525, 18, null, '0.2 0.2 0.2');
    p.drawText('HORA', 40, 685, 7.5, true, '0 0 0');
    p.drawText('CÓDIGO', 75, 685, 7.5, true, '0 0 0');
    p.drawText('CLIENTE / CONTACTO', 130, 685, 7.5, true, '0 0 0');
    p.drawText('ARTIGOS A FABRICAR', 245, 685, 7.5, true, '0 0 0');
    p.drawText('ESPECIFICAÇÕES / OBS.', 395, 685, 7.5, true, '0 0 0');
    p.drawText('VISTO', 505, 685, 7.5, true, '0 0 0');

    let currentY = 660;

    if (encsLoja.length === 0) {
      p.drawRect(35, currentY - 14, 525, 24, null, '0.4 0.4 0.4');
      p.drawText('Sem encomendas agendadas para esta loja na data indicada.', 150, currentY - 4, 8.5, false, '0.4 0.4 0.4');
      currentY -= 34;
    } else {
      encsLoja.forEach((enc) => {
        // Montar descritivos de cliente, artigos e observações
        const clienteTexto = `${enc.cliente?.nome || 'Cliente'}${enc.cliente?.telefone ? ` (${enc.cliente.telefone})` : ''}${enc.tipo === 'entrega_domicilio' ? ' [Domicílio]' : ''}`;
        const itensTexto = enc.itensValidos
          .map((it) => `${it.quantidade}x ${it.produto_nome}`)
          .join(', ');
        const obsList: string[] = [];
        if (enc.notas_cliente) obsList.push(`Nota: ${enc.notas_cliente}`);
        if (enc.observacoes_producao) obsList.push(`Obs: ${enc.observacoes_producao}`);
        if (enc.tipo === 'entrega_domicilio' && enc.cliente?.morada) obsList.push(`Morada: ${enc.cliente.morada}`);
        enc.itensValidos.forEach((it) => {
          if (it.notas_personalizacao) obsList.push(`${it.produto_nome}: ${it.notas_personalizacao}`);
        });
        const obsTexto = obsList.length > 0 ? obsList.join(' | ') : 'Padrão da receita';

        const clienteLines = wrapText(clienteTexto, 20);
        const itensLines = wrapText(itensTexto, 28);
        const obsLines = wrapText(obsTexto, 22);

        const maxLines = Math.max(clienteLines.length, itensLines.length, obsLines.length, 1);
        const lineHeight = 10.5;
        const rowHeight = Math.max(22, maxLines * lineHeight + 8);

        // Verificação de quebra de página
        if (currentY - rowHeight < 75) {
          p = doc.addPage();
          currentY = 790;
          // Cabeçalho de continuação
          p.drawRect(35, currentY - 14, 525, 20, null, '0.3 0.3 0.3');
          p.drawText(`${loja.nome} (Continuação) • ${dataFormatada}`, 45, currentY - 6, 8, true, '0.2 0.2 0.2');
          currentY -= 28;
        }

        // Desenhar contorno da linha (Sem Fundo Preenchido)
        p.drawRect(35, currentY - rowHeight + 14, 525, rowHeight, null, '0.5 0.5 0.5');

        // Colunas fixas
        p.drawText(enc.hora_agendamento || '10:00', 40, currentY + 3, 7.5, true, '0 0 0');
        p.drawText(enc.codigo || '#ENC', 75, currentY + 3, 7.5, true, '0 0 0');
        p.drawText('[ ] Pronto', 505, currentY + 3, 7.5, false, '0 0 0');

        // Linhas de texto dinâmicas
        for (let i = 0; i < maxLines; i++) {
          const yPos = currentY + 3 - (i * lineHeight);
          if (i < clienteLines.length) {
            p.drawText(clienteLines[i], 130, yPos, 7.5, false, '0 0 0');
          }
          if (i < itensLines.length) {
            p.drawText(itensLines[i], 245, yPos, 7.5, true, '0 0 0');
          }
          if (i < obsLines.length) {
            p.drawText(obsLines[i], 395, yPos, 7, false, '0.2 0.2 0.2');
          }
        }

        currentY -= (rowHeight + 2);
      });
    }

    // Bloco de Subtotal e Assinaturas (Sem preenchimento a tinta)
    currentY -= 14;
    const boxHeight = 44;
    if (currentY - boxHeight < 50) {
      p = doc.addPage();
      currentY = 780;
    }
    p.drawRect(35, currentY - boxHeight, 525, boxHeight, null, '0.2 0.2 0.2');
    p.drawText(`SUBTOTAL ${loja.nome.toUpperCase()}: ${totalEncsLoja} Encomendas | ${totalUnidadesLoja} Unidades a Produzir`, 45, currentY - 15, 8.5, true, '0 0 0');
    p.drawText('Validado pelo Mestre Padeiro: ________________________', 45, currentY - 32, 7.5, false, '0.3 0.3 0.3');
    p.drawText('Conferência de Embalamento: ________________________', 320, currentY - 32, 7.5, false, '0.3 0.3 0.3');
  });

  return doc.toBuffer();
}

/**
 * Constrói o PDF Oficial: Folha de Carga Segregada das Rotas 1 a 7
 * Réplica exata dos dados reais e layout da app, sem caixas preenchidas a tinta (Wireframe puro).
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
  }

  const doc = new NativePdfDocument(`Folha_Carga_Rotas_${dataFormatada.replace(/\//g, '-')}`);

  // Filtrar apenas viaturas de entrega (Rotas 1 a 7, excluindo Rota 8 / Fábrica)
  const carrinhasRotas = carrinhas.filter(
    (c) =>
      c.ativo !== false &&
      c.identificador !== 'Rota 8' &&
      c.id !== 'carrinha-8' &&
      c.id !== 'e888db95-c427-4ed5-83fc-01403bd24cf8'
  );

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
    obterArtigosAjustadosBaseRota(dataOperacao, car.id).forEach((a) => candidatos.add(a.trim()));

    candidatos.forEach((artigo) => {
      const { quantidade } = obterQuantidadeEfetivaBaseRota(dataOperacao, car.id, artigo, semana, diaSemana);
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

    const itensBaseDiaria: { nome: string; categoria: string; unidade: string; quantidade: number; caixas: number }[] = [];
    mapaItens.forEach((val, nome) => {
      const fatorCaixa = val.categoria === 'pastelaria' ? 20 : 30;
      itensBaseDiaria.push({
        nome,
        categoria: val.categoria,
        unidade: val.unidade,
        quantidade: val.quantidade,
        caixas: Math.ceil(val.quantidade / fatorCaixa),
      });
    });
    itensBaseDiaria.sort((a, b) => a.nome.localeCompare(b.nome));

    const totalBaseDiaria = itensBaseDiaria.reduce((acc, it) => acc + it.quantidade, 0);
    const totalBaseCaixas = itensBaseDiaria.reduce((acc, it) => acc + it.caixas, 0);

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
        obterArtigosAjustadosClienteB2B(dataOperacao, cli.id).forEach((a) => candidatosCli.add(a.trim()));

        const itensDoCli = Array.from(candidatosCli)
          .map((artigo) => {
            let qtd = Number(mapaDiaCli[artigo] || 0);
            const { quantidade } = obterQuantidadeEfetivaClienteB2B(dataOperacao, cli.id, artigo, semanaCli, diaSemana);
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
    const totalGeralCaixasEstimadas = totalBaseCaixas + Math.ceil((totalB2B + totalEncomendas) / 30);

    // Header Principal da Viatura (Wireframe sem preenchimento a tinta)
    p.drawRect(35, 745, 525, 52, null, '0.2 0.2 0.2');
    p.drawText('PADARIA DA VILA - EXPEDIÇÃO E LOGÍSTICA DE ROTAS', 45, 778, 11, true, '0 0 0');
    p.drawText(`GUIA OFICIAL DE CARGA DE EXPEDIÇÃO • OPERAÇÃO DE ${dataFormatada}`, 45, 765, 8.5, false, '0.2 0.2 0.2');
    p.drawText(
      `Rota: ${car.rota || car.identificador} | Viatura: ${car.matricula || 'Frota'} | Condutor: ${car.nome_condutor || 'Motorista de Serviço'}`,
      45,
      753,
      7.5,
      false,
      '0.3 0.3 0.3'
    );

    // Resumo de Carga Total da Viatura (4 Caixas Wireframe)
    p.drawRect(35, 706, 125, 30, null, '0.3 0.3 0.3');
    p.drawText('1. BASE DIÁRIA ROTA', 42, 725, 7, true, '0.4 0.4 0.4');
    p.drawText(`${totalBaseDiaria} un. (~${totalBaseCaixas} cx)`, 42, 712, 10, true, '0 0 0');

    p.drawRect(168, 706, 125, 30, null, '0.3 0.3 0.3');
    p.drawText('2. CLIENTES B2B', 175, 725, 7, true, '0.4 0.4 0.4');
    p.drawText(`${totalB2B} un. (${clientesB2BRota.length} paragens)`, 175, 712, 10, true, '0 0 0');

    p.drawRect(301, 706, 125, 30, null, '0.3 0.3 0.3');
    p.drawText('3. ENCOMENDAS DOMICÍLIO', 308, 725, 7, true, '0.4 0.4 0.4');
    p.drawText(`${totalEncomendas} un. (${encomendasDomicilio.length} entregas)`, 308, 712, 10, true, '0 0 0');

    p.drawRect(434, 706, 126, 30, null, '0.3 0.3 0.3');
    p.drawText('TOTAL A BORDO', 441, 725, 7, true, '0.4 0.4 0.4');
    p.drawText(`${totalGeralCarga} un. (~${totalGeralCaixasEstimadas} cx)`, 441, 712, 10, true, '0 0 0');

    // 1. BASE DIÁRIA DE ABASTECIMENTO
    let currentY = 686;
    p.drawRect(35, currentY, 525, 16, null, '0.2 0.2 0.2');
    p.drawText('1. BASE DIÁRIA DE ABASTECIMENTO (PORTA-A-PORTA & PARTICULARES)', 42, currentY + 4, 7.5, true, '0 0 0');
    p.drawText('QUANTIDADE', 440, currentY + 4, 7.5, true, '0 0 0');
    p.drawText('VISTO', 510, currentY + 4, 7.5, true, '0 0 0');
    currentY -= 18;

    if (itensBaseDiaria.length === 0) {
      p.drawRect(35, currentY - 10, 525, 18, null, '0.5 0.5 0.5');
      p.drawText('Sem artigos de base diária configurados para esta rota.', 45, currentY - 4, 7.5, false, '0.4 0.4 0.4');
      currentY -= 22;
    } else {
      itensBaseDiaria.forEach((it) => {
        if (currentY < 75) {
          p = doc.addPage();
          currentY = 790;
          p.drawRect(35, currentY - 14, 525, 20, null, '0.3 0.3 0.3');
          p.drawText(`${car.rota || car.identificador} - Base Diária (Continuação) • ${dataFormatada}`, 45, currentY - 6, 8, true, '0.2 0.2 0.2');
          currentY -= 28;
        }

        p.drawRect(35, currentY - 5, 525, 16, null, '0.5 0.5 0.5');
        p.drawText(it.nome, 45, currentY, 7.5, false, '0 0 0');
        p.drawText(`[${it.categoria === 'padaria' ? 'Padaria' : 'Pastelaria'}]`, 260, currentY, 7, false, '0.3 0.3 0.3');
        p.drawText(`${it.quantidade} ${it.unidade} (~${it.caixas} cx)`, 440, currentY, 7.5, true, '0 0 0');
        p.drawText('[ ] Carga', 510, currentY, 7.5, false, '0 0 0');
        currentY -= 17;
      });
    }

    // 2. CLIENTES EMPRESARIAIS (B2B) AFETOS À ROTA
    currentY -= 6;
    if (currentY < 90) {
      p = doc.addPage();
      currentY = 790;
    }
    p.drawRect(35, currentY, 525, 16, null, '0.2 0.2 0.2');
    p.drawText('2. CLIENTES EMPRESARIAIS (B2B) AFETOS À ROTA', 42, currentY + 4, 7.5, true, '0 0 0');
    p.drawText('CONFORMIDADE', 490, currentY + 4, 7.5, true, '0 0 0');
    currentY -= 18;

    if (clientesB2BRota.length === 0) {
      p.drawRect(35, currentY - 10, 525, 18, null, '0.5 0.5 0.5');
      p.drawText('Sem clientes B2B agendados para este dia nesta rota.', 45, currentY - 4, 7.5, false, '0.4 0.4 0.4');
      currentY -= 22;
    } else {
      clientesB2BRota.forEach((cli) => {
        const nomeTexto = `${cli.nome}${cli.morada ? ` • ${cli.morada}` : ''}`;
        const itensTexto = cli.itensDoCli.map((it) => `${it.quantidade}x ${it.artigo}`).join(', ');

        const nomeLines = wrapText(nomeTexto, 32);
        const itensLines = wrapText(itensTexto, 45);
        const maxLines = Math.max(nomeLines.length, itensLines.length, 1);
        const lineHeight = 10;
        const rowHeight = Math.max(18, maxLines * lineHeight + 6);

        if (currentY - rowHeight < 75) {
          p = doc.addPage();
          currentY = 790;
          p.drawRect(35, currentY - 14, 525, 20, null, '0.3 0.3 0.3');
          p.drawText(`${car.rota || car.identificador} - Clientes B2B (Continuação) • ${dataFormatada}`, 45, currentY - 6, 8, true, '0.2 0.2 0.2');
          currentY -= 28;
        }

        p.drawRect(35, currentY - rowHeight + 12, 525, rowHeight, null, '0.5 0.5 0.5');
        p.drawText('[ ] Entregue', 490, currentY + 2, 7.5, false, '0 0 0');

        for (let i = 0; i < maxLines; i++) {
          const yPos = currentY + 2 - (i * lineHeight);
          if (i < nomeLines.length) {
            p.drawText(nomeLines[i], 45, yPos, 7.5, true, '0 0 0');
          }
          if (i < itensLines.length) {
            p.drawText(itensLines[i], 230, yPos, 7.5, false, '0 0 0');
          }
        }
        currentY -= (rowHeight + 2);
      });
    }

    // 3. ENCOMENDAS ADICIONAIS AO DOMICÍLIO
    currentY -= 6;
    if (currentY < 90) {
      p = doc.addPage();
      currentY = 790;
    }
    p.drawRect(35, currentY, 525, 16, null, '0.2 0.2 0.2');
    p.drawText('3. ENCOMENDAS ADICIONAIS AO DOMICÍLIO', 42, currentY + 4, 7.5, true, '0 0 0');
    p.drawText('ESTADO', 505, currentY + 4, 7.5, true, '0 0 0');
    currentY -= 18;

    if (encomendasDomicilio.length === 0) {
      p.drawRect(35, currentY - 10, 525, 18, null, '0.5 0.5 0.5');
      p.drawText('Sem encomendas adicionais ao domicílio para esta data nesta rota.', 45, currentY - 4, 7.5, false, '0.4 0.4 0.4');
      currentY -= 22;
    } else {
      encomendasDomicilio.forEach((enc) => {
        const clienteTexto = `${enc.codigo || '#ENC'} • ${enc.cliente?.nome || 'Cliente'}${enc.cliente?.telefone ? ` (${enc.cliente.telefone})` : ''} - ${enc.cliente?.morada || 'Morada de entrega'}`;
        const itensTexto = enc.itensValidos.map((it: any) => `${it.quantidade}x ${it.produto_nome}`).join(', ');

        const descrLines = wrapText(clienteTexto, 38);
        const itensLines = wrapText(itensTexto, 34);
        const maxLines = Math.max(descrLines.length, itensLines.length, 1);
        const lineHeight = 10;
        const rowHeight = Math.max(18, maxLines * lineHeight + 6);

        if (currentY - rowHeight < 75) {
          p = doc.addPage();
          currentY = 790;
          p.drawRect(35, currentY - 14, 525, 20, null, '0.3 0.3 0.3');
          p.drawText(`${car.rota || car.identificador} - Encomendas (Continuação) • ${dataFormatada}`, 45, currentY - 6, 8, true, '0.2 0.2 0.2');
          currentY -= 28;
        }

        p.drawRect(35, currentY - rowHeight + 12, 525, rowHeight, null, '0.5 0.5 0.5');
        p.drawText('[ ] Entregue', 505, currentY + 2, 7.5, false, '0 0 0');

        for (let i = 0; i < maxLines; i++) {
          const yPos = currentY + 2 - (i * lineHeight);
          if (i < descrLines.length) {
            p.drawText(descrLines[i], 45, yPos, 7.5, false, '0 0 0');
          }
          if (i < itensLines.length) {
            p.drawText(itensLines[i], 285, yPos, 7.5, true, '0 0 0');
          }
        }
        currentY -= (rowHeight + 2);
      });
    }

    // 4. RESUMO GERAL CONSOLIDADO DA GUIA DE CARGA E ASSINATURAS
    currentY -= 12;
    const boxHeight = 44;
    if (currentY - boxHeight < 50) {
      p = doc.addPage();
      currentY = 780;
    }
    p.drawRect(35, currentY - boxHeight, 525, boxHeight, null, '0.2 0.2 0.2');
    p.drawText(
      `TOTAL GERAL A BORDO: ${totalGeralCarga} Unidades | Volume Estimado: ~${totalGeralCaixasEstimadas} Caixas`,
      45,
      currentY - 15,
      8.5,
      true,
      '0 0 0'
    );
    p.drawText('Conferência do Centro de Expedição: ________________________', 45, currentY - 32, 7.5, false, '0.3 0.3 0.3');
    p.drawText(
      `Assinatura do Motorista (${car.nome_condutor || 'Motorista'}): ________________________`,
      310,
      currentY - 32,
      7.5,
      false,
      '0.3 0.3 0.3'
    );
  });

  return doc.toBuffer();
}
