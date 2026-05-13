// Copyright (c) Microsoft Corporation.  All rights reserved.

import { FunctionInput, FunctionOutput, InvocationContext } from '@azure/functions';
import { BlobMetadata } from '@azure/connectors/generated/SharepointonlineExtensions';
import { ConnectorTriggerContext } from '../../types';
import { connectorTrigger } from './connectorTrigger';

const CONNECTOR_NAME = 'sharepointonline';

/**
 * Options for registering a SharePoint file trigger.
 */
interface SharepointFileTriggerOptions {
    connection: string;
    extraInputs?: FunctionInput[];
    extraOutputs?: FunctionOutput[];
    return?: FunctionOutput;
    handler: (context: ConnectorTriggerContext<BlobMetadata>, invocationContext: InvocationContext) => Promise<unknown>;
}

/**
 * Registers a trigger that fires when a new file is created in SharePoint.
 * The handler receives a typed context where `items` is `BlobMetadata[]`.
 * @param name The function name.
 * @param options The trigger options including connection and handler.
 */
export function onNewFile(name: string, options: SharepointFileTriggerOptions): void {
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
 * @param name The function name.
 * @param options The trigger options including connection and handler.
 */
export function onUpdatedFile(name: string, options: SharepointFileTriggerOptions): void {
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
