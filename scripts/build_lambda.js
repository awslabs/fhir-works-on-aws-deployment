path = require('path');
esbuild = require('esbuild');

esbuild.build({
    entryPoints: [path.join(__dirname, '../../src/index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node14',
    external: ['aws-sdk'],
    outfile: path.join(__dirname, '../index.js'),
}).catch(() => process.exit(1));