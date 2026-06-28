import { useEffect, useMemo, useState } from 'react';
import { STORAGE_KEYS, emptyCompany, emptyFilters } from '../constants';
import { loadStorage, saveStorage, saveDataLocal, ensureAdminEmployee, generateId, isOverdue, isDueSoon } from '../utils';
import { loadAllAppData, saveRow, deleteRow } from '../supabaseClient';

export function useAppState() {
  const [activeTab, setActiveTab] = useState('protocols');
  const [protocols, setProtocols] = useState(() => loadStorage(STORAGE_KEYS.protocols, []));
  const [clients, setClients] = useState(() => loadStorage(STORAGE_KEYS.clients, []));
  const [employees, setEmployees] = useState(() => {
    const stored = ensureAdminEmployee(loadStorage(STORAGE_KEYS.employees, []));
    saveStorage(STORAGE_KEYS.employees, stored);
    return stored;
  });
  const [company, setCompany] = useState(() => loadStorage(STORAGE_KEYS.company, emptyCompany));
  const [currentUser, setCurrentUser] = useState(() => loadStorage(STORAGE_KEYS.session, null));
  const [auditLogs, setAuditLogs] = useState(() => loadStorage(STORAGE_KEYS.auditLogs, []));
  const [fees, setFees] = useState(() => loadStorage(STORAGE_KEYS.fees, []));
  const [feeCategories, setFeeCategories] = useState(() => loadStorage(STORAGE_KEYS.feeCategories, []));
  const [createdProtocol, setCreatedProtocol] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(emptyFilters);

  const authenticatedUser = employees.find((employee) => employee.id === currentUser?.id && employee.role === currentUser?.role) || null;
  const isAdmin = authenticatedUser?.role === 'admin';
  const canAccessHistory = isAdmin || authenticatedUser?.permissions?.canAccessHistory;
  const canAccessFees = isAdmin || authenticatedUser?.permissions?.canAccessFees;

  useEffect(() => {
    let active = true;

    async function loadRemoteData() {
      const { data: remote } = await loadAllAppData();
      if (!active) return;
      if (!remote) return;

      const hasData = (value) => value !== null && value !== undefined && (!Array.isArray(value) || value.length > 0);
      if (hasData(remote.protocols)) {
        setProtocols(remote.protocols);
        saveStorage(STORAGE_KEYS.protocols, remote.protocols);
      }
      if (hasData(remote.clients)) {
        setClients(remote.clients);
        saveStorage(STORAGE_KEYS.clients, remote.clients);
      }
      if (hasData(remote.employees)) {
        const nextEmployees = ensureAdminEmployee(remote.employees);
        setEmployees(nextEmployees);
        saveStorage(STORAGE_KEYS.employees, nextEmployees);
      }
      if (hasData(remote.company)) {
        setCompany(remote.company);
        saveStorage(STORAGE_KEYS.company, remote.company);
      }
      if (hasData(remote.fees)) {
        setFees(remote.fees);
        saveStorage(STORAGE_KEYS.fees, remote.fees);
      }
      if (hasData(remote.feeCategories)) {
        setFeeCategories(remote.feeCategories);
        saveStorage(STORAGE_KEYS.feeCategories, remote.feeCategories);
      }
      if (hasData(remote.auditLogs)) {
        setAuditLogs(remote.auditLogs);
        saveStorage(STORAGE_KEYS.auditLogs, remote.auditLogs);
      }
    }

    loadRemoteData();

    return () => {
      active = false;
    };
  }, []);

  const filteredProtocols = useMemo(() => {
    const term = search.toLowerCase();
    return protocols.filter((protocol) => {
      const matchesSearch = [protocol.number, protocol.clientName, protocol.employeeName, protocol.status, protocol.deliveredTo, protocol.notes].some((item) => item?.toLowerCase().includes(term));
      const matchesClient = !filters.clientId || protocol.clientId === filters.clientId;
      const matchesEmployee = !filters.employeeId || protocol.employeeId === filters.employeeId;
      const matchesStatus = !filters.status || protocol.status === filters.status;
      const matchesStart = !filters.startDate || protocol.date >= filters.startDate;
      const matchesEnd = !filters.endDate || protocol.date <= filters.endDate;
      const matchesDue = !filters.due || (filters.due === 'overdue' ? isOverdue(protocol) : filters.due === 'soon' ? isDueSoon(protocol) : !protocol.dueDate);
      return matchesSearch && matchesClient && matchesEmployee && matchesStatus && matchesStart && matchesEnd && matchesDue;
    });
  }, [protocols, search, filters]);

  const persistProtocol = (protocol) => {
    setProtocols((prev) => {
      const exists = prev.some((p) => p.id === protocol.id);
      const next = exists ? prev.map((p) => p.id === protocol.id ? protocol : p) : [protocol, ...prev];
      saveDataLocal('protocols', next);
      return next;
    });
    saveRow('protocols', protocol).catch((err) => console.error('Erro ao salvar protocolo:', err));
  };

  const removeProtocol = (id) => {
    setProtocols((prev) => {
      const next = prev.filter((p) => p.id !== id);
      saveDataLocal('protocols', next);
      return next;
    });
    deleteRow('protocols', id).catch((err) => console.error('Erro ao excluir protocolo:', err));
  };

  const persistClient = (client) => {
    setClients((prev) => {
      const exists = prev.some((c) => c.id === client.id);
      const next = exists ? prev.map((c) => c.id === client.id ? client : c) : [client, ...prev];
      saveDataLocal('clients', next);
      return next;
    });
    saveRow('clients', client).catch((err) => console.error('Erro ao salvar cliente:', err));
  };

  const removeClient = (id) => {
    setClients((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveDataLocal('clients', next);
      return next;
    });
    deleteRow('clients', id).catch((err) => console.error('Erro ao excluir cliente:', err));
  };

  const persistEmployee = (employee) => {
    setEmployees((prev) => {
      const exists = prev.some((e) => e.id === employee.id);
      const raw = exists ? prev.map((e) => e.id === employee.id ? employee : e) : [employee, ...prev];
      const next = ensureAdminEmployee(raw);
      saveDataLocal('employees', next);
      return next;
    });
    saveRow('employees', employee).catch((err) => console.error('Erro ao salvar funcionário:', err));
  };

  const removeEmployee = (id) => {
    setEmployees((prev) => {
      const next = ensureAdminEmployee(prev.filter((e) => e.id !== id));
      saveDataLocal('employees', next);
      return next;
    });
    deleteRow('employees', id).catch((err) => console.error('Erro ao excluir funcionário:', err));
  };

  const persistCompany = (value) => {
    setCompany(value);
    saveDataLocal('company', value);
    saveRow('company', { ...value, id: 'main' }).catch((err) => console.error('Erro ao salvar empresa:', err));
  };

  const persistFee = (fee) => {
    setFees((prev) => {
      const exists = prev.some((f) => f.id === fee.id);
      const next = exists ? prev.map((f) => f.id === fee.id ? fee : f) : [fee, ...prev];
      saveDataLocal('fees', next);
      return next;
    });
    saveRow('fees', fee).catch((err) => console.error('Erro ao salvar honorário:', err));
  };

  const removeFee = (id) => {
    setFees((prev) => {
      const next = prev.filter((f) => f.id !== id);
      saveDataLocal('fees', next);
      return next;
    });
    deleteRow('fees', id).catch((err) => console.error('Erro ao excluir honorário:', err));
  };

  const persistFeeCategory = (category) => {
    setFeeCategories((prev) => {
      const exists = prev.some((c) => c.id === category.id);
      const next = exists ? prev : [...prev, category].sort((a, b) => a.name.localeCompare(b.name));
      saveDataLocal('feeCategories', next);
      return next;
    });
    saveRow('fee_categories', category).catch((err) => console.error('Erro ao salvar categoria:', err));
  };

  const removeFeeCategory = (id) => {
    setFeeCategories((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveDataLocal('feeCategories', next);
      return next;
    });
    deleteRow('fee_categories', id).catch((err) => console.error('Erro ao excluir categoria:', err));
  };

  const restoreBackup = (data) => {
    const nextEmployees = ensureAdminEmployee(data.employees || []);
    setProtocols(data.protocols || []);
    setClients(data.clients || []);
    setEmployees(nextEmployees);
    setCompany(data.company || emptyCompany);
    setFees(data.fees || []);
    setFeeCategories(data.feeCategories || []);
    saveDataLocal('protocols', data.protocols || []);
    saveDataLocal('clients', data.clients || []);
    saveDataLocal('employees', nextEmployees);
    saveDataLocal('company', data.company || emptyCompany);
    saveDataLocal('fees', data.fees || []);
    saveDataLocal('feeCategories', data.feeCategories || []);

    (data.protocols || []).forEach((p) => saveRow('protocols', p).catch(console.error));
    (data.clients || []).forEach((c) => saveRow('clients', c).catch(console.error));
    nextEmployees.forEach((e) => saveRow('employees', e).catch(console.error));
    if (data.company) saveRow('company', { ...data.company, id: 'main' }).catch(console.error);
    (data.fees || []).forEach((f) => saveRow('fees', f).catch(console.error));
    (data.feeCategories || []).forEach((c) => saveRow('fee_categories', c).catch(console.error));
  };

  const addAuditLog = (action, entityType, entityId, entityName, details = '') => {
    const entry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      userId: authenticatedUser.id,
      userName: authenticatedUser.name,
      action,
      entityType,
      entityId,
      entityName,
      details,
    };
    setAuditLogs((prev) => {
      const next = [entry, ...prev].slice(0, 1000);
      saveDataLocal('auditLogs', next);
      return next;
    });
    saveRow('audit_logs', entry).catch((err) => console.error('Erro ao salvar log de auditoria:', err));
  };

  return {
    activeTab,
    setActiveTab,
    protocols,
    setProtocols,
    clients,
    setClients,
    employees,
    setEmployees,
    company,
    setCompany,
    currentUser,
    setCurrentUser,
    auditLogs,
    setAuditLogs,
    fees,
    setFees,
    feeCategories,
    setFeeCategories,
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
  };
}
