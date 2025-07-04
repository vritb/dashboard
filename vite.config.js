/**
 * Vite configuration
 */

import { defineConfig } from 'vite';
import { resolve } from 'path';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  // Base public path
  base: './',

  // Build configuration
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true, // Clean the output directory before build
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        dashboard: resolve(__dirname, 'dashboard.html')
      }
    }
  },

  // Development server configuration
  server: {
    port: 3001,
    open: false, // Don't open browser automatically
    strictPort: true // Fail if port is already in use
  },

  // Resolve configuration
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },

  // Legacy browser support (similar to Babel preset-env)
  plugins: [
    legacy({
      targets: [
        '>0.25%',
        'not ie 11',
        'not op_mini all'
      ]
    })
  ],

  // Test configuration (Vitest)
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./setup-vitest.js'],
    include: [
      '**/__tests__/**/*.js',
      '**/?(*.)+(spec|test).js'
    ],
    exclude: [
      'node_modules/**',
      'dist/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'dist/**'
      ]
    },
    // Mock handler for CSS and asset imports
    deps: {
      inline: ['**/*.css']
    },
    // Mock file handling
    alias: {
      '\\.(css|less|scss|sass)$': resolve(__dirname, 'vitest/__mocks__/styleMock.js'),
      '\\.(jpg|jpeg|png|gif|svg)$': resolve(__dirname, 'vitest/__mocks__/fileMock.js')
    }
  }
});
