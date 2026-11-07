import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { sendOperationalPushNotification } from '../../../../lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const reqBody = await request.json();
    const { title, body: messageBody, targetRoute, deviceType, userId } = reqBody;

    if (!title || !messageBody) {
      return NextResponse.json(
        { ok: false, error: 'Título e mensagem são obrigatórios.' },
        { status: 400 }
      );
    }

    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: 'Supabase não está configurado.' },
        { status: 500 }
      );
    }

    // Consulta tokens dos dispositivos-alvo
    let query = supabase.from('user_fcm_tokens').select('fcm_token');
    if (deviceType) {
      query = query.eq('device_type', deviceType);
    }
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error: dbError } = await query;
    if (dbError) {
      return NextResponse.json(
        { ok: false, error: dbError.message },
        { status: 500 }
      );
    }

    const tokens = (data || []).map((row: { fcm_token: string }) => row.fcm_token).filter(Boolean);

    if (tokens.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'Nenhum dispositivo alvo registado com token ativo.',
        dispatchedCount: 0,
      });
    }

    const pushResult = await sendOperationalPushNotification({
      tokens,
      title,
      body: messageBody,
      targetRoute: targetRoute || '/gestao',
    });

    // Limpeza automática de tokens que expiraram ou foram desinstalados
    if (pushResult.invalidTokens && pushResult.invalidTokens.length > 0) {
      await supabase
        .from('user_fcm_tokens')
        .delete()
        .in('fcm_token', pushResult.invalidTokens);
    }

    return NextResponse.json({
      ok: true,
      dispatchedCount: pushResult.successCount,
      failedCount: pushResult.failureCount,
      purgedTokensCount: pushResult.invalidTokens.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro inesperado ao processar push notification' },
      { status: 500 }
    );
  }
}