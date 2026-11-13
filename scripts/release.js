/**
* system: Discord RPC Tool
* author: dekitarpg@gmail.com
*
* Uploads the built installers to one github release for the current
* version. run with: yarn release (which builds everything first).
*
*   yarn release             leaves the release as a draft to look over
*   yarn release --live      publishes it once every file is uploaded
*   yarn release --dry-run   checks everything, uploads nothing
*
* The files are uploaded one after another to a single release, under
* the names the auto updater looks for (see latest.yml), and each upload
* is checked against the file on disk. Running it again for the same
* version replaces the files of the existing draft.
* Needs GH_TOKEN to be set.
*/
const {execFileSync} = require('child_process');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const {version, repository} = require('../package.json');

const ROOT = path.join(__dirname, '..');
const BUILD = path.join(ROOT, 'build');
const TAG = `v${version}`;
// "git@github.com:owner/repo" or "https://github.com/owner/repo(.git)"
const REPO = String(repository?.url || repository).match(/github\.com[:/]([^/]+\/[^/.]+)/)?.[1];
const API = `https://api.github.com/repos/${REPO}`;
const UPLOADS = `https://uploads.github.com/repos/${REPO}`;

const git = (...args) => execFileSync('git', args, {cwd: ROOT, encoding: 'utf8'}).trim();
const hash = (file, algorithm, encoding) => {
    return crypto.createHash(algorithm).update(fs.readFileSync(file)).digest(encoding);
};

async function github(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            'Accept': 'application/vnd.github+json',
            'Authorization': `Bearer ${process.env.GH_TOKEN}`,
            'X-GitHub-Api-Version': '2022-11-28',
            ...options.headers,
        },
    });
    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`github replied ${response.status} for ${options.method || 'GET'} ${url} ${detail.slice(0, 200)}`);
    }
    return response.status === 204 ? null : await response.json();
}

// reads the file name and sha512 that an update file (latest.yml) points at
function readUpdateFile(file) {
    const text = fs.readFileSync(file, 'utf8');
    const name = text.match(/^path: (.+)$/m)?.[1].trim();
    const sha512 = text.match(/^sha512: (.+)$/m)?.[1].trim();
    const for_version = text.match(/^version: (.+)$/m)?.[1].trim();
    if (!name || !sha512) throw new Error(`could not read ${file}`);
    return {name, sha512, version: for_version};
}

// every file of the release as {name, file}. name is the name on github,
// which is the one the auto updater downloads (the built files have spaces)
function collectFiles(build_dir = BUILD) {
    const files = [];
    const built = fs.existsSync(build_dir) ? fs.readdirSync(build_dir) : [];
    const platforms = [
        {update_file: 'latest.yml', installer: built.find(name => name.endsWith(`${version}.exe`)), blockmap: true},
        {update_file: 'latest-linux.yml', installer: built.find(name => name.endsWith(`${version}.AppImage`))},
    ];
    for (const {update_file, installer, blockmap} of platforms) {
        const update_path = path.join(build_dir, update_file);
        if (!installer || !fs.existsSync(update_path)) {
            throw new Error(`${update_file} or its installer is missing from ${build_dir}, run yarn build first`);
        }
        const update = readUpdateFile(update_path);
        const installer_path = path.join(build_dir, installer);
        if (update.version !== version) {
            throw new Error(`${update_file} is for version ${update.version}, not ${version}. run yarn build again`);
        }
        if (hash(installer_path, 'sha512', 'base64') !== update.sha512) {
            throw new Error(`${installer} does not match ${update_file}, run yarn build again`);
        }
        files.push({name: update.name, file: installer_path});
        if (blockmap) files.push({name: `${update.name}.blockmap`, file: `${installer_path}.blockmap`});
        files.push({name: update_file, file: update_path});
    }
    for (const {file} of files) {
        if (!fs.existsSync(file)) throw new Error(`${file} is missing, run yarn build first`);
    }
    return files;
}

// the changelog of this version from the readme, used as the release notes
function readChangelog() {
    const readme = fs.readFileSync(path.join(ROOT, 'readme.md'), 'utf8').replace(/\r\n/g, '\n');
    const start = readme.indexOf(`### Changelog (${TAG})`);
    if (start === -1) return '';
    const rest = readme.slice(readme.indexOf('\n', start) + 1);
    const end = rest.search(/^### /m);
    return (end === -1 ? rest : rest.slice(0, end)).replace(/<hr[^>]*>/g, '').trim();
}

// the release should be made from a commit that is on github, as that
// is the commit the version tag is put on
function checkGitState() {
    if (git('status', '--porcelain')) throw new Error('there are uncommitted changes, commit them first');
    const head = git('rev-parse', 'HEAD');
    let upstream = null;
    try { upstream = git('rev-parse', '@{u}') } catch { /* no upstream branch */ }
    if (head !== upstream) throw new Error('this commit has not been pushed to github, push it first');
    return head;
}

// finds the draft release for tag, or creates it. there is only ever one
async function ensureDraft(tag, name, commit, body) {
    const releases = (await github(`${API}/releases?per_page=100`)).filter(release => release.tag_name === tag);
    if (releases.some(release => !release.draft)) {
        throw new Error(`${tag} has already been released, change the version in package.json first`);
    }
    if (releases.length > 1) {
        throw new Error(`there are ${releases.length} draft releases for ${tag}, delete them on github and run this again`);
    }
    const details = {tag_name: tag, name, body, target_commitish: commit, draft: true};
    if (releases.length === 1) {
        console.log(`using the existing draft release for ${tag}`);
        return await github(`${API}/releases/${releases[0].id}`, {method: 'PATCH', body: JSON.stringify(details)});
    }
    console.log(`creating a draft release for ${tag}`);
    return await github(`${API}/releases`, {method: 'POST', body: JSON.stringify(details)});
}

// uploads one file to the release, replacing a file of the same name,
// then checks that github holds exactly what is on disk
async function uploadFile(release, {name, file}) {
    const existing = (await github(`${API}/releases/${release.id}/assets?per_page=100`)).find(asset => asset.name === name);
    if (existing) await github(`${API}/releases/assets/${existing.id}`, {method: 'DELETE'});
    const size = fs.statSync(file).size;
    process.stdout.write(`uploading ${name} (${(size / 1024 / 1024).toFixed(1)} MB)... `);
    const asset = await github(`${UPLOADS}/releases/${release.id}/assets?name=${encodeURIComponent(name)}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/octet-stream', 'Content-Length': String(size)},
        body: await fs.openAsBlob(file),
    });
    const expected = `sha256:${hash(file, 'sha256', 'hex')}`;
    if (asset.name !== name || asset.size !== size || (asset.digest && asset.digest !== expected)) {
        throw new Error(`${name} did not upload correctly, run this again`);
    }
    console.log('done');
}

async function main(argv) {
    const live = argv.includes('--live');
    const dry_run = argv.includes('--dry-run');
    if (!process.env.GH_TOKEN) throw new Error('GH_TOKEN must be set to make a release');
    if (!REPO) throw new Error('could not read the github repository from package.json');
    const commit = checkGitState();
    const files = collectFiles();
    const notes = readChangelog();
    console.log(`release ${TAG} of ${REPO} from commit ${commit.slice(0, 7)}:`);
    for (const {name} of files) console.log(`  ${name}`);
    console.log(`  release notes: ${notes ? `${notes.split('\n').length} lines from the readme changelog` : 'none found in the readme'}`);
    if (dry_run) return console.log('dry run, nothing was uploaded');
    const release = await ensureDraft(TAG, version, commit, notes);
    for (const file of files) await uploadFile(release, file);
    const uploaded = await github(`${API}/releases/${release.id}/assets?per_page=100`);
    const missing = files.filter(({name}) => !uploaded.some(asset => asset.name === name && asset.state === 'uploaded'));
    if (missing.length) throw new Error(`missing from the release: ${missing.map(file => file.name).join(', ')}`);
    if (!live) return console.log(`draft release ready with ${files.length} files, publish it at: ${release.html_url}`);
    const published = await github(`${API}/releases/${release.id}`, {method: 'PATCH', body: JSON.stringify({draft: false})});
    console.log(`released ${TAG}: ${published.html_url}`);
}

module.exports = {collectFiles, readChangelog, ensureDraft, uploadFile, github, API};

if (require.main === module) {
    main(process.argv.slice(2)).catch(error => {
        console.error(error.message);
        // not process.exit, which can crash node on windows while the
        // connection to github is still closing
        process.exitCode = 1;
    });
}
