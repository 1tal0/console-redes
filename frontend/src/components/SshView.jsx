import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function SshView() {
  const [sshInfo, setSshInfo] = useState(null);
  const [newHostname, setNewHostname] = useState('servidor-n2-teste');
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const fetchSshInfo = async () => {
    try {
      const res = await api.get('/ssh/info');
      setSshInfo(res.data);
      setError('');
    } catch (err) {
      setError('Falha ao obter informações via SSH.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSshInfo();
  }, []);

  const handleHostnameChange = async (e) => {
    e.preventDefault();
    setExecuting(true);
    setError('');
    setResult(null);

    try {
      const res = await api.post('/ssh/hostname', { newHostname });
      setResult(res.data.result);
      fetchSshInfo();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao alterar hostname via SSH.');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4">
        <h2 className="text-xl font-bold text-slate-100">Operação SSH e Gestão do Hostname</h2>
        <p className="text-xs text-slate-400">
          Ligação cifrada via chave estática <code className="text-indigo-400">id_ed25519_redes_n1</code> ao utilizador <code className="text-indigo-400">administrador</code>.
        </p>

        {loading ? (
          <div className="text-xs text-slate-400">A verificar estado da sessão SSH...</div>
        ) : sshInfo && (
          <div className="grid grid-cols-2 gap-4 bg-slate-900 p-4 rounded-lg border border-slate-700/50">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Utilizador SSH Ativo</span>
              <span className="text-sm font-bold text-emerald-400">{sshInfo.user}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Hostname Estático Atual</span>
              <span className="text-sm font-mono text-slate-100">{sshInfo.hostname}</span>
            </div>
          </div>
        )}
      </div>

      {/* Formulário de Alteração Reversível */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4">
        <h3 className="text-sm font-semibold uppercase text-slate-300">Alteração Reversível do Hostname</h3>

        {error && <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-xs">{error}</div>}

        <form onSubmit={handleHostnameChange} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Novo Nome do Host (Temporário)</label>
            <input
              type="text"
              value={newHostname}
              onChange={(e) => setNewHostname(e.target.value)}
              pattern="^[a-zA-Z0-9-]+$"
              className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
              placeholder="ex: servidor-n2-teste"
              required
            />
            <span className="text-[10px] text-slate-500">Permitidos apenas letras, números e hífens.</span>
          </div>

          <button
            type="submit"
            disabled={executing}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded text-xs transition disabled:opacity-50"
          >
            {executing ? 'A Executar Operação SSH...' : 'Executar Alteração e Restauração Automática'}
          </button>
        </form>

        {/* Confirmação do Resultado */}
        {result && (
          <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg space-y-2">
            <p className="text-xs font-bold text-emerald-400 flex items-center gap-2">
              ✓ Operação Reversível Concluída com Sucesso!
            </p>
            <div className="text-xs text-slate-300 font-mono space-y-1">
              <p>1. Nome Original: <span className="text-slate-100">{result.originalHostname}</span></p>
              <p>2. Nome Aplicado: <span className="text-amber-400">{result.tempHostnameApplied}</span></p>
              <p>3. Nome Restaurado: <span className="text-emerald-400">{result.restoredHostname}</span></p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}