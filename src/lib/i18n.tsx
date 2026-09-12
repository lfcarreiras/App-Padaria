'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'pt' | 'en';

export interface Translations {
  // Navegação
  appTitle: string;
  appSubtitle: string;
  activeStore: string;
  allStores: string;
  navEncomendas: string;
  navProducao: string;
  navLoja: string;
  navEntregas: string;
  navGestao: string;

  // Comum
  loading: string;
  save: string;
  cancel: string;
  edit: string;
  delete: string;
  search: string;
  filter: string;
  actions: string;
  total: string;
  status: string;
  date: string;
  time: string;
  client: string;
  phone: string;
  address: string;
  notes: string;
  store: string;
  van: string;
  print: string;
  success: string;
  error: string;

  // Estados
  statusPending: string;
  statusInProduction: string;
  statusReady: string;
  statusDelivered: string;
  statusCanceled: string;
  paid: string;
  toPay: string;

  // Tipos de Entrega
  pickupStore: string;
  deliveryHome: string;
  changeDeliveryMode: string;
  switchToDelivery: string;
  switchToPickup: string;

  // Módulo Encomendas
  newOrder: string;
  clientManagement: string;
  ordersHistory: string;
  addToCart: string;
  cartEmpty: string;
  itemsInCart: string;
  paymentMethod: string;
  cash: string;
  card: string;
  mbway: string;
  transfer: string;
  registerOrder: string;
  customNotes: string;
  newClient: string;
  editClient: string;
  deliveryAddress: string;
  accessNotes: string;

  // Módulo Produção
  productionTitle: string;
  bakeryTab: string;
  pastryTab: string;
  pendingPrep: string;
  inPrep: string;
  readyPrep: string;
  markReady: string;

  // Módulo Entrega em Loja
  storePickupTitle: string;
  storePickupDesc: string;
  pendingPickups: string;
  completedPickups: string;
  completePickup: string;
  reprintTicket: string;

  // Módulo Entregas ao Domicílio
  deliveriesTitle: string;
  deliveriesDesc: string;
  vanRoute: string;
  callClient: string;
  openGps: string;
  completeDelivery: string;
  changeAddress: string;

  // Módulo Gestão
  managementTitle: string;
  tabMetrics: string;
  tabStoresVans: string;
  tabDatabase: string;
  tabReceiptConfig: string;
  tabAccess: string;
  totalRevenue: string;
  avgTicket: string;
  totalOrders: string;
  deliveriesRatio: string;
  exportExcel: string;
  importExcel: string;
  bulkUploadDesc: string;
}

const translations: Record<Language, Translations> = {
  pt: {
    appTitle: 'Padarias & Pastelarias',
    appSubtitle: 'Gestão & Produção',
    activeStore: 'Loja Ativa:',
    allStores: 'Todas as Lojas (Consolidado)',
    navEncomendas: 'Encomendas',
    navProducao: 'Produção',
    navLoja: 'Entrega em Loja',
    navEntregas: 'Entregas ao Domicílio',
    navGestao: 'Gestão',

    loading: 'A carregar dados...',
    save: 'Guardar',
    cancel: 'Cancelar',
    edit: 'Editar',
    delete: 'Eliminar',
    search: 'Pesquisar...',
    filter: 'Filtrar',
    actions: 'Ações',
    total: 'Total',
    status: 'Estado',
    date: 'Data',
    time: 'Hora',
    client: 'Cliente',
    phone: 'Telefone',
    address: 'Morada',
    notes: 'Observações',
    store: 'Loja',
    van: 'Carrinha',
    print: 'Imprimir',
    success: 'Gravado com sucesso!',
    error: 'Ocorreu um erro.',

    statusPending: 'Pendente',
    statusInProduction: 'Em Produção',
    statusReady: 'Pronto',
    statusDelivered: 'Entregue / Concluído',
    statusCanceled: 'Cancelado',
    paid: 'Já Pago',
    toPay: 'A Cobrar no Ato',

    pickupStore: 'Levantamento em Loja',
    deliveryHome: 'Entrega ao Domicílio',
    changeDeliveryMode: 'Alterar Modo de Entrega',
    switchToDelivery: 'Mudar para Entrega ao Domicílio',
    switchToPickup: 'Mudar para Levantamento em Loja',

    newOrder: 'Novo Pedido',
    clientManagement: 'Gestão de Clientes',
    ordersHistory: 'Histórico de Encomendas',
    addToCart: 'Adicionar',
    cartEmpty: 'Nenhum artigo adicionado.',
    itemsInCart: 'Artigos no Pedido',
    paymentMethod: 'Método de Pagamento',
    cash: 'Dinheiro',
    card: 'Multibanco / Cartão',
    mbway: 'MBWay',
    transfer: 'Transferência Bancária',
    registerOrder: 'Registar Encomenda & Emitir Talão',
    customNotes: 'Notas / Personalização (ex: frase no bolo)',
    newClient: 'Novo Cliente',
    editClient: 'Editar Dados do Cliente',
    deliveryAddress: 'Morada de Entrega',
    accessNotes: 'Instruções de Acesso / Notas de Entrega',

    productionTitle: 'Ecrã de Produção (KDS)',
    bakeryTab: 'Padaria (Pão & Forno)',
    pastryTab: 'Pastelaria & Bolos',
    pendingPrep: 'Por Iniciar',
    inPrep: 'A Preparar',
    readyPrep: 'Pronto',
    markReady: 'Marcar Pronto',

    storePickupTitle: 'Balcão de Entrega em Loja',
    storePickupDesc: 'Gestão de encomendas para recolha presencial na loja.',
    pendingPickups: 'A Recolher',
    completedPickups: 'Já Levantados',
    completePickup: 'Concluir Levantamento',
    reprintTicket: 'Reimprimir Talão',

    deliveriesTitle: 'Painel da Carrinha de Entregas',
    deliveriesDesc: 'Rota de entregas ao domicílio com paragens ordenadas.',
    vanRoute: 'Rota da Carrinha',
    callClient: 'Ligar',
    openGps: 'GPS Maps',
    completeDelivery: 'Concluir Entrega',
    changeAddress: 'Alterar Morada',

    managementTitle: 'Painel Executivo de Gestão',
    tabMetrics: 'Métricas & Relatórios',
    tabStoresVans: 'Lojas & Carrinhas',
    tabDatabase: 'Bases de Dados & Excel',
    tabReceiptConfig: 'Configurar Talão',
    tabAccess: 'Acessos & Diagnóstico',
    totalRevenue: 'Faturação Total',
    avgTicket: 'Ticket Médio',
    totalOrders: 'Total de Encomendas',
    deliveriesRatio: 'Entregas vs Loja',
    exportExcel: 'Exportar para Excel / CSV',
    importExcel: 'Importação Massiva (Excel/CSV)',
    bulkUploadDesc: 'Carregue um ficheiro CSV/Excel para atualizar em lote clientes ou produtos no Supabase.',
  },
  en: {
    appTitle: 'Bakeries & Pastries',
    appSubtitle: 'Management & Production',
    activeStore: 'Active Store:',
    allStores: 'All Stores (Consolidated)',
    navEncomendas: 'Orders',
    navProducao: 'Production',
    navLoja: 'Store Pickup',
    navEntregas: 'Home Deliveries',
    navGestao: 'Management',

    loading: 'Loading data...',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    search: 'Search...',
    filter: 'Filter',
    actions: 'Actions',
    total: 'Total',
    status: 'Status',
    date: 'Date',
    time: 'Time',
    client: 'Customer',
    phone: 'Phone',
    address: 'Address',
    notes: 'Notes',
    store: 'Store',
    van: 'Van',
    print: 'Print',
    success: 'Saved successfully!',
    error: 'An error occurred.',

    statusPending: 'Pending',
    statusInProduction: 'In Production',
    statusReady: 'Ready',
    statusDelivered: 'Delivered / Completed',
    statusCanceled: 'Canceled',
    paid: 'Already Paid',
    toPay: 'To Collect on Delivery',

    pickupStore: 'Store Pickup',
    deliveryHome: 'Home Delivery',
    changeDeliveryMode: 'Change Delivery Mode',
    switchToDelivery: 'Switch to Home Delivery',
    switchToPickup: 'Switch to Store Pickup',

    newOrder: 'New Order',
    clientManagement: 'Customer Management',
    ordersHistory: 'Orders History',
    addToCart: 'Add',
    cartEmpty: 'No items added.',
    itemsInCart: 'Order Items',
    paymentMethod: 'Payment Method',
    cash: 'Cash',
    card: 'Card / POS',
    mbway: 'MBWay',
    transfer: 'Bank Transfer',
    registerOrder: 'Submit Order & Print Receipt',
    customNotes: 'Custom notes (e.g. text on cake)',
    newClient: 'New Customer',
    editClient: 'Edit Customer Data',
    deliveryAddress: 'Delivery Address',
    accessNotes: 'Delivery / Access Instructions',

    productionTitle: 'Production Display (KDS)',
    bakeryTab: 'Bakery (Breads & Oven)',
    pastryTab: 'Pastry & Cakes',
    pendingPrep: 'Pending',
    inPrep: 'Preparing',
    readyPrep: 'Ready',
    markReady: 'Mark Ready',

    storePickupTitle: 'Store Pickup Counter',
    storePickupDesc: 'Management of orders for customer pickup in-store.',
    pendingPickups: 'To Pick Up',
    completedPickups: 'Collected',
    completePickup: 'Complete Pickup',
    reprintTicket: 'Reprint Receipt',

    deliveriesTitle: 'Delivery Van Dashboard',
    deliveriesDesc: 'Home delivery route with scheduled stops.',
    vanRoute: 'Van Route',
    callClient: 'Call',
    openGps: 'GPS Maps',
    completeDelivery: 'Complete Delivery',
    changeAddress: 'Change Address',

    managementTitle: 'Executive Management Dashboard',
    tabMetrics: 'Metrics & Reports',
    tabStoresVans: 'Stores & Vans',
    tabDatabase: 'Databases & Excel',
    tabReceiptConfig: 'Receipt Settings',
    tabAccess: 'Access & Diagnostics',
    totalRevenue: 'Total Revenue',
    avgTicket: 'Average Ticket',
    totalOrders: 'Total Orders',
    deliveriesRatio: 'Deliveries vs Pickup',
    exportExcel: 'Export to Excel / CSV',
    importExcel: 'Bulk Import (Excel/CSV)',
    bulkUploadDesc: 'Upload a CSV/Excel file to update customers or products in bulk in Supabase.',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'pt',
  setLanguage: () => {},
  t: translations.pt,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('pt');

  useEffect(() => {
    const saved = localStorage.getItem('app_language') as Language;
    if (saved && (saved === 'pt' || saved === 'en')) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t: translations[language],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => useContext(LanguageContext);
