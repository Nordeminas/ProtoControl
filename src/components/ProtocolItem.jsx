import React from 'react';
import { Clock, Printer, MessageCircle } from 'lucide-react';
import { isOverdue, isDueSoon, formatDate, describeDue, printProtocol } from '../utils';

export function ProtocolItem({ protocol, company, onWhatsApp, onDetails }) {
  return (
    <article className={`protocol-item ${isOverdue(protocol) ? 'overdue' : isDueSoon(protocol) ? 'due-soon' : ''}`}>
      <div>
        <strong>{protocol.number}</strong>
        <span>{protocol.clientName}</span>
      </div>
      <div>
        <span>{formatDate(protocol.date)}</span>
        <small><Clock size={13} /> {describeDue(protocol)}</small>
        <em>{protocol.status}</em>
      </div>
      <div className="actions">
        <button onClick={onDetails}>
          <Clock size={16} /> Detalhes
        </button>
        <button onClick={() => printProtocol(protocol, company)}>
          <Printer size={16} /> Imprimir
        </button>
        <button onClick={onWhatsApp}>
          <MessageCircle size={16} /> WhatsApp
        </button>
      </div>
    </article>
  );
}
