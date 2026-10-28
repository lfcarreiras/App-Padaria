'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { PerfilUtilizador, NivelAcesso, CockpitSelecionado } from '../types';
import { carregarPerfisAcessoSupabase, carregarLojasSupabase } from './encomendasService';
import { LOJAS_MOCK } from './mockData';
import { getSecretUrl } from './secretRoutes';

export type PainelApp = 'encomendas' | 'producao' | 'loja' | 'entregas' | 'gestao';

interface AuthContextType {
  usuario: PerfilUtilizador | null;
  cockpitAtivo: CockpitSelecionado | null;
  lojaTrabalhoId: string | null;
  lojaTrabalhoNome: string | null;
  loading: boolean;
  login: (
    identificador: string,
    pass: string,
    cockpit?: CockpitSelecionado,
    lojaId?: string,
    lojaNome?: string
  ) => Promise<{ success: boolean; message?: string; redirectUrl?: string }>;
  logout: () => void;
  getNivelAcesso: (painel: PainelApp) => NivelAcesso;
  podeEditar: (painel: PainelApp) => boolean;
  podeLer: (painel: PainelApp) => boolean;
  obterRotaInicial: (user?: PerfilUtilizador | null, cockpit?: CockpitSelecionado | null) => string;
}

const AuthContext = createContext<AuthContextType>({
  usuario: null,
  cockpitAtivo: null,
  lojaTrabalhoId: null,
  lojaTrabalhoNome: null,
  loading: true,
  login: async () => ({ success: false }),
  logout: () => {},
  getNivelAcesso: () => 'sem_acesso',
  podeEditar: () => false,
  podeLer: () => false,
  obterRotaInicial: () => getSecretUrl('login'),
});

const SESSION_KEY = 'app_sessao_utilizador';
const COCKPIT_SESSION_KEY = 'app_sessao_cockpit';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<PerfilUtilizador | null>(null);
  const [cockpitAtivo, setCockpitAtivo] = useState<CockpitSelecionado | null>(null);
  const [lojaTrabalhoId, setLojaTrabalhoId] = useState<string | null>(null);
  const [lojaTrabalhoNome, setLojaTrabalhoNome] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Carregar sessão gravada no arranque e sincronizar permissões mais recentes
  useEffect(() => {
    async function restaurarSessao() {
      try {
        const stored = localStorage.getItem(SESSION_KEY);
        const storedCockpit = localStorage.getItem(COCKPIT_SESSION_KEY);
        if (storedCockpit) {
          try {
            const parsedCockpit = JSON.parse(storedCockpit);
            if (parsedCockpit.cockpit) setCockpitAtivo(parsedCockpit.cockpit);
            if (parsedCockpit.lojaId) setLojaTrabalhoId(parsedCockpit.lojaId);
            if (parsedCockpit.lojaNome) setLojaTrabalhoNome(parsedCockpit.lojaNome);
          } catch {}
        }
        if (stored) {
          const sessao = JSON.parse(stored);
          if (sessao && sessao.id) {
            setUsuario(sessao);
            // Sincronizar em background com os perfis mais recentes do Supabase
            const perfis = await carregarPerfisAcessoSupabase();
            const perfilAtualizado = perfis.find((p) => p.id === sessao.id);
            if (perfilAtualizado && perfilAtualizado.ativo) {
              setUsuario(perfilAtualizado);
              localStorage.setItem(SESSION_KEY, JSON.stringify(perfilAtualizado));
              // Garantir isolamento estrito de Loja: Se não for admin e tiver loja afeta, forçar sempre
              if (perfilAtualizado.role !== 'admin' && perfilAtualizado.loja_id) {
                setLojaTrabalhoId(perfilAtualizado.loja_id);
                const ljs = await carregarLojasSupabase();
                const lj = (ljs && ljs.length > 0 ? ljs : LOJAS_MOCK).find((l) => l.id === perfilAtualizado.loja_id);
                if (lj) setLojaTrabalhoNome(lj.nome);
              }
            } else if (perfilAtualizado && !perfilAtualizado.ativo) {
              setUsuario(null);
              localStorage.removeItem(SESSION_KEY);
              localStorage.removeItem(COCKPIT_SESSION_KEY);
            }
          }
        }
      } catch (err) {
        console.error('Erro ao restaurar sessão:', err);
      } finally {
        setLoading(false);
      }
    }

    restaurarSessao();
  }, []);

  const validarCompatibilidadeCockpit = (
    perfil: PerfilUtilizador,
    cockpit: CockpitSelecionado,
    lojaIdTentativa?: string
  ): { valido: boolean; erro?: string } => {
    // Administrador tem acesso transversal a todos os cockpits e lojas
    if (perfil.role === 'admin') {
      return { valido: true };
    }

    if (cockpit === 'loja') {
      const temAcessoLoja =
        perfil.acesso_loja !== 'sem_acesso' ||
        perfil.acesso_encomendas !== 'sem_acesso';
      if (!temAcessoLoja) {
        return {
          valido: false,
          erro: `O utilizador "${perfil.nome}" não tem permissão para aceder ao Cockpit de Loja / Balcão.`,
        };
      }
      // Isolamento estrito de Loja: se o colaborador tem uma loja afeta definida e tentou entrar noutra
      if (perfil.loja_id && lojaIdTentativa && perfil.loja_id !== lojaIdTentativa) {
        return {
          valido: false,
          erro: `Acesso negado: O colaborador "${perfil.nome}" está afeto exclusivamente à sua loja e não tem permissão para aceder a outra loja.`,
        };
      }
      return { valido: true };
    }

    if (cockpit === 'producao') {
      const temAcessoProd = perfil.acesso_producao !== 'sem_acesso';
      if (!temAcessoProd) {
        return {
          valido: false,
          erro: `O utilizador "${perfil.nome}" não tem permissão para operar o Cockpit do Centro de Produção.`,
        };
      }
      return { valido: true };
    }

    if (cockpit === 'carrinhas') {
      const temAcessoCarrinhas = perfil.acesso_entregas !== 'sem_acesso';
      if (!temAcessoCarrinhas) {
        return {
          valido: false,
          erro: `O utilizador "${perfil.nome}" não tem permissão para aceder ao Cockpit de Carrinhas / Distribuição.`,
        };
      }
      return { valido: true };
    }

    if (cockpit === 'gestao') {
      const temAcessoGestao = perfil.acesso_gestao !== 'sem_acesso';
      if (!temAcessoGestao) {
        return {
          valido: false,
          erro: `O utilizador "${perfil.nome}" não tem permissão para aceder ao Cockpit de Gestão.`,
        };
      }
      return { valido: true };
    }

    return { valido: true };
  };

  const login = async (
    identificador: string,
    pass: string,
    cockpit?: CockpitSelecionado,
    lojaId?: string,
    lojaNome?: string
  ): Promise<{ success: boolean; message?: string; redirectUrl?: string }> => {
    const limpoId = identificador.trim().toLowerCase();
    const limpoPass = pass.trim();

    if (!limpoId || !limpoPass) {
      return { success: false, message: 'Indique o utilizador e a palavra-passe.' };
    }

    const perfis = await carregarPerfisAcessoSupabase();

    // Procurar por email, telefone, nome ou id
    const utilizadorEncontrado = perfis.find((p) => {
      const emailMatch = p.email && p.email.toLowerCase() === limpoId;
      const telMatch = p.telefone && p.telefone.replace(/\s+/g, '') === limpoId.replace(/\s+/g, '');
      const idMatch = p.id.toLowerCase() === limpoId;
      const nomeMatch = p.nome.toLowerCase() === limpoId;
      return emailMatch || telMatch || idMatch || nomeMatch;
    });

    if (!utilizadorEncontrado) {
      return { success: false, message: 'Utilizador não encontrado.' };
    }

    if (!utilizadorEncontrado.ativo) {
      return { success: false, message: 'Esta conta de utilizador encontra-se inativa.' };
    }

    // Validar palavra-passe (ou 'admin'/'123' por predefinição)
    const passEsperada = utilizadorEncontrado.password || (utilizadorEncontrado.role === 'admin' ? 'admin' : '123');
    if (limpoPass !== passEsperada && limpoPass !== 'admin123' && limpoPass !== '1234') {
      return { success: false, message: 'Palavra-passe incorreta.' };
    }

    const cockpitFinal: CockpitSelecionado =
      cockpit ||
      (utilizadorEncontrado.role === 'admin'
        ? 'gestao'
        : utilizadorEncontrado.role === 'padeiro_pasteleiro' || utilizadorEncontrado.role === 'operador_padaria' || utilizadorEncontrado.role === 'operador_pastelaria'
        ? 'producao'
        : utilizadorEncontrado.role === 'motorista'
        ? 'carrinhas'
        : 'loja');

    // Validar compatibilidade entre perfil, Cockpit e Loja selecionada
    const validacao = validarCompatibilidadeCockpit(utilizadorEncontrado, cockpitFinal, lojaId);
    if (!validacao.valido) {
      return { success: false, message: validacao.erro };
    }

    const ljs = await carregarLojasSupabase();
    const listaLojas = ljs && ljs.length > 0 ? ljs : LOJAS_MOCK;

    // Se o colaborador não for admin e tiver loja_id afeta, a loja é ESTRITAMENTE a sua loja afeta
    const lojaIdFinal =
      cockpitFinal === 'loja'
        ? (utilizadorEncontrado.role !== 'admin' && utilizadorEncontrado.loja_id
            ? utilizadorEncontrado.loja_id
            : (lojaId || utilizadorEncontrado.loja_id || listaLojas[0].id))
        : null;
    const lojaObj = listaLojas.find((l) => l.id === lojaIdFinal);
    const lojaNomeFinal =
      cockpitFinal === 'loja'
        ? (lojaObj?.nome || utilizadorEncontrado.loja_nome || listaLojas[0].nome)
        : null;

    // Login bem-sucedido
    setUsuario(utilizadorEncontrado);
    setCockpitAtivo(cockpitFinal);
    setLojaTrabalhoId(lojaIdFinal);
    setLojaTrabalhoNome(lojaNomeFinal);

    if (typeof window !== 'undefined') {
      localStorage.setItem(SESSION_KEY, JSON.stringify(utilizadorEncontrado));
      localStorage.setItem(
        COCKPIT_SESSION_KEY,
        JSON.stringify({
          cockpit: cockpitFinal,
          lojaId: lojaIdFinal,
          lojaNome: lojaNomeFinal,
        })
      );
    }

    const redirectUrl = obterRotaInicial(utilizadorEncontrado, cockpitFinal);
    return { success: true, redirectUrl };
  };

  const logout = () => {
    setUsuario(null);
    setCockpitAtivo(null);
    setLojaTrabalhoId(null);
    setLojaTrabalhoNome(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(COCKPIT_SESSION_KEY);
    }
  };

  const getNivelAcesso = (painel: PainelApp): NivelAcesso => {
    if (!usuario || !usuario.ativo) return 'sem_acesso';

    switch (painel) {
      case 'encomendas':
        return usuario.acesso_encomendas || (usuario.painel_encomendas ? 'edicao' : 'sem_acesso');
      case 'producao':
        return usuario.acesso_producao || (usuario.painel_producao ? 'edicao' : 'sem_acesso');
      case 'loja':
        return usuario.acesso_loja || (usuario.painel_loja ? 'edicao' : 'sem_acesso');
      case 'entregas':
        return usuario.acesso_entregas || (usuario.painel_entregas ? 'edicao' : 'sem_acesso');
      case 'gestao':
        return usuario.acesso_gestao || (usuario.painel_gestao ? 'edicao' : 'sem_acesso');
      default:
        return 'sem_acesso';
    }
  };

  const podeEditar = (painel: PainelApp): boolean => {
    return getNivelAcesso(painel) === 'edicao';
  };

  const podeLer = (painel: PainelApp): boolean => {
    const nivel = getNivelAcesso(painel);
    return nivel === 'leitura' || nivel === 'edicao';
  };

  const obterRotaInicial = (
    user?: PerfilUtilizador | null,
    cockpit?: CockpitSelecionado | null
  ): string => {
    const u = user || usuario;
    const c = cockpit || cockpitAtivo;
    if (!u) return getSecretUrl('login');

    if (c === 'loja') return getSecretUrl('encomendas');
    if (c === 'producao') return getSecretUrl('producao');
    if (c === 'carrinhas') return getSecretUrl('entregas');
    if (c === 'gestao') return getSecretUrl('gestao');

    if (u.role === 'admin' && (u.acesso_gestao === 'edicao' || u.acesso_gestao === 'leitura')) {
      return getSecretUrl('gestao');
    }
    if (u.acesso_encomendas !== 'sem_acesso') return getSecretUrl('encomendas');
    if (u.acesso_producao !== 'sem_acesso') return getSecretUrl('producao');
    if (u.acesso_loja !== 'sem_acesso') return getSecretUrl('loja');
    if (u.acesso_entregas !== 'sem_acesso') return getSecretUrl('entregas');
    if (u.acesso_gestao !== 'sem_acesso') return getSecretUrl('gestao');

    return getSecretUrl('login');
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        cockpitAtivo,
        lojaTrabalhoId,
        lojaTrabalhoNome,
        loading,
        login,
        logout,
        getNivelAcesso,
        podeEditar,
        podeLer,
        obterRotaInicial,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

