import {defineConfig, type Plugin} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import {copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const src = (path: string) => fileURLToPath(new URL(`./src/${path}`, import.meta.url));

/**
 * GitHub Pages has no rewrite rules, so a request for a deep route such as
 * `/camel-kameleon/cves/CVE-2024-1` never reaches `index.html` and is answered
 * with the repository's `404.html` instead.
 *
 * Emitting the built `index.html` verbatim as `404.html` makes that fallback
 * response *be* the application shell: the browser keeps the requested URL, the
 * hashed assets load through their absolute `base`-prefixed paths, and
 * `BrowserRouter` resolves the route on the first paint. No redirect hop, no
 * query-string encoding, and no path-segment count to keep in sync with `base`.
 */
const spaFallback = (): Plugin => ({
    name: 'spa-github-pages-fallback',
    apply: 'build',
    enforce: 'post',
    async writeBundle(options) {
        const dir = options.dir ?? 'dist';
        await copyFile(resolve(dir, 'index.html'), resolve(dir, '404.html'));
    },
});

export default defineConfig({
    base: '/camel-kameleon/',
    plugins: [react(), spaFallback()],
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
