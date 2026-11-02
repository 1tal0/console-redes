import React, { useState, useEffect } from 'react';
import {
  Menu,
  X,
  LayoutDashboard,
  Folder,
  Mail,
  Terminal,
  ScrollText,
  Users,
  Shield,
  Settings,
  Building2,
  LogOut
} from 'lucide-react';
import LoginView from './components/LoginView';
import DashboardView from './components/DashboardView';
import FtpView from './components/FtpView';
import MailView from './components/MailView';
import SshView from './components/SshView';
import LogsView from './components/LogsView';
import UsersView from './components/UsersView';
import { SessionOperationsProvider } from './context/SessionOperationsContext';
import { subscribeConnection } from './services/notifyBus';

const TABS_BY_ROLE = {
  admin: [
    { id: 'dashboard', label: 'Observabilidade' },
    { id: 'files', label: 'Arquivos & FTP' },
    { id: 'mail', label: 'Correio E-mail' },
    { id: 'ssh', label: 'Operação SSH' },
    { id: 'logs', label: 'Logs do Servidor' },
    { id: 'users', label: 'Gerenciamento de Usuários' }
  ],
  operador: [
    { id: 'dashboard', label: 'Observabilidade' },
    { id: 'files', label: 'Arquivos & FTP' },
    { id: 'mail', label: 'Correio E-mail' },
    { id: 'ssh', label: 'Operação SSH' },
    { id: 'logs', label: 'Logs do Servidor' }
  ],
  leitor: [
    { id: 'dashboard', label: 'Observabilidade' },
    { id: 'files', label: 'Arquivos & FTP' },
    { id: 'mail', label: 'Correio E-mail' }
  ]
};

const TAB_ICONS = {
  dashboard: LayoutDashboard,
  files: Folder,
  mail: Mail,
  ssh: Terminal,
  logs: ScrollText,
  users: Users,
  audit: Shield,
  services: Settings,
  enterprise: Building2
};

const PART2_TABS = [
  { id: 'audit', label: 'Trilha de Auditoria' },
  { id: 'services', label: 'Gestão de Serviços (Start/Stop)' },
  { id: 'enterprise', label: 'Novos Serviços Empresariais' }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  const [part2Notice, setPart2Notice] = useState(false);
  const [connection, setConnection] = useState('online');

  useEffect(() => {
    const savedUser = localStorage.getItem('console_n2_user');
    const token = localStorage.getItem('console_n2_token');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => subscribeConnection(setConnection), []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('console_n2_token');
    localStorage.removeItem('console_n2_user');
    setUser(null);
  };

  const tabs = TABS_BY_ROLE[user?.role] || TABS_BY_ROLE.leitor;
  const allowedTabIds = tabs.map((tab) => tab.id);

  useEffect(() => {
    if (!user) return;
    const ids = (TABS_BY_ROLE[user.role] || TABS_BY_ROLE.leitor).map((tab) => tab.id);
    if (!ids.includes(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [user, activeTab]);

  const handleNavigate = (id) => {
    if (!allowedTabIds.includes(id)) return;
    setActiveTab(id);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const showPart2Notice = () => {
    setPart2Notice(true);
    window.clearTimeout(showPart2Notice._t);
    showPart2Notice._t = window.setTimeout(() => setPart2Notice(false), 2800);
  };

  const connectionBanner = connection === 'offline' ? (
    <div className="bg-amber-500/15 border-b border-amber-500/40 text-amber-200 text-xs text-center px-3 py-2">
      ⚠️ Conexão perdida com o servidor 192.168.100.10. Tentando reconectar...
    </div>
  ) : null;

  if (!user) {
    return (
      <>
        {connectionBanner}
        <LoginView onLoginSuccess={(u) => setUser(u)} />
      </>
    );
  }

  const expanded = isSidebarOpen;

  return (
    <SessionOperationsProvider>
      <div className="min-h-dvh bg-slate-900 text-slate-100 flex">
        {expanded && (
          <button
            type="button"
            aria-label="Fechar menu"
            className="fixed inset-0 z-30 bg-slate-950/60 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <aside
          className={`z-40 bg-slate-800 border-r border-slate-700 flex flex-col overflow-hidden transition-all duration-300
            md:sticky md:top-0 md:h-dvh md:shrink-0
            max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:h-dvh
            ${expanded ? 'w-64' : 'w-16'}`}
        >
          <div className={`h-16 shrink-0 border-b border-slate-700 flex items-center gap-2 ${expanded ? 'px-3' : 'px-0 justify-center'}`}>
            <button
              type="button"
              onClick={() => setIsSidebarOpen((open) => !open)}
              aria-label={expanded ? 'Recolher menu' : 'Expandir menu'}
              aria-expanded={expanded}
              className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              {expanded ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
            {expanded && (
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight">Console N2</p>
                <p className="text-[10px] text-slate-400 font-mono truncate">Debian 192.168.100.10</p>
              </div>
            )}
          </div>

          <nav className="flex-1 overflow-y-auto py-2 px-2">
            <ul className="space-y-1">
              {tabs.map((tab) => {
                const Icon = TAB_ICONS[tab.id] || LayoutDashboard;
                const active = activeTab === tab.id;
                return (
                  <li key={tab.id}>
                    <button
                      type="button"
                      title={tab.label}
                      onClick={() => handleNavigate(tab.id)}
                      aria-current={active ? 'page' : undefined}
                      className={`w-full flex items-center rounded-lg py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                        expanded ? 'gap-3 px-2.5' : 'justify-center px-0'
                      } ${
                        active
                          ? 'bg-indigo-500/15 text-indigo-300'
                          : 'text-slate-300 hover:bg-slate-700/60'
                      }`}
                    >
                      <Icon className="size-4 shrink-0" />
                      {expanded && <span className="truncate text-left">{tab.label}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>

            <p className={`mt-4 mb-1 text-[10px] uppercase tracking-wide text-slate-500 ${expanded ? 'px-2' : 'text-center'}`}>
              {expanded ? 'Parte 2' : 'P2'}
            </p>
            <ul className="space-y-1">
              {PART2_TABS.map((tab) => {
                const Icon = TAB_ICONS[tab.id] || Shield;
                return (
                  <li key={tab.id}>
                    <button
                      type="button"
                      title={`${tab.label} · Em breve - Parte 2`}
                      onClick={showPart2Notice}
                      className={`w-full flex items-center rounded-lg py-2.5 text-sm font-semibold text-slate-500 opacity-60 cursor-not-allowed ${
                        expanded ? 'gap-3 px-2.5' : 'justify-center px-0'
                      }`}
                    >
                      <Icon className="size-4 shrink-0" />
                      {expanded && (
                        <span className="min-w-0 text-left">
                          <span className="block truncate">{tab.label}</span>
                          <span className="block text-[9px] uppercase text-amber-400/80">Em breve - Parte 2</span>
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 min-h-dvh">
          <header className="sticky top-0 z-20 h-16 bg-slate-800 border-b border-slate-700 px-3 md:px-6 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-sm sm:text-base md:text-lg font-bold leading-tight break-words">Painel Administrativo - Servidor Debian</h1>
              <p className="text-[11px] text-slate-400 font-mono truncate">192.168.100.10</p>
            </div>

            <div className="flex items-center gap-2 md:gap-3 shrink-0 min-w-0">
              <div className="text-right min-w-0 max-w-[42vw] sm:max-w-none">
                <p className="text-xs sm:text-sm font-semibold text-slate-200 truncate max-w-[28vw] sm:max-w-[12rem]">{user.name}</p>
                <div className="flex flex-wrap items-center justify-end gap-1">
                  <span className={`inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                    connection === 'offline'
                      ? 'bg-red-500/20 text-red-400 border-red-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  }`}>
                    {connection === 'offline' ? 'Desconectado' : 'Conectado'}
                  </span>
                  <span className="inline-block text-[10px] uppercase font-bold px-2 py-0.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded">
                    Perfil: {user.role}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="shrink-0 inline-flex items-center justify-center gap-1.5 h-9 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 rounded transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                <LogOut className="size-3.5" />
                Sair
              </button>
            </div>
          </header>

          {connectionBanner}

          {part2Notice && (
            <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-amber-500/40 bg-slate-800 px-4 py-3 text-xs text-amber-200 shadow-xl">
              Funcionalidade pertencente à evolução da Parte 2.
            </div>
          )}

          <main className="flex-1 p-3 md:p-6 w-full max-w-7xl mx-auto">
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'files' && allowedTabIds.includes('files') && <FtpView />}
            {activeTab === 'mail' && allowedTabIds.includes('mail') && <MailView />}
            {activeTab === 'ssh' && allowedTabIds.includes('ssh') && <SshView />}
            {activeTab === 'logs' && allowedTabIds.includes('logs') && <LogsView />}
            {activeTab === 'users' && allowedTabIds.includes('users') && <UsersView />}
          </main>
        </div>
      </div>
    </SessionOperationsProvider>
  );
}
