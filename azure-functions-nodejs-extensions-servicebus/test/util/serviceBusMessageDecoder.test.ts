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

describe('ServiceBusMessageDecoder host binding payloads', () => {
    const lockTokenBytes = Buffer.from('33221100554477668899aabbccddeeff', 'hex');
    const expectedLockToken = '00112233-4455-6677-8899-aabbccddeeff';
    const createContent = (message: Partial<rhea.Message> = {}, prefix = lockTokenBytes): Buffer =>
        Buffer.concat([
            prefix,
            rhea.message.encode({ body: 'test message body', message_id: 'message-180', ...message }),
        ]);

    const annotationCases: { name: string; message: Partial<rhea.Message> }[] = [
        { name: 'no annotations', message: {} },
        {
            name: 'unrelated message annotations',
            message: { message_annotations: { 'custom-annotation': 'value' } },
        },
        {
            name: 'a zero-valued lock-token annotation',
            message: { message_annotations: { 'x-opt-lock-token': Buffer.alloc(16) } },
        },
        {
            name: 'a conflicting lock-token annotation',
            message: { message_annotations: { 'x-opt-lock-token': Buffer.alloc(16, 0xff) } },
        },
        {
            name: 'a delivery lock-token annotation',
            message: { delivery_annotations: { 'x-opt-lock-token': Buffer.alloc(16) } },
        },
    ];

    annotationCases.forEach(({ name, message }) => {
        it(`should decode messages with ${name} using the host-provided GUID`, () => {
            const result = ServiceBusMessageDecoder.decode(createContent(message));

            expect(result.lockToken).to.equal(expectedLockToken);
            expect(result.decodedMessage.message_id).to.equal('message-180');
            expect(result.decodedMessage.body).to.equal('test message body');
            expect(result.decodedMessage.message_annotations).to.deep.equal(message.message_annotations);
            expect(result.decodedMessage.delivery_annotations).to.deep.equal(message.delivery_annotations);
        });
    });

    const tokenCases = [
        {
            name: 'leading zeros',
            bytes: Buffer.from('00000001000200030405060708090a0b', 'hex'),
            expected: '01000000-0200-0300-0405-060708090a0b',
        },
        {
            name: 'all zero bytes',
            bytes: Buffer.alloc(16),
            expected: '00000000-0000-0000-0000-000000000000',
        },
        {
            name: 'all maximum-value bytes',
            bytes: Buffer.alloc(16, 0xff),
            expected: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
        },
    ];

    tokenCases.forEach(({ name, bytes, expected }) => {
        it(`should preserve .NET GUID byte ordering for ${name}`, () => {
            expect(ServiceBusMessageDecoder.decode(createContent({}, bytes)).lockToken).to.equal(expected);
        });
    });

    it('should preserve message properties without a lock-token annotation', () => {
        const content = createContent({
            correlation_id: 'correlation-180',
            content_type: 'application/json',
            subject: 'test subject',
            application_properties: { customProperty: 'value', retryCount: 2 },
        });

        const { decodedMessage } = ServiceBusMessageDecoder.decode(content);

        expect(decodedMessage.correlation_id).to.equal('correlation-180');
        expect(decodedMessage.content_type).to.equal('application/json');
        expect(decodedMessage.subject).to.equal('test subject');
        expect(decodedMessage.application_properties).to.deep.equal({ customProperty: 'value', retryCount: 2 });
    });

    it('should not treat the annotation name in the body as a lock token', () => {
        const result = ServiceBusMessageDecoder.decode(createContent({ body: 'x-opt-lock-token' }));

        expect(result.lockToken).to.equal(expectedLockToken);
        expect(result.decodedMessage.body).to.equal('x-opt-lock-token');
    });

    it('should leave the entire input unchanged across repeated decodes', () => {
        const content = createContent();
        const original = Buffer.from(content);

        for (let i = 0; i < 2; i++) {
            const result = ServiceBusMessageDecoder.decode(content);

            expect(result.lockToken).to.equal(expectedLockToken);
            expect(result.decodedMessage.body).to.equal('test message body');
            expect(content).to.deep.equal(original);
        }
    });

    it('should decode a buffer view with a nonzero byte offset', () => {
        const content = createContent();
        const paddedContent = Buffer.concat([Buffer.alloc(3, 0xff), content, Buffer.alloc(3, 0xff)]);
        const original = Buffer.from(paddedContent);
        const view = paddedContent.subarray(3, 3 + content.length);

        const result = ServiceBusMessageDecoder.decode(view);

        expect(result.lockToken).to.equal(expectedLockToken);
        expect(result.decodedMessage.body).to.equal('test message body');
        expect(paddedContent).to.deep.equal(original);
    });

    for (let length = 1; length <= 16; length++) {
        it(`should reject ${length} bytes without a complete prefix and AMQP message`, () => {
            expect(() => ServiceBusMessageDecoder.decode(Buffer.alloc(length))).to.throw(
                'Content must contain a 16-byte lock token followed by an AMQP message'
            );
        });
    }

    it('should propagate invalid AMQP errors and restore console.warn', () => {
        const originalWarn = console.warn;
        const content = Buffer.concat([lockTokenBytes, Buffer.from([0xff, 0xff, 0xff])]);

        expect(() => ServiceBusMessageDecoder.decode(content)).to.throw();
        expect(console.warn).to.equal(originalWarn);
    });

    it('should reject a truncated AMQP message after a complete prefix', () => {
        const amqp = rhea.message.encode({ body: 'truncated message body' });
        const content = Buffer.concat([lockTokenBytes, amqp.subarray(0, amqp.length - 1)]);

        expect(() => ServiceBusMessageDecoder.decode(content)).to.throw();
    });

    it('should restore console.warn after successfully decoding an annotation-free message', () => {
        const originalWarn = console.warn;

        ServiceBusMessageDecoder.decode(createContent());

        expect(console.warn).to.equal(originalWarn);
    });
});

describe('ServiceBusMessageDecoder', () => {
    let lockTokenUtilStub: sinon.SinonStub;
    let rheaMessageDecodeStub: sinon.SinonStub;

    // Mock constants and test data
    const MOCK_LOCK_TOKEN = '12345678-1234-1234-1234-123456789abc';

    // Helper function to create test buffers
    const createTestBuffer = (amqpData?: Buffer): Buffer => {
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

        return Buffer.concat([Buffer.alloc(16), amqpBuffer]);
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

            it('should extract the lock token from the fixed-size prefix', () => {
                // Arrange
                const testBuffer = createTestBuffer();

                // Act
                ServiceBusMessageDecoder.decode(testBuffer);

                // Assert
                expect(lockTokenUtilStub).to.have.been.calledOnceWithExactly(testBuffer, 16);
            });

            it('should extract AMQP slice after lock token', () => {
                // Arrange
                const amqpData = Buffer.from([0x10, 0x20, 0x30, 0x40]);
                const testBuffer = createTestBuffer(amqpData);

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

            it('should reject an incomplete prefix before extracting or decoding', () => {
                // Arrange
                const incompleteContent = Buffer.alloc(15);

                // Act & Assert
                expect(() => ServiceBusMessageDecoder.decode(incompleteContent)).to.throw(
                    'Content must contain a 16-byte lock token followed by an AMQP message'
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
                const testBuffer = createTestBuffer(corruptedAmqpData);
                rheaMessageDecodeStub.throws(new Error('Invalid AMQP format'));

                // Act & Assert
                expect(() => ServiceBusMessageDecoder.decode(testBuffer)).to.throw('Invalid AMQP format');
            });
        });

        describe('Buffer Processing and Memory Management', () => {
            it('should handle large message buffers efficiently', () => {
                // Arrange
                const largeAmqpData = Buffer.alloc(1024 * 1024, 0xab); // 1MB buffer
                const testBuffer = createTestBuffer(largeAmqpData);
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

            it('should ignore annotation names in AMQP data when extracting the lock token', () => {
                // Arrange
                const amqpData = Buffer.concat([
                    Buffer.from('x-opt-lock-token'),
                    Buffer.from('middle'),
                    Buffer.from('x-opt-lock-token'),
                    Buffer.from([0x01, 0x02, 0x03]),
                ]);
                const multiTokenBuffer = createTestBuffer(amqpData);

                // Act
                ServiceBusMessageDecoder.decode(multiTokenBuffer);

                // Assert
                expect(lockTokenUtilStub).to.have.been.calledOnceWithExactly(multiTokenBuffer, 16);
                expect(rheaMessageDecodeStub).to.have.been.calledOnceWithExactly(amqpData);
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
            it('should extract the prefix without a lock-token annotation', () => {
                // Arrange
                const testBuffer = createTestBuffer();

                // Act
                ServiceBusMessageDecoder.decode(testBuffer);

                // Assert
                expect(testBuffer.includes(LockTokenUtil.X_OPT_LOCK_TOKEN)).to.be.false;
                expect(lockTokenUtilStub).to.have.been.calledOnceWithExactly(testBuffer, 16);
            });

            it('should pass correct parameters to LockTokenUtil.extractFromMessage', () => {
                // Arrange
                const testBuffer = createTestBuffer();

                // Act
                ServiceBusMessageDecoder.decode(testBuffer);

                // Assert
                expect(lockTokenUtilStub).to.have.been.calledOnceWithExactly(testBuffer, 16);
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
                const testBuffer = createTestBuffer(specificAmqpData);

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
            it('should pass AMQP data immediately after the fixed-size prefix', () => {
                // Arrange
                const amqpData = Buffer.from([0x01, 0x02]);
                const testBuffer = createTestBuffer(amqpData);

                // Act
                const result = ServiceBusMessageDecoder.decode(testBuffer);

                // Assert
                expect(result).to.have.property('decodedMessage');
                expect(result).to.have.property('lockToken', MOCK_LOCK_TOKEN);
                expect(rheaMessageDecodeStub).to.have.been.calledWith(
                    sinon.match((value: Buffer) => Buffer.compare(value, amqpData) === 0)
                );
            });

            it('should delegate nonempty AMQP validation to rhea', () => {
                // Arrange
                const minimalAmqpData = Buffer.from([0x00]);
                const testBuffer = createTestBuffer(minimalAmqpData);

                // Act
                const result = ServiceBusMessageDecoder.decode(testBuffer);

                // Assert
                expect(result).to.have.property('decodedMessage');
                expect(result).to.have.property('lockToken', MOCK_LOCK_TOKEN);
                expect(rheaMessageDecodeStub).to.have.been.calledOnceWithExactly(minimalAmqpData);
            });

            it('should reject a buffer containing only the lock token without decoding', () => {
                // Arrange
                const testBuffer = Buffer.alloc(16);

                // Act & Assert
                expect(() => ServiceBusMessageDecoder.decode(testBuffer)).to.throw(
                    'Content must contain a 16-byte lock token followed by an AMQP message'
                );
                expect(lockTokenUtilStub).to.not.have.been.called;
                expect(rheaMessageDecodeStub).to.not.have.been.called;
            });

            it('should handle very large buffers without memory issues', () => {
                // Arrange
                const largeAmqpData = Buffer.alloc(10 * 1024 * 1024, 0xaa);
                const testBuffer = createTestBuffer(largeAmqpData);

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
