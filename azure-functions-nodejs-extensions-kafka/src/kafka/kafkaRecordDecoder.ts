// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import * as protobuf from 'protobufjs/minimal';

/**
 * Decoded KafkaRecord from Protobuf wire format.
 * Field numbers match KafkaRecordProto.proto in the host extension.
 */
export interface DecodedKafkaRecord {
    topic: string;
    partition: number;
    offset: number;
    key: Buffer | null;
    value: Buffer | null;
    timestamp: { unixTimestampMs: number; type: number } | null;
    headers: Array<{ key: string; value: Buffer | null }>;
    leaderEpoch: number | null;
}

/**
 * Decodes a KafkaRecordProto from Protobuf binary wire format.
 *
 * Proto schema (field numbers):
 *   1: topic (string)
 *   2: partition (int32)
 *   3: offset (int64)
 *   4: key (optional bytes)
 *   5: value (optional bytes)
 *   6: timestamp (message: { 1: unix_timestamp_ms (int64), 2: type (int32) })
 *   7: headers (repeated message: { 1: key (string), 2: optional bytes value })
 *   8: leader_epoch (optional int32)
 */
export function decodeKafkaRecordProto(buffer: Buffer): DecodedKafkaRecord {
    const reader = protobuf.Reader.create(buffer);
    const end = reader.len;

    let topic = '';
    let partition = 0;
    let offset = 0;
    let key: Buffer | null = null;
    let value: Buffer | null = null;
    let timestamp: { unixTimestampMs: number; type: number } | null = null;
    const headers: Array<{ key: string; value: Buffer | null }> = [];
    let leaderEpoch: number | null = null;
    let hasKey = false;
    let hasValue = false;
    let hasLeaderEpoch = false;

    while (reader.pos < end) {
        const tag = reader.uint32();
        const fieldNumber = tag >>> 3;
        const wireType = tag & 7;

        switch (fieldNumber) {
            case 1: // topic: string
                topic = reader.string();
                break;
            case 2: // partition: int32
                partition = reader.int32();
                break;
            case 3: // offset: int64
                offset = Number(reader.int64());
                break;
            case 4: // key: optional bytes
                hasKey = true;
                key = Buffer.from(reader.bytes());
                break;
            case 5: // value: optional bytes
                hasValue = true;
                value = Buffer.from(reader.bytes());
                break;
            case 6: { // timestamp: message
                const msgEnd = reader.uint32() + reader.pos;
                let tsMs = 0;
                let tsType = 0;
                while (reader.pos < msgEnd) {
                    const tsTag = reader.uint32();
                    const tsField = tsTag >>> 3;
                    switch (tsField) {
                        case 1:
                            tsMs = Number(reader.int64());
                            break;
                        case 2:
                            tsType = reader.int32();
                            break;
                        default:
                            reader.skipType(tsTag & 7);
                    }
                }
                timestamp = { unixTimestampMs: tsMs, type: tsType };
                break;
            }
            case 7: { // headers: repeated message
                const hEnd = reader.uint32() + reader.pos;
                let hKey = '';
                let hValue: Buffer | null = null;
                let hHasValue = false;
                while (reader.pos < hEnd) {
                    const hTag = reader.uint32();
                    const hField = hTag >>> 3;
                    switch (hField) {
                        case 1:
                            hKey = reader.string();
                            break;
                        case 2:
                            hHasValue = true;
                            hValue = Buffer.from(reader.bytes());
                            break;
                        default:
                            reader.skipType(hTag & 7);
                    }
                }
                headers.push({ key: hKey, value: hHasValue ? hValue : null });
                break;
            }
            case 8: // leader_epoch: optional int32
                hasLeaderEpoch = true;
                leaderEpoch = reader.int32();
                break;
            default:
                reader.skipType(wireType);
        }
    }

    return {
        topic,
        partition,
        offset,
        key: hasKey ? key : null,
        value: hasValue ? value : null,
        timestamp,
        headers,
        leaderEpoch: hasLeaderEpoch ? leaderEpoch : null,
    };
}
