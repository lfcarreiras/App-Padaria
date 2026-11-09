import { supabase } from './supabase';

export interface ReceiptConfig {
  storeNameOverride: string;
  slogan: string;
  showPhone: boolean;
  showAddress: boolean;
  showNif: boolean;
  paperWidth: '80mm' | '58mm';
  fontSize: 'compact' | 'normal' | 'large';
  showSectionSeparation: boolean;
  highlightCakeNotes: boolean;
  showQrCode: boolean;
  footerMessage: string;
}

export const DEFAULT_RECEIPT_CONFIG: ReceiptConfig = {
  storeNameOverride: 'Padaria da Vila',
  slogan: 'União Panificadora Central Arouquense • Desde 1965',
  showPhone: true,
  showAddress: true,
  showNif: true,
  paperWidth: '80mm',
  fontSize: 'normal',
  showSectionSeparation: true,
  highlightCakeNotes: true,
  showQrCode: true,
  footerMessage: 'Pão é saúde! Obrigado pela sua preferência.',
};

export function getReceiptConfig(lojaId?: string): ReceiptConfig {
  if (typeof window === 'undefined') return DEFAULT_RECEIPT_CONFIG;
  try {
    if (lojaId && lojaId !== 'todas') {
      const savedLoja = localStorage.getItem(`app_receipt_config_${lojaId}`);
      if (savedLoja) {
        return { ...DEFAULT_RECEIPT_CONFIG, ...JSON.parse(savedLoja) };
      }
    }
    const saved = localStorage.getItem('app_receipt_config');
    if (saved) {
      return { ...DEFAULT_RECEIPT_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Erro ao carregar configuração do talão local:', e);
  }
  return DEFAULT_RECEIPT_CONFIG;
}

export async function carregarConfiguracaoTalaoSupabase(lojaId?: string): Promise<ReceiptConfig> {
  const chaveConfig = lojaId && lojaId !== 'todas' ? `configuracao_talao_${lojaId}` : 'configuracao_talao';
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('configuracoes_sistema')
        .select('valor')
        .eq('chave', chaveConfig)
        .maybeSingle();

      if (!error && data && data.valor && typeof data.valor === 'object') {
        const configFinal = { ...DEFAULT_RECEIPT_CONFIG, ...data.valor };
        if (typeof window !== 'undefined') {
          const storageKey = lojaId && lojaId !== 'todas' ? `app_receipt_config_${lojaId}` : 'app_receipt_config';
          localStorage.setItem(storageKey, JSON.stringify(configFinal));
        }
        return configFinal;
      }
    } catch (e) {
      console.warn('Erro ao carregar configuração do talão do Supabase:', e);
    }
  }
  return getReceiptConfig(lojaId);
}

export function saveReceiptConfig(config: ReceiptConfig, lojaId?: string): void {
  if (typeof window !== 'undefined') {
    try {
      if (lojaId && lojaId !== 'todas') {
        localStorage.setItem(`app_receipt_config_${lojaId}`, JSON.stringify(config));
      } else {
        localStorage.setItem('app_receipt_config', JSON.stringify(config));
      }
    } catch (e) {
      console.error('Erro ao guardar configuração do talão local:', e);
    }
  }

  // Persistência Central no Supabase
  if (supabase) {
    const chaveConfig = lojaId && lojaId !== 'todas' ? `configuracao_talao_${lojaId}` : 'configuracao_talao';
    supabase
      .from('configuracoes_sistema')
      .upsert({
        chave: chaveConfig,
        valor: config,
        atualizado_em: new Date().toISOString()
      }, { onConflict: 'chave' })
      .then(
        () => {},
        (err: any) => {
          console.error('Erro ao persistir configuração do talão no Supabase:', err);
        }
      );
  }
}
