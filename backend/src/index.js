const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { port } = require('./config/env');

// Garantir pasta temporária
const uploadsDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Inicializar Banco SQLite
require('./database/init');

const authRoutes = require('./routes/authRoutes');
const metricsRoutes = require('./routes/metricsRoutes');
const fileRoutes = require('./routes/fileRoutes');
const mailRoutes = require('./routes/mailRoutes');
const sshRoutes = require('./routes/sshRoutes');
const logRoutes = require('./routes/logRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
const PORT = port;

app.use(cors());
app.use(express.json());

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/mail', mailRoutes);
app.use('/api/ssh', sshRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'online', server: 'Debian 13', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend Console N2 rodando na porta ${PORT}`);
});