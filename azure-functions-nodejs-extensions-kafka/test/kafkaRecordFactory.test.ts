// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { expect } from 'chai';
import * as protobuf from 'protobufjs/minimal';
import { decodeKafkaRecordProto } from '../src/kafka/kafkaRecordDecoder';
import { KafkaRecordFactory } from '../src/kafka/kafkaRecordFactory';
import { KafkaRecord } from '../types';

/**
 * Helper: encode a KafkaRecordProto message using protobufjs Writer.
 * This mirrors the host-side KafkaRecordProtobufSerializer output.
 */
function encodeKafkaRecordProto(fields: {
    topic?: string;
    partition?: number;
    offset?: number;
    key?: Buffer | null;
    value?: Buffer | null;
    timestamp?: { unixTimestampMs: number; type: number } | null;
    headers?: Array<{ key: string; value?: Buffer | null }>;
    leaderEpoch?: number | null;
}): Buffer {
    const writer = protobuf.Writer.create();

    if (fields.topic) {
        writer.uint32(/* field 1, wireType 2 */ 10).string(fields.topic);
    }
    if (fields.partition !== undefined) {
        writer.uint32(/* field 2, wireType 0 */ 16).int32(fields.partition);
    }
    if (fields.offset !== undefined) {
        writer.uint32(/* field 3, wireType 0 */ 24).int64(fields.offset);
    }
    if (fields.key !== undefined && fields.key !== null) {
        writer.uint32(/* field 4, wireType 2 */ 34).bytes(fields.key);
    }
    if (fields.value !== undefined && fields.value !== null) {
        writer.uint32(/* field 5, wireType 2 */ 42).bytes(fields.value);
    }
    if (fields.timestamp) {
        const tsWriter = protobuf.Writer.create();
        tsWriter.uint32(/* field 1, wireType 0 */ 8).int64(fields.timestamp.unixTimestampMs);
        tsWriter.uint32(/* field 2, wireType 0 */ 16).int32(fields.timestamp.type);
        const tsBytes = tsWriter.finish();
        writer.uint32(/* field 6, wireType 2 */ 50).bytes(tsBytes);
    }
    if (fields.headers) {
        for (const h of fields.headers) {
            const hWriter = protobuf.Writer.create();
            hWriter.uint32(/* field 1, wireType 2 */ 10).string(h.key);
            if (h.value !== undefined && h.value !== null) {
                hWriter.uint32(/* field 2, wireType 2 */ 18).bytes(h.value);
            }
            const hBytes = hWriter.finish();
            writer.uint32(/* field 7, wireType 2 */ 58).bytes(hBytes);
        }
    }
    if (fields.leaderEpoch !== undefined && fields.leaderEpoch !== null) {
        writer.uint32(/* field 8, wireType 0 */ 64).int32(fields.leaderEpoch);
    }

    return Buffer.from(writer.finish());
}

describe('KafkaRecordDecoder', () => {
    it('should decode a full record with all fields', () => {
        const buffer = encodeKafkaRecordProto({
            topic: 'my-topic',
            partition: 3,
            offset: 12345,
            key: Buffer.from('my-key'),
            value: Buffer.from('{"name":"test"}'),
            timestamp: { unixTimestampMs: 1700000000000, type: 1 },
            headers: [{ key: 'trace-id', value: Buffer.from('trace-abc') }],
            leaderEpoch: 7,
        });

        const decoded = decodeKafkaRecordProto(buffer);

        expect(decoded.topic).to.equal('my-topic');
        expect(decoded.partition).to.equal(3);
        expect(decoded.offset).to.equal(12345);
        expect(decoded.key?.toString('utf-8')).to.equal('my-key');
        expect(decoded.value?.toString('utf-8')).to.equal('{"name":"test"}');
        expect(decoded.timestamp?.unixTimestampMs).to.equal(1700000000000);
        expect(decoded.timestamp?.type).to.equal(1);
        expect(decoded.leaderEpoch).to.equal(7);
        expect(decoded.headers).to.have.length(1);
        expect(decoded.headers[0]?.key).to.equal('trace-id');
        expect(decoded.headers[0]?.value?.toString('utf-8')).to.equal('trace-abc');
    });

    it('should handle null key and value', () => {
        const buffer = encodeKafkaRecordProto({
            topic: 'test-topic',
            partition: 0,
            offset: 100,
            timestamp: { unixTimestampMs: 1700000000000, type: 0 },
        });

        const decoded = decodeKafkaRecordProto(buffer);

        expect(decoded.key).to.be.null;
        expect(decoded.value).to.be.null;
    });

    it('should handle null leader epoch', () => {
        const buffer = encodeKafkaRecordProto({
            topic: 'test-topic',
            partition: 0,
            offset: 0,
            value: Buffer.from('test'),
            timestamp: { unixTimestampMs: 0, type: 0 },
        });

        const decoded = decodeKafkaRecordProto(buffer);

        expect(decoded.leaderEpoch).to.be.null;
    });

    it('should handle null header value', () => {
        const buffer = encodeKafkaRecordProto({
            topic: 'test-topic',
            partition: 0,
            offset: 0,
            value: Buffer.from('test'),
            timestamp: { unixTimestampMs: 0, type: 0 },
            headers: [{ key: 'with-value', value: Buffer.from('abc') }, { key: 'no-value' }],
        });

        const decoded = decodeKafkaRecordProto(buffer);

        expect(decoded.headers).to.have.length(2);
        expect(decoded.headers[0]?.value?.toString('utf-8')).to.equal('abc');
        expect(decoded.headers[1]?.value).to.be.null;
    });
});

describe('KafkaRecordFactory', () => {
    it('should build a KafkaRecord from single ModelBindingData', () => {
        const protoBytes = encodeKafkaRecordProto({
            topic: 'my-topic',
            partition: 3,
            offset: 12345,
            key: Buffer.from('my-key'),
            value: Buffer.from('test-value'),
            timestamp: { unixTimestampMs: 1700000000000, type: 1 },
            headers: [{ key: 'h1', value: Buffer.from('v1') }],
            leaderEpoch: 7,
        });

        const result = KafkaRecordFactory.buildFromModelBindingData({
            content: protoBytes,
            contentType: 'application/x-protobuf',
            source: 'AzureKafkaRecord',
            version: '1.0',
        });

        expect(result).to.not.be.an('array');
        const record = result as KafkaRecord;
        expect(record.topic).to.equal('my-topic');
        expect(record.partition).to.equal(3);
        expect(record.offset).to.equal(12345);
        expect(record.key?.toString('utf-8')).to.equal('my-key');
        expect(record.value?.toString('utf-8')).to.equal('test-value');
        expect(record.timestamp.unixTimestampMs).to.equal(1700000000000);
        expect(record.timestamp.type).to.equal(1); // CreateTime
        expect(record.leaderEpoch).to.equal(7);
        expect(record.headers).to.have.length(1);
        expect(record.headers[0]!.key).to.equal('h1');
    });

    it('should build KafkaRecord[] from batch ModelBindingData', () => {
        const protoBytes = encodeKafkaRecordProto({
            topic: 'batch-topic',
            partition: 0,
            offset: 1,
            value: Buffer.from('msg1'),
            timestamp: { unixTimestampMs: 1700000000000, type: 2 },
        });

        const data = {
            content: protoBytes,
            contentType: 'application/x-protobuf',
            source: 'AzureKafkaRecord',
            version: '1.0',
        };

        const result = KafkaRecordFactory.buildFromModelBindingData([data, data]);

        expect(result).to.be.an('array');
        expect(result).to.have.length(2);
    });

    it('should throw when content is null', () => {
        expect(() =>
            KafkaRecordFactory.buildFromModelBindingData({
                content: null,
                contentType: 'application/x-protobuf',
                source: 'AzureKafkaRecord',
                version: '1.0',
            })
        ).to.throw('ModelBindingData.content is null or undefined.');
    });

    it('should fallback unknown timestamp type to NotAvailable (0)', () => {
        const protoBytes = encodeKafkaRecordProto({
            topic: 'test-topic',
            partition: 0,
            offset: 0,
            value: Buffer.from('test'),
            timestamp: { unixTimestampMs: 1700000000000, type: 99 },
        });

        const result = KafkaRecordFactory.buildFromModelBindingData({
            content: protoBytes,
            contentType: 'application/x-protobuf',
            source: 'AzureKafkaRecord',
            version: '1.0',
        }) as KafkaRecord;

        expect(result.timestamp.type).to.equal(0); // NotAvailable
    });
});
