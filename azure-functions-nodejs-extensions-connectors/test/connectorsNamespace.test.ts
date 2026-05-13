// Copyright (c) Microsoft Corporation.  All rights reserved.

import * as assert from 'assert';
import { connectors } from '../src/connectors/connectorsContent';

describe('connectors namespace', () => {
    it('should expose office365 with onNewEmail and onNewCalendarEvent', () => {
        assert.strictEqual(typeof connectors.office365, 'object');
        assert.strictEqual(typeof connectors.office365.onNewEmail, 'function');
        assert.strictEqual(typeof connectors.office365.onNewCalendarEvent, 'function');
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

    it('should expose kusto with onQueryResult', () => {
        assert.strictEqual(typeof connectors.kusto, 'object');
        assert.strictEqual(typeof connectors.kusto.onQueryResult, 'function');
    });

    it('should have exactly four connector groups', () => {
        const connectorKeys = Object.keys(connectors);
        assert.deepStrictEqual(connectorKeys.sort(), ['kusto', 'office365', 'sharepoint', 'teams']);
    });
});
