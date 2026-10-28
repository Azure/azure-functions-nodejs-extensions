// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { BlobMetadata, DeletedItem, Item } from '@azure/connectors/generated/SharepointonlineExtensions';
import { ConnectorTriggerOptions, DeletedItemTriggerContext, FileTriggerContext, SharepointItemTriggerContext } from '../../types';
import { connectorTrigger } from './connectorTrigger';
import { createConnectorTrigger } from './createConnectorTrigger';

const registerItemTrigger = createConnectorTrigger<Item, SharepointItemTriggerContext>(
    (context) => ({ ...context, records: context.items }),
);
const registerDeletedItemTrigger = createConnectorTrigger<DeletedItem, DeletedItemTriggerContext>(
    (context) => ({ ...context, deletedItems: context.items }),
);

/**
 * Registers a trigger that fires when a new file is created in SharePoint.
 * The handler receives a typed context where `files` is `BlobMetadata[]`.
 *
 * @param name - The function name used for registration and routing.
 * @param options - The trigger options including handler.
 */
export function onNewFile(name: string, options: ConnectorTriggerOptions<BlobMetadata, FileTriggerContext>): void {
    connectorTrigger<BlobMetadata>(name, {
        ...options,
        handler: async (context, invocationContext) => {
            const fileContext: FileTriggerContext = {
                ...context,
                files: context.items,
            };

            return options.handler(fileContext, invocationContext);
        },
    });
}

/**
 * Registers a trigger that fires when an existing file is modified in SharePoint.
 * The handler receives a typed context where `files` is `BlobMetadata[]`.
 *
 * @param name - The function name used for registration and routing.
 * @param options - The trigger options including handler.
 */
export function onUpdatedFile(name: string, options: ConnectorTriggerOptions<BlobMetadata, FileTriggerContext>): void {
    connectorTrigger<BlobMetadata>(name, {
        ...options,
        handler: async (context, invocationContext) => {
            const fileContext: FileTriggerContext = {
                ...context,
                files: context.items,
            };

            return options.handler(fileContext, invocationContext);
        },
    });
}

/**
 * Registers changed SharePoint list items.
 * @param name - The function name used for registration and routing.
 * @param options - The handler and optional input/output bindings.
 */
export const onChangedItems = registerItemTrigger;

/**
 * Registers deleted SharePoint files.
 * @param name - The function name used for registration and routing.
 * @param options - The handler and optional input/output bindings.
 */
export const onDeletedFileItems = registerDeletedItemTrigger;

/**
 * Registers deleted SharePoint list items.
 * @param name - The function name used for registration and routing.
 * @param options - The handler and optional input/output bindings.
 */
export const onDeletedItems = registerDeletedItemTrigger;

/**
 * Registers new SharePoint file properties, not file content.
 * @param name - The function name used for registration and routing.
 * @param options - The handler and optional input/output bindings.
 */
export const onNewFileItems = registerItemTrigger;

/**
 * Registers newly created SharePoint list items.
 * @param name - The function name used for registration and routing.
 * @param options - The handler and optional input/output bindings.
 */
export const onNewItems = registerItemTrigger;

/**
 * Registers SharePoint list items submitted through a form.
 * @param name - The function name used for registration and routing.
 * @param options - The handler and optional input/output bindings.
 */
export const onNewItemsFromForm = registerItemTrigger;

/**
 * Registers recurring SharePoint list item digests.
 * @param name - The function name used for registration and routing.
 * @param options - The handler and optional input/output bindings.
 */
export const onRecurrenceDigest = registerItemTrigger;

/**
 * Registers SharePoint file classification changes.
 * @param name - The function name used for registration and routing.
 * @param options - The handler and optional input/output bindings.
 */
export const onUpdatedFileClassifiedTimes = registerItemTrigger;

/**
 * Registers updated SharePoint file properties, not file content.
 * @param name - The function name used for registration and routing.
 * @param options - The handler and optional input/output bindings.
 */
export const onUpdatedFileItems = registerItemTrigger;

/**
 * Registers updated SharePoint list items.
 * @param name - The function name used for registration and routing.
 * @param options - The handler and optional input/output bindings.
 */
export const onUpdatedItems = registerItemTrigger;
