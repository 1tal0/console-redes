import React from 'react';
import { LoaderCircle } from 'lucide-react';

const SERVICE_ACTIONS = [
  { action: 'start', label: 'Iniciar' },
  { action: 'stop', label: 'Parar' },
  { action: 'restart', label: 'Reiniciar' }
];

export default function ServiceCards({ services, pendingActions = {}, onAction, stale = false, can }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {Object.entries(services).map(([serviceName, info]) => (
        <div key={serviceName} className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50 flex flex-col items-center min-w-0 text-center">
          <span className="text-xs font-mono text-slate-400 uppercase mb-2 break-all">{serviceName}</span>
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
            info.state === 'ativo' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            ● {info.state.toUpperCase()}
          </span>
          <span className="text-[11px] md:text-[10px] text-slate-500 mt-1 font-mono break-all">{info.subState}</span>
          {onAction && (
            <div className="mt-3 flex flex-wrap justify-center gap-1">
              {SERVICE_ACTIONS.filter(({ action }) => can(`services.${serviceName}.${action}`)).map(({ action, label }) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => onAction(serviceName, action, label)}
                  disabled={stale || Boolean(pendingActions[serviceName])
                    || (info.activeState === 'active' && action === 'start')
                    || (info.activeState === 'inactive' && action !== 'start')}
                  aria-busy={pendingActions[serviceName] === action}
                  className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-slate-600 text-slate-200 enabled:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pendingActions[serviceName] === action && (
                    <LoaderCircle aria-hidden="true" className="size-3 animate-spin" />
                  )}
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
