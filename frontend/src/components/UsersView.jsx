import React, { useEffect, useState } from 'react';
import api from '../services/api';

const ROLE_STYLES = {
  admin: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  operador: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  leitor: 'bg-slate-500/20 text-slate-300 border-slate-500/30'
};

const emptyForm = {
  name: '',
  username: '',
  role: 'leitor',
  password: ''
};

export default function UsersView() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loggedUser = JSON.parse(localStorage.getItem('console_n2_user') || 'null');
  const isAdmin = loggedUser?.role === 'admin';

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.users || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Falha ao listar utilizadores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    fetchUsers();
  }, [isAdmin]);

  const openCreateModal = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setShowModal(true);
    setMessage('');
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      username: user.username,
      role: user.role,
      password: ''
    });
    setShowModal(true);
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      if (editingUser) {
        const payload = { name: form.name, role: form.role };
        if (form.password.trim() !== '') {
          payload.password = form.password;
        }
        await api.put(`/users/${editingUser.id}`, payload);
        setMessage('Utilizador atualizado com sucesso.');
      } else {
        await api.post('/users', form);
        setMessage('Utilizador criado com sucesso.');
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao gravar utilizador.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    const confirmed = window.confirm(`Excluir o utilizador "${user.username}"? Esta ação não pode ser desfeita.`);
    if (!confirmed) return;

    setError('');
    setMessage('');
    try {
      await api.delete(`/users/${user.id}`);
      setMessage('Utilizador removido com sucesso.');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao remover utilizador.');
    }
  };

  const formatDate = (value) => (value ? new Date(value).toLocaleString() : '-');

  if (!isAdmin) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-sm">
        Acesso restrito ao perfil administrador.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-slate-100 break-words">Gerenciamento de Usuários e Perfis</h2>
          <p className="text-[11px] md:text-xs text-slate-400">Controlo de acesso (RBAC): admin, operador e leitor</p>
        </div>
        <button
          onClick={openCreateModal}
          className="self-start sm:self-auto shrink-0 inline-flex items-center justify-center min-h-11 md:min-h-0 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          Novo Utilizador
        </button>
      </div>

      {error && <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-sm">{error}</div>}
      {message && <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded text-sm">{message}</div>}

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-slate-400 text-xs">A carregar utilizadores...</div>
        ) : users.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs">Nenhum utilizador cadastrado.</div>
        ) : (
          <>
            <ul className="md:hidden divide-y divide-slate-700/50">
              {users.map((user) => (
                <li key={user.id} className="p-3.5 space-y-2">
                  <p className="font-semibold text-slate-100 break-words">{user.name}</p>
                  <p className="text-xs font-mono text-slate-400 break-all">{user.username}</p>
                  <span className={`inline-block text-[11px] uppercase font-bold px-2 py-0.5 rounded border ${ROLE_STYLES[user.role] || ROLE_STYLES.leitor}`}>
                    {user.role}
                  </span>
                  <p className="text-[11px] text-slate-500">{formatDate(user.created_at)}</p>
                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      onClick={() => openEditModal(user)}
                      className="w-full min-h-11 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-3 py-2 rounded transition"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(user)}
                      disabled={loggedUser?.id === user.id}
                      className="w-full min-h-11 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-2 rounded transition disabled:opacity-40"
                    >
                      Excluir
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/60 uppercase text-slate-400 font-semibold border-b border-slate-700">
                  <tr>
                    <th className="p-3.5">Nome</th>
                    <th className="p-3.5">Username</th>
                    <th className="p-3.5">Perfil</th>
                    <th className="p-3.5 hidden lg:table-cell">Criado em</th>
                    <th className="p-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-700/20">
                      <td className="p-3.5 text-slate-100">{user.name}</td>
                      <td className="p-3.5 font-mono">{user.username}</td>
                      <td className="p-3.5">
                        <span className={`inline-block text-[11px] uppercase font-bold px-2 py-0.5 rounded border ${ROLE_STYLES[user.role] || ROLE_STYLES.leitor}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="p-3.5 hidden lg:table-cell whitespace-nowrap">{formatDate(user.created_at)}</td>
                      <td className="p-3.5 text-right whitespace-nowrap space-x-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2.5 py-1 rounded transition"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          disabled={loggedUser?.id === user.id}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-1 rounded transition disabled:opacity-40"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-slate-800 p-4 sm:p-6 rounded-xl border border-slate-700 w-full max-w-lg max-h-[90dvh] overflow-y-auto space-y-4">
            <h3 className="text-base sm:text-lg font-bold text-slate-100">
              {editingUser ? 'Editar Utilizador' : 'Novo Utilizador'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 uppercase mb-1">Nome completo</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full min-h-11 bg-slate-900 border border-slate-700 rounded p-2 text-base sm:text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 uppercase mb-1">Username</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full min-h-11 bg-slate-900 border border-slate-700 rounded p-2 text-base sm:text-xs text-slate-100 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                  required
                  disabled={Boolean(editingUser)}
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 uppercase mb-1">Perfil</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full min-h-11 bg-slate-900 border border-slate-700 rounded p-2 text-base sm:text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  required
                >
                  <option value="admin">admin</option>
                  <option value="operador">operador</option>
                  <option value="leitor">leitor</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 uppercase mb-1">
                  {editingUser ? 'Nova senha (opcional)' : 'Senha'}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full min-h-11 bg-slate-900 border border-slate-700 rounded p-2 text-base sm:text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  placeholder={editingUser ? 'Deixe em branco para manter a atual' : ''}
                  required={!editingUser}
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full sm:w-auto min-h-11 sm:min-h-0 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs px-4 py-2 rounded transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto min-h-11 sm:min-h-0 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-5 py-2 rounded transition disabled:opacity-50"
                >
                  {saving ? 'A gravar...' : editingUser ? 'Guardar Alterações' : 'Criar Utilizador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
