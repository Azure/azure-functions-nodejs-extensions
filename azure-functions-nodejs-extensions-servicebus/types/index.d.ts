// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { ServiceBusReceivedMessage } from '@azure/service-bus';
import { ServiceBusMessageActions } from '../src/servicebus/ServiceBusMessageActions';

export interface ServiceBusMessageContext {
    messages: ServiceBusReceivedMessage[];
    actions: ServiceBusMessageActions;
}
