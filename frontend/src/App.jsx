import React, { useState, useEffect } from 'react';
import LoginView from './components/LoginView';
import DashboardView from './components/DashboardView';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const savedUser = localStorage.getItem('console_n2_user');
    const token = localStorage.getItem('console_n2_token');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('console_n2_token');
    localStorage.removeItem('console_n2_user');
    setUser(null);
  };

  if (!user) {
    return <LoginView onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header Superior */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold text-slate-100">Painel Administrativo - Servidor Debian</h1>
          <p className="text-xs text-slate-400 font-mono">192.168.100.10</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-200">{user.name}</p>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded">
              Perfil: {user.role}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded transition"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Navegação Secundária */}
      <nav className="bg-slate-800/50 border-b border-slate-700/50 px-6">
        <div className="flex gap-4">
          {['dashboard', 'files', 'mail', 'ssh'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition ${
                activeTab === tab
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'dashboard' && 'Observabilidade'}
              {tab === 'files' && 'Arquivos & FTP'}
              {tab === 'mail' && 'Correio E-mail'}
              {tab === 'ssh' && 'Operação SSH'}
            </button>
          ))}
        </div>
      </nav>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'files' && <div className="text-slate-400">Módulo FTP (Componente a seguir)</div>}
        {activeTab === 'mail' && <div className="text-slate-400">Módulo E-mail (Componente a seguir)</div>}
        {activeTab === 'ssh' && <div className="text-slate-400">Módulo SSH (Componente a seguir)</div>}
      </main>
    </div>
  );
}