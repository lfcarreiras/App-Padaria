import { NextResponse } from 'next/server';
import { compilarPoolNoturnaAutomatica } from '../../../../lib/poolNoturnaService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dataRef = searchParams.get('data') || undefined;
    const resultado = await compilarPoolNoturnaAutomatica(dataRef);

    return NextResponse.json({
      ok: resultado.sucesso,
      resultado,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao executar fecho noturno' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const resultado = await compilarPoolNoturnaAutomatica(body?.data);

    return NextResponse.json({
      ok: resultado.sucesso,
      resultado,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao processar fecho noturno' },
      { status: 500 }
    );
  }
}
