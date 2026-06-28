import React from 'react';
import { formatDateTime } from '../utils';

export function HistoryView({ logs }) {
  return (
    <section className="card wide-card">
      <div className="section-title">
        <div><span>Consulta</span><h2>Histórico de Modificações do Sistema</h2></div>
      </div>
      <div className="history-logs-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {logs.map((log) => (
          <article key={log.id} style={{ display: 'flex', gap: '1rem', padding: '1rem', background: 'var(--color-bg, #ffffff)', border: '1px solid var(--color-border, #d7deea)', borderRadius: '12px' }}>
            <div style={{ flex: '0 0 160px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <strong style={{ fontSize: '0.85rem', color: 'var(--color-primary, #0f76bc)' }}>{formatDateTime(log.timestamp)}</strong>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-light, #5d6b82)' }}>{log.userName}</span>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <strong style={{ fontSize: '0.95rem' }}>{log.action} - {log.entityType}</strong>
              <span style={{ fontSize: '0.9rem', color: 'var(--color-text-main, #172033)' }}>{log.entityName}</span>
              {log.details && <span style={{ fontSize: '0.85rem', color: 'var(--color-text-light, #5d6b82)' }}>{log.details}</span>}
            </div>
          </article>
        ))}
        {!logs.length && <p className="empty">Nenhum registro de auditoria encontrado.</p>}
      </div>
    </section>
  );
}
