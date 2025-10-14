// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { app, InvocationContext } from '@azure/functions';
import { ServiceBusMessageContext } from '@azure/functions-extensions-servicebus';

// Simple tracking for timing analysis only
const messageTimestamps = new Map<string, Date[]>();

/**
 * Service Bus Exponential Backoff Demo with Intentional Processing Delays
 *
 * Uses deliveryCount from Service Bus to determine retry attempts
 * - Attempts 1-3: Fail and abandon (trigger exponential backoff)
 * - Attempt 4: Success and complete message
 *
 * Processing Delays (intentional slow processing simulation):
 * - Delivery 1: 2 seconds delay
 * - Delivery 2: 4 seconds delay
 * - Delivery 3: 8 seconds delay
 * - Delivery 4: 16 seconds delay
 *
 * Uses ServiceBusMessageActions.abandon() to trigger Service Bus exponential backoff
 */
export async function serviceBusExponentialBackoffTrigger(
    serviceBusMessageContext: ServiceBusMessageContext,
    context: InvocationContext
): Promise<void> {
    const message = serviceBusMessageContext.messages[0];
    const messageId = String(message.messageId || `msg-${Date.now()}`);
    const deliveryCount = message.deliveryCount || 0;
    const currentTime = new Date();

    // Track timestamps for timing analysis
    if (!messageTimestamps.has(messageId)) {
        messageTimestamps.set(messageId, []);
    }
    const timestamps = messageTimestamps.get(messageId) || [];
    timestamps.push(currentTime);

    // Log basic info
    context.log(`📬 Processing Message ID: ${messageId}`);
    context.log(`📊 Delivery Count: ${deliveryCount}`);
    context.log(`⏰ Current Time: ${currentTime.toISOString()}`);

    // Calculate time between attempts (exponential backoff analysis)
    if (timestamps.length > 1) {
        const previousTime = timestamps[timestamps.length - 2];
        const timeDiffSeconds = Math.round((currentTime.getTime() - previousTime.getTime()) / 1000);
        context.log(`⏱️ Time since last attempt: ${timeDiffSeconds} seconds`);

        // Expected exponential backoff pattern
        const expectedDelay = Math.pow(2, deliveryCount - 2);
        context.log(`📈 Expected delay: ~${expectedDelay} seconds`);
    }

    // HARDCODED BEHAVIOR: Add intentional processing delays, then use deliveryCount to determine success/failure
    try {
        // Add exponential processing delay using setTimeout: 2s, 4s, 8s, 16s
        const processingDelayMs = Math.pow(2, deliveryCount) * 1000;
        const delaySeconds = processingDelayMs / 1000;

        if (processingDelayMs > 0) {
            context.log(`⏳ Adding ${delaySeconds}s processing delay to simulate slow processing...`);
            await new Promise((resolve) => setTimeout(resolve, processingDelayMs));
            context.log(`✅ Processing delay completed (${delaySeconds}s)`);
        }

        if (deliveryCount <= 3) {
            // Fail first 3 attempts to trigger exponential backoff
            context.log(`❌ Simulated failure on delivery ${deliveryCount}/3 - abandoning for exponential backoff`);

            // Using abandon() to trigger Service Bus exponential backoff
            // Alternative: Could use defer() to make message invisible for custom delay periods
            // await serviceBusMessageContext.actions.defer(message);
            await serviceBusMessageContext.actions.abandon(message);
            throw new Error(`Intentional failure for exponential backoff demo (delivery ${deliveryCount})`);
        }

        // Success on 4th delivery (deliveryCount = 4)
        context.log(`✅ SUCCESS on delivery ${deliveryCount}! Processing message.`);
        await serviceBusMessageContext.actions.complete(message);
        context.log(`🎉 Message completed successfully after ${deliveryCount} deliveries (with processing delays)`);

        // Clean up
        messageTimestamps.delete(messageId);
    } catch (error) {
        context.log(`💥 Processing failed: ${String(error)}`);

        if (deliveryCount >= 5) {
            // Max retries reached - deadletter the message
            context.log(`☠️ Max delivery count reached. Sending to deadletter queue.`);
            await serviceBusMessageContext.actions.deadletter(
                message,
                undefined,
                'MaxRetryExceeded',
                `Failed after ${deliveryCount} deliveries`
            );
            messageTimestamps.delete(messageId);
        } else {
            // Abandon for retry - exponential backoff will be handled by Service Bus
            context.log(`🔄 Abandoning message for exponential backoff retry...`);
            await serviceBusMessageContext.actions.abandon(message);
        }

        throw error; // Re-throw to signal failure
    }

    context.log(`--- End Processing ---\n`);
}

// Register the Service Bus Queue trigger with optimal settings for exponential backoff testing
app.serviceBusQueue('serviceBusExponentialBackoffTrigger', {
    connection: 'ServiceBusConnection',
    queueName: 'testqueue',
    sdkBinding: true,
    autoCompleteMessages: false, // Manual message completion for better control
    cardinality: 'one', // Process one message at a time for clearer tracking
    handler: serviceBusExponentialBackoffTrigger,
});
