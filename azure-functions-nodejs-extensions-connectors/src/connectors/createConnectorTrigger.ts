// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { ConnectorTriggerContext, ConnectorTriggerRegistration } from '../../types';
import { connectorTrigger } from './connectorTrigger';

/**
 * Creates a registration helper that adds a connector-specific context alias.
 * @param createContext - Creates the typed context from the normalized payload.
 */
export function createConnectorTrigger<TItem, TContext extends ConnectorTriggerContext<TItem>>(
    createContext: (context: ConnectorTriggerContext<TItem>) => TContext,
): ConnectorTriggerRegistration<TItem, TContext> {
    return (name, options) => {
        connectorTrigger<TItem>(name, {
            ...options,
            handler: async (context, invocationContext) => {
                return await options.handler(createContext(context), invocationContext);
            },
        });
    };
}
