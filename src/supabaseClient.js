import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const SUPABASE_TIMEOUT_MS = 8000;

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Tempo limite excedido ao conectar com o servidor')), ms)),
  ]);
}

export function toCamelCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  const n = {};
  Object.keys(obj).forEach((k) => {
    const nk = k.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    n[nk] = typeof obj[k] === 'object' && obj[k] !== null && k !== 'permissions' && k !== 'attachments' && k !== 'history' ? toCamelCase(obj[k]) : obj[k];
  });
  return n;
}

export function toSnakeCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  const n = {};
  Object.keys(obj).forEach((k) => {
    const nk = k.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    n[nk] = typeof obj[k] === 'object' && obj[k] !== null && k !== 'permissions' && k !== 'attachments' && k !== 'history' ? toSnakeCase(obj[k]) : obj[k];
  });
  return n;
}

export async function saveRow(table, row) {
  if (!supabase) return;
  try {
    const mapped = toSnakeCase(row);
    const { error } = await withTimeout(
      supabase.from(table).upsert(mapped),
      SUPABASE_TIMEOUT_MS
    );
    if (error) throw error;
  } catch (err) {
    console.error(`Erro ao salvar na tabela "${table}":`, err.message);
    throw err;
  }
}

export async function deleteRow(table, id) {
  if (!supabase) return;
  try {
    const { error } = await withTimeout(
      supabase.from(table).delete().eq('id', id),
      SUPABASE_TIMEOUT_MS
    );
    if (error) throw error;
  } catch (err) {
    console.error(`Erro ao excluir na tabela "${table}":`, err.message);
    throw err;
  }
}

export async function loadAllAppData() {
  if (!supabase) return { data: {}, hasAnyData: false };
  try {
    const [protocolsRes, clientsRes, employeesRes, companyRes, feesRes, auditLogsRes, feeCategoriesRes] = await Promise.all([
      supabase.from('protocols').select('*').order('created_at', { ascending: false }),
      supabase.from('clients').select('*').order('name', { ascending: true }),
      supabase.from('employees').select('*').order('name', { ascending: true }),
      supabase.from('company').select('*').eq('id', 'main').maybeSingle(),
      supabase.from('fees').select('*').order('created_at', { ascending: false }),
      supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(1000),
      supabase.from('fee_categories').select('*').order('name', { ascending: true }),
    ]);

    const data = {
      protocols: toCamelCase(protocolsRes.data || []),
      clients: toCamelCase(clientsRes.data || []),
      employees: toCamelCase(employeesRes.data || []),
      company: toCamelCase(companyRes.data || null),
      fees: toCamelCase(feesRes.data || []),
      auditLogs: toCamelCase(auditLogsRes.data || []),
      feeCategories: toCamelCase(feeCategoriesRes.data || []),
    };

    let hasAnyData = data.protocols.length > 0 || data.clients.length > 0 || data.employees.length > 1;
    return { data, hasAnyData };
  } catch (err) {
    console.error('Erro ao carregar dados do Supabase:', err.message);
    return { data: {}, hasAnyData: false };
  }
}
