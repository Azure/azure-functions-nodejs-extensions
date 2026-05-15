// Copyright (c) Microsoft Corporation.  All rights reserved.

import * as assert from 'assert';
import { connectors } from '../src/connectors/connectorTriggers';

describe('connectors namespace', () => {
    it('should expose kusto with onQueryResult', () => {
        assert.strictEqual(typeof connectors.kusto, 'object');
        assert.strictEqual(typeof connectors.kusto.onQueryResult, 'function');
    });

    it('should expose office365 with onNewCalendarEvent and onNewEmail', () => {
        assert.strictEqual(typeof connectors.office365, 'object');
        assert.strictEqual(typeof connectors.office365.onNewCalendarEvent, 'function');
        assert.strictEqual(typeof connectors.office365.onNewEmail, 'function');
    });

    it('should expose sharepoint with onNewFile and onUpdatedFile', () => {
        assert.strictEqual(typeof connectors.sharepoint, 'object');
        assert.strictEqual(typeof connectors.sharepoint.onNewFile, 'function');
        assert.strictEqual(typeof connectors.sharepoint.onUpdatedFile, 'function');
    });

    it('should expose teams with onNewChannelMessage', () => {
        assert.strictEqual(typeof connectors.teams, 'object');
        assert.strictEqual(typeof connectors.teams.onNewChannelMessage, 'function');
    });

    it('should have exactly four connector groups in alphabetical order', () => {
        const connectorKeys = Object.keys(connectors);
        assert.deepStrictEqual(connectorKeys, ['kusto', 'office365', 'sharepoint', 'teams']);
    });
});
