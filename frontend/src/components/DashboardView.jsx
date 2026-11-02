import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { formatDateTime } from '../utils/formatDate';

export default function DashboardView() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMetrics = async () => {
    try {
      const res = await api.get('/metrics');
      setMetrics(res.data);
      setError('');
    } catch (err) {
      setError('Falha ao conectar à API de métricas do Debian.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 1000); // Atualiza a cada 1s
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="text-slate-400 text-center py-10">Carregando métricas em tempo real...</div>;
  if (error) return <div className="text-red-400 text-center py-10">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h2 className="text-lg md:text-xl font-bold text-slate-100 break-words">Observabilidade & Métricas do Sistema</h2>
        <span className="self-start sm:self-auto text-[11px] md:text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700 whitespace-nowrap">
          Última atualização: {formatDateTime(metrics.timestamp)}
        </span>
      </div>

      {/* Cards de Recursos Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* CPU */}
        <div className="bg-slate-800 p-4 md:p-5 rounded-xl border border-slate-700 min-w-0">
          <p className="text-xs font-semibold uppercase text-slate-400">Carga da CPU</p>
          <p className="text-2xl md:text-3xl font-extrabold text-slate-100 mt-2">{metrics.cpu.usagePercent}%</p>
          <div className="w-full bg-slate-700 h-2 rounded-full mt-3 overflow-hidden">
            <div className="bg-indigo-500 h-full" style={{ width: `${metrics.cpu.usagePercent}%` }}></div>
          </div>
        </div>

        {/* RAM */}
        <div className="bg-slate-800 p-4 md:p-5 rounded-xl border border-slate-700 min-w-0">
          <p className="text-xs font-semibold uppercase text-slate-400">Uso de Memória RAM</p>
          <p className="text-2xl md:text-3xl font-extrabold text-slate-100 mt-2">{metrics.memory.usagePercent}%</p>
          <p className="text-xs text-slate-400 mt-1">{metrics.memory.usedMb} MB / {metrics.memory.totalMb} MB</p>
          <div className="w-full bg-slate-700 h-2 rounded-full mt-2 overflow-hidden">
            <div className="bg-blue-500 h-full" style={{ width: `${metrics.memory.usagePercent}%` }}></div>
          </div>
        </div>

        {/* DISCO */}
        <div className="bg-slate-800 p-4 md:p-5 rounded-xl border border-slate-700 min-w-0">
          <p className="text-xs font-semibold uppercase text-slate-400">Uso do Disco (/)</p>
          <p className="text-2xl md:text-3xl font-extrabold text-slate-100 mt-2">{metrics.disk.usagePercent}%</p>
          <p className="text-xs text-slate-400 mt-1">{metrics.disk.usedGb} GB / {metrics.disk.totalGb} GB</p>
          <div className="w-full bg-slate-700 h-2 rounded-full mt-2 overflow-hidden">
            <div className="bg-emerald-500 h-full" style={{ width: `${metrics.disk.usagePercent}%` }}></div>
          </div>
        </div>

        {/* HTTP LATÊNCIA */}
        <div className="bg-slate-800 p-4 md:p-5 rounded-xl border border-slate-700 min-w-0">
          <p className="text-xs font-semibold uppercase text-slate-400">Latência HTTP (Apache)</p>
          <p className="text-2xl md:text-3xl font-extrabold text-emerald-400 mt-2">{metrics.httpTest.latencyMs} ms</p>
          <p className="text-xs text-slate-400 mt-1">Status Code: HTTP {metrics.httpTest.code}</p>
          <div className="w-full bg-slate-700 h-2 rounded-full mt-2 overflow-hidden">
            <div className="bg-emerald-400 h-full w-full"></div>
          </div>
        </div>
      </div>

      {/* Tabela de Serviços da N1 */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 md:p-5">
        <h3 className="text-sm md:text-base font-bold text-slate-200 mb-4">Estado dos 5 Serviços da Infraestrutura</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {Object.entries(metrics.services).map(([serviceName, info]) => (
            <div key={serviceName} className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50 flex flex-col items-center min-w-0 text-center">
              <span className="text-xs font-mono text-slate-400 uppercase mb-2 break-all">{serviceName}</span>
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                info.state === 'ativo' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                ● {info.state.toUpperCase()}
              </span>
              <span className="text-[11px] md:text-[10px] text-slate-500 mt-1 font-mono break-all">{info.subState}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}