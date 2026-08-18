const http = require('http');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const dataPath = path.join(__dirname, 'data.json');

function loadData() {
  return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
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

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.url === '/api/devices') {
    try {
      const groups = loadData();
      const result = {};
      for (const [group, devices] of Object.entries(groups)) {
        result[group] = await Promise.all(devices.map(async (device) => ({
          ...device,
          ...(await ping(device.ip))
        })));
      }
      res.writeHead(200);
      res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Ruta no encontrada' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Monitor Red activo en http://127.0.0.1:${PORT}`);
});
