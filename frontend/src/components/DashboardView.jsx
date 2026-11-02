import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Activity, Download, Mail, Server, Upload, UserPlus } from 'lucide-react';
import api from '../services/api';
import { formatDateTime, formatTime } from '../utils/formatDate';
import { useSessionOperations } from '../context/SessionOperationsContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const MAX_SAMPLES = 20;
const STALE_AFTER_MS = 5000;
const SITE_URL = 'http://site.empresa.test/';

function formatUptime(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds) || 0);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours || days) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  parts.push(`${secs}s`);
  return parts.join(' ');
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 250 },
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: {
      labels: { color: '#cbd5e1', boxWidth: 12, font: { size: 11 } }
    },
    tooltip: {
      callbacks: {
        label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}%`
      }
    }
  },
  scales: {
    x: {
      ticks: { color: '#94a3b8', maxRotation: 0, font: { size: 10 } },
      grid: { color: 'rgba(51, 65, 85, 0.6)' }
    },
    y: {
      min: 0,
      max: 100,
      ticks: { color: '#94a3b8', callback: (value) => `${value}%` },
      grid: { color: 'rgba(51, 65, 85, 0.6)' }
    }
  }
};


const OP_STATUS = {
  em_andamento: { label: 'Em andamento', className: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  concluido: { label: 'Concluído', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  falha: { label: 'Falha', className: 'bg-red-500/20 text-red-400 border-red-500/30' }
};

function OperationIcon({ modulo, operacao }) {
  const name = `${modulo} ${operacao}`.toLowerCase();
  let Icon = Activity;
  if (name.includes('upload')) Icon = Upload;
  else if (name.includes('download')) Icon = Download;
  else if (name.includes('e-mail') || name.includes('smtp')) Icon = Mail;
  else if (name.includes('ssh') || name.includes('hostname')) Icon = Server;
  else if (name.includes('usu') || name.includes('utilizador')) Icon = UserPlus;
  return <Icon className="size-3.5 shrink-0 text-slate-300" />;
}

export default function DashboardView() {
  const { operations } = useSessionOperations();
  const [metrics, setMetrics] = useState(null);
  const [samples, setSamples] = useState([]);
  const [lastSuccessAt, setLastSuccessAt] = useState(null);
  const [httpTestAt, setHttpTestAt] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);

  const stale = lastSuccessAt != null && now - lastSuccessAt > STALE_AFTER_MS;

  const fetchMetrics = async () => {
    try {
      const res = await api.get('/metrics');
      const data = res.data;
      const collectedAt = Date.now();

      setMetrics(data);
      setLastSuccessAt(collectedAt);
      setHttpTestAt(data.timestamp || collectedAt);
      setSamples((prev) => {
        const next = [
          ...prev,
          {
            at: data.timestamp || collectedAt,
            cpu: Number(data.cpu?.usagePercent) || 0,
            memory: Number(data.memory?.usagePercent) || 0
          }
        ];
        return next.slice(-MAX_SAMPLES);
      });
    } catch {
      // Mantém os últimos valores; o aviso de desatualização usa lastSuccessAt
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const poll = setInterval(fetchMetrics, 1000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, []);

  if (loading && !metrics) {
    return <div className="text-slate-400 text-center py-10">Carregando métricas em tempo real...</div>;
  }

  if (!metrics) {
    return (
      <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded text-sm">
        ⚠️ Coleta de Métricas Desatualizada (Falha de comunicação com 192.168.100.10)
      </div>
    );
  }

  const chartData = {
    labels: samples.map((sample) => formatTime(sample.at)),
    datasets: [
      {
        label: 'CPU %',
        data: samples.map((sample) => sample.cpu),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        tension: 0.3,
        fill: true,
        pointRadius: 2
      },
      {
        label: 'Memória %',
        data: samples.map((sample) => sample.memory),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.12)',
        tension: 0.3,
        fill: true,
        pointRadius: 2
      }
    ]
  };

  return (
    <div className={`space-y-6 ${stale ? 'opacity-90' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="min-w-0">
          <h2 className="text-lg md:text-xl font-bold text-slate-100 break-words">Observabilidade & Métricas do Sistema</h2>
          <p className="text-[11px] text-slate-500 font-mono">Debian 192.168.100.10 · polling 1s · amostras da sessão</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={SITE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center min-h-11 md:min-h-0 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            Abrir site (Apache)
          </a>
          <span className="self-start sm:self-auto text-[11px] md:text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700 whitespace-nowrap">
            Última atualização: {formatDateTime(metrics.timestamp)}
          </span>
        </div>
      </div>

      {stale && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/40 text-amber-300 rounded text-xs font-semibold">
          ⚠️ Coleta de Métricas Desatualizada (Falha de comunicação com 192.168.100.10)
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="bg-slate-800 p-4 md:p-5 rounded-xl border border-slate-700 min-w-0">
          <p className="text-xs font-semibold uppercase text-slate-400">Carga da CPU</p>
          <p className="text-2xl md:text-3xl font-extrabold text-slate-100 mt-2">{metrics.cpu.usagePercent}%</p>
          <div className="w-full bg-slate-700 h-2 rounded-full mt-3 overflow-hidden">
            <div className="bg-indigo-500 h-full" style={{ width: `${metrics.cpu.usagePercent}%` }}></div>
          </div>
        </div>

        <div className="bg-slate-800 p-4 md:p-5 rounded-xl border border-slate-700 min-w-0">
          <p className="text-xs font-semibold uppercase text-slate-400">Uso de Memória RAM</p>
          <p className="text-2xl md:text-3xl font-extrabold text-slate-100 mt-2">{metrics.memory.usagePercent}%</p>
          <p className="text-xs text-slate-400 mt-1">{metrics.memory.usedMb} MB / {metrics.memory.totalMb} MB</p>
          <div className="w-full bg-slate-700 h-2 rounded-full mt-2 overflow-hidden">
            <div className="bg-blue-500 h-full" style={{ width: `${metrics.memory.usagePercent}%` }}></div>
          </div>
        </div>

        <div className="bg-slate-800 p-4 md:p-5 rounded-xl border border-slate-700 min-w-0">
          <p className="text-xs font-semibold uppercase text-slate-400">Uso do Disco (/)</p>
          <p className="text-2xl md:text-3xl font-extrabold text-slate-100 mt-2">{metrics.disk.usagePercent}%</p>
          <p className="text-xs text-slate-400 mt-1">{metrics.disk.usedGb} GB / {metrics.disk.totalGb} GB</p>
          <div className="w-full bg-slate-700 h-2 rounded-full mt-2 overflow-hidden">
            <div className="bg-emerald-500 h-full" style={{ width: `${metrics.disk.usagePercent}%` }}></div>
          </div>
        </div>

        <div className="bg-slate-800 p-4 md:p-5 rounded-xl border border-slate-700 min-w-0">
          <p className="text-xs font-semibold uppercase text-slate-400">Uptime do Servidor</p>
          <p className="text-2xl md:text-3xl font-extrabold text-slate-100 mt-2 break-words">{formatUptime(metrics.uptime)}</p>
          <p className="text-xs text-slate-400 mt-1 font-mono">{metrics.uptime} s</p>
        </div>

        <div className="bg-slate-800 p-4 md:p-5 rounded-xl border border-slate-700 min-w-0">
          <p className="text-xs font-semibold uppercase text-slate-400">Latência HTTP (Apache)</p>
          <p className="text-2xl md:text-3xl font-extrabold text-emerald-400 mt-2">{metrics.httpTest.latencyMs} ms</p>
          <p className="text-xs text-slate-400 mt-1">Status Code: HTTP {metrics.httpTest.code}</p>
          <p className="text-[11px] text-slate-500 mt-1">Teste: {formatDateTime(httpTestAt)}</p>
          <a
            href="http://192.168.100.10/"
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-2 text-[11px] text-indigo-400 underline break-all"
          >
            http://192.168.100.10/
          </a>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 md:p-5">
        <h3 className="text-sm md:text-base font-bold text-slate-200 mb-1">Amostras de CPU e Memória (sessão)</h3>
        <p className="text-[11px] text-slate-500 mb-4">Últimas {samples.length} de até {MAX_SAMPLES} coletas em tempo real</p>
        <div className="h-64 md:h-72">
          {samples.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">Aguardando amostras...</div>
          ) : (
            <Line data={chartData} options={chartOptions} />
          )}
        </div>
      </div>


      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 md:p-5">
        <h3 className="text-sm md:text-base font-bold text-slate-200 mb-1">Operações Recentes da Sessão</h3>
        <p className="text-[11px] text-slate-500 mb-4">Histórico em memória desta sessão (não persistente)</p>
        {operations.length === 0 ? (
          <p className="text-xs text-slate-500">Nenhuma operação registada nesta sessão.</p>
        ) : (
          <ul className="max-h-64 overflow-y-auto space-y-2">
            {operations.map((op) => {
              const st = OP_STATUS[op.status] || OP_STATUS.em_andamento;
              return (
                <li key={op.id} className="flex items-start gap-3 bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-2">
                  <div className="mt-0.5"><OperationIcon modulo={op.modulo} operacao={op.operacao} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-slate-200">{op.operacao}</span>
                      <span className="text-[10px] uppercase tracking-wide text-slate-500">{op.modulo}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.className}`}>{st.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 break-words mt-0.5">{op.detalhe}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{formatDateTime(op.timestamp)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className="text-sm md:text-base font-bold text-slate-200">Estado dos 5 Serviços da Infraestrutura</h3>
          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border border-amber-500/40 text-amber-300 bg-amber-500/10">Ações = Parte 2</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {Object.entries(metrics.services).map(([serviceName, info]) => (
            <div key={serviceName} className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50 flex flex-col items-center min-w-0 text-center">
              <span className="text-xs font-mono text-slate-400 uppercase mb-2 break-all">{serviceName}</span>
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                info.state === 'ativo' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                ● {info.state.toUpperCase()}
              </span>
              <span className="text-[11px] md:text-[10px] text-slate-500 mt-1 font-mono break-all">{info.subState}</span>
              <div className="mt-3 w-full space-y-1 opacity-60">
                <p className="text-[9px] uppercase tracking-wide text-amber-400/80">Ações · Parte 2</p>
                <div className="flex flex-wrap justify-center gap-1">
                  {['Iniciar', 'Parar', 'Reiniciar'].map((action) => (
                    <button
                      key={action}
                      type="button"
                      disabled
                      title="Parte 2"
                      className="text-[10px] px-2 py-1 rounded border border-slate-600 text-slate-400 cursor-not-allowed"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
