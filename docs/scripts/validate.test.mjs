import assert from 'node:assert/strict';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { discoverPackages, docs } from './packages.mjs';
import { validateSite } from './validate.mjs';

test('discovers all extension packages, including the four current packages', async () => {
    const packages = await discoverPackages();
    for (const slug of ['base', 'blob', 'connectors', 'servicebus']) {
        assert.ok(packages.some((pkg) => pkg.slug === slug), `Missing ${slug}`);
    }
    assert.equal(new Set(packages.map((pkg) => pkg.slug)).size, packages.length);
});

test('validates relative files, assets and anchors and rejects broken project-site links', async () => {
    const directory = path.join(docs, '.build', 'validator-test');
    await mkdir(directory, { recursive: true });
    try {
        await writeFile(path.join(directory, 'index.html'), '<a href="other.html#api">API</a><img src="logo.svg">');
        await writeFile(path.join(directory, 'other.html'), '<h1 id="api">API</h1>');
        await writeFile(path.join(directory, 'logo.svg'), '<svg/>');
        assert.deepEqual(await validateSite(directory, []), { pages: 2, links: 2 });
        for (const href of ['missing.html', 'other.html#absent', '/other.html', '../outside.html']) {
            await writeFile(path.join(directory, 'index.html'), `<a href="${href}">Broken</a>`);
            await assert.rejects(validateSite(directory, []));
        }
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test('rejects missing package output and empty API manifests', async () => {
    const directory = path.join(docs, '.build', 'empty-api-test');
    await mkdir(path.join(directory, 'sample'), { recursive: true });
    const packages = [{ slug: 'sample', manifest: { name: '@azure/functions-extensions-sample' } }];
    try {
        await assert.rejects(validateSite(directory, packages), /Missing package landing/);
        await writeFile(path.join(directory, 'sample', 'index.html'), packages[0].manifest.name);
        await writeFile(path.join(directory, 'sample', 'api.json'), '{"children":[]}');
        await assert.rejects(validateSite(directory, packages), /Empty public API/);
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});
