import { createServer } from 'vite';
import vue from '@vitejs/plugin-vue';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const server = await createServer({
  root: projectRoot,
  configFile: false,
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: false
  }
});

await server.listen();
server.printUrls();
