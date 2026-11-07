import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const apiTarget = process.env.API_PROXY_TARGET || 'http://127.0.0.1:8080';
const proxy = { '/api': apiTarget, '/uploads': apiTarget };

export default defineConfig({
  plugins: [vue()],
  server: { proxy },
  preview: { proxy },
  build: {
    outDir: 'dist',
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'editor-state',
              test: /node_modules[\\/]@codemirror[\\/]state[\\/]/,
              priority: 30,
            },
            {
              name: 'editor-view',
              test: /node_modules[\\/]@codemirror[\\/]view[\\/]/,
              priority: 20,
            },
            {
              name: 'editor-language',
              test: /node_modules[\\/](?:@codemirror|@lezer|codemirror)[\\/]/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
});
