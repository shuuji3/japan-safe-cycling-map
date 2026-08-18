import { copyFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const distDir = path.join(path.dirname(require.resolve('maplibre-gl/package.json')), 'dist');
const source = path.join(distDir, 'maplibre-gl-csp-worker.js');
const destination = path.join(process.cwd(), 'public', 'maplibre-gl-csp-worker.js');

copyFileSync(source, destination);
