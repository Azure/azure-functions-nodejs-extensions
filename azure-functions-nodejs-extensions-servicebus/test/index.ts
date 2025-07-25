// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import globby from 'globby';
import Mocha from 'mocha';
import * as path from 'path';

export async function run(): Promise<void> {
    try {
        const options: Mocha.MochaOptions = {
            color: true,
            require: ['ts-node/register'],
            reporter: 'mocha-multi-reporters',
            reporterOptions: {
                reporterEnabled: 'spec, mocha-junit-reporter',
                mochaJunitReporterReporterOptions: {
                    mochaFile: path.resolve(__dirname, '..', 'test', 'unit-test-results.xml'),
                },
            },
        };

        addEnvVarsToMochaOptions(options);

        const mocha = new Mocha(options);

        const files: string[] = await globby(['**/**.test.ts', '!types/**'], { cwd: __dirname });

        files.forEach((f) => mocha.addFile(path.resolve(__dirname, f)));

        const failures = await new Promise<number>((resolve) => mocha.run(resolve));
        if (failures > 0) {
            throw new Error(`${failures} tests failed.`);
        }
    } catch (err) {
        console.error(err);
        console.error('Test run failed');
        process.exit(1);
    }
}

function addEnvVarsToMochaOptions(options: Mocha.MochaOptions): void {
    for (const envVar of Object.keys(process.env)) {
        const match: RegExpMatchArray | null = envVar.match(/^mocha_(.+)/i);
        if (match && match[1]) {
            const [, option] = match;
            let value: string | number = process.env[envVar] || '';
            if (typeof value === 'string' && !isNaN(parseInt(value))) {
                value = parseInt(value);
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            (<any>options)[option] = value;
        }
    }
}

void run();
