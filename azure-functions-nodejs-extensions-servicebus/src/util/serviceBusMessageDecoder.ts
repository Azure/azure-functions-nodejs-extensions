// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import rhea from 'rhea';
import { LockTokenUtil } from './lockTokenUtil';

export class ServiceBusMessageDecoder {
    /**
     * Decodes a Service Bus message from a buffer.
     * @param content Buffer containing the host's 16-byte .NET GUID lock token followed by an AMQP message
     * @returns An object containing the decoded message and the lock token
     */
    static decode(content: Buffer): { decodedMessage: rhea.Message; lockToken: string } {
        if (!content || content.length === 0) throw new Error('Content buffer is empty');

        const lockTokenLength = 16;
        if (content.length <= lockTokenLength) {
            throw new Error('Content must contain a 16-byte lock token followed by an AMQP message');
        }

        const lockToken = LockTokenUtil.extractFromMessage(content, lockTokenLength);
        const amqpSlice = content.subarray(lockTokenLength);

        // Suppress rhea warnings about message structure by temporarily overriding console.warn
        // This prevents warnings like "WARNING: expected described message section got {...}"
        const originalWarn = console.warn;
        try {
            console.warn = () => {};
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
            const decodedMessage = rhea.message.decode(amqpSlice);
            return { decodedMessage: decodedMessage as unknown as rhea.Message & { body: unknown }, lockToken };
        } finally {
            console.warn = originalWarn;
        }
    }
}
