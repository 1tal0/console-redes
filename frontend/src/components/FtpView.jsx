import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function FtpView() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [integrityResult, setIntegrityResult] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchFiles = async () => {
    try {
      const res = await api.get('/files');
      setFiles(res.data.files || []);
      setError('');
    } catch (err) {
      setError('Falha ao obter a lista de ficheiros do servidor FTP.');
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
    setError('');
    setMessage('');

    try {
      const res = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage(`Ficheiro enviado com sucesso! SHA-256: ${res.data.integrity.originalHash}`);
      setSelectedFile(null);
      fetchFiles();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao efetuar upload por FTP.');
    } finally {
      setUploading(false);
    }
  };

  const verifyIntegrity = async (filename) => {
    try {
      const res = await api.get(`/files/integrity/${encodeURIComponent(filename)}`);
      setIntegrityResult(res.data);
    } catch (err) {
      alert('Erro ao verificar integridade do ficheiro.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-100">Gestão de Ficheiros via FTP (vsftpd)</h2>
        <button 
          onClick={fetchFiles}
          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded transition"
        >
          Atualizar Lista
        </button>
      </div>

      {error && <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-sm">{error}</div>}
      {message && <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded text-sm">{message}</div>}

      {/* Formulário de Upload */}
      <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
        <h3 className="text-sm font-semibold uppercase text-slate-400 mb-3">Upload de Ficheiro com SHA-256</h3>
        <form onSubmit={handleFileUpload} className="flex flex-col md:flex-row gap-4 items-center">
          <input
            type="file"
            onChange={(e) => setSelectedFile(e.target.files[0])}
            className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
          />
          <button
            type="submit"
            disabled={uploading || !selectedFile}
            className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-2 rounded text-xs transition disabled:opacity-50"
          >
            {uploading ? 'A Enviar...' : 'Enviar por FTP'}
          </button>
        </form>
      </div>

      {/* Tabela de Ficheiros */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-slate-400">A carregar ficheiros...</div>
        ) : files.length === 0 ? (
          <div className="p-6 text-center text-slate-400">Nenhum ficheiro encontrado na diretoria `/srv/portal/arquivos`.</div>
        ) : (
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/60 uppercase text-slate-400 font-semibold border-b border-slate-700">
              <tr>
                <th className="p-3.5">Nome do Ficheiro</th>
                <th className="p-3.5">Tamanho</th>
                <th className="p-3.5">Última Modificação</th>
                <th className="p-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {files.map((file, idx) => (
                <tr key={idx} className="hover:bg-slate-700/20">
                  <td className="p-3.5 font-mono text-slate-100">{file.name}</td>
                  <td className="p-3.5">{(file.size / 1024).toFixed(2)} KB</td>
                  <td className="p-3.5">{new Date(file.modifiedAt).toLocaleString()}</td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => verifyIntegrity(file.name)}
                      className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2.5 py-1 rounded transition"
                    >
                      Verificar SHA-256
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de Validação de SHA-256 */}
      {integrityResult && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 max-w-lg w-full space-y-4">
            <h3 className="text-lg font-bold text-slate-100">Integridade SHA-256 do Ficheiro</h3>
            <p className="text-xs text-slate-400 font-mono">Ficheiro: {integrityResult.filename}</p>

            <div className="bg-slate-900 p-3 rounded border border-slate-700/50 space-y-2">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Hash Computado no Servidor:</span>
                <span className="text-xs font-mono text-emerald-400 break-all">{integrityResult.sha256}</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setIntegrityResult(null)}
                className="bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs px-4 py-2 rounded transition"
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