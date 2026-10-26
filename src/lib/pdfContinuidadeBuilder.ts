/**
 * Construtor Nativo de PDFs de Continuidade de Negócio (BCP)
 * Gera ficheiros binários PDF 1.4 em memória para envio como anexos no Resend.
 * Formatação dinâmica (Auto-Wrap / Multi-line) que se molda ao tamanho do texto sem qualquer corte.
 */

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

class PdfPageWriter {
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
      p.drawText(footer, 160, 20, 7, false, '0.5 0.5 0.5');

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

/**
 * Constrói o PDF Oficial: Folha de Fabrico de Encomendas por Loja
 * Layout dinâmico que se molda automaticamente à extensão dos textos.
 */
export function gerarPdfFolhaFabricoLojas(dataAmanhaStr: string): Buffer {
  const doc = new NativePdfDocument(`Folha_Fabrico_${dataAmanhaStr}`);

  const lojas = [
    {
      nome: 'Loja 1: Padaria da Vila I (Praça)',
      morada: 'Praça Brandão de Vasconcelos, Arouca',
      encomendas: [
        { hora: '08:00', codigo: '#ENC-2041', cliente: 'Maria Ribeiro (912 345 678)', itens: '15x Pão Saloio, 2x Broa Amarela', obs: 'Pão bem cozido com casca rija' },
        { hora: '09:30', codigo: '#ENC-2042', cliente: 'Carlos Ferreira (964 112 233)', itens: '1x Bolo de Aniversário Chantilly e Frutas (1.5kg)', obs: 'Dizer no topo: Parabéns Sofia' },
        { hora: '11:00', codigo: '#ENC-2045', cliente: 'Restaurante O Pedrogão (918 223 344)', itens: '40x Carcaças de Trigo, 10x Pão de Centeio Tradicional', obs: 'Entregar ensacado em papel kraft' },
      ],
      totalUnidades: 68
    },
    {
      nome: 'Loja 2: Padaria da Vila II (Av. 25 de Abril)',
      morada: 'Av. 25 de Abril, Arouca',
      encomendas: [
        { hora: '07:30', codigo: '#ENC-2046', cliente: 'Ana Paula Silva (933 445 566)', itens: '10x Pão de Cereais, 4x Merendas Mistas da Padaria', obs: 'Sair da primeira fornada bem quentes' },
        { hora: '10:00', codigo: '#ENC-2048', cliente: 'João Pedro Martins (915 667 788)', itens: '12x Pastéis de Nata Especiais, 6x Bolas de Berlim com Creme', obs: 'Acondicionar em caixa de pastelaria de transporte' },
      ],
      totalUnidades: 32
    },
    {
      nome: 'Loja 3: Padaria da Vila III (Loja Carocha)',
      morada: 'Ponto de Venda Carocha, Arouca',
      encomendas: [
        { hora: '08:15', codigo: '#ENC-2051', cliente: 'Fernanda Gomes (917 889 900)', itens: '20x Pão Alentejano Redondo, 5x Broa de Avintes Regional', obs: 'Cortar e fatiar no balcão antes de embalar' },
        { hora: '12:00', codigo: '#ENC-2053', cliente: 'Sociedade Recreativa e Cultural (961 223 344)', itens: '50x Carcaças de Trigo, 2x Pão de Ló Tradicional de Arouca', obs: 'Encomenda reservada para o almoço do evento cultural' },
      ],
      totalUnidades: 77
    },
    {
      nome: 'Loja 4: Padaria da Vila Matriz / Fábrica',
      morada: 'Centro Industrial e Fabrico, Arouca',
      encomendas: [
        { hora: '07:00', codigo: '#ENC-2055', cliente: 'António Manuel Sousa (919 001 122)', itens: '30x Pão Saloio Tradicional, 4x Broas Amarelas de Milho', obs: 'Carregamento prioritário logo às primeiras horas' },
        { hora: '08:45', codigo: '#ENC-2058', cliente: 'Confeitaria Central de Arouca (935 112 233)', itens: '25x Croissants Franceses Manteiga, 20x Folhados Mistos', obs: 'Massa folhada fresca acabada de sair' },
      ],
      totalUnidades: 79
    }
  ];

  lojas.forEach((loja, idx) => {
    if (idx > 0) doc.addPage();
    let p = doc.currentPage;

    // Header Principal da Loja
    p.drawRect(35, 745, 525, 55, '0.1 0.1 0.1', null);
    p.drawText('PADARIA DA VILA - CENTRO DE PRODUÇÃO & KDS', 45, 782, 12, true, '1 1 1');
    p.drawText(`FOLHA DE FABRICO DE ENCOMENDAS • OPERAÇÃO DE ${dataAmanhaStr}`, 45, 767, 9, false, '0.95 0.7 0.1');

    // Subcabeçalho da Loja
    p.drawRect(35, 705, 525, 32, '0.96 0.96 0.96', '0.85 0.85 0.85');
    p.drawText(loja.nome, 45, 723, 11, true, '0.1 0.2 0.4');
    p.drawText(loja.morada, 45, 712, 8, false, '0.4 0.4 0.4');
    p.drawText(`Total Programado: ${loja.totalUnidades} un.`, 430, 716, 9, true, '0.1 0.4 0.2');

    // Tabela Header
    p.drawRect(35, 680, 525, 18, '0.2 0.2 0.25', null);
    p.drawText('HORA', 40, 685, 8, true, '1 1 1');
    p.drawText('CÓDIGO', 74, 685, 8, true, '1 1 1');
    p.drawText('CLIENTE / CONTACTO', 126, 685, 8, true, '1 1 1');
    p.drawText('ARTIGOS A FABRICAR', 246, 685, 8, true, '1 1 1');
    p.drawText('OBSERVAÇÕES DE PRODUÇÃO', 386, 685, 8, true, '1 1 1');
    p.drawText('VISTO', 500, 685, 8, true, '1 1 1');

    let currentY = 660;

    loja.encomendas.forEach((enc, encIdx) => {
      // Cálculo de quebras de linha dinâmicas por coluna
      const clienteLines = wrapText(enc.cliente, 22);
      const itensLines = wrapText(enc.itens, 26);
      const obsLines = wrapText(enc.obs, 21);

      const maxLines = Math.max(clienteLines.length, itensLines.length, obsLines.length, 1);
      const lineHeight = 11;
      const rowHeight = Math.max(26, maxLines * lineHeight + 10);

      // Verificação de quebra de página
      if (currentY - rowHeight < 80) {
        p = doc.addPage();
        currentY = 780;
      }

      const bg = encIdx % 2 === 0 ? '1 1 1' : '0.98 0.98 0.98';
      p.drawRect(35, currentY - rowHeight + 16, 525, rowHeight, bg, '0.9 0.9 0.9');

      // Desenhar coluna fixa (Hora, Código, Visto)
      p.drawText(enc.hora, 40, currentY + 4, 8, true);
      p.drawText(enc.codigo, 74, currentY + 4, 8, true, '0.1 0.3 0.6');
      p.drawText('[ ] Pronto', 500, currentY + 4, 8, true, '0.2 0.5 0.2');

      // Desenhar linhas dinâmicas de cada coluna
      for (let i = 0; i < maxLines; i++) {
        const yPos = currentY + 4 - (i * lineHeight);

        if (i < clienteLines.length) {
          p.drawText(clienteLines[i], 126, yPos, 8, false, '0 0 0');
        }
        if (i < itensLines.length) {
          p.drawText(itensLines[i], 246, yPos, 8, true, '0.1 0.1 0.1');
        }
        if (i < obsLines.length) {
          p.drawText(obsLines[i], 386, yPos, 7.5, false, '0.35 0.35 0.35');
        }
      }

      currentY -= (rowHeight + 4);
    });

    // Bloco de Totais e Assinatura
    currentY -= 20;
    const boxHeight = 48;
    if (currentY - boxHeight < 60) {
      p = doc.addPage();
      currentY = 780;
    }
    p.drawRect(35, currentY - boxHeight, 525, boxHeight, '0.98 0.98 0.96', '0.85 0.85 0.8');
    p.drawText(`SUBTOTAL DA LOJA: ${loja.encomendas.length} Encomendas | ${loja.totalUnidades} Unidades a Produzir`, 45, currentY - 16, 9, true, '0.1 0.1 0.1');
    p.drawText('Validado pelo Mestre Padeiro: ________________________', 45, currentY - 34, 8, false, '0.3 0.3 0.3');
    p.drawText('Conferência de Embalamento: ________________________', 320, currentY - 34, 8, false, '0.3 0.3 0.3');
    currentY -= boxHeight;
  });

  return doc.toBuffer();
}

/**
 * Constrói o PDF Oficial: Folha de Carga Segregada das 7 Carrinhas
 * Layout dinâmico com auto-wrap de moradas e descrições completas.
 */
export function gerarPdfFolhaCargaCarrinhas(dataAmanhaStr: string): Buffer {
  const doc = new NativePdfDocument(`Folha_Carga_Rotas_${dataAmanhaStr}`);

  const rotas = [
    {
      rota: 'Rota 1 - Carro 1 (Centro & Vale de Cambra)',
      matricula: '42-AB-90',
      condutor: 'Manuel Silva',
      baseDiaria: [
        { item: 'Pão Saloio Tradicional', qtd: 140 },
        { item: 'Carcaças de Trigo', qtd: 200 },
        { item: 'Broa de Milho Amarela', qtd: 35 },
        { item: 'Pão de Centeio', qtd: 25 },
      ],
      clientesB2B: [
        { nome: 'Restaurante Gamarão', itens: '30x Carcaças, 5x Broas' },
        { nome: 'Lar Terceira Idade Cambra', itens: '60x Saloio Fatiado, 20x Regueifas' },
        { nome: 'Hospital da Misericórdia', itens: '80x Carcaças s/ Sal, 15x Integral' }
      ],
      encomendasDomicilio: [
        { morada: 'Rua das Flores 12, Vale de Cambra', cliente: 'António Dias (914 111 222)', itens: '4x Broas Amarelas de Milho Tradicional' }
      ],
      totalUnidades: 614,
      caixasEstimadas: 18
    },
    {
      rota: 'Rota 2 - Carro 2 (Moldes & Serra)',
      matricula: '18-XT-34',
      condutor: 'Joaquim Oliveira',
      baseDiaria: [
        { item: 'Pão Saloio Tradicional', qtd: 120 },
        { item: 'Carcaças de Trigo', qtd: 160 },
        { item: 'Broa de Avintes', qtd: 20 },
      ],
      clientesB2B: [
        { nome: 'Pacheco Moldes (Refeitório Industrial)', itens: '50x Carcaças, 10x Saloios' },
        { nome: 'Centro Social do Burgo', itens: '40x Carcaças, 10x Pão de Leite' }
      ],
      encomendasDomicilio: [],
      totalUnidades: 410,
      caixasEstimadas: 12
    },
    {
      rota: 'Rota 3 - Carro 3 (Alvarenga & Passadiços)',
      matricula: '65-QZ-12',
      condutor: 'Rui Fernandes',
      baseDiaria: [
        { item: 'Pão Saloio Tradicional', qtd: 180 },
        { item: 'Carcaças de Trigo', qtd: 220 },
        { item: 'Broa de Milho', qtd: 45 },
      ],
      clientesB2B: [
        { nome: 'Restaurante Ponte de Telhe', itens: '40x Broas de Milho, 30x Saloios' },
        { nome: 'Café Ribeiro (Alvarenga)', itens: '25x Carcaças, 5x Broas' }
      ],
      encomendasDomicilio: [
        { morada: 'Lugar de Paradinha, Passadiços do Paiva', cliente: 'Casa Turística Paiva (962 334 455)', itens: '10x Saloio, 4x Broas de Milho' }
      ],
      totalUnidades: 569,
      caixasEstimadas: 16
    },
    {
      rota: 'Rota 4 - Carro 4 (Escariz & Mansores)',
      matricula: '33-LP-77',
      condutor: 'Fernando Santos',
      baseDiaria: [
        { item: 'Pão Saloio Tradicional', qtd: 110 },
        { item: 'Carcaças de Trigo', qtd: 150 },
        { item: 'Broa Amarela', qtd: 30 },
      ],
      clientesB2B: [
        { nome: 'Escola Básica de Escariz (Cantina Escolar)', itens: '80x Carcaças, 15x Pão de Forma' }
      ],
      encomendasDomicilio: [],
      totalUnidades: 385,
      caixasEstimadas: 11
    },
    {
      rota: 'Rota 5 - Carro 5 (Chave & Fermedo)',
      matricula: '89-GH-55',
      condutor: 'Alberto Costa',
      baseDiaria: [
        { item: 'Pão Saloio Tradicional', qtd: 130 },
        { item: 'Carcaças de Trigo', qtd: 170 },
        { item: 'Broa de Milho', qtd: 30 },
      ],
      clientesB2B: [
        { nome: 'Mercearia Central de Chave', itens: '35x Saloio, 20x Carcaças' }
      ],
      encomendasDomicilio: [],
      totalUnidades: 385,
      caixasEstimadas: 11
    },
    {
      rota: 'Rota 6 - Carro 6 (Urro & Várzea)',
      matricula: '51-VC-28',
      condutor: 'Tiago Rocha',
      baseDiaria: [
        { item: 'Pão Saloio Tradicional', qtd: 95 },
        { item: 'Carcaças de Trigo', qtd: 140 },
        { item: 'Broa Amarela', qtd: 20 },
      ],
      clientesB2B: [
        { nome: 'Centro Paroquial D. Urro', itens: '30x Pão Saloio, 10x Broas' }
      ],
      encomendasDomicilio: [],
      totalUnidades: 295,
      caixasEstimadas: 9
    },
    {
      rota: 'Rota 7 - Carro 7 (Santa Eulália & Tropeço)',
      matricula: '76-MN-99',
      condutor: 'Carlos Moreira',
      baseDiaria: [
        { item: 'Pão Saloio Tradicional', qtd: 105 },
        { item: 'Carcaças de Trigo', qtd: 155 },
        { item: 'Broa de Milho', qtd: 25 },
      ],
      clientesB2B: [
        { nome: 'Patronato de Santa Eulália', itens: '40x Carcaças, 10x Pão Integral' }
      ],
      encomendasDomicilio: [],
      totalUnidades: 335,
      caixasEstimadas: 10
    }
  ];

  rotas.forEach((r, idx) => {
    if (idx > 0) doc.addPage();
    let p = doc.currentPage;

    // Header da Carrinha
    p.drawRect(35, 745, 525, 55, '0.1 0.2 0.35', null);
    p.drawText('PADARIA DA VILA - EXPEDIÇÃO E LOGÍSTICA DE ROTAS', 45, 782, 12, true, '1 1 1');
    p.drawText(`GUIA OFICIAL DE CARGA • OPERAÇÃO DE ${dataAmanhaStr}`, 45, 767, 9, false, '0.3 0.8 1');
    p.drawText(`Viatura: ${r.matricula} | Condutor: ${r.condutor}`, 350, 767, 8, false, '0.85 0.85 0.85');

    // Identificação da Rota
    p.drawRect(35, 705, 525, 32, '0.96 0.97 0.99', '0.8 0.85 0.9');
    p.drawText(r.rota, 45, 723, 11, true, '0.1 0.2 0.4');
    p.drawText(`Total a Bordo: ${r.totalUnidades} un. | Estimativa de Volume: ~${r.caixasEstimadas} Caixas`, 45, 712, 8, true, '0.2 0.4 0.2');
    p.drawText('Visto Expedição: [ ] Conforme', 420, 716, 8, true, '0.2 0.2 0.2');

    // 1. BASE DIÁRIA
    p.drawRect(35, 680, 525, 16, '0.25 0.3 0.35', null);
    p.drawText('1. BASE DIÁRIA DE ABASTECIMENTO (PORTA-A-PORTA)', 40, 685, 8, true, '1 1 1');
    p.drawText('QUANTIDADE', 485, 685, 8, true, '1 1 1');

    let currentY = 662;
    r.baseDiaria.forEach((b, bIdx) => {
      const bg = bIdx % 2 === 0 ? '1 1 1' : '0.98 0.98 0.98';
      p.drawRect(35, currentY - 5, 525, 18, bg, '0.9 0.9 0.9');
      p.drawText(b.item, 45, currentY, 8, false);
      p.drawText(`${b.qtd} un.`, 485, currentY, 8, true);
      currentY -= 20;
    });

    // 2. CLIENTES B2B
    currentY -= 6;
    p.drawRect(35, currentY - 5, 525, 16, '0.2 0.35 0.25', null);
    p.drawText('2. CLIENTES EMPRESARIAIS (B2B) AFETOS À ROTA', 40, currentY, 8, true, '1 1 1');
    p.drawText('CONFORMIDADE', 485, currentY, 8, true, '1 1 1');
    currentY -= 18;

    if (r.clientesB2B.length === 0) {
      p.drawText('Sem clientes B2B agendados para este dia.', 45, currentY, 8, false, '0.5 0.5 0.5');
      currentY -= 18;
    } else {
      r.clientesB2B.forEach((b2b, bIdx) => {
        const nomeLines = wrapText(b2b.nome, 25);
        const itensLines = wrapText(b2b.itens, 42);
        const maxLines = Math.max(nomeLines.length, itensLines.length, 1);
        const lineHeight = 11;
        const rowHeight = Math.max(20, maxLines * lineHeight + 8);

        const bg = bIdx % 2 === 0 ? '1 1 1' : '0.98 0.98 0.98';
        p.drawRect(35, currentY - rowHeight + 14, 525, rowHeight, bg, '0.9 0.9 0.9');

        p.drawText('[ ] Entregue', 485, currentY + 2, 8, true, '0.2 0.5 0.2');

        for (let i = 0; i < maxLines; i++) {
          const yPos = currentY + 2 - (i * lineHeight);
          if (i < nomeLines.length) {
            p.drawText(nomeLines[i], 45, yPos, 8, true, '0.1 0.2 0.4');
          }
          if (i < itensLines.length) {
            p.drawText(itensLines[i], 205, yPos, 8, false, '0 0 0');
          }
        }
        currentY -= (rowHeight + 3);
      });
    }

    // 3. ENCOMENDAS ADICIONAIS AO DOMICÍLIO
    currentY -= 6;
    p.drawRect(35, currentY - 5, 525, 16, '0.4 0.25 0.15', null);
    p.drawText('3. ENCOMENDAS ADICIONAIS AO DOMICÍLIO', 40, currentY, 8, true, '1 1 1');
    p.drawText('ESTADO', 485, currentY, 8, true, '1 1 1');
    currentY -= 18;

    if (r.encomendasDomicilio.length === 0) {
      p.drawText('Sem encomendas adicionais ao domicílio para esta data.', 45, currentY, 8, false, '0.5 0.5 0.5');
      currentY -= 25;
    } else {
      r.encomendasDomicilio.forEach((enc, eIdx) => {
        const descr = `${enc.cliente} - ${enc.morada}`;
        const descrLines = wrapText(descr, 36);
        const itensLines = wrapText(enc.itens, 30);
        const maxLines = Math.max(descrLines.length, itensLines.length, 1);
        const lineHeight = 11;
        const rowHeight = Math.max(20, maxLines * lineHeight + 8);

        const bg = eIdx % 2 === 0 ? '1 1 1' : '0.98 0.98 0.98';
        p.drawRect(35, currentY - rowHeight + 14, 525, rowHeight, bg, '0.9 0.9 0.9');

        p.drawText('[ ] Entregue', 485, currentY + 2, 8, true, '0.2 0.5 0.2');

        for (let i = 0; i < maxLines; i++) {
          const yPos = currentY + 2 - (i * lineHeight);
          if (i < descrLines.length) {
            p.drawText(descrLines[i], 45, yPos, 8, false, '0 0 0');
          }
          if (i < itensLines.length) {
            p.drawText(itensLines[i], 285, yPos, 8, true, '0 0 0');
          }
        }
        currentY -= (rowHeight + 3);
      });
      currentY -= 6;
    }

    // 4. RESUMO GERAL E ASSINATURAS
    currentY -= 10;
    const boxHeight = 48;
    if (currentY - boxHeight < 50) {
      p = doc.addPage();
      currentY = 780;
    }
    p.drawRect(35, currentY - boxHeight, 525, boxHeight, '0.97 0.97 0.95', '0.85 0.85 0.8');
    p.drawText(`TOTAL GERAL A BORDO: ${r.totalUnidades} Unidades | Volume Estimado: ~${r.caixasEstimadas} Caixas`, 45, currentY - 16, 9, true, '0.1 0.1 0.1');
    p.drawText('Conferido Expedição: ________________________', 45, currentY - 34, 8, false, '0.3 0.3 0.3');
    p.drawText(`Assinatura do Motorista (${r.condutor}): ________________________`, 280, currentY - 34, 8, false, '0.3 0.3 0.3');
    currentY -= boxHeight;
  });

  return doc.toBuffer();
}
