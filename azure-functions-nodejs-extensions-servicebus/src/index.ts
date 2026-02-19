// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { registerServiceBusMessageFactory } from './servicebus/registerServiceBusMessageFactory';

registerServiceBusMessageFactory();

// Export types for customer consumption
export type { ServiceBusMessage, ServiceBusMessageContext } from '../types';
export type { IServiceBusMessageActions } from '../types/settlement-types';

// Export AMQP property encoding utilities
export { convertPropertiesToAmqpBytes, validateAmqpProperties } from './util/amqpPropertyEncoder';
