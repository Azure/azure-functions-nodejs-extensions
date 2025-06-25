// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

/**
 * Utility class for handling lock tokens in Azure Service Bus messages.
 * Provides methods to convert lock tokens to string format and extract them from messages.
 */
export class LockTokenUtil {
    static readonly X_OPT_LOCK_TOKEN = Buffer.from('x-opt-lock-token');

    /**
     * Converts a lock token from a Buffer to a string format.
     * The lock token is expected to be in a specific byte order.
     * @param lockToken - The lock token as a Buffer.
     * @returns The lock token as a formatted string.
     */
    static convertToString(lockToken: Buffer): string {
        return [
            lockToken.subarray(0, 4).reverse().toString('hex'),
            lockToken.subarray(4, 6).reverse().toString('hex'),
            lockToken.subarray(6, 8).reverse().toString('hex'),
            lockToken.subarray(8, 10).toString('hex'),
            lockToken.subarray(10).toString('hex'),
        ].join('-');
    }

    /**
     * Extracts the lock token from a Service Bus message.
     * @param message - The Service Bus message as a Buffer.
     * @param index - The index at which the lock token is located.
     * @returns The extracted lock token as a string.
     */
    static extractFromMessage(message: Buffer | any[], index: number): string {
        const raw = Buffer.isBuffer(message) ? message.subarray(0, index) : new Uint8Array(message.slice(0, index));

        return this.convertToString(Buffer.from(raw.subarray(0, 16)));
    }
}
