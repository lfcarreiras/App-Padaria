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
    console.warn('Erro ao carregar configuração do talão:', e);
  }
  return DEFAULT_RECEIPT_CONFIG;
}

export function saveReceiptConfig(config: ReceiptConfig, lojaId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (lojaId && lojaId !== 'todas') {
      localStorage.setItem(`app_receipt_config_${lojaId}`, JSON.stringify(config));
    } else {
      localStorage.setItem('app_receipt_config', JSON.stringify(config));
    }
  } catch (e) {
    console.error('Erro ao guardar configuração do talão:', e);
  }
}
