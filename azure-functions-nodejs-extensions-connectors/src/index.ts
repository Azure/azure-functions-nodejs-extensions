// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

// Export types for customer consumption
export type {
    AzureBlobFileTriggerContext,
    CalendarEventTriggerContext,
    ChannelMessageTriggerContext,
    ConnectorTriggerContext,
    ConnectorTriggerHandler,
    ConnectorTriggerOptions,
    ConnectorTriggers,
    EmailTriggerContext,
    FileTriggerContext,
    GroupMembershipChange,
    GroupMembershipTriggerContext,
    KustoTriggers,
    AzureBlobTriggers,
    Office365Triggers,
    OneDriveFileTriggerContext,
    OneDriveTriggers,
    QueryResultTriggerContext,
    SharepointTriggers,
    TeamsTriggers,
} from '../types';

// Re-export connector SDK item types so customers can import from this package
export type { TriggerCallbackBody, TriggerCallbackPayload } from '@azure/connectors';
export type { BlobMetadata as AzureBlobMetadata } from '@azure/connectors/generated/AzureblobExtensions';
export type { Row as KustoRow } from '@azure/connectors/generated/KustoExtensions';
export type {
    GraphCalendarEventClientReceive,
    GraphClientReceiveMessage,
} from '@azure/connectors/generated/Office365Extensions';
export type { BlobMetadata as OneDriveBlobMetadata } from '@azure/connectors/generated/OnedriveforbusinessExtensions';
export type { BlobMetadata } from '@azure/connectors/generated/SharepointonlineExtensions';
export type { ChatMessage } from '@azure/connectors/generated/TeamsExtensions';

// Export the generic connector trigger registration helper
export { connectorTrigger } from './connectors/connectorTrigger';

// Export first-class connector trigger registrations
export { connectors } from './connectors/connectorTriggers';
