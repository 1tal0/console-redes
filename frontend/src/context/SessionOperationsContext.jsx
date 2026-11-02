import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const SessionOperationsContext = createContext(null);

export function SessionOperationsProvider({ children }) {
  const [operations, setOperations] = useState([]);

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
    setOperations((prev) => [entry, ...prev].slice(0, 40));
    return id;
  }, []);

  const finishOperation = useCallback((id, { status, detalhe }) => {
    if (!id) return;
    setOperations((prev) =>
      prev.map((op) =>
        op.id === id
          ? { ...op, status, detalhe: detalhe != null ? detalhe : op.detalhe }
          : op
      )
    );
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
