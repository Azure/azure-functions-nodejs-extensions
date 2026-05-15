// Copyright (c) Microsoft Corporation.  All rights reserved.

import { app, InvocationContext } from '@azure/functions';

/**
 * Sample: Direct app.connectorTrigger() usage without the extensions package.
 *
 * This demonstrates using the first-class connectorTrigger binding
 * from the core @azure/functions library. The raw trigger payload is
 * passed directly to the handler as-is (string or object).
 */
app.connectorTrigger('OnNewEmailDirect', {
    handler: async (triggerInput: unknown, invocationContext: InvocationContext) => {
        invocationContext.log('OnNewEmailDirect trigger received via app.connectorTrigger().');

        const parsed = typeof triggerInput === 'string'
            ? JSON.parse(triggerInput) as Record<string, unknown>
            : (triggerInput ?? {}) as Record<string, unknown>;

        invocationContext.log(`Raw payload: '${JSON.stringify(parsed)}'.`);

        return parsed;
    },
});
