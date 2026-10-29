// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { RefreshModel } from '@azure/connectors/generated/DataflowsExtensions';
import { DataflowRefreshTriggerContext } from '../../types';
import { createConnectorTrigger } from './createConnectorTrigger';

/**
 * Registers completed dataflow refreshes using the SDK refresh model.
 * @param name - The function name used for registration and routing.
 * @param options - The handler and optional input/output bindings.
 */
export const onRefreshComplete = createConnectorTrigger<RefreshModel, DataflowRefreshTriggerContext>(
    (context) => ({ ...context, refreshes: context.items }),
);
