export const STORAGE_KEYS = {
  protocols: 'protocontrol_protocols',
  clients: 'protocontrol_clients',
  employees: 'protocontrol_employees',
  company: 'protocontrol_company',
  session: 'protocontrol_session',
  auditLogs: 'protocontrol_audit_logs',
  fees: 'protocontrol_fees',
  feeCategories: 'protocontrol_fee_categories',
};

export const ADMIN_USER = {
  id: 'admin',
  name: 'Administrador',
  username: 'admin',
  password: 'admin123',
  role: 'admin',
};

export const STATUS_OPTIONS = [
  'Pendente',
  'Em andamento',
  'Aguardando resposta',
  'Aguardando documentação',
  'Em análise',
  'Finalizado aguardando retirada',
  'Concluído',
  'Cancelado',
];

export const DEFAULT_PERMISSIONS = {
  canAccessProtocols: true,
  canAccessClients: true,
  canAccessFees: false,
  canAccessEmployees: false,
  canAccessSettings: false,
  canAccessHistory: false,
};

export const emptyFilters = {
  clientId: '',
  employeeId: '',
  status: '',
  startDate: '',
  endDate: '',
  due: '',
};

export const emptyCompany = {
  tradeName: '',
  legalName: '',
  cnpj: '',
  phone: '',
  address: '',
  logo: '',
};

export const MINAS_GERAIS_CITIES = [
  'Águas Formosas',
  'Belo Horizonte',
  'Betim',
  'Contagem',
  'Governador Valadares',
  'Ipatinga',
  'Juiz de Fora',
  'Montes Claros',
  'Nanuque',
  'Ouro Preto',
  'Patos de Minas',
  'Poços de Caldas',
  'Pouso Alegre',
  'Teófilo Otoni',
  'Uberaba',
  'Uberlândia',
];

export const emptyClient = {
  type: 'PF',
  name: '',
  tradeName: '',
  legalName: '',
  document: '',
  stateRegistration: '',
  municipalRegistration: '',
  phone: '',
  email: '',
  address: '',
  number: '',
  district: '',
  city: 'Águas Formosas',
  state: 'MG',
};

export const emptyPerson = {
  name: '',
  username: '',
  password: '',
  document: '',
  phone: '',
  address: '',
};
