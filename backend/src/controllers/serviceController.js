const { controlService } = require('../services/serviceControlService');

async function executeServiceAction(req, res) {
  const { serviceName, action } = req.params;
  try {
    const status = await controlService(serviceName, action);
    return res.json({ serviceName, action, ...status });
  } catch (error) {
    if (error.cause) {
      console.error('Falha no controle de serviço:', error.cause);
    }
    return res.status(error.status || 500).json({
      error: error.status ? error.message : 'Erro interno ao controlar o serviço.'
    });
  }
}

module.exports = { executeServiceAction };
