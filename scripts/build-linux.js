/**
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
*
* Builds the linux AppImage inside a docker container, so it can be
* built from windows or mac (electron-builder can only pack an AppImage
* on linux). Needs docker to be installed and running.
* run with: yarn build:linux
*
* The project folder is only read by the container. It works on its own
* copy, and writes the AppImage and latest-linux.yml to the build folder.
*/
const {spawnSync} = require('child_process');
const path = require('path');
const fs = require('fs');

const IMAGE = 'node:24';
const ROOT = path.join(__dirname, '..');
const OUTPUT = path.join(ROOT, 'build');

// run inside the container
const STEPS = [
    'mkdir /work',
    'cd /src',
    'cp -r src package.json yarn.lock readme.md LICENSE /work/',
    'cd /work',
    'yarn install --frozen-lockfile',
    'npx electron-builder --linux --publish never',
    'cp build/*.AppImage build/latest-linux.yml /out/',
    // on a linux host, hand the files to whoever owns the build folder
    '(chown --reference=/out /out/*.AppImage /out/latest-linux.yml || true)',
].join(' && ');

fs.mkdirSync(OUTPUT, {recursive: true});
const result = spawnSync('docker', [
    'run', '--rm',
    '-v', `${ROOT}:/src:ro`,
    '-v', `${OUTPUT}:/out`,
    IMAGE, 'bash', '-c', STEPS,
], {stdio: 'inherit'});

if (result.error) {
    console.error(`could not run docker, is it installed and running? (${result.error.message})`);
    process.exit(1);
}
if (result.status === 0) console.log(`linux build written to ${OUTPUT}`);
process.exit(result.status ?? 1);
