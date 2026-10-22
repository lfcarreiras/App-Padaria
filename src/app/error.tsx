'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Home } from 'lucide-react';
import Link from 'next/link';
import { getSecretUrl } from '../lib/secretRoutes';

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Next.js Global Client-Side Exception:', error);
  }, [error]);

  const handleLimparCacheERecarregar = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-xl w-full p-6 sm:p-8 rounded-2xl border border-red-200 shadow-xl space-y-4">
        <div className="flex items-center gap-3 text-red-600">
          <div className="p-3 bg-red-50 rounded-xl border border-red-200">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-900">Interceção de Erro na Aplicação</h2>
            <p className="text-xs text-gray-500">Foi capturada uma exceção de execução.</p>
          </div>
        </div>

        <div className="bg-red-50/70 border border-red-200 rounded-xl p-3 text-xs font-mono text-red-800 break-all space-y-1">
          <p className="font-bold">{error.name}: {error.message}</p>
          {error.digest && <p className="text-[10px] text-red-500">Digest: {error.digest}</p>}
          {error.stack && (
            <pre className="text-[10px] text-gray-600 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono mt-2 pt-2 border-t border-red-200">
              {error.stack}
            </pre>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-bakery-600 text-white font-bold text-xs hover:bg-bakery-700 transition cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar Novamente
          </button>

          <button
            type="button"
            onClick={handleLimparCacheERecarregar}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            Limpar Cache & Recarregar
          </button>

          <Link
            href={getSecretUrl('login')}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 transition"
          >
            <Home className="h-4 w-4" />
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
