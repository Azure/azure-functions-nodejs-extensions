// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { ServiceBusReceivedMessage } from '@azure/service-bus';
import * as grpc from '@grpc/grpc-js';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Long from 'long';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import * as createGrpcClientModule from '../../src/grpcClientFactory';
import { ServiceBusMessageActions } from '../../src/servicebus/ServiceBusMessageActions';
import { GrpcUriBuilder } from '../../src/util/grpcUriBuilder';
import { CompleteRequest, RenewSessionLockResponse, SettlementServiceClient } from '../../types/settlement-types';

// Configure chai with sinon-chai and chai-as-promised
chai.use(sinonChai);
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
chai.use(chaiAsPromised);

describe('ServiceBusMessageActions', () => {
    let grpcUriBuilderStub: sinon.SinonStub;
    let createGrpcClientStub: sinon.SinonStub;
    let mockGrpcClient: sinon.SinonStubbedInstance<SettlementServiceClient>;

    // Mock configuration
    const mockUri = 'localhost:50051';
    const mockGrpcMaxMessageLength = 4194304;

    // Mock Service Bus message
    const createMockMessage = (lockToken?: string): ServiceBusReceivedMessage =>
        ({
            lockToken: lockToken || '12345678-1234-1234-1234-123456789abc',
            body: 'test message',
            messageId: 'test-message-id',
            partitionKey: null,
            viaPartitionKey: null,
            sessionId: null,
            replyTo: null,
            replyToSessionId: null,
            timeToLive: 60000,
            label: null,
            to: null,
            contentType: null,
            correlationId: null,
            subject: null,
            applicationProperties: {},
            enqueuedTimeUtc: new Date(),
            scheduledEnqueueTimeUtc: null,
            sequenceNumber: Long.fromNumber(1),
            deliveryCount: 0,
            enqueuedSequenceNumber: Long.fromNumber(1),
            deadLetterSource: null,
            state: 'active',
            deadLetterReason: null,
            deadLetterErrorDescription: null,
            _rawAmqpMessage: {},
        } as unknown as ServiceBusReceivedMessage);

    const createMockMessageWithNullLockToken = (lockToken?: string): ServiceBusReceivedMessage =>
        ({
            lockToken: lockToken,
            body: 'test message',
            messageId: 'test-message-id',
            partitionKey: null,
            viaPartitionKey: null,
            sessionId: null,
            replyTo: null,
            replyToSessionId: null,
            timeToLive: 60000,
            label: null,
            to: null,
            contentType: null,
            correlationId: null,
            subject: null,
            applicationProperties: {},
            enqueuedTimeUtc: new Date(),
            scheduledEnqueueTimeUtc: null,
            sequenceNumber: Long.fromNumber(1),
            deliveryCount: 0,
            enqueuedSequenceNumber: Long.fromNumber(1),
            deadLetterSource: null,
            state: 'active',
            deadLetterReason: null,
            deadLetterErrorDescription: null,
            _rawAmqpMessage: {},
        } as unknown as ServiceBusReceivedMessage);

    beforeEach(() => {
        // Reset singleton to ensure stubs are used in each test
        if (typeof ServiceBusMessageActions.resetInstance === 'function') {
            ServiceBusMessageActions.resetInstance();
        }

        // Create mock gRPC client
        mockGrpcClient = {
            complete: sinon.stub(),
            abandon: sinon.stub(),
            deadletter: sinon.stub(),
            defer: sinon.stub(),
            renewMessageLock: sinon.stub(),
            setSessionState: sinon.stub(),
            releaseSession: sinon.stub(),
            renewSessionLock: sinon.stub(),
        } as sinon.SinonStubbedInstance<SettlementServiceClient>;

        // Stub GrpcUriBuilder
        grpcUriBuilderStub = sinon.stub(GrpcUriBuilder, 'build').returns({
            uri: mockUri,
            grpcMaxMessageLength: mockGrpcMaxMessageLength,
        });

        // Stub createGrpcClient - only do this once
        createGrpcClientStub = sinon.stub(createGrpcClientModule, 'createGrpcClient').returns(mockGrpcClient);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('Singleton Pattern', () => {
        it('should create a singleton instance', () => {
            const instance1 = ServiceBusMessageActions.getInstance();
            const instance2 = ServiceBusMessageActions.getInstance();

            expect(instance1).to.equal(instance2);
            expect(grpcUriBuilderStub).to.have.been.calledOnce;
            expect(createGrpcClientStub).to.have.been.calledOnce;
        });

        it('should initialize with correct gRPC configuration', () => {
            ServiceBusMessageActions.getInstance();

            expect(grpcUriBuilderStub).to.have.been.calledOnce;
            expect(createGrpcClientStub).to.have.been.calledOnceWith({
                serviceName: 'Settlement',
                address: mockUri,
                credentials: sinon.match.instanceOf(grpc.ChannelCredentials),
                grpcMaxMessageLength: mockGrpcMaxMessageLength,
            });
        });

        it('should handle GrpcUriBuilder initialization errors', () => {
            grpcUriBuilderStub.throws(new Error('Configuration failed'));

            expect(() => ServiceBusMessageActions.getInstance()).to.throw('Configuration failed');
        });

        it('should handle gRPC client creation errors', () => {
            createGrpcClientStub.throws(new Error('gRPC client creation failed'));

            expect(() => ServiceBusMessageActions.getInstance()).to.throw('gRPC client creation failed');
        });

        it('should cache the instance across multiple calls', () => {
            const instance1 = ServiceBusMessageActions.getInstance();
            const instance2 = ServiceBusMessageActions.getInstance();
            const instance3 = ServiceBusMessageActions.getInstance();

            expect(instance1).to.equal(instance2);
            expect(instance2).to.equal(instance3);
            expect(grpcUriBuilderStub).to.have.been.calledOnce;
            expect(createGrpcClientStub).to.have.been.calledOnce;
        });
    });

    describe('complete() method', () => {
        let serviceActions: ServiceBusMessageActions;

        beforeEach(() => {
            serviceActions = ServiceBusMessageActions.getInstance();
        });

        it('should complete a message successfully', async () => {
            mockGrpcClient.complete.callsArgWith(1, null);
            const message = createMockMessage();

            await serviceActions.complete(message);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockGrpcClient.complete).to.have.been.calledOnceWith(
                sinon.match({ locktoken: message.lockToken }),
                sinon.match((fn: (...args: any[]) => any) => typeof fn === 'function')
            );
        });

        it('should throw error when lockToken is missing', async () => {
            const message = { ...createMockMessage(), lockToken: undefined };

            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            await expect(serviceActions.complete(message)).to.be.rejectedWith(
                'ArgumentException: lockToken is required in ServiceBusReceivedMessage.'
            );

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockGrpcClient.complete).to.not.have.been.called;
        });

        it('should handle gRPC errors properly', async () => {
            const grpcError = new Error('gRPC complete failed') as grpc.ServiceError;
            grpcError.code = grpc.status.INTERNAL;
            grpcError.details = 'Internal server error';

            mockGrpcClient.complete.callsArgWith(1, grpcError);
            const message = createMockMessage();

            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            await expect(serviceActions.complete(message)).to.be.rejectedWith(grpcError);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockGrpcClient.complete).to.have.been.calledOnce;
        });

        it('should use correct request format', async () => {
            mockGrpcClient.complete.callsArgWith(1, null);
            const message = createMockMessage('test-lock-token-123');

            await serviceActions.complete(message);

            const expectedRequest: CompleteRequest = { locktoken: 'test-lock-token-123' };
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockGrpcClient.complete).to.have.been.calledWith(sinon.match(expectedRequest), sinon.match.func);
        });
    });

    describe('abandon() method', () => {
        let serviceActions: ServiceBusMessageActions;

        beforeEach(() => {
            serviceActions = ServiceBusMessageActions.getInstance();
        });

        it('should abandon a message successfully', async () => {
            mockGrpcClient.abandon.callsArgWith(1, null);
            const message = createMockMessage();

            await serviceActions.abandon(message);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockGrpcClient.abandon).to.have.been.calledOnceWith(
                sinon.match({
                    locktoken: message.lockToken,
                    propertiesToModify: sinon.match.instanceOf(Uint8Array),
                }),
                sinon.match.func
            );
        });

        it('should abandon a message with custom properties', async () => {
            mockGrpcClient.abandon.callsArgWith(1, null);
            const message = createMockMessage();
            const customProperties = {
                '0': 1,
                '1': 2,
                '2': 3,
            };

            await serviceActions.abandon(message, customProperties);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockGrpcClient.abandon).to.have.been.calledOnceWith(
                sinon.match({
                    locktoken: message.lockToken,
                    propertiesToModify: sinon.match.instanceOf(Uint8Array),
                }),
                sinon.match.func
            );
        });

        it('should throw error when lockToken is missing', async () => {
            const message = { ...createMockMessage(), lockToken: undefined };

            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            await expect(serviceActions.abandon(message)).to.be.rejectedWith(
                'ArgumentException: lockToken is required in ServiceBusReceivedMessage.'
            );

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockGrpcClient.abandon).to.not.have.been.called;
        });

        it('should handle gRPC errors properly', async () => {
            const grpcError = new Error('gRPC abandon failed') as grpc.ServiceError;
            grpcError.code = grpc.status.UNAVAILABLE;

            mockGrpcClient.abandon.callsArgWith(1, grpcError);
            const message = createMockMessage();

            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            await expect(serviceActions.abandon(message)).to.be.rejectedWith(grpcError);
        });
    });

    describe('deadletter() method', () => {
        let serviceActions: ServiceBusMessageActions;

        beforeEach(() => {
            serviceActions = ServiceBusMessageActions.getInstance();
        });

        it('should deadletter a message successfully', async () => {
            mockGrpcClient.deadletter.callsArgWith(1, null);
            const message = createMockMessage();

            await serviceActions.deadletter(message);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockGrpcClient.deadletter).to.have.been.calledOnceWith(
                sinon.match({
                    locktoken: message.lockToken,
                    propertiesToModify: sinon.match.instanceOf(Uint8Array),
                }),
                sinon.match.func
            );
        });

        it('should deadletter a message with custom parameters', async () => {
            mockGrpcClient.deadletter.callsArgWith(1, null);
            const message = createMockMessage();
            const customProperties = {
                '0': 4,
                '1': 5,
                '2': 6,
            };
            const reason = 'Processing failed';
            const errorDescription = 'Invalid message format';

            await serviceActions.deadletter(message, customProperties, reason, errorDescription);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockGrpcClient.deadletter).to.have.been.calledOnceWith(
                sinon.match({
                    locktoken: message.lockToken,
                    propertiesToModify: sinon.match.instanceOf(Uint8Array),
                    deadletterReason: { value: reason },
                    deadletterErrorDescription: { value: errorDescription },
                }),
                sinon.match.func
            );
        });

        it('should throw error when lockToken is missing', async () => {
            const message = { ...createMockMessage(), lockToken: undefined };

            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            await expect(serviceActions.deadletter(message)).to.be.rejectedWith(
                'ArgumentException: lockToken is required in ServiceBusReceivedMessage.'
            );

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockGrpcClient.deadletter).to.not.have.been.called;
        });

        it('should handle gRPC errors properly', async () => {
            const grpcError = new Error('gRPC deadletter failed') as grpc.ServiceError;
            grpcError.code = grpc.status.PERMISSION_DENIED;

            mockGrpcClient.deadletter.callsArgWith(1, grpcError);
            const message = createMockMessage();

            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            await expect(serviceActions.deadletter(message)).to.be.rejectedWith(grpcError);
        });
    });

    describe('defer() method', () => {
        let serviceActions: ServiceBusMessageActions;

        beforeEach(() => {
            serviceActions = ServiceBusMessageActions.getInstance();
        });

        it('should defer a message successfully', async () => {
            mockGrpcClient.defer.callsArgWith(1, null);
            const message = createMockMessage();

            await serviceActions.defer(message);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockGrpcClient.defer).to.have.been.calledOnceWith(
                sinon.match({
                    locktoken: message.lockToken,
                    propertiesToModify: sinon.match.instanceOf(Uint8Array),
                }),
                sinon.match.func
            );
        });

        it('should defer a message with custom properties', async () => {
            mockGrpcClient.defer.callsArgWith(1, null);
            const message = createMockMessage();
            const customProperties = {
                '0': 7,
                '1': 8,
                '2': 9,
            };

            await serviceActions.defer(message, customProperties);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockGrpcClient.defer).to.have.been.calledOnceWith(
                sinon.match({
                    locktoken: message.lockToken,
                    propertiesToModify: sinon.match.instanceOf(Uint8Array),
                }),
                sinon.match.func
            );
        });

        it('should throw error when lockToken is missing', async () => {
            const message = { ...createMockMessage(), lockToken: undefined };

            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            await expect(serviceActions.defer(message)).to.be.rejectedWith(
                'ArgumentException: lockToken is required in ServiceBusReceivedMessage.'
            );

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockGrpcClient.defer).to.not.have.been.called;
        });
    });

    describe('renewMessageLock() method', () => {
        let serviceActions: ServiceBusMessageActions;

        beforeEach(() => {
            serviceActions = ServiceBusMessageActions.getInstance();
        });

        it('should renew message lock successfully', async () => {
            mockGrpcClient.renewMessageLock.callsArgWith(1, null);
            const message = createMockMessage();

            await serviceActions.renewMessageLock(message);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockGrpcClient.renewMessageLock).to.have.been.calledOnceWith(
                sinon.match({ locktoken: message.lockToken }),
                sinon.match.func
            );
        });

        it('should throw error when lockToken is missing', async () => {
            const message = { ...createMockMessage(), lockToken: undefined };

            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            await expect(serviceActions.renewMessageLock(message)).to.be.rejectedWith(
                'ArgumentException: lockToken is required in ServiceBusReceivedMessage.'
            );

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockGrpcClient.renewMessageLock).to.not.have.been.called;
        });

        it('should handle gRPC errors properly', async () => {
            const grpcError = new Error('gRPC renew lock failed') as grpc.ServiceError;
            grpcError.code = grpc.status.DEADLINE_EXCEEDED;

            mockGrpcClient.renewMessageLock.callsArgWith(1, grpcError);
            const message = createMockMessage();

            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            await expect(serviceActions.renewMessageLock(message)).to.be.rejectedWith(grpcError);
        });
    });

    describe('setSessionState() method', () => {
        let serviceActions: ServiceBusMessageActions;

        beforeEach(() => {
            serviceActions = ServiceBusMessageActions.getInstance();
        });

        it('should set session state successfully', async () => {
            mockGrpcClient.setSessionState.callsArgWith(1, null);
            const sessionId = 'test-session-123';
            const sessionState = new Uint8Array([10, 11, 12]);

            await serviceActions.setSessionState(sessionId, sessionState);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockGrpcClient.setSessionState).to.have.been.calledOnceWith(
                sinon.match({ sessionId, sessionState }),
                sinon.match.func
            );
        });

        it('should handle gRPC errors properly', async () => {
            const grpcError = new Error('gRPC set session state failed') as grpc.ServiceError;
            grpcError.code = grpc.status.NOT_FOUND;

            mockGrpcClient.setSessionState.callsArgWith(1, grpcError);
            const sessionId = 'test-session-123';
            const sessionState = new Uint8Array([10, 11, 12]);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            await expect(serviceActions.setSessionState(sessionId, sessionState)).to.be.rejectedWith(grpcError);
        });
    });

    describe('releaseSession() method', () => {
        let serviceActions: ServiceBusMessageActions;

        beforeEach(() => {
            serviceActions = ServiceBusMessageActions.getInstance();
        });

        it('should release session successfully', async () => {
            mockGrpcClient.releaseSession.callsArgWith(1, null);
            const sessionId = 'test-session-456';

            await serviceActions.releaseSession(sessionId);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockGrpcClient.releaseSession).to.have.been.calledOnceWith(
                sinon.match({ sessionId }),
                sinon.match.func
            );
        });

        it('should handle gRPC errors properly', async () => {
            const grpcError = new Error('gRPC release session failed') as grpc.ServiceError;
            grpcError.code = grpc.status.FAILED_PRECONDITION;

            mockGrpcClient.releaseSession.callsArgWith(1, grpcError);
            const sessionId = 'test-session-456';

            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            await expect(serviceActions.releaseSession(sessionId)).to.be.rejectedWith(grpcError);
        });
    });

    describe('renewSessionLock() method', () => {
        let serviceActions: ServiceBusMessageActions;

        beforeEach(() => {
            serviceActions = ServiceBusMessageActions.getInstance();
        });

        it('should renew session lock successfully and return locked until date', async () => {
            const lockedUntil = new Date('2024-01-01T12:00:00Z');
            const response: RenewSessionLockResponse = { lockedUntil };

            mockGrpcClient.renewSessionLock.callsArgWith(1, null, response);
            const sessionId = 'test-session-789';

            const result = await serviceActions.renewSessionLock(sessionId);

            expect(result).to.equal(lockedUntil);
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockGrpcClient.renewSessionLock).to.have.been.calledOnceWith(
                sinon.match({ sessionId }),
                sinon.match.func
            );
        });

        it('should handle missing response', async () => {
            mockGrpcClient.renewSessionLock.callsArgWith(1, null, undefined);
            const sessionId = 'test-session-789';

            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            await expect(serviceActions.renewSessionLock(sessionId)).to.be.rejectedWith(
                'No response or lockedUntil returned from renewSessionLock'
            );
        });

        it('should handle missing lockedUntil in response', async () => {
            // Assign a valid Date, but simulate missing lockedUntil by omitting the property
            const response = {} as RenewSessionLockResponse;
            mockGrpcClient.renewSessionLock.callsArgWith(1, null, response);
            const sessionId = 'test-session-789';

            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            await expect(serviceActions.renewSessionLock(sessionId)).to.be.rejectedWith(
                'No response or lockedUntil returned from renewSessionLock'
            );
        });

        it('should handle gRPC errors properly', async () => {
            const grpcError = new Error('gRPC renew session lock failed') as grpc.ServiceError;
            grpcError.code = grpc.status.RESOURCE_EXHAUSTED;

            mockGrpcClient.renewSessionLock.callsArgWith(1, grpcError);
            const sessionId = 'test-session-789';

            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            await expect(serviceActions.renewSessionLock(sessionId)).to.be.rejectedWith(grpcError);
        });
    });

    describe('Error Handling and Edge Cases', () => {
        let serviceActions: ServiceBusMessageActions;

        beforeEach(() => {
            serviceActions = ServiceBusMessageActions.getInstance();
        });

        it('should handle concurrent access to singleton', () => {
            const instances = Array.from({ length: 10 }, () => ServiceBusMessageActions.getInstance());

            // All instances should be the same reference
            instances.forEach((instance) => {
                expect(instance).to.equal(instances[0]);
            });

            // Should only initialize once
            expect(grpcUriBuilderStub).to.have.been.calledOnce;
            expect(createGrpcClientStub).to.have.been.calledOnce;
        });

        it('should handle various gRPC error codes', async () => {
            const errorCodes = [
                grpc.status.CANCELLED,
                grpc.status.UNKNOWN,
                grpc.status.INVALID_ARGUMENT,
                grpc.status.DEADLINE_EXCEEDED,
                grpc.status.NOT_FOUND,
                grpc.status.ALREADY_EXISTS,
                grpc.status.PERMISSION_DENIED,
                grpc.status.RESOURCE_EXHAUSTED,
                grpc.status.FAILED_PRECONDITION,
                grpc.status.ABORTED,
                grpc.status.OUT_OF_RANGE,
                grpc.status.UNIMPLEMENTED,
                grpc.status.INTERNAL,
                grpc.status.UNAVAILABLE,
                grpc.status.DATA_LOSS,
                grpc.status.UNAUTHENTICATED,
            ];

            const message = createMockMessage();

            for (const errorCode of errorCodes) {
                const grpcError = new Error(`gRPC error ${errorCode}`) as grpc.ServiceError;
                grpcError.code = errorCode;
                grpcError.details = `Error details for ${errorCode}`;

                mockGrpcClient.complete.callsArgWith(1, grpcError);

                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                await expect(serviceActions.complete(message)).to.be.rejectedWith(grpcError);
            }
        });

        it('should handle empty and null lock tokens', async () => {
            const testCases: { lockToken: string | null | undefined; description: string }[] = [
                { lockToken: '', description: 'empty string' },
                { lockToken: null, description: 'null' },
                { lockToken: undefined, description: 'undefined' },
            ];

            for (const testCase of testCases) {
                const message = createMockMessageWithNullLockToken(testCase.lockToken as string | undefined);

                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                await expect(serviceActions.complete(message)).to.be.rejectedWith(
                    'ArgumentException: lockToken is required in ServiceBusReceivedMessage.'
                );
            }
        });

        it('should handle large message properties', async () => {
            mockGrpcClient.abandon.callsArgWith(1, null);
            const message = createMockMessage();
            // Create a large properties object (100 properties for testing)
            const largeProperties: Record<string, number> = {};
            for (let i = 0; i < 100; i++) {
                largeProperties[i.toString()] = 42;
            }

            await serviceActions.abandon(message, largeProperties);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockGrpcClient.abandon).to.have.been.calledOnceWith(
                sinon.match({
                    locktoken: message.lockToken,
                    propertiesToModify: sinon.match.instanceOf(Uint8Array),
                }),
                sinon.match.func
            );
        });
    });

    describe('Integration with Dependencies', () => {
        it('should pass correct parameters to createGrpcClient', () => {
            ServiceBusMessageActions.getInstance();

            expect(createGrpcClientStub).to.have.been.calledOnceWith(
                sinon.match({
                    serviceName: 'Settlement',
                    address: mockUri,
                    credentials: sinon.match.instanceOf(grpc.ChannelCredentials),
                    grpcMaxMessageLength: mockGrpcMaxMessageLength,
                })
            );
        });

        it('should use insecure credentials by default', () => {
            ServiceBusMessageActions.getInstance();

            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const callArgs = createGrpcClientStub.getCall(0).args[0];
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            expect(callArgs.credentials).to.be.instanceOf(grpc.ChannelCredentials);
        });

        it('should handle GrpcUriBuilder configuration variations', () => {
            grpcUriBuilderStub.returns({
                uri: 'https://custom-endpoint:443',
                grpcMaxMessageLength: 8388608, // 8MB
            });

            ServiceBusMessageActions.resetInstance();
            ServiceBusMessageActions.getInstance();

            expect(createGrpcClientStub).to.have.been.calledWith(
                sinon.match({
                    serviceName: 'Settlement',
                    address: 'https://custom-endpoint:443',
                    grpcMaxMessageLength: 8388608,
                })
            );
        });
    });

    describe('Memory Management and Performance', () => {
        it('should reuse the same instance for memory efficiency', () => {
            const instances = [];

            // Create multiple instances
            for (let i = 0; i < 100; i++) {
                instances.push(ServiceBusMessageActions.getInstance());
            }

            // All should be the same reference
            const firstInstance = instances[0];
            instances.forEach((instance) => {
                expect(instance).to.equal(firstInstance);
            });

            // Should only create gRPC client once
            expect(createGrpcClientStub).to.have.been.calledOnce;
        });

        it('should handle rapid successive calls efficiently', async () => {
            const serviceActions = ServiceBusMessageActions.getInstance();
            const message = createMockMessage();

            mockGrpcClient.complete.callsArgWith(1, null);

            // Execute multiple operations rapidly
            const promises = [];
            for (let i = 0; i < 50; i++) {
                promises.push(serviceActions.complete(message));
            }

            await Promise.all(promises);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockGrpcClient.complete).to.have.callCount(50);
        });
    });
});
