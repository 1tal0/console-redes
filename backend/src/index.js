const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Inicializar Banco de Dados
require('./database/init');

const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Rotas da API
app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'online', server: 'Debian 13', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend Console N2 rodando na porta ${PORT}`);
});