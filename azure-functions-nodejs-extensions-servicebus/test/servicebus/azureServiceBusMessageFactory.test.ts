// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { AmqpAnnotatedMessage } from '@azure/core-amqp';
import { ModelBindingData } from '@azure/functions-extensions-base';
import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import rhea = require('rhea');
import LongActual from 'long';
import { AzureServiceBusMessageFactory } from '../../src/servicebus/azureServiceBusMessageFactory';
import { ServiceBusMessageActions } from '../../src/servicebus/ServiceBusMessageActions';
import { ServiceBusMessageDecoder } from '../../src/util/serviceBusMessageDecoder';
import { ServiceBusMessageManager } from '../../types';

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
            it('should build ServiceBusMessageManager from single ModelBindingData', () => {
                // Arrange
                const mockModelBindingData = createMockModelBindingData();
                const mockDecodedResult = createMockDecodedResult();
                serviceBusMessageDecoderStub.returns(mockDecodedResult);

                // Act
                const result =
                    AzureServiceBusMessageFactory.buildServiceBusMessageFromModelBindingData(mockModelBindingData);

                // Assert
                expect(result).to.be.an('object');
                expect(result).to.have.property('messages').that.is.an('object'); // Single message, not array
                expect(result).to.have.property('serviceBusMessageActions', serviceBusMessageActionsStub);
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
                expect(result.messages).to.have.property('messageId');
                expect(result.messages).to.have.property('lockToken', 'test-lock-123');
                expect(result.messages).to.have.property('body', 'test message body');
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
                    expect(result).to.have.property('serviceBusMessageActions');
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
            it('should build ServiceBusMessageManager from array of ModelBindingData', () => {
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
                expect(result).to.have.property('serviceBusMessageActions', serviceBusMessageActionsStub);
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
                expect(result).to.have.property('serviceBusMessageActions', serviceBusMessageActionsStub);
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
                expect(result.serviceBusMessageActions).to.equal(serviceBusMessageActionsStub);
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

        it('should handle AMQP message without optional properties', () => {
            // Arrange
            const minimalAmqpMessage: AmqpAnnotatedMessage = {
                body: 'minimal message',
            };

            // Act
            const result = AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromAmqp(minimalAmqpMessage);

            // Assert
            expect(result).to.have.property('body', 'minimal message');
            expect(result).to.have.property('messageId', undefined);
            expect(result).to.have.property('applicationProperties').that.deep.equals({});
            expect(result).to.have.property('deliveryCount', 0);
            expect(result).to.have.property('state', 'active');
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

            // Act
            const result = AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromAmqp(mockAmqpMessage);

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

            // Act
            const result = AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromAmqp(mockAmqpMessage);

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

            // Act
            const result = AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromAmqp(mockAmqpMessage);

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

            // Act
            const result = AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromAmqp(mockAmqpMessage);

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

                // Act
                const result = AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromAmqp(mockAmqpMessage);

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

        it('should handle Rhea message without lock token', () => {
            // Arrange
            const mockRheaMessage = createMockRheaMessage();
            const mockAmqpMessage = createMockAmqpMessage();
            amqpAnnotatedMessageStub.returns(mockAmqpMessage);

            // Act
            const result = AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromRhea(mockRheaMessage);

            // Assert
            expect(result).to.have.property('lockToken', undefined);
            expect(amqpAnnotatedMessageStub).to.have.been.calledOnceWith(mockRheaMessage);
        });

        it('should handle AmqpAnnotatedMessage.fromRheaMessage errors', () => {
            // Arrange
            const mockRheaMessage = createMockRheaMessage();
            amqpAnnotatedMessageStub.throws(new Error('AMQP conversion failed'));

            // Act & Assert
            expect(() =>
                AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromRhea(mockRheaMessage)
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

            // Act
            const result = AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromRhea(complexRheaMessage);

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
            expect(result).to.satisfy((manager: ServiceBusMessageManager) => {
                return typeof manager.messages === 'object' && typeof manager.serviceBusMessageActions === 'object';
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
                expect(result).to.have.property('serviceBusMessageActions');
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

            // Act
            const result = AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromAmqp(mockAmqpMessage);

            // Assert
            expect(result).to.have.property('enqueuedTimeUtc').that.is.a('date');
            expect(result).to.have.property('sequenceNumber');
            // Should handle invalid data gracefully without throwing
        });

        it('should handle extremely large message bodies', () => {
            // Arrange
            const largeBody = 'x'.repeat(1024 * 1024); // 1MB string
            const mockAmqpMessage = createMockAmqpMessage({ body: largeBody });

            // Act
            const result = AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromAmqp(mockAmqpMessage);

            // Assert
            expect(result).to.have.property('body', largeBody);
            expect(result.body).to.have.length(1024 * 1024);
        });
    });
});
