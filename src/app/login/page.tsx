'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/authContext';
import { useTranslation } from '../../lib/i18n';
import { Lock, User, Eye, EyeOff, Globe, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { usuario, login, obterRotaInicial } = useAuth();
  const { t, language, setLanguage } = useTranslation();

  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [erro, setErro] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Se já estiver com sessão iniciada, redirecionar para a página permitida
  useEffect(() => {
    if (usuario && usuario.ativo) {
      const rota = obterRotaInicial(usuario);
      router.push(rota);
    }
  }, [usuario, obterRotaInicial, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setSubmitting(true);

    try {
      const res = await login(identificador, password);
      if (res.success) {
        router.push(obterRotaInicial());
      } else {
        setErro(res.message || t.loginInvalidCredentials);
      }
    } catch (err: any) {
      setErro(err.message || t.error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcessoRapido = async (userDemo: string, passDemo: string) => {
    setIdentificador(userDemo);
    setPassword(passDemo);
    setErro('');
    setSubmitting(true);
    const res = await login(userDemo, passDemo);
    if (res.success) {
      router.push(obterRotaInicial());
    } else {
      setErro(res.message || t.loginInvalidCredentials);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center items-center p-4 sm:p-6 relative">
      {/* Seletor de Idioma no Canto Superior Direito */}
      <div className="absolute top-4 right-4">
        <button
          type="button"
          onClick={() => setLanguage(language === 'pt' ? 'en' : 'pt')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-stone-50 shadow-xs border border-stone-200 transition"
        >
          <Globe className="h-4 w-4 text-amber-600" />
          <span>{language === 'pt' ? '🇵🇹 Português' : '🇬🇧 English'}</span>
        </button>
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-stone-200 overflow-hidden">
        {/* Cabeçalho do Card */}
        <div className="bg-stone-900 text-white p-6 text-center relative overflow-hidden">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg text-2xl mb-3">
            🥖
          </div>
          <h1 className="text-xl font-black tracking-tight">{t.appTitle}</h1>
          <p className="text-xs text-stone-300 mt-1">{t.loginSubtitle}</p>
        </div>

        {/* Formulário de Autenticação */}
        <div className="p-6 sm:p-8 space-y-6">
          {erro && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2.5 animate-shake">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                {t.loginIdentifierLabel}
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value)}
                  placeholder={t.loginIdentifierPlaceholder}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 bg-stone-50/50 text-xs font-medium focus:bg-white focus:border-amber-500 focus:outline-hidden transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                {t.loginPasswordLabel}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.loginPasswordPlaceholder}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-300 bg-stone-50/50 text-xs font-medium focus:bg-white focus:border-amber-500 focus:outline-hidden transition"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {mostrarPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg transition disabled:opacity-50 cursor-pointer"
            >
              <span>{submitting ? t.loading : t.loginButton}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Secção de Acesso Rápido de Teste */}
          <div className="pt-4 border-t border-stone-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block mb-2 text-center">
              {t.loginDemoAccess}
            </span>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => handleAcessoRapido('admin@padaria.pt', 'admin')}
                className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-left transition"
              >
                👑 <b>Admin Geral</b>
                <span className="block text-[10px] text-purple-600 font-normal">Acesso total</span>
              </button>

              <button
                type="button"
                onClick={() => handleAcessoRapido('antonio.silva@padaria.pt', '123')}
                className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-left transition"
              >
                🏪 <b>Gerente Loja</b>
                <span className="block text-[10px] text-blue-600 font-normal">Edição + Leitura</span>
              </button>

              <button
                type="button"
                onClick={() => handleAcessoRapido('marta.santos@padaria.pt', '123')}
                className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-left transition"
              >
                🥐 <b>Balcão Loja</b>
                <span className="block text-[10px] text-amber-600 font-normal">Encomendas & Loja</span>
              </button>

              <button
                type="button"
                onClick={() => handleAcessoRapido('carlos.padeiro@padaria.pt', '123')}
                className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 text-left transition"
              >
                🥖 <b>Padeiro KDS</b>
                <span className="block text-[10px] text-rose-600 font-normal">Produção</span>
              </button>

              <button
                type="button"
                onClick={() => handleAcessoRapido('rui.motorista@padaria.pt', '123')}
                className="col-span-2 p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-center transition"
              >
                🚚 <b>Motorista de Entregas</b> (Carrinha 1)
              </button>
            </div>
          </div>
        </div>

        {/* Rodapé Informativo */}
        <div className="bg-stone-50 p-3.5 border-t border-stone-200 text-center text-[11px] text-gray-500 font-medium">
          <ShieldCheck className="h-3.5 w-3.5 inline mr-1 text-emerald-600" />
          Acesso seguro e restrito a colaboradores autorizados
        </div>
      </div>
    </div>
  );
}
