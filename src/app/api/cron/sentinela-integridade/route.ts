import { NextResponse } from 'next/server';
import { executarSentinelaIntegridade } from '@/lib/sentinelaOrionService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(request: Request) {
  return GET(request);
}

export async function GET(request: Request) {
  // 1. Verificação de Segurança (CRON_SECRET)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === 'production' && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return new NextResponse(JSON.stringify({ erro: 'Não autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const url = new URL(request.url);
  const emailDestinatario = url.searchParams.get('email') || undefined;
  const dataParam = url.searchParams.get('data') || undefined;

  const resultado = await executarSentinelaIntegridade(emailDestinatario, dataParam);
  return NextResponse.json(resultado, { status: resultado.sucesso ? 200 : 500 });
}
