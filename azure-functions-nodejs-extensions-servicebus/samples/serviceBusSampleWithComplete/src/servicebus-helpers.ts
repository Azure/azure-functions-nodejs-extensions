// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

/**
 * Helper utilities for parsing Service Bus message bodies.
 *
 * With @azure/functions-extensions-servicebus v0.4.0, `message.body` is returned
 * as a raw Buffer instead of being auto-parsed. These helpers restore a simple,
 * one-line experience similar to v0.3.x.
 *
 * In a future release, these will be replaced by built-in instance methods
 * on the message object: `message.text()` and `message.json<T>()`.
 *
 * @see https://github.com/Azure/azure-functions-nodejs-extensions/issues/27
 * @see https://github.com/Azure/azure-functions-nodejs-extensions/issues/50
 */

/**
 * Returns the message body as a UTF-8 string.
 *
 * @example
 * ```typescript
 * const text = bodyAsText(message);
 * context.log('Message text:', text);
 * ```
 */
export function bodyAsText(message: { body: unknown }): string {
    const body: unknown = message.body;
    if (Buffer.isBuffer(body)) {
        return body.toString('utf8');
    }
    if (typeof body === 'string') {
        return body;
    }
    return JSON.stringify(body);
}

/**
 * Parses the message body as JSON and returns a typed result.
 *
 * @example
 * ```typescript
 * interface OrderMessage { orderId: string; amount: number; }
 * const data = parseBody<OrderMessage>(message);
 * context.log('Order ID:', data.orderId);
 * ```
 */
export function parseBody<T = unknown>(
    message: { body: unknown },
    reviver?: (key: string, value: unknown) => unknown
): T {
    return JSON.parse(bodyAsText(message), reviver) as T;
}
