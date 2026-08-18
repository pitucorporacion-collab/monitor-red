const http = require('http');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PORT = 3000;
const dataPath = path.join(__dirname, 'data.js');

function loadData() {
  const source = fs.readFileSync(dataPath, 'utf8') + '\nmodule.exports = DEVICES;';
  const sandbox = { module: { exports: {} } };
  vm.runInNewContext(source, sandbox);
  return sandbox.module.exports;
}

function ping(ip) {
  return new Promise((resolve) => {
    const args = process.platform === 'win32' ? ['-n', '1', '-w', '1000', ip] : ['-c', '1', '-W', '1', ip];
    const started = Date.now();
    execFile('ping', args, { windowsHide: true }, (error, stdout) => {
      const online = !error;
      const match = stdout.match(/(?:time[=<]|tiempo[=<])\s*(\d+(?:[.,]\d+)?)\s*ms/i);
      resolve({ online, latency: match ? Number(match[1].replace(',', '.')) : null, ms: Date.now() - started });
    });
  });
}

async function checkGroups(groups) {
  const result = {};
  for (const [group, devices] of Object.entries(groups)) {
    result[group] = await Promise.all(devices.map(async (device) => ({ ...device, ...(await ping(device.ip)) })));
  }
  return result;
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  try {
    const groups = loadData();

    if (req.url === '/api/all') {
      const result = await checkGroups(groups);
      res.writeHead(200);
      res.end(JSON.stringify(result));
      return;
    }

    if (req.url.startsWith('/api/group/')) {
      const group = decodeURIComponent(req.url.substring('/api/group/'.length));
      const devices = groups[group] || [];
      const result = await Promise.all(devices.map(async (device) => ({ ...device, ...(await ping(device.ip)) })));
      res.writeHead(200);
      res.end(JSON.stringify(result));
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Ruta no encontrada' }));
  } catch (e) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: e.message }));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Monitor Red activo en http://127.0.0.1:${PORT}`);
});

module.exports = server;
