'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/authContext';

export default function RootPage() {
  const router = useRouter();
  const { usuario, loading, obterRotaInicial } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (usuario && usuario.ativo) {
        router.replace(obterRotaInicial(usuario));
      } else {
        router.replace('/login');
      }
    }
  }, [usuario, loading, router, obterRotaInicial]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100">
      <div className="text-center space-y-3">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white text-2xl animate-pulse">
          🥖
        </div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">A carregar aplicação...</p>
      </div>
    </div>
  );
}
