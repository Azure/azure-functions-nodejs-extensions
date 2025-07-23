// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { AmqpAnnotatedMessage } from '@azure/core-amqp';
import { ModelBindingData } from '@azure/functions-extensions-base';
import { ServiceBusReceivedMessage } from '@azure/service-bus';
import LongActual from 'long';
import rhea = require('rhea');
import { ServiceBusMessageContext } from '../../types';
import { ServiceBusMessageDecoder } from '../util/serviceBusMessageDecoder';
import { ServiceBusMessageActions } from './ServiceBusMessageActions';

const ENQUEUED_TIME_ANNOTATION = 'x-opt-enqueued-time';
const SEQUENCE_NUMBER_ANNOTATION = 'x-opt-sequence-number';
const DEAD_LETTER_REASON_ANNOTATION = 'DeadLetterReason';
const DEAD_LETTER_ERROR_DESCRIPTION_ANNOTATION = 'DeadLetterErrorDescription';

/**
 * Factory class for creating and processing Azure Service Bus messages Manager.
 *
 * This factory class provides methods to:
 * - Build ServiceBusMessage instances from model binding data in Azure Functions
 * - Convert between different message formats (AMQP, Rhea)
 * - Extract and decode message body content with proper type handling
 *
 * The factory handles all necessary transformations of message properties,
 * annotations, and content to ensure proper integration with the Azure
 * Service Bus messaging system.
 */
export class AzureServiceBusMessageFactory {
    /**
     * Builds a ServiceBusMessageContext instance from model binding data.
     * This method extracts the Service Bus message content from the provided model binding data,
     * @param modelBindingData - The model binding data containing the Service Bus message content.
     * This can be a single ModelBindingData object or an array of ModelBindingData objects.
     * @returns A ServiceBusMessageContext instance.
     */
    static buildServiceBusMessageFromModelBindingData(
        modelBindingData: ModelBindingData | ModelBindingData[]
    ): ServiceBusMessageContext {
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
            actions: client,
        };
    }

    /**
     * Creates a ServiceBusReceivedMessage from an AMQP annotated message.
     * This method extracts relevant properties and formats them into the ServiceBusReceivedMessage structure.
     *
     * @param amqpMessage - The AMQP annotated message to convert.
     * @param lockToken - lock token for the message.
     * @returns A ServiceBusReceivedMessage object.
     */
    static createServiceBusReceivedMessageFromAmqp(
        amqpMessage: AmqpAnnotatedMessage,
        lockToken: string
    ): ServiceBusReceivedMessage {
        // Extract common properties from the AMQP message
        const receivedMessage: ServiceBusReceivedMessage = {
            // Message body
            body: AzureServiceBusMessageFactory.decodeAmqpBody(amqpMessage.body, amqpMessage.properties?.contentType),

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
                amqpMessage.messageAnnotations?.[ENQUEUED_TIME_ANNOTATION] !== undefined &&
                (typeof amqpMessage.messageAnnotations[ENQUEUED_TIME_ANNOTATION] === 'string' ||
                    typeof amqpMessage.messageAnnotations[ENQUEUED_TIME_ANNOTATION] === 'number')
                    ? new Date(amqpMessage.messageAnnotations[ENQUEUED_TIME_ANNOTATION])
                    : undefined,

            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            sequenceNumber:
                amqpMessage.messageAnnotations?.[SEQUENCE_NUMBER_ANNOTATION] !== undefined
                    ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                      LongActual.fromNumber(Number(amqpMessage.messageAnnotations[SEQUENCE_NUMBER_ANNOTATION]))
                    : undefined,

            // Dead letter properties
            deadLetterReason: amqpMessage.applicationProperties?.[DEAD_LETTER_REASON_ANNOTATION] as string | undefined,
            deadLetterErrorDescription: amqpMessage.applicationProperties?.[
                DEAD_LETTER_ERROR_DESCRIPTION_ANNOTATION
            ] as string | undefined,

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
        lockToken: string
    ): ServiceBusReceivedMessage {
        const amqpMessage = AmqpAnnotatedMessage.fromRheaMessage(rheaMessage);
        return AzureServiceBusMessageFactory.createServiceBusReceivedMessageFromAmqp(amqpMessage, lockToken);
    }

    /**
     * Decodes the body of an AMQP message section based on its typecode and content type.
     * Supports decoding binary data, plain text, and JSON content.
     *
     * @param section - The AMQP message section containing a typecode and content buffer.
     * @returns The decoded message body or undefined if decoding fails.
     */
    static decodeAmqpBody(section: unknown, contentType?: string): unknown {
        if (
            typeof section === 'object' &&
            section !== null &&
            'typecode' in section &&
            'content' in section &&
            typeof (section as Record<string, unknown>).typecode === 'number' &&
            Buffer.isBuffer((section as Record<string, unknown>).content)
        ) {
            const { typecode, content } = section as { typecode: number; content: Buffer };
            //typecode = 117 is Binary content
            if (typecode === 117) {
                const text = content.toString('utf8');

                switch (contentType) {
                    case 'text/plain':
                    case 'application/xml':
                        return text;

                    case 'application/json':
                        try {
                            return JSON.parse(text);
                        } catch {
                            return text; // fallback if not valid JSON
                        }

                    default:
                        return text; // unknown content type convert binary to string and return
                }
            }

            return content;
        }
        // Not a valid AMQP body section
        return section;
    }
}
