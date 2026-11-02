import React, { useState, useEffect } from 'react';
import api from '../services/api';

const FTP_MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

// Converte datas do LIST do vsftpd (ex.: "Oct 30 21:53" ou "Oct 30 2024")
function formatFtpDate(value) {
  if (!value) return '-';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toLocaleString('pt-BR');
  }

  const raw = String(value).trim();
  const match = raw.match(/^([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4}|\d{1,2}:\d{2}(?::\d{2})?)$/);

  if (match) {
    const month = FTP_MONTHS[match[1].toLowerCase()];
    const day = Number(match[2]);
    const now = new Date();
    let year = now.getFullYear();
    let hours = 0;
    let minutes = 0;
    let seconds = 0;

    if (month === undefined) return raw;

    if (match[3].includes(':')) {
      const parts = match[3].split(':').map(Number);
      hours = parts[0];
      minutes = parts[1];
      seconds = parts[2] || 0;
      const candidate = new Date(year, month, day, hours, minutes, seconds);
      if (candidate.getTime() > now.getTime() + 24 * 60 * 60 * 1000) {
        year -= 1;
      }
    } else {
      year = Number(match[3]);
    }

    const parsed = new Date(year, month, day, hours, minutes, seconds);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleString('pt-BR');
    }
  }

  const fallback = new Date(raw);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback.toLocaleString('pt-BR');
  }
  return raw;
}

export default function FtpView() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [integrityResult, setIntegrityResult] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const loggedUser = JSON.parse(localStorage.getItem('console_n2_user') || 'null');
  const canUpload = loggedUser?.role === 'admin' || loggedUser?.role === 'operador';

  const fetchFiles = async () => {
    try {
      const res = await api.get('/files');
      setFiles(res.data.files || []);
      setError('');
    } catch (err) {
      setError('Falha ao obter a lista de arquivos do servidor FTP vsftpd.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    setUploading(true);
    setUploadProgress(0);
    setError('');
    setMessage('');

    try {
      const res = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        }
      });

      setMessage(`Arquivo enviado via FTP com sucesso! SHA-256: ${res.data.sha256}`);
      setSelectedFile(null);
      fetchFiles();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao efetuar upload por FTP.');
    } finally {
      setUploading(false);
    }
  };

  // Download do arquivo diretamente via API do Console (FTP stream)
  const downloadConsoleFile = async (filename) => {
    try {
      const response = await api.get(`/files/download/${encodeURIComponent(filename)}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Erro ao realizar download via console FTP.');
    }
  };

  // Verificação de integridade e publicação no Apache HTTP
  const verifyIntegrity = async (filename) => {
    try {
      const res = await api.get(`/files/integrity/${encodeURIComponent(filename)}`);
      setIntegrityResult(res.data);
    } catch (err) {
      alert('Erro ao verificar publicação e integridade.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-slate-100 break-words">Gestão de Arquivos via FTP (vsftpd)</h2>
          <p className="text-[11px] md:text-xs text-slate-400 font-mono break-words">Diretório: /srv/portal/arquivos | Apache: http://site.empresa.test/arquivos/</p>
        </div>
        <button 
          onClick={fetchFiles}
          className="self-start sm:self-auto shrink-0 inline-flex items-center justify-center min-h-11 md:min-h-0 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 md:py-1.5 rounded transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          Atualizar Lista
        </button>
      </div>

      {error && <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-sm">{error}</div>}
      {message && <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded text-sm">{message}</div>}

      {/* Formulário de Upload: oculto para o perfil leitor */}
      {canUpload && (
      <div className="bg-slate-800 p-4 md:p-5 rounded-xl border border-slate-700 space-y-3">
        <h3 className="text-sm font-semibold uppercase text-slate-400">Upload de Arquivo via FTP Passivo</h3>
        <form onSubmit={handleFileUpload} className="flex flex-col md:flex-row gap-4 md:items-center">
          <input
            type="file"
            onChange={(e) => setSelectedFile(e.target.files[0])}
            className="block w-full min-w-0 max-w-full text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          />
          <button
            type="submit"
            disabled={uploading || !selectedFile}
            className="w-full md:w-auto shrink-0 inline-flex items-center justify-center min-h-11 md:min-h-0 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-2 rounded text-xs transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            {uploading ? 'Enviando ao FTP...' : 'Enviar por FTP'}
          </button>
        </form>

        {uploading && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Progresso da Transferência FTP</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
              <div className="bg-indigo-500 h-full transition-all duration-200" style={{ width: `${uploadProgress}%` }}></div>
            </div>
          </div>
        )}
      </div>

      )}

      {/* Tabela de Arquivos Remotos */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-slate-400 text-xs">Conectando ao FTP e listando arquivos...</div>
        ) : files.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs">Nenhum arquivo no repositório FTP.</div>
        ) : (
          <>
            {/* Celular: lista em cards empilhados (evita tabela ilegível em 320px) */}
            <ul className="md:hidden divide-y divide-slate-700/50">
              {files.map((file, idx) => (
                <li key={idx} className="p-3.5 space-y-2">
                  <p className="font-mono text-slate-100 break-all">{file.name}</p>
                  <p className="text-[11px] text-slate-400">{(file.size / 1024).toFixed(2)} KB</p>
                  <p className="text-[11px] text-slate-500 break-words">{formatFtpDate(file.modifiedAt)}</p>
                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      onClick={() => downloadConsoleFile(file.name)}
                      className="w-full min-h-11 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-3 py-2 rounded transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => verifyIntegrity(file.name)}
                      className="w-full min-h-11 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                    >
                      Integridade SHA-256
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop: tabela com rolagem interna própria */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs text-slate-300">
                <thead className="bg-slate-900/60 uppercase text-slate-400 font-semibold border-b border-slate-700">
                  <tr>
                    <th className="p-3.5">Nome do Arquivo</th>
                    <th className="p-3.5">Tamanho</th>
                    <th className="p-3.5 hidden lg:table-cell">Modificado</th>
                    <th className="p-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {files.map((file, idx) => (
                    <tr key={idx} className="hover:bg-slate-700/20">
                      <td className="p-3.5 font-mono text-slate-100 break-all">{file.name}</td>
                      <td className="p-3.5 whitespace-nowrap">{(file.size / 1024).toFixed(2)} KB</td>
                      <td className="p-3.5 whitespace-nowrap hidden lg:table-cell">
                        {formatFtpDate(file.modifiedAt)}
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap space-x-2">
                        <button
                          onClick={() => downloadConsoleFile(file.name)}
                          className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2.5 py-1 rounded transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                        >
                          Download
                        </button>
                        <button
                          onClick={() => verifyIntegrity(file.name)}
                          className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                        >
                          Integridade SHA-256
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

      {/* Modal de Validação HTTP e SHA-256 */}
      {integrityResult && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-slate-800 p-4 sm:p-6 rounded-xl border border-slate-700 w-full max-w-lg max-h-[90dvh] overflow-y-auto space-y-4">
            <h3 className="text-base sm:text-lg font-bold text-slate-100 break-words">Validação HTTP Apache e SHA-256</h3>
            
            <div className="bg-slate-900 p-4 rounded border border-slate-700/50 space-y-3 font-mono text-xs">
              <div>
                <span className="text-[11px] text-slate-500 uppercase block">Arquivo Remoto:</span>
                <span className="text-slate-200 break-all">{integrityResult.filename}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 uppercase block">Endereço HTTP (Publicação):</span>
                <a href={integrityResult.httpUrl} target="_blank" rel="noreferrer" className="text-indigo-400 underline break-all">
                  {integrityResult.httpUrl}
                </a>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 uppercase block">Hash SHA-256 Recusado do Servidor HTTP:</span>
                <span className="text-emerald-400 break-all">{integrityResult.sha256}</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setIntegrityResult(null)}
                className="w-full sm:w-auto min-h-11 sm:min-h-0 bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs px-4 py-2 rounded transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}