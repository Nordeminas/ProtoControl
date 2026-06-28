import React from 'react';
import { Building2, LogOut, Settings, History, UserRoundPlus, DollarSign, Users, FileText } from 'lucide-react';
import { useAppState } from './hooks/useAppState';
import { LoginView, AccessDenied } from './components/LoginView';
import { ProtocolsView } from './components/ProtocolsView';
import { PeopleManager } from './components/PeopleManager';
import { SettingsView } from './components/SettingsView';
import { FeesView } from './components/FeesView';
import { HistoryView } from './components/HistoryView';

export default function App() {
  const {
    activeTab,
    setActiveTab,
    protocols,
    clients,
    employees,
    company,
    currentUser,
    setCurrentUser,
    auditLogs,
    fees,
    feeCategories,
    createdProtocol,
    setCreatedProtocol,
    search,
    setSearch,
    filters,
    setFilters,
    authenticatedUser,
    isAdmin,
    canAccessHistory,
    canAccessFees,
    filteredProtocols,
    persistProtocol,
    removeProtocol,
    persistClient,
    removeClient,
    persistEmployee,
    removeEmployee,
    persistCompany,
    persistFee,
    removeFee,
    persistFeeCategory,
    removeFeeCategory,
    restoreBackup,
    addAuditLog,
  } = useAppState();

  if (!authenticatedUser) {
    return (
      <LoginView
        employees={employees}
        onLogin={(employee) => {
          const session = { id: employee.id, role: employee.role, ts: Date.now() };
          setCurrentUser(session);
          setActiveTab('protocols');
          localStorage.setItem('protocontrol_session', JSON.stringify(session));
        }}
      />
    );
  }

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
          {canAccessFees && <button className={activeTab === 'fees' ? 'active' : ''} onClick={() => setActiveTab('fees')}><DollarSign size={18} /> Honorários</button>}
          {isAdmin && <button className={activeTab === 'employees' ? 'active' : ''} onClick={() => setActiveTab('employees')}><UserRoundPlus size={18} /> Funcionários</button>}
          {canAccessHistory && <button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}><History size={18} /> Histórico</button>}
          {isAdmin && <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}><Settings size={18} /> Configurações</button>}
        </nav>
        <button className="logout-button" onClick={() => {
          setCurrentUser(null);
          setActiveTab('protocols');
          localStorage.setItem('protocontrol_session', JSON.stringify(null));
        }}><LogOut size={15} /> Sair</button>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p>Aplicativo para escritório de contabilidade</p>
            <h1>{activeTab === 'protocols' ? 'Protocolos' : activeTab === 'clients' ? 'Clientes' : activeTab === 'employees' ? 'Funcionários' : activeTab === 'history' ? 'Histórico de Modificações' : activeTab === 'fees' ? 'Controle de Honorários' : 'Configurações da Empresa'}</h1>
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
              persistProtocol(protocol);
              setCreatedProtocol(protocol);
              addAuditLog('Criação', 'Protocolo', protocol.id, protocol.number, `Protocolo criado para ${protocol.clientName}`);
            }}
            onUpdateProtocol={(updated) => {
              persistProtocol(updated);
              addAuditLog('Edição', 'Protocolo', updated.id, updated.number, 'Detalhes do protocolo atualizados');
            }}
            onDeleteProtocol={(id) => {
              const p = protocols.find(p => p.id === id);
              removeProtocol(id);
              if (p) addAuditLog('Exclusão', 'Protocolo', id, p.number, 'Protocolo excluído');
            }}
            onSaveClient={(client) => {
              persistClient(client);
              addAuditLog('Criação', 'Cliente', client.id, client.name, 'Novo cliente cadastrado via protocolo');
            }}
            createdProtocol={createdProtocol}
            setCreatedProtocol={setCreatedProtocol}
          />
        )}
        {activeTab === 'clients' && <PeopleManager title="Clientes" type="cliente" people={clients} onSave={persistClient} onDelete={removeClient} protocols={protocols} onLog={addAuditLog} />}
        {activeTab === 'employees' && isAdmin && <PeopleManager title="Funcionários" type="funcionário" people={employees} onSave={persistEmployee} onDelete={removeEmployee} includePassword onLog={addAuditLog} />}
        {activeTab === 'employees' && !isAdmin && <AccessDenied title="Cadastro de funcionários" message="Somente o usuário administrativo pode gerenciar funcionários." />}
        {activeTab === 'fees' && canAccessFees && (
          <FeesView
            fees={fees}
            clients={clients}
            feeCategories={feeCategories}
            currentUser={authenticatedUser}
            onSaveFee={(fee) => {
              persistFee(fee);
              addAuditLog('Criação', 'Honorário', fee.id, fee.code, `Honorário ${fee.code} criado (R$ ${fee.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) para ${fee.clientName}`);
            }}
            onUpdateFee={(updated) => {
              persistFee(updated);
              addAuditLog('Edição', 'Honorário', updated.id, updated.code, `Honorário ${updated.code} atualizado`);
            }}
            onDeleteFee={(id) => {
              const f = fees.find((fee) => fee.id === id);
              removeFee(id);
              if (f) addAuditLog('Exclusão', 'Honorário', id, f.code, `Honorário ${f.code} excluído`);
            }}
            onSaveClient={(client) => {
              persistClient(client);
              addAuditLog('Criação', 'Cliente', client.id, client.name, 'Novo cliente cadastrado via honorários');
            }}
            onSaveFeeCategory={persistFeeCategory}
            onDeleteFeeCategory={removeFeeCategory}
          />
        )}
        {activeTab === 'fees' && !canAccessFees && <AccessDenied title="Controle de Honorários" message="Você não possui permissão para acessar o controle de honorários." />}
        {activeTab === 'history' && canAccessHistory && <HistoryView logs={auditLogs} />}
        {activeTab === 'history' && !canAccessHistory && <AccessDenied title="Histórico de Modificações" message="Você não possui permissão para visualizar o histórico do sistema." />}
        {activeTab === 'settings' && isAdmin && <SettingsView company={company} protocols={protocols} clients={clients} employees={employees} fees={fees} feeCategories={feeCategories} onSave={persistCompany} onRestoreBackup={restoreBackup} />}
        {activeTab === 'settings' && !isAdmin && <AccessDenied title="Configurações da empresa" message="Somente o usuário administrativo pode editar os dados da empresa." />}
      </main>
    </div>
  );
}
