'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Store, ShoppingBag, ChefHat, Truck, BarChart3, Globe, LogOut, UserCheck, Eye } from 'lucide-react';
import { LOJAS_MOCK } from '../lib/mockData';
import { useTranslation } from '../lib/i18n';
import { useAuth, PainelApp } from '../lib/authContext';

interface NavbarProps {
  selectedLojaId: string;
  onSelectLoja: (lojaId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ selectedLojaId, onSelectLoja }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage, t } = useTranslation();
  const { usuario, logout, getNivelAcesso } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const allLinks: { href: string; label: string; icon: any; panel: PainelApp; aliases?: string[] }[] = [
    { href: '/encomendas', label: t.navEncomendas, icon: ShoppingBag, panel: 'encomendas', aliases: ['/balcao'] },
    { href: '/producao', label: t.navProducao, icon: ChefHat, panel: 'producao' },
    { href: '/loja', label: t.navLoja, icon: Store, panel: 'loja' },
    { href: '/entregas', label: t.navEntregas, icon: Truck, panel: 'entregas' },
    { href: '/admin', label: t.navGestao, icon: BarChart3, panel: 'gestao' },
  ];

  // Filtrar apenas os painéis onde o colaborador tem acesso
  const links = allLinks.filter((item) => {
    const nivel = getNivelAcesso(item.panel);
    return nivel !== 'sem_acesso';
  });

  return (
    <header className="no-print sticky top-0 z-40 w-full border-b border-bakery-200 bg-white/95 backdrop-blur shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-6">
        {/* Identidade e Seletor de Loja */}
        <div className="flex items-center gap-3">
          <Link href={links[0]?.href || '/login'} className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-bakery-600 text-white shadow-sm text-base">
              🥖
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">
                {t.appTitle}
              </h1>
              <p className="text-[10px] sm:text-xs text-bakery-700 font-medium">
                {t.appSubtitle}
              </p>
            </div>
          </Link>

          {/* Seletor de Loja Ativa */}
          <div className="hidden lg:flex items-center gap-1.5 rounded-xl bg-bakery-50 border border-bakery-200 px-2.5 py-1">
            <Store className="h-3.5 w-3.5 text-bakery-600" />
            <span className="text-[11px] font-semibold text-gray-600">{t.activeStore}</span>
            <select
              value={selectedLojaId}
              onChange={(e) => onSelectLoja(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-900 focus:outline-hidden cursor-pointer"
            >
              <option value="todas">{t.allStores}</option>
              {LOJAS_MOCK.map((loja) => (
                <option key={loja.id} value={loja.id}>
                  {loja.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Links de Navegação Principal */}
        <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto">
          {links.map((item) => {
            const Icon = item.icon;
            const isExact = pathname === item.href;
            const isAlias = item.aliases && item.aliases.includes(pathname);
            const isActive = isExact || isAlias;
            const nivel = getNivelAcesso(item.panel);
            const isReadOnly = nivel === 'leitura';

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-bakery-600 text-white shadow-xs'
                    : 'text-gray-600 hover:bg-bakery-100 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden md:inline">{item.label}</span>
                {isReadOnly && (
                  <span
                    className={`inline-flex items-center gap-0.5 px-1 py-0.2 text-[9px] font-extrabold uppercase rounded ${
                      isActive ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'
                    }`}
                    title={t.readOnlyMode}
                  >
                    <Eye className="h-2.5 w-2.5" />
                    <span className="hidden xl:inline">Leitura</span>
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Área do Utilizador & Idioma */}
        <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-gray-200">
          {usuario ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:block text-right">
                <span className="text-xs font-bold text-gray-900 block leading-tight truncate max-w-[130px]">
                  {usuario.nome}
                </span>
                <span className="text-[10px] text-gray-500 font-semibold block capitalize leading-tight">
                  {usuario.role === 'admin' ? t.roleAdmin :
                   usuario.role === 'gerente_loja' ? t.roleStoreManager :
                   usuario.role === 'motorista' ? t.roleDriver :
                   usuario.role === 'operador_padaria' || usuario.role === 'operador_pastelaria' ? t.roleBaker : t.roleCounter}
                </span>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition"
                title={t.logout}
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t.logout}</span>
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-bakery-600 hover:bg-bakery-700 shadow-xs transition"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>{t.loginButton}</span>
            </Link>
          )}

          {/* Seletor de Idioma (PT / EN) */}
          <button
            type="button"
            onClick={() => setLanguage(language === 'pt' ? 'en' : 'pt')}
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition border border-gray-200"
            title={language === 'pt' ? 'Mudar para Inglês' : 'Switch to Portuguese'}
          >
            <Globe className="h-3.5 w-3.5 text-bakery-600" />
            <span className="text-[11px] font-bold">{language === 'pt' ? '🇵🇹 PT' : '🇬🇧 EN'}</span>
          </button>
        </div>
      </div>

      {/* Seletor de Loja para Mobile / Tablet */}
      <div className="lg:hidden border-t border-bakery-100 bg-bakery-50 px-4 py-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
          <Store className="h-3.5 w-3.5 text-bakery-600" /> {t.store}:
        </span>
        <select
          value={selectedLojaId}
          onChange={(e) => onSelectLoja(e.target.value)}
          className="bg-white border border-bakery-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-900"
        >
          <option value="todas">{t.allStores}</option>
          {LOJAS_MOCK.map((loja) => (
            <option key={loja.id} value={loja.id}>
              {loja.nome}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
};
