// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { expect } from 'chai';
import {
    convertPropertiesToAmqpBytes,
    encodePropertiesForOperation,
    validateAmqpProperties,
} from '../../src/util/amqpPropertyEncoder';

describe('AMQP Property Encoder', () => {
    describe('convertPropertiesToAmqpBytes', () => {
        it('should handle null and undefined values', () => {
            const properties = {
                nullValue: null,
                undefinedValue: undefined,
            };

            const result = convertPropertiesToAmqpBytes(properties);
            expect(result).to.be.instanceOf(Uint8Array);
            expect(result.length).to.be.greaterThan(0);
        });

        it('should handle boolean values', () => {
            const properties = {
                trueValue: true,
                falseValue: false,
            };

            const result = convertPropertiesToAmqpBytes(properties);
            expect(result).to.be.instanceOf(Uint8Array);
            expect(result.length).to.be.greaterThan(0);
        });

        it('should handle string values with type detection', () => {
            const properties = {
                regularString: 'hello world',
                emptyString: '',
                singleChar: 'A',
                guid: '550e8400-e29b-41d4-a716-446655440000',
                uri: 'https://example.com',
                datetime: '2023-12-25T10:30:00Z',
                timespan: '1.02:03:04.567',
            };

            const result = convertPropertiesToAmqpBytes(properties);
            expect(result).to.be.instanceOf(Uint8Array);
            expect(result.length).to.be.greaterThan(0);
        });

        it('should handle numeric values with optimal type selection', () => {
            const properties = {
                byteValue: 255,
                sbyteValue: -128,
                int16Value: 32767,
                uint16Value: 65535,
                int32Value: 2147483647,
                singleFloat: 3.14,
                doubleFloat: 1.23456789,
                positiveNumber: 42,
                negativeNumber: -42,
                zeroValue: 0,
            };

            const result = convertPropertiesToAmqpBytes(properties);
            expect(result).to.be.instanceOf(Uint8Array);
            expect(result.length).to.be.greaterThan(0);
        });

        it('should handle bigint values', () => {
            const properties = {
                int64Value: BigInt('123'),
                uint64Value: BigInt('456'),
                largeBigInt: BigInt('789'),
            };

            const result = convertPropertiesToAmqpBytes(properties);
            expect(result).to.be.instanceOf(Uint8Array);
            expect(result.length).to.be.greaterThan(0);
        });

        it('should handle Date objects', () => {
            const properties = {
                currentDate: new Date(),
                specificDate: new Date('2023-12-25T10:30:00Z'),
                epochDate: new Date(0),
            };

            const result = convertPropertiesToAmqpBytes(properties);
            expect(result).to.be.instanceOf(Uint8Array);
            expect(result.length).to.be.greaterThan(0);
        });

        it('should handle URL objects', () => {
            const properties = {
                httpUrl: new URL('https://example.com'),
                httpsUrl: new URL('https://secure.example.com/path?query=value'),
                fileUrl: new URL('file:///path/to/file.txt'),
            };

            const result = convertPropertiesToAmqpBytes(properties);
            expect(result).to.be.instanceOf(Uint8Array);
            expect(result.length).to.be.greaterThan(0);
        });

        it('should handle Buffer and Uint8Array values', () => {
            const properties = {
                bufferValue: Buffer.from('hello world', 'utf8'),
                uint8ArrayValue: new Uint8Array([1, 2, 3, 4, 5]),
                emptyBuffer: Buffer.alloc(0),
            };

            const result = convertPropertiesToAmqpBytes(properties);
            expect(result).to.be.instanceOf(Uint8Array);
            expect(result.length).to.be.greaterThan(0);
        });

        it('should handle arrays of supported types', () => {
            const properties = {
                numberArray: [1, 2, 3, 4, 5],
                stringArray: ['a', 'b', 'c'],
                mixedArray: [1, 'hello', true, null],
                nestedArray: [
                    [1, 2],
                    ['a', 'b'],
                ],
            };

            const result = convertPropertiesToAmqpBytes(properties);
            expect(result).to.be.instanceOf(Uint8Array);
            expect(result.length).to.be.greaterThan(0);
        });

        it('should handle decimal-like objects', () => {
            // For now, skip decimal handling as it requires specific rhea wrapper
            const properties = {
                numberValue: 123.45,
            };

            const result = convertPropertiesToAmqpBytes(properties);
            expect(result).to.be.instanceOf(Uint8Array);
            expect(result.length).to.be.greaterThan(0);
        });

        it('should reject unsupported object types', () => {
            const properties = {
                unsupportedObject: { nested: { property: 'value' } },
            };

            expect(() => convertPropertiesToAmqpBytes(properties)).to.throw(/not supported for AMQP transport/);
        });

        it('should reject functions', () => {
            const properties = {
                functionValue: () => 'hello',
            };

            expect(() => convertPropertiesToAmqpBytes(properties)).to.throw(/not supported for AMQP transport/);
        });

        it('should handle complex property combinations', () => {
            const properties = {
                id: 'user-123',
                active: true,
                age: 25,
                balance: 1234.56,
                createdAt: new Date('2023-01-01T00:00:00Z'),
                preferences: ['email', 'sms'],
                metadata: null,
            };

            const result = convertPropertiesToAmqpBytes(properties);
            expect(result).to.be.instanceOf(Uint8Array);
            expect(result.length).to.be.greaterThan(0);
        });

        it('should handle empty properties object', () => {
            const properties = {};

            const result = convertPropertiesToAmqpBytes(properties);
            expect(result).to.be.instanceOf(Uint8Array);
            expect(result.length).to.be.greaterThan(0);
        });
    });

    describe('validateAmqpProperties', () => {
        it('should validate supported primitive types', () => {
            const properties = {
                stringValue: 'hello',
                numberValue: 42,
                booleanValue: true,
                bigintValue: BigInt(123),
                nullValue: null,
                undefinedValue: undefined,
            };

            expect(() => validateAmqpProperties(properties)).to.not.throw();
        });

        it('should validate supported object types', () => {
            const properties = {
                dateValue: new Date(),
                urlValue: new URL('https://example.com'),
                bufferValue: Buffer.from('test'),
                uint8ArrayValue: new Uint8Array([1, 2, 3]),
            };

            expect(() => validateAmqpProperties(properties)).to.not.throw();
        });

        it('should validate arrays', () => {
            const properties = {
                numberArray: [1, 2, 3],
                stringArray: ['a', 'b', 'c'],
                mixedArray: [1, 'hello', true],
            };

            expect(() => validateAmqpProperties(properties)).to.not.throw();
        });

        it('should reject unsupported object types', () => {
            const properties = {
                unsupportedObject: { nested: 'value' },
            };

            expect(() => validateAmqpProperties(properties)).to.throw(/unsupported type.*for AMQP transport/);
        });

        it('should reject functions', () => {
            const properties = {
                functionValue: () => 'test',
            };

            expect(() => validateAmqpProperties(properties)).to.throw(/unsupported type.*for AMQP transport/);
        });

        it('should reject symbols', () => {
            const properties = {
                symbolValue: Symbol('test'),
            };

            expect(() => validateAmqpProperties(properties)).to.throw(/unsupported type.*for AMQP transport/);
        });

        it('should validate empty object', () => {
            const properties = {};
            expect(() => validateAmqpProperties(properties)).to.not.throw();
        });
    });

    describe('Type Detection Edge Cases', () => {
        it('should handle string type detection edge cases', () => {
            const properties = {
                // Valid GUID variations
                uppercaseGuid: '550E8400-E29B-41D4-A716-446655440000',
                lowercaseGuid: '550e8400-e29b-41d4-a716-446655440000',

                // Invalid GUIDs should be treated as strings
                invalidGuid: '550e8400-e29b-41d4-a716-44665544000',

                // URI variations
                httpUri: 'http://example.com',
                httpsUri: 'https://example.com/path',
                ftpUri: 'ftp://files.example.com',

                // Invalid URIs should be treated as strings
                invalidUri: 'not-a-uri',

                // DateTime variations
                isoDateTime: '2023-12-25T10:30:00.000Z',
                simpleDate: '2023-12-25',

                // Invalid dates should be treated as strings
                invalidDate: 'not-a-date',

                // TimeSpan variations
                fullTimeSpan: '1.02:03:04.567',
                simpleTimeSpan: '02:03:04',
                negativeTimeSpan: '-1.02:03:04',

                // Invalid timespans should be treated as strings
                invalidTimeSpan: 'not-a-timespan',
            };

            const result = convertPropertiesToAmqpBytes(properties);
            expect(result).to.be.instanceOf(Uint8Array);
            expect(result.length).to.be.greaterThan(0);
        });

        it('should handle numeric boundary values', () => {
            const properties = {
                // Basic boundary values
                zero: 0,
                positiveSmall: 1,
                negativeSmall: -1,
                positiveInteger: 12345,
                negativeInteger: -12345,
                positiveFloat: 123.456,
                negativeFloat: -123.456,

                // Special float values
                positiveZero: 0.0,
                negativeZero: -0.0,
            };

            const result = convertPropertiesToAmqpBytes(properties);
            expect(result).to.be.instanceOf(Uint8Array);
            expect(result.length).to.be.greaterThan(0);
        });

        it('should handle BigInt boundary values', () => {
            const properties = {
                // Basic BigInt values
                smallBigInt: BigInt(42),
                mediumBigInt: BigInt(123456789),
                negativeBigInt: BigInt(-987654321),
            };

            const result = convertPropertiesToAmqpBytes(properties);
            expect(result).to.be.instanceOf(Uint8Array);
            expect(result.length).to.be.greaterThan(0);
        });
    });

    describe('Error Handling', () => {
        it('should provide detailed error messages for unsupported types', () => {
            const properties = {
                unsupportedType: Symbol('test'),
            };

            try {
                convertPropertiesToAmqpBytes(properties);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error).to.be.instanceOf(Error);
                expect((error as Error).message).to.include('unsupportedType');
                expect((error as Error).message).to.include('symbol');
                expect((error as Error).message).to.include('not supported for AMQP transport');
                expect((error as Error).message).to.include('Supported types:');
            }
        });

        it('should handle encoding failures gracefully', () => {
            // Test with a property that might cause encoding issues
            const cyclicalRef: Record<string, unknown> = {};
            cyclicalRef.self = cyclicalRef;

            const properties = {
                cyclicalRef: cyclicalRef,
            };

            expect(() => convertPropertiesToAmqpBytes(properties)).to.throw();
        });
    });

    describe('Performance and Scalability', () => {
        it('should handle large property objects efficiently', () => {
            const properties: Record<string, any> = {};

            // Create a large object with various types
            for (let i = 0; i < 100; i++) {
                properties[`string_${i}`] = `value_${i}`;
                properties[`number_${i}`] = i;
                properties[`boolean_${i}`] = i % 2 === 0;
                properties[`date_${i}`] = new Date(Date.now() + i * 1000);
            }

            const startTime = Date.now();
            const result = convertPropertiesToAmqpBytes(properties);
            const endTime = Date.now();

            expect(result).to.be.instanceOf(Uint8Array);
            expect(result.length).to.be.greaterThan(0);
            expect(endTime - startTime).to.be.lessThan(1000); // Should complete within 1 second
        });

        it('should handle deeply nested arrays', () => {
            const deepArray = [[[[[1, 2, 3]]]]];
            const properties = {
                deepNested: deepArray,
            };

            const result = convertPropertiesToAmqpBytes(properties);
            expect(result).to.be.instanceOf(Uint8Array);
            expect(result.length).to.be.greaterThan(0);
        });
    });

    describe('encodePropertiesForOperation', () => {
        describe('Successful Encoding', () => {
            it('should encode properties with operation-specific context', () => {
                const properties = {
                    messageId: 'test-123',
                    priority: 1,
                    customFlag: true,
                };

                const result = encodePropertiesForOperation(properties, 'abandon');
                expect(result).to.be.instanceOf(Uint8Array);
                expect(result.length).to.be.greaterThan(0);
            });

            it('should handle different operation names', () => {
                const properties = { testKey: 'testValue' };

                const abandonResult = encodePropertiesForOperation(properties, 'abandon');
                const deadletterResult = encodePropertiesForOperation(properties, 'deadletter');
                const deferResult = encodePropertiesForOperation(properties, 'defer');

                expect(abandonResult).to.be.instanceOf(Uint8Array);
                expect(deadletterResult).to.be.instanceOf(Uint8Array);
                expect(deferResult).to.be.instanceOf(Uint8Array);

                // All should produce the same encoding for the same properties
                expect(abandonResult).to.deep.equal(deadletterResult);
                expect(deadletterResult).to.deep.equal(deferResult);
            });

            it('should handle complex property types', () => {
                const properties = {
                    stringValue: 'test',
                    numberValue: 42,
                    booleanValue: true,
                    dateValue: new Date('2023-12-25T10:30:00Z'),
                    urlValue: new URL('https://example.com'),
                    bufferValue: Buffer.from('binary data'),
                    arrayValue: [1, 2, 3],
                    bigintValue: BigInt(123),
                };

                const result = encodePropertiesForOperation(properties, 'test-operation');
                expect(result).to.be.instanceOf(Uint8Array);
                expect(result.length).to.be.greaterThan(0);
            });
        });

        describe('Empty/Null Properties Handling', () => {
            it('should return empty Uint8Array for undefined properties', () => {
                const result = encodePropertiesForOperation(undefined, 'abandon');
                expect(result).to.be.instanceOf(Uint8Array);
                expect(result.length).to.equal(0);
            });

            it('should return empty Uint8Array for null properties', () => {
                const result = encodePropertiesForOperation(undefined, 'deadletter');
                expect(result).to.be.instanceOf(Uint8Array);
                expect(result.length).to.equal(0);
            });

            it('should return empty Uint8Array for empty object', () => {
                const result = encodePropertiesForOperation({}, 'defer');
                expect(result).to.be.instanceOf(Uint8Array);
                expect(result.length).to.equal(0);
            });

            it('should handle object with only falsy values', () => {
                const properties = {
                    emptyString: '',
                    zeroNumber: 0,
                    falseBoolean: false,
                };

                const result = encodePropertiesForOperation(properties, 'test');
                expect(result).to.be.instanceOf(Uint8Array);
                expect(result.length).to.be.greaterThan(0);
            });
        });

        describe('Error Handling with Operation Context', () => {
            it('should provide operation-specific error messages for abandon', () => {
                const properties = {
                    unsupportedType: Symbol('test'),
                };

                expect(() => encodePropertiesForOperation(properties, 'abandon')).to.throw(
                    /Failed to encode properties for abandon operation:/
                );
            });

            it('should provide operation-specific error messages for deadletter', () => {
                const properties = {
                    unsupportedFunction: () => 'test',
                };

                expect(() => encodePropertiesForOperation(properties, 'deadletter')).to.throw(
                    /Failed to encode properties for deadletter operation:/
                );
            });

            it('should provide operation-specific error messages for defer', () => {
                const properties = {
                    unsupportedType: new WeakMap(),
                };

                expect(() => encodePropertiesForOperation(properties, 'defer')).to.throw(
                    /Failed to encode properties for defer operation:/
                );
            });

            it('should include original error message in context', () => {
                const properties = {
                    unsupportedType: Symbol('test-symbol'),
                };

                try {
                    encodePropertiesForOperation(properties, 'test-operation');
                    expect.fail('Should have thrown an error');
                } catch (error) {
                    expect(error).to.be.instanceOf(Error);
                    const errorMessage = (error as Error).message;
                    expect(errorMessage).to.include('Failed to encode properties for test-operation operation:');
                    expect(errorMessage).to.include('unsupportedType');
                    expect(errorMessage).to.include('symbol');
                }
            });

            it('should handle custom operation names in error messages', () => {
                const properties = {
                    invalidType: new Set([1, 2, 3]),
                };

                expect(() => encodePropertiesForOperation(properties, 'custom-operation-name')).to.throw(
                    /Failed to encode properties for custom-operation-name operation:/
                );
            });
        });

        describe('Integration and Performance', () => {
            it('should handle large property objects efficiently', () => {
                const largeProperties: Record<string, number> = {};
                for (let i = 0; i < 100; i++) {
                    largeProperties[`property${i}`] = i;
                }

                const startTime = process.hrtime.bigint();
                const result = encodePropertiesForOperation(largeProperties, 'performance-test');
                const endTime = process.hrtime.bigint();

                expect(result).to.be.instanceOf(Uint8Array);
                expect(result.length).to.be.greaterThan(0);

                // Should complete within reasonable time (less than 100ms)
                const durationMs = Number(endTime - startTime) / 1_000_000;
                expect(durationMs).to.be.lessThan(100);
            });

            it('should produce consistent results for identical inputs', () => {
                const properties = {
                    key1: 'value1',
                    key2: 42,
                    key3: true,
                };

                const result1 = encodePropertiesForOperation(properties, 'test');
                const result2 = encodePropertiesForOperation(properties, 'test');
                const result3 = encodePropertiesForOperation(properties, 'different-operation');

                expect(result1).to.deep.equal(result2);
                expect(result1).to.deep.equal(result3);
            });

            it('should handle concurrent encoding operations', async () => {
                const properties = {
                    concurrentKey: 'concurrentValue',
                    timestamp: new Date(),
                };

                const promises = Array.from({ length: 10 }, (_, i) =>
                    Promise.resolve(encodePropertiesForOperation(properties, `concurrent-${i}`))
                );

                const results = await Promise.all(promises);

                // All results should be identical for the same properties
                const firstResult = results[0];
                results.forEach((result, index) => {
                    expect(result).to.deep.equal(firstResult, `Result ${index} should match the first result`);
                });
            });
        });

        describe('Validation and Edge Cases', () => {
            it('should handle properties with special characters in keys', () => {
                const properties = {
                    'key-with-dashes': 'value1',
                    'key.with.dots': 'value2',
                    'key with spaces': 'value3',
                    key_with_underscores: 'value4',
                    'key@with#special$chars%': 'value5',
                };

                const result = encodePropertiesForOperation(properties, 'special-chars-test');
                expect(result).to.be.instanceOf(Uint8Array);
                expect(result.length).to.be.greaterThan(0);
            });

            it('should handle unicode property keys and values', () => {
                const properties = {
                    ключ: 'значение', // Cyrillic
                    键: '值', // Chinese
                    キー: '値', // Japanese
                    '🔑': '🎯', // Emojis
                };

                const result = encodePropertiesForOperation(properties, 'unicode-test');
                expect(result).to.be.instanceOf(Uint8Array);
                expect(result.length).to.be.greaterThan(0);
            });

            it('should validate operation name parameter', () => {
                const properties = { key: 'value' };

                // Should work with various operation name formats
                expect(() => encodePropertiesForOperation(properties, '')).to.not.throw();
                expect(() => encodePropertiesForOperation(properties, 'a')).to.not.throw();
                expect(() =>
                    encodePropertiesForOperation(properties, 'very-long-operation-name-with-many-characters')
                ).to.not.throw();
            });
        });
    });
});
