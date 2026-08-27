import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';

const src = (path: string) => fileURLToPath(new URL(`./src/${path}`, import.meta.url));

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@compass': src('ui/compass'),
            '@pages': src('ui/pages'),
            '@shared': src('ui/shared'),
            '@api': src('api'),
            '@models': src('models'),
            '@stores': src('stores'),
            '@data': src('data'),
        },
    },
    server: {
        port: 3000,
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
    },
});
