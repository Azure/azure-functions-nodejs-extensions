// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { BlobMetadata } from '@azure/connectors/generated/OnedriveforbusinessExtensions';
import { OneDriveFileTriggerContext } from '../../types';
import { createConnectorTrigger } from './createConnectorTrigger';

const registerFileTrigger = createConnectorTrigger<BlobMetadata, OneDriveFileTriggerContext>(
    (context) => ({ ...context, files: context.items }),
);

/**
 * Registers newly created OneDrive for Business file metadata.
 * @param name - The function name used for registration and routing.
 * @param options - The handler and optional input/output bindings.
 */
export const onNewFiles = registerFileTrigger;

/**
 * Registers updated OneDrive for Business file metadata.
 * @param name - The function name used for registration and routing.
 * @param options - The handler and optional input/output bindings.
 */
export const onUpdatedFiles = registerFileTrigger;
