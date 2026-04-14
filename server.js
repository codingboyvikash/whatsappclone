const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config(); // ✅ .env use करो (not .env.local)

const dev = process.env.NODE_ENV !== 'production';
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const app = next({ dev, hostname: HOST, port: PORT });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    
    // ✅ Serve static files from public directory
    if (req.url.startsWith('/assets/')) {
      const filePath = path.join(__dirname, 'public', req.url);
      const fs = require('fs');
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath);
        const contentType = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp',
        }[ext] || 'application/octet-stream';
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    }
    
    handle(req, res, parsedUrl);
  });

  // ✅ Only dev mode websocket
  if (dev && typeof app.getUpgradeHandler === 'function') {
    httpServer.on('upgrade', (req, socket, head) => {
      app.getUpgradeHandler()(req, socket, head).catch((err) => {
        console.error('Next.js websocket upgrade error:', err);
        socket.destroy();
      });
    });
  }

  // ✅ Socket.IO
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  global.io = io;

  // ✅ Socket handlers
  require('./sockets/chatSocket')(io);

  // ❌ ❌ ❌ MongoDB connection REMOVED (IMPORTANT FIX)
  // अब DB connection सिर्फ API routes में connectDB से होगा

  // ✅ Ensure uploads folder
  const fs = require('fs');
  const path = require('path');
  const uploadsDir = path.join(__dirname, 'public', 'assets', 'uploads');

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // ✅ Start server
  httpServer.listen(PORT, HOST, () => {
    console.log(`🚀 Server running on http://${HOST}:${PORT}`);
    console.log(`⚙️ Mode: ${dev ? 'Development' : 'Production'}`);
  });
});