import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

export const isFirebaseAdminConfigured = Boolean(
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY
);

let adminApp: App | null = null;

if (isFirebaseAdminConfigured) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    adminApp = !getApps().length
      ? initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey,
          }),
        })
      : getApps()[0];

    console.info('[Firebase Admin] Inicializado com sucesso para projeto:', process.env.FIREBASE_PROJECT_ID);
  } catch (err) {
    console.error('[Firebase Admin] Erro de inicialização:', err);
  }
}

export { adminApp };

export interface SendPushParams {
  tokens: string[];
  title: string;
  body: string;
  targetRoute?: string;
  data?: Record<string, string>;
}

export interface PushResult {
  successCount: number;
  failureCount: number;
  invalidTokens: string[];
}

/**
 * Dispara notificações push operacionais em lote para dispositivos em background.
 */
export async function sendOperationalPushNotification(
  params: SendPushParams
): Promise<PushResult> {
  const { tokens, title, body, targetRoute, data = {} } = params;

  if (!tokens || tokens.length === 0) {
    return { successCount: 0, failureCount: 0, invalidTokens: [] };
  }

  if (!isFirebaseAdminConfigured || !adminApp) {
    console.warn('[Firebase Admin] Tentativa de envio sem credenciais configuradas.');
    return { successCount: 0, failureCount: tokens.length, invalidTokens: [] };
  }

  try {
    const messaging = getMessaging(adminApp);

    const payload = {
      tokens,
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        targetRoute: targetRoute || '/gestao',
        click_action: targetRoute || '/gestao',
      },
      webpush: {
        fcmOptions: {
          link: targetRoute || '/gestao',
        },
        notification: {
          icon: '/logo-padaria.jpg',
          badge: '/logo-padaria.jpg',
          vibrate: [200, 100, 200],
        },
      },
    };

    const response = await messaging.sendEachForMulticast(payload);

    const invalidTokens: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const errorCode = resp.error?.code;
        if (
          errorCode === 'messaging/invalid-registration-token' ||
          errorCode === 'messaging/registration-token-not-registered'
        ) {
          invalidTokens.push(tokens[idx]);
        }
      }
    });

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      invalidTokens,
    };
  } catch (error) {
    console.error('[Firebase Admin] Falha ao enviar notificações push:', error);
    return { successCount: 0, failureCount: tokens.length, invalidTokens: [] };
  }
}