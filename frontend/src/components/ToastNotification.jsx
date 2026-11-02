import React, { useEffect, useState } from 'react';
import { subscribeToasts } from '../services/notifyBus';

const STYLES = {
  success: 'border-emerald-500/40 bg-slate-800 text-emerald-300',
  error: 'border-red-500/40 bg-slate-800 text-red-300',
  warning: 'border-amber-500/40 bg-slate-800 text-amber-200',
  info: 'border-slate-600 bg-slate-800 text-slate-200'
};

const DOT = {
  success: 'bg-emerald-400',
  error: 'bg-red-400',
  warning: 'bg-amber-400',
  info: 'bg-slate-400'
};

export default function ToastNotification() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    return subscribeToasts((toast) => {
      setToasts((prev) => [toast, ...prev].slice(0, 4));
      const wait = toast.timeout ?? 4500;
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== toast.id));
      }, wait);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(100%-1.5rem,22rem)] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-lg border px-3 py-2.5 text-xs shadow-xl ${STYLES[toast.type] || STYLES.info}`}
          role="status"
        >
          <div className="flex items-start gap-2">
            <span className={`mt-1 size-2 shrink-0 rounded-full ${DOT[toast.type] || DOT.info}`} />
            <p className="break-words">{toast.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
