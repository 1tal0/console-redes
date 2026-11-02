import React, { useState } from 'react';
import api from '../services/api';
import { Mail, Mails, Send, SendHorizontal, CloudSync, Reply, X } from 'lucide-react';
import { formatDateTime } from '../utils/formatDate';
import { useSessionOperations } from '../context/SessionOperationsContext';

// Formata datas; evita exibir 1970 quando a mensagem não tem data
const formatDate = (date) => formatDateTime(date);

export default function MailView() {
  const { startOperation, finishOperation } = useSessionOperations();
  // Estado da Sessão do Cliente de E-mail
  const [session, setSession] = useState(null); // { account, password }
  const [loginEmail, setLoginEmail] = useState('aluno@empresa.test');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [authenticating, setAuthenticating] = useState(false);

  // Estado das Mensagens e Navegação Thunderbird
  const [folder, setFolder] = useState('INBOX');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMail, setSelectedMail] = useState(null); // E-mail aberto no Modal
  const [loadingBody, setLoadingBody] = useState(false);

  // Estado de Composição / Resposta
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // 1. Login na Conta de E-mail (Dovecot IMAP)
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setAuthenticating(true);

    try {
      const res = await api.get('/mail', {
        params: { account: loginEmail, folder: 'INBOX' },
        headers: { 'X-Mail-Password': loginPassword }
      });

      setSession({ account: loginEmail, password: loginPassword });
      setMessages(res.data.messages || []);
      setFolder('INBOX');
    } catch (err) {
      setLoginError(err.response?.data?.error || 'Erro ao autenticar no servidor Dovecot.');
    } finally {
      setAuthenticating(false);
    }
  };

  // 2. Encerrar Sessão da Conta
  const handleLogoutMail = () => {
    setSession(null);
    setLoginPassword('');
    setMessages([]);
    setSelectedMail(null);
  };

  // 3. Buscar Mensagens ao Mudar de Pasta
  const loadFolder = async (targetFolder) => {
    if (!session) return;
    setLoading(true);
    setFolder(targetFolder);
    setMessages([]);
    setSelectedMail(null);

    try {
      const res = await api.get('/mail', {
        params: { account: session.account, folder: targetFolder },
        headers: { 'X-Mail-Password': session.password }
      });
      setMessages(res.data.messages || []);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao carregar mensagens da pasta.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Abrir um E-mail (a lista traz só os cabeçalhos; o corpo é buscado pelo UID)
  const openMail = async (mail) => {
    setSelectedMail({ ...mail, text: '' });
    setLoadingBody(true);

    try {
      const res = await api.get('/mail/message', {
        params: { account: session.account, folder, uid: mail.uid },
        headers: { 'X-Mail-Password': session.password }
      });
      setSelectedMail(res.data.message);
    } catch (err) {
      setSelectedMail({ ...mail, text: '(Erro ao carregar o corpo da mensagem.)' });
    } finally {
      setLoadingBody(false);
    }
  };

  // 5. Iniciar Resposta Direta a um E-mail
  const handleReply = (mail) => {
    // Na pasta Sent, responder significa escrever de novo ao destinatário
    const replyTo = folder === 'Sent'
      ? (mail.toAddress || '').split(',')[0].trim()
      : (mail.fromAddress || '').split(',')[0].trim();

    const quoted = (mail.text || '')
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n');

    setTo(replyTo);
    setSubject(mail.subject.startsWith('Re:') ? mail.subject : `Re: ${mail.subject}`);
    setBodyText(`\n\n--- Em ${formatDate(mail.date)}, ${mail.from} escreveu:\n${quoted}`);
    setSelectedMail(null);
    setShowComposeModal(true);
  };

  // 6. Enviar Mensagem via SMTP
  const handleSendEmail = async (e) => {
    e.preventDefault();
    setSending(true);
    setStatusMessage('');

    const opId = startOperation({
      modulo: 'E-mail',
      operacao: 'Envio SMTP',
      detalhe: `Para ${to} · ${subject}`
    });

    try {
      const res = await api.post('/mail/send', {
        account: session.account,
        password: session.password,
        to,
        subject,
        bodyText
      });

      // Se o e-mail saiu mas a cópia no Sent falhou, mostra o aviso
      const detail = res.data.warning || `Enviado para ${to}`;
      finishOperation(opId, { status: 'concluido', detalhe: detail });
      setStatusMessage(res.data.warning || 'E-mail enviado com sucesso via SMTP!');
      setTimeout(() => {
        setShowComposeModal(false);
        setStatusMessage('');
        setTo('');
        setSubject('');
        setBodyText('');
        if (folder === 'Sent') loadFolder('Sent');
      }, res.data.warning ? 3500 : 1200);
    } catch (err) {
      const msg = err.response?.data?.error || 'Falha ao enviar e-mail via Postfix.';
      finishOperation(opId, { status: 'falha', detalhe: msg });
      alert(msg);
    } finally {
      setSending(false);
    }
  };

  // TELA DE LOGIN ESTILO THUNDERBIRD
  if (!session) {
    return (
      <div className="w-full max-w-md mx-auto my-4 sm:my-10 bg-slate-800 p-4 sm:p-8 rounded-xl border border-slate-700 shadow-xl space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex p-3 bg-indigo-500/10 rounded-full text-indigo-400 mb-2">
            <Mail className="size-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Cliente de Correio</h2>
          <p className="text-xs text-slate-400">Insira as credenciais Linux (PAM) para aceder à conta</p>
        </div>

        {loginError && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded text-center">
            {loginError}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Endereço de E-mail</label>
            <select
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="w-full min-h-11 bg-slate-900 border border-slate-700 rounded p-2.5 text-base sm:text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <option value="aluno@empresa.test">aluno@empresa.test</option>
              <option value="suporte@empresa.test">suporte@empresa.test</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Palavra-passe</label>
            <input
              type="password"
              placeholder="Digite a palavra-passe..."
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full min-h-11 bg-slate-900 border border-slate-700 rounded p-2.5 text-base sm:text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-400"
              required
            />
          </div>

          <button
            type="submit"
            disabled={authenticating}
            className="w-full min-h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded text-xs transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            {authenticating ? 'A autenticar no Dovecot...' : 'Acessar'}
          </button>
        </form>
      </div>
    );
  }

  // PAINEL DE E-MAIL ESTILO THUNDERBIRD APÓS LOGIN
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-2xl min-h-[400px] md:min-h-[550px] flex flex-col">
      {/* Barra de Ferramentas Superior Thunderbird */}
      <div className="bg-slate-900/80 border-b border-slate-700 px-3 py-3 md:px-5 flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setTo('');
              setSubject('');
              setBodyText('');
              setShowComposeModal(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap min-h-11 md:min-h-0 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <Send className="size-3.5 shrink-0" />
            Escrever Mensagem
          </button>
          <button
            onClick={() => loadFolder(folder)}
            className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap min-h-11 md:min-h-0 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs px-3 py-2 rounded transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <CloudSync className="size-3.5 shrink-0" />
            Sincronizar
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 md:gap-4">
          <span className="text-[11px] md:text-xs text-indigo-400 font-mono bg-indigo-500/10 px-3 py-1 rounded border border-indigo-500/20 break-all">
            {session.account}
          </span>
          <button
            onClick={handleLogoutMail}
            className="inline-flex items-center justify-center min-h-11 md:min-h-0 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-2 md:py-1.5 rounded transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            Sair da Conta
          </button>
        </div>
      </div>

      {/* Estrutura Principal: Arvore de Pastas + Lista de E-mails */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Painel Lateral de Pastas */}
        <div className="w-full md:w-56 shrink-0 bg-slate-900/40 border-b md:border-b-0 md:border-r border-slate-700/60 p-3 md:p-4 space-y-2">
          <p className="text-[11px] md:text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 md:mb-3 px-2">Pastas de Correio</p>
          <button
            onClick={() => loadFolder('INBOX')}
            className={`w-full min-h-11 md:min-h-0 text-left px-3 py-2 rounded text-xs font-semibold flex justify-between items-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
              folder === 'INBOX' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700/40'
            }`}
          >
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap min-w-0">
              <Mails className="size-3.5 shrink-0" />
              Entrada (INBOX)
            </span>
          </button>
          <button
            onClick={() => loadFolder('Sent')}
            className={`w-full min-h-11 md:min-h-0 text-left px-3 py-2 rounded text-xs font-semibold flex justify-between items-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
              folder === 'Sent' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700/40'
            }`}
          >
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap min-w-0">
              <SendHorizontal className="size-3.5 shrink-0" />
              Enviados (Sent)
            </span>
          </button>
        </div>

        {/* Tabela / Lista de Mensagens */}
        <div className="flex-1 bg-slate-800 flex flex-col">
          {loading ? (
            <div className="p-10 text-center text-slate-400 text-xs">A ler mensagens do servidor IMAP...</div>
          ) : messages.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs">Nenhum e-mail encontrado na pasta {folder}.</div>
          ) : (
            <>
              <div className="px-3 md:px-4 py-2 text-[11px] text-slate-400 border-b border-slate-700/50">
                {messages.length} mensagem(ns) em {folder}
              </div>

              {/* Celular: cada mensagem vira um card tocável */}
              <ul className="md:hidden divide-y divide-slate-700/50 flex-1">
                {messages.map((mail) => (
                  <li key={mail.uid}>
                    <button
                      type="button"
                      onClick={() => openMail(mail)}
                      className="w-full text-left p-3 min-h-11 hover:bg-indigo-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400 transition"
                    >
                      <p className="text-[11px] text-slate-400 break-all">
                        {folder === 'INBOX' ? mail.from : mail.to}
                      </p>
                      <p className="text-xs font-semibold text-slate-100 mt-0.5 break-words">
                        {mail.subject}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">{formatDate(mail.date)}</p>
                    </button>
                  </li>
                ))}
              </ul>

              {/* Desktop: tabela com rolagem interna */}
              <div className="hidden md:block overflow-x-auto flex-1">
                <table className="w-full table-fixed text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/60 uppercase text-slate-400 font-semibold border-b border-slate-700">
                    <tr>
                      <th className="p-3 w-[30%]">De / Para</th>
                      <th className="p-3">Assunto</th>
                      <th className="p-3 text-right w-[18%]">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {messages.map((mail) => (
                      <tr
                        key={mail.uid}
                        onClick={() => openMail(mail)}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openMail(mail);
                          }
                        }}
                        className="hover:bg-indigo-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400 cursor-pointer transition"
                      >
                        <td className="p-3 font-semibold text-slate-200 min-w-0 truncate">
                          {folder === 'INBOX' ? mail.from : mail.to}
                        </td>
                        <td className="p-3 font-medium text-slate-100 min-w-0 truncate">
                          {mail.subject}
                        </td>
                        <td className="p-3 text-right text-slate-400 text-[11px] whitespace-nowrap">
                          {formatDate(mail.date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL DE LEITURA COMPLETA DO E-MAIL */}
      {selectedMail && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-slate-800 p-4 sm:p-6 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[90dvh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex justify-between items-start gap-3 border-b border-slate-700 pb-3">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-100 break-words">{selectedMail.subject}</h3>
                <p className="text-xs text-indigo-400 mt-1 break-all">De: {selectedMail.from}</p>
                <p className="text-[11px] text-slate-400 break-words">Para: {selectedMail.to} | {formatDate(selectedMail.date)}</p>
              </div>
              <button
                onClick={() => setSelectedMail(null)}
                aria-label="Fechar mensagem"
                className="shrink-0 inline-flex items-center justify-center w-11 h-11 md:w-auto md:h-auto text-slate-400 hover:text-slate-200 text-sm font-bold rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Corpo do E-mail */}
            <div className="bg-slate-900 p-3 sm:p-4 rounded-lg border border-slate-700/60 max-h-64 overflow-y-auto overflow-x-auto text-xs font-mono text-slate-200 whitespace-pre-wrap break-words">
              {loadingBody
                ? 'A carregar mensagem...'
                : selectedMail.text || '(Mensagem sem corpo de texto)'}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-between items-stretch sm:items-center gap-2 pt-2">
              <button
                onClick={() => handleReply(selectedMail)}
                disabled={loadingBody}
                className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap min-h-11 sm:min-h-0 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-4 py-2 rounded transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                <Reply className="size-3.5 shrink-0" />
                Responder Mensagem
              </button>

              <button
                onClick={() => setSelectedMail(null)}
                className="min-h-11 sm:min-h-0 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs px-4 py-2 rounded transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE COMPOSIÇÃO / RESPOSTA DE E-MAIL */}
      {showComposeModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-slate-800 p-4 sm:p-6 rounded-xl border border-slate-700 w-full max-w-lg max-h-[90dvh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex justify-between items-center gap-3 border-b border-slate-700 pb-3">
              <h3 className="text-sm font-bold text-slate-100 break-words">Nova Mensagem de Correio</h3>
              <button
                onClick={() => setShowComposeModal(false)}
                aria-label="Fechar janela de composição"
                className="shrink-0 inline-flex items-center justify-center w-11 h-11 md:w-auto md:h-auto text-slate-400 hover:text-slate-200 text-sm font-bold rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                <X className="size-4" />
              </button>
            </div>

            {statusMessage && (
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded text-center break-words">
                {statusMessage}
              </div>
            )}

            <form onSubmit={handleSendEmail} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 uppercase mb-1">Para</label>
                <input
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full min-h-11 bg-slate-900 border border-slate-700 rounded p-2 text-base sm:text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-400"
                  placeholder="destinatario@empresa.test"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 uppercase mb-1">Assunto</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full min-h-11 bg-slate-900 border border-slate-700 rounded p-2 text-base sm:text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-400"
                  placeholder="Assunto da mensagem"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 uppercase mb-1">Corpo da Mensagem</label>
                <textarea
                  rows="6"
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-base sm:text-xs text-slate-100 font-mono resize-none focus:outline-none focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-400"
                  placeholder="Escreva aqui a sua mensagem..."
                  required
                ></textarea>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowComposeModal(false)}
                  className="w-full sm:w-auto min-h-11 sm:min-h-0 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs px-4 py-2 rounded transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full sm:w-auto min-h-11 sm:min-h-0 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-5 py-2 rounded transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  {sending ? 'A enviar...' : 'Enviar Mensagem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}