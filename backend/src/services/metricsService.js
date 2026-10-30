const si = require('systeminformation');
const { exec } = require('child_process');
const util = require('util');
const axios = require('axios');

const execPromise = util.promisify(exec);

// Nomes das unidades systemd dos 5 serviços da N1
const SERVICES = ['apache2', 'vsftpd', 'postfix', 'dovecot', 'ssh'];

// Obtém o estado de cada serviço via systemctl show
const getServicesStatus = async () => {
  const serviceStatuses = {};

  for (const service of SERVICES) {
    try {
      const { stdout } = await execPromise(`systemctl show ${service} -p ActiveState -p SubState`);
      const lines = stdout.trim().split('\n');
      let activeState = 'desconhecido';
      let subState = 'desconhecido';

      lines.forEach(line => {
        if (line.startsWith('ActiveState=')) activeState = line.split('=')[1];
        if (line.startsWith('SubState=')) subState = line.split('=')[1];
      });

      serviceStatuses[service] = {
        state: activeState === 'active' ? 'ativo' : 'inativo',
        subState: subState,
      };
    } catch (error) {
      serviceStatuses[service] = { state: 'falha', subState: 'erro' };
    }
  }

  return serviceStatuses;
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