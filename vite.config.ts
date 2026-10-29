import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * The app ships a tiny serverless API layer (`/api/*.ts`) that runs on Vercel.
 * `vite dev` does not execute Vercel functions, so this plugin mounts the same
 * handler functions as dev middleware. The handlers only rely on the shape of
 * Node's `IncomingMessage` / `ServerResponse`, so both environments work.
 */
function devApiPlugin(): Plugin {
  return {
    name: 'muse-ician-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? '';
        if (!url.startsWith('/api/')) return next();
        const pathname = url.split('?')[0] ?? '';
        const name = pathname.replace(/^\/api\//, '').replace(/\/$/, '');
        if (!/^[a-z0-9-]+$/.test(name)) {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'Not found' }));
          return;
        }
        try {
          const mod = (await server.ssrLoadModule(
            `/api/${name}.ts`,
          )) as { default: (req: IncomingMessage, res: ServerResponse) => Promise<void> };
          await mod.default(req, res);
        } catch (error) {
          server.config.logger.error(`[dev-api] ${name}: ${(error as Error).message}`);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('content-type', 'application/json');
          }
          res.end(JSON.stringify({ error: 'API handler failed', detail: (error as Error).message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devApiPlugin()],
  resolve: {
    alias: { '@': path.resolve(process.cwd(), 'src') },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          storage: ['idb'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
