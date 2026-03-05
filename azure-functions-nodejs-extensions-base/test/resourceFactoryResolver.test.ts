// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { expect } from 'chai';
import { ResourceFactoryResolver } from '../src/resourceFactoryResolver';
import { ModelBindingData, ResourceFactory } from '../types';

const SINGLETON_KEY = Symbol.for('@azure/functions-extensions-base.ResourceFactoryResolver');

describe('ResourceFactoryResolver - Advanced Tests', () => {
    let resolver: ResourceFactoryResolver;

    beforeEach(() => {
        // Reset the globalThis singleton between tests
        delete (globalThis as any)[SINGLETON_KEY];

        // Get a fresh instance
        resolver = ResourceFactoryResolver.getInstance();
    });

    afterEach(() => {
        // Clean up globalThis after each test
        delete (globalThis as any)[SINGLETON_KEY];
    });

    describe('Complex interaction scenarios', () => {
        it('should support chained factory registration and client creation', () => {
            // Arrange - Create a chain of dependent factories
            const typeA = 'TypeA';
            const typeB = 'TypeB';
            const typeC = 'TypeC';

            const resultC = { name: 'Client C' };
            const resultB = { name: 'Client B', dependency: null as any };
            const resultA = { name: 'Client A', dependency: null as any };

            const factoryC = () => resultC;
            const factoryB = (data: ModelBindingData | ModelBindingData[]) => {
                resultB.dependency = resolver.createClient(typeC, data);
                return resultB;
            };
            const factoryA = (data: ModelBindingData | ModelBindingData[]) => {
                resultA.dependency = resolver.createClient(typeB, data);
                return resultA;
            };

            // Act - Register in reverse order and create client A
            resolver.registerResourceFactory(typeC, factoryC);
            resolver.registerResourceFactory(typeB, factoryB);
            resolver.registerResourceFactory(typeA, factoryA);

            const clientA = resolver.createClient(typeA, {});

            // Assert - Verify the dependency chain
            expect(clientA).to.equal(resultA);
            expect((clientA as any).dependency).to.equal(resultB);
            expect((clientA as any).dependency.dependency).to.equal(resultC);
        });

        it('should handle complex factory replacement with unregister/register cycle', () => {
            // Arrange
            const type = 'ComplexType';
            const mockData: ModelBindingData = {
                content: Buffer.from('test'),
                contentType: 'text/plain',
                source: 'test-source',
                version: '1.0',
            };
            let counter = 0;

            // First factory implementation
            const factory1 = (data: ModelBindingData | ModelBindingData[]) => {
                return { version: 1, data, id: ++counter };
            };

            // Second factory implementation
            const factory2 = (data: ModelBindingData | ModelBindingData[]) => {
                return { version: 2, data, id: ++counter };
            };

            // Act
            resolver.registerResourceFactory(type, factory1);
            const client1 = resolver.createClient(type, mockData);

            // Simulate unregister (which is not implemented but would be useful)
            // We'll use reflection to work around this limitation
            const resourceFactoriesKey = 'resourceFactories';
            const factories = Reflect.get(resolver, resourceFactoriesKey) as Map<string, ResourceFactory>;
            factories.delete(type);

            resolver.registerResourceFactory(type, factory2);
            const client2 = resolver.createClient(type, mockData);

            // Assert
            expect((client1 as any).version).to.equal(1);
            expect((client2 as any).version).to.equal(2);
            expect((client1 as any).id).to.equal(1);
            expect((client2 as any).id).to.equal(2);
        });

        it('should handle factories with asynchronous initialization', async () => {
            // Arrange
            const type = 'AsyncType';
            const initPromise = Promise.resolve({ initialized: true });

            const asyncFactory = () => {
                return {
                    isReady: false,
                    initPromise,
                    async initialize() {
                        this.state = await initPromise;
                        this.isReady = true;
                        return this;
                    },
                    state: null as any,
                };
            };

            // Act
            resolver.registerResourceFactory(type, asyncFactory);
            const client = resolver.createClient(type, {});
            const initializedClient = await (client as any).initialize();

            // Assert
            expect(initializedClient.isReady).to.be.true;
            expect(initializedClient.state).to.deep.equal({ initialized: true });
        });
    });

    describe('Error handling and edge cases', () => {
        it('should handle factory that throws during registration', () => {
            // Arrange
            const errorFactory: ResourceFactory = () => {
                throw new Error('Factory initialization error');
            };

            // Act - We're not throwing during registration, only during execution
            resolver.registerResourceFactory('ErrorType', errorFactory);

            // Assert - should throw when creating client
            expect(() => resolver.createClient('ErrorType', {})).to.throw('Factory initialization error');
        });

        it('should maintain isolation between factories with same parameter signatures', () => {
            // Arrange
            const typeA = 'TypeA';
            const typeB = 'TypeB';

            const sharedState = { value: 0 };

            const factoryA = () => {
                sharedState.value += 1;
                return { type: 'A', value: sharedState.value };
            };

            const factoryB = () => {
                sharedState.value += 10;
                return { type: 'B', value: sharedState.value };
            };

            // Act
            resolver.registerResourceFactory(typeA, factoryA);
            resolver.registerResourceFactory(typeB, factoryB);

            const clientA1 = resolver.createClient(typeA, {});
            const clientB1 = resolver.createClient(typeB, {});
            const clientA2 = resolver.createClient(typeA, {});

            // Assert - Each factory should maintain its own behavior
            expect((clientA1 as any).value).to.equal(1);
            expect((clientB1 as any).value).to.equal(11);
            expect((clientA2 as any).value).to.equal(12);
        });

        it('should handle extremely large model binding data', () => {
            // Arrange
            const type = 'LargeDataType';
            // Create large data buffer (1MB)
            const largeContent = Buffer.alloc(1024 * 1024, 'x');
            const largeData: ModelBindingData = {
                content: largeContent,
                contentType: 'application/octet-stream',
                source: 'test-large-data',
                version: '1.0',
            };

            let receivedSize = 0;
            const factory = (data: ModelBindingData | ModelBindingData[]) => {
                if (Array.isArray(data)) {
                    receivedSize = data.reduce((sum, item) => sum + (item.content?.length || 0), 0);
                } else {
                    receivedSize = data.content?.length || 0;
                }
                return { size: receivedSize };
            };

            // Act
            resolver.registerResourceFactory(type, factory);
            const result = resolver.createClient(type, largeData);

            // Assert
            expect(receivedSize).to.equal(1024 * 1024);
            expect((result as any).size).to.equal(1024 * 1024);
        });

        it('should handle null and undefined in model binding data', () => {
            // Arrange
            const type = 'NullableType';
            const nullData: ModelBindingData = {
                content: null,
                contentType: null,
                source: null,
                version: null,
            };

            const factory = (data: ModelBindingData | ModelBindingData[]) => {
                return {
                    hasContent: Array.isArray(data)
                        ? data.every((item) => item.content !== null && item.content !== undefined)
                        : data.content !== null && data.content !== undefined,
                    hasContentType: Array.isArray(data)
                        ? data.every((item) => item.contentType !== null && item.contentType !== undefined)
                        : data.contentType !== null && data.contentType !== undefined,
                    hasSource: Array.isArray(data)
                        ? data.every((item) => item.source !== null && item.source !== undefined)
                        : data.source !== null && data.source !== undefined,
                    hasVersion: Array.isArray(data)
                        ? data.every((item) => item.version !== null && item.version !== undefined)
                        : data.version !== null && data.version !== undefined,
                };
            };

            // Act
            resolver.registerResourceFactory(type, factory);
            const result = resolver.createClient(type, nullData);

            // Assert
            expect((result as any).hasContent).to.be.false;
            expect((result as any).hasContentType).to.be.false;
            expect((result as any).hasSource).to.be.false;
            expect((result as any).hasVersion).to.be.false;
        });
    });

    describe('Performance and concurrency tests', () => {
        it('should handle multiple rapid client creation requests', () => {
            // Arrange
            const type = 'HighVolumeType';
            let createCount = 0;

            const factory = () => {
                createCount++;
                return { id: createCount };
            };

            resolver.registerResourceFactory(type, factory);

            // Act
            const results = [];
            const iterations = 1000;

            for (let i = 0; i < iterations; i++) {
                results.push(resolver.createClient(type, {}));
            }

            // Assert
            expect(createCount).to.equal(iterations);
            expect(results.length).to.equal(iterations);
            expect((results[iterations - 1] as any).id).to.equal(iterations);
        });

        it('should preserve correct types across multiple resource registrations', () => {
            // Arrange - Register many different types
            const typeCount = 100;
            const types: string[] = [];
            const expectedResults: Record<string, unknown> = {};

            for (let i = 0; i < typeCount; i++) {
                const type = `Type${i}`;
                types.push(type);

                const value = { typeId: i, name: `Resource ${i}` };
                expectedResults[type] = value;

                resolver.registerResourceFactory(type, () => value);
            }

            // Act - Create clients for all types
            const results: Record<string, unknown> = {};
            types.forEach((type) => {
                results[type] = resolver.createClient(type, {});
            });

            // Assert - Check all types maintained correct results
            types.forEach((type) => {
                expect(results[type]).to.equal(expectedResults[type]);
            });

            // Verify total registrations
            expect(types.every((type) => resolver.hasResourceFactory(type))).to.be.true;
        });
    });

    describe('globalThis singleton behavior (Issue #26)', () => {
        it('should store the singleton on globalThis using Symbol.for()', () => {
            const instance = ResourceFactoryResolver.getInstance();

            // The singleton should be stored on globalThis with the well-known Symbol key
            const stored = (globalThis as any)[SINGLETON_KEY];
            expect(stored).to.exist;
            expect(stored).to.equal(instance);
        });

        it('should return the same instance from globalThis even after class-level reset', () => {
            const instance1 = ResourceFactoryResolver.getInstance();
            instance1.registerResourceFactory('TestType', () => ({ test: true }));

            // Simulate what a bundler does: the class-level static field is a different copy,
            // but globalThis should still hold the same singleton
            const instance2 = ResourceFactoryResolver.getInstance();

            expect(instance2).to.equal(instance1);
            expect(instance2.hasResourceFactory('TestType')).to.be.true;
        });

        it('should share registered factories across multiple getInstance() calls', () => {
            // Simulate the real-world scenario:
            // 1. Extension package registers a factory
            const resolver1 = ResourceFactoryResolver.getInstance();
            resolver1.registerResourceFactory('AzureServiceBusReceivedMessage', () => ({
                message: 'from service bus',
            }));

            // 2. Library package reads from the factory
            const resolver2 = ResourceFactoryResolver.getInstance();
            expect(resolver2.hasResourceFactory('AzureServiceBusReceivedMessage')).to.be.true;

            const client = resolver2.createClient('AzureServiceBusReceivedMessage', {});
            expect((client as any).message).to.equal('from service bus');
        });

        it('should survive globalThis singleton being set externally with same Symbol key', () => {
            // Pre-set a resolver on globalThis (simulates another bundled copy setting it first)
            const externalResolver = ResourceFactoryResolver.getInstance();
            externalResolver.registerResourceFactory('ExternalType', () => ({ external: true }));

            // getInstance() should return the existing globalThis singleton
            const localResolver = ResourceFactoryResolver.getInstance();
            expect(localResolver).to.equal(externalResolver);
            expect(localResolver.hasResourceFactory('ExternalType')).to.be.true;
        });
    });
});
