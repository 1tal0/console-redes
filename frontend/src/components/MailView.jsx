import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function MailView() {
  const [account, setAccount] = useState('aluno@empresa.test');
  const [password, setPassword] = useState('aluno');
  const [folder, setFolder] = useState('INBOX');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Estado do Formulário de Envio
  const [to, setTo] = useState('suporte@empresa.test');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState('');

  const fetchEmails = async () => {
    if (!password) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/mail', {
        params: { account, password, folder }
      });
      setMessages(res.data.messages || []);
    } catch (err) {
      setError('Falha ao autenticar ou consultar as mensagens no Dovecot.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, [account, folder]);

  const handleSendEmail = async (e) => {
    e.preventDefault();
    setSending(true);
    setSendResult('');
    try {
      await api.post('/mail/send', { account, password, to, subject, bodyText });
      setSendResult('E-mail enviado via SMTP e guardado na pasta Sent do IMAP!');
      setSubject('');
      setBodyText('');
      if (folder === 'Sent') fetchEmails();
    } catch (err) {
      setSendResult('Erro no envio via SMTP.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Formulário de Autenticação de Conta & Envio SMTP */}
      <div className="space-y-4 md:col-span-1">
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-3">
          <h3 className="text-sm font-semibold uppercase text-slate-400">Conta de Correio</h3>
          <div>
            <label className="block text-[10px] text-slate-400 uppercase mb-1">Selecionar Conta</label>
            <select
              value={account}
              onChange={(e) => {
                const acc = e.target.value;
                setAccount(acc);
                setPassword(acc.startsWith('aluno') ? 'aluno' : 'suporte');
                setTo(acc.startsWith('aluno') ? 'suporte@empresa.test' : 'aluno@empresa.test');
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-100"
            >
              <option value="aluno@empresa.test">aluno@empresa.test</option>
              <option value="suporte@empresa.test">suporte@empresa.test</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 uppercase mb-1">Palavra-passe PAM</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-100"
            />
          </div>

          <button
            onClick={fetchEmails}
            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs py-2 rounded transition"
          >
            Sincronizar Caixa IMAP
          </button>
        </div>

        {/* Novo E-mail */}
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-3">
          <h3 className="text-sm font-semibold uppercase text-slate-400">Nova Mensagem (SMTP)</h3>
          {sendResult && <p className="text-xs text-emerald-400 bg-emerald-500/10 p-2 rounded border border-emerald-500/20">{sendResult}</p>}
          <form onSubmit={handleSendEmail} className="space-y-3">
            <div>
              <input
                type="email"
                placeholder="Para: destinatario@empresa.test"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-100"
                required
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Assunto"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-100"
                required
              />
            </div>
            <div>
              <textarea
                placeholder="Mensagem..."
                rows="4"
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-100 resize-none"
                required
              ></textarea>
            </div>
            <button
              type="submit"
              disabled={sending}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium py-2 rounded transition disabled:opacity-50"
            >
              {sending ? 'A Enviar...' : 'Enviar E-mail'}
            </button>
          </form>
        </div>
      </div>

      {/* Listagem de E-mails IMAP */}
      <div className="md:col-span-2 space-y-4">
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setFolder('INBOX')}
              className={`px-3 py-1.5 rounded text-xs font-semibold ${folder === 'INBOX' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}
            >
              Caixa de Entrada (INBOX)
            </button>
            <button
              onClick={() => setFolder('Sent')}
              className={`px-3 py-1.5 rounded text-xs font-semibold ${folder === 'Sent' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}
            >
              Enviados (Sent)
            </button>
          </div>
          <span className="text-xs text-slate-400">{messages.length} mensagens</span>
        </div>

        {error && <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-sm">{error}</div>}

        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          {loading ? (
            <div className="p-6 text-center text-slate-400 text-xs">A ligar ao Dovecot e a ler a caixa de correio...</div>
          ) : messages.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">Nenhuma mensagem nesta pasta.</div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {messages.map((msg, idx) => (
                <div key={idx} className="p-4 hover:bg-slate-700/20 transition space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-200">De: {msg.from}</span>
                    <span className="text-[10px] text-slate-500">{new Date(msg.date).toLocaleString()}</span>
                  </div>
                  <p className="text-xs font-medium text-indigo-400">Assunto: {msg.subject}</p>
                  <p className="text-[11px] text-slate-400">Para: {msg.to}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}