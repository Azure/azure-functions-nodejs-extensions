// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { AmqpAnnotatedMessage } from '@azure/core-amqp';
import { ModelBindingData } from '@azure/functions-extensions-base';
import { ServiceBusReceivedMessage } from '@azure/service-bus';
import LongActual from 'long';
import rhea = require('rhea');
import { ServiceBusMessageManager } from '../../types';
import { ServiceBusMessageDecoder } from '../util/serviceBusMessageDecoder';
import { ServiceBusMessageActions } from './ServiceBusMessageActions';

/**
 * Factory class for creating and caching Azure Blob Storage clients
 * following Azure best practices for client reuse and lifecycle management
 */
export class AzureServiceBusMessageFactory {
    /**
     * Builds a ServiceBusMessageManager instance from model binding data.
     * This method extracts the Service Bus message content from the provided model binding data,
     * @param modelBindingData - The model binding data containing the Service Bus message content.
     * This can be a single ModelBindingData object or an array of ModelBindingData objects.
     * @returns A ServiceBusMessageManager instance.
     */
    static buildServiceBusMessageFromModelBindingData(
        modelBindingData: ModelBindingData | ModelBindingData[]
    ): ServiceBusMessageManager {
        const client = ServiceBusMessageActions.getInstance();

        const toMessage = (data: ModelBindingData) => {
            if (!data.content) {
                throw new Error('ModelBindingData.content is null or undefined.');
            }
            const { decodedMessage, lockToken } = ServiceBusMessageDecoder.decode(data.content);
            return this.createServiceBusReceivedMessageFromRhea(decodedMessage, lockToken);
        };

        const messages = Array.isArray(modelBindingData)
            ? modelBindingData.map(toMessage)
            : toMessage(modelBindingData);

        return {
            messages,
            serviceBusMessageActions: client,
        };
    }

    /**
     * Creates a ServiceBusReceivedMessage from an AMQP annotated message.
     * This method extracts relevant properties and formats them into the ServiceBusReceivedMessage structure.
     *
     * @param amqpMessage - The AMQP annotated message to convert.
     * @param lockToken - Optional lock token for the message.
     * @returns A ServiceBusReceivedMessage object.
     */
    static createServiceBusReceivedMessageFromAmqp(
        amqpMessage: AmqpAnnotatedMessage,
        lockToken?: string
    ): ServiceBusReceivedMessage {
        // Extract common properties from the AMQP message
        const receivedMessage: ServiceBusReceivedMessage = {
            // Message body
            body: amqpMessage.body as unknown,

            // Message properties
            messageId: amqpMessage.properties?.messageId?.toString(),
            correlationId: amqpMessage.properties?.correlationId?.toString(),
            contentType: amqpMessage.properties?.contentType,
            subject: amqpMessage.properties?.subject,
            to: amqpMessage.properties?.to,
            replyTo: amqpMessage.properties?.replyTo,
            replyToSessionId: amqpMessage.properties?.replyToGroupId,
            sessionId: amqpMessage.properties?.groupId,
            timeToLive: amqpMessage.header?.timeToLive,

            // Application properties
            applicationProperties: amqpMessage.applicationProperties || {},

            // Message annotations and delivery annotations
            deliveryCount: amqpMessage.header?.deliveryCount || 0,

            // Lock token (if provided)
            lockToken: lockToken,

            // AMQP annotated message for full access
            _rawAmqpMessage: amqpMessage,

            // Timestamps (convert from AMQP format if available)
            enqueuedTimeUtc:
                amqpMessage.messageAnnotations?.['x-opt-enqueued-time'] !== undefined &&
                (typeof amqpMessage.messageAnnotations['x-opt-enqueued-time'] === 'string' ||
                    typeof amqpMessage.messageAnnotations['x-opt-enqueued-time'] === 'number')
                    ? new Date(amqpMessage.messageAnnotations['x-opt-enqueued-time'])
                    : undefined,

            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            sequenceNumber:
                amqpMessage.messageAnnotations?.['x-opt-sequence-number'] !== undefined
                    ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                      LongActual.fromNumber(Number(amqpMessage.messageAnnotations['x-opt-sequence-number']))
                    : undefined,

            // Dead letter properties
            deadLetterReason: amqpMessage.applicationProperties?.['DeadLetterReason'] as string | undefined,
            deadLetterErrorDescription: amqpMessage.applicationProperties?.['DeadLetterErrorDescription'] as
                | string
                | undefined,

            // State
            state: 'active' as const,
        };

        return receivedMessage;
    }

    /**
     * Creates a ServiceBusReceivedMessage from a Rhea message.
     * This method extracts relevant properties and formats them into the ServiceBusReceivedMessage structure.
     *
     * @param rheaMessage - The Rhea message to convert.
     * @param lockToken - Optional lock token for the message.
     * @returns A ServiceBusReceivedMessage object.
     */
    static createServiceBusReceivedMessageFromRhea(
        rheaMessage: rhea.Message,
        lockToken?: string
    ): ServiceBusReceivedMessage {
        const amqpMessage = AmqpAnnotatedMessage.fromRheaMessage(rheaMessage);
        return AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromAmqp(amqpMessage, lockToken);
    }
}
