// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import rhea from 'rhea';
import { LockTokenUtil } from './lockTokenUtil';

export class ServiceBusMessageDecoder {
    /**
     * Decodes a Service Bus message from a buffer.
     * @param content Buffer that contains the Service Bus message with lock token
     * @returns An object containing the decoded message and the lock token
     */
    static decode(content: Buffer): { decodedMessage: rhea.Message; lockToken: string } {
        if (!content || content.length === 0) throw new Error('Content buffer is empty');

        const index = content.indexOf(LockTokenUtil.X_OPT_LOCK_TOKEN);
        if (index === -1) throw new Error('Lock token not found in content');

        const lockToken = LockTokenUtil.extractFromMessage(content, index);
        const amqpSlice = content.subarray(16);

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
