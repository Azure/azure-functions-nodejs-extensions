// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { Item } from '@azure/connectors/generated/SalesforceExtensions';
import { SalesforceRecordTriggerContext } from '../../types';
import { createConnectorTrigger } from './createConnectorTrigger';

const registerRecordTrigger = createConnectorTrigger<Item, SalesforceRecordTriggerContext>(
    (context) => ({ ...context, records: context.items }),
);

/**
 * Registers newly created Salesforce records with SDK dynamic fields.
 * @param name - The function name used for registration and routing.
 * @param options - The handler and optional input/output bindings.
 */
export const onNewItems = registerRecordTrigger;

/**
 * Registers updated Salesforce records with SDK dynamic fields.
 * @param name - The function name used for registration and routing.
 * @param options - The handler and optional input/output bindings.
 */
export const onUpdatedItems = registerRecordTrigger;
