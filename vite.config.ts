import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { apiMiddlewarePlugin } from './src/server/apiMiddleware';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [react(), tailwindcss(), apiMiddlewarePlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: {
        ignored: [
          '**/src/data/**',
          '**/public/uploads/**',
          '**/public/data/**',
        ],
      },
    },
    preview: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
    },
  };
});

