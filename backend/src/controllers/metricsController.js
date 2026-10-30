const { getFullMetrics } = require('../services/metricsService');

const getMetrics = async (req, res) => {
  try {
    const metrics = await getFullMetrics();
    return res.json(metrics);
  } catch (error) {
    console.error('Erro ao coletar métricas:', error);
    return res.status(500).json({ error: 'Falha ao obter métricas do servidor Debian.' });
  }
};

module.exports = { getMetrics };