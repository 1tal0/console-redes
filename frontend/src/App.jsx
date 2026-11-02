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
          className={`fixed md:static z-40 h-dvh shrink-0 bg-slate-800 border-r border-slate-700 flex flex-col transition-all duration-300 overflow-hidden ${
            expanded ? 'w-64' : 'w-0 md:w-16'
          }`}
        >
          <div className="flex items-center gap-2 px-3 py-3 border-b border-slate-700 min-h-[3.5rem]">
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
                <p className="text-[10px] text-slate-400 font-mono truncate">192.168.100.10</p>
              </div>
            )}
          </div>

          <div className={`border-b border-slate-700 ${expanded ? 'px-3 py-3' : 'px-2 py-2'}`}>
            {expanded ? (
              <>
                <p className="text-xs font-semibold text-slate-200 truncate">{user.name}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                    connection === 'offline'
                      ? 'bg-red-500/20 text-red-400 border-red-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  }`}>
                    {connection === 'offline' ? 'Desconectado' : 'Conectado'}
                  </span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded">
                    {user.role}
                  </span>
                </div>
              </>
            ) : (
              <div className="hidden md:flex justify-center">
                <span className={`size-2.5 rounded-full ${connection === 'offline' ? 'bg-red-400' : 'bg-emerald-400'}`} title={connection === 'offline' ? 'Desconectado' : 'Conectado'} />
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
                      className={`w-full flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                        active
                          ? 'bg-indigo-500/15 text-indigo-300'
                          : 'text-slate-300 hover:bg-slate-700/60'
                      } ${expanded ? '' : 'md:justify-center'}`}
                    >
                      <Icon className="size-4 shrink-0" />
                      {expanded && <span className="truncate text-left">{tab.label}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>

            <p className={`mt-4 mb-1 text-[10px] uppercase tracking-wide text-slate-500 ${expanded ? 'px-2' : 'hidden md:block text-center'}`}>
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
                      className={`w-full flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-semibold text-slate-500 opacity-60 cursor-not-allowed ${expanded ? '' : 'md:justify-center'}`}
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

          <div className="p-2 border-t border-slate-700">
            <button
              type="button"
              onClick={handleLogout}
              title="Sair"
              className={`w-full inline-flex items-center gap-2 rounded-lg px-2.5 py-2.5 text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${expanded ? '' : 'md:justify-center'}`}
            >
              <LogOut className="size-4 shrink-0" />
              {expanded && <span>Sair</span>}
            </button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 min-h-dvh">
          {connectionBanner}

          <header className="bg-slate-800 border-b border-slate-700 px-3 py-3 md:px-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen((open) => !open)}
              aria-label={expanded ? 'Recolher menu' : 'Abrir menu'}
              className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <Menu className="size-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm sm:text-base md:text-lg font-bold leading-tight break-words">Painel Administrativo - Servidor Debian</h1>
              <p className="text-[11px] text-slate-400 font-mono truncate">192.168.100.10</p>
            </div>
            <span className={`hidden sm:inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
              connection === 'offline'
                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            }`}>
              {connection === 'offline' ? 'Desconectado' : 'Conectado'}
            </span>
          </header>

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
