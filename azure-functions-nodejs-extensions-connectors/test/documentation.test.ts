// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import * as assert from 'assert';
import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import ts from 'typescript';
import { DataflowsTriggerOperations } from '@azure/connectors/generated/DataflowsExtensions';
import { Office365TriggerOperations } from '@azure/connectors/generated/Office365Extensions';
import { OnedriveforbusinessTriggerOperations } from '@azure/connectors/generated/OnedriveforbusinessExtensions';
import { PlannerTriggerOperations } from '@azure/connectors/generated/PlannerExtensions';
import { SalesforceTriggerOperations } from '@azure/connectors/generated/SalesforceExtensions';
import { SharepointonlineTriggerOperations } from '@azure/connectors/generated/SharepointonlineExtensions';
import { TeamsTriggerOperations } from '@azure/connectors/generated/TeamsExtensions';
import { VisualstudioteamservicesTriggerOperations } from '@azure/connectors/generated/VisualstudioteamservicesExtensions';
import { connectors } from '../src';

const root = resolve(__dirname, '..');
const documents = ['README.md', 'samples/README.md'].map((name) => ({
    path: resolve(root, name),
    content: readFileSync(resolve(root, name), 'utf8'),
}));
const readme = documents[0];
assert.ok(readme);
const operations: Record<string, Readonly<Record<string, string>>> = {
    dataflows: DataflowsTriggerOperations,
    office365: Office365TriggerOperations,
    onedriveforbusiness: OnedriveforbusinessTriggerOperations,
    planner: PlannerTriggerOperations,
    salesforce: SalesforceTriggerOperations,
    sharepoint: SharepointonlineTriggerOperations,
    teams: TeamsTriggerOperations,
    vsts: VisualstudioteamservicesTriggerOperations,
};
const inventory: { group: string; helper: string; operation: string; context: string; alias: string; item: string }[] = [];
let group = '';
for (const line of readme.content.split(/\r?\n/)) {
    const heading = /^### .+ \(`(\w+)`\)$/.exec(line);
    if (heading) {
        group = heading[1] ?? '';
    }
    const row = /^\| `(on\w+)` \| (`[^`]+`|Not an SDK trigger operation) \| `(\w+)` \| `(\w+): (.+)\[\]` \|$/.exec(line);
    if (row) {
        assert.ok(group, 'A trigger table must have a connector namespace heading.');
        inventory.push({
            group, helper: row[1] ?? '', operation: row[2]?.replace(/`/g, '') ?? '',
            context: row[3] ?? '', alias: row[4] ?? '', item: row[5] ?? '',
        });
    }
}

describe('documentation', () => {
    it('documents every exported named helper exactly once', () => {
        const actual = Object.entries(connectors).flatMap(([name, triggers]) =>
            Object.keys(triggers).map((helper) => `${name}.${helper}`));
        assert.deepStrictEqual(inventory.map((entry) => `${entry.group}.${entry.helper}`).sort(), actual.sort());
    });

    it('keeps documented operation IDs synchronized with the SDK', () => {
        for (const entry of inventory) {
            if (entry.group === 'kusto') {
                assert.strictEqual(entry.operation, 'Not an SDK trigger operation');
                continue;
            }
            const name = entry.helper === 'onNewCalendarEvent' ? 'OnCalendarNewItems' :
                entry.helper.charAt(0).toUpperCase() + entry.helper.slice(1);
            assert.strictEqual(entry.operation, operations[entry.group]?.[name], `${entry.group}.${entry.helper}`);
        }
    });

    it('keeps installation instructions synchronized with the manifest', () => {
        const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
            name: string; version: string; dependencies: Record<string, string>; peerDependencies: Record<string, string>;
        };
        assert.ok(readme.content.includes(`${manifest.name}@${manifest.version}`));
        assert.ok(readme.content.includes(`@azure/functions@${manifest.peerDependencies['@azure/functions']}`));
        assert.ok(readme.content.includes(`@azure/connectors ${manifest.dependencies['@azure/connectors']}`));
    });

    it('links to existing local files and folders', () => {
        for (const document of documents) {
            for (const match of document.content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
                const target = match[1];
                assert.ok(target);
                if (/^(?:https?:|mailto:|#)/.test(target)) {
                    continue;
                }
                const file = target.split('#')[0];
                assert.ok(file);
                assert.ok(existsSync(resolve(dirname(document.path), file)), `${document.path}: missing ${target}`);
            }
        }
    });

    it('type-checks examples and documented contexts, aliases and item types', function () {
        this.timeout(30000);
        const config = ts.readConfigFile(resolve(root, 'tsconfig.json'), ts.sys.readFile);
        assert.strictEqual(config.error, undefined);
        const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
        assert.deepStrictEqual(parsed.errors, []);
        const sources = new Map<string, string>();
        let index = 0;
        for (const document of documents) {
            for (const match of document.content.matchAll(/^```typescript\r?\n([\s\S]*?)^```/gm)) {
                assert.ok(match[1]);
                sources.set(resolve(root, `__documentation_example_${index++}.ts`), match[1]);
            }
        }
        assert.ok(index > 0, 'No TypeScript documentation examples found.');
        const imports = new Set(inventory.flatMap((entry) =>
            [entry.context, ...(/^\w+$/.test(entry.item) ? [entry.item] : [])]));
        sources.set(resolve(root, '__documentation_inventory.ts'), [
            "import { connectors } from '@azure/functions-extensions-connectors';",
            `import type { ${[...imports].join(', ')} } from '@azure/functions-extensions-connectors';`,
            ...inventory.map((entry) => `
connectors.${entry.group}.${entry.helper}('documentation', {
    handler: async (context) => {
        const documented: ${entry.context} = context;
        const inferred: typeof context = documented;
        const items: ${entry.item}[] = inferred.${entry.alias};
        return items;
    },
});`),
        ].join('\n'));
        const options = { ...parsed.options, noEmit: true };
        const host = ts.createCompilerHost(options);
        const getSourceFile = host.getSourceFile.bind(host);
        host.getSourceFile = (name, languageVersion, onError, createNew) => {
            const content = sources.get(resolve(name));
            return content === undefined ? getSourceFile(name, languageVersion, onError, createNew) :
                ts.createSourceFile(name, content, languageVersion);
        };
        const program = ts.createProgram([...sources.keys()], options, host);
        const diagnostics = ts.getPreEmitDiagnostics(program);
        assert.strictEqual(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
            getCurrentDirectory: () => root,
            getCanonicalFileName: (name) => name,
            getNewLine: () => '\n',
        }));
    });
});
