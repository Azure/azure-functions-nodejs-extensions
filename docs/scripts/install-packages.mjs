import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { discoverPackages } from './packages.mjs';

// Use each package's real dependency graph, not a shared SDK version or replacement declarations.
const packages = await discoverPackages();
for (const { directory, manifest } of packages) {
    const lock = JSON.parse(await readFile(path.join(directory, 'package-lock.json'), 'utf8'));
    for (const kind of ['dependencies', 'devDependencies', 'optionalDependencies']) {
        for (const [name, range] of Object.entries(manifest[kind] ?? {})) {
            if (lock.packages?.['']?.[kind]?.[name] !== range) {
                throw new Error(
                    `${manifest.name}: package-lock.json is out of sync for ${name} (${range}). ` +
                    'Publish required SDK versions and regenerate the package lockfile using accessible registry artifacts. ' +
                    'See docs/README.md; no local tarballs or replacement types are used in CI.'
                );
            }
        }
    }
    for (const [location, dependency] of Object.entries(lock.packages ?? {})) {
        if (location && (dependency.link || /^(?:file:|link:)/.test(dependency.resolved ?? ''))) {
            throw new Error(`${manifest.name}: non-portable lockfile dependency ${location}; publish registry artifacts and refresh its lockfile.`);
        }
    }
}
if (process.argv.includes('--check')) {
    console.log('All package lockfiles are in sync and use portable dependency sources');
    process.exit(0);
}
for (const { directory, manifest } of packages) {
    console.log(`Installing declaration dependencies for ${manifest.name}`);
    const npmCli = process.env.npm_execpath;
    const result = spawnSync(npmCli ? process.execPath : 'npm', [
        ...(npmCli ? [npmCli] : []), 'ci', '--ignore-scripts', '--no-audit', '--no-fund',
    ], {
        cwd: directory,
        stdio: 'inherit',
    });
    if (result.status !== 0) {
        throw new Error(`${manifest.name}: npm ci failed. Run through "npm run install:packages"; verify SDK availability and its lockfile. See docs/README.md.`, {
            cause: result.error,
        });
    }
}
