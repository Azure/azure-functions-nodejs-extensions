// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { ModelBindingData, ResourceFactoryResolver } from '@azure/functions-extensions-base';
import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { AzureServiceBusMessageFactory } from '../../src/servicebus/azureServiceBusMessageFactory';
import { registerServiceBusMessageFactory } from '../../src/servicebus/registerServiceBusMessageFactory';
import { ServiceBusMessageManager } from '../../types';

// Configure chai with sinon-chai
chai.use(sinonChai);

describe('registerServiceBusMessageFactory', () => {
    let resourceFactoryResolverStub: sinon.SinonStubbedInstance<ResourceFactoryResolver>;
    let azureServiceBusMessageFactoryStub: sinon.SinonStub;
    let consoleLogStub: sinon.SinonStub;

    // Constants used in the module
    const AZURE_SERVICE_BUS = 'AzureServiceBusReceivedMessage';

    // Mock ModelBindingData for testing
    const createMockModelBindingData = (data?: any): ModelBindingData => ({
        source: 'ServiceBusTrigger',
        content: Buffer.from(JSON.stringify(data || { test: 'message' })),
        contentType: 'application/json',
    });

    const createMockServiceBusMessage = () => ({
        body: 'test message',
        messageId: 'test-message-id',
        lockToken: '12345678-1234-1234-1234-123456789abc',
        enqueuedTimeUtc: new Date(),
        sequenceNumber: 1,
        deliveryCount: 0,
    });

    beforeEach(() => {
        // Create stubbed instance of ResourceFactoryResolver
        resourceFactoryResolverStub = {
            hasResourceFactory: sinon.stub(),
            registerResourceFactory: sinon.stub(),
            getResourceFactory: sinon.stub(),
            removeResourceFactory: sinon.stub(),
        } as unknown as sinon.SinonStubbedInstance<ResourceFactoryResolver>;

        // Stub the getInstance method to return our mock
        sinon.stub(ResourceFactoryResolver, 'getInstance').returns(resourceFactoryResolverStub);

        // Stub AzureServiceBusMessageFactory
        azureServiceBusMessageFactoryStub = sinon
            .stub(AzureServiceBusMessageFactory, 'buildServiceBusMessageFromModelBindingData')
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            .returns(createMockServiceBusMessage() as unknown as ServiceBusMessageManager);

        // Stub console methods
        consoleLogStub = sinon.stub(console, 'log');
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('Successful Registration', () => {
        it('should register Service Bus message factory when not already registered', () => {
            // Arrange
            resourceFactoryResolverStub.hasResourceFactory.returns(false);

            // Act
            registerServiceBusMessageFactory();

            // Assert
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(resourceFactoryResolverStub.hasResourceFactory).to.have.been.calledOnceWith(AZURE_SERVICE_BUS);
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(resourceFactoryResolverStub.registerResourceFactory).to.have.been.calledOnceWith(
                AZURE_SERVICE_BUS,
                sinon.match.func
            );
        });

        it('should register factory with correct parameters', () => {
            // Arrange
            resourceFactoryResolverStub.hasResourceFactory.returns(false);

            // Act
            registerServiceBusMessageFactory();

            // Assert
            const registerCall = resourceFactoryResolverStub.registerResourceFactory.getCall(0);
            expect(registerCall.args[0]).to.equal(AZURE_SERVICE_BUS);
            expect(registerCall.args[1]).to.be.a('function');
        });

        it('should create a factory function that calls AzureServiceBusMessageFactory', () => {
            // Arrange
            resourceFactoryResolverStub.hasResourceFactory.returns(false);
            const mockModelBindingData = createMockModelBindingData();
            const expectedResult = createMockServiceBusMessage();

            // Act
            registerServiceBusMessageFactory();

            // Get the registered factory function
            const factoryFunction = resourceFactoryResolverStub.registerResourceFactory.getCall(0).args[1];

            // Call the factory function
            const result = factoryFunction(mockModelBindingData);

            // Assert
            expect(azureServiceBusMessageFactoryStub).to.have.been.calledOnceWith(mockModelBindingData);
            expect(result).to.deep.equal(expectedResult);
        });

        it('should handle single ModelBindingData objects', () => {
            // Arrange
            resourceFactoryResolverStub.hasResourceFactory.returns(false);
            const mockModelBindingData = createMockModelBindingData({ messageId: 'single-message' });

            // Act
            registerServiceBusMessageFactory();
            const factoryFunction = resourceFactoryResolverStub.registerResourceFactory.getCall(0).args[1];
            factoryFunction(mockModelBindingData);

            // Assert
            expect(azureServiceBusMessageFactoryStub).to.have.been.calledOnceWith(mockModelBindingData);
        });

        it('should handle arrays of ModelBindingData objects', () => {
            // Arrange
            resourceFactoryResolverStub.hasResourceFactory.returns(false);
            const mockModelBindingDataArray = [
                createMockModelBindingData({ messageId: 'message-1' }),
                createMockModelBindingData({ messageId: 'message-2' }),
                createMockModelBindingData({ messageId: 'message-3' }),
            ];

            // Act
            registerServiceBusMessageFactory();
            const factoryFunction = resourceFactoryResolverStub.registerResourceFactory.getCall(0).args[1];
            factoryFunction(mockModelBindingDataArray);

            // Assert
            expect(azureServiceBusMessageFactoryStub).to.have.been.calledOnceWith(mockModelBindingDataArray);
        });
    });

    describe('Duplicate Registration Prevention', () => {
        it('should not register factory when already registered', () => {
            // Arrange
            resourceFactoryResolverStub.hasResourceFactory.returns(true);

            // Act
            registerServiceBusMessageFactory();

            // Assert
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(resourceFactoryResolverStub.hasResourceFactory).to.have.been.calledOnceWith(AZURE_SERVICE_BUS);
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(resourceFactoryResolverStub.registerResourceFactory).to.not.have.been.called;
            expect(consoleLogStub).to.not.have.been.called;
        });

        it('should check for existing factory before attempting registration', () => {
            // Arrange
            resourceFactoryResolverStub.hasResourceFactory.returns(true);

            // Act
            registerServiceBusMessageFactory();

            // Assert
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(resourceFactoryResolverStub.hasResourceFactory).to.have.been.calledBefore(
                // eslint-disable-next-line @typescript-eslint/unbound-method
                resourceFactoryResolverStub.registerResourceFactory as sinon.SinonStub
            );
        });

        it('should handle multiple registration attempts gracefully', () => {
            // Arrange
            resourceFactoryResolverStub.hasResourceFactory.returns(false).onFirstCall().returns(true);

            // Act
            registerServiceBusMessageFactory(); // First call should register
            registerServiceBusMessageFactory(); // Second call should be skipped

            // Assert
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(resourceFactoryResolverStub.hasResourceFactory).to.have.been.calledTwice;
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(resourceFactoryResolverStub.registerResourceFactory).to.have.been.calledOnce;
        });
    });

    describe('Error Handling', () => {
        it('should throw descriptive error when ResourceFactoryResolver.getInstance() fails', () => {
            // Arrange
            (ResourceFactoryResolver.getInstance as sinon.SinonStub).throws(new Error('Resolver unavailable'));

            // Act & Assert
            expect(() => registerServiceBusMessageFactory()).to.throw(
                'Service Bus Message Factory initialization failed: Resolver unavailable'
            );
        });

        it('should throw descriptive error when hasResourceFactory() fails', () => {
            // Arrange
            resourceFactoryResolverStub.hasResourceFactory.throws(new Error('Has factory check failed'));

            // Act & Assert
            expect(() => registerServiceBusMessageFactory()).to.throw(
                'Service Bus Message Factory initialization failed: Has factory check failed'
            );
        });

        it('should throw descriptive error when registerResourceFactory() fails', () => {
            // Arrange
            resourceFactoryResolverStub.hasResourceFactory.returns(false);
            resourceFactoryResolverStub.registerResourceFactory.throws(new Error('Registration failed'));

            // Act & Assert
            expect(() => registerServiceBusMessageFactory()).to.throw(
                'Service Bus Message Factory initialization failed: Registration failed'
            );
        });

        it('should handle non-Error exceptions properly', () => {
            // Arrange
            resourceFactoryResolverStub.hasResourceFactory.throws('String error');

            // Act & Assert
            expect(() => registerServiceBusMessageFactory()).to.throw(
                'Service Bus Message Factory initialization failed: Sinon-provided String error'
            );
        });

        it('should handle null/undefined exceptions', () => {
            // Arrange
            resourceFactoryResolverStub.hasResourceFactory.throws(null);

            // Act & Assert
            expect(() => registerServiceBusMessageFactory()).to.throw(
                'Service Bus Message Factory initialization failed: Error'
            );
        });

        it('should propagate errors from factory function execution', () => {
            // Arrange
            resourceFactoryResolverStub.hasResourceFactory.returns(false);
            azureServiceBusMessageFactoryStub.throws(new Error('Factory execution failed'));

            // Act
            registerServiceBusMessageFactory();
            const factoryFunction = resourceFactoryResolverStub.registerResourceFactory.getCall(0).args[1];

            // Assert
            expect(() => factoryFunction(createMockModelBindingData())).to.throw('Factory execution failed');
        });
    });

    describe('Constants and Configuration', () => {
        it('should use correct factory name constant', () => {
            // Arrange
            resourceFactoryResolverStub.hasResourceFactory.returns(false);

            // Act
            registerServiceBusMessageFactory();

            // Assert
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(resourceFactoryResolverStub.hasResourceFactory).to.have.been.calledWith(
                'AzureServiceBusReceivedMessage'
            );
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(resourceFactoryResolverStub.registerResourceFactory).to.have.been.calledWith(
                'AzureServiceBusReceivedMessage',
                sinon.match.func
            );
        });

        it('should maintain constant consistency across calls', () => {
            // Arrange
            resourceFactoryResolverStub.hasResourceFactory.returns(false);

            // Act
            registerServiceBusMessageFactory();

            // Assert
            const hasFactoryCall = resourceFactoryResolverStub.hasResourceFactory.getCall(0);
            const registerCall = resourceFactoryResolverStub.registerResourceFactory.getCall(0);

            expect(hasFactoryCall.args[0]).to.equal(registerCall.args[0]);
        });
    });

    describe('Integration with Azure Functions Extensions Base', () => {
        it('should integrate properly with ResourceFactoryResolver singleton', () => {
            // Arrange
            resourceFactoryResolverStub.hasResourceFactory.returns(false);

            // Act
            registerServiceBusMessageFactory();

            // Assert
            expect(ResourceFactoryResolver['getInstance']).to.have.been.calledOnce;
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(resourceFactoryResolverStub.hasResourceFactory).to.have.been.calledOnce;
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(resourceFactoryResolverStub.registerResourceFactory).to.have.been.calledOnce;
        });

        it('should work with different ResourceFactoryResolver implementations', () => {
            // Arrange
            const alternativeResolver = {
                hasResourceFactory: sinon.stub().returns(false),
                registerResourceFactory: sinon.stub(),
                getResourceFactory: sinon.stub(),
                removeResourceFactory: sinon.stub(),
            };

            (ResourceFactoryResolver.getInstance as sinon.SinonStub).returns(alternativeResolver);

            // Act
            registerServiceBusMessageFactory();

            // Assert
            expect(alternativeResolver.hasResourceFactory).to.have.been.calledOnceWith(AZURE_SERVICE_BUS);
            expect(alternativeResolver.registerResourceFactory).to.have.been.calledOnce;
        });
    });

    describe('Type Safety and Validation', () => {
        it('should maintain type safety for ModelBindingData parameters', () => {
            // Arrange
            resourceFactoryResolverStub.hasResourceFactory.returns(false);
            registerServiceBusMessageFactory();
            const factoryFunction = resourceFactoryResolverStub.registerResourceFactory.getCall(0).args[1];

            // Act & Assert - These should not throw TypeScript compilation errors
            factoryFunction(createMockModelBindingData());
            factoryFunction([createMockModelBindingData(), createMockModelBindingData()]);
        });

        it('should handle ModelBindingData with various content types', () => {
            // Arrange
            resourceFactoryResolverStub.hasResourceFactory.returns(false);
            registerServiceBusMessageFactory();
            const factoryFunction = resourceFactoryResolverStub.registerResourceFactory.getCall(0).args[1];

            const testCases = [
                { contentType: 'application/json', data: { json: true } },
                { contentType: 'text/plain', data: 'plain text' },
                { contentType: 'application/xml', data: '<xml>content</xml>' },
                { contentType: 'application/octet-stream', data: Buffer.from([1, 2, 3]) },
            ];

            // Act & Assert
            testCases.forEach((testCase) => {
                const mockData = createMockModelBindingData(testCase.data);
                mockData.contentType = testCase.contentType;

                expect(() => factoryFunction(mockData)).to.not.throw();
                expect(azureServiceBusMessageFactoryStub).to.have.been.calledWith(mockData);
            });
        });
    });
});
