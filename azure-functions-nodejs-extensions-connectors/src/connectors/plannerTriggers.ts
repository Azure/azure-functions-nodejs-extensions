// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { GetTaskResponseV2 } from '@azure/connectors/generated/PlannerExtensions';
import { PlannerTaskTriggerContext } from '../../types';
import { createConnectorTrigger } from './createConnectorTrigger';

const registerTaskTrigger = createConnectorTrigger<GetTaskResponseV2, PlannerTaskTriggerContext>(
    (context) => ({ ...context, tasks: context.items }),
);

/**
 * Registers completed Planner tasks.
 * @param name - The function name used for registration and routing.
 * @param options - The handler and optional input/output bindings.
 */
export const onCompleteTask = registerTaskTrigger;

/**
 * Registers newly created Planner tasks.
 * @param name - The function name used for registration and routing.
 * @param options - The handler and optional input/output bindings.
 */
export const onNewTask = registerTaskTrigger;

/**
 * Registers Planner tasks assigned to the current user.
 * @param name - The function name used for registration and routing.
 * @param options - The handler and optional input/output bindings.
 */
export const onTaskAssignedToMe = registerTaskTrigger;
