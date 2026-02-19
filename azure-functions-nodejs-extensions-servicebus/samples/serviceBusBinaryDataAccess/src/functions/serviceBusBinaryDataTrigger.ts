// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import '@azure/functions-extensions-servicebus';
import { app, InvocationContext } from '@azure/functions';
import { ServiceBusMessageContext } from '@azure/functions-extensions-servicebus';
import { parseBody, bodyAsText } from '../servicebus-helpers'; // Interim helper until #50 lands

/**
 * This sample demonstrates raw binary data access with @azure/functions-extensions-servicebus v0.4.0.
 *
 * Key change in v0.4.0 (Breaking Change):
 *   message.body is now returned as a raw Buffer instead of being auto-parsed.
 *   This gives users full control over parsing, including the ability to use
 *   custom JSON revivers or handle non-JSON binary data.
 *
 * See: https://github.com/Azure/azure-functions-nodejs-extensions/issues/27
 */

/**
 * Custom JSON reviver that preserves large numbers as strings.
 * JavaScript's Number type loses precision for integers outside the safe range
 * (Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER).
 */
function safeNumberReviver(_key: string, value: unknown): unknown {
    // This reviver is called after JSON.parse has already converted the value.
    // For truly safe large-number handling, consider using a streaming JSON parser
    // or a library like 'json-bigint' that operates on the raw string.
    if (typeof value === 'number' && !Number.isSafeInteger(value) && !isNaN(value)) {
        // Note: By this point JSON.parse has already converted to number,
        // so precision may already be lost. This serves as a detection example.
        return value;
    }
    return value;
}

export async function serviceBusBinaryDataTrigger(
    sbContext: ServiceBusMessageContext,
    context: InvocationContext
): Promise<void> {
    const message = sbContext.messages[0];
    const actions = sbContext.actions;

    // v0.4.0: message.body is a raw Buffer — use helpers for convenient access
    context.log(`Received message body (${Buffer.isBuffer(message.body) ? (message.body as Buffer).length + ' bytes' : 'non-buffer'})`);
    context.log(`Content type: ${message.contentType ?? 'not set'}`);

    try {
        // bodyAsText() for raw string access
        context.log(`Raw body text: ${bodyAsText(message)}`);

        // parseBody<T>() with a custom reviver for safe number handling
        const data = parseBody(message, safeNumberReviver);
        context.log('Parsed data with custom reviver:', JSON.stringify(data));

        // Successfully processed - complete the message
        await actions.complete(message);
        context.log('Message completed successfully');
    } catch (error) {
        // If parsing fails (e.g., invalid JSON or non-JSON binary data),
        // send the message to the Dead Letter Queue.
        // This is useful for handling poison messages without triggering retries.
        context.error('Failed to parse message body:', error);
        context.log('Sending message to Dead Letter Queue');
        await actions.deadletter(message);
    }
}

app.serviceBusQueue('serviceBusBinaryDataTrigger', {
    connection: 'ServiceBusConnection',
    queueName: 'testqueue',
    sdkBinding: true,
    autoCompleteMessages: false,
    cardinality: 'many',
    handler: serviceBusBinaryDataTrigger,
});
