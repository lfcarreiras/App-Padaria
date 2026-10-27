import { NextResponse } from 'next/server';
import { gerarEmailContinuidadeHTML, gerarEmailContinuidadeTexto } from '@/lib/emailContinuidadeTemplate';
import { gerarPdfFolhaFabricoLojas, gerarPdfFolhaCargaCarrinhas } from '@/lib/pdfContinuidadeBuilder';
import {
  carregarLojasSupabase,
  carregarCarrinhasSupabase,
  carregarProdutosSupabase,
  carregarEncomendasSupabase,
  carregarBasesDiariasRecorrentes,
  carregarBaseFixaCarrinhas,
  sincronizarClientesB2BComSupabase,
  obterDiaSemanaDeData,
} from '@/lib/encomendasService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    // 1. Verificação de Segurança (CRON_SECRET da Vercel)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Em produção na Vercel, o cabeçalho Authorization: Bearer <CRON_SECRET> é obrigatório
    if (process.env.NODE_ENV === 'production' && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return new NextResponse(JSON.stringify({ erro: 'Não autorizado' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // 2. Determinar a data da operação de hoje (Disparo diário às 00h15 - Fuso horário Portugal Continental)
    const agora = new Date();
    const partesData = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Lisbon',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(agora); // 'YYYY-MM-DD'

    const [ano, mes, dia] = partesData.split('-');
    const dataHojeFormatada = `${dia}/${mes}/${ano}`;
    const dataFicheiro = `${dia}-${mes}-${ano}`;
    const diaSemanaHoje = obterDiaSemanaDeData(partesData);

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return new NextResponse(JSON.stringify({ erro: 'RESEND_API_KEY não configurada' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const emailsDestino = (process.env.EMAILS_CONTINUIDADE || 'padariadavila@gmail.com')
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);

    const emailsBcc = (process.env.EMAILS_CONTINUIDADE_BCC || 'luis.carreiras@inprooval.pt')
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);

    // 3. Carregar dados reais consolidados de produção e distribuição
    const [lojas, carrinhas, produtos, encomendas, basesRecorrentes, clientesB2B] = await Promise.all([
      carregarLojasSupabase(),
      carregarCarrinhasSupabase(),
      carregarProdutosSupabase(),
      carregarEncomendasSupabase(),
      carregarBasesDiariasRecorrentes(),
      sincronizarClientesB2BComSupabase(),
    ]);
    const baseFixaCarrinhas = carregarBaseFixaCarrinhas();

    // 4. Geração dos dois cadernos oficiais em formato PDF (Buffer em memória com auto-wrap e economia de tinteiro)
    const bufferFabrico = gerarPdfFolhaFabricoLojas({
      dataOperacao: partesData,
      dataFormatada: dataHojeFormatada,
      lojas,
      encomendas,
    });

    const bufferCargas = gerarPdfFolhaCargaCarrinhas({
      dataOperacao: partesData,
      dataFormatada: dataHojeFormatada,
      diaSemana: diaSemanaHoje,
      carrinhas,
      baseFixaCarrinhas,
      clientesB2B,
      basesRecorrentes,
      encomendas,
      produtos,
    });

    const nomeFicheiroFabrico = `Folha_Fabrico_${dataFicheiro}.pdf`;
    const nomeFicheiroCarga = `Folha_Carga_Rotas_${dataFicheiro}.pdf`;

    // 5. Disparo através da API REST oficial da Resend com os dois PDFs em anexo
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Inprooval Sistemas <sistema@inprooval.pt>',
        to: emailsDestino,
        bcc: emailsBcc,
        reply_to: 'Inprooval Suporte <suporte@inprooval.pt>',
        subject: `[Continuidade de Negócio] Planos de Fabrico & Carga • Dia atual - Padaria da Vila (${dataHojeFormatada})`,
        html: gerarEmailContinuidadeHTML(dataHojeFormatada),
        text: gerarEmailContinuidadeTexto(dataHojeFormatada),
        attachments: [
          {
            filename: nomeFicheiroFabrico,
            content: bufferFabrico.toString('base64'),
          },
          {
            filename: nomeFicheiroCarga,
            content: bufferCargas.toString('base64'),
          },
        ],
      }),
    });

    const data = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('[Continuidade Resend Error]:', data);
      return NextResponse.json({ sucesso: false, erro: data }, { status: resendResponse.status });
    }

    return NextResponse.json({
      sucesso: true,
      mensagem: `E-mail de continuidade de negócio disparado com sucesso às 00h15 com 2 anexos PDF para a data ${dataHojeFormatada}.`,
      resendId: data.id,
      destinatarios: emailsDestino,
      bcc: emailsBcc,
      dataOperacao: dataHojeFormatada,
      anexos: [nomeFicheiroFabrico, nomeFicheiroCarga],
    });
  } catch (error: any) {
    console.error('[Continuidade Cron Fatal Error]:', error);
    return NextResponse.json({ sucesso: false, erro: error.message || 'Erro interno no cron' }, { status: 500 });
  }
}
