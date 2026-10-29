// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { expect } from 'chai';
import { ESLint } from 'eslint';
import * as path from 'path';

describe('ESLint configuration', () => {
    const eslint = new ESLint({ cwd: path.join(__dirname, '..'), fix: false });

    it('uses ESLint 10', () => {
        expect(ESLint.version).to.match(/^10\./);
    });

    it('preserves typed, deprecation, header, and import checks for source files', async () => {
        const config = await eslint.calculateConfigForFile(path.join('src', 'index.ts'));

        for (const rule of [
            '@typescript-eslint/no-unsafe-assignment',
            '@typescript-eslint/no-deprecated',
            '@typescript-eslint/no-unused-expressions',
            'import-x/first',
            'import-x/newline-after-import',
            'import-x/no-duplicates',
            'simple-import-sort/exports',
        ]) {
            expect(config?.rules?.[rule], rule).to.be.an('array').with.property('0', 2);
        }
        expect(config?.rules?.['headers/header-format']).to.be.an('array').with.property('0', 2);
        expect(config?.rules?.['headers/header-format']).to.have.property('1').that.deep.includes({
            source: 'string',
            style: 'line',
            content: 'Copyright (c) .NET Foundation. All rights reserved.\nLicensed under the MIT License.',
            trailingNewlines: 2,
        });
        expect(config?.rules?.['@typescript-eslint/no-non-null-assertion']).to.be.an('array').with.property('0', 1);
    });

    for (const directory of ['scripts', 'test']) {
        it(`preserves the ${directory} overrides`, async () => {
            const filename = directory === 'scripts' ? 'updateVersion.ts' : 'index.ts';
            const config = await eslint.calculateConfigForFile(path.join(directory, filename));

            for (const rule of [
                'no-unsafe-argument',
                'no-unsafe-assignment',
                'no-unsafe-call',
                'no-unsafe-member-access',
                'no-unsafe-return',
            ]) {
                expect(config?.rules?.[`@typescript-eslint/${rule}`], rule).to.be.an('array').with.property('0', 0);
            }
            expect(config?.rules?.['@typescript-eslint/restrict-template-expressions'])
                .to.be.an('array')
                .with.property('0', directory === 'scripts' ? 0 : 2);
            if (directory === 'test') {
                expect(config?.rules?.['@typescript-eslint/no-unused-expressions'])
                    .to.be.an('array')
                    .with.property('0', 0);
                expect(config?.rules?.['chai-friendly/no-unused-expressions']).to.be.an('array').with.property('0', 2);
            }
        });
    }

    it('ignores JavaScript files and generated build output', async () => {
        for (const filename of [
            'webpack.config.js',
            'eslint.config.cjs',
            'output.mjs',
            'out/index.ts',
            'dist/index.ts',
        ]) {
            expect(await eslint.isPathIgnored(filename), filename).to.equal(true);
        }
        expect(await eslint.isPathIgnored(path.join('src', 'index.ts'))).to.equal(false);
    });
});
