// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import * as assert from 'assert';
import { connectors } from '../src/connectors/connectorTriggers';

describe('connectors namespace', () => {
    it('should expose azureblob with onUpdatedFile', () => {
        assert.strictEqual(typeof connectors.azureblob, 'object');
        assert.strictEqual(typeof connectors.azureblob.onUpdatedFile, 'function');
    });

    it('should expose kusto with onQueryResult', () => {
        assert.strictEqual(typeof connectors.kusto, 'object');
        assert.strictEqual(typeof connectors.kusto.onQueryResult, 'function');
    });

    it('should expose office365 with email and calendar triggers', () => {
        assert.strictEqual(typeof connectors.office365, 'object');
        assert.strictEqual(typeof connectors.office365.onFlaggedEmail, 'function');
        assert.strictEqual(typeof connectors.office365.onNewCalendarEvent, 'function');
        assert.strictEqual(typeof connectors.office365.onNewEmail, 'function');
        assert.strictEqual(typeof connectors.office365.onNewMentionMeEmail, 'function');
        assert.strictEqual(typeof connectors.office365.onUpcomingEvent, 'function');
    });

    it('should expose onedrive with onNewFile and onUpdatedFile', () => {
        assert.strictEqual(typeof connectors.onedrive, 'object');
        assert.strictEqual(typeof connectors.onedrive.onNewFile, 'function');
        assert.strictEqual(typeof connectors.onedrive.onUpdatedFile, 'function');
    });

    it('should expose sharepoint with onNewFile and onUpdatedFile', () => {
        assert.strictEqual(typeof connectors.sharepoint, 'object');
        assert.strictEqual(typeof connectors.sharepoint.onNewFile, 'function');
        assert.strictEqual(typeof connectors.sharepoint.onUpdatedFile, 'function');
    });

    it('should expose teams with channel and membership triggers', () => {
        assert.strictEqual(typeof connectors.teams, 'object');
        assert.strictEqual(typeof connectors.teams.onGroupMembershipAdd, 'function');
        assert.strictEqual(typeof connectors.teams.onGroupMembershipRemoval, 'function');
        assert.strictEqual(typeof connectors.teams.onNewChannelMessage, 'function');
        assert.strictEqual(typeof connectors.teams.onNewChannelMessageMentioningMe, 'function');
    });

    it('should have exactly six connector groups in alphabetical order', () => {
        const connectorKeys = Object.keys(connectors);
        assert.deepStrictEqual(connectorKeys, ['azureblob', 'kusto', 'office365', 'onedrive', 'sharepoint', 'teams']);
    });
});
