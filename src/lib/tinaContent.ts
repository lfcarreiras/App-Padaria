// Módulo de Carregamento e Fallback para Conteúdos TinaCMS (Git-Backed)
import configGeralRaw from '../../content/config/geral.json';
import loja1Raw from '../../content/lojas/loja-1.json';
import loja2Raw from '../../content/lojas/loja-2.json';
import loja3Raw from '../../content/lojas/loja-3.json';
import boloAniversarioRaw from '../../content/produtos/bolo-aniversario.json';
import paoAlentejanoRaw from '../../content/produtos/pao-alentejano.json';

export interface TinaConfiguracaoGeral {
  nomeEmpresa: string;
  slogan: string;
  telefoneGeral: string;
  nif: string;
  email: string;
  rodapeTalao: string;
  modeloWhatsApp: string;
}

export interface TinaLojaItem {
  id: string;
  codigo: string;
  nome: string;
  morada: string;
  telefone: string;
  horario: string;
  nif: string;
  foto?: string;
  ativo: boolean;
}

export interface TinaProdutoItem {
  nome: string;
  categoria: 'padaria' | 'pastelaria';
  unidade: 'unidade' | 'kg' | 'cento';
  descricao: string;
  alergenios: string;
  foto?: string;
  destaqueMontra: boolean;
}

// Configuração Geral Padrão
const CONFIG_GERAL_DEFAULT: TinaConfiguracaoGeral = {
  nomeEmpresa: "Padaria da Vila",
  slogan: "Pão quente e pastelaria tradicional a toda a hora",
  telefoneGeral: "210 000 001",
  nif: "500100201",
  email: "encomendas@padariadavila.pt",
  rodapeTalao: "Pão é saúde! Obrigado pela sua preferência.",
  modeloWhatsApp: "Olá! Gostaria de encomendar na Padaria da Vila...",
};

/**
 * Obtém a configuração geral da marca gerida pelo TinaCMS
 */
export function obterConfiguracaoMarca(): TinaConfiguracaoGeral {
  try {
    return {
      ...CONFIG_GERAL_DEFAULT,
      ...configGeralRaw,
    };
  } catch {
    return CONFIG_GERAL_DEFAULT;
  }
}

/**
 * Obtém a lista de lojas físicas geridas pelo TinaCMS
 */
export function obterLojasTina(): TinaLojaItem[] {
  try {
    return [loja1Raw, loja2Raw, loja3Raw] as TinaLojaItem[];
  } catch {
    return [];
  }
}

/**
 * Obtém o catálogo de produtos/montra gerido pelo TinaCMS
 */
export function obterProdutosMontra(): TinaProdutoItem[] {
  try {
    return [boloAniversarioRaw, paoAlentejanoRaw] as TinaProdutoItem[];
  } catch {
    return [];
  }
}
