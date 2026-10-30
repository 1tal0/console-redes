const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'online', 
    server: 'Debian 13', 
    timestamp: new Date() 
  });
});

app.listen(PORT, () => {
  console.log(`Backend Console N2 rodando na porta ${PORT}`);
});