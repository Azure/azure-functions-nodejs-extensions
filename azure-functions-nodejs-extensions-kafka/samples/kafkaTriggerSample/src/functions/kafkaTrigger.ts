// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import '@azure/functions-extensions-kafka';
import { app, type InvocationContext } from '@azure/functions';
import type { KafkaRecord } from '@azure/functions-extensions-kafka';

/**
 * This sample demonstrates how to use the KafkaRecord binding to access
 * raw Kafka message metadata including topic, partition, offset, headers,
 * timestamp, and key/value as Buffers.
 *
 * The function is triggered by messages on a Kafka topic and logs all
 * available metadata.
 */
export async function kafkaTrigger(record: KafkaRecord, context: InvocationContext): Promise<void> {
    // Basic record metadata
    context.log(`Topic: ${record.topic}`);
    context.log(`Partition: ${record.partition}`);
    context.log(`Offset: ${record.offset}`);

    // Key and value as raw Buffers — user controls deserialization
    if (record.key) {
        context.log(`Key: ${Buffer.from(record.key).toString('utf-8')}`);
    }
    if (record.value) {
        context.log(`Value: ${Buffer.from(record.value).toString('utf-8')}`);
    }

    // Timestamp
    context.log(`Timestamp: ${new Date(record.timestamp.unixTimestampMs).toISOString()}`);
    context.log(`Timestamp Type: ${record.timestamp.type}`); // 0=NotAvailable, 1=CreateTime, 2=LogAppendTime

    // Leader epoch (null if not available)
    if (record.leaderEpoch !== null) {
        context.log(`Leader Epoch: ${record.leaderEpoch}`);
    }

    // Headers
    for (const header of record.headers) {
        const value = header.value ? Buffer.from(header.value).toString('utf-8') : '(null)';
        context.log(`Header: ${header.key} = ${value}`);
    }
}

app.generic('kafkaTrigger1', {
    trigger: {
        type: 'kafkaTrigger',
        direction: 'in',
        name: 'record',
        topic: 'my-topic',
        brokerList: '%BrokerList%',
        consumerGroup: '$Default',
    },
    handler: kafkaTrigger,
});
