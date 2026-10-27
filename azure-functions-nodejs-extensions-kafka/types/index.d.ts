// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

/**
 * Defines the type of a Kafka record timestamp.
 */
export declare enum KafkaTimestampType {
    /** Timestamp type is not available. */
    NotAvailable = 0,
    /** Timestamp was set by the producer (record creation time). */
    CreateTime = 1,
    /** Timestamp was set by the broker (log append time). */
    LogAppendTime = 2,
}

/**
 * Represents the timestamp of a Kafka record.
 */
export interface KafkaTimestamp {
    /** Timestamp as Unix milliseconds since epoch. */
    readonly unixTimestampMs: number;
    /** Timestamp type. */
    readonly type: KafkaTimestampType;
}

/**
 * Represents a single Kafka record header.
 */
export interface KafkaHeader {
    /** Header key. */
    readonly key: string;
    /** Header value as raw bytes, or null if not present. */
    readonly value: Buffer | null;
}

/**
 * Represents a raw Apache Kafka record with full metadata.
 * Key and value are raw Buffers — the user controls deserialization.
 */
export interface KafkaRecord {
    /** Topic name this record was consumed from. */
    readonly topic: string;
    /** Partition this record was consumed from. */
    readonly partition: number;
    /** Offset of this record within the partition. */
    readonly offset: number;
    /** Raw key bytes. Null if the record has no key. */
    readonly key: Buffer | null;
    /** Raw value bytes. Null if the record has no value. */
    readonly value: Buffer | null;
    /** Record timestamp. */
    readonly timestamp: KafkaTimestamp;
    /** Record headers. */
    readonly headers: KafkaHeader[];
    /** Leader epoch, if available. Null if not provided by the broker. */
    readonly leaderEpoch: number | null;
}
