// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { AmqpAnnotatedMessage } from '@azure/core-amqp';
import { ModelBindingData } from '@azure/functions-extensions-base';
import chai, { expect } from 'chai';
import LongActual from 'long';
import * as rhea from 'rhea';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { AzureServiceBusMessageFactory } from '../../src/servicebus/azureServiceBusMessageFactory';
import { ServiceBusMessageActions } from '../../src/servicebus/ServiceBusMessageActions';
import { ServiceBusMessageDecoder } from '../../src/util/serviceBusMessageDecoder';
import { ServiceBusMessageContext } from '../../types';

// Configure chai with sinon-chai
chai.use(sinonChai);

describe('AzureServiceBusMessageFactory', () => {
    let serviceBusMessageActionsStub: sinon.SinonStubbedInstance<ServiceBusMessageActions>;
    let serviceBusMessageDecoderStub: sinon.SinonStub;
    let amqpAnnotatedMessageStub: sinon.SinonStub;

    // Mock data factories
    const createMockModelBindingData = (content?: Buffer | null, contentType?: string): ModelBindingData => ({
        source: 'ServiceBusTrigger',
        content: content ?? Buffer.from(JSON.stringify({ test: 'message' })),
        contentType: contentType || 'application/json',
    });

    const createMockRheaMessage = (overrides?: Partial<rhea.Message>): rhea.Message => ({
        body: 'test message body',
        message_id: 'test-message-id-123',
        correlation_id: 'test-correlation-id-456',
        content_type: 'application/json',
        subject: 'test-subject',
        to: 'test-destination',
        reply_to: 'test-reply-to',
        reply_to_group_id: 'test-reply-session',
        group_id: 'test-session-id',
        ttl: 60000,
        application_properties: {
            customProperty: 'test-value',
            timestamp: new Date().toISOString(),
        },
        message_annotations: {
            'x-opt-enqueued-time': Date.now(),
            'x-opt-sequence-number': 12345,
            'x-opt-enqueued-sequence-number': 54321,
        },
        delivery_annotations: {},
        footer: {},
        ...overrides,
    });

    const createMockAmqpMessage = (overrides?: Partial<AmqpAnnotatedMessage>): AmqpAnnotatedMessage => ({
        body: 'test message body',
        properties: {
            messageId: 'test-message-id-123',
            correlationId: 'test-correlation-id-456',
            contentType: 'application/json',
            subject: 'test-subject',
            to: 'test-destination',
            replyTo: 'test-reply-to',
            replyToGroupId: 'test-reply-session',
            groupId: 'test-session-id',
        },
        header: {
            deliveryCount: 0,
            timeToLive: 60000,
            durable: true,
            priority: 4,
            firstAcquirer: false,
        },
        applicationProperties: {
            customProperty: 'test-value',
            timestamp: new Date().toISOString(),
        },
        messageAnnotations: {
            'x-opt-enqueued-time': Date.now(),
            'x-opt-sequence-number': 12345,
            'x-opt-enqueued-sequence-number': 54321,
        },
        deliveryAnnotations: {},
        footer: {},
        ...overrides,
    });

    const createMockDecodedResult = (rheaMessage?: rhea.Message, lockToken?: string) => ({
        decodedMessage: rheaMessage || createMockRheaMessage(),
        lockToken: lockToken || 'test-lock-token-789',
    });

    beforeEach(() => {
        // Mock ServiceBusMessageActions singleton
        serviceBusMessageActionsStub = {
            complete: sinon.stub().resolves(),
            abandon: sinon.stub().resolves(),
            deadletter: sinon.stub().resolves(),
            defer: sinon.stub().resolves(),
            renewMessageLock: sinon.stub().resolves(),
            setSessionState: sinon.stub().resolves(),
            releaseSession: sinon.stub().resolves(),
            renewSessionLock: sinon.stub().resolves(new Date()),
            getConnectionHealth: sinon.stub().returns('healthy'),
            getStatistics: sinon.stub().returns({}),
            updateConfiguration: sinon.stub().resolves(),
            dispose: sinon.stub(),
        } as unknown as sinon.SinonStubbedInstance<ServiceBusMessageActions>;

        sinon.stub(ServiceBusMessageActions, 'getInstance').returns(serviceBusMessageActionsStub);

        // Mock ServiceBusMessageDecoder
        serviceBusMessageDecoderStub = sinon
            .stub(ServiceBusMessageDecoder, 'decode')
            .returns(createMockDecodedResult());

        // Mock AmqpAnnotatedMessage.fromRheaMessage
        amqpAnnotatedMessageStub = sinon.stub(AmqpAnnotatedMessage, 'fromRheaMessage').returns(createMockAmqpMessage());
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('buildServiceBusMessageFromModelBindingData', () => {
        describe('Single ModelBindingData Processing', () => {
            it('should build ServiceBusMessageContext from single ModelBindingData', () => {
                // Arrange
                const mockModelBindingData = createMockModelBindingData();
                const mockDecodedResult = createMockDecodedResult();
                serviceBusMessageDecoderStub.returns(mockDecodedResult);

                // Act
                const result =
                    AzureServiceBusMessageFactory.buildServiceBusMessageFromModelBindingData(mockModelBindingData);

                // Assert
                expect(result).to.be.an('object');
                expect(result).to.have.property('messages').that.is.an('array'); // Now always returns array
                expect(result.messages).to.have.lengthOf(1); // Single message wrapped in array
                expect(result).to.have.property('actions', serviceBusMessageActionsStub);
                expect(serviceBusMessageDecoderStub).to.have.been.calledOnceWith(mockModelBindingData.content);
            });

            it('should create ServiceBusReceivedMessage with correct properties from single ModelBindingData', () => {
                // Arrange
                const mockModelBindingData = createMockModelBindingData();
                const mockRheaMessage = createMockRheaMessage();
                const mockDecodedResult = createMockDecodedResult(mockRheaMessage, 'test-lock-123');
                serviceBusMessageDecoderStub.returns(mockDecodedResult);

                // Act
                const result =
                    AzureServiceBusMessageFactory.buildServiceBusMessageFromModelBindingData(mockModelBindingData);

                // Assert
                expect(result.messages).to.be.an('array');
                expect(result.messages).to.have.lengthOf(1);
                expect(result.messages[0]).to.have.property('messageId');
                expect(result.messages[0]).to.have.property('lockToken', 'test-lock-123');
                expect(result.messages[0]).to.have.property('body', 'test message body');
                sinon.assert.calledOnceWithExactly(amqpAnnotatedMessageStub, mockRheaMessage);
            });

            it('should handle ModelBindingData with different content types', () => {
                // Arrange
                const testCases = [
                    { content: Buffer.from('plain text'), contentType: 'text/plain' },
                    { content: Buffer.from(JSON.stringify({ json: true })), contentType: 'application/json' },
                    { content: Buffer.from('<xml>content</xml>'), contentType: 'application/xml' },
                    { content: Buffer.from([1, 2, 3, 4]), contentType: 'application/octet-stream' },
                ];

                testCases.forEach((testCase, index) => {
                    const mockModelBindingData = createMockModelBindingData(testCase.content, testCase.contentType);
                    serviceBusMessageDecoderStub.onCall(index).returns(createMockDecodedResult());

                    // Act
                    const result =
                        AzureServiceBusMessageFactory.buildServiceBusMessageFromModelBindingData(mockModelBindingData);

                    // Assert
                    expect(serviceBusMessageDecoderStub.getCall(index)).to.have.been.calledWith(testCase.content);
                    expect(result).to.have.property('messages');
                    expect(result).to.have.property('actions');
                });
            });

            it('should throw error when ModelBindingData content is null', () => {
                // Arrange
                const mockModelBindingData = createMockModelBindingData();
                mockModelBindingData.content = null;

                // Act & Assert
                expect(() =>
                    AzureServiceBusMessageFactory.buildServiceBusMessageFromModelBindingData(mockModelBindingData)
                ).to.throw('ModelBindingData.content is null or undefined.');

                expect(serviceBusMessageDecoderStub).to.not.have.been.called;
            });

            it('should throw error when ModelBindingData content is undefined', () => {
                // Arrange
                const mockModelBindingData = createMockModelBindingData();
                mockModelBindingData.content = undefined;

                // Act & Assert
                expect(() =>
                    AzureServiceBusMessageFactory.buildServiceBusMessageFromModelBindingData(mockModelBindingData)
                ).to.throw('ModelBindingData.content is null or undefined.');
            });
        });

        describe('Array ModelBindingData Processing', () => {
            it('should build ServiceBusMessageContext from array of ModelBindingData', () => {
                // Arrange
                const mockModelBindingDataArray = [
                    createMockModelBindingData(Buffer.from('message 1')),
                    createMockModelBindingData(Buffer.from('message 2')),
                    createMockModelBindingData(Buffer.from('message 3')),
                ];

                serviceBusMessageDecoderStub
                    .onCall(0)
                    .returns(createMockDecodedResult(createMockRheaMessage({ body: 'message 1' }), 'lock-1'))
                    .onCall(1)
                    .returns(createMockDecodedResult(createMockRheaMessage({ body: 'message 2' }), 'lock-2'))
                    .onCall(2)
                    .returns(createMockDecodedResult(createMockRheaMessage({ body: 'message 3' }), 'lock-3'));

                // Act
                const result =
                    AzureServiceBusMessageFactory.buildServiceBusMessageFromModelBindingData(mockModelBindingDataArray);

                // Assert
                expect(result).to.be.an('object');
                expect(result).to.have.property('messages').that.is.an('array').with.length(3);
                expect(result).to.have.property('actions', serviceBusMessageActionsStub);
                expect(serviceBusMessageDecoderStub).to.have.been.calledThrice;
            });

            it('should process each message in array correctly', () => {
                // Arrange
                const mockModelBindingDataArray = [
                    createMockModelBindingData(Buffer.from('{"id": 1}')),
                    createMockModelBindingData(Buffer.from('{"id": 2}')),
                ];

                serviceBusMessageDecoderStub
                    .onCall(0)
                    .returns(createMockDecodedResult(createMockRheaMessage({ message_id: 'msg-1' }), 'lock-1'))
                    .onCall(1)
                    .returns(createMockDecodedResult(createMockRheaMessage({ message_id: 'msg-2' }), 'lock-2'));

                // Act
                const result =
                    AzureServiceBusMessageFactory.buildServiceBusMessageFromModelBindingData(mockModelBindingDataArray);

                // Assert
                expect(Array.isArray(result.messages)).to.be.true;
                if (Array.isArray(result.messages)) {
                    expect(result.messages).to.have.length(2);
                    expect(result.messages[0]).to.have.property('lockToken', 'lock-1');
                    expect(result.messages[1]).to.have.property('lockToken', 'lock-2');
                }
                expect(serviceBusMessageDecoderStub.getCall(0)).to.have.been.calledWith(
                    mockModelBindingDataArray[0]?.content ?? undefined
                );
                expect(serviceBusMessageDecoderStub.getCall(1)).to.have.been.calledWith(
                    mockModelBindingDataArray[1]?.content ?? undefined
                );
            });

            it('should handle empty array', () => {
                // Arrange
                const emptyArray: ModelBindingData[] = [];

                // Act
                const result = AzureServiceBusMessageFactory.buildServiceBusMessageFromModelBindingData(emptyArray);

                // Assert
                expect(result).to.have.property('messages').that.is.an('array').with.length(0);
                expect(result).to.have.property('actions', serviceBusMessageActionsStub);
                expect(serviceBusMessageDecoderStub).to.not.have.been.called;
            });

            it('should handle array with one null content item', () => {
                // Arrange
                const mockModelBindingDataArray = [createMockModelBindingData(), createMockModelBindingData()];
                if (mockModelBindingDataArray[0]) {
                    mockModelBindingDataArray[0].content = null; // Set first item content to null
                }

                // Act & Assert
                expect(() =>
                    AzureServiceBusMessageFactory.buildServiceBusMessageFromModelBindingData(mockModelBindingDataArray)
                ).to.throw('ModelBindingData.content is null or undefined.');
            });
        });

        describe('ServiceBusMessageActions Integration', () => {
            it('should use ServiceBusMessageActions singleton instance', () => {
                // Arrange
                const mockModelBindingData = createMockModelBindingData();

                // Act
                const result =
                    AzureServiceBusMessageFactory.buildServiceBusMessageFromModelBindingData(mockModelBindingData);

                // Assert
                // eslint-disable-next-line @typescript-eslint/unbound-method
                expect(ServiceBusMessageActions.getInstance as sinon.SinonStub).to.have.been.calledOnce;
                expect(result.actions).to.equal(serviceBusMessageActionsStub);
            });

            it('should handle ServiceBusMessageActions getInstance error', () => {
                // Arrange
                (ServiceBusMessageActions.getInstance as sinon.SinonStub).throws(
                    new Error('Actions initialization failed')
                );
                const mockModelBindingData = createMockModelBindingData();

                // Act & Assert
                expect(() =>
                    AzureServiceBusMessageFactory.buildServiceBusMessageFromModelBindingData(mockModelBindingData)
                ).to.throw('Actions initialization failed');
            });
        });

        describe('ServiceBusMessageDecoder Integration', () => {
            it('should handle decoder errors gracefully', () => {
                // Arrange
                serviceBusMessageDecoderStub.throws(new Error('Decoder failed to parse message'));
                const mockModelBindingData = createMockModelBindingData();

                // Act & Assert
                expect(() =>
                    AzureServiceBusMessageFactory.buildServiceBusMessageFromModelBindingData(mockModelBindingData)
                ).to.throw('Decoder failed to parse message');
            });

            it('should pass correct content buffer to decoder', () => {
                // Arrange
                const customContent = Buffer.from('custom message content');
                const mockModelBindingData = createMockModelBindingData(customContent);

                // Act
                AzureServiceBusMessageFactory.buildServiceBusMessageFromModelBindingData(mockModelBindingData);

                // Assert
                expect(serviceBusMessageDecoderStub).to.have.been.calledOnceWith(customContent);
            });
        });
    });

    describe('createServiceBusReceivedMessageFromAmqp', () => {
        it('should create ServiceBusReceivedMessage from AMQP message', () => {
            // Arrange
            const mockAmqpMessage = createMockAmqpMessage();
            const lockToken = 'test-lock-token-amqp';

            // Act
            const result = AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromAmqp(
                mockAmqpMessage,
                lockToken
            );

            // Assert
            expect(result).to.be.an('object');
            expect(result).to.have.property('body', 'test message body');
            expect(result).to.have.property('messageId', 'test-message-id-123');
            expect(result).to.have.property('correlationId', 'test-correlation-id-456');
            expect(result).to.have.property('contentType', 'application/json');
            expect(result).to.have.property('subject', 'test-subject');
            expect(result).to.have.property('lockToken', lockToken);
            expect(result).to.have.property('_rawAmqpMessage', mockAmqpMessage);
        });

        it('should convert timestamps correctly', () => {
            // Arrange
            const enqueuedTime = Date.now();
            const mockAmqpMessage = createMockAmqpMessage({
                messageAnnotations: {
                    'x-opt-enqueued-time': enqueuedTime,
                    'x-opt-sequence-number': 99999,
                },
            });

            const lockToken = 'test-lock-token-amqp';

            // Act
            const result = AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromAmqp(
                mockAmqpMessage,
                lockToken
            );

            // Assert
            expect(result).to.have.property('enqueuedTimeUtc').that.is.a('date');
            expect(result.enqueuedTimeUtc?.getTime()).to.equal(enqueuedTime);
            expect(result).to.have.property('sequenceNumber');
            expect(LongActual.isLong(result.sequenceNumber)).to.be.true;
        });

        it('should handle string timestamp in message annotations', () => {
            // Arrange
            const enqueuedTimeString = new Date().toISOString();
            const mockAmqpMessage = createMockAmqpMessage({
                messageAnnotations: {
                    'x-opt-enqueued-time': enqueuedTimeString,
                },
            });

            const lockToken = 'test-lock-token-amqp';

            // Act
            const result = AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromAmqp(
                mockAmqpMessage,
                lockToken
            );

            // Assert
            expect(result).to.have.property('enqueuedTimeUtc').that.is.a('date');
            expect(result.enqueuedTimeUtc?.toISOString()).to.equal(enqueuedTimeString);
        });

        it('should extract dead letter properties from application properties', () => {
            // Arrange
            const mockAmqpMessage = createMockAmqpMessage({
                applicationProperties: {
                    DeadLetterReason: 'MaxDeliveryCountExceeded',
                    DeadLetterErrorDescription: 'Message processing failed after 5 attempts',
                    customProperty: 'test-value',
                },
            });

            const lockToken = 'test-lock-token-amqp';

            // Act
            const result = AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromAmqp(
                mockAmqpMessage,
                lockToken
            );

            // Assert
            expect(result).to.have.property('deadLetterReason', 'MaxDeliveryCountExceeded');
            expect(result).to.have.property('deadLetterErrorDescription', 'Message processing failed after 5 attempts');
            expect(result).to.have.property('applicationProperties').that.includes({
                customProperty: 'test-value',
            });
        });

        it('should handle session-related properties', () => {
            // Arrange
            const sessionId = 'test-session-123';
            const replyToSessionId = 'test-reply-session-456';
            const mockAmqpMessage = createMockAmqpMessage({
                properties: {
                    groupId: sessionId,
                    replyToGroupId: replyToSessionId,
                },
            });

            const lockToken = 'test-lock-token-amqp';

            // Act
            const result = AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromAmqp(
                mockAmqpMessage,
                lockToken
            );

            // Assert
            expect(result).to.have.property('sessionId', sessionId);
            expect(result).to.have.property('replyToSessionId', replyToSessionId);
        });

        it('should handle various message body types', () => {
            // Arrange
            const testCases = [
                { body: 'string message', description: 'string body' },
                { body: { json: 'object' }, description: 'object body' },
                { body: Buffer.from('binary data'), description: 'buffer body' },
                { body: [1, 2, 3, 4, 5], description: 'array body' },
                { body: null, description: 'null body' },
                { body: undefined, description: 'undefined body' },
            ];

            testCases.forEach((testCase) => {
                const mockAmqpMessage = createMockAmqpMessage({ body: testCase.body });

                const lockToken = 'test-lock-token-amqp';

                // Act
                const result = AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromAmqp(
                    mockAmqpMessage,
                    lockToken
                );

                // Assert
                expect(result).to.have.property('body', testCase.body);
            });
        });
    });

    describe('createServiceBusReceivedMessageFromRhea', () => {
        it('should create ServiceBusReceivedMessage from Rhea message', () => {
            // Arrange
            const mockRheaMessage = createMockRheaMessage();
            const lockToken = 'test-lock-token-rhea';
            const mockAmqpMessage = createMockAmqpMessage();
            amqpAnnotatedMessageStub.returns(mockAmqpMessage);

            // Act
            const result = AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromRhea(
                mockRheaMessage,
                lockToken
            );

            // Assert
            expect(amqpAnnotatedMessageStub).to.have.been.calledOnceWith(mockRheaMessage);
            expect(result).to.be.an('object');
            expect(result).to.have.property('lockToken', lockToken);
            expect(result).to.have.property('_rawAmqpMessage', mockAmqpMessage);
        });

        it('should handle AmqpAnnotatedMessage.fromRheaMessage errors', () => {
            // Arrange
            const mockRheaMessage = createMockRheaMessage();
            amqpAnnotatedMessageStub.throws(new Error('AMQP conversion failed'));

            const lockToken = 'test-lock-token-amqp';

            // Act & Assert
            expect(() =>
                AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromRhea(mockRheaMessage, lockToken)
            ).to.throw('AMQP conversion failed');
        });

        it('should handle complex Rhea message structures', () => {
            // Arrange
            const complexRheaMessage = createMockRheaMessage({
                body: {
                    complex: 'object',
                    nested: {
                        array: [1, 2, 3],
                        boolean: true,
                    },
                },
                application_properties: {
                    'custom-header': 'custom-value',
                    'numeric-prop': 12345,
                    'boolean-prop': true,
                },
                message_annotations: {
                    'x-opt-enqueued-time': Date.now(),
                    'x-opt-sequence-number': 999999,
                    'custom-annotation': 'annotation-value',
                },
            });

            const expectedAmqpMessage = createMockAmqpMessage({
                body: complexRheaMessage.body as unknown,
                applicationProperties: complexRheaMessage.application_properties,
                messageAnnotations: complexRheaMessage.message_annotations,
            });

            amqpAnnotatedMessageStub.returns(expectedAmqpMessage);

            const lockToken = 'test-lock-token-amqp';

            // Act
            const result = AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromRhea(
                complexRheaMessage,
                lockToken
            );

            // Assert
            expect(result).to.have.property('body').that.deep.equals(complexRheaMessage.body);
            expect(result)
                .to.have.property('applicationProperties')
                .that.deep.equals(complexRheaMessage.application_properties);
            expect(amqpAnnotatedMessageStub).to.have.been.calledOnceWith(complexRheaMessage);
        });
    });

    describe('Integration and Performance Tests', () => {
        it('should handle large batch processing efficiently', () => {
            // Arrange
            const batchSize = 100;
            const largeBatch = Array.from({ length: batchSize }, (_, index) =>
                createMockModelBindingData(Buffer.from(`message ${index}`))
            );

            // Setup decoder to return different results for each call
            largeBatch.forEach((_, index) => {
                serviceBusMessageDecoderStub
                    .onCall(index)
                    .returns(
                        createMockDecodedResult(
                            createMockRheaMessage({ message_id: `batch-msg-${index}` }),
                            `batch-lock-${index}`
                        )
                    );
            });

            const startTime = process.hrtime.bigint();

            // Act
            const result = AzureServiceBusMessageFactory.buildServiceBusMessageFromModelBindingData(largeBatch);

            // Assert
            const endTime = process.hrtime.bigint();
            const executionTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds

            expect(result.messages).to.have.length(batchSize);
            expect(executionTime).to.be.lessThan(1000); // Should complete in less than 1 second
            expect(serviceBusMessageDecoderStub).to.have.callCount(batchSize);
        });

        it('should maintain type safety across all conversions', () => {
            // Arrange
            const mockModelBindingData = createMockModelBindingData();

            // Act
            const result =
                AzureServiceBusMessageFactory.buildServiceBusMessageFromModelBindingData(mockModelBindingData);

            // Assert - TypeScript compilation should pass
            expect(result).to.satisfy((manager: ServiceBusMessageContext) => {
                return typeof manager.messages === 'object' && typeof manager.actions === 'object';
            });
        });

        it('should handle concurrent factory calls', async () => {
            // Arrange
            const concurrentCalls = 10;
            const promises = Array.from({ length: concurrentCalls }, (_, index) =>
                Promise.resolve().then(() => {
                    const mockData = createMockModelBindingData(Buffer.from(`concurrent-${index}`));
                    return AzureServiceBusMessageFactory.buildServiceBusMessageFromModelBindingData(mockData);
                })
            );

            // Act
            const results = await Promise.all(promises);

            // Assert
            expect(results).to.have.length(concurrentCalls);
            results.forEach((result) => {
                expect(result).to.have.property('messages');
                expect(result).to.have.property('actions');
            });
        });
    });

    describe('Error Scenarios and Edge Cases', () => {
        it('should propagate ServiceBusMessageDecoder errors with context', () => {
            // Arrange
            const decoderError = new Error('Invalid AMQP message format');
            serviceBusMessageDecoderStub.throws(decoderError);
            const mockModelBindingData = createMockModelBindingData();

            // Act & Assert
            expect(() =>
                AzureServiceBusMessageFactory.buildServiceBusMessageFromModelBindingData(mockModelBindingData)
            ).to.throw('Invalid AMQP message format');
        });

        it('should handle malformed message annotations gracefully', () => {
            // Arrange
            const mockAmqpMessage = createMockAmqpMessage({
                messageAnnotations: {
                    'x-opt-enqueued-time': 'invalid-date',
                    'x-opt-sequence-number': 'not-a-number',
                },
            });

            const lockToken = 'test-lock-token-amqp';

            // Act
            const result = AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromAmqp(
                mockAmqpMessage,
                lockToken
            );

            // Assert
            expect(result).to.have.property('enqueuedTimeUtc').that.is.a('date');
            expect(result).to.have.property('sequenceNumber');
            // Should handle invalid data gracefully without throwing
        });

        it('should handle extremely large message bodies', () => {
            // Arrange
            const largeBody = 'x'.repeat(1024 * 1024); // 1MB string
            const mockAmqpMessage = createMockAmqpMessage({ body: largeBody });

            const lockToken = 'test-lock-token-amqp';

            // Act
            const result = AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromAmqp(
                mockAmqpMessage,
                lockToken
            );

            // Assert
            expect(result).to.have.property('body', largeBody);
            expect(result.body).to.have.length(1024 * 1024);
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('input validation', () => {
        it('should return the original section when input is null', () => {
            const result = AzureServiceBusMessageFactory.decodeAmqpBody(null);
            expect(result).to.be.null;
        });

        it('should return the original section when input is undefined', () => {
            const result = AzureServiceBusMessageFactory.decodeAmqpBody(undefined);
            expect(result).to.be.undefined;
        });

        it('should return the original section when input is a primitive', () => {
            const result = AzureServiceBusMessageFactory.decodeAmqpBody('not an object');
            expect(result).to.equal('not an object');
        });

        it('should return the original section when typecode is missing', () => {
            const section = { content: Buffer.from('test') };
            const result = AzureServiceBusMessageFactory.decodeAmqpBody(section);
            expect(result).to.equal(section);
        });

        it('should return the original section when content is missing', () => {
            const section = { typecode: 117 };
            const result = AzureServiceBusMessageFactory.decodeAmqpBody(section);
            expect(result).to.equal(section);
        });

        it('should return the original section when typecode is not a number', () => {
            const section = { typecode: '117', content: Buffer.from('test') };
            const result = AzureServiceBusMessageFactory.decodeAmqpBody(section);
            expect(result).to.equal(section);
        });

        it('should return the original section when content is not a Buffer', () => {
            const section = { typecode: 117, content: 'not a buffer' };
            const result = AzureServiceBusMessageFactory.decodeAmqpBody(section);
            expect(result).to.equal(section);
        });
    });

    describe('binary content (typecode 117)', () => {
        it('should decode text/plain content as string', () => {
            const textContent = 'Hello, world!';
            const section = {
                typecode: 117,
                content: Buffer.from(textContent),
            };

            const result = AzureServiceBusMessageFactory.decodeAmqpBody(section, 'text/plain');

            expect(result).to.equal(textContent);
        });

        it('should decode application/xml content as string', () => {
            const xmlContent = '<root><item>value</item></root>';
            const section = {
                typecode: 117,
                content: Buffer.from(xmlContent),
            };

            const result = AzureServiceBusMessageFactory.decodeAmqpBody(section, 'application/xml');

            expect(result).to.equal(xmlContent);
        });

        it('should decode application/json content as parsed JSON', () => {
            const jsonObject = { name: 'test', value: 42 };
            const jsonContent = JSON.stringify(jsonObject);
            const section = {
                typecode: 117,
                content: Buffer.from(jsonContent),
            };

            const result = AzureServiceBusMessageFactory.decodeAmqpBody(section, 'application/json');

            expect(result).to.deep.equal(jsonObject);
        });

        it('should handle invalid JSON and return text for application/json content type', () => {
            const invalidJsonContent = '{ "name": "test", value: 42 }'; // Invalid JSON (missing quotes around value)
            const section = {
                typecode: 117,
                content: Buffer.from(invalidJsonContent),
            };

            const result = AzureServiceBusMessageFactory.decodeAmqpBody(section, 'application/json');

            expect(result).to.equal(invalidJsonContent);
        });

        it('should handle complex nested JSON objects', () => {
            const complexJson = {
                id: 'test',
                timestamp: '2023-01-01T00:00:00Z',
                data: {
                    items: [
                        { id: 1, name: 'item1' },
                        { id: 2, name: 'item2' },
                    ],
                    metadata: {
                        source: 'test',
                        version: '1.0.0',
                    },
                },
            };
            const section = {
                typecode: 117,
                content: Buffer.from(JSON.stringify(complexJson)),
            };

            const result = AzureServiceBusMessageFactory.decodeAmqpBody(section, 'application/json');

            expect(result).to.deep.equal(complexJson);
        });

        it('should decode unknown content types as string by default', () => {
            const content = 'some content';
            const section = {
                typecode: 117,
                content: Buffer.from(content),
            };

            const result = AzureServiceBusMessageFactory.decodeAmqpBody(section, 'application/unknown');

            expect(result).to.equal(content);
        });

        it('should handle content without a content type specified', () => {
            const content = 'test content';
            const section = {
                typecode: 117,
                content: Buffer.from(content),
            };

            const result = AzureServiceBusMessageFactory.decodeAmqpBody(section);

            expect(result).to.equal(content);
        });

        it('should correctly handle UTF-8 special characters', () => {
            const specialChars = 'Special chars: äöü éèê ñ 你好 👋';
            const section = {
                typecode: 117,
                content: Buffer.from(specialChars, 'utf8'),
            };

            const result = AzureServiceBusMessageFactory.decodeAmqpBody(section, 'text/plain');

            expect(result).to.equal(specialChars);
        });

        it('should handle empty content buffer', () => {
            const section = {
                typecode: 117,
                content: Buffer.alloc(0),
            };

            const result = AzureServiceBusMessageFactory.decodeAmqpBody(section, 'text/plain');

            expect(result).to.equal('');
        });
    });

    describe('non-binary content (typecode != 117)', () => {
        it('should return the raw content for non-binary typecodes', () => {
            const content = Buffer.from('test content');
            const section = {
                typecode: 118, // Not binary (117)
                content: content,
            };

            const result = AzureServiceBusMessageFactory.decodeAmqpBody(section, 'text/plain');

            expect(result).to.equal(content);
        });

        it('should handle typecode 0 correctly', () => {
            const content = Buffer.from('typecode 0 content');
            const section = {
                typecode: 0,
                content: content,
            };

            const result = AzureServiceBusMessageFactory.decodeAmqpBody(section, 'text/plain');

            expect(result).to.equal(content);
        });
    });

    describe('edge cases', () => {
        it('should handle very large content buffers', () => {
            // Create a large string (1MB)
            const largeString = 'a'.repeat(1024 * 1024);
            const section = {
                typecode: 117,
                content: Buffer.from(largeString),
            };

            const result = AzureServiceBusMessageFactory.decodeAmqpBody(section, 'text/plain');

            expect(result).to.have.lengthOf(1024 * 1024);
            expect(result).to.equal(largeString);
        });

        it('should handle binary data with zeros', () => {
            const binaryData = Buffer.from([0x00, 0x01, 0x02, 0x00, 0x03]);
            const section = {
                typecode: 117,
                content: binaryData,
            };

            const result = AzureServiceBusMessageFactory.decodeAmqpBody(section);

            // The result will be a string representation of the binary data
            expect(result).to.be.a('string');
        });

        it('should handle content type with charset parameter', () => {
            const content = 'Hello, world!';
            const section = {
                typecode: 117,
                content: Buffer.from(content),
            };

            const result = AzureServiceBusMessageFactory.decodeAmqpBody(section, 'text/plain; charset=utf-8');

            // The implementation ignores charset parameters, so it should still work
            expect(result).to.equal(content);
        });

        it('should handle enqueuedTimeUtc and lockedUntilUtc timestamps correctly', () => {
            // Arrange
            const enqueuedTime = Date.now();
            const lockedUntilTime = Date.now() + 60000; // 1 minute from now
            const mockAmqpMessage = createMockAmqpMessage({
                messageAnnotations: {
                    'x-opt-enqueued-time': enqueuedTime,
                    'x-opt-locked-until': lockedUntilTime,
                    'x-opt-sequence-number': 12345,
                },
            });

            const lockToken = 'test-lock-token-timestamps';

            // Act
            const result = AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromAmqp(
                mockAmqpMessage,
                lockToken
            );

            // Assert
            expect(result).to.have.property('enqueuedTimeUtc').that.is.a('date');
            expect(result.enqueuedTimeUtc?.getTime()).to.equal(enqueuedTime);
            expect(result).to.have.property('lockedUntilUtc').that.is.a('date');
            expect(result.lockedUntilUtc?.getTime()).to.equal(lockedUntilTime);
        });

        it('should handle missing timestamp annotations gracefully', () => {
            // Arrange
            const mockAmqpMessage = createMockAmqpMessage({
                messageAnnotations: {
                    // No timestamp annotations
                },
            });

            const lockToken = 'test-lock-token-no-timestamps';

            // Act
            const result = AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromAmqp(
                mockAmqpMessage,
                lockToken
            );

            // Assert
            expect(result).to.have.property('enqueuedTimeUtc').that.is.undefined;
            expect(result).to.have.property('lockedUntilUtc').that.is.undefined;
        });

        it('should handle string format for lockedUntilUtc annotation', () => {
            // Arrange
            const lockedUntilString = new Date(Date.now() + 30000).toISOString(); // 30 seconds from now
            const mockAmqpMessage = createMockAmqpMessage({
                messageAnnotations: {
                    'x-opt-locked-until': lockedUntilString,
                },
            });

            const lockToken = 'test-lock-token-string-locked-until';

            // Act
            const result = AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromAmqp(
                mockAmqpMessage,
                lockToken
            );

            // Assert
            expect(result).to.have.property('lockedUntilUtc').that.is.a('date');
            expect(result.lockedUntilUtc?.toISOString()).to.equal(lockedUntilString);
        });

        it('should handle enqueuedSequenceNumber and deadLetterSource annotations correctly', () => {
            // Arrange
            const enqueuedSeqNumber = 98765;
            const deadLetterSourceQueue = 'original-queue';
            const mockAmqpMessage = createMockAmqpMessage({
                messageAnnotations: {
                    'x-opt-offset': enqueuedSeqNumber,
                    'x-opt-deadletter-source': deadLetterSourceQueue,
                },
            });

            const lockToken = 'test-lock-token-additional-props';

            // Act
            const result = AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromAmqp(
                mockAmqpMessage,
                lockToken
            );

            // Assert
            expect(result).to.have.property('enqueuedSequenceNumber', enqueuedSeqNumber);
            expect(result).to.have.property('deadLetterSource', deadLetterSourceQueue);
        });

        it('should handle all AMQP annotations comprehensively', () => {
            // Arrange
            const enqueuedTime = Date.now();
            const lockedUntilTime = Date.now() + 60000;
            const sequenceNumber = 12345;
            const enqueuedSeqNumber = 67890;
            const deadLetterSourceQueue = 'source-queue';

            const mockAmqpMessage = createMockAmqpMessage({
                messageAnnotations: {
                    'x-opt-enqueued-time': enqueuedTime,
                    'x-opt-locked-until': lockedUntilTime,
                    'x-opt-sequence-number': sequenceNumber,
                    'x-opt-offset': enqueuedSeqNumber,
                    'x-opt-deadletter-source': deadLetterSourceQueue,
                },
                applicationProperties: {
                    DeadLetterReason: 'MaxDeliveryCountExceeded',
                    DeadLetterErrorDescription: 'Processing failed multiple times',
                },
            });

            const lockToken = 'test-lock-token-comprehensive';

            // Act
            const result = AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromAmqp(
                mockAmqpMessage,
                lockToken
            );

            // Assert - Verify all properties are correctly set
            expect(result).to.have.property('enqueuedTimeUtc').that.is.a('date');
            expect(result.enqueuedTimeUtc?.getTime()).to.equal(enqueuedTime);
            expect(result).to.have.property('lockedUntilUtc').that.is.a('date');
            expect(result.lockedUntilUtc?.getTime()).to.equal(lockedUntilTime);
            expect(result).to.have.property('sequenceNumber');
            expect(LongActual.isLong(result.sequenceNumber)).to.be.true;
            expect(result).to.have.property('enqueuedSequenceNumber', enqueuedSeqNumber);
            expect(result).to.have.property('deadLetterSource', deadLetterSourceQueue);
            expect(result).to.have.property('deadLetterReason', 'MaxDeliveryCountExceeded');
            expect(result).to.have.property('deadLetterErrorDescription', 'Processing failed multiple times');
            expect(result).to.have.property('lockToken', lockToken);
        });

        it('should handle Date objects in message annotations correctly', () => {
            // Arrange - This simulates the real-world scenario where Date objects are in messageAnnotations
            const enqueuedDate = new Date('2025-10-07T22:13:23.130Z');
            const lockedUntilDate = new Date('2025-10-07T22:14:30.039Z');
            const sequenceNumber = 155;

            const mockAmqpMessage = createMockAmqpMessage({
                messageAnnotations: {
                    'x-opt-enqueued-time': enqueuedDate, // Already Date objects
                    'x-opt-locked-until': lockedUntilDate, // Already Date objects
                    'x-opt-sequence-number': sequenceNumber,
                },
            });

            const lockToken = 'b8f86525-3908-432a-a2f8-b7063f535876';

            // Act
            const result = AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromAmqp(
                mockAmqpMessage,
                lockToken
            );

            // Assert - These should NOT be undefined anymore
            expect(result).to.have.property('enqueuedTimeUtc').that.is.a('date');
            expect(result.enqueuedTimeUtc?.toISOString()).to.equal(enqueuedDate.toISOString());
            expect(result).to.have.property('lockedUntilUtc').that.is.a('date');
            expect(result.lockedUntilUtc?.toISOString()).to.equal(lockedUntilDate.toISOString());
            expect(result).to.have.property('sequenceNumber');
            expect(LongActual.isLong(result.sequenceNumber)).to.be.true;
            expect(result.sequenceNumber?.toNumber()).to.equal(sequenceNumber);

            // enqueuedSequenceNumber should fallback to x-opt-sequence-number when x-opt-offset is not provided
            expect(result.enqueuedSequenceNumber).to.equal(sequenceNumber);
        });

        it('should handle enqueuedSequenceNumber when x-opt-offset annotation is present', () => {
            // Arrange - Test when x-opt-offset is actually provided
            const enqueuedSeqNumber = 42;
            const mockAmqpMessage = createMockAmqpMessage({
                messageAnnotations: {
                    'x-opt-offset': enqueuedSeqNumber, // This should populate enqueuedSequenceNumber
                    'x-opt-sequence-number': 155,
                },
            });

            const lockToken = 'test-lock-token-enqueued-seq';

            // Act
            const result = AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromAmqp(
                mockAmqpMessage,
                lockToken
            );

            // Assert - enqueuedSequenceNumber should now be populated
            expect(result).to.have.property('enqueuedSequenceNumber', enqueuedSeqNumber);
            expect(result.enqueuedSequenceNumber).to.be.a('number');
            expect(result).to.have.property('sequenceNumber');
            expect(result.sequenceNumber?.toNumber()).to.equal(155);
        });

        it('should validate all annotation mappings for debugging', () => {
            // Arrange - Comprehensive test to validate all annotation mappings
            const testAnnotations = {
                'x-opt-enqueued-time': new Date('2025-10-07T22:13:23.130Z'),
                'x-opt-locked-until': new Date('2025-10-07T22:14:30.039Z'),
                'x-opt-sequence-number': 155,
                'x-opt-offset': 98765, // This should be enqueuedSequenceNumber
                'x-opt-deadletter-source': 'original-queue',
            };

            const mockAmqpMessage = createMockAmqpMessage({
                messageAnnotations: testAnnotations,
                applicationProperties: {
                    DeadLetterReason: 'TestReason',
                    DeadLetterErrorDescription: 'TestDescription',
                },
            });

            const lockToken = 'test-lock-token-comprehensive-validation';

            // Act
            const result = AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromAmqp(
                mockAmqpMessage,
                lockToken
            );

            // Verify all mappings
            expect(result.enqueuedTimeUtc).to.be.a('date');
            expect(result.lockedUntilUtc).to.be.a('date');
            expect(result.sequenceNumber?.toNumber()).to.equal(155);
            expect(result.enqueuedSequenceNumber).to.equal(98765); // Should not be undefined!
            expect(result.deadLetterSource).to.equal('original-queue');
            expect(result.deadLetterReason).to.equal('TestReason');
            expect(result.deadLetterErrorDescription).to.equal('TestDescription');
        });

        it('should match real-world Service Bus message format exactly', () => {
            // Arrange - This exactly replicates the user's actual message structure
            const mockAmqpMessage = createMockAmqpMessage({
                header: { timeToLive: 1209600000 },
                messageAnnotations: {
                    'x-opt-enqueued-time': new Date('2025-10-07T22:13:23.130Z'),
                    'x-opt-sequence-number': 155,
                    'x-opt-locked-until': new Date('2025-10-07T22:14:30.039Z'),
                    // Note: NO 'x-opt-offset' annotation - this is why enqueuedSequenceNumber is undefined
                },
                properties: {
                    absoluteExpiryTime: 1761084810471,
                    creationTime: 1759875210471,
                    messageId: '0d5d0ae0b473475f9da34b55f65d9b4a',
                },
                body: {
                    typecode: 117,
                    content: Buffer.from('Tst 2'),
                },
            });

            const lockToken = 'b8f86525-3908-432a-a2f8-b7063f535876';

            // Act
            const result = AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromAmqp(
                mockAmqpMessage,
                lockToken
            );

            // Assert - This validates the exact behavior the user is experiencing
            expect(result.body).to.equal('Tst 2');
            expect(result.messageId).to.equal('0d5d0ae0b473475f9da34b55f65d9b4a');
            expect(result.timeToLive).to.equal(1209600000);
            expect(result.lockToken).to.equal(lockToken);

            // These should now be properly populated (was undefined before our fix)
            expect(result.enqueuedTimeUtc).to.be.a('date');
            expect(result.enqueuedTimeUtc?.toISOString()).to.equal('2025-10-07T22:13:23.130Z');
            expect(result.lockedUntilUtc).to.be.a('date');
            expect(result.lockedUntilUtc?.toISOString()).to.equal('2025-10-07T22:14:30.039Z');
            expect(result.sequenceNumber?.toNumber()).to.equal(155);

            // This now correctly falls back to x-opt-sequence-number when 'x-opt-offset' annotation is not present
            expect(result.enqueuedSequenceNumber).to.equal(155);

            // These are also correctly undefined because they're not in the real message
            expect(result.deadLetterSource).to.be.undefined;
            expect(result.deadLetterReason).to.be.undefined;
            expect(result.deadLetterErrorDescription).to.be.undefined;

            expect(result.state).to.equal('active');
        });

        it('should investigate x-opt-sequence-number vs enqueuedSequenceNumber mapping issue', () => {
            // Arrange - Testing user's scenario where they expect enqueuedSequenceNumber from x-opt-sequence-number
            const mockAmqpMessage = createMockAmqpMessage({
                messageAnnotations: {
                    'x-opt-sequence-number': 155,
                    // x-opt-offset is missing - but user expects enqueuedSequenceNumber to be populated
                },
            });

            const lockToken = 'test-lock-token';

            // Act
            const result = AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromAmqp(
                mockAmqpMessage,
                lockToken
            );

            // Assert - Current behavior based on Azure documentation
            console.log('=== AMQP ANNOTATION MAPPING DEBUG ===');
            console.log('Input AMQP messageAnnotations:', mockAmqpMessage.messageAnnotations);
            console.log('sequenceNumber (from x-opt-sequence-number):', result.sequenceNumber?.toNumber());
            console.log('enqueuedSequenceNumber (from x-opt-offset):', result.enqueuedSequenceNumber);

            // According to Azure docs: x-opt-sequence-number -> SequenceNumber
            expect(result.sequenceNumber?.toNumber()).to.equal(155);
            // Now with fallback: enqueuedSequenceNumber gets x-opt-sequence-number when x-opt-offset is missing
            expect(result.enqueuedSequenceNumber).to.equal(155);

            // BUT: If user's real AMQP message shows x-opt-sequence-number should map to enqueuedSequenceNumber,
            // then there might be a disconnect between documentation and reality
        });

        it('should fallback enqueuedSequenceNumber to x-opt-sequence-number when x-opt-offset is missing', () => {
            // Arrange - Test fallback mapping scenario (user's reported issue)
            const mockAmqpMessage = createMockAmqpMessage({
                messageAnnotations: {
                    'x-opt-sequence-number': 155,
                    // x-opt-offset is missing - enqueuedSequenceNumber should fallback to x-opt-sequence-number
                },
            });

            const lockToken = 'test-lock-token';

            // Act
            const result = AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromAmqp(
                mockAmqpMessage,
                lockToken
            );

            console.log('=== TESTING FALLBACK BEHAVIOR (FIXED) ===');
            console.log('User expectation: enqueuedSequenceNumber should have value 155');
            console.log('Fixed sequenceNumber:', result.sequenceNumber?.toNumber());
            console.log('Fixed enqueuedSequenceNumber:', result.enqueuedSequenceNumber);

            // After fix: Both should have the same value when x-opt-offset is missing
            expect(result.sequenceNumber?.toNumber()).to.equal(155);
            expect(result.enqueuedSequenceNumber).to.equal(155); // Now this should work!
        });

        it('should prioritize x-opt-offset over x-opt-sequence-number for enqueuedSequenceNumber when both exist', () => {
            // Arrange - Test priority when both annotations exist
            const mockAmqpMessage = createMockAmqpMessage({
                messageAnnotations: {
                    'x-opt-sequence-number': 155,
                    'x-opt-offset': 999, // This should take priority for enqueuedSequenceNumber
                },
            });

            const lockToken = 'test-lock-token';

            // Act
            const result = AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromAmqp(
                mockAmqpMessage,
                lockToken
            );

            console.log('=== TESTING PRIORITY BEHAVIOR ===');
            console.log('sequenceNumber (from x-opt-sequence-number):', result.sequenceNumber?.toNumber());
            console.log('enqueuedSequenceNumber (from x-opt-offset with priority):', result.enqueuedSequenceNumber);

            // x-opt-offset should take priority for enqueuedSequenceNumber
            expect(result.sequenceNumber?.toNumber()).to.equal(155);
            expect(result.enqueuedSequenceNumber).to.equal(999); // Should use x-opt-offset, not fallback
        });
    });
});
