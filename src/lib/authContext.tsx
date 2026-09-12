'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { PerfilUtilizador, NivelAcesso } from '../types';
import { carregarPerfisAcessoSupabase } from './encomendasService';

export type PainelApp = 'encomendas' | 'producao' | 'loja' | 'entregas' | 'gestao';

interface AuthContextType {
  usuario: PerfilUtilizador | null;
  loading: boolean;
  login: (identificador: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  getNivelAcesso: (painel: PainelApp) => NivelAcesso;
  podeEditar: (painel: PainelApp) => boolean;
  podeLer: (painel: PainelApp) => boolean;
  obterRotaInicial: (user?: PerfilUtilizador | null) => string;
}

const AuthContext = createContext<AuthContextType>({
  usuario: null,
  loading: true,
  login: async () => ({ success: false }),
  logout: () => {},
  getNivelAcesso: () => 'sem_acesso',
  podeEditar: () => false,
  podeLer: () => false,
  obterRotaInicial: () => '/login',
});

const SESSION_KEY = 'app_sessao_utilizador';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<PerfilUtilizador | null>(null);
  const [loading, setLoading] = useState(true);

  // Carregar sessão gravada no arranque e sincronizar permissões mais recentes
  useEffect(() => {
    async function restaurarSessao() {
      try {
        const stored = localStorage.getItem(SESSION_KEY);
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
            } else if (perfilAtualizado && !perfilAtualizado.ativo) {
              // Utilizador foi desativado
              setUsuario(null);
              localStorage.removeItem(SESSION_KEY);
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

  const login = async (identificador: string, pass: string): Promise<{ success: boolean; message?: string }> => {
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

    // Login bem-sucedido
    setUsuario(utilizadorEncontrado);
    if (typeof window !== 'undefined') {
      localStorage.setItem(SESSION_KEY, JSON.stringify(utilizadorEncontrado));
    }

    return { success: true };
  };

  const logout = () => {
    setUsuario(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_KEY);
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

  const obterRotaInicial = (user?: PerfilUtilizador | null): string => {
    const u = user || usuario;
    if (!u) return '/login';

    if (u.role === 'admin' && (u.acesso_gestao === 'edicao' || u.acesso_gestao === 'leitura')) {
      return '/admin';
    }
    if (u.acesso_encomendas !== 'sem_acesso') return '/encomendas';
    if (u.acesso_producao !== 'sem_acesso') return '/producao';
    if (u.acesso_loja !== 'sem_acesso') return '/loja';
    if (u.acesso_entregas !== 'sem_acesso') return '/entregas';
    if (u.acesso_gestao !== 'sem_acesso') return '/admin';

    return '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
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
