// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { ServiceBusReceivedMessage } from '@azure/service-bus';
import { ServiceBusMessageActions } from '../src/servicebus/ServiceBusMessageActions';

/**
 * Extends ServiceBusReceivedMessage with convenience methods for body parsing.
 *
 * With v0.4.0, `message.body` returns a raw Buffer. These methods provide
 * a simple, one-line experience for common parsing operations, consistent
 * with the Azure Functions HTTP model pattern (`request.text()`, `request.json()`).
 *
 * Unlike the HTTP model methods which return Promises (because the body is a stream),
 * these methods are synchronous because the message body is already fully materialized.
 */
export interface ServiceBusMessage extends ServiceBusReceivedMessage {
    /**
     * Returns the message body as a UTF-8 string.
     *
     * - If body is a Buffer, decodes as UTF-8
     * - If body is already a string, returns as-is
     * - For other types, returns JSON.stringify result
     *
     * @example
     * ```typescript
     * const text = message.text();
     * ```
     */
    text(): string;

    /**
     * Parses the message body as JSON and returns a typed result.
     *
     * Equivalent to `JSON.parse(message.text())`.
     *
     * @typeParam T - The expected type of the parsed JSON
     * @throws {SyntaxError} If the body is not valid JSON
     *
     * @example
     * ```typescript
     * interface MyEvent { id: string; data: number; }
     * const event = message.json<MyEvent>();
     * ```
     */
    json<T = unknown>(): T;
}

export interface ServiceBusMessageContext {
    messages: ServiceBusMessage[];
    actions: ServiceBusMessageActions;
}

export { ServiceBusMessageActions } from '../src/servicebus/ServiceBusMessageActions';
export type { IServiceBusMessageActions } from './settlement-types';
