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
*
* With --publish the files are also uploaded to the draft github release
* for this version (see: yarn release). That needs GH_TOKEN to be set.
*/
const {spawnSync} = require('child_process');
const path = require('path');
const fs = require('fs');

const IMAGE = 'node:24';
const ROOT = path.join(__dirname, '..');
const OUTPUT = path.join(ROOT, 'build');
const PUBLISH = process.argv.includes('--publish');

if (PUBLISH && !process.env.GH_TOKEN) {
    console.error('GH_TOKEN must be set to publish the linux build');
    process.exit(1);
}

// run inside the container
const STEPS = [
    'mkdir /work',
    'cd /src',
    'cp -r src package.json yarn.lock readme.md LICENSE /work/',
    'cd /work',
    'yarn install --frozen-lockfile',
    `npx electron-builder --linux --publish ${PUBLISH ? 'always' : 'never'}`,
    'cp build/*.AppImage build/latest-linux.yml /out/',
    // on a linux host, hand the files to whoever owns the build folder
    '(chown --reference=/out /out/*.AppImage /out/latest-linux.yml || true)',
].join(' && ');

// the token is passed on by name, so its value is never on a command line
const token = PUBLISH ? ['-e', 'GH_TOKEN'] : [];

fs.mkdirSync(OUTPUT, {recursive: true});
const result = spawnSync('docker', [
    'run', '--rm', ...token,
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
