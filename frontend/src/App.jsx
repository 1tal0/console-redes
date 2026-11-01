import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import LoginView from './components/LoginView';
import DashboardView from './components/DashboardView';
import FtpView from './components/FtpView';
import MailView from './components/MailView';
import SshView from './components/SshView';
import LogsView from './components/LogsView'; // Importar novo componente

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [menuOpen, setMenuOpen] = useState(false); // Menu recolhível no celular

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

  // Abas de navegação do painel
  const tabs = [
    { id: 'dashboard', label: 'Observabilidade' },
    { id: 'files', label: 'Arquivos & FTP' },
    { id: 'mail', label: 'Correio E-mail' },
    { id: 'ssh', label: 'Operação SSH' },
    { id: 'logs', label: 'Logs do Servidor' }
  ];

  // Ao navegar no celular, fecha o menu recolhível
  const handleNavigate = (id) => {
    setActiveTab(id);
    setMenuOpen(false);
  };

  if (!user) {
    return <LoginView onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="min-h-dvh bg-slate-900 text-slate-100 flex flex-col">
      {/* Header Superior */}
      <header className="bg-slate-800 border-b border-slate-700 px-3 py-3 md:px-6 md:py-4 flex justify-between items-center gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {/* Botão hambúrguer: só aparece abaixo de md */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
            aria-expanded={menuOpen}
            aria-controls="menu-mobile"
            className="md:hidden shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>

          <div className="min-w-0">
            <h1 className="text-sm sm:text-base md:text-lg font-bold text-slate-100 leading-tight break-words">Painel Administrativo - Servidor Debian</h1>
            <p className="text-[11px] md:text-xs text-slate-400 font-mono truncate">192.168.100.10</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 shrink-0 min-w-0">
          <div className="text-right min-w-0 max-w-[40vw] sm:max-w-[16rem]">
            <p className="text-xs sm:text-sm font-semibold text-slate-200 truncate">{user.name}</p>
            <span className="inline-block max-w-full truncate text-[11px] md:text-[10px] uppercase font-bold px-2 py-0.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded">
              Perfil: {user.role}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="shrink-0 inline-flex items-center justify-center min-h-11 md:min-h-0 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-2 md:py-1.5 rounded transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Navegação Secundária (celular): menu recolhível */}
      {menuOpen && (
        <nav id="menu-mobile" className="md:hidden bg-slate-800 border-b border-slate-700 px-3 py-2">
          <ul className="flex flex-col gap-1">
            {tabs.map((tab) => (
              <li key={tab.id}>
                <button
                  onClick={() => handleNavigate(tab.id)}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                  className={`w-full text-left rounded-lg px-3 py-3 text-sm font-semibold transition border-l-4 ${
                    activeTab === tab.id
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                      : 'border-transparent text-slate-300 hover:bg-slate-700/60'
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400`}
                >
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* Navegação Secundária (desktop) */}
      <nav className="hidden md:block bg-slate-800/50 border-b border-slate-700/50 px-6">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleNavigate(tab.id)}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              className={`whitespace-nowrap py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-3 md:p-6 max-w-7xl w-full mx-auto">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'files' && <FtpView />}
        {activeTab === 'mail' && <MailView />}
        {activeTab === 'ssh' && <SshView />}
        {activeTab === 'logs' && <LogsView />}
      </main>
    </div>
  );
}