/**
 * Construtor Nativo de PDFs de Continuidade de Negócio (BCP)
 * Gera ficheiros binários PDF 1.4 em memória para envio como anexos no Resend.
 * Grelhas calibradas com truncagem estrita de largura para impedir sobreposição de texto.
 */

function fitText(text: string, maxLen: number): string {
  if (!text) return '';
  return text.length > maxLen ? text.slice(0, maxLen - 2) + '..' : text;
}

class PdfPageWriter {
  content: string = '';
  y: number = 780;

  drawText(text: string, x: number, y: number, size: number = 8, isBold: boolean = false, color: string = '0 0 0', maxChars?: number) {
    const font = isBold ? '/F2' : '/F1';
    const textToPrint = maxChars ? fitText(text, maxChars) : text;
    const clean = textToPrint
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[\u0080-\uffff]/g, (c) => {
        const map: Record<string, string> = {
          'á': 'a', 'à': 'a', 'ã': 'a', 'â': 'a', 'é': 'e', 'ê': 'e', 'í': 'i', 'ó': 'o', 'õ': 'o', 'ô': 'o', 'ú': 'u', 'ç': 'c',
          'Á': 'A', 'À': 'A', 'Ã': 'A', 'Â': 'A', 'É': 'E', 'Ê': 'E', 'Í': 'I', 'Ó': 'O', 'Õ': 'O', 'Ô': 'O', 'Ú': 'U', 'Ç': 'C',
          '•': '-', '—': '-', '–': '-', '€': 'EUR', '✓': 'V', '✕': 'X', 'º': 'o', 'ª': 'a'
        };
        return map[c] || '';
      });

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
      const footer = `Folha de Contingencia - Padaria da Vila | Pagina ${i + 1} de ${this.pages.length} | Inprooval Sistemas`;
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
 * Colunas calibradas:
 * HORA: 38-72 | CODIGO: 74-124 | CLIENTE: 126-248 | ARTIGOS: 252-390 | OBSERVACOES: 395-485 | VISTO: 490-555
 */
export function gerarPdfFolhaFabricoLojas(dataAmanhaStr: string): Buffer {
  const doc = new NativePdfDocument(`Folha_Fabrico_Lojas_${dataAmanhaStr}`);

  const lojas = [
    {
      nome: 'Loja 1: Padaria da Vila I (Praca)',
      morada: 'Praca Brandao de Vasconcelos, Arouca',
      encomendas: [
        { hora: '08:00', codigo: '#ENC-2041', cliente: 'Maria Ribeiro (912 345 678)', tipo: 'Balcao', itens: '15x Pao Saloio, 2x Broa Amarela', obs: 'Pao bem cozido', visto: '[ ] Pronto' },
        { hora: '09:30', codigo: '#ENC-2042', cliente: 'Carlos Ferreira (964 112 233)', tipo: 'Balcao', itens: '1x Bolo Aniversario Chantilly (1.5kg)', obs: 'Dizer: Parabens Sofia', visto: '[ ] Pronto' },
        { hora: '11:00', codigo: '#ENC-2045', cliente: 'Restaurante O Pedrogao (918 223 344)', tipo: 'Balcao', itens: '40x Carcacas, 10x Centeio', obs: 'Ensacado em papel', visto: '[ ] Pronto' },
      ],
      totalUnidades: 68
    },
    {
      nome: 'Loja 2: Padaria da Vila II (Av. 25 de Abril)',
      morada: 'Av. 25 de Abril, Arouca',
      encomendas: [
        { hora: '07:30', codigo: '#ENC-2046', cliente: 'Ana Paula Silva (933 445 566)', tipo: 'Balcao', itens: '10x Pao Cereais, 4x Merendas Mistas', obs: 'Quentes se possivel', visto: '[ ] Pronto' },
        { hora: '10:00', codigo: '#ENC-2048', cliente: 'Joao Pedro Martins (915 667 788)', tipo: 'Balcao', itens: '12x Pasteis Nata, 6x Bolas Berlim', obs: 'Caixa pastelaria', visto: '[ ] Pronto' },
      ],
      totalUnidades: 32
    },
    {
      nome: 'Loja 3: Padaria da Vila III (Loja Carocha)',
      morada: 'Ponto de Venda Carocha, Arouca',
      encomendas: [
        { hora: '08:15', codigo: '#ENC-2051', cliente: 'Fernanda Gomes (917 889 900)', tipo: 'Balcao', itens: '20x Pao Alentejano, 5x Broa Avintes', obs: 'Fatiado no balcao', visto: '[ ] Pronto' },
        { hora: '12:00', codigo: '#ENC-2053', cliente: 'Sociedade Recreativa (961 223 344)', tipo: 'Balcao', itens: '50x Carcacas, 2x Pao de Lo Trad.', obs: 'Almoco evento', visto: '[ ] Pronto' },
      ],
      totalUnidades: 77
    },
    {
      nome: 'Loja 4: Padaria da Vila Matriz / Fabrica',
      morada: 'Centro Industrial e Fabrico, Arouca',
      encomendas: [
        { hora: '07:00', codigo: '#ENC-2055', cliente: 'Antonio Manuel Sousa (919 001 122)', tipo: 'Fabrica', itens: '30x Pao Saloio Tradicional, 4x Broas', obs: 'Carregamento cedo', visto: '[ ] Pronto' },
        { hora: '08:45', codigo: '#ENC-2058', cliente: 'Confeitaria Central (935 112 233)', tipo: 'Fabrica', itens: '25x Croissants Franceses, 20x Folhados', obs: 'Massa fresca', visto: '[ ] Pronto' },
      ],
      totalUnidades: 79
    }
  ];

  lojas.forEach((loja, idx) => {
    if (idx > 0) doc.addPage();
    const p = doc.currentPage;

    // Header Principal da Loja
    p.drawRect(35, 745, 525, 55, '0.1 0.1 0.1', null);
    p.drawText('PADARIA DA VILA - CENTRO DE PRODUCAO & KDS', 45, 782, 12, true, '1 1 1');
    p.drawText(`FOLHA DE FABRICO DE ENCOMENDAS • OPERACAO DE ${dataAmanhaStr}`, 45, 767, 9, false, '0.95 0.7 0.1');
    p.drawText(`Salvo-Conduto BCP de Continuidade • Emitido as 23h15`, 345, 767, 8, false, '0.8 0.8 0.8');

    // Subcabeçalho da Loja
    p.drawRect(35, 705, 525, 32, '0.96 0.96 0.96', '0.85 0.85 0.85');
    p.drawText(loja.nome, 45, 723, 11, true, '0.1 0.2 0.4');
    p.drawText(loja.morada, 45, 712, 8, false, '0.4 0.4 0.4');
    p.drawText(`Total Programado: ${loja.totalUnidades} un.`, 430, 716, 9, true, '0.1 0.4 0.2');

    // Tabela Header com larguras e espaçamentos calibrados
    p.drawRect(35, 680, 525, 18, '0.2 0.2 0.25', null);
    p.drawText('HORA', 40, 685, 8, true, '1 1 1');
    p.drawText('CODIGO', 74, 685, 8, true, '1 1 1');
    p.drawText('CLIENTE / CONTACTO', 126, 685, 8, true, '1 1 1');
    p.drawText('ARTIGOS A FABRICAR', 252, 685, 8, true, '1 1 1');
    p.drawText('OBSERVACOES', 395, 685, 8, true, '1 1 1');
    p.drawText('VISTO', 495, 685, 8, true, '1 1 1');

    let currentY = 660;
    loja.encomendas.forEach((enc, encIdx) => {
      const bg = encIdx % 2 === 0 ? '1 1 1' : '0.98 0.98 0.98';
      p.drawRect(35, currentY - 8, 525, 26, bg, '0.9 0.9 0.9');

      p.drawText(enc.hora, 40, currentY + 4, 8, true);
      p.drawText(enc.codigo, 74, currentY + 4, 8, true, '0.1 0.3 0.6');
      p.drawText(enc.cliente, 126, currentY + 4, 8, false, '0 0 0', 25);
      p.drawText(enc.itens, 252, currentY + 4, 8, true, '0.1 0.1 0.1', 28);
      p.drawText(enc.obs, 395, currentY + 4, 7, false, '0.35 0.35 0.35', 20);
      p.drawText(enc.visto, 495, currentY + 4, 8, true, '0.2 0.5 0.2');

      currentY -= 30;
    });

    // Bloco de Totais e Assinatura
    currentY -= 20;
    p.drawRect(35, currentY - 10, 525, 45, '0.98 0.98 0.96', '0.85 0.85 0.8');
    p.drawText(`SUBTOTAL DA LOJA: ${loja.encomendas.length} Encomendas | ${loja.totalUnidades} Unidades a Produzir`, 45, currentY + 18, 9, true, '0.1 0.1 0.1');
    p.drawText('Validado pelo Mestre Padeiro: ________________________', 45, currentY, 8, false, '0.3 0.3 0.3');
    p.drawText('Conferencia de Embalamento: ________________________', 320, currentY, 8, false, '0.3 0.3 0.3');
  });

  return doc.toBuffer();
}

/**
 * Constrói o PDF Oficial: Folha de Carga Segregada das 7 Carrinhas
 * Colunas calibradas sem colisão entre texto de morada, artigos e visto.
 */
export function gerarPdfFolhaCargaCarrinhas(dataAmanhaStr: string): Buffer {
  const doc = new NativePdfDocument(`Folha_Carga_7_Carrinhas_${dataAmanhaStr}`);

  const rotas = [
    {
      rota: 'Rota 1 - Carro 1 (Centro & Vale de Cambra)',
      matricula: '42-AB-90',
      condutor: 'Manuel Silva',
      baseDiaria: [
        { item: 'Pao Saloio Tradicional', qtd: 140 },
        { item: 'Carcacas de Trigo', qtd: 200 },
        { item: 'Broa de Milho Amarela', qtd: 35 },
        { item: 'Pao de Centeio', qtd: 25 },
      ],
      clientesB2B: [
        { nome: 'Restaurante Gamarao', itens: '30x Carcacas, 5x Broas' },
        { nome: 'Lar Terceira Idade Cambra', itens: '60x Saloio Fatiado, 20x Regueifas' },
        { nome: 'Hospital da Misericordia', itens: '80x Carcacas s/ Sal, 15x Integral' }
      ],
      encomendasDomicilio: [
        { morada: 'R. Flores 12, Vale Cambra', cliente: 'Antonio Dias (914 111 222)', itens: '4x Broas Amarelas' }
      ],
      totalUnidades: 614,
      caixasEstimadas: 18
    },
    {
      rota: 'Rota 2 - Carro 2 (Moldes & Serra)',
      matricula: '18-XT-34',
      condutor: 'Joaquim Oliveira',
      baseDiaria: [
        { item: 'Pao Saloio Tradicional', qtd: 120 },
        { item: 'Carcacas de Trigo', qtd: 160 },
        { item: 'Broa de Avintes', qtd: 20 },
      ],
      clientesB2B: [
        { nome: 'Pacheco Moldes (Refeitorio)', itens: '50x Carcacas, 10x Saloios' },
        { nome: 'Centro Social do Burgo', itens: '40x Carcacas, 10x Pao de Leite' }
      ],
      encomendasDomicilio: [],
      totalUnidades: 410,
      caixasEstimadas: 12
    },
    {
      rota: 'Rota 3 - Carro 3 (Alvarenga & Passadicos)',
      matricula: '65-QZ-12',
      condutor: 'Rui Fernandes',
      baseDiaria: [
        { item: 'Pao Saloio Tradicional', qtd: 180 },
        { item: 'Carcacas de Trigo', qtd: 220 },
        { item: 'Broa de Milho', qtd: 45 },
      ],
      clientesB2B: [
        { nome: 'Restaurante Ponte de Telhe', itens: '40x Broas de Milho, 30x Saloios' },
        { nome: 'Cafe Ribeiro (Alvarenga)', itens: '25x Carcacas, 5x Broas' }
      ],
      encomendasDomicilio: [
        { morada: 'Lugar Paradinha, Passadicos', cliente: 'Casa Turistica Paiva (962 334 455)', itens: '10x Saloio, 4x Broas' }
      ],
      totalUnidades: 569,
      caixasEstimadas: 16
    },
    {
      rota: 'Rota 4 - Carro 4 (Escariz & Mansores)',
      matricula: '33-LP-77',
      condutor: 'Fernando Santos',
      baseDiaria: [
        { item: 'Pao Saloio Tradicional', qtd: 110 },
        { item: 'Carcacas de Trigo', qtd: 150 },
        { item: 'Broa Amarela', qtd: 30 },
      ],
      clientesB2B: [
        { nome: 'Escola Basica de Escariz', itens: '80x Carcacas, 15x Pao Forma' }
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
        { item: 'Pao Saloio Tradicional', qtd: 130 },
        { item: 'Carcacas de Trigo', qtd: 170 },
        { item: 'Broa de Milho', qtd: 30 },
      ],
      clientesB2B: [
        { nome: 'Mercearia Central de Chave', itens: '35x Saloio, 20x Carcacas' }
      ],
      encomendasDomicilio: [],
      totalUnidades: 385,
      caixasEstimadas: 11
    },
    {
      rota: 'Rota 6 - Carro 6 (Urro & Varzea)',
      matricula: '51-VC-28',
      condutor: 'Tiago Rocha',
      baseDiaria: [
        { item: 'Pao Saloio Tradicional', qtd: 95 },
        { item: 'Carcacas de Trigo', qtd: 140 },
        { item: 'Broa Amarela', qtd: 20 },
      ],
      clientesB2B: [
        { nome: 'Centro Paroquial D. Urro', itens: '30x Pao Saloio, 10x Broas' }
      ],
      encomendasDomicilio: [],
      totalUnidades: 295,
      caixasEstimadas: 9
    },
    {
      rota: 'Rota 7 - Carro 7 (Santa Eulalia & Tropeco)',
      matricula: '76-MN-99',
      condutor: 'Carlos Moreira',
      baseDiaria: [
        { item: 'Pao Saloio Tradicional', qtd: 105 },
        { item: 'Carcacas de Trigo', qtd: 155 },
        { item: 'Broa de Milho', qtd: 25 },
      ],
      clientesB2B: [
        { nome: 'Patronato de Santa Eulalia', itens: '40x Carcacas, 10x Pao Integral' }
      ],
      encomendasDomicilio: [],
      totalUnidades: 335,
      caixasEstimadas: 10
    }
  ];

  rotas.forEach((r, idx) => {
    if (idx > 0) doc.addPage();
    const p = doc.currentPage;

    // Header da Carrinha
    p.drawRect(35, 745, 525, 55, '0.1 0.2 0.35', null);
    p.drawText('PADARIA DA VILA - EXPEDICAO E LOGISTICA DE ROTAS', 45, 782, 12, true, '1 1 1');
    p.drawText(`GUIA OFICIAL DE CARGA • OPERACAO DE ${dataAmanhaStr}`, 45, 767, 9, false, '0.3 0.8 1');
    p.drawText(`Viatura: ${r.matricula} | Condutor: ${r.condutor}`, 350, 767, 8, false, '0.85 0.85 0.85');

    // Identificação da Rota
    p.drawRect(35, 705, 525, 32, '0.96 0.97 0.99', '0.8 0.85 0.9');
    p.drawText(r.rota, 45, 723, 11, true, '0.1 0.2 0.4');
    p.drawText(`Total a Bordo: ${r.totalUnidades} un. | Estimativa de Volume: ~${r.caixasEstimadas} Caixas`, 45, 712, 8, true, '0.2 0.4 0.2');
    p.drawText('Visto Expedicao: [ ] Conforme', 420, 716, 8, true, '0.2 0.2 0.2');

    // 1. BASE DIÁRIA
    p.drawRect(35, 680, 525, 16, '0.25 0.3 0.35', null);
    p.drawText('1. BASE DIARIA DE ABASTECIMENTO (PORTA-A-PORTA)', 40, 685, 8, true, '1 1 1');
    p.drawText('QUANTIDADE', 485, 685, 8, true, '1 1 1');

    let currentY = 662;
    r.baseDiaria.forEach((b, bIdx) => {
      const bg = bIdx % 2 === 0 ? '1 1 1' : '0.98 0.98 0.98';
      p.drawRect(35, currentY - 5, 525, 18, bg, '0.9 0.9 0.9');
      p.drawText(b.item, 45, currentY, 8, false, '0 0 0', 45);
      p.drawText(`${b.qtd} un.`, 485, currentY, 8, true);
      currentY -= 20;
    });

    // 2. CLIENTES B2B
    currentY -= 6;
    p.drawRect(35, currentY - 5, 525, 16, '0.2 0.35 0.25', null);
    p.drawText('2. CLIENTES EMPRESARIAIS (B2B) AFETOS A ROTA', 40, currentY, 8, true, '1 1 1');
    p.drawText('CONFORMIDADE', 485, currentY, 8, true, '1 1 1');
    currentY -= 18;

    if (r.clientesB2B.length === 0) {
      p.drawText('Sem clientes B2B agendados para este dia.', 45, currentY, 8, false, '0.5 0.5 0.5');
      currentY -= 18;
    } else {
      r.clientesB2B.forEach((b2b, bIdx) => {
        const bg = bIdx % 2 === 0 ? '1 1 1' : '0.98 0.98 0.98';
        p.drawRect(35, currentY - 5, 525, 18, bg, '0.9 0.9 0.9');
        p.drawText(b2b.nome, 45, currentY, 8, true, '0.1 0.2 0.4', 26);
        p.drawText(b2b.itens, 210, currentY, 8, false, '0 0 0', 44);
        p.drawText('[ ] Entregue', 485, currentY, 8, true, '0.2 0.5 0.2');
        currentY -= 20;
      });
    }

    // 3. ENCOMENDAS ADICIONAIS AO DOMICÍLIO
    currentY -= 6;
    p.drawRect(35, currentY - 5, 525, 16, '0.4 0.25 0.15', null);
    p.drawText('3. ENCOMENDAS ADICIONAIS AO DOMICILIO', 40, currentY, 8, true, '1 1 1');
    p.drawText('ESTADO', 485, currentY, 8, true, '1 1 1');
    currentY -= 18;

    if (r.encomendasDomicilio.length === 0) {
      p.drawText('Sem encomendas adicionais ao domicilio para esta data.', 45, currentY, 8, false, '0.5 0.5 0.5');
      currentY -= 18;
    } else {
      r.encomendasDomicilio.forEach((enc, eIdx) => {
        const bg = eIdx % 2 === 0 ? '1 1 1' : '0.98 0.98 0.98';
        p.drawRect(35, currentY - 5, 525, 18, bg, '0.9 0.9 0.9');
        const descr = `${enc.cliente} - ${enc.morada}`;
        p.drawText(descr, 45, currentY, 8, false, '0 0 0', 38);
        p.drawText(enc.itens, 280, currentY, 8, true, '0 0 0', 30);
        p.drawText('[ ] Entregue', 485, currentY, 8, true, '0.2 0.5 0.2');
        currentY -= 20;
      });
    }

    // 4. RESUMO GERAL E ASSINATURAS
    currentY -= 15;
    p.drawRect(35, currentY - 15, 525, 48, '0.97 0.97 0.95', '0.85 0.85 0.8');
    p.drawText(`TOTAL GERAL A BORDO: ${r.totalUnidades} Unidades | Volume Estimado: ${r.caixasEstimadas} Caixas`, 45, currentY + 18, 9, true, '0.1 0.1 0.1');
    p.drawText('Conferido Expedicao: ________________________', 45, currentY, 8, false, '0.3 0.3 0.3');
    p.drawText(`Assinatura do Motorista (${r.condutor}): ________________________`, 280, currentY, 8, false, '0.3 0.3 0.3');
  });

  return doc.toBuffer();
}
