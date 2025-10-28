// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

/**
 * AMQP Property Encoder Utility
 *
 * Converts TypeScript/JavaScript property values to AMQP-encoded byte arrays.
 * Date objects are automatically converted to UTC ISO format for cross-platform compatibility.
 */

/**
 * Supported AMQP property types
 */
enum AmqpType {
    Null = 'null',
    Byte = 'byte',
    SByte = 'sbyte',
    Char = 'char',
    Int16 = 'int16',
    UInt16 = 'uint16',
    Int32 = 'int32',
    UInt32 = 'uint32',
    Int64 = 'int64',
    UInt64 = 'uint64',
    Single = 'single',
    Double = 'double',
    Decimal = 'decimal',
    Boolean = 'boolean',
    Guid = 'guid',
    String = 'string',
    Uri = 'uri',
    DateTime = 'datetime',
    DateTimeOffset = 'datetimeoffset',
    TimeSpan = 'timespan',
    Stream = 'stream',
    Array = 'array',
    Unknown = 'unknown',
}

/**
 * Type mapping from JavaScript primitive types to AMQP types
 */
const PRIMITIVE_TYPE_MAP = new Map<string, AmqpType>([
    ['number', AmqpType.Double],
    ['boolean', AmqpType.Boolean],
    ['string', AmqpType.String],
    ['bigint', AmqpType.Int64],
]);

/**
 * Type conversion utilities for specific AMQP types
 *
 * Contains validation functions to determine if JavaScript values fit within
 * specific AMQP type ranges and formats.
 */
const TypeConverters = {
    /** Checks if number fits in unsigned 8-bit range (0-255) */
    isByte: (value: number): boolean => Number.isInteger(value) && value >= 0 && value <= 255,
    /** Checks if number fits in signed 8-bit range (-128 to 127) */
    isSByte: (value: number): boolean => Number.isInteger(value) && value >= -128 && value <= 127,
    /** Checks if number fits in signed 16-bit range (-32,768 to 32,767) */
    isInt16: (value: number): boolean => Number.isInteger(value) && value >= -32768 && value <= 32767,
    /** Checks if number fits in unsigned 16-bit range (0 to 65,535) */
    isUInt16: (value: number): boolean => Number.isInteger(value) && value >= 0 && value <= 65535,
    /** Checks if number fits in signed 32-bit range (-2,147,483,648 to 2,147,483,647) */
    isInt32: (value: number): boolean => Number.isInteger(value) && value >= -2147483648 && value <= 2147483647,
    /** Checks if number fits in unsigned 32-bit range (0 to 4,294,967,295) */
    isUInt32: (value: number): boolean => Number.isInteger(value) && value >= 0 && value <= 4294967295,
    /** Checks if floating-point number fits in 32-bit single precision range */
    isSingle: (value: number): boolean => !Number.isInteger(value) && Math.abs(value) <= 3.4028235e38,

    /** Checks if string is a single character */
    isChar: (value: string): boolean => value.length === 1,
    /** Checks if string matches GUID/UUID format (8-4-4-4-12 hex digits) */
    isGuid: (value: string): boolean =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
    /** Checks if string is a valid URI by attempting URL construction */
    isUri: (value: string): boolean => {
        try {
            new URL(value);
            return true;
        } catch {
            return false;
        }
    },
    /** Checks if string can be parsed as a date */
    isDateTime: (value: string): boolean => !isNaN(Date.parse(value)),
    /** Checks if string matches TimeSpan format ([-][d.]hh:mm:ss[.fffffff]) */
    isTimeSpan: (value: string): boolean => /^-?(\d+\.)?(\d{2}:)?(\d{2}:)?\d{2}(\.\d{1,7})?$/.test(value),
};

/**
 * Checks if an object represents a decimal-like value structure
 * @param obj - The object to check
 * @returns True if the object has properties indicating it's a decimal type
 */
function isDecimalLike(obj: unknown): boolean {
    return (
        obj !== null &&
        typeof obj === 'object' &&
        'toString' in obj &&
        ('precision' in obj || 'scale' in obj || 'value' in obj)
    );
}

/**
 * Wraps a value with the appropriate AMQP type using the rhea library
 * @param type - The AMQP type string identifier
 * @param value - The value to wrap
 * @returns The wrapped value ready for AMQP encoding
 */
function wrapAmqpValue(type: string, value: unknown): unknown {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
    const rhea = require('rhea');

    switch (type) {
        case 'null':
            return null;
        case 'boolean':
            return value;
        case 'byte':
        case 'sbyte':
        case 'int16':
        case 'uint16':
        case 'int32':
        case 'uint32':
        case 'single':
        case 'double':
            return value;
        case 'int64':
        case 'uint64':
            // Convert BigInt to number for rhea compatibility
            if (typeof value === 'bigint') {
                // For BigInt values that are within safe integer range, convert to number
                if (value >= BigInt(Number.MIN_SAFE_INTEGER) && value <= BigInt(Number.MAX_SAFE_INTEGER)) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                    return rhea.types.wrap_long(Number(value));
                } else {
                    // For very large values, handle as number but this may lose precision
                    // This is a limitation of the JavaScript-AMQP bridge
                    console.warn(`BigInt value ${value} is outside safe integer range, precision may be lost`);
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                    return rhea.types.wrap_long(Number(value));
                }
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            return rhea.types.wrap_long(value);
        case 'decimal':
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            return rhea.types.wrap_decimal128(value);
        case 'char':
        case 'string':
        case 'guid':
        case 'uri':
        case 'datetime':
        case 'datetimeoffset':
        case 'timespan':
            return value;
        case 'stream':
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            return rhea.types.wrap_binary(value);
        default:
            return value;
    }
}

const SUPPORTED_TYPES_MESSAGE =
    'Supported types: ' +
    'Primitives: null, boolean, string (including char, guid, uri, datetime, timespan), ' +
    'Numbers: byte, sbyte, int16, uint16, int32, uint32, int64, uint64, single, double, decimal, ' +
    'Objects: Date (datetimeoffset), URL (uri), Buffer/Uint8Array (stream), arrays of supported types';

/**
 * Converts a Record<string, any> to AMQP-encoded byte array
 *
 * @param propertiesToModify - The properties to encode
 * @returns Uint8Array containing AMQP-encoded properties
 */
export function convertPropertiesToAmqpBytes(propertiesToModify: Record<string, any>): Uint8Array {
    const amqpMap = new Map<string, unknown>();

    for (const [key, value] of Object.entries(propertiesToModify)) {
        const amqpValue = tryCreateAmqpPropertyValue(value);
        if (amqpValue !== null) {
            amqpMap.set(key, amqpValue);
        } else {
            const error = new Error(
                `The key '${key}' has a value of type '${typeof value}' which is not supported for AMQP transport. ${SUPPORTED_TYPES_MESSAGE}`
            );
            throw error;
        }
    }

    const encodedBytes = encodeAmqpMap(amqpMap);
    return encodedBytes;
}

/**
 * Encodes properties for Service Bus message operations with proper error handling
 *
 * This function provides a safe wrapper around AMQP property encoding specifically
 * designed for Service Bus message operations (abandon, deadletter, defer).
 * It handles null/undefined properties and provides operation-specific error messages.
 *
 * @param propertiesToModify - Optional properties to modify on the message
 * @param operationName - The name of the operation (for error messages)
 * @returns Encoded properties as Uint8Array, or empty array if no properties provided
 * @throws Error with operation-specific context if encoding fails
 *
 * @example
 * ```typescript
 * // For abandon operation
 * const encoded = encodePropertiesForOperation(
 *   { messageId: 'test-123', priority: 1 },
 *   'abandon'
 * );
 *
 * // For operations without properties
 * const empty = encodePropertiesForOperation(undefined, 'defer');
 * // Returns: new Uint8Array()
 * ```
 */
export function encodePropertiesForOperation(
    propertiesToModify: Record<string, any> | undefined,
    operationName: string
): Uint8Array {
    // Return empty array if no properties provided
    if (!propertiesToModify || Object.keys(propertiesToModify).length === 0) {
        return new Uint8Array();
    }

    try {
        return new Uint8Array(convertPropertiesToAmqpBytes(propertiesToModify));
    } catch (error) {
        throw new Error(
            `Failed to encode properties for ${operationName} operation: ${
                error instanceof Error ? error.message : String(error)
            }`
        );
    }
}

/**
 * Attempts to create an AMQP property value from a JavaScript value with intelligent type detection
 *
 * Performs automatic type detection and conversion:
 * - Numbers: Detects optimal integer types (byte, int16, int32, int64) or floating point (single, double)
 * - Strings: Detects char, GUID, URI, DateTime, TimeSpan patterns
 * - Objects: Handles Date, URL, Buffer/Uint8Array, decimal-like objects, arrays
 * - Primitives: Boolean, BigInt, null/undefined
 *
 * @param propertyValue - The JavaScript value to convert to AMQP format
 * @returns Typed AMQP value object with { type, value } structure, or null if conversion fails
 */
function tryCreateAmqpPropertyValue(propertyValue: unknown): unknown {
    if (propertyValue === null || propertyValue === undefined) {
        return { type: 'null', value: null };
    }

    const valueType = typeof propertyValue;

    switch (valueType) {
        case 'string': {
            const strValue = propertyValue as string;

            if (strValue === '') return { type: 'string', value: strValue };
            if (TypeConverters.isChar(strValue)) return { type: 'char', value: strValue };
            if (TypeConverters.isGuid(strValue)) return { type: 'guid', value: strValue };
            if (TypeConverters.isUri(strValue)) return { type: 'uri', value: strValue };
            if (TypeConverters.isTimeSpan(strValue)) return { type: 'timespan', value: strValue };
            if (TypeConverters.isDateTime(strValue)) return { type: 'datetime', value: strValue };

            return { type: 'string', value: strValue };
        }

        case 'number': {
            const numValue = propertyValue as number;

            if (!Number.isFinite(numValue)) {
                return numValue;
            }
            if (Number.isInteger(numValue)) {
                if (TypeConverters.isByte(numValue)) return { type: 'byte', value: numValue };
                if (TypeConverters.isSByte(numValue)) return { type: 'sbyte', value: numValue };
                if (TypeConverters.isInt16(numValue)) return { type: 'int16', value: numValue };
                if (TypeConverters.isUInt16(numValue)) return { type: 'uint16', value: numValue };
                if (TypeConverters.isInt32(numValue)) return { type: 'int32', value: numValue };
                if (TypeConverters.isUInt32(numValue)) return { type: 'uint32', value: numValue };
                return { type: 'int64', value: BigInt(numValue) };
            }
            if (TypeConverters.isSingle(numValue)) {
                return { type: 'single', value: numValue };
            }

            return { type: 'double', value: numValue };
        }

        case 'boolean':
            return { type: 'boolean', value: propertyValue as boolean };

        case 'bigint': {
            const bigintValue = propertyValue as bigint;
            if (bigintValue >= BigInt(0) && bigintValue <= BigInt('18446744073709551615')) {
                return { type: 'uint64', value: bigintValue };
            }
            return { type: 'int64', value: bigintValue };
        }

        case 'object': {
            if (propertyValue instanceof Date) {
                return { type: 'datetimeoffset', value: propertyValue.toISOString() };
            }

            if (propertyValue instanceof Buffer || propertyValue instanceof Uint8Array) {
                return { type: 'stream', value: propertyValue };
            }

            if (propertyValue instanceof URL) {
                return { type: 'uri', value: propertyValue.href };
            }

            if (isDecimalLike(propertyValue)) {
                return { type: 'decimal', value: propertyValue };
            }

            if (Array.isArray(propertyValue)) {
                return propertyValue.map((item: unknown) => tryCreateAmqpPropertyValue(item));
            }

            return null;
        }

        default:
            return null;
    }
}

/**
 * Encodes an AMQP map to byte array using proper AMQP encoding
 *
 * Uses the rhea library to create AMQP-encoded bytes compatible with .NET AMQP decoders.
 * Handles typed values by applying appropriate AMQP type wrappers before encoding.
 *
 * @param amqpMap - Map of string keys to AMQP-compatible values
 * @returns Uint8Array containing the AMQP-encoded map
 * @throws Error if encoding fails
 */
function encodeAmqpMap(amqpMap: Map<string, unknown>): Uint8Array {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
        const rhea = require('rhea');
        const objectMap: Record<string, unknown> = {};
        for (const [key, value] of amqpMap.entries()) {
            if (value && typeof value === 'object' && 'type' in value && 'value' in value) {
                const typedValue = value as { type: string; value: unknown };
                objectMap[key] = wrapAmqpValue(typedValue.type, typedValue.value);
            } else {
                objectMap[key] = value;
            }
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const wrappedMap = rhea.types.wrap_map(objectMap);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const writer = new rhea.types.Writer();

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        writer.write(wrappedMap);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const buffer = writer.toBuffer();

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const result = new Uint8Array(buffer);

        return result;
    } catch (error) {
        throw new Error(`Failed to encode AMQP map: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Gets the AMQP type identifier for a given value
 *
 * Analyzes the value to determine its corresponding AMQP type. Handles both
 * typed values (from tryCreateAmqpPropertyValue) and raw JavaScript values.
 *
 * @param value - The value to analyze
 * @returns The corresponding AmqpType enum value
 */
function getAmqpTypeIdentifier(value: unknown): AmqpType {
    if (value === null || value === undefined) {
        return AmqpType.Null;
    }

    if (value && typeof value === 'object' && 'type' in value && 'value' in value) {
        const typedValue = value as { type: string; value: unknown };
        const amqpType = Object.values(AmqpType).find((type) => type === typedValue.type);
        return amqpType || AmqpType.Unknown;
    }

    const jsType = typeof value;
    const primitiveType = PRIMITIVE_TYPE_MAP.get(jsType);

    if (primitiveType) {
        return primitiveType;
    }

    if (jsType === 'object') {
        if (value instanceof Date) {
            return AmqpType.DateTimeOffset;
        } else if (value instanceof URL) {
            return AmqpType.Uri;
        } else if (value instanceof Buffer || value instanceof Uint8Array) {
            return AmqpType.Stream;
        } else if (Array.isArray(value)) {
            // Arrays are supported, determine their type by content
            return AmqpType.Array;
        }
    }

    return AmqpType.Unknown;
}

/**
 * Validates that all properties in the record are supported AMQP types
 *
 * @param properties - The properties to validate
 * @throws Error if any property has an unsupported type
 */
export function validateAmqpProperties(properties: Record<string, any>): void {
    for (const [key, value] of Object.entries(properties)) {
        const amqpType = getAmqpTypeIdentifier(value);

        if (amqpType === AmqpType.Unknown) {
            const error = new Error(
                `Property '${key}' has unsupported type '${typeof value}' for AMQP transport. ${SUPPORTED_TYPES_MESSAGE}`
            );
            throw error;
        }
    }
}
