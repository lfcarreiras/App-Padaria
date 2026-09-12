'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Store, ShoppingBag, ChefHat, Truck, BarChart3 } from 'lucide-react';
import { LOJAS_MOCK } from '../lib/mockData';

interface NavbarProps {
  selectedLojaId: string;
  onSelectLoja: (lojaId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ selectedLojaId, onSelectLoja }) => {
  const pathname = usePathname();

  const links = [
    { href: '/balcao', label: 'Balcão & Pedidos', icon: ShoppingBag },
    { href: '/producao', label: 'Cozinha (KDS)', icon: ChefHat },
    { href: '/entregas', label: 'Carrinhas & Rotas', icon: Truck },
    { href: '/admin', label: 'Gestão & Painel', icon: BarChart3 },
  ];

  return (
    <header className="no-print sticky top-0 z-40 w-full border-b border-bakery-200 bg-white/95 backdrop-blur shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Identidade e Seletor de Loja */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bakery-600 text-white shadow-sm">
              🥖
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 leading-tight">Padarias & Pastelarias</h1>
              <p className="text-xs text-bakery-700 font-medium">Gestão & Produção</p>
            </div>
          </Link>

          {/* Seletor de Loja Ativa */}
          <div className="hidden md:flex items-center gap-2 rounded-xl bg-bakery-50 border border-bakery-200 px-3 py-1.5">
            <Store className="h-4 w-4 text-bakery-600" />
            <span className="text-xs font-semibold text-gray-600">Loja Ativa:</span>
            <select
              value={selectedLojaId}
              onChange={(e) => onSelectLoja(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-900 focus:outline-hidden cursor-pointer"
            >
              <option value="todas">Todas as Lojas (Consolidado)</option>
              {LOJAS_MOCK.map((loja) => (
                <option key={loja.id} value={loja.id}>
                  {loja.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Links de Navegação Principal */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {links.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href === '/balcao' && pathname === '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition sm:text-sm ${
                  isActive
                    ? 'bg-bakery-600 text-white shadow-xs'
                    : 'text-gray-600 hover:bg-bakery-100 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Seletor de Loja para Mobile */}
      <div className="md:hidden border-t border-bakery-100 bg-bakery-50 px-4 py-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
          <Store className="h-3.5 w-3.5 text-bakery-600" /> Loja:
        </span>
        <select
          value={selectedLojaId}
          onChange={(e) => onSelectLoja(e.target.value)}
          className="bg-white border border-bakery-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-900"
        >
          <option value="todas">Todas as Lojas</option>
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
