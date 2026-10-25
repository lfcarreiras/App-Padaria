import { NextResponse } from 'next/server';
import { gerarEmailContinuidadeHTML, gerarEmailContinuidadeTexto } from '@/lib/emailContinuidadeTemplate';
import { gerarPdfFolhaFabricoLojas, gerarPdfFolhaCargaCarrinhas } from '@/lib/pdfContinuidadeBuilder';

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

    // 2. Determinar a data da operação de amanhã (Fuso horário Portugal Continental)
    const agora = new Date();
    const amanha = new Date(agora);
    amanha.setDate(agora.getDate() + 1);
    const dataAmanhaStr = amanha.toLocaleDateString('pt-PT', {
      timeZone: 'Europe/Lisbon',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return new NextResponse(JSON.stringify({ erro: 'RESEND_API_KEY não configurada' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const emailsDestino = (process.env.EMAILS_CONTINUIDADE || 'luis.carreiras@inprooval.pt')
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);

    // 3. Geração dos dois documentos oficiais em formato PDF (Buffer em memória)
    const bufferFabrico = gerarPdfFolhaFabricoLojas(dataAmanhaStr);
    const bufferCargas = gerarPdfFolhaCargaCarrinhas(dataAmanhaStr);

    const resumo = `
      • <strong>Folha de Fabrico por Loja:</strong> 4 Lojas Interligadas (Matriz/Fábrica, Praça, Av. 25 de Abril, Carocha).<br />
      • <strong>Folha de Carga das Carrinhas:</strong> 7 Rotas discriminadas (Base Diária, B2B e Domicílios).<br />
      • <strong>Salvaguarda BCP:</strong> Documentos oficiais em anexo para impressão manual ou consulta móvel offline.
    `;

    const resumoTexto = `• Folha de Fabrico por Loja: 4 Lojas Interligadas.\n• Folha de Carga das Carrinhas: 7 Rotas discriminadas.\n• Salvaguarda BCP: Documentos anexos para impressão ou consulta móvel.`;

    const nomeFicheiroFabrico = `Folha_Fabrico_Lojas_${dataAmanhaStr.replace(/\//g, '-')}.pdf`;
    const nomeFicheiroCarga = `Folha_Carga_7_Carrinhas_${dataAmanhaStr.replace(/\//g, '-')}.pdf`;

    // 4. Disparo através da API REST oficial da Resend com os dois PDFs em anexo
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Inprooval Sistemas <sistema@inprooval.pt>',
        to: emailsDestino,
        reply_to: 'Inprooval Suporte <suporte@inprooval.pt>',
        subject: `[Continuidade de Negócio] Planos de Produção e Carga - Padaria da Vila (${dataAmanhaStr})`,
        html: gerarEmailContinuidadeHTML(dataAmanhaStr, resumo),
        text: gerarEmailContinuidadeTexto(dataAmanhaStr, resumoTexto),
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
      mensagem: 'E-mail de continuidade de negócio disparado com sucesso com 2 anexos PDF.',
      resendId: data.id,
      destinatarios: emailsDestino,
      dataOperacao: dataAmanhaStr,
      anexos: [nomeFicheiroFabrico, nomeFicheiroCarga],
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron Continuidade Fatal Error]:', error);
    return NextResponse.json(
      { sucesso: false, erro: error.message || 'Erro interno no disparo' },
      { status: 500 }
    );
  }
}
