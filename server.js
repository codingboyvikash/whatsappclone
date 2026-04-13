const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const dev = process.env.NODE_ENV !== 'production';
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const app = next({ dev, hostname: HOST, port: PORT });
const handle = app.getRequestHandler();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/whatsapp-clone';

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Only handle Next.js WebSocket upgrades in development mode
  if (dev && typeof app.getUpgradeHandler === 'function') {
    httpServer.on('upgrade', (req, socket, head) => {
      app.getUpgradeHandler()(req, socket, head).catch((err) => {
        console.error('Next.js websocket upgrade error:', err);
        socket.destroy();
      });
    });
  }

  // Socket.IO setup
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  // Make io accessible to API routes via global
  global.io = io;

  // Initialize socket handlers
  require('./sockets/chatSocket')(io);

  // MongoDB connection
  mongoose
    .connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB error:', err));

  // Ensure uploads directory exists
  const fs = require('fs');
  const path = require('path');
  const uploadsDir = path.join(__dirname, 'public', 'assets', 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const HOST = process.env.HOST || '0.0.0.0';
  httpServer.listen(PORT, HOST, () => {
    console.log(`> WhatsApp Next.js running on http://${HOST}:${PORT}`);
  });
});
