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
  confirm: string;
  all: string;

  // Filtros Temporais & Formato de Entrega
  timePeriod: string;
  periodToday: string;
  periodWeek: string;
  periodMonth: string;
  periodYear: string;
  periodAll: string;
  deliveryFormat: string;
  allFormats: string;

  // Categorias de Produtos
  allCategories: string;
  categoryBakery: string;
  categoryPastry: string;

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
  searchProductPlaceholder: string;
  searchClientPlaceholder: string;
  noClientsFound: string;
  noOrdersFound: string;

  // Módulo Produção
  productionTitle: string;
  productionSubtitle: string;
  allDepartments: string;
  bakeryTab: string;
  pastryTab: string;
  pendingPrep: string;
  inPrep: string;
  readyPrep: string;
  markReady: string;
  noProductionItems: string;
  customizationNotes: string;
  destination: string;
  destinationStore: string;
  destinationVan: string;

  // Módulo Entrega em Loja
  storePickupTitle: string;
  storePickupDesc: string;
  pendingPickups: string;
  completedPickups: string;
  completePickup: string;
  reprintTicket: string;
  noPickupsFound: string;
  pickupCollected: string;
  itemsToDeliver: string;
  searchPickupPlaceholder: string;

  // Módulo Entregas ao Domicílio
  deliveriesTitle: string;
  deliveriesDesc: string;
  allVans: string;
  vanRoute: string;
  callClient: string;
  openGps: string;
  completeDelivery: string;
  changeAddress: string;
  noDeliveriesFound: string;
  stopDeliveryCompleted: string;

  // Módulo Gestão
  managementTitle: string;
  managementSubtitle: string;
  tabMetrics: string;
  tabStoresVans: string;
  tabDatabase: string;
  tabReceiptConfig: string;
  tabAccess: string;
  totalRevenue: string;
  avgTicket: string;
  totalOrders: string;
  deliveriesRatio: string;
  storePerformance: string;
  consolidatedNeeds: string;
  exportExcel: string;
  importExcel: string;
  bulkUploadDesc: string;

  // Gestão de Lojas e Carrinhas
  storesSectionTitle: string;
  storesSectionDesc: string;
  vansSectionTitle: string;
  vansSectionDesc: string;
  addVan: string;
  storeCode: string;
  storeName: string;
  nif: string;
  licensePlate: string;
  vanName: string;
  assignedStore: string;

  // Gestão de Acessos & Utilizadores
  panelAccessManagement: string;
  panelAccessDesc: string;
  newUser: string;
  editUser: string;
  role: string;
  roleAdmin: string;
  roleStoreManager: string;
  roleCounter: string;
  roleBaker: string;
  roleDriver: string;
  allowedPanels: string;
  userActive: string;
  userInactive: string;
  saveUser: string;

  // Talão Térmico
  receiptTitle: string;
  receiptOrderNumber: string;
  receiptPickup: string;
  receiptHomeDelivery: string;
  receiptCustomer: string;
  receiptPhone: string;
  receiptDeliveryAddress: string;
  receiptRoute: string;
  receiptObs: string;
  receiptBakerySection: string;
  receiptPastrySection: string;
  receiptAllItemsSection: string;
  receiptTotalToPay: string;
  receiptPaymentStatus: string;
  receiptPaid: string;
  receiptToCollect: string;
  receiptGeneralNotes: string;
  receiptIssuedAt: string;
  receiptThankYou: string;
  receiptSystemNotice: string;

  // Autenticação e Níveis de Acesso
  loginTitle: string;
  loginSubtitle: string;
  loginIdentifierLabel: string;
  loginIdentifierPlaceholder: string;
  loginPasswordLabel: string;
  loginPasswordPlaceholder: string;
  loginButton: string;
  loginInvalidCredentials: string;
  loginDemoAccess: string;
  logout: string;
  activeUser: string;
  readOnlyMode: string;
  readOnlyNotice: string;
  noAccessNotice: string;
  accessLevel: string;
  levelNoAccess: string;
  levelReadOnly: string;
  levelFullEdit: string;
  password: string;
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
    confirm: 'Confirmar',
    all: 'Todos',

    timePeriod: 'Período de Análise',
    periodToday: 'Hoje (Dia)',
    periodWeek: 'Esta Semana',
    periodMonth: 'Este Mês',
    periodYear: 'Este Ano',
    periodAll: 'Consolidado (Histórico)',
    deliveryFormat: 'Formato de Entrega',
    allFormats: 'Todos os Formatos',

    allCategories: 'Todos os Artigos',
    categoryBakery: 'Padaria',
    categoryPastry: 'Pastelaria',

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
    cartEmpty: 'Nenhum artigo adicionado ao carrinho.',
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
    searchProductPlaceholder: 'Pesquisar pão, bolo, pastel...',
    searchClientPlaceholder: 'Pesquisar por nome, telefone ou morada...',
    noClientsFound: 'Nenhum cliente encontrado.',
    noOrdersFound: 'Nenhuma encomenda registada com estes filtros.',

    productionTitle: 'Ecrã de Produção (KDS)',
    productionSubtitle: 'Fila tátil de fabrico em tempo real para os padeiros e pasteleiros da loja.',
    allDepartments: 'Todos os Setores',
    bakeryTab: 'Padaria (Pão & Forno)',
    pastryTab: 'Pastelaria & Bolos',
    pendingPrep: 'Por Iniciar',
    inPrep: 'A Preparar',
    readyPrep: 'Pronto',
    markReady: 'Marcar Pronto',
    noProductionItems: 'Sem pedidos em fila de produção.',
    customizationNotes: 'Personalização / Mensagem:',
    destination: 'Destino',
    destinationStore: 'Balcão da Loja',
    destinationVan: 'Carrinha de Entrega',

    storePickupTitle: 'Balcão de Entrega em Loja',
    storePickupDesc: 'Gestão de encomendas para recolha presencial na loja.',
    pendingPickups: 'A Recolher',
    completedPickups: 'Já Levantados',
    completePickup: 'Concluir Levantamento',
    reprintTicket: 'Reimprimir Talão',
    noPickupsFound: 'Sem encomendas pendentes de recolha nesta loja.',
    pickupCollected: 'Já Levantado',
    itemsToDeliver: 'Artigos a Entregar:',
    searchPickupPlaceholder: 'Pesquisar por cliente, telefone ou código...',

    deliveriesTitle: 'Painel da Carrinha de Entregas',
    deliveriesDesc: 'Rota de entregas ao domicílio com paragens ordenadas.',
    allVans: 'Todas as Carrinhas',
    vanRoute: 'Rota da Carrinha',
    callClient: 'Ligar',
    openGps: 'GPS Maps',
    completeDelivery: 'Concluir Entrega',
    changeAddress: 'Alterar Morada',
    noDeliveriesFound: 'Sem entregas agendadas nesta rota.',
    stopDeliveryCompleted: 'Entregue',

    managementTitle: 'Painel Executivo de Gestão',
    managementSubtitle: 'Métricas, configuração de lojas e frota, permissões e personalização de talão.',
    tabMetrics: 'Métricas & Relatórios',
    tabStoresVans: 'Lojas & Carrinhas',
    tabDatabase: 'Bases de Dados & Excel',
    tabReceiptConfig: 'Configurar Talão',
    tabAccess: 'Gestão de Acessos',
    totalRevenue: 'Faturação Total',
    avgTicket: 'Ticket Médio',
    totalOrders: 'Total de Encomendas',
    deliveriesRatio: 'Entregas vs Loja',
    storePerformance: 'Desempenho por Loja',
    consolidatedNeeds: 'Necessidades Consolidadas de Fabrico',
    exportExcel: 'Exportar para Excel / CSV',
    importExcel: 'Importação Massiva (Excel/CSV)',
    bulkUploadDesc: 'Carregue um ficheiro CSV/Excel para atualizar em lote clientes ou produtos no Supabase.',

    storesSectionTitle: 'Lojas de Padaria & Pastelaria',
    storesSectionDesc: 'Configuração de moradas, telefones e NIFs de cada ponto de venda.',
    vansSectionTitle: 'Frota de Carrinhas de Entrega',
    vansSectionDesc: 'Gestão das viaturas afetas a cada loja e matrículas.',
    addVan: 'Adicionar Carrinha',
    storeCode: 'Código da Loja',
    storeName: 'Nome da Loja',
    nif: 'NIF',
    licensePlate: 'Matrícula',
    vanName: 'Identificador / Nome',
    assignedStore: 'Loja Afeta',

    panelAccessManagement: 'Gestão de Acessos & Utilizadores',
    panelAccessDesc: 'Defina os colaboradores e os painéis a que cada função tem permissão de aceder na aplicação.',
    newUser: 'Novo Colaborador',
    editUser: 'Editar Colaborador',
    role: 'Função / Cargo',
    roleAdmin: 'Administrador Geral',
    roleStoreManager: 'Gerente de Loja',
    roleCounter: 'Atendente de Balcão',
    roleBaker: 'Padeiro / Pasteleiro',
    roleDriver: 'Motorista / Distribuidor',
    allowedPanels: 'Painéis Autorizados',
    userActive: 'Ativo',
    userInactive: 'Inativo',
    saveUser: 'Guardar Utilizador',

    receiptTitle: 'Talão de Encomenda',
    receiptOrderNumber: 'Número de Encomenda',
    receiptPickup: 'LEVANTAMENTO EM LOJA',
    receiptHomeDelivery: '>> ENTREGA AO DOMICÍLIO <<',
    receiptCustomer: 'CLIENTE',
    receiptPhone: 'TEL',
    receiptDeliveryAddress: 'MORADA DE ENTREGA',
    receiptRoute: 'ROTA',
    receiptObs: 'Obs',
    receiptBakerySection: '[ SETOR PADARIA ]',
    receiptPastrySection: '[ SETOR PASTELARIA ]',
    receiptAllItemsSection: '[ ARTIGOS DO PEDIDO ]',
    receiptTotalToPay: 'TOTAL A PAGAR',
    receiptPaymentStatus: 'ESTADO',
    receiptPaid: 'PAGO',
    receiptToCollect: 'A COBRAR NO ATO',
    receiptGeneralNotes: 'NOTAS GERAIS',
    receiptIssuedAt: 'Emitido em',
    receiptThankYou: 'Obrigado pela sua preferência!',
    receiptSystemNotice: '*** SISTEMA DE ENCOMENDAS ***',

    // Autenticação e Níveis de Acesso
    loginTitle: 'Autenticação de Colaborador',
    loginSubtitle: 'Introduza as suas credenciais para aceder ao sistema de gestão e operação.',
    loginIdentifierLabel: 'Utilizador / Email / Telefone',
    loginIdentifierPlaceholder: 'ex: admin@padaria.pt ou 910000001',
    loginPasswordLabel: 'Palavra-passe',
    loginPasswordPlaceholder: '••••••••',
    loginButton: 'Entrar no Sistema',
    loginInvalidCredentials: 'Credenciais inválidas ou utilizador desativado. Verifique os dados.',
    loginDemoAccess: 'Acesso Rápido de Teste (1 Clique):',
    logout: 'Sair',
    activeUser: 'Colaborador Ativo',
    readOnlyMode: 'Modo de Leitura',
    readOnlyNotice: 'Perfil em modo de consulta. As ações de edição e gravação estão desativadas.',
    noAccessNotice: 'Não tem permissão para aceder a este painel.',
    accessLevel: 'Nível de Acesso',
    levelNoAccess: 'Sem Acesso',
    levelReadOnly: 'Apenas Leitura',
    levelFullEdit: 'Edição Completa',
    password: 'Palavra-passe',
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
    confirm: 'Confirm',
    all: 'All',

    timePeriod: 'Time Period',
    periodToday: 'Today (Daily)',
    periodWeek: 'This Week',
    periodMonth: 'This Month',
    periodYear: 'This Year',
    periodAll: 'All Time (Consolidated)',
    deliveryFormat: 'Delivery Format',
    allFormats: 'All Formats',

    allCategories: 'All Products',
    categoryBakery: 'Bakery',
    categoryPastry: 'Pastry',

    statusPending: 'Pending',
    statusInProduction: 'In Production',
    statusReady: 'Ready',
    statusDelivered: 'Delivered / Completed',
    statusCanceled: 'Canceled',
    paid: 'Paid',
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
    cartEmpty: 'No items in order cart.',
    itemsInCart: 'Order Items',
    paymentMethod: 'Payment Method',
    cash: 'Cash',
    card: 'Card / POS',
    mbway: 'MBWay',
    transfer: 'Bank Transfer',
    registerOrder: 'Submit Order & Print Receipt',
    customNotes: 'Notes / Customization (e.g. cake text)',
    newClient: 'New Customer',
    editClient: 'Edit Customer Details',
    deliveryAddress: 'Delivery Address',
    accessNotes: 'Delivery & Access Notes',
    searchProductPlaceholder: 'Search bread, cake, pastry...',
    searchClientPlaceholder: 'Search by name, phone or address...',
    noClientsFound: 'No customers found.',
    noOrdersFound: 'No orders recorded matching these filters.',

    productionTitle: 'Production Display (KDS)',
    productionSubtitle: 'Real-time touch queue for bakery and pastry shop floor staff.',
    allDepartments: 'All Departments',
    bakeryTab: 'Bakery (Breads & Oven)',
    pastryTab: 'Pastry & Cakes',
    pendingPrep: 'Pending',
    inPrep: 'Preparing',
    readyPrep: 'Ready',
    markReady: 'Mark Ready',
    noProductionItems: 'No items currently in the production queue.',
    customizationNotes: 'Customization / Message:',
    destination: 'Destination',
    destinationStore: 'Store Counter',
    destinationVan: 'Delivery Van',

    storePickupTitle: 'Store Pickup Counter',
    storePickupDesc: 'Management of customer in-store pickup orders.',
    pendingPickups: 'To Pick Up',
    completedPickups: 'Collected',
    completePickup: 'Complete Pickup',
    reprintTicket: 'Reprint Receipt',
    noPickupsFound: 'No orders pending pickup at this store.',
    pickupCollected: 'Collected',
    itemsToDeliver: 'Items to Deliver:',
    searchPickupPlaceholder: 'Search by customer, phone or code...',

    deliveriesTitle: 'Delivery Van Dashboard',
    deliveriesDesc: 'Home delivery route with scheduled stops.',
    allVans: 'All Vans',
    vanRoute: 'Van Route',
    callClient: 'Call',
    openGps: 'GPS Maps',
    completeDelivery: 'Complete Delivery',
    changeAddress: 'Change Address',
    noDeliveriesFound: 'No deliveries scheduled on this route.',
    stopDeliveryCompleted: 'Delivered',

    managementTitle: 'Executive Management Dashboard',
    managementSubtitle: 'Metrics, store and fleet config, permissions, and receipt settings.',
    tabMetrics: 'Metrics & Reports',
    tabStoresVans: 'Stores & Vans',
    tabDatabase: 'Databases & Excel',
    tabReceiptConfig: 'Receipt Settings',
    tabAccess: 'Access Management',
    totalRevenue: 'Total Revenue',
    avgTicket: 'Average Ticket',
    totalOrders: 'Total Orders',
    deliveriesRatio: 'Deliveries vs Pickup',
    storePerformance: 'Performance by Store',
    consolidatedNeeds: 'Consolidated Production Needs',
    exportExcel: 'Export to Excel / CSV',
    importExcel: 'Bulk Import (Excel/CSV)',
    bulkUploadDesc: 'Upload a CSV/Excel file to update customers or products in bulk in Supabase.',

    storesSectionTitle: 'Bakery & Pastry Stores',
    storesSectionDesc: 'Address, phone, and tax ID configuration for each retail branch.',
    vansSectionTitle: 'Delivery Van Fleet',
    vansSectionDesc: 'Manage delivery vehicles, branch allocations, and license plates.',
    addVan: 'Add Delivery Van',
    storeCode: 'Store Code',
    storeName: 'Store Name',
    nif: 'Tax ID / NIF',
    licensePlate: 'License Plate',
    vanName: 'Identifier / Name',
    assignedStore: 'Assigned Store',

    panelAccessManagement: 'User Access & Permissions',
    panelAccessDesc: 'Define team members and assign panel permissions according to company roles.',
    newUser: 'New Team Member',
    editUser: 'Edit Team Member',
    role: 'Role / Position',
    roleAdmin: 'General Administrator',
    roleStoreManager: 'Store Manager',
    roleCounter: 'Counter Staff',
    roleBaker: 'Baker / Pastry Chef',
    roleDriver: 'Delivery Driver',
    allowedPanels: 'Allowed Panels',
    userActive: 'Active',
    userInactive: 'Inactive',
    saveUser: 'Save User',

    receiptTitle: 'Order Receipt',
    receiptOrderNumber: 'Order Number',
    receiptPickup: 'STORE PICKUP',
    receiptHomeDelivery: '>> HOME DELIVERY <<',
    receiptCustomer: 'CUSTOMER',
    receiptPhone: 'TEL',
    receiptDeliveryAddress: 'DELIVERY ADDRESS',
    receiptRoute: 'ROUTE',
    receiptObs: 'Notes',
    receiptBakerySection: '[ BAKERY DEPARTMENT ]',
    receiptPastrySection: '[ PASTRY DEPARTMENT ]',
    receiptAllItemsSection: '[ ORDER ITEMS ]',
    receiptTotalToPay: 'TOTAL TO PAY',
    receiptPaymentStatus: 'STATUS',
    receiptPaid: 'PAID',
    receiptToCollect: 'TO COLLECT ON DELIVERY',
    receiptGeneralNotes: 'GENERAL NOTES',
    receiptIssuedAt: 'Issued at',
    receiptThankYou: 'Thank you for your business!',
    receiptSystemNotice: '*** ORDER MANAGEMENT SYSTEM ***',

    // Autenticação e Níveis de Acesso
    loginTitle: 'Staff Sign In',
    loginSubtitle: 'Enter your credentials to access the bakery management and operations system.',
    loginIdentifierLabel: 'Username / Email / Phone',
    loginIdentifierPlaceholder: 'e.g. admin@padaria.pt or 910000001',
    loginPasswordLabel: 'Password',
    loginPasswordPlaceholder: '••••••••',
    loginButton: 'Sign In',
    loginInvalidCredentials: 'Invalid credentials or inactive account. Please check your input.',
    loginDemoAccess: 'Quick Demo Access (1 Click):',
    logout: 'Sign Out',
    activeUser: 'Active Staff',
    readOnlyMode: 'Read-only Mode',
    readOnlyNotice: 'Read-only access. Editing and submission actions are restricted.',
    noAccessNotice: 'You do not have permission to access this panel.',
    accessLevel: 'Access Level',
    levelNoAccess: 'No Access',
    levelReadOnly: 'Read-only',
    levelFullEdit: 'Full Edit',
    password: 'Password',
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
