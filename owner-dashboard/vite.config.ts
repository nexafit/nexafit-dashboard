/// <reference types="node" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages project sites are served from /<repo-name>/.
// The GitHub Actions workflow sets VITE_BASE_PATH automatically.
// Local development and Firebase Hosting can keep '/'.
const base = process.env.VITE_BASE_PATH || '/';

export default defineConfig({
  plugins: [react()],
  base,
});
