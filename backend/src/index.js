const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

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

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/mail', mailRoutes);
app.use('/api/ssh', sshRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'online', server: 'Debian 13', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend Console N2 rodando na porta ${PORT}`);
});