// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { ServiceBusReceivedMessage } from '@azure/service-bus';
import * as grpc from '@grpc/grpc-js';
import {
    AbandonRequest,
    CompleteRequest,
    DeadletterRequest,
    DeferRequest,
    IServiceBusMessageActions,
    ReleaseSessionRequest,
    RenewMessageLockRequest,
    RenewSessionLockRequest,
    RenewSessionLockResponse,
    SetSessionStateRequest,
    SettlementServiceClient,
} from '../../types/settlement-types';
import { createGrpcClient } from '../grpcClientFactory';
import { GrpcUriBuilder } from '../util/grpcUriBuilder';

// Using the original proto-loader approach with better path resolution

// Client implementation with Promise-based methods
export class ServiceBusMessageActions implements IServiceBusMessageActions {
    private static instance: ServiceBusMessageActions | null = null;
    private client: SettlementServiceClient;

    private constructor() {
        const { uri, grpcMaxMessageLength } = GrpcUriBuilder.build();
        this.client = createGrpcClient<SettlementServiceClient>({
            serviceName: 'Settlement',
            address: uri,
            credentials: grpc.credentials.createInsecure(),
            grpcMaxMessageLength,
        });
    }

    static getInstance(): ServiceBusMessageActions {
        if (!ServiceBusMessageActions.instance) {
            ServiceBusMessageActions.instance = new ServiceBusMessageActions();
        }
        return ServiceBusMessageActions.instance;
    }

    // Add this private helper method to the ServiceBusMessageActions class
    private validateLockToken(message: ServiceBusReceivedMessage): string {
        const locktoken = message.lockToken;
        if (!locktoken) {
            throw new Error('ArgumentException: lockToken is required in ServiceBusReceivedMessage.');
        }
        return locktoken;
    }

    /**
     * Completes (settles) the specified message, removing it from the queue or subscription.
     *
     * @param message - The received Service Bus message to complete.
     * @returns A promise that resolves when the operation is successful.
     * @throws Error if the lockToken is missing or the gRPC call fails.
     */
    async complete(message: ServiceBusReceivedMessage): Promise<void> {
        const locktoken = this.validateLockToken(message);
        return new Promise((resolve, reject) => {
            const request: CompleteRequest = { locktoken };
            this.client.complete(request, (error: grpc.ServiceError | null) => {
                if (error) {
                    console.error('Complete request failed:', {
                        code: error.code,
                        message: error.message,
                        details: error.details,
                    });
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Abandons the specified message, making it available again for processing.
     *
     * @param message - The received Service Bus message to abandon.
     * @param propertiesToModify - Optional properties to modify on the message.
     * @returns A promise that resolves when the operation is successful.
     * @throws Error if the lockToken is missing or the gRPC call fails.
     */
    async abandon(message: ServiceBusReceivedMessage, propertiesToModify?: Uint8Array): Promise<void> {
        const locktoken = this.validateLockToken(message);
        return new Promise((resolve, reject) => {
            const request: AbandonRequest = {
                locktoken,
                propertiesToModify: propertiesToModify || new Uint8Array(),
            };

            this.client.abandon(request, (error: grpc.ServiceError | null) => {
                if (error) {
                    console.error('Abandon request failed:', {
                        code: error.code,
                        message: error.message,
                        details: error.details,
                    });
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Deadletters the specified message, moving it to the dead-letter queue.
     *
     * @param message - The received Service Bus message to deadletter.
     * @param propertiesToModify - Optional properties to modify on the message.
     * @param deadletterReason - Optional reason for deadlettering the message.
     * @param deadletterErrorDescription - Optional error description for deadlettering.
     * @returns A promise that resolves when the operation is successful.
     * @throws Error if the lockToken is missing or the gRPC call fails.
     */
    async deadletter(
        message: ServiceBusReceivedMessage,
        propertiesToModify?: Uint8Array,
        deadletterReason?: string,
        deadletterErrorDescription?: string
    ): Promise<void> {
        const locktoken = this.validateLockToken(message);
        return new Promise((resolve, reject) => {
            const request: DeadletterRequest = {
                locktoken,
                propertiesToModify: propertiesToModify || new Uint8Array(),
                deadletterReason,
                deadletterErrorDescription,
            };

            this.client.deadletter(request, (error: grpc.ServiceError | null) => {
                if (error) {
                    console.error('Deadletter request failed:', {
                        code: error.code,
                        message: error.message,
                        details: error.details,
                    });
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Defers the specified message, making it invisible until retrieved by sequence number.
     *
     * @param message - The received Service Bus message to defer.
     * @param propertiesToModify - Optional properties to modify on the message.
     * @returns A promise that resolves when the operation is successful.
     * @throws Error if the lockToken is missing or the gRPC call fails.
     */
    async defer(message: ServiceBusReceivedMessage, propertiesToModify?: Uint8Array): Promise<void> {
        const locktoken = this.validateLockToken(message);
        return new Promise((resolve, reject) => {
            const request: DeferRequest = {
                locktoken,
                propertiesToModify: propertiesToModify || new Uint8Array(),
            };

            this.client.defer(request, (error: grpc.ServiceError | null) => {
                if (error) {
                    console.error('Defer request failed:', {
                        code: error.code,
                        message: error.message,
                        details: error.details,
                    });
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Renews the lock on the specified message, extending its lock duration.
     *
     * @param message - The received Service Bus message whose lock should be renewed.
     * @returns A promise that resolves when the operation is successful.
     * @throws Error if the lockToken is missing or the gRPC call fails.
     */
    async renewMessageLock(message: ServiceBusReceivedMessage): Promise<void> {
        const locktoken = this.validateLockToken(message);
        return new Promise((resolve, reject) => {
            const request: RenewMessageLockRequest = { locktoken };

            this.client.renewMessageLock(request, (error: grpc.ServiceError | null) => {
                if (error) {
                    console.error('RenewMessageLock request failed:', {
                        code: error.code,
                        message: error.message,
                        details: error.details,
                    });
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Sets the state for the specified session.
     *
     * @param sessionId - The session ID for which to set the state.
     * @param sessionState - The state to set for the session.
     * @returns A promise that resolves when the operation is successful.
     * @throws Error if the gRPC call fails.
     */
    async setSessionState(sessionId: string, sessionState: Uint8Array): Promise<void> {
        return new Promise((resolve, reject) => {
            const request: SetSessionStateRequest = { sessionId, sessionState };

            this.client.setSessionState(request, (error: grpc.ServiceError | null) => {
                if (error) {
                    console.error('SetSessionState request failed:', {
                        code: error.code,
                        message: error.message,
                        details: error.details,
                    });
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Releases the specified session, making it available for other receivers.
     *
     * @param sessionId - The session ID to release.
     * @returns A promise that resolves when the operation is successful.
     * @throws Error if the gRPC call fails.
     */
    async releaseSession(sessionId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const request: ReleaseSessionRequest = { sessionId };

            this.client.releaseSession(request, (error: grpc.ServiceError | null) => {
                if (error) {
                    console.error('ReleaseSession request failed:', {
                        code: error.code,
                        message: error.message,
                        details: error.details,
                    });
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Renews the lock on the specified session, extending its lock duration.
     *
     * @param sessionId - The session ID whose lock should be renewed.
     * @returns A promise that resolves to the new locked-until date.
     * @throws Error if the gRPC call fails or if no response is returned.
     */
    async renewSessionLock(sessionId: string): Promise<Date> {
        return new Promise((resolve, reject) => {
            const request: RenewSessionLockRequest = { sessionId };

            this.client.renewSessionLock(
                request,
                (error: grpc.ServiceError | null, response?: RenewSessionLockResponse) => {
                    if (error) {
                        console.error('RenewSessionLock request failed:', {
                            code: error.code,
                            message: error.message,
                            details: error.details,
                        });
                        reject(error);
                    } else if (response && response.lockedUntil) {
                        resolve(response.lockedUntil);
                    } else {
                        const err = new Error('No response or lockedUntil returned from renewSessionLock');
                        console.error(err);
                        reject(err);
                    }
                }
            );
        });
    }

    /**
     * Resets the singleton instance (for testing purposes).
     */
    static resetInstance(): void {
        ServiceBusMessageActions.instance = null;
    }
}
