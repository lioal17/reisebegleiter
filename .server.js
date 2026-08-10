const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = __dirname, PORT = 8123;
const TYP = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8', '.webmanifest':'application/manifest+json; charset=utf-8',
  '.svg':'image/svg+xml', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png',
  '.css':'text/css; charset=utf-8', '.ico':'image/x-icon' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const datei = path.join(ROOT, p);
  if (!datei.startsWith(ROOT)) { res.writeHead(403); return res.end('nein'); }
  fs.readFile(datei, (err, buf) => {
    if (err) { res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'}); return res.end('nicht gefunden: ' + p); }
    res.writeHead(200, { 'Content-Type': TYP[path.extname(datei).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(buf);
  });
}).listen(PORT, '0.0.0.0', () => console.log('laeuft auf Port ' + PORT));
