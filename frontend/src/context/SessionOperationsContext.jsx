import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { pushToast } from '../services/notifyBus';

const SessionOperationsContext = createContext(null);

export function SessionOperationsProvider({ children }) {
  const [operations, setOperations] = useState([]);
  const operationsRef = useRef(operations);

  const startOperation = useCallback(({ modulo, operacao, detalhe = '' }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const entry = {
      id,
      timestamp: new Date().toISOString(),
      modulo,
      operacao,
      status: 'em_andamento',
      detalhe
    };
    operationsRef.current = [entry, ...operationsRef.current].slice(0, 40);
    setOperations(operationsRef.current);
    return id;
  }, []);

  const finishOperation = useCallback((id, { status, detalhe }) => {
    const entry = operationsRef.current.find((op) => op.id === id);
    if (!entry) return;

    const current = { ...entry, status, detalhe: detalhe ?? entry.detalhe };
    operationsRef.current = operationsRef.current.map((op) => op.id === id ? current : op);
    setOperations(operationsRef.current);

    const message = `${current.operacao}: ${current.detalhe || current.operacao}`;
    if (status === 'concluido') {
      pushToast({ type: 'success', message });
    } else if (status === 'falha') {
      pushToast({ type: 'error', message });
    }
  }, []);

  const value = useMemo(
    () => ({ operations, startOperation, finishOperation }),
    [operations, startOperation, finishOperation]
  );

  return (
    <SessionOperationsContext.Provider value={value}>
      {children}
    </SessionOperationsContext.Provider>
  );
}

export function useSessionOperations() {
  const ctx = useContext(SessionOperationsContext);
  if (!ctx) {
    throw new Error('useSessionOperations deve ser usado dentro de SessionOperationsProvider');
  }
  return ctx;
}
