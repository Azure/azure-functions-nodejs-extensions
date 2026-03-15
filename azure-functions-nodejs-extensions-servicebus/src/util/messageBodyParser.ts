// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

/**
 * Body parsing utility functions for Service Bus messages.
 *
 * With @azure/functions-extensions-servicebus v0.4.0, `message.body` is returned
 * as a raw Buffer instead of being auto-parsed. These helpers provide a simple,
 * one-line experience for the most common use cases (JSON text messages).
 *
 * @example
 * ```typescript
 * import { messageBodyAsJson, messageBodyAsText } from '@azure/functions-extensions-servicebus';
 *
 * // Parse JSON body with type safety
 * interface OrderMessage { orderId: string; amount: number; }
 * const data = messageBodyAsJson<OrderMessage>(message);
 *
 * // Get raw text
 * const text = messageBodyAsText(message);
 *
 * // With custom reviver (e.g., Date conversion)
 * const data = messageBodyAsJson<MyType>(message, (key, value) => {
 *     if (key === 'createdAt' && typeof value === 'string') return new Date(value);
 *     return value;
 * });
 * ```
 */

const utf8Decoder = new TextDecoder('utf-8', { fatal: true });

/**
 * Returns the message body as a UTF-8 string.
 * Handles Buffer, string, and object body types.
 *
 * @param message - A message object with a `body` property (e.g., ServiceBusReceivedMessage)
 * @returns The body as a UTF-8 string
 * @throws TypeError if the body is a Buffer containing invalid UTF-8 bytes
 */
export function messageBodyAsText(message: { body: unknown }): string {
    const body: unknown = message.body;
    if (Buffer.isBuffer(body)) {
        return utf8Decoder.decode(body);
    }
    if (typeof body === 'string') {
        return body;
    }
    return JSON.stringify(body);
}

/**
 * Parses the message body as JSON and returns a typed result.
 *
 * @param message - A message object with a `body` property (e.g., ServiceBusReceivedMessage)
 * @param reviver - Optional JSON reviver function for custom deserialization
 * @returns The parsed body as type T
 * @throws TypeError if the body is a Buffer containing invalid UTF-8 bytes
 * @throws SyntaxError if the body is not valid JSON
 */
export function messageBodyAsJson<T = unknown>(
    message: { body: unknown },
    reviver?: (key: string, value: unknown) => unknown
): T {
    return JSON.parse(messageBodyAsText(message), reviver) as T;
}
