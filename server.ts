import path from 'path';
import { createServer as createViteServer } from 'vite';
import { app } from './serverApp';
import { SchedulerWorker } from './server/scheduler';

async function startServer() {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Start Server-Side Background Scheduler Worker
  SchedulerWorker.start();

  // ==========================================
  // VITE / STATIC SERVING
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
        ws: false
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(expressStatic(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[MR.360 SMM Engine] Server running on http://0.0.0.0:${PORT}`);
  });
}

function expressStatic(distPath: string) {
  const express = require('express');
  return express.static(distPath);
}

startServer();
