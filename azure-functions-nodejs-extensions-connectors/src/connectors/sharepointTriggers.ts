// Copyright (c) Microsoft Corporation.  All rights reserved.

import { BlobMetadata } from '@azure/connectors/generated/SharepointonlineExtensions';
import { TypedTriggerOptions } from '../../types';
import { connectorTrigger } from './connectorTrigger';

const CONNECTOR_NAME = 'sharepointonline';

/**
 * Registers a trigger that fires when a new file is created in SharePoint.
 * The handler receives a typed context where `items` is `BlobMetadata[]`.
 *
 * @param name - The function name used for registration and routing.
 * @param options - The trigger options including connection and handler.
 */
export function onNewFile(name: string, options: TypedTriggerOptions<BlobMetadata>): void {
    connectorTrigger<BlobMetadata>(name, {
        connection: options.connection,
        connector: CONNECTOR_NAME,
        triggerOperation: 'OnNewFile',
        extraInputs: options.extraInputs,
        extraOutputs: options.extraOutputs,
        return: options.return,
        handler: options.handler,
    });
}

/**
 * Registers a trigger that fires when an existing file is modified in SharePoint.
 * The handler receives a typed context where `items` is `BlobMetadata[]`.
 *
 * @param name - The function name used for registration and routing.
 * @param options - The trigger options including connection and handler.
 */
export function onUpdatedFile(name: string, options: TypedTriggerOptions<BlobMetadata>): void {
    connectorTrigger<BlobMetadata>(name, {
        connection: options.connection,
        connector: CONNECTOR_NAME,
        triggerOperation: 'OnUpdatedFile',
        extraInputs: options.extraInputs,
        extraOutputs: options.extraOutputs,
        return: options.return,
        handler: options.handler,
    });
}
