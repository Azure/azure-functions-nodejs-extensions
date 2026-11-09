import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Application, TSConfigReader } from 'typedoc';
import ts from 'typescript';
import semver from 'semver';
import { discoverPackages, docs, root } from './packages.mjs';
import { filesUnder, validateSite } from './validate.mjs';

const packages = await discoverPackages();
const site = path.join(docs, 'site');
const build = path.join(docs, '.build');
await rm(site, { recursive: true, force: true });
await mkdir(site, { recursive: true });
await mkdir(build, { recursive: true });

const escape = (text) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const localPaths = Object.fromEntries(packages.map(({ manifest, directory }) => [manifest.name, [path.join(directory, manifest.types)]]));
for (const { directory, manifest, slug } of packages) {
    const declarationFiles = (await filesUnder(path.dirname(path.join(directory, manifest.types)))).filter((file) => file.endsWith('.d.ts'));
    const imports = new Set();
    for (const file of declarationFiles) {
        for (const imported of ts.preProcessFile(await readFile(file, 'utf8')).importedFiles) {
            const name = imported.fileName;
            if (!name.startsWith('.') && !name.startsWith('node:')) imports.add(name);
        }
    }
    // Explicit paths preserve package-specific SDK resolution even though the generated tsconfig lives in docs.
    const paths = { ...localPaths };
    for (const specifier of imports) {
        if (localPaths[specifier]) continue;
        const name = specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0];
        const range = manifest.dependencies?.[name] ?? manifest.devDependencies?.[name] ?? manifest.peerDependencies?.[name];
        try {
            const installed = JSON.parse(await readFile(path.join(directory, 'node_modules', name, 'package.json'), 'utf8'));
            if (range && !semver.satisfies(installed.version, range)) throw new Error(`installed ${installed.version}, required ${range}`);
            const resolved = ts.resolveModuleName(specifier, path.join(directory, manifest.types), {
                moduleResolution: ts.ModuleResolutionKind.Bundler,
                resolvePackageJsonExports: true,
            }, ts.sys).resolvedModule;
            if (!resolved) throw new Error('public declaration import could not be resolved');
            paths[specifier] = [resolved.resolvedFileName];
        } catch (error) {
            throw new Error(`${manifest.name}: missing/incompatible ${specifier} (${range ?? 'undeclared'}): ${error.message}. See docs/README.md.`);
        }
    }
    const tsconfig = path.join(build, `${slug}.json`);
    await writeFile(tsconfig, JSON.stringify({
        compilerOptions: {
            target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler',
            strict: true, noEmit: true, skipLibCheck: false, esModuleInterop: true,
            types: ['node'], typeRoots: [path.join(docs, 'node_modules', '@types')],
            baseUrl: root, paths,
        },
        files: [path.join(directory, manifest.types)],
    }, null, 2));
    const app = await Application.bootstrap({
        name: manifest.name,
        // TypeDoc interprets entrypoints as globs, which require slash separators on Windows too.
        entryPoints: [path.join(directory, manifest.types).split(path.sep).join('/')],
        tsconfig,
        readme: 'none',
        excludeExternals: false,
        excludePrivate: true,
        excludeProtected: true,
        includeVersion: true,
        disableSources: true,
        githubPages: true,
        navigationLinks: { 'All extensions': '../index.html' },
        validation: { notExported: false, invalidLink: true, notDocumented: false },
        treatWarningsAsErrors: true,
        compilerOptions: { skipLibCheck: false },
    }, [new TSConfigReader()]);
    app.converter.addUnknownSymbolResolver((reference) => {
        if (reference.symbolReference?.path?.map((part) => part.path).join('.') === 'app.connectorTrigger') {
            return 'https://github.com/Azure/azure-functions-nodejs-library/blob/main/src/app.ts';
        }
    });
    const project = await app.convert();
    if (!project) throw new Error(`${manifest.name}: TypeDoc conversion failed`);
    const config = ts.readConfigFile(tsconfig, ts.sys.readFile).config;
    const parsed = ts.parseJsonConfigFileContent(config, ts.sys, build);
    const program = ts.createProgram(parsed.fileNames, parsed.options);
    const checker = program.getTypeChecker();
    const source = program.getSourceFile(path.join(directory, manifest.types));
    const exported = checker.getExportsOfModule(checker.getSymbolAtLocation(source)).map((symbol) => symbol.name);
    const documented = new Set(project.children?.map((reflection) => reflection.name));
    const missing = exported.filter((name) => !documented.has(name));
    if (missing.length) throw new Error(`${manifest.name}: undocumented public exports: ${missing.join(', ')}`);
    app.validate(project);
    if (app.logger.hasErrors() || app.logger.hasWarnings()) throw new Error(`${manifest.name}: TypeDoc validation failed`);
    await app.generateDocs(project, path.join(site, slug));
    await app.generateJson(project, path.join(site, slug, 'api.json'));
    if (app.logger.hasErrors() || app.logger.hasWarnings()) throw new Error(`${manifest.name}: TypeDoc rendering failed`);
}
await writeFile(path.join(site, '.nojekyll'), '');
await writeFile(path.join(site, 'index.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Azure Functions TypeScript extensions — API reference</title>
<style>body{font:1.1rem/1.6 system-ui,sans-serif;max-width:65rem;margin:3rem auto;padding:0 1.5rem;color:#17233b}a{color:#005a9e}li{margin:1rem 0}code{background:#eef3f8;padding:.15rem .3rem}</style></head>
<body><main><h1>Azure Functions TypeScript extensions</h1>
<p>API reference generated from the public TypeScript declarations in this repository. Select an extension to browse its exported types, methods, and options.</p>
<ul>${packages.map(({ manifest, slug }) => `<li><a href="${slug}/index.html"><code>${escape(manifest.name)}</code></a> <strong>${escape(manifest.version)}</strong><br>${escape(manifest.description ?? '')}</li>`).join('\n')}</ul>
<h2>Getting started</h2><p>Use the <a href="https://github.com/Azure/azure-functions-nodejs-extensions">repository guides and samples</a> for installation, host requirements, and runnable examples.
Preview packages may change before general availability. This reference tracks the repository's default branch, not necessarily the latest npm release.</p>
<p><a href="https://github.com/Azure/azure-functions-nodejs-extensions/blob/HEAD/docs/README.md">Documentation maintenance and publishing</a> ·
<a href="https://learn.microsoft.com/azure/azure-functions/">Azure Functions documentation</a></p></main></body></html>`);
await validateSite(site, packages);
