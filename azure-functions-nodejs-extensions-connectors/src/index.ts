// Copyright (c) Microsoft Corporation.  All rights reserved.

// Export types for customer consumption
export type {
    ConnectorTriggerContext,
    ConnectorTriggerHandler,
    TypedTriggerOptions,
    ConnectorContentInputOptions,
    ConnectorContentOutputOptions,
    ConnectorContentBindings,
    ConnectorsContent,
    Office365Triggers,
    SharepointTriggers,
    TeamsTriggers,
    KustoTriggers,
} from '../types';

// Re-export connector SDK item types so customers can import from this package
export type {
    GraphClientReceiveMessage,
    GraphCalendarEventClientReceive,
} from '@azure/connectors/generated/Office365Extensions';
export type { BlobMetadata } from '@azure/connectors/generated/SharepointonlineExtensions';
export type { ChatMessage } from '@azure/connectors/generated/TeamsExtensions';
export type { Row as KustoRow } from '@azure/connectors/generated/KustoExtensions';
export type { TriggerCallbackPayload, TriggerCallbackBody } from '@azure/connectors';

// Export the generic connector trigger registration helper
export { connectorTrigger } from './connectors/connectorTrigger';

// Export first-class connector trigger registrations
export { connectors } from './connectors/connectorsContent';

// Export connector content input/output bindings
export { connectorContent } from './connectors/connectorContent';
