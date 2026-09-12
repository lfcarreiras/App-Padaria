'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Store, ShoppingBag, ChefHat, Truck, BarChart3, Globe } from 'lucide-react';
import { LOJAS_MOCK } from '../lib/mockData';
import { useTranslation } from '../lib/i18n';

interface NavbarProps {
  selectedLojaId: string;
  onSelectLoja: (lojaId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ selectedLojaId, onSelectLoja }) => {
  const pathname = usePathname();
  const { language, setLanguage, t } = useTranslation();

  const links = [
    { href: '/encomendas', label: t.navEncomendas, icon: ShoppingBag, aliases: ['/balcao', '/'] },
    { href: '/producao', label: t.navProducao, icon: ChefHat },
    { href: '/loja', label: t.navLoja, icon: Store },
    { href: '/entregas', label: t.navEntregas, icon: Truck },
    { href: '/admin', label: t.navGestao, icon: BarChart3 },
  ];

  return (
    <header className="no-print sticky top-0 z-40 w-full border-b border-bakery-200 bg-white/95 backdrop-blur shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-6">
        {/* Identidade e Seletor de Loja */}
        <div className="flex items-center gap-3">
          <Link href="/encomendas" className="flex items-center gap-2">
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
              </Link>
            );
          })}
        </nav>

        {/* Seletor de Idioma (PT / EN) */}
        <div className="flex items-center gap-1 pl-1 sm:pl-2 border-l border-gray-200">
          <button
            type="button"
            onClick={() => setLanguage(language === 'pt' ? 'en' : 'pt')}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition border border-gray-200"
            title={language === 'pt' ? 'Mudar para Inglês' : 'Switch to Portuguese'}
          >
            <Globe className="h-3.5 w-3.5 text-bakery-600" />
            <span>{language === 'pt' ? '🇵🇹 PT' : '🇬🇧 EN'}</span>
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
