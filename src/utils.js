import { STORAGE_KEYS, ADMIN_USER, emptyClient } from './constants';

export function loadStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function saveStorage(key, value) {
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

export function saveDataLocal(key, value) {
  saveStorage(STORAGE_KEYS[key], value);
}

export function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(date) {
  if (!date) return '';
  return new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR');
}

export function addMonths(dateStr, months) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const targetDate = new Date(year, month - 1 + months, 1);
  const maxDays = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
  const targetDay = Math.min(day, maxDays);
  const finalDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDay);
  return finalDate.toISOString().slice(0, 10);
}

export function formatDateTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('pt-BR');
}

export function isOverdue(protocol) {
  return protocol.dueDate && !['Concluído', 'Cancelado'].includes(protocol.status) && protocol.dueDate < todayInput();
}

export function isDueSoon(protocol) {
  if (!protocol.dueDate || isOverdue(protocol) || ['Concluído', 'Cancelado'].includes(protocol.status)) return false;
  const today = new Date(`${todayInput()}T00:00:00`);
  const due = new Date(`${protocol.dueDate}T00:00:00`);
  const diff = Math.ceil((due - today) / 86400000);
  return diff <= 3;
}

export function describeDue(protocol) {
  if (!protocol.dueDate) return 'Sem prazo';
  if (isOverdue(protocol)) return `Vencido em ${formatDate(protocol.dueDate)}`;
  if (isDueSoon(protocol)) return `Vence em breve: ${formatDate(protocol.dueDate)}`;
  return `Prazo: ${formatDate(protocol.dueDate)}`;
}

export function downloadFile(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function csvValue(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export function titleCase(value) {
  return value
    .toLowerCase()
    .replace(/(^|\s|\-|')([a-zà-ú])/g, (match) => match.toUpperCase());
}

export function resetClientForType(type) {
  return { ...emptyClient, type };
}

export function onlyDigits(value) {
  return value.replace(/\D/g, '');
}

export function generateId() {
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

export function generateProtocolNumber(protocols) {
  const year = new Date().getFullYear();
  const count = protocols.filter((protocol) => String(protocol.number).includes(`/${year}`)).length + 1;
  return `${String(count).padStart(5, '0')}/${year}`;
}

export function normalizeUsername(value) {
  return value.trim().toLowerCase();
}

export function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function ensureAdminEmployee(employees) {
  const hasAdmin = employees.some((employee) => employee.id === ADMIN_USER.id || employee.role === 'admin');
  return hasAdmin ? employees : [ADMIN_USER, ...employees];
}

export function printProtocol(protocol, company) {
  const html = buildProtocolHtml(protocol, company);
  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

export function sendWhatsApp(protocol, company, recipientPhone = '') {
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

export function buildProtocolHtml(protocol, company) {
  const e = escapeHtml;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Protocolo ${e(protocol.number)}</title><style>body{font-family:Arial,sans-serif;color:#172033;margin:40px}.sheet{border:1px solid #d7deea;border-radius:16px;padding:32px}.header{display:flex;gap:20px;align-items:center;border-bottom:2px solid #0f76bc;padding-bottom:20px;margin-bottom:26px}.logo{width:110px;height:80px;object-fit:contain}.placeholder{width:110px;height:80px;border:1px dashed #9aa8bc;display:flex;align-items:center;justify-content:center;color:#7b8798}.company h1{margin:0;font-size:24px}.company p{margin:4px 0;color:#5d6b82}.title{text-align:center;background:#eef7ff;border-radius:12px;padding:14px;font-size:24px;letter-spacing:2px}.grid{display:grid;grid-template-columns:190px 1fr;border:1px solid #d7deea;margin-top:20px}.label{background:#0f76bc;color:white;font-weight:bold;text-align:right;padding:13px;border-bottom:1px solid #d7deea}.value{padding:13px;border-bottom:1px solid #d7deea}.notes{min-height:90px}.signature{display:flex;justify-content:space-between;margin-top:60px;gap:40px}.signature div{flex:1;text-align:center;border-top:1px solid #172033;padding-top:10px}@media print{button{display:none}body{margin:20px}}</style></head><body><div class="sheet"><div class="header">${company.logo ? `<img class="logo" src="${company.logo}">` : '<div class="placeholder">Logo</div>'}<div class="company"><h1>${e(company.tradeName) || 'Empresa'}</h1><p>${e(company.legalName)}</p><p>CNPJ: ${e(company.cnpj) || '-'} · Tel.: ${e(company.phone) || '-'}</p><p>${e(company.address)}</p></div></div><div class="title">PROTOCOLO Nº ${e(protocol.number)}</div><div class="grid"><div class="label">CRIADO POR</div><div class="value">${e(protocol.employeeName)}</div><div class="label">DATA</div><div class="value">${e(formatDate(protocol.date))}</div><div class="label">DESTINATÁRIO</div><div class="value">${e(protocol.clientName)}</div><div class="label">SITUAÇÃO</div><div class="value">${e(protocol.status)}</div><div class="label">ENTREGUE</div><div class="value">${e(protocol.deliveredTo) || '-'}</div><div class="label">OBSERVAÇÕES</div><div class="value notes">${e(protocol.notes) || '-'}</div></div><div class="signature"><div>Assinatura do responsável</div><div>Assinatura do destinatário</div></div></div></body></html>`;
}

export function generateFeeCode(feesList) {
  const year = new Date().getFullYear();
  const count = feesList.filter((fee) => String(fee.code).includes(`/${year}`)).length + 1;
  return `H-${String(count).padStart(5, '0')}/${year}`;
}

export function isFeeOverdue(fee) {
  return fee.dueDate && fee.status === 'Pendente' && fee.dueDate < todayInput();
}

export function getFeeStatus(fee) {
  if (fee.status === 'Pago') return 'Pago';
  if (isFeeOverdue(fee)) return 'Atrasado';
  return 'Pendente';
}
