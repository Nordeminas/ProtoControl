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

export async function loadAppData(key, fallback) {
  if (!supabase) return fallback;
  try {
    const { data, error } = await withTimeout(
      supabase.from('app_data').select('value').eq('key', key).maybeSingle(),
      SUPABASE_TIMEOUT_MS
    );
    if (error) throw error;
    return data?.value ?? fallback;
  } catch (err) {
    console.error(`Erro ao carregar "${key}" do Supabase:`, err.message);
    return fallback;
  }
}

export async function saveAppData(key, value) {
  if (!supabase) return;
  try {
    const { error } = await withTimeout(
      supabase.from('app_data').upsert({ key, value, updated_at: new Date().toISOString() }),
      SUPABASE_TIMEOUT_MS
    );
    if (error) throw error;
  } catch (err) {
    console.error(`Erro ao salvar "${key}" no Supabase:`, err.message);
  }
}

export async function loadAllAppData() {
  if (!supabase) return { data: {}, hasAnyData: false };
  const keys = ['protocols', 'clients', 'employees', 'company'];
  const results = await Promise.allSettled(
    keys.map((key) => loadAppData(key, null))
  );
  const data = {};
  let hasAnyData = false;
  keys.forEach((key, i) => {
    const result = results[i];
    if (result.status === 'fulfilled' && result.value !== null && result.value !== undefined) {
      data[key] = result.value;
      if (Array.isArray(result.value) ? result.value.length > 0 : true) {
        hasAnyData = true;
      }
    }
  });
  return { data, hasAnyData };
}
