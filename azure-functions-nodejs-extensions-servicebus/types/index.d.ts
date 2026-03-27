// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { ServiceBusReceivedMessage } from '@azure/service-bus';
import { IServiceBusMessageActions } from './settlement-types';

export declare class ServiceBusMessageActions implements IServiceBusMessageActions {
    private constructor();
    static getInstance(): ServiceBusMessageActions;
    complete(message: ServiceBusReceivedMessage): Promise<void>;
    abandon(message: ServiceBusReceivedMessage, propertiesToModify?: Record<string, any>): Promise<void>;
    deadletter(
        message: ServiceBusReceivedMessage,
        propertiesToModify?: Record<string, any>,
        deadletterReason?: string,
        deadletterErrorDescription?: string
    ): Promise<void>;
    defer(message: ServiceBusReceivedMessage, propertiesToModify?: Record<string, any>): Promise<void>;
    renewMessageLock(message: ServiceBusReceivedMessage): Promise<void>;
    setSessionState(sessionId: string, sessionState: Uint8Array): Promise<void>;
    releaseSession(sessionId: string): Promise<void>;
    renewSessionLock(sessionId: string): Promise<Date>;
}

export interface ServiceBusMessageContext {
    messages: ServiceBusReceivedMessage[];
    actions: ServiceBusMessageActions;
}

export type { IServiceBusMessageActions } from './settlement-types';

// Body parsing helper utilities
export declare function messageBodyAsText(message: { body: unknown }): string;
export declare function messageBodyAsJson<T = unknown>(
    message: { body: unknown },
    reviver?: (key: string, value: unknown) => unknown
): T;
