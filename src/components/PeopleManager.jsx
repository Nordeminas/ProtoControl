import React, { useState } from 'react';
import { Plus, History, Users, Trash2, CheckCircle2 } from 'lucide-react';
import { emptyPerson, emptyClient, DEFAULT_PERMISSIONS, MINAS_GERAIS_CITIES } from '../constants';
import { titleCase, resetClientForType, generateId, normalizeUsername, isOverdue, isDueSoon, formatDate, describeDue } from '../utils';

export function PeopleManager({ title, type, people, onSave, onDelete, protocols = [], includePassword = false, onLog }) {
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
      const existing = people.find((item) => item.id === editingId);
      if (onDelete) {
        onDelete(editingId);
      } else {
        onSave(people.filter((item) => item.id !== editingId));
      }
      if (onLog && existing) onLog('Exclusão', includePassword ? 'Funcionário' : 'Cliente', existing.id, existing.name, `${includePassword ? 'Funcionário' : 'Cliente'} excluído`);
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
    onSave(record, editingId ? 'edit' : 'create');
    if (onLog) onLog(editingId ? 'Edição' : 'Criação', includePassword ? 'Funcionário' : 'Cliente', record.id, record.name, editingId ? 'Dados atualizados' : `Novo ${type} cadastrado`);
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
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
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
                  <h3>Permissões de acesso</h3>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={person.permissions?.canAccessProtocols ?? true} onChange={(e) => setPerson({ ...person, permissions: { ...person.permissions, canAccessProtocols: e.target.checked } })} />
                    Cadastro de protocolos
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={person.permissions?.canAccessClients ?? true} onChange={(e) => setPerson({ ...person, permissions: { ...person.permissions, canAccessClients: e.target.checked } })} />
                    Cadastro de clientes
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={person.permissions?.canAccessFees ?? false} onChange={(e) => setPerson({ ...person, permissions: { ...person.permissions, canAccessFees: e.target.checked } })} />
                    Controle de honorários
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={person.permissions?.canAccessEmployees ?? false} onChange={(e) => setPerson({ ...person, permissions: { ...person.permissions, canAccessEmployees: e.target.checked } })} />
                    Cadastro de funcionários
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={person.permissions?.canAccessSettings ?? false} onChange={(e) => setPerson({ ...person, permissions: { ...person.permissions, canAccessSettings: e.target.checked } })} />
                    Configurações da empresa
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={person.permissions?.canAccessHistory ?? false} onChange={(e) => setPerson({ ...person, permissions: { ...person.permissions, canAccessHistory: e.target.checked } })} />
                    Histórico de modificações
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

export function ClientHistoryModal({ client, protocols, onClose }) {
  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal large-modal">
        <Users className="whatsapp-icon" size={52} />
        <h2>Histórico de {client.name}</h2>
        <div className="protocol-list compact-list">
          {protocols.map((protocol) => (
            <article key={protocol.id} className={`protocol-item ${isOverdue(protocol) ? 'overdue' : isDueSoon(protocol) ? 'due-soon' : ''}`}>
              <div>
                <strong>{protocol.number}</strong>
                <span>{protocol.status}</span>
              </div>
              <div>
                <span>{formatDate(protocol.date)}</span>
                <small><Clock size={13} /> {describeDue(protocol)}</small>
              </div>
            </article>
          ))}
          {!protocols.length && <p className="empty">Nenhum protocolo vinculado a este cliente.</p>}
        </div>
        <div className="modal-actions"><button className="ghost" onClick={onClose}>Fechar</button></div>
      </div>
    </div>
  );
}

// Internal icon rendering helper since Clock is used but not explicitly destructured above
import { Clock } from 'lucide-react';
