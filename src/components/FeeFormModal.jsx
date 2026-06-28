import React, { useState } from 'react';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { emptyClient } from '../constants';
import { todayInput, titleCase, resetClientForType, generateId, generateFeeCode } from '../utils';

export function FeeFormModal({ fee, fees, clients, feeCategories = [], currentUser, onClose, onSave, onDelete, onSaveClient, onSaveFeeCategory, onDeleteFeeCategory }) {
  const [form, setForm] = useState(() => {
    if (fee) {
      return {
        issueDate: fee.issueDate || todayInput(),
        dueDate: fee.dueDate || todayInput(),
        category: fee.category || '',
        clientId: fee.clientId || '',
        value: fee.value || 0,
        status: fee.status || 'Pendente',
        installments: 1,
      };
    }
    return {
      issueDate: todayInput(),
      dueDate: todayInput(),
      category: '',
      clientId: '',
      value: 0,
      status: 'Pendente',
      installments: 1,
    };
  });
  const [formError, setFormError] = useState('');
  const [quickClient, setQuickClient] = useState(false);
  const [newClient, setNewClient] = useState(emptyClient);
  const [quickCategory, setQuickCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState('');

  const selectedClient = clients.find((c) => c.id === form.clientId);
  const update = (field, val) => setForm((c) => ({ ...c, [field]: val }));

  const buildClient = (data) => ({
    ...data,
    id: generateId(),
    name: titleCase(data.name.trim()),
    tradeName: data.type === 'PJ' ? titleCase((data.tradeName || data.name).trim()) : '',
    legalName: data.type === 'PJ' ? titleCase((data.legalName || data.name).trim()) : '',
    state: 'MG',
  });

  const createClient = () => {
    if (!newClient.name.trim()) return;
    const client = buildClient(newClient);
    onSaveClient(client);
    setForm((current) => ({ ...current, clientId: client.id }));
    setNewClient(emptyClient);
    setQuickClient(false);
  };

  const createCategory = () => {
    const name = newCategoryName.trim();
    if (!name) { setCategoryError('Informe o nome da categoria.'); return; }
    if (feeCategories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      setCategoryError('Esta categoria já existe.');
      return;
    }
    const category = { id: generateId(), name };
    if (onSaveFeeCategory) onSaveFeeCategory(category);
    setForm((current) => ({ ...current, category: name }));
    setNewCategoryName('');
    setCategoryError('');
    setQuickCategory(false);
  };

  const submit = (e) => {
    e.preventDefault();
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

    if (!form.category) {
      setFormError('Selecione uma categoria.');
      return;
    }

    if (form.value <= 0) {
      setFormError('Informe um valor maior que R$ 0,00.');
      return;
    }

    setFormError('');
    onSave({
      ...form,
      clientId,
      clientName: client?.name || '',
      value: Number(form.value),
    });
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal large-modal">
        <div className="section-title">
          <div>
            <span>{fee ? 'Edição' : 'Novo Lançamento'}</span>
            <h2>Honorário {fee ? fee.code : ''}</h2>
          </div>
          {!fee && <strong className="protocol-number">{generateFeeCode(fees)}</strong>}
        </div>

        <form onSubmit={submit}>
          <div className="field-row">
            <label>Data de Emissão
              <input type="date" value={form.issueDate} onChange={(e) => update('issueDate', e.target.value)} required />
            </label>
            <label>Data de Vencimento
              <input type="date" value={form.dueDate} onChange={(e) => update('dueDate', e.target.value)} required />
            </label>
          </div>

          <label>Cliente
            <div className="inline-action">
              <select value={form.clientId} onChange={(e) => { update('clientId', e.target.value); setFormError(''); }}>
                <option value="">Selecione o cliente</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
              <input placeholder={newClient.type === 'PJ' ? 'CNPJ' : 'CPF'} value={newClient.document} onChange={(event) => setNewClient({ ...newClient, document: event.target.value })} />
              <input placeholder="Telefone/WhatsApp" value={newClient.phone} onChange={(event) => setNewClient({ ...newClient, phone: event.target.value })} />
              <input placeholder="E-mail" value={newClient.email} onChange={(event) => setNewClient({ ...newClient, email: event.target.value })} />
              <button type="button" onClick={createClient}>Cadastrar cliente</button>
            </div>
          )}

          <div className="field-row" style={!fee ? { gridTemplateColumns: '2fr 1fr 1fr' } : undefined}>
            <label>Categoria
              <div className="inline-action">
                <select
                  value={form.category}
                  onChange={(e) => { update('category', e.target.value); setFormError(''); }}
                  required
                >
                  <option value="">Selecione a categoria</option>
                  {feeCategories.map((cat) => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="ghost"
                  title="Adicionar nova categoria"
                  onClick={() => { setQuickCategory(!quickCategory); setCategoryError(''); setNewCategoryName(''); }}
                >
                  <Plus size={16} /> Categoria
                </button>
              </div>
              {quickCategory && (
                <div className="quick-box" style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      placeholder="Nome da nova categoria"
                      value={newCategoryName}
                      onChange={(e) => { setNewCategoryName(e.target.value); setCategoryError(''); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); createCategory(); } }}
                      autoFocus
                      style={{ flex: 1 }}
                    />
                    <button type="button" onClick={createCategory} style={{ whiteSpace: 'nowrap' }}>Adicionar</button>
                  </div>
                  {categoryError && <span style={{ color: 'var(--color-danger, #ef4444)', fontSize: '0.85rem' }}>{categoryError}</span>}
                  {feeCategories.length > 0 && (
                    <div style={{ marginTop: '10px', borderTop: '1px solid var(--color-border, #d7deea)', paddingTop: '10px' }}>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-light, #5d6b82)', margin: '0 0 6px' }}>Categorias cadastradas:</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '160px', overflowY: 'auto' }}>
                        {feeCategories.map((cat) => (
                          <div key={cat.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', background: 'var(--color-bg-alt, #f4f7fc)', borderRadius: '6px' }}>
                            <span style={{ fontSize: '0.9rem' }}>{cat.name}</span>
                            <button
                              type="button"
                              className="danger"
                              style={{ padding: '2px 8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                              title={`Excluir categoria "${cat.name}"`}
                              onClick={() => {
                                if (confirm(`Excluir a categoria "${cat.name}" permanentemente?`)) {
                                  if (onDeleteFeeCategory) onDeleteFeeCategory(cat.id);
                                  if (form.category === cat.name) update('category', '');
                                }
                              }}
                            >
                              <Trash2 size={13} /> Excluir
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </label>
            <label>Valor (R$)
              <input
                type="text"
                value={!form.value ? '' : new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(form.value)}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '');
                  if (!digits) {
                    update('value', 0);
                  } else {
                    update('value', parseFloat(digits) / 100);
                  }
                }}
                placeholder="0,00"
                required
              />
            </label>
            {!fee && (
              <label>Parcelas
                <select value={form.installments || 1} onChange={(e) => update('installments', Number(e.target.value))}>
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}x
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <label>Situação
            <select value={form.status} onChange={(e) => update('status', e.target.value)}>
              <option value="Pendente">Pendente</option>
              <option value="Pago">Pago</option>
            </select>
          </label>

          {formError && <p className="error-message" style={{ color: 'var(--color-danger, #ef4444)', fontWeight: 500 }}>{formError}</p>}

          <div className="modal-actions modal-footer">
            <button className="ghost" type="button" onClick={onClose}>Cancelar</button>
            {fee && (
              <button className="danger" type="button" onClick={() => { if (confirm('Excluir este honorário permanentemente?')) { onDelete(fee.id); onClose(); } }}>Excluir</button>
            )}
            <button className="primary" type="submit"><CheckCircle2 size={18} /> Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
