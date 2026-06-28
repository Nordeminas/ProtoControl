import React, { useState, useMemo } from 'react';
import { Search, Plus, AlertTriangle, X } from 'lucide-react';
import { todayInput, formatDate, getFeeStatus, generateFeeCode, addMonths, generateId, titleCase } from '../utils';
import { FeeFormModal } from './FeeFormModal';

export function FeesView({
  fees,
  clients,
  feeCategories = [],
  currentUser,
  onSaveFee,
  onUpdateFee,
  onDeleteFee,
  onSaveClient,
  onSaveFeeCategory,
  onDeleteFeeCategory
}) {
  const [search, setSearch] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateType, setFilterDateType] = useState('dueDate'); // 'dueDate' | 'issueDate'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportType, setReportType] = useState('mensal'); // 'mensal' | 'anual'
  const [reportYear, setReportYear] = useState(() => String(new Date().getFullYear()));
  const [reportMonth, setReportMonth] = useState(() => String(new Date().getMonth() + 1).padStart(2, '0'));
  
  const [showModal, setShowModal] = useState(false);
  const [editingFee, setEditingFee] = useState(null);

  const openAdd = () => {
    setEditingFee(null);
    setShowModal(true);
  };

  const openEdit = (fee) => {
    setEditingFee(fee);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingFee(null);
  };

  // Filter fees list
  const filteredFees = useMemo(() => {
    const term = search.toLowerCase();
    return fees
      .filter((fee) => {
        const status = getFeeStatus(fee);
        const matchesSearch = [fee.code, fee.clientName, fee.category, status].some((item) => item?.toLowerCase().includes(term));
        const matchesClient = !filterClient || fee.clientId === filterClient;
        const matchesStatus = !filterStatus || status === filterStatus;

        const dateVal = filterDateType === 'dueDate' ? fee.dueDate : fee.issueDate;
        const matchesStart = !startDate || (dateVal && dateVal >= startDate);
        const matchesEnd = !endDate || (dateVal && dateVal <= endDate);

        return matchesSearch && matchesClient && matchesStatus && matchesStart && matchesEnd;
      })
      .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
  }, [fees, search, filterClient, filterStatus, filterDateType, startDate, endDate]);

  // Overdue fees for reminder banner
  const overdueFees = useMemo(() =>
    fees
      .filter((fee) => getFeeStatus(fee) === 'Atrasado')
      .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')),
    [fees]
  );
  const [dismissedReminder, setDismissedReminder] = useState(false);
  const showReminder = overdueFees.length > 0 && !dismissedReminder;

  const formatBRL = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Statistics calculation
  const stats = useMemo(() => {
    let paid = 0;
    let pending = 0;
    let overdue = 0;

    fees.forEach((fee) => {
      const status = getFeeStatus(fee);
      if (status === 'Pago') {
        paid += fee.value;
      } else if (status === 'Atrasado') {
        overdue += fee.value;
      } else {
        pending += fee.value;
      }
    });

    return { paid, pending, overdue, total: paid + pending + overdue };
  }, [fees]);

  // Report calculations based on filter year/month
  const reportData = useMemo(() => {
    let filteredForReport = fees;
    
    if (reportType === 'mensal') {
      const prefix = `${reportYear}-${reportMonth}`;
      filteredForReport = fees.filter((fee) => fee.issueDate && fee.issueDate.startsWith(prefix));
    } else {
      filteredForReport = fees.filter((fee) => fee.issueDate && fee.issueDate.startsWith(reportYear));
    }

    let paid = 0;
    let pending = 0;
    let overdue = 0;
    const categoryTotals = {};
    const monthlyTotals = {}; // only used in annual view

    filteredForReport.forEach((fee) => {
      const status = getFeeStatus(fee);
      const val = fee.value || 0;
      
      if (status === 'Pago') paid += val;
      else if (status === 'Atrasado') overdue += val;
      else pending += val;

      // Category breakdown
      const cat = fee.category || 'Outros';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + val;

      // Monthly breakdown for annual report
      if (reportType === 'anual' && fee.issueDate) {
        const monthNum = fee.issueDate.split('-')[1]; // e.g. "06"
        monthlyTotals[monthNum] = (monthlyTotals[monthNum] || 0) + val;
      }
    });

    const total = paid + pending + overdue;

    return {
      paid,
      pending,
      overdue,
      total,
      categories: Object.entries(categoryTotals).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      months: Object.entries(monthlyTotals).map(([num, value]) => {
        const date = new Date(Number(reportYear), Number(num) - 1, 1);
        const name = date.toLocaleDateString('pt-BR', { month: 'long' });
        return { name: titleCase(name), value };
      }).sort((a, b) => a.name.localeCompare(b.name))
    };
  }, [fees, reportType, reportYear, reportMonth]);

  // formatBRL is defined above alongside overdueFees

  const handleSave = (feeData) => {
    if (editingFee) {
      const { installments, ...cleanFeeData } = feeData;
      onUpdateFee({ ...editingFee, ...cleanFeeData });
    } else {
      const installments = feeData.installments || 1;
      const { installments: _, ...cleanFeeData } = feeData;
      if (installments > 1) {
        const year = new Date().getFullYear();
        const currentYearCount = fees.filter((fee) => String(fee.code).includes(`/${year}`)).length;
        const totalValue = Number(cleanFeeData.value);
        const baseVal = Math.floor((totalValue / installments) * 100) / 100;
        const diff = Math.round((totalValue - baseVal * installments) * 100) / 100;

        for (let i = 0; i < installments; i++) {
          const val = (i === 0) ? (baseVal + diff) : baseVal;
          const code = `H-${String(currentYearCount + 1 + i).padStart(5, '0')}/${year} (${i + 1}/${installments})`;
          const dueDate = addMonths(cleanFeeData.dueDate, i);
          
          onSaveFee({
            ...cleanFeeData,
            value: val,
            code: code,
            dueDate: dueDate,
            id: generateId(),
          });
        }
      } else {
        onSaveFee({
          ...cleanFeeData,
          id: generateId(),
          code: generateFeeCode(fees),
        });
      }
    }
    closeModal();
  };

  const years = useMemo(() => {
    const list = new Set([String(new Date().getFullYear())]);
    fees.forEach((fee) => {
      if (fee.issueDate) {
        list.add(fee.issueDate.split('-')[0]);
      }
    });
    return Array.from(list).sort().reverse();
  }, [fees]);

  return (
    <div className="grid">

      {/* Overdue Reminder Banner */}
      {showReminder && (
        <div className="overdue-reminder-banner">
          <div className="overdue-reminder-header">
            <div className="overdue-reminder-title">
              <AlertTriangle size={20} className="overdue-reminder-icon" />
              <strong>{overdueFees.length} parcela{overdueFees.length > 1 ? 's' : ''} vencida{overdueFees.length > 1 ? 's' : ''}</strong>
              <span>— Total em atraso: <strong>{formatBRL(overdueFees.reduce((acc, f) => acc + (f.value || 0), 0))}</strong></span>
            </div>
            <button className="overdue-reminder-dismiss" onClick={() => setDismissedReminder(true)} title="Fechar lembrete">
              <X size={16} />
            </button>
          </div>
          <div className="overdue-reminder-list">
            {overdueFees.map((fee) => (
              <button
                key={fee.id}
                className="overdue-reminder-item"
                onClick={() => openEdit(fee)}
                title="Clique para editar"
              >
                <span className="overdue-reminder-code">{fee.code}</span>
                <span className="overdue-reminder-client">{fee.clientName}</span>
                <span className="overdue-reminder-due">Venceu em {formatDate(fee.dueDate)}</span>
                <strong className="overdue-reminder-value">{formatBRL(fee.value)}</strong>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="stats-grid">
        <article className="stat-card paid">
          <span>Recebido / Pago</span>
          <h3>{formatBRL(stats.paid)}</h3>
        </article>
        <article className="stat-card pending">
          <span>Pendente</span>
          <h3>{formatBRL(stats.pending)}</h3>
        </article>
        <article className="stat-card overdue">
          <span>Atrasado</span>
          <h3>{formatBRL(stats.overdue)}</h3>
        </article>
      </div>

      <section className="card wide-card">
        <div className="section-title">
          <div><span>Consulta</span><h2>Honorários Lançados</h2></div>
          <button className="primary" type="button" onClick={openAdd}><Plus size={16} /> Adicionar Honorário</button>
        </div>
        <div className="compact-search-row">
          <div className="search-box">
            <Search size={18} />
            <input placeholder="Buscar por código, cliente, categoria ou situação..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="filters-grid filters-grid--labeled">
          <label className="filter-label">
            <span>Cliente</span>
            <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)}>
              <option value="">Todos os clientes</option>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
          </label>
          <label className="filter-label">
            <span>Situação</span>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">Todas as situações</option>
              <option value="Pago">Pago</option>
              <option value="Pendente">Pendente</option>
              <option value="Atrasado">Atrasado</option>
            </select>
          </label>
          <label className="filter-label">
            <span>Filtrar data por</span>
            <select value={filterDateType} onChange={(e) => setFilterDateType(e.target.value)}>
              <option value="dueDate">Vencimento</option>
              <option value="issueDate">Emissão</option>
            </select>
          </label>
          <label className="filter-label">
            <span>Data inicial</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label className="filter-label">
            <span>Data final</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
          <label className="filter-label filter-label--action">
            <span>&nbsp;</span>
            <button className="ghost" type="button" onClick={() => { setFilterClient(''); setFilterStatus(''); setSearch(''); setStartDate(''); setEndDate(''); setFilterDateType('dueDate'); }}>Limpar Filtros</button>
          </label>
        </div>

        <div className="fee-list-header">
          <div>Código</div>
          <div>Cliente</div>
          <div>Categoria</div>
          <div>Vencimento</div>
          <div>Valor</div>
          <div>Situação</div>
        </div>

        <div className="protocol-list" style={{ maxHeight: '420px' }}>
          {filteredFees.map((fee) => {
            const status = getFeeStatus(fee);
            return (
              <div key={fee.id} className="fee-item-row" onClick={() => openEdit(fee)} style={{ cursor: 'pointer' }}>
                <strong>{fee.code}</strong>
                <span>{fee.clientName}</span>
                <span>{fee.category}</span>
                <span>{formatDate(fee.dueDate)}</span>
                <strong>{formatBRL(fee.value)}</strong>
                <div>
                  <span className={`fee-status-badge ${status.toLowerCase()}`}>{status}</span>
                </div>
              </div>
            );
          })}
          {!filteredFees.length && <p className="empty">Nenhum honorário encontrado.</p>}
        </div>
      </section>

      {/* Reports Section */}
      <section className="card wide-card report-section">
        <div className="report-controls">
          <div>
            <span>Demonstrativo Financeiro</span>
            <h2 style={{ margin: '4px 0 0' }}>Relatórios Financeiros</h2>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div className="report-toggle-group">
              <button className={reportType === 'mensal' ? 'active' : ''} onClick={() => setReportType('mensal')}>Mensal</button>
              <button className={reportType === 'anual' ? 'active' : ''} onClick={() => setReportType('anual')}>Anual</button>
            </div>
            
            <select style={{ width: 'auto' }} value={reportYear} onChange={(e) => setReportYear(e.target.value)}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>

            {reportType === 'mensal' && (
              <select style={{ width: 'auto' }} value={reportMonth} onChange={(e) => setReportMonth(e.target.value)}>
                <option value="01">Janeiro</option>
                <option value="02">Fevereiro</option>
                <option value="03">Março</option>
                <option value="04">Abril</option>
                <option value="05">Maio</option>
                <option value="06">Junho</option>
                <option value="07">Julho</option>
                <option value="08">Agosto</option>
                <option value="09">Setembro</option>
                <option value="10">Outubro</option>
                <option value="11">Novembro</option>
                <option value="12">Dezembro</option>
              </select>
            )}
          </div>
        </div>

        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          <article className="stat-card paid" style={{ boxShadow: 'none' }}>
            <span>Faturado Recebido</span>
            <h3>{formatBRL(reportData.paid)}</h3>
          </article>
          <article className="stat-card pending" style={{ boxShadow: 'none' }}>
            <span>Faturado Pendente</span>
            <h3>{formatBRL(reportData.pending)}</h3>
          </article>
          <article className="stat-card overdue" style={{ boxShadow: 'none' }}>
            <span>Faturado Atrasado</span>
            <h3>{formatBRL(reportData.overdue)}</h3>
          </article>
        </div>

        <div className="report-charts-grid">
          <div className="chart-card">
            <h4>Distribuição por Categoria</h4>
            <div className="chart-list">
              {reportData.categories.map((cat) => {
                const percentage = reportData.total > 0 ? (cat.value / reportData.total) * 100 : 0;
                return (
                  <div key={cat.name} className="chart-row">
                    <div className="chart-row-header">
                      <span>{cat.name}</span>
                      <strong>{formatBRL(cat.value)} ({percentage.toFixed(0)}%)</strong>
                    </div>
                    <div className="chart-bar-bg">
                      <div className="chart-bar-fill" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })}
              {!reportData.categories.length && <p className="empty">Sem lançamentos no período.</p>}
            </div>
          </div>

          {reportType === 'anual' && (
            <div className="chart-card">
              <h4>Distribuição Mensal</h4>
              <div className="chart-list">
                {reportData.months.map((m) => {
                  const percentage = reportData.total > 0 ? (m.value / reportData.total) * 100 : 0;
                  return (
                    <div key={m.name} className="chart-row">
                      <div className="chart-row-header">
                        <span>{m.name}</span>
                        <strong>{formatBRL(m.value)} ({percentage.toFixed(0)}%)</strong>
                      </div>
                      <div className="chart-bar-bg">
                        <div className="chart-bar-fill" style={{ width: `${percentage}%`, background: 'linear-gradient(90deg, #10b981, #34d399)' }}></div>
                      </div>
                    </div>
                  );
                })}
                {!reportData.months.length && <p className="empty">Sem lançamentos no período.</p>}
              </div>
            </div>
          )}
        </div>
      </section>

      {showModal && (
        <FeeFormModal
          fee={editingFee}
          fees={fees}
          clients={clients}
          feeCategories={feeCategories}
          currentUser={currentUser}
          onClose={closeModal}
          onSave={handleSave}
          onDelete={onDeleteFee}
          onSaveClient={onSaveClient}
          onSaveFeeCategory={onSaveFeeCategory}
          onDeleteFeeCategory={onDeleteFeeCategory}
        />
      )}
    </div>
  );
}
