import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';
import { supabase } from '@/lib/supabase';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const isFirebaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
  process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
);

// Inicialização segura no client-side
export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured || typeof window === 'undefined') {
    return null;
  }
  return !getApps().length ? initializeApp(firebaseConfig) : getApp();
}

/**
 * Solicita autorização de notificações ao utilizador e sincroniza o FCM Token com o Supabase.
 */
export async function registerPushNotifications(
  userId: string,
  deviceType: 'mobile_carrinha' | 'tablet_kds' | 'pos_loja' | 'desktop_gestao' | 'outro' = 'outro',
  deviceLabel?: string
): Promise<string | null> {
  try {
    const supported = await isSupported();
    if (!supported || typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('[FCM] Push notifications não são suportadas neste navegador.');
      return null;
    }

    const app = getFirebaseApp();
    if (!app) {
      console.warn('[FCM] Configuração Firebase incompleta.');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[FCM] Permissão de notificação recusada pelo utilizador.');
      return null;
    }

    // Regista ou reutiliza o Service Worker dedicado do Firebase
    const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    const messaging: Messaging = getMessaging(app);
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

    const fcmToken = await getToken(messaging, {
      serviceWorkerRegistration: swRegistration,
      vapidKey,
    });

    if (fcmToken && supabase) {
      // Registo relacional no Supabase (Fonte Canónica da Verdade)
      const { error } = await supabase.from('user_fcm_tokens').upsert(
        {
          user_id: userId,
          fcm_token: fcmToken,
          device_type: deviceType,
          device_label: deviceLabel || (navigator.userAgent.slice(0, 80)),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'fcm_token' }
      );

      if (error) {
        console.error('[FCM] Erro ao sincronizar token com Supabase:', error.message);
      } else {
        console.info('[FCM] Token operacional sincronizado com sucesso:', fcmToken.slice(0, 15) + '...');
      }
    }

    return fcmToken;
  } catch (err) {
    console.error('[FCM] Falha ao registar notificações push:', err);
    return null;
  }
}

/**
 * Escuta notificações recebidas em primeiro plano (quando a aplicação está aberta).
 */
export async function listenForegroundNotifications(
  onNotificationReceived: (payload: { title?: string; body?: string; data?: Record<string, string> }) => void
): Promise<(() => void) | null> {
  try {
    const supported = await isSupported();
    if (!supported) return null;

    const app = getFirebaseApp();
    if (!app) return null;

    const messaging = getMessaging(app);
    return onMessage(messaging, (payload) => {
      onNotificationReceived({
        title: payload.notification?.title,
        body: payload.notification?.body,
        data: payload.data as Record<string, string>,
      });
    });
  } catch (err) {
    console.error('[FCM] Falha ao iniciar listener em foreground:', err);
    return null;
  }
}