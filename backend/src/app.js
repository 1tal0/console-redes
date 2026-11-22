const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

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
const serviceRoutes = require('./routes/serviceRoutes');

const app = express();

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
app.use('/api/services', serviceRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'online', server: 'Debian 13', timestamp: new Date() });
});

module.exports = app;
