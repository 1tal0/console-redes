import React, { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { useSessionOperations } from '../context/SessionOperationsContext';
import ServiceCards from './ServiceCards';

const STOP_WARNINGS = {
  ssh: 'Parar o SSH bloqueará novas conexões SSH até que o serviço seja iniciado novamente pelo painel ou pelo console local. Deseja continuar?',
  apache2: 'Parar o Apache deixará os sites atendidos pelo serviço indisponíveis. Deseja continuar?'
};

export default function ServicesView({ active }) {
  const { startOperation, finishOperation } = useSessionOperations();
  const [services, setServices] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const pending = useRef({});
  const [pendingActions, setPendingActions] = useState({});
  const generation = useRef(0);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let timer;

    async function fetchServices() {
      const version = generation.current;
      try {
        const { data } = await api.get('/metrics');
        if (!cancelled && version === generation.current) {
          setServices(data.services);
          setLoadError(false);
        }
      } catch {
        if (!cancelled && version === generation.current) setLoadError(true);
      } finally {
        if (!cancelled) timer = window.setTimeout(fetchServices, 5000);
      }
    }

    void fetchServices();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [active, refresh]);

  async function executeServiceAction(serviceName, action, label) {
    if (pending.current[serviceName] || loadError) return;
    const warning = action === 'stop' && STOP_WARNINGS[serviceName];
    if (warning && !window.confirm(warning)) return;

    const updatePending = (value) => {
      pending.current = { ...pending.current, [serviceName]: value };
      setPendingActions(pending.current);
    };
    updatePending(action);
    const operationId = startOperation({
      modulo: 'Gestão de Serviços',
      operacao: `${label} ${serviceName}`,
      detalhe: 'Aguardando resposta do systemctl.'
    });

    try {
      const { data } = await api.post(`/services/${serviceName}/${action}`, null, { timeout: 130000 });
      const { state, activeState, subState } = data;
      generation.current += 1;
      setServices(previous => ({ ...previous, [serviceName]: { state, activeState, subState } }));
      finishOperation(operationId, {
        status: 'concluido',
        detalhe: `Estado atual: ${activeState} (${subState}).`
      });
    } catch (error) {
      finishOperation(operationId, {
        status: 'falha',
        detalhe: error.response?.data?.error || 'Falha de comunicação. Confira o estado atual do serviço.'
      });
    } finally {
      setRefresh(previous => previous + 1);
      updatePending(undefined);
    }
  }

  return (
    <section hidden={!active} className="bg-slate-800 rounded-xl border border-slate-700 p-4 md:p-5">
      <h2 className="text-lg md:text-xl font-bold text-slate-100 mb-4">Gestão de Serviços</h2>
      {loadError && (
        <p role="alert" className="text-sm text-amber-300 mb-4">Não foi possível atualizar o estado dos serviços.</p>
      )}
      {services ? (
        <ServiceCards services={services} pendingActions={pendingActions} onAction={executeServiceAction} stale={loadError} />
      ) : !loadError && (
        <p role="status" className="text-sm text-slate-300">Carregando estado dos serviços…</p>
      )}
    </section>
  );
}
