'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellRing, Loader2 } from 'lucide-react';
import { registerPushNotifications, listenForegroundNotifications } from '../lib/firebase/client';
import { useAuth } from '../lib/authContext';

interface NotificationBellProps {
  deviceType?: 'mobile_carrinha' | 'tablet_kds' | 'pos_loja' | 'desktop_gestao' | 'outro';
  className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  deviceType = 'desktop_gestao',
  className = '',
}) => {
  const { usuario } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }

    // Escuta notificações enquanto a app está aberta no ecrã
    let unsubscribe: (() => void) | null = null;
    listenForegroundNotifications((payload) => {
      if (payload.title) {
        setToastMessage(`${payload.title}: ${payload.body || ''}`);
        setTimeout(() => setToastMessage(null), 5000);
      }
    }).then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleToggleNotifications = async () => {
    if (!usuario) return;
    setLoading(true);
    try {
      const token = await registerPushNotifications(
        usuario.id,
        deviceType as 'mobile_carrinha' | 'tablet_kds' | 'pos_loja' | 'desktop_gestao' | 'outro',
        navigator.userAgent.slice(0, 80)
      );
      if (token) {
        setPermission('granted');
        setToastMessage('Alertas em tempo real ativados neste posto!');
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch (err) {
      console.error('Erro ao ativar notificações:', err);
    } finally {
      setLoading(false);
    }
  };

  const isGranted = permission === 'granted';

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        onClick={handleToggleNotifications}
        disabled={loading}
        title={isGranted ? 'Notificações push ativas neste posto' : 'Ativar notificações push'}
        className={`p-2 rounded-lg transition-colors border flex items-center gap-1.5 text-xs font-medium ${
          isGranted
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
            : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white hover:bg-neutral-700'
        }`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
        ) : isGranted ? (
          <>
            <BellRing className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">Alertas Ativos</span>
          </>
        ) : (
          <>
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Ativar Alertas</span>
          </>
        )}
      </button>

      {/* Toast flutuante de notificação instantânea em primeiro plano */}
      {toastMessage && (
        <div className="absolute right-0 top-12 z-50 w-72 bg-neutral-900 border border-amber-500/40 text-white rounded-xl shadow-2xl p-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start gap-2">
            <BellRing className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">{toastMessage}</div>
          </div>
        </div>
      )}
    </div>
  );
};