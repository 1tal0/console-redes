const si = require('systeminformation');
const axios = require('axios');
const { SERVICES, getServiceStatus } = require('./serviceControlService');

const getServicesStatus = async () => {
  const entries = await Promise.all(SERVICES.map(async (serviceName) => {
    try {
      return [serviceName, await getServiceStatus(serviceName)];
    } catch {
      return [serviceName, { state: 'falha', activeState: 'unknown', subState: 'erro' }];
    }
  }));
  return Object.fromEntries(entries);
};

// Mede a latência e o código de resposta HTTP do Apache
const checkHttpLatency = async () => {
  const start = Date.now();
  try {
    const response = await axios.get('http://192.168.100.10/', { timeout: 3000 });
    const duration = Date.now() - start;
    return {
      status: 'online',
      code: response.status,
      latencyMs: duration
    };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      status: 'erro',
      code: error.response ? error.response.status : 500,
      latencyMs: duration
    };
  }
};

// Agrupa todas as métricas do sistema e serviços
const getFullMetrics = async () => {
  const [cpu, mem, fs, time, services, http] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.time(),
    getServicesStatus(),
    checkHttpLatency()
  ]);

  // Filtra o disco da partição raiz/portal
  const mainDisk = fs.find(disk => disk.mount === '/') || fs[0] || {};

  return {
    timestamp: new Date().toISOString(),
    uptime: Math.floor(time.uptime), // Uptime em segundos
    cpu: {
      usagePercent: Math.round(cpu.currentLoad)
    },
    memory: {
      totalMb: Math.round(mem.total / 1024 / 1024),
      usedMb: Math.round(mem.active / 1024 / 1024),
      freeMb: Math.round(mem.available / 1024 / 1024),
      usagePercent: Math.round((mem.active / mem.total) * 100)
    },
    disk: {
      mount: mainDisk.mount || '/',
      totalGb: (mainDisk.size / 1024 / 1024 / 1024).toFixed(1),
      usedGb: (mainDisk.used / 1024 / 1024 / 1024).toFixed(1),
      usagePercent: Math.round(mainDisk.use || 0)
    },
    services,
    httpTest: http
  };
};

module.exports = { getFullMetrics };