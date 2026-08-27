import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@aescion/shared-types': path.resolve(__dirname, '../../packages/shared-types/src/index.ts'),
      '@aescion/shared-utils': path.resolve(__dirname, '../../packages/shared-utils/src/index.ts'),
      '@aescion/capability-config': path.resolve(__dirname, '../../packages/capability-config/src/index.ts'),
      '@aescion/validation': path.resolve(__dirname, '../../packages/validation/src/index.ts')
    }
  },
  server: {
    port: 5173,
    strictPort: true
  }
});
