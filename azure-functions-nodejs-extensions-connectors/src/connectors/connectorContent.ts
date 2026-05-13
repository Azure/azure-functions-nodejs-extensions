// Copyright (c) Microsoft Corporation.  All rights reserved.

import { FunctionInput, FunctionOutput, input, output } from '@azure/functions';

// ---------------------------------------------------------------------------
// Connector content input binding
// ---------------------------------------------------------------------------

/**
 * Options for creating a connector content input binding.
 */
export interface ConnectorContentInputOptions {
    /** The connector name (e.g., 'office365', 'sharepointonline', 'teams', 'kusto'). */
    connector: string;

    /** The connection setting name. */
    connection: string;

    /** The operation to invoke on the connector (e.g., 'GetEmail', 'GetFile'). */
    operation?: string;
}

/**
 * Creates a connector content input binding.
 * Use with `extraInputs` to read data from a connector during trigger execution.
 *
 * @example
 * ```typescript
 * const emailInput = connectorContent.input({
 *     connector: 'office365',
 *     connection: 'Office365Connection',
 *     operation: 'GetEmail',
 * });
 * ```
 * @param options The connector content input options.
 */
export function connectorContentInput(options: ConnectorContentInputOptions): FunctionInput {
    return input.connectorContent({
        connector: options.connector,
        connection: options.connection,
        operation: options.operation,
    });
}

// ---------------------------------------------------------------------------
// Connector content output binding
// ---------------------------------------------------------------------------

/**
 * Options for creating a connector content output binding.
 */
export interface ConnectorContentOutputOptions {
    /** The connector name (e.g., 'office365', 'sharepointonline', 'teams', 'kusto'). */
    connector: string;

    /** The connection setting name. */
    connection: string;

    /** The operation to invoke on the connector (e.g., 'SendEmail', 'CreateFile'). */
    operation?: string;
}

/**
 * Creates a connector content output binding.
 * Use with `extraOutputs` or `return` to write data to a connector.
 *
 * @example
 * ```typescript
 * const emailOutput = connectorContent.output({
 *     connector: 'office365',
 *     connection: 'Office365Connection',
 *     operation: 'SendEmail',
 * });
 * ```
 * @param options The connector content output options.
 */
export function connectorContentOutput(options: ConnectorContentOutputOptions): FunctionOutput {
    return output.connectorContent({
        connector: options.connector,
        connection: options.connection,
        operation: options.operation,
    });
}

// ---------------------------------------------------------------------------
// Convenience grouped namespace
// ---------------------------------------------------------------------------

/**
 * Connector content bindings for input and output.
 *
 * @example
 * ```typescript
 * import { connectorContent } from '@azure/functions-extensions-connectors';
 *
 * const emailInput = connectorContent.input({
 *     connector: 'office365',
 *     connection: 'Office365Connection',
 * });
 *
 * const blobOutput = connectorContent.output({
 *     connector: 'office365',
 *     connection: 'Office365Connection',
 *     operation: 'SendEmail',
 * });
 * ```
 */
export const connectorContent = {
    input: connectorContentInput,
    output: connectorContentOutput,
};
