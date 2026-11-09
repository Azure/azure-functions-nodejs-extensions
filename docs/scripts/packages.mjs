import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const docs = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const root = path.dirname(docs);

export async function discoverPackages() {
    const packages = [];
    for (const entry of await readdir(root, { withFileTypes: true })) {
        if (!entry.isDirectory() || !entry.name.startsWith('azure-functions-nodejs-extensions-')) continue;
        const directory = path.join(root, entry.name);
        const manifest = JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8'));
        if (!manifest.name?.startsWith('@azure/functions-extensions-') || !manifest.types) {
            throw new Error(`${entry.name}: expected an extension package with a public types entrypoint`);
        }
        await access(path.join(directory, manifest.types));
        packages.push({
            directory,
            manifest,
            slug: manifest.name.replace('@azure/functions-extensions-', ''),
        });
    }
    if (!packages.length) throw new Error('No extension packages discovered');
    return packages.sort((a, b) => a.slug.localeCompare(b.slug));
}
