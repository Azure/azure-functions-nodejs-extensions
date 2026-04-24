// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { ModelBindingData } from '@azure/functions-extensions-base';
import { KafkaRecord } from '../../types';
import { decodeKafkaRecordProto } from './kafkaRecordDecoder';

// Runtime enum values (matches KafkaTimestampType in types/index.d.ts)
const KafkaTimestampTypeValues = new Set([0, 1, 2]);

/**
 * Factory class for creating KafkaRecord instances from ModelBindingData.
 */
export class KafkaRecordFactory {
    /**
     * Builds KafkaRecord(s) from ModelBindingData.
     * Returns a single KafkaRecord for single dispatch, or an array for batch.
     */
    static buildFromModelBindingData(modelBindingData: ModelBindingData | ModelBindingData[]): KafkaRecord | KafkaRecord[] {
        if (Array.isArray(modelBindingData)) {
            return modelBindingData.map(KafkaRecordFactory.convertOne);
        }
        return KafkaRecordFactory.convertOne(modelBindingData);
    }

    private static convertOne(data: ModelBindingData): KafkaRecord {
        if (!data.content) {
            throw new Error('ModelBindingData.content is null or undefined.');
        }

        const decoded = decodeKafkaRecordProto(data.content);

        const rawType = decoded.timestamp?.type ?? 0;
        const validType = KafkaTimestampTypeValues.has(rawType) ? rawType : 0; // fallback to NotAvailable

        return {
            topic: decoded.topic,
            partition: decoded.partition,
            offset: decoded.offset,
            key: decoded.key,
            value: decoded.value,
            timestamp: {
                unixTimestampMs: decoded.timestamp?.unixTimestampMs ?? 0,
                type: validType,
            },
            headers: decoded.headers.map((h) => ({
                key: h.key,
                value: h.value,
            })),
            leaderEpoch: decoded.leaderEpoch,
        };
    }
}
