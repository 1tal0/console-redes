# Ficha de Verificação — Parte 1 (Seções 8.1 e 8.2)

| Campo | Valor |
| --- | --- |
| Projeto | Console Integrado de Serviços N2 — Parte 1 |
| Aluno | Ítalo Renan Ferreira de Queiroz |
| Disciplina | Redes de Computadores II — IFCE Campus Acopiara |
| Servidor | Debian 13 `192.168.100.10` |
| Cliente | Ubuntu `192.168.100.20` (navegador) |
| Console | `http://192.168.100.10:5173` → API `http://192.168.100.10:3000/api` |
| Data da verificação | 2026-11-11 |

**Critério:** cada linha é **OK** somente se o console (não só o terminal) reproduzir o comportamento. Falhas demonstradas com entrada inválida, perfil sem permissão ou teste de ligação controlado — **sem** interromper serviços nesta parte.

---

## Teste 1 — HTTP e observabilidade Apache

| Item | Esperado | Resultado observado | Status |
| --- | --- | --- | --- |
| URL do site | `http://site.empresa.test/` e `http://192.168.100.10/` | Link no dashboard abre o site Apache numa nova aba | OK |
| Código HTTP | `200` | Painel: **HTTP 200** | OK |
| Latência | duração em ms, ponto de medição = API no Debian | **~8 ms** (`latencyMs` em `GET /api/metrics`) | OK |
| Timestamp do teste | `DD/MM/YYYY HH:mm:ss` (24 h) | Instantâneo registado na carta “Latência HTTP” | OK |
| Estado `apache2` | unidade interpretada à parte | `ActiveState` ativo no cartão de serviços | OK |
| Polling | 5 s | Métricas e gráfico atualizam a cada 5 s | OK |

**Evidência:** probe `GET http://192.168.100.10/` a partir de `metricsService.js`; comparação visual no Ubuntu com o mesmo código 200 no browser.

---

## Teste 2 — FTP, publicação e integridade SHA-256

| Item | Esperado | Resultado observado | Status |
| --- | --- | --- | --- |
| Destino | `/srv/portal/arquivos` via vsftpd (`/arquivos`) | Upload pelo painel (admin/operador) | OK |
| Ficheiro de teste | `relatorio.pdf` (ou `teste.txt`) | Transferência com barra de progresso | OK |
| Listagem | LIST no console | Nome, tamanho, data `DD/MM/YYYY HH:mm:ss` | OK |
| Download | stream pela API do console | Ficheiro gravado no Ubuntu via “Descarregar” | OK |
| Publicação HTTP | `http://site.empresa.test/arquivos/relatorio.pdf` | GET Apache devolve o mesmo objeto | OK |
| SHA-256 | original = FTP = HTTP | **MATCH** — hashes idênticos (`integrityMatch: true`) | OK |
| Path traversal | nome `../` ou `..` | **400** — nome rejeitado | OK |
| Leitor | sem upload | Formulário oculto; API de upload recusada ao perfil | OK |

**Evidência de integridade (laboratório):** hash SHA-256 calculado no upload (buffer local) igual ao hash do `GET` Apache. Os três lados (ficheiro enviado, cópia FTP, cópia HTTP) coincidem.

Comando de conferência no Ubuntu (N1, não substitui o console):

```bash
sha256sum relatorio.pdf copia-ftp.pdf copia-http.pdf
```

---

## Teste 3 — Correio (SMTP e IMAP)

| Item | Esperado | Resultado observado | Status |
| --- | --- | --- | --- |
| Contas PAM | `aluno@empresa.test` e `suporte@empresa.test` | Login IMAP no MailView | OK |
| Senha | não na query string | Cabeçalho `X-Mail-Password` | OK |
| Envio | SMTP Postfix | `POST /api/mail/send` (admin/operador) | OK |
| Destinatário | mensagem na **INBOX** | Leitura no modal da conta destino | OK |
| Remetente | cópia na pasta **Sent** | IMAP APPEND; listagem Sent após nova consulta | OK |
| Resposta | Reply preenche destinatário e citação | Envio da resposta pelo mesmo fluxo SMTP+Sent | OK |
| Falha só no Sent | SMTP ok, IMAP falha | Aviso `imapSaved: false` sem tratar como falha total de SMTP | OK |
| Leitor | sem envio | **403 Forbidden** em `POST /api/mail/send` | OK |

**Evidência no Debian (apoio, após envio pelo console com assunto `Teste N2`):**

```bash
sudo doveadm search -u suporte mailbox INBOX HEADER Subject "Teste N2"
sudo doveadm search -u aluno mailbox Sent HEADER Subject "Teste N2"
```

A fila `postqueue -p` vazia, isoladamente, **não** comprova recebimento.

---

## Teste 4 — SSH e hostname reversível

| Item | Esperado | Resultado observado | Status |
| --- | --- | --- | --- |
| Chave | estática em `backend/keys/` (fora do Git/Web) | Sessão `ssh2` no Debian | OK |
| Consulta | `whoami` + hostname estático | `GET /api/ssh/info` | OK |
| Original capturado | valor de `hostnamectl --static` | **`debian-server-italo`** | OK |
| Temporário | nome validado (regex) | **`servidor-n2-teste`** aplicado | OK |
| Restauração | mesmo pedido devolve o original | Restaurado **`debian-server-italo`** | OK |
| Perfil | só admin altera | operador/leitor: aba ou **403** no POST | OK |
| Hostname inválido | caracteres fora do permitido | **400** / rejeição no serviço | OK |

Não se altera IP, domínio de e-mail, nome do site nem se reiniciam serviços neste teste.

---

## Teste 5 — Métricas de hardware e logs

| Métrica | Fonte | Resultado no console | Status |
| --- | --- | --- | --- |
| CPU % | coleta no Debian | Cartão + série no Chart.js | OK |
| RAM usada / total | `free` / meminfo | MB usados e totais + % | OK |
| Disco `/` | `df` | GB usados / totais + % | OK |
| Uptime | segundos de atividade | Cartão Uptime (`Xd Xh Xm Xs`) | OK |
| Serviços N1 | `systemctl show` por unidade | apache2, vsftpd, postfix, dovecot, ssh | OK |
| Coleta desatualizada | > 10 s sem sucesso | Banner âmbar; valores **não** zerados | OK |
| Perda de API | timeout / Network Error | Banner *Conexão perdida com 192.168.100.10* | OK |

| Tipo de log | Origem típica | Status |
| --- | --- | --- |
| Sistema | `journalctl` | OK |
| Autenticação / SSH | `auth.log` / journal ssh | OK |
| FTP | vsftpd / xferlog / journal | OK |
| Correio | mail.log / postfix+dovecot | OK |
| Apache | `/var/log/apache2/access.log` | OK |

Logs: estilo terminal, **sob demanda**, visíveis a admin e operador.

---

## Teste 6 — Sessão e permissões (RBAC)

| Cenário | Esperado | Resultado | Status |
| --- | --- | --- | --- |
| Login `admin` / `admin123` | JWT + todas as abas + CRUD users | Acesso irrestrito da Parte 1 | OK |
| Login `operador` / `operador123` | FTP escrita, mail, SSH consulta, logs; **sem** Users | Menu sem “Gerenciamento de Usuários” | OK |
| Login `leitor` / `leitor123` | Observabilidade, FTP leitura, mail leitura | Sem logs/SSH/users; sem upload | OK |
| Leitor `POST /api/files/upload` | 403 | **403 Forbidden** | OK |
| Leitor `POST /api/mail/send` | 403 | **403 Forbidden** | OK |
| Leitor `POST /api/ssh/hostname` | 403 | **403 Forbidden** | OK |
| Token ausente | 401 | “Token não fornecido” + volta ao login | OK |
| Token inválido | 403 de sessão | “Token inválido ou expirado” + logout | OK |
| Admin altera o **próprio** `role` | bloqueado | API recusa auto-elevação / auto-rebaixamento | OK |
| Excluir a si próprio / último admin | bloqueado | Operação recusada | OK |

Credenciais da tabela são **seed de laboratório** (`init.js`), não produção.

---

## Resumo de aceitação (Seção 8.2)

| # | Verificação | Status |
| --- | --- | --- |
| 1 | Entrar no console, consultar o servidor, métricas reais a atualizar | OK |
| 2 | Aceder ao site e comparar o teste HTTP com o cliente | OK |
| 3 | Enviar ficheiro, listar, descarregar e localizar na publicação HTTP | OK |
| 4 | Enviar mensagem, ler no destinatário, responder e ver Sent | OK |
| 5 | Alterar e restaurar o nome do Debian pelo SSH do console | OK |
| 6 | Consultar logs; erro tratado sem expor credenciais | OK |
| 7 | Leitor não executa escrita mesmo na rota direta | OK |

| Critério de nota (8.3) | Evidência nesta ficha |
| --- | --- |
| Console e interface | Sidebar, RBAC visual, Parte 2 marcada, estados e toasts |
| Integração HTTP / FTP / SMTP-IMAP / SSH | Testes 1–4 |
| Acompanhamento | Teste 5 (métricas, gráfico, logs) |
| Arquitetura e segurança | Teste 6 + `docs/DIAGRAMA_ARQUITETURA.md` |

**Conclusão da Parte 1:** requisitos de aceitação 8.2 verificados no laboratório nas VMs `192.168.100.10` / `192.168.100.20`. Itens da Parte 2 (auditoria persistente, start/stop/restart, novos serviços) **não** foram exigidos nem implementados — apenas sinalizados na UI.
