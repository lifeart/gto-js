import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

const isLibBuild = process.env.BUILD_MODE === 'lib';

export default defineConfig({
  plugins: isLibBuild ? [
    dts({
      include: ['src/**/*.ts'],
      rollupTypes: true
    })
  ] : [],
  build: isLibBuild ? {
    // Library build configuration
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'GTO',
      fileName: 'gto'
    },
    rollupOptions: {
      output: {
        exports: 'named'
      }
    }
  } : {
    // Web app build configuration
    outDir: 'dist-app',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  }
});
