import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { formatDateTime } from '../utils/formatDate';

const EMPTY_FILTERS = { username: '', module: '', outcome: '', from: '', to: '' };
const MODULES = ['Sessão', 'Observabilidade', 'Serviços', 'FTP', 'Correio', 'SSH', 'Logs', 'Usuários', 'Auditoria', 'API'];
const OUTCOMES = {
  sucesso: ['Sucesso', 'text-emerald-300'],
  parcial: ['Parcial', 'text-amber-300'],
  falha: ['Falha', 'text-red-300'],
  negado: ['Negado', 'text-red-300'],
  interrompido: ['Interrompido', 'text-amber-300']
};
const INPUT_CLASS = 'rounded border border-slate-600 bg-slate-900 px-2 py-2 text-sm text-slate-100';
const BUTTON_CLASS = 'rounded border border-slate-600 px-3 py-2 text-sm hover:bg-slate-700 disabled:opacity-50';

function dateBoundary(value, nextDay = false) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  if (nextDay) date.setDate(date.getDate() + 1);
  return date.toISOString();
}

export default function AuditView() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [query, setQuery] = useState({ filters: EMPTY_FILTERS, cursors: [null] });
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const { cursors } = query;

  useEffect(() => {
    const controller = new AbortController();
    const applied = query.filters;
    api.get('/audit', {
      params: {
        username: applied.username.trim() || undefined,
        module: applied.module || undefined,
        outcome: applied.outcome || undefined,
        from: dateBoundary(applied.from),
        to: dateBoundary(applied.to, true),
        before: query.cursors.at(-1)
      },
      signal: controller.signal
    }).then(({ data: page }) => {
      if (!controller.signal.aborted) setData(page);
    }).catch((requestError) => {
      if (!controller.signal.aborted) {
        setError(requestError.response?.data?.error || 'Não foi possível carregar a auditoria.');
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [query]);

  function load(nextQuery) {
    setLoading(true);
    setError('');
    setData(null);
    setQuery(nextQuery);
  }

  function updateFilter(event) {
    const { name, value } = event.target;
    setFilters(previous => ({ ...previous, [name]: value }));
  }

  return (
    <section className="space-y-4" aria-labelledby="audit-title">
      <h2 id="audit-title" className="text-xl font-bold">Trilha de Auditoria</h2>
      <form
        className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          load({ filters, cursors: [null] });
        }}
      >
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          Usuário
          <input className={INPUT_CLASS} name="username" value={filters.username} maxLength={128} onChange={updateFilter} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          Módulo
          <select className={INPUT_CLASS} name="module" value={filters.module} onChange={updateFilter}>
            <option value="">Todos</option>
            {MODULES.map(module => <option key={module}>{module}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          Resultado
          <select className={INPUT_CLASS} name="outcome" value={filters.outcome} onChange={updateFilter}>
            <option value="">Todos</option>
            {Object.entries(OUTCOMES).map(([value, [label]]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          De
          <input type="date" className={INPUT_CLASS} name="from" value={filters.from} max={filters.to || undefined} onChange={updateFilter} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          Até
          <input type="date" className={INPUT_CLASS} name="to" value={filters.to} min={filters.from || undefined} onChange={updateFilter} />
        </label>
        <button type="submit" className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold hover:bg-indigo-500">
          Consultar
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800" aria-busy={loading}>
        {loading && <p role="status" className="p-4 text-sm text-slate-300">Carregando eventos…</p>}
        {error && <p role="alert" className="p-4 text-sm text-red-300">{error}</p>}
        {data?.events.length === 0 && (
          <p className="p-4 text-sm text-slate-300">Nenhum evento encontrado.</p>
        )}
        {data?.events.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-xs text-slate-300">
              <tr>
                {['Data e hora', 'Usuário', 'Módulo e ação', 'Recurso', 'Resultado', 'Origem'].map(label => (
                  <th key={label} scope="col" className="px-3 py-2">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.events.map(event => {
                const [label, color] = OUTCOMES[event.outcome];
                return (
                  <tr key={event.id} className="border-t border-slate-700 align-top">
                    <td className="whitespace-nowrap px-3 py-2">{formatDateTime(event.occurred_at)}</td>
                    <td className="max-w-48 break-all px-3 py-2">
                      {event.actor_username || event.attempted_username || 'Anônimo'}
                      <span className="block text-xs text-slate-400">
                        {event.actor_role || (event.attempted_username ? 'Usuário informado na tentativa' : '')}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {event.action}
                      <span className="block text-xs text-slate-400">{event.module}</span>
                    </td>
                    <td className="max-w-52 break-all px-3 py-2">{event.resource || '—'}</td>
                    <td className="min-w-36 px-3 py-2">
                      <span className={color}>{label}</span>
                      {event.http_status && (
                        <span className="ml-2 text-xs text-slate-400">HTTP {event.http_status}</span>
                      )}
                      {event.reason && <p className="text-xs text-slate-400">{event.reason}</p>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-300">
                      {event.source_ip || '—'}
                      <span className="block text-slate-400">{event.duration_ms} ms</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <nav aria-label="Páginas da auditoria" className="flex flex-wrap items-center justify-end gap-2">
        <button type="button" className={BUTTON_CLASS} disabled={loading || cursors.length === 1}
          onClick={() => load({ ...query, cursors: cursors.slice(0, -1) })}>
          Anterior
        </button>
        <span className="text-xs text-slate-300">Página {cursors.length}</span>
        <button type="button" className={BUTTON_CLASS} disabled={loading || !data?.nextBefore}
          onClick={() => load({ ...query, cursors: [...cursors, data.nextBefore] })}>
          Próxima
        </button>
      </nav>
    </section>
  );
}
