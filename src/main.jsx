import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Building2, CheckCircle2, Clock, Download, FileDown, FileText, History, Lock, LogOut, MessageCircle, Paperclip, Plus, Printer, Search, Settings, Upload, Users, UserRoundPlus } from 'lucide-react';
import { loadAllAppData, saveAppData } from './supabaseClient';
import './styles.css';

const STORAGE_KEYS = {
  protocols: 'protocontrol_protocols',
  clients: 'protocontrol_clients',
  employees: 'protocontrol_employees',
  company: 'protocontrol_company',
  session: 'protocontrol_session',
};

const ADMIN_USER = {
  id: 'admin',
  name: 'Administrador',
  username: 'admin',
  password: 'admin123',
  role: 'admin',
};

const STATUS_OPTIONS = [
  'Pendente',
  'Em andamento',
  'Aguardando resposta',
  'Aguardando documentação',
  'Em análise',
  'Finalizado aguardando retirada',
  'Concluído',
  'Cancelado',
];

const emptyFilters = {
  clientId: '',
  employeeId: '',
  status: '',
  startDate: '',
  endDate: '',
  due: '',
};

const emptyCompany = {
  tradeName: '',
  legalName: '',
  cnpj: '',
  phone: '',
  address: '',
  logo: '',
};

const MINAS_GERAIS_CITIES = [
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

const emptyClient = {
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

const emptyPerson = {
  name: '',
  username: '',
  password: '',
  document: '',
  phone: '',
  address: '',
};

function loadStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Erro ao salvar no localStorage:', error);
    if (error.name === 'QuotaExceededError') {
      alert('O armazenamento local está cheio. Remova anexos grandes ou exporte os dados.');
    }
    throw error;
  }
}

function saveData(key, value) {
  saveStorage(STORAGE_KEYS[key], value);
  saveAppData(key, value).catch((error) => console.error(`Erro ao salvar ${key} no Supabase:`, error));
}

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(date) {
  if (!date) return '';
  return new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR');
}

function formatDateTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('pt-BR');
}

function isOverdue(protocol) {
  return protocol.dueDate && !['Concluído', 'Cancelado'].includes(protocol.status) && protocol.dueDate < todayInput();
}

function isDueSoon(protocol) {
  if (!protocol.dueDate || isOverdue(protocol) || ['Concluído', 'Cancelado'].includes(protocol.status)) return false;
  const today = new Date(`${todayInput()}T00:00:00`);
  const due = new Date(`${protocol.dueDate}T00:00:00`);
  const diff = Math.ceil((due - today) / 86400000);
  return diff <= 3;
}

function describeDue(protocol) {
  if (!protocol.dueDate) return 'Sem prazo';
  if (isOverdue(protocol)) return `Vencido em ${formatDate(protocol.dueDate)}`;
  if (isDueSoon(protocol)) return `Vence em breve: ${formatDate(protocol.dueDate)}`;
  return `Prazo: ${formatDate(protocol.dueDate)}`;
}

function downloadFile(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvValue(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function titleCase(value) {
  return value
    .toLowerCase()
    .replace(/(^|\s|\-|')([a-zà-ú])/g, (match) => match.toUpperCase());
}

function resetClientForType(type) {
  return { ...emptyClient, type };
}

function onlyDigits(value) {
  return value.replace(/\D/g, '');
}

function generateId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch (_) {}
  // Fallback seguro para HTTP / navegadores antigos
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function generateProtocolNumber(protocols) {
  const year = new Date().getFullYear();
  const count = protocols.filter((protocol) => String(protocol.number).includes(`/${year}`)).length + 1;
  return `${String(count).padStart(5, '0')}/${year}`;
}

function normalizeUsername(value) {
  return value.trim().toLowerCase();
}

function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function ensureAdminEmployee(employees) {
  const hasAdmin = employees.some((employee) => employee.id === ADMIN_USER.id || employee.role === 'admin');
  return hasAdmin ? employees : [ADMIN_USER, ...employees];
}

function App() {
  const [activeTab, setActiveTab] = useState('protocols');
  const [protocols, setProtocols] = useState(() => loadStorage(STORAGE_KEYS.protocols, []));
  const [clients, setClients] = useState(() => loadStorage(STORAGE_KEYS.clients, []));
  const [employees, setEmployees] = useState(() => {
    const stored = ensureAdminEmployee(loadStorage(STORAGE_KEYS.employees, []));
    saveStorage(STORAGE_KEYS.employees, stored);
    return stored;
  });
  const [company, setCompany] = useState(() => loadStorage(STORAGE_KEYS.company, emptyCompany));
  const [currentUser, setCurrentUser] = useState(() => loadStorage(STORAGE_KEYS.session, null));
  const [createdProtocol, setCreatedProtocol] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(emptyFilters);

  const authenticatedUser = employees.find((employee) => employee.id === currentUser?.id && employee.role === currentUser?.role) || null;
  const isAdmin = authenticatedUser?.role === 'admin';

  useEffect(() => {
    let active = true;

    async function loadRemoteData() {
      const { data: remote } = await loadAllAppData();
      if (!active) return;
      if (!remote) return;

      const hasData = (value) => value !== null && value !== undefined && (!Array.isArray(value) || value.length > 0);
      if (hasData(remote.protocols)) {
        setProtocols(remote.protocols);
        saveStorage(STORAGE_KEYS.protocols, remote.protocols);
      }
      if (hasData(remote.clients)) {
        setClients(remote.clients);
        saveStorage(STORAGE_KEYS.clients, remote.clients);
      }
      if (hasData(remote.employees)) {
        const nextEmployees = ensureAdminEmployee(remote.employees);
        setEmployees(nextEmployees);
        saveStorage(STORAGE_KEYS.employees, nextEmployees);
      }
      if (hasData(remote.company)) {
        setCompany(remote.company);
        saveStorage(STORAGE_KEYS.company, remote.company);
      }
    }

    loadRemoteData();

    return () => {
      active = false;
    };
  }, []);

  const filteredProtocols = useMemo(() => {
    const term = search.toLowerCase();
    return protocols.filter((protocol) => {
      const matchesSearch = [protocol.number, protocol.clientName, protocol.employeeName, protocol.status, protocol.deliveredTo, protocol.notes].some((item) => item?.toLowerCase().includes(term));
      const matchesClient = !filters.clientId || protocol.clientId === filters.clientId;
      const matchesEmployee = !filters.employeeId || protocol.employeeId === filters.employeeId;
      const matchesStatus = !filters.status || protocol.status === filters.status;
      const matchesStart = !filters.startDate || protocol.date >= filters.startDate;
      const matchesEnd = !filters.endDate || protocol.date <= filters.endDate;
      const matchesDue = !filters.due || (filters.due === 'overdue' ? isOverdue(protocol) : filters.due === 'soon' ? isDueSoon(protocol) : !protocol.dueDate);
      return matchesSearch && matchesClient && matchesEmployee && matchesStatus && matchesStart && matchesEnd && matchesDue;
    });
  }, [protocols, search, filters]);

  if (!authenticatedUser) {
    return <LoginView employees={employees} onLogin={(employee) => {
      const session = { id: employee.id, role: employee.role, ts: Date.now() };
      setCurrentUser(session);
      setActiveTab('protocols');
      saveStorage(STORAGE_KEYS.session, session);
    }} />;
  }

  const persistProtocols = (value) => {
    setProtocols(value);
    saveData('protocols', value);
  };

  const persistClients = (value) => {
    setClients(value);
    saveData('clients', value);
  };

  const persistEmployees = (value) => {
    const nextEmployees = ensureAdminEmployee(value);
    setEmployees(nextEmployees);
    saveData('employees', nextEmployees);
  };

  const persistCompany = (value) => {
    setCompany(value);
    saveData('company', value);
  };

  const restoreBackup = (data) => {
    const nextEmployees = ensureAdminEmployee(data.employees || []);
    persistProtocols(data.protocols || []);
    persistClients(data.clients || []);
    persistEmployees(nextEmployees);
    persistCompany(data.company || emptyCompany);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><FileText size={26} /></div>
          <div>
            <strong>ProtoControl</strong>
            <span>Controle de Protocolos</span>
          </div>
        </div>
        <nav>
          <button className={activeTab === 'protocols' ? 'active' : ''} onClick={() => setActiveTab('protocols')}><FileText size={18} /> Protocolos</button>
          <button className={activeTab === 'clients' ? 'active' : ''} onClick={() => setActiveTab('clients')}><Users size={18} /> Clientes</button>
          {isAdmin && <button className={activeTab === 'employees' ? 'active' : ''} onClick={() => setActiveTab('employees')}><UserRoundPlus size={18} /> Funcionários</button>}
          {isAdmin && <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}><Settings size={18} /> Configurações</button>}
        </nav>
        <button className="logout-button" onClick={() => {
          setCurrentUser(null);
          setActiveTab('protocols');
          saveStorage(STORAGE_KEYS.session, null);
        }}><LogOut size={15} /> Sair</button>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p>Aplicativo para escritório de contabilidade</p>
            <h1>{activeTab === 'protocols' ? 'Protocolos' : activeTab === 'clients' ? 'Clientes' : activeTab === 'employees' ? 'Funcionários' : 'Configurações da Empresa'}</h1>
          </div>
          <div className="company-pill">
            {company.logo ? <img src={company.logo} alt={company.tradeName || 'Logo da empresa'} /> : <Building2 size={48} />}
            <div className="company-info">
              <strong>{company.tradeName || 'Empresa não configurada'}</strong>
              {company.legalName && company.legalName !== company.tradeName && <span>{company.legalName}</span>}
              {company.cnpj && <span>CNPJ: {company.cnpj}</span>}
              {company.phone && <span>{company.phone}</span>}
            </div>
          </div>
        </header>

        {activeTab === 'protocols' && (
          <ProtocolsView
            protocols={filteredProtocols}
            allProtocols={protocols}
            clients={clients}
            employees={employees}
            currentUser={authenticatedUser}
            company={company}
            search={search}
            setSearch={setSearch}
            filters={filters}
            setFilters={setFilters}
            onSaveProtocol={(protocol) => {
              const next = [protocol, ...protocols];
              persistProtocols(next);
              setCreatedProtocol(protocol);
            }}
            onUpdateProtocol={(updated) => persistProtocols(protocols.map((protocol) => protocol.id === updated.id ? updated : protocol))}
            onDeleteProtocol={(id) => persistProtocols(protocols.filter((protocol) => protocol.id !== id))}
            onSaveClient={(client) => persistClients([client, ...clients])}
            createdProtocol={createdProtocol}
            setCreatedProtocol={setCreatedProtocol}
          />
        )}
        {activeTab === 'clients' && <PeopleManager title="Clientes" type="cliente" people={clients} onSave={persistClients} protocols={protocols} />}
        {activeTab === 'employees' && isAdmin && <PeopleManager title="Funcionários" type="funcionário" people={employees} onSave={persistEmployees} includePassword />}
        {activeTab === 'employees' && !isAdmin && <AccessDenied title="Cadastro de funcionários" message="Somente o usuário administrativo pode gerenciar funcionários." />}
        {activeTab === 'settings' && isAdmin && <SettingsView company={company} protocols={protocols} clients={clients} employees={employees} onSave={persistCompany} onRestoreBackup={restoreBackup} />}
        {activeTab === 'settings' && !isAdmin && <AccessDenied title="Configurações da empresa" message="Somente o usuário administrativo pode editar os dados da empresa." />}
      </main>
    </div>
  );
}

function LoginView({ employees, onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = (event) => {
    event.preventDefault();
    const user = employees.find((employee) => normalizeUsername(employee.username || employee.name) === normalizeUsername(username) && employee.password === password);
    if (!user) {
      setError('Usuário ou senha inválidos.');
      return;
    }
    onLogin(user);
  };

  return (
    <div className="login-page">
      <section className="login-card">
        <div className="brand login-brand">
          <div className="brand-icon"><Lock size={26} /></div>
          <div>
            <strong>ProtoControl</strong>
            <span>Acesse para continuar</span>
          </div>
        </div>
        <form onSubmit={submit}>
          <label>Usuário<input value={username} onChange={(event) => setUsername(event.target.value)} autoFocus /></label>
          <label>Senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error && <p className="error-message">{error}</p>}
          <button className="primary" type="submit"><Lock size={18} /> Entrar</button>
        </form>
      </section>
    </div>
  );
}

function AccessDenied({ title, message }) {
  return (
    <section className="card wide-card">
      <div className="section-title"><div><span>Acesso restrito</span><h2>{title}</h2></div></div>
      <p className="empty">{message}</p>
    </section>
  );
}

function ProtocolsView({ protocols, allProtocols, clients, employees, currentUser, company, search, setSearch, filters, setFilters, onSaveProtocol, onUpdateProtocol, onDeleteProtocol, onSaveClient, createdProtocol, setCreatedProtocol }) {
  const [form, setForm] = useState(() => newProtocolForm(allProtocols, currentUser));
  const [formError, setFormError] = useState('');
  const [quickClient, setQuickClient] = useState(false);
  const [newClient, setNewClient] = useState(emptyClient);
  const [whatsAppProtocol, setWhatsAppProtocol] = useState(null);
  const [detailsProtocol, setDetailsProtocol] = useState(null);
  const [showProtocolModal, setShowProtocolModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const selectedClient = clients.find((client) => client.id === form.clientId);
  const activeFilters = Object.values(filters).filter(Boolean).length;

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const resetForm = (protocolsList = allProtocols) => {
    setForm(newProtocolForm(protocolsList, currentUser));
    setQuickClient(false);
    setNewClient(emptyClient);
    setFormError('');
  };

  const openProtocolModal = () => {
    resetForm();
    setShowProtocolModal(true);
  };

  const closeProtocolModal = () => {
    resetForm();
    setShowProtocolModal(false);
  };

  const buildClient = (data) => ({
    ...data,
    id: generateId(),
    name: titleCase(data.name.trim()),
    tradeName: data.type === 'PJ' ? titleCase((data.tradeName || data.name).trim()) : '',
    legalName: data.type === 'PJ' ? titleCase((data.legalName || data.name).trim()) : '',
    state: 'MG',
  });

  const submit = (event) => {
    event.preventDefault();
    let clientId = form.clientId;
    let client = selectedClient;

    if (!clientId && quickClient && newClient.name.trim()) {
      client = buildClient(newClient);
      clientId = client.id;
      onSaveClient(client);
    }

    if (!clientId) {
      setFormError('Selecione um cliente ou cadastre um novo antes de salvar.');
      return;
    }
    setFormError('');

    const protocol = {
      ...form,
      clientId,
      id: generateId(),
      clientName: client?.name || '',
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      deliveredTo: titleCase(form.deliveredTo.trim()),
      createdAt: new Date().toISOString(),
      attachments: form.attachments || [],
      history: [{
        id: generateId(),
        date: new Date().toISOString(),
        employeeName: currentUser.name,
        action: 'Protocolo criado',
      }],
    };

    onSaveProtocol(protocol);
    resetForm([...allProtocols, protocol]);
    setShowProtocolModal(false);
  };

  const createClient = () => {
    if (!newClient.name.trim()) return;
    const client = buildClient(newClient);
    onSaveClient(client);
    setForm((current) => ({ ...current, clientId: client.id }));
    setNewClient(emptyClient);
    setQuickClient(false);
  };

  const addAttachments = (files) => {
    Promise.all(Array.from(files).map((file) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ id: generateId(), name: file.name, size: file.size, type: file.type, data: reader.result });
      reader.readAsDataURL(file);
    }))).then((attachments) => setForm((current) => ({ ...current, attachments: [...(current.attachments || []), ...attachments] })));
  };

  const exportCsv = () => {
    const header = ['Número', 'Data', 'Prazo', 'Cliente', 'Funcionário', 'Situação', 'Entregue para', 'Observações', 'Anexos'];
    const rows = protocols.map((protocol) => [
      protocol.number,
      formatDate(protocol.date),
      formatDate(protocol.dueDate),
      protocol.clientName,
      protocol.employeeName,
      protocol.status,
      protocol.deliveredTo,
      protocol.notes,
      (protocol.attachments || []).map((attachment) => attachment.name).join('; '),
    ]);
    downloadFile(`protocolos-${todayInput()}.csv`, [header, ...rows].map((row) => row.map(csvValue).join(';')).join('\n'), 'text/csv;charset=utf-8');
  };

  return (
    <div className="grid">
      <section className="card wide-card">
        <div className="section-title">
          <div><span>Consulta</span><h2>Protocolos cadastrados</h2></div>
          <div className="actions">
            <button className="primary" type="button" onClick={openProtocolModal}><Plus size={16} /> Adicionar protocolo</button>
            <button className="ghost" type="button" onClick={exportCsv}><FileDown size={16} /> Exportar CSV</button>
          </div>
        </div>
        <div className="compact-search-row">
          <div className="search-box"><Search size={18} /><input placeholder="Buscar por número, cliente, funcionário ou situação" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          <button className="ghost filter-toggle" type="button" onClick={() => setShowFilters(!showFilters)}>Filtros {activeFilters ? '(' + activeFilters + ')' : ''}</button>
        </div>
        {showFilters && (
        <div className="filters-grid">
          <select value={filters.clientId} onChange={(event) => setFilters({ ...filters, clientId: event.target.value })}><option value="">Todos os clientes</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select>
          <select value={filters.employeeId} onChange={(event) => setFilters({ ...filters, employeeId: event.target.value })}><option value="">Todos os funcionários</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select>
          <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">Todas as situações</option>{STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}</select>
          <select value={filters.due} onChange={(event) => setFilters({ ...filters, due: event.target.value })}><option value="">Todos os prazos</option><option value="overdue">Vencidos</option><option value="soon">Vencendo em breve</option><option value="none">Sem prazo</option></select>
          <input type="date" value={filters.startDate} onChange={(event) => setFilters({ ...filters, startDate: event.target.value })} />
          <input type="date" value={filters.endDate} onChange={(event) => setFilters({ ...filters, endDate: event.target.value })} />
          <button className="ghost" type="button" onClick={() => setFilters(emptyFilters)}>Limpar filtros</button>
        </div>
        )}
        <div className="protocol-list">
          {protocols.map((protocol) => <ProtocolItem key={protocol.id} protocol={protocol} company={company} onWhatsApp={() => setWhatsAppProtocol(protocol)} onDetails={() => setDetailsProtocol(protocol)} />)}
          {!protocols.length && <p className="empty">Nenhum protocolo cadastrado ainda.</p>}
        </div>
      </section>

      {createdProtocol && <ProtocolSuccess protocol={createdProtocol} company={company} onWhatsApp={() => setWhatsAppProtocol(createdProtocol)} onClose={() => setCreatedProtocol(null)} />}
      {whatsAppProtocol && <WhatsAppRecipientModal protocol={whatsAppProtocol} company={company} clients={clients} employees={employees} onClose={() => setWhatsAppProtocol(null)} />}
      {detailsProtocol && <ProtocolDetailsModal protocol={detailsProtocol} currentUser={currentUser} onClose={() => setDetailsProtocol(null)} onSave={(updated) => { onUpdateProtocol(updated); setDetailsProtocol(updated); }} onDelete={onDeleteProtocol} />}
      {showProtocolModal && (
        <div className="modal-backdrop">
          <div className="modal large-modal protocol-modal">
            <div className="section-title">
              <div><span>Novo registro</span><h2>Dados do protocolo</h2></div>
              <strong className="protocol-number">{form.number}</strong>
            </div>
            <form className="protocol-modal-form" onSubmit={submit}>
              <div className="field-row">
                <label>Protocolo Nº<input value={form.number} readOnly /></label>
                <label>Data<input type="date" value={form.date} readOnly /></label>
              </div>
              <label>Criado por
                <input value={currentUser.name} readOnly />
              </label>
              <label>Destinatário / Cliente
                <div className="inline-action">
                  <select value={form.clientId} onChange={(event) => { update('clientId', event.target.value); setFormError(''); }}>
                    <option value="">Selecione o cliente</option>
                    {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                  </select>
                  <button type="button" className="ghost" onClick={() => setQuickClient(!quickClient)}><Plus size={16} /> Cliente</button>
                </div>
              </label>
              {quickClient && (
                <div className="quick-box">
                  <select value={newClient.type} onChange={(event) => setNewClient(resetClientForType(event.target.value))}>
                    <option value="PF">Pessoa Física</option>
                    <option value="PJ">Pessoa Jurídica</option>
                  </select>
                  <input placeholder={newClient.type === 'PJ' ? 'Razão social' : 'Nome do cliente'} value={newClient.name} onChange={(event) => setNewClient({ ...newClient, name: event.target.value })} />
                  {newClient.type === 'PJ' && <input placeholder="Nome fantasia" value={newClient.tradeName} onChange={(event) => setNewClient({ ...newClient, tradeName: event.target.value })} />}
                  {newClient.type === 'PJ' && <input placeholder="Inscrição estadual" value={newClient.stateRegistration} onChange={(event) => setNewClient({ ...newClient, stateRegistration: event.target.value })} />}
                  {newClient.type === 'PJ' && <input placeholder="Inscrição municipal" value={newClient.municipalRegistration} onChange={(event) => setNewClient({ ...newClient, municipalRegistration: event.target.value })} />}
                  <input placeholder={newClient.type === 'PJ' ? 'CNPJ' : 'CPF'} value={newClient.document} onChange={(event) => setNewClient({ ...newClient, document: event.target.value })} />
                  <input placeholder="Telefone/WhatsApp" value={newClient.phone} onChange={(event) => setNewClient({ ...newClient, phone: event.target.value })} />
                  <input placeholder="E-mail" value={newClient.email} onChange={(event) => setNewClient({ ...newClient, email: event.target.value })} />
                  <input placeholder="Endereço" value={newClient.address} onChange={(event) => setNewClient({ ...newClient, address: event.target.value })} />
                  <input placeholder="Número" value={newClient.number} onChange={(event) => setNewClient({ ...newClient, number: event.target.value })} />
                  <input placeholder="Bairro" value={newClient.district} onChange={(event) => setNewClient({ ...newClient, district: event.target.value })} />
                  <select value={newClient.city} onChange={(event) => setNewClient({ ...newClient, city: event.target.value })}>
                    {MINAS_GERAIS_CITIES.map((city) => <option key={city}>{city}</option>)}
                  </select>
                  <input value="MG" readOnly />
                  <button type="button" onClick={createClient}>Cadastrar cliente</button>
                </div>
              )}
              <label>Situação
                <select value={form.status} onChange={(event) => update('status', event.target.value)}>
                  {STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
                </select>
              </label>
              <label>Prazo / vencimento<input type="date" value={form.dueDate} onChange={(event) => update('dueDate', event.target.value)} /></label>
              <label>Entregue para<input value={form.deliveredTo} onChange={(event) => update('deliveredTo', event.target.value)} placeholder="Nome de quem recebeu/retirou" /></label>
              <label>Observações<textarea value={form.notes} onChange={(event) => update('notes', event.target.value)} placeholder="Detalhes do protocolo, documentos, prazos ou instruções" /></label>
              <label>Anexos<input type="file" multiple onChange={(event) => addAttachments(event.target.files)} /></label>
              {!!form.attachments?.length && <div className="attachment-list">{form.attachments.map((attachment) => <span key={attachment.id}><Paperclip size={14} /> {attachment.name}</span>)}</div>}
              {formError && <p className="error-message" style={{marginBottom: '0.5rem', color: 'var(--color-danger, #ef4444)', fontWeight: 500}}>{formError}</p>}
              <div className="modal-actions modal-footer">
                      <button className="ghost" type="button" onClick={closeProtocolModal}>Cancelar</button>
                <button className="primary" type="submit"><CheckCircle2 size={18} /> Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function newProtocolForm(protocols, currentUser) {
  return {
    number: generateProtocolNumber(protocols),
    date: todayInput(),
    employeeId: currentUser?.id || '',
    clientId: '',
    status: 'Pendente',
    dueDate: '',
    deliveredTo: '',
    notes: '',
    attachments: [],
  };
}

function ProtocolItem({ protocol, company, onWhatsApp, onDetails }) {
  return (
    <article className={`protocol-item ${isOverdue(protocol) ? 'overdue' : isDueSoon(protocol) ? 'due-soon' : ''}`}>
      <div><strong>{protocol.number}</strong><span>{protocol.clientName}</span></div>
      <div><span>{formatDate(protocol.date)}</span><small><Clock size={13} /> {describeDue(protocol)}</small><em>{protocol.status}</em></div>
      <div className="actions"><button onClick={onDetails}><History size={16} /> Detalhes</button><button onClick={() => printProtocol(protocol, company)}><Printer size={16} /> Imprimir</button><button onClick={onWhatsApp}><MessageCircle size={16} /> WhatsApp</button></div>
    </article>
  );
}

function ProtocolDetailsModal({ protocol, currentUser, onClose, onSave, onDelete }) {
  const [status, setStatus] = useState(protocol.status);
  const [dueDate, setDueDate] = useState(protocol.dueDate || '');
  const [notes, setNotes] = useState(protocol.notes || '');

  const save = () => {
    const changes = [];
    if (status !== protocol.status) changes.push(`Situação: ${protocol.status} → ${status}`);
    if (dueDate !== (protocol.dueDate || '')) changes.push(`Prazo: ${formatDate(protocol.dueDate) || 'sem prazo'} → ${formatDate(dueDate) || 'sem prazo'}`);
    if (notes !== (protocol.notes || '')) changes.push('Observações atualizadas');
    const updated = {
      ...protocol,
      status,
      dueDate,
      notes,
      history: changes.length ? [{ id: generateId(), date: new Date().toISOString(), employeeName: currentUser.name, action: changes.join('; ') }, ...(protocol.history || [])] : protocol.history,
    };
    onSave(updated);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal large-modal">
        <History className="whatsapp-icon" size={52} />
        <h2>Detalhes do protocolo {protocol.number}</h2>
        <div className="details-grid">
          <label>Situação<select value={status} onChange={(event) => setStatus(event.target.value)}>{STATUS_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Prazo<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
          <label className="full-row">Observações<textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        </div>
        <h3>Anexos</h3>
        <div className="attachment-list">
          {(protocol.attachments || []).map((attachment) => <a key={attachment.id} href={attachment.data} download={attachment.name}><Paperclip size={14} /> {attachment.name}</a>)}
          {!protocol.attachments?.length && <p className="empty">Nenhum anexo cadastrado.</p>}
        </div>
        <h3>Histórico de alterações</h3>
        <div className="history-list">
          {(protocol.history || []).map((item) => <article key={item.id}><strong>{item.action}</strong><span>{item.employeeName} · {formatDateTime(item.date)}</span></article>)}
          {!protocol.history?.length && <p className="empty">Nenhum histórico registrado.</p>}
        </div>
        <div className="modal-actions"><button onClick={save}><CheckCircle2 size={18} /> Salvar alterações</button><button className="danger" onClick={() => { if (confirm('Excluir este protocolo permanentemente?')) { onDelete(protocol.id); onClose(); } }}>Excluir</button><button className="ghost" onClick={onClose}>Fechar</button></div>
      </div>
    </div>
  );
}

function ProtocolSuccess({ protocol, company, onWhatsApp, onClose }) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <CheckCircle2 className="success-icon" size={52} />
        <h2>Protocolo cadastrado com sucesso</h2>
        <p>O protocolo <strong>{protocol.number}</strong> foi registrado para <strong>{protocol.clientName}</strong>.</p>
        <div className="modal-actions">
          <button onClick={() => printProtocol(protocol, company)}><Printer size={18} /> Imprimir protocolo</button>
          <button onClick={onWhatsApp}><MessageCircle size={18} /> Enviar por WhatsApp</button>
          <button className="ghost" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

function WhatsAppRecipientModal({ protocol, company, clients, employees, onClose }) {
  const recipients = [
    ...employees.map((employee) => ({ ...employee, type: 'Funcionário' })),
    ...clients.map((client) => ({ ...client, type: 'Cliente' })),
  ];

  const sendTo = (recipient) => {
    sendWhatsApp(protocol, company, recipient.phone);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <MessageCircle className="whatsapp-icon" size={52} />
        <h2>Enviar protocolo por WhatsApp</h2>
        <p>Escolha um funcionário ou cliente cadastrado para receber o protocolo <strong>{protocol.number}</strong>.</p>
        <div className="recipient-list">
          {recipients.map((recipient) => (
            <button key={`${recipient.type}-${recipient.id}`} type="button" onClick={() => sendTo(recipient)}>
              <strong>{recipient.name}</strong>
              <span>{recipient.type} · {recipient.phone || 'Sem telefone cadastrado'}</span>
            </button>
          ))}
          {!recipients.length && <p className="empty">Nenhum funcionário ou cliente cadastrado.</p>}
        </div>
        <div className="modal-actions">
          <button className="ghost" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

function PeopleManager({ title, type, people, onSave, protocols = [], includePassword = false }) {
  const [person, setPerson] = useState(includePassword ? emptyPerson : emptyClient);
  const [editingId, setEditingId] = useState(null);
  const [historyPerson, setHistoryPerson] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const emptyForm = includePassword ? emptyPerson : emptyClient;

  const openAdd = () => {
    setEditingId(null);
    setPerson(emptyForm);
    setShowModal(true);
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setPerson({
      ...emptyForm,
      ...item,
      type: item.type || 'PF',
      username: item.username || '',
      password: item.password || '',
      city: item.city || 'Águas Formosas',
      state: 'MG',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setPerson(emptyForm);
  };

  const handleDelete = () => {
    if (confirm('Excluir este ' + type + ' permanentemente?')) {
      onSave(people.filter((item) => item.id !== editingId));
      closeModal();
    }
  };

  const submit = (event) => {
    event.preventDefault();
    if (!person.name.trim() || (includePassword && !person.password.trim())) return;
    const existing = people.find((item) => item.id === editingId);
    const record = {
      ...existing,
      ...person,
      id: editingId || generateId(),
      name: titleCase(person.name.trim()),
      ...(!includePassword ? {
        tradeName: person.type === 'PJ' ? titleCase((person.tradeName || person.name).trim()) : '',
        legalName: person.type === 'PJ' ? titleCase((person.legalName || person.name).trim()) : '',
        state: 'MG',
      } : {}),
      ...(includePassword ? { role: existing?.role || 'employee', username: normalizeUsername(person.username || person.name), permissions: person.permissions || DEFAULT_PERMISSIONS } : {}),
    };
    onSave(editingId ? people.map((item) => item.id === editingId ? record : item) : [record, ...people]);
    closeModal();
  };

  return (
    <section className="card wide-card">
      <div className="section-title">
        <div><span>Lista</span><h2>{title}</h2></div>
        <button className="primary" type="button" onClick={openAdd}><Plus size={16} /> Adicionar {type}</button>
      </div>
      <div className="people-list">
        {people.map((item) => <article key={item.id}><strong>{item.name}</strong>{includePassword && <span>{item.role === 'admin' ? 'Administrador' : 'Funcionário'} · Usuário: {item.username || item.name}</span>}{!includePassword && <span>{item.type === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}{item.tradeName ? ' · Fantasia: ' + item.tradeName : ''}</span>}<span>{item.document || 'Sem documento'} · {item.phone || 'Sem telefone'}</span>{!includePassword && item.email && <span>{item.email}</span>}<small>{[item.address, item.number, item.district, item.city || 'Águas Formosas', item.state || 'MG'].filter(Boolean).join(' · ')}</small><div className="actions"><button type="button" onClick={() => startEdit(item)}>Editar</button>{!includePassword && <button type="button" onClick={() => setHistoryPerson(item)}><History size={16} /> Histórico</button>}</div></article>)}
        {!people.length && <p className="empty">Nenhum cadastro encontrado.</p>}
      </div>
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal large-modal">
            <div className="section-title"><div><span>{editingId ? 'Edição' : 'Cadastro'}</span><h2>{editingId ? 'Editar ' + type : 'Novo ' + type}</h2></div></div>
            <form onSubmit={submit}>
              {!includePassword && <label>Tipo de cliente<select value={person.type} onChange={(event) => setPerson(resetClientForType(event.target.value))}><option value="PF">Pessoa Física</option><option value="PJ">Pessoa Jurídica</option></select></label>}
              <label>{!includePassword && person.type === 'PJ' ? 'Razão social' : 'Nome'}<input value={person.name} onChange={(event) => setPerson({ ...person, name: event.target.value })} required /></label>
              {!includePassword && person.type === 'PJ' && <label>Nome fantasia<input value={person.tradeName} onChange={(event) => setPerson({ ...person, tradeName: event.target.value })} /></label>}
              {!includePassword && person.type === 'PJ' && <label>Inscrição estadual<input value={person.stateRegistration} onChange={(event) => setPerson({ ...person, stateRegistration: event.target.value })} /></label>}
              {!includePassword && person.type === 'PJ' && <label>Inscrição municipal<input value={person.municipalRegistration} onChange={(event) => setPerson({ ...person, municipalRegistration: event.target.value })} /></label>}
              {includePassword && <label>Usuário<input value={person.username} onChange={(event) => setPerson({ ...person, username: event.target.value })} placeholder="Se vazio, usará o nome" /></label>}
              {includePassword && <label>Senha<input type="password" value={person.password} onChange={(event) => setPerson({ ...person, password: event.target.value })} required /></label>}
              {includePassword && (
                <div className="permissions-section">
                  <h3>Permissoes de acesso</h3>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={person.permissions?.canAccessProtocols ?? true} onChange={(e) => setPerson({ ...person, permissions: { ...person.permissions, canAccessProtocols: e.target.checked } })} />
                    Cadastro de protocolos
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={person.permissions?.canAccessClients ?? true} onChange={(e) => setPerson({ ...person, permissions: { ...person.permissions, canAccessClients: e.target.checked } })} />
                    Cadastro de clientes
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={person.permissions?.canAccessEmployees ?? false} onChange={(e) => setPerson({ ...person, permissions: { ...person.permissions, canAccessEmployees: e.target.checked } })} />
                    Cadastro de funcionarios
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={person.permissions?.canAccessSettings ?? false} onChange={(e) => setPerson({ ...person, permissions: { ...person.permissions, canAccessSettings: e.target.checked } })} />
                    Configuracoes da empresa
                  </label>
                </div>
              )}
              <label>{!includePassword && person.type === 'PJ' ? 'CNPJ' : 'CPF/CNPJ'}<input value={person.document} onChange={(event) => setPerson({ ...person, document: event.target.value })} /></label>
              <label>Telefone/WhatsApp<input value={person.phone} onChange={(event) => setPerson({ ...person, phone: event.target.value })} /></label>
              {!includePassword && <label>E-mail<input value={person.email} onChange={(event) => setPerson({ ...person, email: event.target.value })} /></label>}
              <label>Endereço<input value={person.address} onChange={(event) => setPerson({ ...person, address: event.target.value })} /></label>
              {!includePassword && <div className="field-row"><label>Número<input value={person.number} onChange={(event) => setPerson({ ...person, number: event.target.value })} /></label><label>Bairro<input value={person.district} onChange={(event) => setPerson({ ...person, district: event.target.value })} /></label></div>}
              {!includePassword && <div className="field-row"><label>Cidade<select value={person.city} onChange={(event) => setPerson({ ...person, city: event.target.value })}>{MINAS_GERAIS_CITIES.map((city) => <option key={city}>{city}</option>)}</select></label><label>Estado<input value="MG" readOnly /></label></div>}
              <div className="modal-actions modal-footer">
                <button className="ghost" type="button" onClick={closeModal}>Cancelar</button>
                {editingId && <button className="danger" type="button" onClick={handleDelete}>Excluir</button>}
                <button className="primary" type="submit"><CheckCircle2 size={18} /> {editingId ? 'Atualizar' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {historyPerson && <ClientHistoryModal client={historyPerson} protocols={protocols.filter((protocol) => protocol.clientId === historyPerson.id)} onClose={() => setHistoryPerson(null)} />}
    </section>
  );
}

function ClientHistoryModal({ client, protocols, onClose }) {
  return (
    <div className="modal-backdrop">
      <div className="modal large-modal">
        <Users className="whatsapp-icon" size={52} />
        <h2>Histórico de {client.name}</h2>
        <div className="protocol-list compact-list">
          {protocols.map((protocol) => <article key={protocol.id} className={`protocol-item ${isOverdue(protocol) ? 'overdue' : isDueSoon(protocol) ? 'due-soon' : ''}`}><div><strong>{protocol.number}</strong><span>{protocol.status}</span></div><div><span>{formatDate(protocol.date)}</span><small><Clock size={13} /> {describeDue(protocol)}</small></div></article>)}
          {!protocols.length && <p className="empty">Nenhum protocolo vinculado a este cliente.</p>}
        </div>
        <div className="modal-actions"><button className="ghost" onClick={onClose}>Fechar</button></div>
      </div>
    </div>
  );
}

function SettingsView({ company, protocols, clients, employees, onSave, onRestoreBackup }) {
  const [form, setForm] = useState(company);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setForm(company);
  }, [company]);

  const handleLogo = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((current) => ({ ...current, logo: reader.result }));
    reader.readAsDataURL(file);
  };

  const submit = (event) => {
    event.preventDefault();
    onSave(form);
  };

  const exportBackup = () => {
    downloadFile(`backup-protocontrol-${todayInput()}.json`, JSON.stringify({ protocols, clients, employees, company: form }, null, 2), 'application/json;charset=utf-8');
  };

  const importBackup = (file) => {
    if (!file) return;
    if (!confirm('A importação substituirá todos os dados atuais. Deseja continuar?')) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (
          !data ||
          typeof data !== 'object' ||
          !Array.isArray(data.protocols) ||
          !Array.isArray(data.clients) ||
          !Array.isArray(data.employees) ||
          typeof data.company !== 'object'
        ) {
          alert('O arquivo de backup está incompleto ou inválido.');
          return;
        }
        onRestoreBackup(data);
      } catch {
        alert('Não foi possível importar o backup. Verifique se o arquivo JSON é válido.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <section className="card form-card wide-card">
      <div className="section-title"><div><span>Dados para impressão</span><h2>Informações da empresa</h2></div></div>
      <form onSubmit={submit}>
        <div className="logo-preview">{form.logo ? <img src={form.logo} alt="Logomarca" /> : <Building2 size={54} />}</div>
        <label>Logomarca<input type="file" accept="image/*" onChange={(event) => handleLogo(event.target.files?.[0])} /></label>
        <div className="field-row">
          <label>Nome fantasia<input value={form.tradeName} onChange={(event) => setForm({ ...form, tradeName: event.target.value })} /></label>
          <label>Razão social<input value={form.legalName} onChange={(event) => setForm({ ...form, legalName: event.target.value })} /></label>
        </div>
        <div className="field-row">
          <label>CNPJ<input value={form.cnpj} onChange={(event) => setForm({ ...form, cnpj: event.target.value })} /></label>
          <label>Telefone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
        </div>
        <label>Endereço<input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
        <button className="primary" type="submit"><CheckCircle2 size={18} /> Salvar configurações</button>
      </form>
      <div className="backup-box">
        <h3>Backup e restauração</h3>
        <p>Exporte uma cópia dos protocolos, clientes, funcionários e configurações ou restaure um arquivo salvo anteriormente.</p>
        <div className="actions">
          <button className="primary" type="button" onClick={exportBackup}><Download size={18} /> Exportar backup</button>
          <button className="ghost" type="button" onClick={() => fileInputRef.current?.click()}><Upload size={18} /> Importar backup</button>
        </div>
        <input ref={fileInputRef} className="hidden-input" type="file" accept="application/json" onChange={(event) => importBackup(event.target.files?.[0])} />
      </div>
    </section>
  );
}

function printProtocol(protocol, company) {
  const html = buildProtocolHtml(protocol, company);
  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

function sendWhatsApp(protocol, company, recipientPhone = '') {
  const phone = onlyDigits(recipientPhone);
  const message = encodeURIComponent(`Protocolo Nº ${protocol.number}
Data: ${formatDate(protocol.date)}
Criado por: ${protocol.employeeName}
Destinatário: ${protocol.clientName}
Situação: ${protocol.status}
Entregue para: ${protocol.deliveredTo || '-'}
Observações: ${protocol.notes || '-'}

${company.tradeName || ''}`);
  const url = phone ? `https://wa.me/55${phone}?text=${message}` : `https://wa.me/?text=${message}`;
  window.open(url, '_blank');
}

function buildProtocolHtml(protocol, company) {
  const e = escapeHtml;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Protocolo ${e(protocol.number)}</title><style>body{font-family:Arial,sans-serif;color:#172033;margin:40px}.sheet{border:1px solid #d7deea;border-radius:16px;padding:32px}.header{display:flex;gap:20px;align-items:center;border-bottom:2px solid #0f76bc;padding-bottom:20px;margin-bottom:26px}.logo{width:110px;height:80px;object-fit:contain}.placeholder{width:110px;height:80px;border:1px dashed #9aa8bc;display:flex;align-items:center;justify-content:center;color:#7b8798}.company h1{margin:0;font-size:24px}.company p{margin:4px 0;color:#5d6b82}.title{text-align:center;background:#eef7ff;border-radius:12px;padding:14px;font-size:24px;letter-spacing:2px}.grid{display:grid;grid-template-columns:190px 1fr;border:1px solid #d7deea;margin-top:20px}.label{background:#0f76bc;color:white;font-weight:bold;text-align:right;padding:13px;border-bottom:1px solid #d7deea}.value{padding:13px;border-bottom:1px solid #d7deea}.notes{min-height:90px}.signature{display:flex;justify-content:space-between;margin-top:60px;gap:40px}.signature div{flex:1;text-align:center;border-top:1px solid #172033;padding-top:10px}@media print{button{display:none}body{margin:20px}}</style></head><body><div class="sheet"><div class="header">${company.logo ? `<img class="logo" src="${company.logo}">` : '<div class="placeholder">Logo</div>'}<div class="company"><h1>${e(company.tradeName) || 'Empresa'}</h1><p>${e(company.legalName)}</p><p>CNPJ: ${e(company.cnpj) || '-'} · Tel.: ${e(company.phone) || '-'}</p><p>${e(company.address)}</p></div></div><div class="title">PROTOCOLO Nº ${e(protocol.number)}</div><div class="grid"><div class="label">CRIADO POR</div><div class="value">${e(protocol.employeeName)}</div><div class="label">DATA</div><div class="value">${e(formatDate(protocol.date))}</div><div class="label">DESTINATÁRIO</div><div class="value">${e(protocol.clientName)}</div><div class="label">SITUAÇÃO</div><div class="value">${e(protocol.status)}</div><div class="label">ENTREGUE</div><div class="value">${e(protocol.deliveredTo) || '-'}</div><div class="label">OBSERVAÇÕES</div><div class="value notes">${e(protocol.notes) || '-'}</div></div><div class="signature"><div>Assinatura do responsável</div><div>Assinatura do destinatário</div></div></div></body></html>`;
}

createRoot(document.getElementById('root')).render(<App />);
