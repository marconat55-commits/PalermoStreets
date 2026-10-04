import { defineConfig } from 'vite';
// @ts-expect-error Local development plugin implemented as a native Node module.
import { stageEditorPlugin } from './scripts/stage-editor-plugin.mjs';

export default defineConfig({
  base: './',
  plugins: [stageEditorPlugin()],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
