import React, { useEffect, useRef, useState } from 'react';
import { Building2, CheckCircle2, Download, Upload } from 'lucide-react';
import { emptyCompany } from '../constants';
import { todayInput, downloadFile } from '../utils';

export function SettingsView({ company, protocols, clients, employees, fees = [], feeCategories = [], onSave, onRestoreBackup }) {
  const [form, setForm] = useState(company);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setForm(company);
  }, [company]);

  const handleLogo = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((current) => ({ ...current, logo: reader.result }));
    reader.readAsDataURL(file);
  };

  const submit = (event) => {
    event.preventDefault();
    onSave(form);
  };

  const exportBackup = () => {
    downloadFile(`backup-protocontrol-${todayInput()}.json`, JSON.stringify({ protocols, clients, employees, fees, feeCategories, company: form }, null, 2), 'application/json;charset=utf-8');
  };

  const importBackup = (file) => {
    if (!file) return;
    if (!confirm('A importação substituirá todos os dados atuais. Deseja continuar?')) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (
          !data ||
          typeof data !== 'object' ||
          !Array.isArray(data.protocols) ||
          !Array.isArray(data.clients) ||
          !Array.isArray(data.employees) ||
          typeof data.company !== 'object'
        ) {
          alert('O arquivo de backup está incompleto ou inválido.');
          return;
        }
        data.fees = data.fees || [];
        data.feeCategories = data.feeCategories || [];
        onRestoreBackup(data);
      } catch {
        alert('Não foi possível importar o backup. Verifique se o arquivo JSON é válido.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <section className="card form-card wide-card">
      <div className="section-title"><div><span>Dados para impressão</span><h2>Informações da empresa</h2></div></div>
      <form onSubmit={submit}>
        <div className="logo-preview">{form.logo ? <img src={form.logo} alt="Logomarca" /> : <Building2 size={54} />}</div>
        <label>Logomarca<input type="file" accept="image/*" onChange={(event) => handleLogo(event.target.files?.[0])} /></label>
        <div className="field-row">
          <label>Nome fantasia<input value={form.tradeName} onChange={(event) => setForm({ ...form, tradeName: event.target.value })} /></label>
          <label>Razão social<input value={form.legalName} onChange={(event) => setForm({ ...form, legalName: event.target.value })} /></label>
        </div>
        <div className="field-row">
          <label>CNPJ<input value={form.cnpj} onChange={(event) => setForm({ ...form, cnpj: event.target.value })} /></label>
          <label>Telefone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
        </div>
        <label>Endereço<input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
        <button className="primary" type="submit"><CheckCircle2 size={18} /> Salvar configurações</button>
      </form>
      <div className="backup-box">
        <h3>Backup e restauração</h3>
        <p>Exporte uma cópia dos protocolos, clientes, funcionários e configurações ou restaure um arquivo salvo anteriormente.</p>
        <div className="actions">
          <button className="primary" type="button" onClick={exportBackup}><Download size={18} /> Exportar backup</button>
          <button className="ghost" type="button" onClick={() => fileInputRef.current?.click()}><Upload size={18} /> Importar backup</button>
        </div>
        <input ref={fileInputRef} className="hidden-input" type="file" accept="application/json" onChange={(event) => importBackup(event.target.files?.[0])} />
      </div>
    </section>
  );
}
