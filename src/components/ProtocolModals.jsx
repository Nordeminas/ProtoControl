import React, { useState } from 'react';
import { History, CheckCircle2, MessageCircle, Paperclip, Printer } from 'lucide-react';
import { STATUS_OPTIONS } from '../constants';
import { formatDate, formatDateTime, generateId, printProtocol, sendWhatsApp, onlyDigits } from '../utils';

export function ProtocolDetailsModal({ protocol, currentUser, onClose, onSave, onDelete }) {
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
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
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

export function ProtocolSuccess({ protocol, company, onWhatsApp, onClose }) {
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

export function WhatsAppRecipientModal({ protocol, company, clients, employees, onClose }) {
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
