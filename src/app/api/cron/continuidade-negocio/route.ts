import { NextResponse } from 'next/server';
import { gerarEmailContinuidadeHTML, gerarEmailContinuidadeTexto } from '@/lib/emailContinuidadeTemplate';

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

    const resumo = `
      • Salvaguarda programada das 4 Lojas e 7 Carrinhas.<br />
      • Envio automático diário de contingência gerado às 23h15.<br />
      • Destinatários oficiais: ${emailsDestino.join(', ')}
    `;

    const resumoTexto = `• Salvaguarda programada das 4 Lojas e 7 Carrinhas.\n• Envio automático diário de contingência gerado às 23h15.\n• Destinatários: ${emailsDestino.join(', ')}`;

    // 3. Disparo através da API REST oficial da Resend (sem necessidade de SDK pesado)
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
      }),
    });

    const data = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('[Continuidade Resend Error]:', data);
      return NextResponse.json({ sucesso: false, erro: data }, { status: resendResponse.status });
    }

    return NextResponse.json({
      sucesso: true,
      mensagem: 'E-mail de continuidade de negócio disparado com sucesso.',
      resendId: data.id,
      destinatarios: emailsDestino,
      dataOperacao: dataAmanhaStr,
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
