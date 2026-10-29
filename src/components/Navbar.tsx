'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Store, ShoppingBag, ChefHat, Truck, BarChart3, Globe, LogOut, UserCheck, Eye, Settings } from 'lucide-react';
import { LOJAS_MOCK } from '../lib/mockData';
import { useTranslation } from '../lib/i18n';
import { useAuth, PainelApp } from '../lib/authContext';
import { obterConfiguracaoMarca } from '../lib/tinaContent';
import { getSecretUrl } from '../lib/secretRoutes';

interface NavbarProps {
  selectedLojaId?: string;
  onSelectLoja?: (lojaId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ selectedLojaId = 'todas', onSelectLoja = () => {} }) => {
  const configMarca = obterConfiguracaoMarca();
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage, t } = useTranslation();
  const { usuario, cockpitAtivo, lojaTrabalhoNome, loading, logout, getNivelAcesso, obterRotaInicial } = useAuth();
  const [isOnline, setIsOnline] = React.useState(true);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const handleLogout = () => {
    logout();
    router.push(getSecretUrl('login'));
  };

  const allLinks: { href: string; label: string; icon: any; panel: PainelApp; aliases?: string[] }[] = [
    { href: getSecretUrl('encomendas'), label: t.navEncomendas, icon: ShoppingBag, panel: 'encomendas', aliases: ['/encomendas', '/balcao', getSecretUrl('loja')] },
    { href: getSecretUrl('producao'), label: t.navProducao, icon: ChefHat, panel: 'producao', aliases: ['/producao'] },
    { href: getSecretUrl('loja'), label: language === 'pt' ? 'Balcão' : 'Counter', icon: Store, panel: 'loja', aliases: ['/loja'] },
    { href: getSecretUrl('entregas'), label: language === 'pt' ? 'Entregas' : 'Deliveries', icon: Truck, panel: 'entregas', aliases: ['/entregas'] },
    { href: getSecretUrl('gestao'), label: t.navGestao, icon: BarChart3, panel: 'gestao', aliases: ['/gestao'] },
  ];

  // Filtrar estritamente pelo perfil do utilizador (RBAC) e pelo Cockpit ativo
  const links = allLinks.filter((item) => {
    // 1. O utilizador tem de ter permissão no perfil (sem_acesso é estritamente ocultado)
    const nivel = getNivelAcesso(item.panel);
    if (nivel === 'sem_acesso') return false;

    // 2. Se entrou com cockpit específico, filtrar apenas os módulos desse cockpit
    if (cockpitAtivo === 'loja') {
      return item.panel === 'encomendas' || item.panel === 'loja';
    }
    if (cockpitAtivo === 'producao') {
      return item.panel === 'producao';
    }
    if (cockpitAtivo === 'carrinhas') {
      return item.panel === 'entregas';
    }
    if (cockpitAtivo === 'gestao') {
      return item.panel === 'gestao';
    }
    return true;
  });

  // Route Guard estrito por Perfil e Cockpit Ativo (RBAC Enforcement)
  React.useEffect(() => {
    if (loading || !usuario) return;
    const rotasPermitidas = links.flatMap((l) => [l.href, ...(l.aliases || [])]);
    if (rotasPermitidas.length > 0 && !rotasPermitidas.includes(pathname)) {
      router.replace(obterRotaInicial(usuario, cockpitAtivo));
    }
  }, [loading, usuario, cockpitAtivo, pathname, links]);

  return (
    <header className="no-print sticky top-0 z-40 w-full border-b border-bakery-200 bg-white/95 backdrop-blur shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-6">
        {/* Identidade e Cockpit Ativo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Link href={links[0]?.href || getSecretUrl('login')} className="flex items-center gap-2">
            <img
              src="/logo-padaria.jpg"
              alt={configMarca.nomeEmpresa || 'Padaria da Vila'}
              className="h-11 w-11 sm:h-13 sm:w-13 rounded-full object-cover shrink-0"
            />
            <div>
              <span className="text-xs sm:text-sm font-black text-gray-900 tracking-tight whitespace-nowrap block leading-tight">
                {configMarca.nomeEmpresa || 'Padaria da Vila'}
              </span>
              {cockpitAtivo && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full mt-0.5">
                  {cockpitAtivo === 'loja' ? (
                    <>
                      <Store className="h-3 w-3 text-slate-500 shrink-0" />
                      <span>{lojaTrabalhoNome || 'Loja Física'}</span>
                    </>
                  ) : cockpitAtivo === 'producao' ? (
                    <>
                      <ChefHat className="h-3 w-3 text-slate-500 shrink-0" />
                      <span>Centro de Fabrico</span>
                    </>
                  ) : cockpitAtivo === 'carrinhas' ? (
                    <>
                      <Truck className="h-3 w-3 text-slate-500 shrink-0" />
                      <span>Carrinhas & Distribuição</span>
                    </>
                  ) : (
                    <>
                      <Settings className="h-3 w-3 text-slate-500 shrink-0" />
                      <span>Cockpit de Gestão</span>
                    </>
                  )}
                </span>
              )}
            </div>
          </Link>
        </div>

        {/* Links de Navegação Principal - Sem barras de navegação horizontal */}
        <nav className="flex items-center gap-1 sm:gap-1.5 flex-nowrap">
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
                className={`flex items-center gap-1 sm:gap-1.5 rounded-xl px-2 sm:px-2.5 py-1.5 text-xs font-bold transition shrink-0 ${
                  isActive
                    ? 'bg-bakery-600 text-white shadow-xs'
                    : 'text-gray-600 hover:bg-bakery-100 hover:text-gray-900'
                }`}
                title={item.label}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">{item.label}</span>
                {isReadOnly && (
                  <span
                    className={`inline-flex items-center gap-0.5 px-1 py-0.2 text-[9px] font-extrabold uppercase rounded ${
                      isActive ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'
                    }`}
                    title={t.readOnlyMode}
                  >
                    <Eye className="h-2.5 w-2.5" />
                    <span className="hidden 2xl:inline">Leitura</span>
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Área do Utilizador & Idioma */}
        <div className="flex items-center gap-1.5 sm:gap-2 pl-1 sm:pl-2 border-l border-gray-200 shrink-0">
          {isOnline ? (
            <span
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0"
              title="Ligação em tempo real ativa"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Ligado</span>
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 shrink-0"
              title="Sem ligação à Internet — A operar em modo Cache Offline Resiliente"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span>Offline (Cache)</span>
            </span>
          )}
          {usuario ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="hidden lg:block text-right">
                <span className="text-xs font-bold text-gray-900 block leading-tight truncate max-w-[110px]">
                  {usuario.nome}
                </span>
                <span className="text-[10px] text-gray-500 font-semibold block capitalize leading-tight">
                  {usuario.role === 'admin' ? t.roleAdmin :
                   usuario.role === 'gerente_loja' ? t.roleStoreManager :
                   (usuario.role === 'motorista' || usuario.role === 'condutor') ? t.roleDriver :
                   usuario.role === 'padeiro_pasteleiro' || usuario.role === 'operador_padaria' || usuario.role === 'operador_pastelaria' ? t.roleBaker : t.roleCounter}
                </span>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition"
                title={t.logout}
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden xl:inline">{t.logout}</span>
              </button>
            </div>
          ) : (
            <Link
              href={getSecretUrl('login')}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-bakery-600 hover:bg-bakery-700 shadow-xs transition"
            >
              <UserCheck className="h-3.5 w-3.5 shrink-0" />
              <span>{t.loginButton}</span>
            </Link>
          )}

          {/* Seletor de Idioma (PT / EN) */}
          <button
            type="button"
            onClick={() => setLanguage(language === 'pt' ? 'en' : 'pt')}
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition border border-gray-200 shrink-0"
            title={language === 'pt' ? 'Mudar para Inglês' : 'Switch to Portuguese'}
          >
            <Globe className="h-3.5 w-3.5 text-bakery-600 shrink-0" />
            <span className="text-[11px] font-bold">{language === 'pt' ? 'PT' : 'EN'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
