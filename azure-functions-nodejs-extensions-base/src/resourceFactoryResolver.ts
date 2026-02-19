// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { ModelBindingData, ResourceFactory } from '../types';

/**
 * Well-known Symbol key for the process-wide singleton.
 * Using Symbol.for() ensures the same Symbol is returned regardless of how many
 * copies of this module are loaded (e.g., bundled inline vs. node_modules).
 * This fixes Issue #26: https://github.com/Azure/azure-functions-nodejs-extensions/issues/26
 */
const SINGLETON_KEY = Symbol.for('@azure/functions-extensions-base.ResourceFactoryResolver');

export class ResourceFactoryResolver {
    private resourceFactories: Map<string, ResourceFactory> = new Map();

    /**
     * Private constructor to enforce singleton pattern
     */
    private constructor() {
        // Initialize as needed
    }

    /**
     * Gets the singleton instance of the registry.
     * Uses globalThis with a Symbol.for() key to ensure a single instance
     * across bundled and non-bundled copies of this module.
     * @returns The singleton instance
     */
    static getInstance(): ResourceFactoryResolver {
        const g = globalThis as Record<symbol, unknown>;
        if (!g[SINGLETON_KEY]) {
            g[SINGLETON_KEY] = new ResourceFactoryResolver();
        }
        return g[SINGLETON_KEY] as ResourceFactoryResolver;
    }

    /**
     * Registers a factory for a specific type.
     * @param resourceType The type of the resource factory to check for.
     * @param factory The factory function to create instances of the type.
     */
    registerResourceFactory(resourceType: string, factory: ResourceFactory): void {
        if (this.resourceFactories.has(resourceType)) {
            throw new Error(`Factory for type "${resourceType}" is already registered.`);
        }
        this.resourceFactories.set(resourceType, factory);
    }

    /**
     * Creates a client instance for the specified resource type using the provided model binding data.
     *
     * @param resourceType - The type of the resource for which the client is being created.
     * @param modelBindingData - The data required to bind the model for the resource.
     * @returns An instance of the client for the specified resource type.
     * @throws Error - If no factory is registered for the specified resource type.
     */
    createClient(resourceType: string, modelBindingData: ModelBindingData | ModelBindingData[]): unknown {
        const resourceFactory = this.resourceFactories.get(resourceType);
        if (!resourceFactory) {
            throw new Error(
                `Factory for type "${resourceType}" is not registered. Register a factory implementation before creating clients.`
            );
        }
        return resourceFactory(modelBindingData);
    }

    /**
     * Checks if a resource factory of the specified type exists.
     *
     * @param tyresourceTypepe - The type of the resource factory to check for.
     * @returns A boolean indicating whether a resource factory of the specified type exists.
     */
    hasResourceFactory(resourceType: string): boolean {
        return this.resourceFactories.has(resourceType);
    }
}
