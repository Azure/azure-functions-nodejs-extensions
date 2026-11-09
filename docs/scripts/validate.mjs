import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export async function filesUnder(directory) {
    const files = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const file = path.join(directory, entry.name);
        files.push(...(entry.isDirectory() ? await filesUnder(file) : [file]));
    }
    return files;
}

export async function validateSite(site, packages) {
    const files = await filesUnder(site);
    const html = new Map(await Promise.all(files.filter((file) => file.endsWith('.html')).map(async (file) => [file, await readFile(file, 'utf8')])));
    const knownFiles = new Set(files.map((file) => path.resolve(file)));
    let checked = 0;
    for (const [file, content] of html) {
        for (const match of content.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
            const href = match[1].replaceAll('&amp;', '&');
            if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) continue;
            if (href.startsWith('/')) throw new Error(`Root-relative link breaks project Pages: ${file}: ${href}`);
            const [pathname, fragment] = href.split('#');
            const target = pathname ? path.resolve(path.dirname(file), decodeURIComponent(pathname.split('?')[0])) : file;
            if (!knownFiles.has(target)) throw new Error(`Missing link target: ${file}: ${href}`);
            if (fragment && html.has(target)) {
                const id = decodeURIComponent(fragment);
                if (!html.get(target).includes(`id="${id}"`)) throw new Error(`Missing anchor: ${file}: ${href}`);
            }
            checked++;
        }
    }
    for (const { slug, manifest } of packages) {
        const index = path.join(site, slug, 'index.html');
        if (!html.has(index) || !html.get(index).includes(manifest.name)) {
            throw new Error(`Missing package landing page: ${manifest.name}`);
        }
        const api = JSON.parse(await readFile(path.join(site, slug, 'api.json'), 'utf8'));
        if (!api.children?.length) throw new Error(`Empty public API: ${manifest.name}`);
        console.log(`${manifest.name}: ${api.children.length} public reflections`);
    }
    console.log(`Validated ${html.size} HTML pages and ${checked} local links/assets/anchors`);
    return { pages: html.size, links: checked };
}
