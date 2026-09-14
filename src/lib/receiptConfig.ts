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

export function getReceiptConfig(): ReceiptConfig {
  if (typeof window === 'undefined') return DEFAULT_RECEIPT_CONFIG;
  try {
    const saved = localStorage.getItem('app_receipt_config');
    if (saved) {
      return { ...DEFAULT_RECEIPT_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Erro ao carregar configuração do talão:', e);
  }
  return DEFAULT_RECEIPT_CONFIG;
}

export function saveReceiptConfig(config: ReceiptConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('app_receipt_config', JSON.stringify(config));
  } catch (e) {
    console.error('Erro ao guardar configuração do talão:', e);
  }
}
