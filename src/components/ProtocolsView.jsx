import React, { useState } from 'react';
import { Plus, Search, FileDown, Paperclip, CheckCircle2 } from 'lucide-react';
import { STATUS_OPTIONS, MINAS_GERAIS_CITIES, emptyClient } from '../constants';
import { generateId, titleCase, todayInput, resetClientForType, downloadFile, csvValue, formatDate, printProtocol } from '../utils';
import { ProtocolItem } from './ProtocolItem';
import { ProtocolDetailsModal, ProtocolSuccess, WhatsAppRecipientModal } from './ProtocolModals';

export function newProtocolForm(protocols, currentUser) {
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

// Internal helper for protocol number generation
function generateProtocolNumber(protocols) {
  const year = new Date().getFullYear();
  const count = protocols.filter((protocol) => String(protocol.number).includes(`/${year}`)).length + 1;
  return `${String(count).padStart(5, '0')}/${year}`;
}

export function ProtocolsView({
  protocols,
  allProtocols,
  clients,
  employees,
  currentUser,
  company,
  search,
  setSearch,
  filters,
  setFilters,
  onSaveProtocol,
  onUpdateProtocol,
  onDeleteProtocol,
  onSaveClient,
  createdProtocol,
  setCreatedProtocol
}) {
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
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) closeProtocolModal(); }}>
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
