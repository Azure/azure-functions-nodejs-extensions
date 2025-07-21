// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { ServiceBusReceivedMessage } from '@azure/service-bus';
import * as grpc from '@grpc/grpc-js';

export interface CompleteRequest {
    locktoken: string;
}

export interface AbandonRequest {
    locktoken: string;
    propertiesToModify: Uint8Array;
}

export interface DeadletterRequest {
    locktoken: string;
    propertiesToModify: Uint8Array;
    deadletterReason?: string;
    deadletterErrorDescription?: string;
}

export interface DeferRequest {
    locktoken: string;
    propertiesToModify: Uint8Array;
}

export interface RenewMessageLockRequest {
    locktoken: string;
}

export interface GetSessionStateRequest {
    sessionId: string;
}

export interface SetSessionStateRequest {
    sessionId: string;
    sessionState: Uint8Array;
}

export interface GetSessionStateResponse {
    sessionState: Uint8Array;
}

export interface ReleaseSessionRequest {
    sessionId: string;
}

export interface RenewSessionLockRequest {
    sessionId: string;
}

export interface RenewSessionLockResponse {
    lockedUntil: Date;
}

// gRPC Service Definition
/**
 * Interface representing the gRPC SettlementService as defined in the `settlement.proto` file.
 *
 * This service provides methods for settling messages in Azure Service Bus, including operations
 * such as completing, abandoning, dead-lettering, deferring messages, and managing session state and locks.
 *
 * Each method corresponds to a gRPC call defined in the proto file and accepts a specific request type
 * along with a callback to handle the response.
 */
interface SettlementService {
    complete(request: CompleteRequest, callback: grpc.requestCallback<unknown>): void;
    abandon(request: AbandonRequest, callback: grpc.requestCallback<unknown>): void;
    deadletter(request: DeadletterRequest, callback: grpc.requestCallback<unknown>): void;
    defer(request: DeferRequest, callback: grpc.requestCallback<unknown>): void;
    renewMessageLock(request: RenewMessageLockRequest, callback: grpc.requestCallback<unknown>): void;
    getSessionState(request: GetSessionStateRequest, callback: grpc.requestCallback<GetSessionStateResponse>): void;
    setSessionState(request: SetSessionStateRequest, callback: grpc.requestCallback<unknown>): void;
    releaseSession(request: ReleaseSessionRequest, callback: grpc.requestCallback<unknown>): void;
    renewSessionLock(request: RenewSessionLockRequest, callback: grpc.requestCallback<RenewSessionLockResponse>): void;
}

// Ensure SettlementService extends grpc.Client
type SettlementServiceClient = SettlementService & grpc.Client;

// Client implementation with Promise-based methods
/**
 * Provides actions for settling and managing messages in Azure Service Bus via gRPC.
 *
 * This class wraps gRPC client calls to perform message settlement operations such as complete, abandon, deadletter, defer,
 * as well as session management operations like renewing locks, setting session state, and releasing sessions.
 *
 * @remarks
 * - Requires a gRPC server implementing the Settlement service as defined in the proto file.
 * - All methods throw if the required parameters are missing or if the gRPC call fails.
 */
export interface IServiceBusMessageActions {
    /**
     * Completes (settles) the specified message, removing it from the queue or subscription.
     *
     * @param message - The received Service Bus message to complete.
     * @returns A promise that resolves when the operation is successful.
     * @throws Error if the lockToken is missing or the gRPC call fails.
     */
    complete(message: ServiceBusReceivedMessage): Promise<void>;

    /**
     * Abandons the specified message, making it available again for processing.
     *
     * @param message - The received Service Bus message to abandon.
     * @param propertiesToModify - Optional properties to modify on the message.
     * @returns A promise that resolves when the operation is successful.
     * @throws Error if the lockToken is missing or the gRPC call fails.
     */
    abandon(message: ServiceBusReceivedMessage, propertiesToModify?: Uint8Array): Promise<void>;

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
    deadletter(
        message: ServiceBusReceivedMessage,
        propertiesToModify?: Uint8Array,
        deadletterReason?: string,
        deadletterErrorDescription?: string
    ): Promise<void>;

    /**
     * Defers the specified message, making it invisible until retrieved by sequence number.
     *
     * @param message - The received Service Bus message to defer.
     * @param propertiesToModify - Optional properties to modify on the message.
     * @returns A promise that resolves when the operation is successful.
     * @throws Error if the lockToken is missing or the gRPC call fails.
     */
    defer(message: ServiceBusReceivedMessage, propertiesToModify?: Uint8Array): Promise<void>;

    /**
     * Renews the lock on the specified message, extending its lock duration.
     *
     * @param message - The received Service Bus message whose lock should be renewed.
     * @returns A promise that resolves when the operation is successful.
     * @throws Error if the lockToken is missing or the gRPC call fails.
     */
    renewMessageLock(message: ServiceBusReceivedMessage): Promise<void>;

    /**
     * Sets the state for the specified session.
     *
     * @param sessionId - The session ID for which to set the state.
     * @param sessionState - The state to set for the session.
     * @returns A promise that resolves when the operation is successful.
     * @throws Error if the gRPC call fails.
     */
    setSessionState(sessionId: string, sessionState: Uint8Array): Promise<void>;

    /**
     * Releases the specified session, making it available for other receivers.
     *
     * @param sessionId - The session ID to release.
     * @returns A promise that resolves when the operation is successful.
     * @throws Error if the gRPC call fails.
     */
    releaseSession(sessionId: string): Promise<void>;

    /**
     * Renews the lock on the specified session, extending its lock duration.
     *
     * @param sessionId - The session ID whose lock should be renewed.
     * @returns A promise that resolves to the new locked-until date.
     * @throws Error if the gRPC call fails or if no response is returned.
     */
    renewSessionLock(sessionId: string): Promise<Date>;
}
