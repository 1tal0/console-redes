# Diagrama de Arquitetura — Console Integrado N2 (Parte 1)

Documento de apoio ao **item 4 da Seção 8.1** da especificação da Parte 1. Descreve a topologia da rede isolada `lab`, a separação de responsabilidades e os fluxos de dados entre o cliente Ubuntu, a API no Debian e os serviços da N1.

---

## 1. Visão geral em blocos

```mermaid
flowchart LR
  subgraph Ubuntu["Cliente Ubuntu 192.168.100.20"]
    BR["Navegador Web"]
    UI["React + Vite :5173"]
    BR --> UI
  end

  subgraph Debian["Servidor Debian 13  192.168.100.10"]
    subgraph API["Backend Node.js / Express :3000"]
      AUTH["JWT + bcrypt"]
      RBAC["Middleware RBAC"]
      CTRL["Controllers"]
      SQL[("SQLite\ndatabase.sqlite")]
      AUTH --> RBAC --> CTRL
      CTRL --> SQL
    end

    subgraph INT["Camada de integração"]
      FTP["basic-ftp"]
      SMTP["nodemailer"]
      IMAP["imapflow"]
      SSH["ssh2"]
    end

    subgraph N1["Serviços de infraestrutura N1"]
      AP["Apache2 :80"]
      VS["vsftpd :21"]
      PF["Postfix :25"]
      DV["Dovecot :143"]
      OS["OpenSSH :22"]
    end

    FS["/srv/portal/arquivos"]
    MD["Maildirs /var/mail"]
    KEY["keys/  chave SSH local"]
  end

  UI -->|"HTTP /api  JWT"| AUTH
  CTRL --> INT
  FTP --> VS
  VS --> FS
  AP --> FS
  SMTP --> PF
  IMAP --> DV
  DV --> MD
  PF --> DV
  SSH --> OS
  KEY -.-> SSH
```

### Responsabilidades

| Componente | Máquina | Função |
| --- | --- | --- |
| Navegador + React/Vite (`:5173`) | Ubuntu `192.168.100.20` | Interface do console (abas por perfil, métricas, FTP, correio, SSH, logs) |
| Express (`:3000`) | Debian `192.168.100.10` | Autenticação JWT, RBAC, orquestração; **não** lê Maildirs nem a chave no browser |
| SQLite | Debian | Apenas utilizadores do console (não substitui IMAP nem o vsftpd) |
| Apache2 | Debian | Site `site.empresa.test` e publicação HTTP de `/srv/portal/arquivos` |
| vsftpd | Debian | Upload/listagem/download FTP para o mesmo diretório publicado |
| Postfix / Dovecot | Debian | SMTP e IMAP com autenticação PAM (`aluno`, `suporte`) |
| OpenSSH | Debian | Consulta e alteração reversível de hostname, com chave **só** em `backend/keys/` |

A rede interna VirtualBox `lab` isola o par `.10` / `.20`. O frontend chama `http://192.168.100.10:3000/api`.

---

## 2. Camadas da API (Debian)

```mermaid
flowchart TB
  REQ["Pedido HTTP + Bearer JWT"]
  VT["verifyToken"]
  CR["checkRole admin / operador / leitor"]
  C["Controllers"]
  S["Services"]
  EXT["Daemons N1 e sistema"]

  REQ --> VT --> CR --> C --> S --> EXT
```

| Rota (exemplos) | Quem executa | Destino |
| --- | --- | --- |
| `POST /api/auth/login` | Público | SQLite + bcrypt |
| `GET /api/metrics` | Qualquer autenticado | `systemctl`, CPU/RAM/disco, probe HTTP Apache |
| `POST /api/files/upload` | admin, operador | vsftpd → `/arquivos` |
| `GET /api/mail` | autenticado; senha no cabeçalho `X-Mail-Password` | Dovecot IMAP |
| `POST /api/mail/send` | admin, operador | Postfix SMTP + append Sent no IMAP |
| `POST /api/ssh/hostname` | admin | OpenSSH + `hostnamectl` |
| `GET /api/logs` | admin, operador | `journalctl` / `/var/log` |

O perfil `leitor` consulta métricas, FTP (leitura/download) e correio (leitura). Escrita de e-mail e upload FTP são recusadas no **backend** (403), não só na UI.

---

## 3. Fluxos de dados

### 3.1 HTTP / Apache

```mermaid
sequenceDiagram
  participant UI as Console React
  participant API as Express :3000
  participant AP as Apache2 :80
  participant FS as /srv/portal/arquivos

  UI->>API: GET /api/metrics
  API->>AP: GET http://192.168.100.10/ (probe)
  AP-->>API: código HTTP + duração
  API-->>UI: latencyMs, code, timestamp

  UI->>UI: Link site.empresa.test / 192.168.100.10
  Note over AP,FS: GET /arquivos/ficheiro.pdf = publicação HTTP do mesmo volume do vsftpd
```

- A medição de latência é feita **no Debian** (API), identificada no painel (código, ms, instante `DD/MM/YYYY HH:mm:ss`).
- Ficheiros enviados por FTP tornam-se acessíveis em `http://site.empresa.test/arquivos/` sem `chmod 777`.

### 3.2 FTP e integridade SHA-256

```mermaid
sequenceDiagram
  participant UI as Console
  participant API as Express
  participant FTP as vsftpd :21
  participant FS as /srv/portal/arquivos
  participant AP as Apache2

  UI->>API: POST /api/files/upload (multipart)
  API->>API: SHA-256 local + sanitizar nome
  API->>FTP: STOR /arquivos/nome (PASV)
  FTP->>FS: gravar
  API->>AP: GET /arquivos/nome
  AP->>FS: ler
  AP-->>API: bytes
  API->>API: SHA-256 HTTP vs local
  API-->>UI: sha256, integrityMatch, httpUrl, progresso

  UI->>API: GET /api/files/download/nome
  API->>FTP: RETR stream
  FTP-->>UI: ficheiro (via API, sem expor credencial FTP)
```

- Nomes inválidos (`../`, caracteres fora de `[A-Za-z0-9._-]`) → **400**.
- Credenciais FTP vêm de `.env` (`FTP_HOST`, `FTP_USER`, `FTP_PASS`), não do browser.

### 3.3 Correio SMTP / IMAP

```mermaid
sequenceDiagram
  participant UI as Console
  participant API as Express
  participant DV as Dovecot :143
  participant PF as Postfix :25
  participant MD as Maildirs

  UI->>API: GET /mail  header X-Mail-Password
  API->>DV: IMAP AUTH PAM (aluno/suporte)
  DV->>MD: INBOX / Sent
  DV-->>UI: cabeçalhos / corpo

  UI->>API: POST /api/mail/send (admin/operador)
  API->>PF: SMTP AUTH + DATA
  PF->>DV: entrega local
  API->>DV: APPEND pasta Sent
  Note over API: Distingue falha SMTP vs falha só na cópia Sent
```

- A API **não** abre Maildirs como `www-data`; usa SMTP/IMAP com a conta PAM.
- Senha **não** via query string.

### 3.4 SSH reversível

```mermaid
sequenceDiagram
  participant UI as Console
  participant API as Express
  participant KEY as backend/keys/
  participant SSH as OpenSSH :22
  participant HC as hostnamectl

  UI->>API: GET /api/ssh/info
  API->>KEY: ler chave privada local
  API->>SSH: sessão autenticada
  SSH->>HC: whoami + hostname estático
  SSH-->>UI: hostname original

  UI->>API: POST /api/ssh/hostname (admin, nome validado)
  API->>SSH: guardar original
  API->>HC: set-hostname temporário
  API->>HC: restaurar original
  SSH-->>UI: original, temp, restaurado
```

- A chave (ex.: `id_ed25519_redes_n1`) **não** vai para o Git nem para a Web.
- O hostname é validado por expressão regular antes de qualquer comando.
- Não se exige `sudo` irrestrito no painel; a operação é limitada à alteração de nome.

---

## 4. Observabilidade e sessão (Parte 1)

```mermaid
flowchart LR
  P["Polling 5 s"] --> M["CPU RAM disco uptime serviços HTTP"]
  M --> G["Gráfico Chart.js 15–20 amostras"]
  M --> S["Aviso se sem sucesso > 10 s"]
  OP["FTP / mail / SSH / users"] --> MEM["Operações da sessão em memória"]
  NET["Axios timeout / rede"] --> BAN["Banner 192.168.100.10 desconectado"]
```

A **Parte 2** (auditoria persistente, start/stop/restart, novos serviços) aparece só como marcação visual no menu e no dashboard, sem rotas de backend.

---

## 5. Ficheiros de referência no código

| Papel | Caminho |
| --- | --- |
| Entrada da API | `backend/src/index.js` |
| Ambiente | `backend/src/config/env.js`, `backend/.env.example` |
| RBAC | `backend/src/middleware/authMiddleware.js` |
| Métricas | `backend/src/services/metricsService.js` |
| FTP | `backend/src/services/ftpService.js` |
| Correio | `backend/src/services/mailService.js` |
| SSH | `backend/src/services/sshService.js` |
| UI / layout | `frontend/src/App.jsx` |
| Observabilidade | `frontend/src/components/DashboardView.jsx` |
