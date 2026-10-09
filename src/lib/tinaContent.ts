// Módulo de Carregamento e Fallback para Conteúdos TinaCMS (Git-Backed)
import configGeralRaw from '../../content/config/geral.json';
import loja1Raw from '../../content/lojas/loja-1.json';
import loja2Raw from '../../content/lojas/loja-2.json';
import loja3Raw from '../../content/lojas/loja-3.json';
import catalogoRaw from '../../content/produtos/catalogo.json';
import layoutRaw from '../../content/blocos/layout.json';

export interface TinaConfiguracaoGeral {
  nomeEmpresa: string;
  slogan: string;
  telefoneGeral: string;
  nif: string;
  email: string;
  rodapeTalao: string;
  modeloWhatsApp: string;
  // Campos Frontoffice
  tituloBalcao?: string;
  subtituloBalcao?: string;
  bannerAvisoAtivo?: boolean;
  bannerAvisoTexto?: string;
  tituloWhatsApp?: string;
  subtituloWhatsApp?: string;
  btnCopiarModelo?: string;
  btnImportarWhatsApp?: string;
  rotuloLevantamento?: string;
  rotuloEntrega?: string;
  btnRegistarEncomenda?: string;
  // Painel Produção
  tituloProducao?: string;
  subtituloProducao?: string;
  avisoProducao?: string;
  // Painel Balcão / Loja
  tituloLojaBalcao?: string;
  subtituloLojaBalcao?: string;
  instrucoesBalcao?: string;
  // Painel Entregas
  tituloEntregas?: string;
  subtituloEntregas?: string;
  avisoEntregas?: string;
  // Painel Gestão
  tituloGestao?: string;
  subtituloGestao?: string;
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
  id: string;
  nome: string;
  categoria: 'padaria' | 'pastelaria';
  preco?: number;
  unidade?: string;
  tempo_preparo_minutos?: number;
  emoji?: string;
  descricao?: string;
  alergenios?: string;
  foto?: string;
  ativo?: boolean;
}

export interface TinaBlocoLayout {
  id: string;
  tipo: 'banner_aviso' | 'hero_marca' | 'montra_destaques' | 'rede_lojas' | 'info_encomendas' | 'bloco_livre';
  titulo: string;
  ativo: boolean;
  dados?: Record<string, any>;
}

// Configuração Geral Padrão
const CONFIG_GERAL_DEFAULT: TinaConfiguracaoGeral = {
  nomeEmpresa: "Padaria da Vila",
  slogan: "Pão quente e pastelaria tradicional a toda a hora",
  telefoneGeral: "210 000 001",
  nif: "500100201",
  email: "encomendas@padariadavila.pt",
  rodapeTalao: "Pão é saúde! Obrigado pela sua preferência.",
  modeloWhatsApp: "*PEDIDO - PADARIA DA VILA*\nNome: [O seu nome]\nTelefone: [O seu contacto]\nArtigos:\n- [Artigos]",
  tituloBalcao: "Balcão de Encomendas",
  subtituloBalcao: "Registo rápido, gestão de contactos de clientes e histórico de pedidos.",
  bannerAvisoAtivo: true,
  bannerAvisoTexto: "🥖 Fornadas quentes a sair às 07:00, 11:30 e 17:00 em todas as nossas lojas!",
  tituloWhatsApp: "Integração WhatsApp",
  subtituloWhatsApp: "Importar mensagens estruturadas de clientes",
  btnCopiarModelo: "Copiar Modelo",
  btnImportarWhatsApp: "Importar Pedido",
  rotuloLevantamento: "Levantamento em Loja",
  rotuloEntrega: "Entrega ao Domicílio",
  btnRegistarEncomenda: "Registar Encomenda & Imprimir Talão",
  tituloProducao: "Painel de Produção",
  subtituloProducao: "Fila de fabrico com visualização Kanban e hierárquica por tipo e loja",
  avisoProducao: "Forno a lenha aquecido para fornadas contínuas de padaria tradicional.",
  tituloLojaBalcao: "Balcão de Levantamentos",
  subtituloLojaBalcao: "Organização hierárquica de levantamento em loja por loja e hora de agendamento",
  instrucoesBalcao: "Confirmar identificação do cliente e conferir artigos embalados antes da entrega.",
  tituloEntregas: "Gestão de Entregas & Rotas",
  subtituloEntregas: "Gestão e atribuição de rotas de distribuição porta a porta",
  avisoEntregas: "Carga na Unidade Central de Fabrico & Sede",
  tituloGestao: "Painel de Gestão & Indicadores",
  subtituloGestao: "Métricas operacionais, análise de vendas e auditoria de sistema",
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
    if (Array.isArray(catalogoRaw) && catalogoRaw.length > 0) {
      return catalogoRaw as TinaProdutoItem[];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Obtém os blocos de layout e ordem de secções da app
 */
export function obterLayoutBlocos(): TinaBlocoLayout[] {
  try {
    return (layoutRaw as unknown as TinaBlocoLayout[]) || [];
  } catch {
    return [];
  }
}
