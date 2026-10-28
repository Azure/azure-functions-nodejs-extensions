// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import {
    BuildResult,
    GitPullRequest,
    GitPush,
    TfvcChangeset,
    TriggerWorkItemResponse,
} from '@azure/connectors/generated/VisualstudioteamservicesExtensions';
import {
    BuildCompletedTriggerContext,
    GitPullRequestTriggerContext,
    GitPushTriggerContext,
    TfvcChangesetTriggerContext,
    WorkItemTriggerContext,
} from '../../types';
import { createConnectorTrigger } from './createConnectorTrigger';

const registerPullRequestTrigger = createConnectorTrigger<GitPullRequest, GitPullRequestTriggerContext>(
    (context) => ({ ...context, pullRequests: context.items }),
);
const registerWorkItemTrigger = createConnectorTrigger<TriggerWorkItemResponse, WorkItemTriggerContext>(
    (context) => ({ ...context, workItems: context.items }),
);

/**
 * Registers completed Azure DevOps builds.
 * @param name - The function name used for registration and routing.
 * @param options - The handler and optional input/output bindings.
 */
export const onBuildCompleted = createConnectorTrigger<BuildResult, BuildCompletedTriggerContext>(
    (context) => ({ ...context, builds: context.items }),
);

/**
 * Registers closed Azure DevOps pull requests.
 * @param name - The function name used for registration and routing.
 * @param options - The handler and optional input/output bindings.
 */
export const onGitPullClosed = registerPullRequestTrigger;

/**
 * Registers newly created Azure DevOps pull requests.
 * @param name - The function name used for registration and routing.
 * @param options - The handler and optional input/output bindings.
 */
export const onGitPullCreated = registerPullRequestTrigger;

/**
 * Registers Azure DevOps Git pushes.
 * @param name - The function name used for registration and routing.
 * @param options - The handler and optional input/output bindings.
 */
export const onGitPush = createConnectorTrigger<GitPush, GitPushTriggerContext>(
    (context) => ({ ...context, pushes: context.items }),
);

/**
 * Registers Azure DevOps TFVC check-ins.
 * @param name - The function name used for registration and routing.
 * @param options - The handler and optional input/output bindings.
 */
export const onTfvcCheckIn = createConnectorTrigger<TfvcChangeset, TfvcChangesetTriggerContext>(
    (context) => ({ ...context, changesets: context.items }),
);

/**
 * Registers assigned Azure DevOps work items.
 * @param name - The function name used for registration and routing.
 * @param options - The handler and optional input/output bindings.
 */
export const onWorkItemAssigned = registerWorkItemTrigger;

/**
 * Registers closed Azure DevOps work items.
 * @param name - The function name used for registration and routing.
 * @param options - The handler and optional input/output bindings.
 */
export const onWorkItemClosed = registerWorkItemTrigger;

/**
 * Registers newly created Azure DevOps work items.
 * @param name - The function name used for registration and routing.
 * @param options - The handler and optional input/output bindings.
 */
export const onWorkItemCreated = registerWorkItemTrigger;

/**
 * Registers updated Azure DevOps work items.
 * @param name - The function name used for registration and routing.
 * @param options - The handler and optional input/output bindings.
 */
export const onWorkItemUpdated = registerWorkItemTrigger;
