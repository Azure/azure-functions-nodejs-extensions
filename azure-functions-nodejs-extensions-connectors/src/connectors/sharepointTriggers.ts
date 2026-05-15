// Copyright (c) Microsoft Corporation.  All rights reserved.

import { BlobMetadata } from '@azure/connectors/generated/SharepointonlineExtensions';
import { ConnectorTriggerOptions } from '../../types';
import { connectorTrigger } from './connectorTrigger';

/**
 * Registers a trigger that fires when a new file is created in SharePoint.
 * The handler receives a typed context where `items` is `BlobMetadata[]`.
 *
 * @param name - The function name used for registration and routing.
 * @param options - The trigger options including handler.
 */
export function onNewFile(name: string, options: ConnectorTriggerOptions<BlobMetadata>): void {
    connectorTrigger<BlobMetadata>(name, {
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
 * @param options - The trigger options including handler.
 */
export function onUpdatedFile(name: string, options: ConnectorTriggerOptions<BlobMetadata>): void {
    connectorTrigger<BlobMetadata>(name, {
        extraInputs: options.extraInputs,
        extraOutputs: options.extraOutputs,
        return: options.return,
        handler: options.handler,
    });
}
