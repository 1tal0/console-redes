# Console Integrado de Serviços N2 — Parte 1

Console web de administração da infraestrutura implantada na N1 (Apache, vsftpd, Postfix, Dovecot e OpenSSH), com autenticação, RBAC, métricas, FTP, correio e operação SSH reversível.

---

## 1. Identificação do Projeto e Autoria

| Campo | Valor |
| --- | --- |
| **Projeto** | Console Integrado de Serviços N2 — Parte 1 |
| **Desenvolvedor** | Ítalo Renan Ferreira de Queiroz (Aluno Desenvolvedor) |
| **Professor** | Prof. Dr. Matias Romário Pinheiro dos Santos |
| **Disciplina** | Redes de Computadores II |
| **Curso** | Bacharelado em Engenharia de Software (4º Semestre) |
| **Instituição** | Instituto Federal de Educação, Ciência e Tecnologia do Ceará (IFCE) — Campus Acopiara |

---

## 2. Arquitetura e Visão Geral

### Topologia de rede (VirtualBox, rede isolada `lab`)

| Máquina | Sistema | Endereço | Função |
| --- | --- | --- | --- |
| Servidor | Debian 13 | `192.168.100.10/24` | Backend Node.js/Express, SQLite, coleta de métricas e integração com os serviços N1 |
| Cliente | Ubuntu | `192.168.100.20/24` | Navegador de acesso ao console |
| Rede | Interna `lab` | Isolada | Sem NAT obrigatório na demonstração |

```
Ubuntu 192.168.100.20  (navegador)
        |
        |  HTTP  :5173 (Vite)  /  API  :3000
        v
Debian  192.168.100.10
        ├── Express API  (backend/)
        ├── SQLite       (utilizadores do console)
        ├── Apache2      site.empresa.test / arquivos
        ├── vsftpd       /srv/portal/arquivos
        ├── Postfix      SMTP
        ├── Dovecot      IMAP (PAM: aluno / suporte)
        └── OpenSSH      chave estática em backend/keys/
```

O frontend **não** guarda a chave SSH nem senhas de sistema. A API fala com os serviços locais do Debian. Contas de correio autenticam no Dovecot/Postfix; ficheiros permanecem no vsftpd.

### Tecnologias utilizadas

| Camada | Tecnologia |
| --- | --- |
| Interface | React 19, Vite, Tailwind CSS v4, Chart.js, react-chartjs-2, Lucide |
| API | Node.js, Express 5 |
| Persistência | SQLite (`backend/src/database/database.sqlite`) |
| Autenticação | JWT + bcryptjs |
| Integrações | `basic-ftp`, `imapflow`, `nodemailer`, `ssh2`, `axios` |

Nenhuma destas marcas é obrigatória no enunciado; foram escolhidas por já permitirem cumprir os requisitos funcionais da Parte 1.

---

## 3. Instruções de Instalação e Execução

Ambiente-alvo: **Debian 13** (`192.168.100.10`) para API e serviços; **Ubuntu** (`192.168.100.20`) para o navegador.

### Pré-requisitos

- Node.js 18+ e npm em ambas as VMs (ou pelo menos no Debian, se o Vite também correr lá).
- Serviços N1 ativos no Debian:

```bash
sudo systemctl status apache2 vsftpd postfix dovecot ssh --no-pager
```

- Resolução opcional: `site.empresa.test` e `mail.empresa.test` → `192.168.100.10`.
- Chave SSH do console **fora do Git**: copiar a chave privada já usada na N1 para `backend/keys/` (pasta ignorada pelo `.gitignore`). O backend lê essa chave localmente; ela **não** é enviada pelo navegador.

### Backend (Debian `192.168.100.10`)

```bash
cd backend
cp .env.example .env
# Editar .env: JWT_SECRET, FTP_* (não commitar o ficheiro .env)
npm install
npm start
```

A API escuta em **`http://192.168.100.10:3000`** (`PORT` no `.env`). Rotas sob `/api`.

Exemplo de `.env` (desenvolvimento de laboratório — **não** usar estes valores em produção):

```
PORT=3000
JWT_SECRET=altere_este_segredo_jwt
FTP_HOST=192.168.100.10
FTP_PORT=21
FTP_USER=ftpuser
FTP_PASS=ftp
```

Desenvolvimento com recarga: `npm run dev` (nodemon).

### Frontend

Na mesma VM Debian (recomendado para o Ubuntu só precisar do browser) ou no Ubuntu, com a API já a responder em `.10:3000`.

O cliente Axios está configurado para `http://192.168.100.10:3000/api` (`frontend/src/services/api.js`).

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

Acesso no **navegador do Ubuntu**:

- Interface: `http://192.168.100.10:5173` (Vite; porta predefinida 5173)
- API: `http://192.168.100.10:3000/api`

Se o Vite correr no Ubuntu, o host `--host` permite abrir `http://192.168.100.20:5173`; a API continua a ser o Debian `:3000`.

---

## 4. Configurações de Coleta e Monitorização

| Recurso | Intervalo / modo | Observação |
| --- | --- | --- |
| CPU, RAM, disco, uptime, serviços, teste HTTP | **1 segundo** (polling no `DashboardView`) | Amostras de CPU/RAM no gráfico: últimas 15–20 da sessão |
| Timestamp da última atualização | Cada resposta bem-sucedida | Formato `DD/MM/YYYY HH:mm:ss` (24 h) |
| Coleta desatualizada | Sem sucesso há **mais de 5 s** | Banner de aviso; últimos valores mantidos |
| Logs técnicos | **Sob demanda** (botão Atualizar) | `journalctl` / `/var/log` filtrados por tipo |
| Teste HTTP | Mesmo ciclo de métricas | Código, latência em ms, instante da medição |

**Serviços monitorados (N1):**

| Unidade | Papel |
| --- | --- |
| `apache2` | HTTP — site e `/arquivos` |
| `vsftpd` | FTP — publicação em `/srv/portal/arquivos` |
| `postfix` | SMTP |
| `dovecot` | IMAP |
| `ssh` / OpenSSH | Consulta e hostname reversível |

---

## 5. Perfis de Acesso e Segurança (RBAC)

A sessão usa JWT. Senhas do console são armazenadas com **bcrypt**. O utilizador **não pode alterar o próprio `role`**. Token inválido/expirado limpa a sessão no browser.

| Recurso | `admin` | `operador` | `leitor` |
| --- | --- | --- | --- |
| Observabilidade / métricas / gráfico | Sim | Sim | Sim |
| Logs técnicos | Sim | Sim | Não (aba oculta + API) |
| FTP listar / download / SHA-256 | Sim | Sim | Sim (consulta) |
| FTP upload | Sim | Sim | Não |
| E-mail listar / ler | Sim | Sim | Sim |
| E-mail enviar (`POST /api/mail/send`) | Sim | Sim | **Não (403)** |
| SSH consultar hostname | Sim | Sim | Não (aba oculta) |
| SSH alterar/restaurar hostname | Sim | Não | Não |
| CRUD de utilizadores | Sim | Não | Não |

### Contas de teste do console (seed em `init.js`)

Apenas laboratório. Alterar após a primeira entrada.

| Utilizador | Palavra-passe (dev) | Perfil |
| --- | --- | --- |
| `admin` | `admin123` | admin |
| `operador` | `operador123` | operador |
| `leitor` | `leitor123` | leitor |

### Contas de correio (PAM no Debian, não estão no SQLite)

Usar as contas já criadas na N1, por exemplo `aluno@empresa.test` e `suporte@empresa.test`. A senha IMAP **não** vai na query string; o frontend envia o cabeçalho `X-Mail-Password`.

### Chave SSH

Colocar a chave privada **só** em `backend/keys/` no Debian. Não versionar. O painel não recebe a chave.

---

## 6. Recursos: Parte 1 vs. Parte 2

| Recurso | Parte | Estado |
| --- | --- | --- |
| Login JWT, logout, sessão expirada | 1 | Implementado |
| RBAC admin / operador / leitor (UI + API) | 1 | Implementado |
| Observabilidade em tempo real (CPU, RAM, disco, uptime) | 1 | Implementado |
| Gráfico Chart.js (CPU e memória) | 1 | Implementado |
| Teste HTTP (código, ms, timestamp) e link ao site | 1 | Implementado |
| Alerta de coleta desatualizada / perda de comunicação | 1 | Implementado |
| Operações recentes da sessão (em memória) | 1 | Implementado |
| FTP: listar, upload, download em stream, SHA-256, progresso | 1 | Implementado |
| Cliente de e-mail INBOX / Sent / leitura / resposta / cópia Sent | 1 | Implementado |
| SSH: hostname original, alteração temporária e restauração | 1 | Implementado |
| Logs por serviço (system, auth, ftp, mail, apache) | 1 | Implementado |
| CRUD de utilizadores + bloqueio de auto-elevação | 1 | Implementado (administração simples) |
| Mockup visual “Em breve — Parte 2” no menu | 1 (entregável) | Implementado |
| Trilha de auditoria persistente | 2 | Previsto (menu desabilitado) |
| Start / Stop / Restart de serviços | 2 | Previsto (botões desabilitados no dashboard) |
| Novos serviços empresariais | 2 | Previsto (menu desabilitado) |

---

## Estrutura do repositório

```
console-n2/
├── README.md
├── backend/          # Express, SQLite, integrações
│   ├── .env.example
│   ├── keys/         # chave SSH (não versionada)
│   └── src/
└── frontend/         # React + Vite
```

## Notas de demonstração (aceitação Parte 1)

1. Entrar com `admin` / `operador` / `leitor` e confirmar abas e 403 em escrita do leitor.
2. Ver métricas a atualizar a cada 1 s e o gráfico.
3. Abrir o site, enviar ficheiro por FTP, descarregar pelo console e conferir SHA-256 / HTTP.
4. Enviar e-mail, ler na outra conta, responder e verificar Sent.
5. Alterar e restaurar o hostname via console (admin).
6. Consultar logs; simular falha (senha errada, nome de ficheiro inválido) sem expor segredos.

Documentação de apoio do enunciado (não substituem este README): manuais Debian/Ubuntu, documentação dos daemons e das bibliotecas usadas.
