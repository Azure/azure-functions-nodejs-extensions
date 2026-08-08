/**
 * Creates a deployment zip for Azure Functions.
 * - Uses archiver to produce forward-slash paths (Linux compatible)
 * - Resolves npm junctions/symlinks (e.g. local-path dependencies)
 * - No temp directory needed — adds files directly to zip
 */
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const projectRoot = path.resolve(__dirname, '..');
const outputPath = path.join(projectRoot, 'deploy.zip');

// The local extension source (junction target)
const expressExtSource = path.resolve(projectRoot, '../../extensions/functions-express');

async function createDeployZip() {
    console.log('Creating deployment zip for Azure Functions...\n');

    if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
    }

    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 6 } });

    const promise = new Promise((resolve, reject) => {
        output.on('close', () => {
            const sizeMB = (archive.pointer() / (1024 * 1024)).toFixed(2);
            console.log(`\nDone! deploy.zip = ${sizeMB} MB`);
            console.log('\nDeploy with:');
            console.log('  az functionapp deployment source config-zip -g <rg> -n <app> --src deploy.zip');
            resolve();
        });
        archive.on('error', reject);
        archive.on('warning', (err) => {
            if (err.code !== 'ENOENT') reject(err);
        });
    });

    archive.pipe(output);

    // 1) Add host.json and package.json
    console.log('Adding host.json...');
    archive.file(path.join(projectRoot, 'host.json'), { name: 'host.json' });

    console.log('Adding package.json...');
    archive.file(path.join(projectRoot, 'package.json'), { name: 'package.json' });

    // 2) Add dist/
    console.log('Adding dist/...');
    archive.directory(path.join(projectRoot, 'dist'), 'dist');

    // 3) Add node_modules/ — but skip the junction for @azure/functions-extensions-express
    console.log('Adding node_modules/...');
    const nodeModulesPath = path.join(projectRoot, 'node_modules');
    const entries = fs.readdirSync(nodeModulesPath);

    for (const entry of entries) {
        const fullPath = path.join(nodeModulesPath, entry);
        const lstat = fs.lstatSync(fullPath);

        // Skip .package-lock.json, .cache, etc.
        if (entry.startsWith('.')) continue;

        if (entry.startsWith('@')) {
            // Scoped package — iterate sub-entries
            const scopedEntries = fs.readdirSync(fullPath);
            for (const subEntry of scopedEntries) {
                const subFullPath = path.join(fullPath, subEntry);
                const subLstat = fs.lstatSync(subFullPath);
                const zipPath = `node_modules/${entry}/${subEntry}`;

                if (subLstat.isSymbolicLink() || isJunction(subFullPath)) {
                    // Resolve the junction/symlink target
                    const realPath = fs.realpathSync(subFullPath);
                    console.log(`  Resolving junction: ${entry}/${subEntry} -> ${realPath}`);
                    addResolvedPackage(archive, realPath, zipPath);
                } else if (subLstat.isDirectory()) {
                    archive.directory(subFullPath, zipPath);
                } else {
                    archive.file(subFullPath, { name: zipPath });
                }
            }
        } else if (lstat.isSymbolicLink() || isJunction(fullPath)) {
            const realPath = fs.realpathSync(fullPath);
            console.log(`  Resolving junction: ${entry} -> ${realPath}`);
            addResolvedPackage(archive, realPath, `node_modules/${entry}`);
        } else if (lstat.isDirectory()) {
            archive.directory(fullPath, `node_modules/${entry}`);
        } else {
            archive.file(fullPath, { name: `node_modules/${entry}` });
        }
    }

    console.log('\nFinalizing zip...');
    archive.finalize();

    return promise;
}

/**
 * Check if a path is a Windows junction (different from symlink).
 * On Windows, junctions have lstat().isSymbolicLink() = false but reparse point attributes.
 */
function isJunction(fullPath) {
    try {
        const lstat = fs.lstatSync(fullPath);
        const stat = fs.statSync(fullPath);
        // If lstat says it's not a directory but stat says it is, it's a junction
        // Actually for junctions, lstat.isDirectory() is true but realpath differs
        const realPath = fs.realpathSync(fullPath);
        return realPath !== fullPath && lstat.isDirectory();
    } catch {
        return false;
    }
}

/**
 * Add a resolved package (from a junction/symlink) to the archive.
 * Only includes distributable files: dist/, types/, lib/, package.json, README.md, LICENSE
 * Also includes production dependencies from the resolved package's node_modules.
 */
function addResolvedPackage(archive, realPath, zipPrefix) {
    // Only include these specific items from the resolved package
    const allowedItems = ['package.json', 'README.md', 'LICENSE', 'dist', 'types', 'types-core', 'lib'];

    // Read dependencies from package.json to know which transitive deps to include
    let prodDeps = {};
    const pkgPath = path.join(realPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        prodDeps = pkg.dependencies || {};
    }

    // Add only allowed distributable items
    for (const item of allowedItems) {
        const itemPath = path.join(realPath, item);
        if (!fs.existsSync(itemPath)) continue;

        const stat = fs.statSync(itemPath);
        if (stat.isDirectory()) {
            archive.directory(itemPath, `${zipPrefix}/${item}`);
        } else {
            archive.file(itemPath, { name: `${zipPrefix}/${item}` });
        }
    }

    // Include production dependencies from the resolved package's node_modules
    const nestedNodeModules = path.join(realPath, 'node_modules');
    if (fs.existsSync(nestedNodeModules) && Object.keys(prodDeps).length > 0) {
        console.log(`    Including production deps for ${zipPrefix}:`);
        includeProductionDeps(archive, nestedNodeModules, 'node_modules', prodDeps);
    }
}

/**
 * Include only production dependencies from a nested node_modules into top-level node_modules.
 * @param {*} archive - archiver instance
 * @param {string} nodeModulesPath - path to nested node_modules
 * @param {string} topLevelPrefix - "node_modules" (where to put them in the zip)
 * @param {Object} prodDeps - the "dependencies" from the parent package.json
 */
function includeProductionDeps(archive, nodeModulesPath, topLevelPrefix, prodDeps) {
    if (!fs.existsSync(nodeModulesPath)) return;

    const depNames = Object.keys(prodDeps);

    for (const depName of depNames) {
        // Handle scoped packages like @azure/functions-extensions-base
        const depPath = path.join(nodeModulesPath, ...depName.split('/'));

        if (!fs.existsSync(depPath)) {
            console.log(`      SKIP (not found): ${depName}`);
            continue;
        }

        const zipPath = `${topLevelPrefix}/${depName}`;
        console.log(`      Adding: ${depName}`);

        if (fs.statSync(depPath).isDirectory()) {
            archive.directory(depPath, zipPath);
        } else {
            archive.file(depPath, { name: zipPath });
        }
    }
}

createDeployZip().catch((err) => {
    console.error('Error creating zip:', err);
    process.exit(1);
});
