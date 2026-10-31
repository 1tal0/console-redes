import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function LogsView() {
  const [logType, setLogType] = useState('system');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLogs = async (type) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/logs', { params: { type } });
      setLogs(res.data.logs || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Falha ao obter logs do sistema.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(logType);
  }, [logType]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Logs e Auditoria do Servidor</h2>
          <p className="text-xs text-slate-400">Visualização em tempo real das últimas 50 entradas dos serviços Linux</p>
        </div>

        <button
          onClick={() => fetchLogs(logType)}
          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded transition"
        >
          🔄 Atualizar Logs
        </button>
      </div>

      {/* Seletor de Serviço / Tipo de Log */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'system', label: '🖥️ Sistema (Journalctl)' },
          { id: 'auth', label: '🔑 Autenticação & SSH (auth.log)' },
          { id: 'ftp', label: '📁 Servidor FTP (vsftpd)' },
          { id: 'mail', label: '✉️ Correio (Postfix/Dovecot)' },
          { id: 'apache', label: '🌐 Web (Apache Access)' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setLogType(tab.id)}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
              logType === tab.id
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-xs">
          {error}
        </div>
      )}

      {/* Exibição em Estilo Terminal */}
      <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-800 text-[10px] text-slate-500">
          <span>CONSOLE LOG STREAM - {logType.toUpperCase()}</span>
          <span>{logs.length} Linhas</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">A carregar registos do sistema Debian...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Nenhum registo encontrado para a categoria selecionada.</div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto space-y-1 text-slate-300">
            {logs.map((line, idx) => (
              <div key={idx} className="hover:bg-slate-900/80 px-2 py-0.5 rounded break-all whitespace-pre-wrap">
                <span className="text-slate-600 mr-2">[{idx + 1}]</span>
                <span className={
                  line.includes('FAILED') || line.includes('error') || line.includes('Error')
                    ? 'text-red-400 font-semibold'
                    : line.includes('sudo') || line.includes('ACCEPTED')
                    ? 'text-emerald-400'
                    : 'text-slate-300'
                }>
                  {line}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}