const app = require('./app');
const { port: PORT } = require('./config/env');

app.listen(PORT, () => {
  console.log(`🚀 Backend Console N2 rodando na porta ${PORT}`);
});
