// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import chai, { expect } from 'chai';
import rhea from 'rhea';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { LockTokenUtil } from '../../src/util/lockTokenUtil';
import { ServiceBusMessageDecoder } from '../../src/util/serviceBusMessageDecoder';

// Configure chai with sinon-chai
chai.use(sinonChai);

describe('ServiceBusMessageDecoder', () => {
    let lockTokenUtilStub: sinon.SinonStub;
    let rheaMessageDecodeStub: sinon.SinonStub;

    // Mock constants and test data
    const MOCK_X_OPT_LOCK_TOKEN = Buffer.from('x-opt-lock-token');
    const MOCK_LOCK_TOKEN = '12345678-1234-1234-1234-123456789abc';

    // Helper function to create test buffers
    const createTestBuffer = (includeToken = true, amqpData?: Buffer): Buffer => {
        const amqpBuffer =
            amqpData ||
            Buffer.from([
                0x00,
                0x53,
                0x70, // AMQP header
                0x01,
                0x02,
                0x03,
                0x04, // Sample AMQP message data
                0x05,
                0x06,
                0x07,
                0x08,
            ]);

        // The source code uses content.subarray(16) which discards the first 16 bytes
        // So we need exactly 16 bytes before the AMQP data
        const prefixData = Buffer.alloc(16); // Exactly 16 bytes

        // Place the lock token within the first 16 bytes if needed
        if (includeToken && MOCK_X_OPT_LOCK_TOKEN.length <= 16) {
            MOCK_X_OPT_LOCK_TOKEN.copy(prefixData, 0);
        }

        return Buffer.concat([
            prefixData, // Exactly 16 bytes that will be discarded
            amqpBuffer, // AMQP data starts at byte 16
        ]);
    };

    // Helper function to create mock Rhea message
    const createMockRheaMessage = (overrides?: any): any => {
        const baseMessage = {
            body: 'test message body',
            message_id: 'test-message-id',
            correlation_id: 'test-correlation-id',
            content_type: 'application/json',
            subject: 'test-subject',
            to: 'test-destination',
            reply_to: 'test-reply-to',
            ttl: 60000,
            application_properties: {
                customProperty: 'test-value',
            },
            message_annotations: {
                'x-opt-enqueued-time': Date.now(),
                'x-opt-sequence-number': 12345,
            },
            delivery_annotations: {},
            header: {
                delivery_count: 0,
                ttl: 60000,
                durable: true,
                priority: 4,
                first_acquirer: false,
            },
            properties: {
                message_id: 'test-message-id',
                correlation_id: 'test-correlation-id',
            },
            footer: {},
            // Add toJSON method to satisfy the type requirements
            toJSON: function () {
                return this;
            },
        };

        return { ...baseMessage, ...overrides };
    };

    beforeEach(() => {
        // Mock LockTokenUtil methods
        lockTokenUtilStub = sinon.stub(LockTokenUtil, 'extractFromMessage').returns(MOCK_LOCK_TOKEN);

        // Set up the X_OPT_LOCK_TOKEN constant mock
        sinon.stub(LockTokenUtil, 'X_OPT_LOCK_TOKEN').value(MOCK_X_OPT_LOCK_TOKEN);

        // Mock rhea.message.decode
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        rheaMessageDecodeStub = sinon.stub(rhea.message, 'decode').returns(createMockRheaMessage());
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('decode method', () => {
        describe('Successful Decoding', () => {
            it('should decode a valid Service Bus message buffer', () => {
                // Arrange
                const testBuffer = createTestBuffer();
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const expectedMessage = createMockRheaMessage();
                rheaMessageDecodeStub.returns(expectedMessage);

                // Act
                const result = ServiceBusMessageDecoder.decode(testBuffer);

                // Assert
                expect(result).to.be.an('object');
                expect(result).to.have.property('decodedMessage');
                expect(result.decodedMessage).to.deep.equal(expectedMessage);
                expect(result).to.have.property('lockToken', MOCK_LOCK_TOKEN);
            });

            it('should find lock token in buffer correctly', () => {
                // Arrange
                const testBuffer = createTestBuffer();
                const expectedIndex = testBuffer.indexOf(MOCK_X_OPT_LOCK_TOKEN);

                // Act
                ServiceBusMessageDecoder.decode(testBuffer);

                // Assert
                expect(lockTokenUtilStub).to.have.been.calledOnceWith(testBuffer, expectedIndex);
            });

            it('should extract AMQP slice after lock token', () => {
                // Arrange
                const amqpData = Buffer.from([0x10, 0x20, 0x30, 0x40]);
                const testBuffer = createTestBuffer(true, amqpData);

                // Act
                ServiceBusMessageDecoder.decode(testBuffer);

                // Assert
                expect(rheaMessageDecodeStub).to.have.been.calledOnce;
                const rheaCallArg: Buffer = rheaMessageDecodeStub.getCall(0).args[0] as Buffer;
                expect(rheaCallArg).to.be.instanceOf(Buffer);
                expect(rheaCallArg).to.deep.equal(amqpData);
            });

            it('should handle different message body types', () => {
                // Arrange
                const testCases = [
                    { body: 'string message', description: 'string body' },
                    { body: { json: 'object' }, description: 'object body' },
                    { body: Buffer.from('binary'), description: 'buffer body' },
                    { body: [1, 2, 3], description: 'array body' },
                    { body: null, description: 'null body' },
                    { body: undefined, description: 'undefined body' },
                ];

                testCases.forEach((testCase) => {
                    const testBuffer = createTestBuffer();
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    const mockMessage = createMockRheaMessage({ body: testCase.body });
                    rheaMessageDecodeStub.returns(mockMessage);

                    // Act
                    const result = ServiceBusMessageDecoder.decode(testBuffer);

                    // Assert
                    expect(result.decodedMessage.body).to.equal(testCase.body);
                });
            });

            it('should preserve all Rhea message properties', () => {
                // Arrange
                const testBuffer = createTestBuffer();
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const complexMessage: Record<string, unknown> = createMockRheaMessage({
                    body: { complex: 'data', nested: { array: [1, 2, 3] } },
                    application_properties: {
                        'custom-header': 'value',
                        'numeric-prop': 12345,
                        'boolean-prop': true,
                    },
                    message_annotations: {
                        'x-opt-enqueued-time': 1640995200000,
                        'x-opt-sequence-number': 999999,
                        'custom-annotation': 'annotation-value',
                    },
                });
                rheaMessageDecodeStub.returns(complexMessage);

                // Act
                const result = ServiceBusMessageDecoder.decode(testBuffer);

                // Assert
                expect(result.decodedMessage).to.deep.equal(complexMessage);
                expect(result.decodedMessage.application_properties).to.deep.equal(
                    complexMessage.application_properties
                );
                expect(result.decodedMessage.message_annotations).to.deep.equal(complexMessage.message_annotations);
            });
        });

        describe('Error Handling', () => {
            it('should throw error when content buffer is null', () => {
                // Act & Assert
                expect(() => ServiceBusMessageDecoder.decode(null as unknown as Buffer)).to.throw(
                    'Content buffer is empty'
                );

                expect(lockTokenUtilStub).to.not.have.been.called;
                expect(rheaMessageDecodeStub).to.not.have.been.called;
            });

            it('should throw error when content buffer is undefined', () => {
                // Act & Assert
                expect(() => ServiceBusMessageDecoder.decode(undefined as unknown as Buffer)).to.throw(
                    'Content buffer is empty'
                );

                expect(lockTokenUtilStub).to.not.have.been.called;
                expect(rheaMessageDecodeStub).to.not.have.been.called;
            });

            it('should throw error when content buffer is empty', () => {
                // Arrange
                const emptyBuffer = Buffer.alloc(0);

                // Act & Assert
                expect(() => ServiceBusMessageDecoder.decode(emptyBuffer)).to.throw('Content buffer is empty');

                expect(lockTokenUtilStub).to.not.have.been.called;
                expect(rheaMessageDecodeStub).to.not.have.been.called;
            });

            it('should throw error when lock token is not found', () => {
                // Arrange
                const bufferWithoutToken = createTestBuffer(false);

                // Act & Assert
                expect(() => ServiceBusMessageDecoder.decode(bufferWithoutToken)).to.throw(
                    'Lock token not found in content'
                );

                expect(lockTokenUtilStub).to.not.have.been.called;
                expect(rheaMessageDecodeStub).to.not.have.been.called;
            });

            it('should propagate LockTokenUtil extraction errors', () => {
                // Arrange
                const testBuffer = createTestBuffer();
                lockTokenUtilStub.throws(new Error('Lock token extraction failed'));

                // Act & Assert
                expect(() => ServiceBusMessageDecoder.decode(testBuffer)).to.throw('Lock token extraction failed');

                expect(rheaMessageDecodeStub).to.not.have.been.called;
            });

            it('should propagate Rhea decoding errors', () => {
                // Arrange
                const testBuffer = createTestBuffer();
                rheaMessageDecodeStub.throws(new Error('AMQP decoding failed'));

                // Act & Assert
                expect(() => ServiceBusMessageDecoder.decode(testBuffer)).to.throw('AMQP decoding failed');

                expect(lockTokenUtilStub).to.have.been.called;
            });

            it('should handle corrupted AMQP data gracefully', () => {
                // Arrange
                const corruptedAmqpData = Buffer.from([0xff, 0xff, 0xff, 0xff]); // Invalid AMQP data
                const testBuffer = createTestBuffer(true, corruptedAmqpData);
                rheaMessageDecodeStub.throws(new Error('Invalid AMQP format'));

                // Act & Assert
                expect(() => ServiceBusMessageDecoder.decode(testBuffer)).to.throw('Invalid AMQP format');
            });
        });

        describe('Buffer Processing and Memory Management', () => {
            it('should handle large message buffers efficiently', () => {
                // Arrange
                const largeAmqpData = Buffer.alloc(1024 * 1024, 0xab); // 1MB buffer
                const testBuffer = createTestBuffer(true, largeAmqpData);
                const startTime = process.hrtime.bigint();

                // Act
                ServiceBusMessageDecoder.decode(testBuffer);

                // Assert
                const endTime = process.hrtime.bigint();
                const executionTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds

                expect(executionTime).to.be.lessThan(100); // Should complete in less than 100ms
                expect(rheaMessageDecodeStub).to.have.been.calledOnce;

                // Verify correct buffer slice was passed
                const passedBuffer: Buffer = rheaMessageDecodeStub.getCall(0).args[0] as Buffer;
                expect(passedBuffer).to.have.length(largeAmqpData.length);
            });

            it('should create proper buffer slice without affecting original', () => {
                // Arrange
                const originalBuffer = createTestBuffer();
                const originalLength = originalBuffer.length;

                // Act
                ServiceBusMessageDecoder.decode(originalBuffer);

                // Assert
                expect(originalBuffer.length).to.equal(originalLength);
                expect(rheaMessageDecodeStub).to.have.been.calledOnce;

                const passedBuffer: Buffer = rheaMessageDecodeStub.getCall(0).args[0] as Buffer;
                expect(passedBuffer).to.not.equal(originalBuffer); // Should be different buffer reference
            });

            it('should handle multiple lock tokens in buffer correctly', () => {
                // Arrange
                const multiTokenBuffer = Buffer.concat([
                    Buffer.from('prefix'),
                    MOCK_X_OPT_LOCK_TOKEN,
                    Buffer.from('middle'),
                    MOCK_X_OPT_LOCK_TOKEN, // Second occurrence
                    Buffer.from([0x01, 0x02, 0x03]), // AMQP data
                ]);

                // Act
                ServiceBusMessageDecoder.decode(multiTokenBuffer);

                // Assert
                // Should find the first occurrence
                const expectedIndex = multiTokenBuffer.indexOf(MOCK_X_OPT_LOCK_TOKEN);
                expect(lockTokenUtilStub).to.have.been.calledWith(multiTokenBuffer, expectedIndex);
            });

            it('should handle concurrent decode operations', async () => {
                // Arrange
                const concurrentOperations = 10;
                const promises = Array.from({ length: concurrentOperations }, (_, index) => {
                    const testBuffer = createTestBuffer();
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    const mockMessage = createMockRheaMessage({ message_id: `concurrent-msg-${index}` });
                    rheaMessageDecodeStub.onCall(index).returns(mockMessage);

                    return Promise.resolve().then(() => ServiceBusMessageDecoder.decode(testBuffer));
                });

                // Act
                const results = await Promise.all(promises);

                // Assert
                expect(results).to.have.length(concurrentOperations);
                results.forEach((result, index) => {
                    expect(result).to.have.property('decodedMessage');
                    expect(result).to.have.property('lockToken', MOCK_LOCK_TOKEN);
                    expect(result.decodedMessage.message_id).to.equal(`concurrent-msg-${index}`);
                });
            });
        });

        describe('LockTokenUtil Integration', () => {
            it('should use correct X_OPT_LOCK_TOKEN constant', () => {
                // Arrange
                const testBuffer = createTestBuffer();

                // Act
                ServiceBusMessageDecoder.decode(testBuffer);

                // Assert
                const expectedIndex = testBuffer.indexOf(LockTokenUtil.X_OPT_LOCK_TOKEN);
                expect(expectedIndex).to.be.greaterThan(-1);
                expect(lockTokenUtilStub).to.have.been.calledWith(testBuffer, expectedIndex);
            });

            it('should pass correct parameters to LockTokenUtil.extractFromMessage', () => {
                // Arrange
                const testBuffer = createTestBuffer();
                const expectedIndex = testBuffer.indexOf(MOCK_X_OPT_LOCK_TOKEN);

                // Act
                ServiceBusMessageDecoder.decode(testBuffer);

                // Assert
                expect(lockTokenUtilStub).to.have.been.calledOnceWith(testBuffer, expectedIndex);
            });

            it('should handle different lock token formats', () => {
                // Arrange
                const testCases = [
                    '12345678-1234-1234-1234-123456789abc',
                    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
                    '00000000-0000-0000-0000-000000000000',
                    'ffffffff-ffff-ffff-ffff-ffffffffffff',
                ];

                testCases.forEach((lockToken, index) => {
                    const testBuffer = createTestBuffer();
                    lockTokenUtilStub.onCall(index).returns(lockToken);

                    // Act
                    const result = ServiceBusMessageDecoder.decode(testBuffer);

                    // Assert
                    expect(result.lockToken).to.equal(lockToken);
                });
            });
        });

        describe('Rhea Integration', () => {
            it('should pass correct buffer to rhea.message.decode', () => {
                // Arrange
                const specificAmqpData = Buffer.from([0xaa, 0xbb, 0xcc, 0xdd]);
                const testBuffer = createTestBuffer(true, specificAmqpData);

                // Act
                ServiceBusMessageDecoder.decode(testBuffer);

                // Assert
                expect(rheaMessageDecodeStub).to.have.been.calledOnce;
                const passedArg: Buffer = rheaMessageDecodeStub.getCall(0).args[0] as Buffer;
                expect(passedArg).to.be.instanceOf(Buffer);
                expect(passedArg).to.deep.equal(specificAmqpData);
            });

            it('should handle various Rhea message structures', () => {
                // Arrange
                const testBuffer = createTestBuffer();
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const complexRheaMessage = createMockRheaMessage({
                    body: {
                        complexObject: {
                            nestedArray: [{ id: 1 }, { id: 2 }],
                            timestamp: new Date().toISOString(),
                        },
                    },
                    application_properties: {
                        'x-custom-header': 'custom-value',
                        'x-processing-time': 1500,
                        'x-retry-count': 3,
                    },
                    message_annotations: {
                        'x-opt-offset': '1234567890',
                        'x-opt-enqueued-time': Date.now(),
                        'x-opt-partition-key': 'partition-1',
                    },
                });
                rheaMessageDecodeStub.returns(complexRheaMessage);

                // Act
                const result = ServiceBusMessageDecoder.decode(testBuffer);

                // Assert
                expect(result.decodedMessage).to.deep.equal(complexRheaMessage);
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                expect(result.decodedMessage.body).to.deep.equal(complexRheaMessage.body);
                expect(result.decodedMessage.application_properties).to.deep.equal(
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    complexRheaMessage.application_properties
                );
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                expect(result.decodedMessage.message_annotations).to.deep.equal(complexRheaMessage.message_annotations);
            });

            it('should maintain type casting for rhea.Message', () => {
                // Arrange
                const testBuffer = createTestBuffer();
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const rheaMessage = createMockRheaMessage();
                rheaMessageDecodeStub.returns(rheaMessage);

                // Act
                const result = ServiceBusMessageDecoder.decode(testBuffer);

                // Assert
                // TypeScript compilation should pass - verifying the cast works
                expect(result.decodedMessage).to.have.property('body');
                expect(result.decodedMessage.body).to.not.be.undefined;
            });
        });

        describe('Edge Cases and Boundary Conditions', () => {
            it('should handle lock token at the very end of buffer', () => {
                // Arrange
                const amqpData = Buffer.from([0x01, 0x02]);
                // Create exactly 16 bytes of prefix data with lock token
                const prefixData = Buffer.alloc(16);
                MOCK_X_OPT_LOCK_TOKEN.copy(prefixData, 0);
                const testBuffer = Buffer.concat([prefixData, amqpData]);

                // Act
                const result = ServiceBusMessageDecoder.decode(testBuffer);

                // Assert
                expect(result).to.have.property('decodedMessage');
                expect(result).to.have.property('lockToken', MOCK_LOCK_TOKEN);
                expect(rheaMessageDecodeStub).to.have.been.calledWith(
                    sinon.match((value: Buffer) => Buffer.compare(value, amqpData) === 0)
                );
            });

            it('should handle minimal valid buffer', () => {
                // Arrange
                const minimalAmqpData = Buffer.from([0x00]); // Minimal AMQP data
                const testBuffer = Buffer.concat([MOCK_X_OPT_LOCK_TOKEN, minimalAmqpData]);

                // Act
                const result = ServiceBusMessageDecoder.decode(testBuffer);

                // Assert
                expect(result).to.have.property('decodedMessage');
                expect(result).to.have.property('lockToken', MOCK_LOCK_TOKEN);
            });

            it('should handle buffer with only lock token and no AMQP data', () => {
                // Arrange
                // Create exactly 16 bytes of prefix data with lock token
                const prefixData = Buffer.alloc(16);
                MOCK_X_OPT_LOCK_TOKEN.copy(prefixData, 0);
                const testBuffer = prefixData; // Only prefix, no AMQP data after

                // Act
                const result = ServiceBusMessageDecoder.decode(testBuffer);

                // Assert
                expect(rheaMessageDecodeStub).to.have.been.calledWith(
                    sinon.match((value: Buffer) => value.length === 0)
                );
                expect(result).to.have.property('lockToken', MOCK_LOCK_TOKEN);
            });

            it('should handle very large buffers without memory issues', () => {
                // Arrange
                const largePrefix = Buffer.alloc(10 * 1024 * 1024, 0xaa); // 10MB prefix
                const amqpData = Buffer.from([0x01, 0x02, 0x03]);
                const testBuffer = Buffer.concat([largePrefix, MOCK_X_OPT_LOCK_TOKEN, amqpData]);

                const initialMemory = process.memoryUsage().heapUsed;

                // Act
                const result = ServiceBusMessageDecoder.decode(testBuffer);

                // Assert
                const finalMemory = process.memoryUsage().heapUsed;
                const memoryIncrease = finalMemory - initialMemory;

                expect(result).to.have.property('decodedMessage');
                expect(memoryIncrease).to.be.lessThan(50 * 1024 * 1024); // Should not leak significant memory
            });
        });

        describe('Performance and Scalability', () => {
            it('should decode messages efficiently under load', () => {
                // Arrange
                const iterations = 1000;
                const testBuffer = createTestBuffer();
                const startTime = process.hrtime.bigint();

                // Act
                for (let i = 0; i < iterations; i++) {
                    ServiceBusMessageDecoder.decode(testBuffer);
                }

                // Assert
                const endTime = process.hrtime.bigint();
                const totalTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
                const avgTimePerOperation = totalTime / iterations;

                expect(avgTimePerOperation).to.be.lessThan(1); // Should average less than 1ms per operation
                expect(rheaMessageDecodeStub).to.have.callCount(iterations);
            });

            it('should handle rapid successive decode calls', () => {
                // Arrange
                const rapidCalls = 100;
                const testBuffer = createTestBuffer();

                // Act
                const results = Array.from({ length: rapidCalls }, () => ServiceBusMessageDecoder.decode(testBuffer));

                // Assert
                expect(results).to.have.length(rapidCalls);
                results.forEach((result) => {
                    expect(result).to.have.property('decodedMessage');
                    expect(result).to.have.property('lockToken', MOCK_LOCK_TOKEN);
                });
                expect(rheaMessageDecodeStub).to.have.callCount(rapidCalls);
            });
        });
    });
});
