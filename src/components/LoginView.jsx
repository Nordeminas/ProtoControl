import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { normalizeUsername } from '../utils';

export function LoginView({ employees, onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = (event) => {
    event.preventDefault();
    const user = employees.find((employee) => normalizeUsername(employee.username || employee.name) === normalizeUsername(username) && employee.password === password);
    if (!user) {
      setError('Usuário ou senha inválidos.');
      return;
    }
    onLogin(user);
  };

  return (
    <div className="login-page">
      <section className="login-card">
        <div className="brand login-brand">
          <div className="brand-icon"><Lock size={26} /></div>
          <div>
            <strong>ProtoControl</strong>
            <span>Acesse para continuar</span>
          </div>
        </div>
        <form onSubmit={submit}>
          <label>Usuário<input value={username} onChange={(event) => setUsername(event.target.value)} autoFocus /></label>
          <label>Senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error && <p className="error-message">{error}</p>}
          <button className="primary" type="submit"><Lock size={18} /> Entrar</button>
        </form>
      </section>
    </div>
  );
}

export function AccessDenied({ title, message }) {
  return (
    <section className="card wide-card">
      <div className="section-title"><div><span>Acesso restrito</span><h2>{title}</h2></div></div>
      <p className="empty">{message}</p>
    </section>
  );
}
