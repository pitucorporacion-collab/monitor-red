const http = require('http');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PORT = 3000;
const dataPath = path.join(__dirname, 'data.js');

function loadData() {
  const source = fs.readFileSync(dataPath, 'utf8');
  return vm.runInNewContext(`${source}\n;({ GROUPS, NAMES })`);
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
      const { GROUPS, NAMES } = loadData();
      const result = {};
      for (const [group, ips] of Object.entries(GROUPS)) {
        result[group] = await Promise.all(ips.map(async (ip) => ({
          ip,
          name: NAMES[ip] || '',
          group,
          ...(await ping(ip))
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
