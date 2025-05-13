// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { expect } from 'chai';
import { StorageBlobClientOptions } from 'types/storage';
import {
    getConnectionString,
    isSystemBasedManagedIdentity,
    isUserBasedManagedIdentity,
    parseConnectionDetails,
} from '../../src/storage-blob/utils';

describe('Storage Blob Utils', () => {
    // Store original env vars
    const originalEnv = { ...process.env };

    beforeEach(() => {
        // Clear relevant environment variables before each test
        delete process.env['TestConnection'];
        delete process.env['TestConnection__serviceUri'];
        delete process.env['TestConnection__blobServiceUri'];
        delete process.env['TestConnection__clientId'];
        delete process.env['TestConnection__credential'];
    });

    afterEach(() => {
        // Restore original env vars
        process.env = { ...originalEnv };
    });

    describe('getConnectionString', () => {
        it('should throw when connection string is undefined', () => {
            expect(() => getConnectionString(undefined)).to.throw(
                'Storage account connection string cannot be undefined. Please provide a connection string.'
            );
        });

        it('should return direct connection string when available', () => {
            // Arrange
            const expectedValue =
                'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=abc123==;EndpointSuffix=core.windows.net';
            process.env['TestConnection'] = expectedValue;

            // Act
            const result = getConnectionString('TestConnection');

            // Assert
            expect(result).to.equal(expectedValue);
        });

        it('should return service URI when using managed identity with blob input', () => {
            // Arrange
            const expectedValue = 'https://teststorage.blob.core.windows.net';
            process.env['TestConnection__serviceUri'] = expectedValue;

            // Act
            const result = getConnectionString('TestConnection');

            // Assert
            expect(result).to.equal(expectedValue);
        });

        it('should return blob service URI when using managed identity with blob trigger', () => {
            // Arrange
            const expectedValue = 'https://teststorage.blob.core.windows.net';
            process.env['TestConnection__blobServiceUri'] = expectedValue;

            // Act
            const result = getConnectionString('TestConnection');

            // Assert
            expect(result).to.equal(expectedValue);
        });

        it('should throw when connection string does not exist in environment variables', () => {
            expect(() => getConnectionString('NonExistentConnection')).to.throw(
                'Storage account connection string NonExistentConnection does not exist. ' +
                    'Please make sure that it is a defined environment variable.'
            );
        });

        it('should prioritize direct connection string over service URI variants', () => {
            // Arrange - set all three possible environment variables
            const expectedValue =
                'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=abc123==;EndpointSuffix=core.windows.net';
            process.env['TestConnection'] = expectedValue;
            process.env['TestConnection__serviceUri'] = 'https://wrong.blob.core.windows.net';
            process.env['TestConnection__blobServiceUri'] = 'https://alsowrong.blob.core.windows.net';

            // Act
            const result = getConnectionString('TestConnection');

            // Assert
            expect(result).to.equal(expectedValue);
        });
    });

    describe('isSystemBasedManagedIdentity', () => {
        it('should return true when service URI is defined', () => {
            // Arrange
            process.env['TestConnection__serviceUri'] = 'https://teststorage.blob.core.windows.net';

            // Act & Assert
            expect(isSystemBasedManagedIdentity('TestConnection')).to.be.true;
        });

        it('should return true when blob service URI is defined', () => {
            // Arrange
            process.env['TestConnection__blobServiceUri'] = 'https://teststorage.blob.core.windows.net';

            // Act & Assert
            expect(isSystemBasedManagedIdentity('TestConnection')).to.be.true;
        });

        it('should return false when neither URI is defined', () => {
            // Act & Assert
            expect(isSystemBasedManagedIdentity('TestConnection')).to.be.false;
        });

        it('should return true when both URI variants are defined', () => {
            // Arrange
            process.env['TestConnection__serviceUri'] = 'https://teststorage.blob.core.windows.net';
            process.env['TestConnection__blobServiceUri'] = 'https://teststorage.blob.core.windows.net';

            // Act & Assert
            expect(isSystemBasedManagedIdentity('TestConnection')).to.be.true;
        });
    });

    describe('isUserBasedManagedIdentity', () => {
        it('should return true when all required properties are defined', () => {
            // Arrange
            process.env['TestConnection__clientId'] = '11111111-1111-1111-1111-111111111111';
            process.env['TestConnection__credential'] = 'managedidentity';
            process.env['TestConnection__serviceUri'] = 'https://teststorage.blob.core.windows.net';

            // Act & Assert
            expect(isUserBasedManagedIdentity('TestConnection')).to.be.true;
        });

        it('should return false when clientId is missing', () => {
            // Arrange
            process.env['TestConnection__credential'] = 'managedidentity';
            process.env['TestConnection__serviceUri'] = 'https://teststorage.blob.core.windows.net';

            // Act & Assert
            expect(isUserBasedManagedIdentity('TestConnection')).to.be.false;
        });

        it('should return false when credential is missing', () => {
            // Arrange
            process.env['TestConnection__clientId'] = '11111111-1111-1111-1111-111111111111';
            process.env['TestConnection__serviceUri'] = 'https://teststorage.blob.core.windows.net';

            // Act & Assert
            expect(isUserBasedManagedIdentity('TestConnection')).to.be.false;
        });

        it('should return false when serviceUri is missing', () => {
            // Arrange
            process.env['TestConnection__clientId'] = '11111111-1111-1111-1111-111111111111';
            process.env['TestConnection__credential'] = 'managedidentity';

            // Act & Assert
            expect(isUserBasedManagedIdentity('TestConnection')).to.be.false;
        });

        it('should return false when all are missing', () => {
            // Act & Assert
            expect(isUserBasedManagedIdentity('TestConnection')).to.be.false;
        });
    });
});

describe('Utils - parseConnectionDetails', () => {
    describe('successful parsing', () => {
        it('should correctly parse valid JSON with all required properties', () => {
            // Arrange
            const validJson = JSON.stringify({
                Connection: 'TestConnection',
                ContainerName: 'test-container',
                BlobName: 'test-blob.txt',
            });
            const buffer = Buffer.from(validJson);

            // Act
            const result = parseConnectionDetails(buffer);

            // Assert
            expect(result).to.deep.equal({
                Connection: 'TestConnection',
                ContainerName: 'test-container',
                BlobName: 'test-blob.txt',
            });
        });

        it('should parse JSON with additional properties', () => {
            // Arrange
            const jsonWithExtra = JSON.stringify({
                Connection: 'TestConnection',
                ContainerName: 'test-container',
                BlobName: 'test-blob.txt',
                ExtraProperty: 'should be included',
            });
            const buffer = Buffer.from(jsonWithExtra);

            // Act
            const result = parseConnectionDetails(buffer) as StorageBlobClientOptions & { ExtraProperty: string };

            // Assert
            expect(result.Connection).to.equal('TestConnection');
            expect(result.ContainerName).to.equal('test-container');
            expect(result.BlobName).to.equal('test-blob.txt');
            expect(result.ExtraProperty).to.equal('should be included');
        });

        it('should handle empty JSON object', () => {
            // Arrange
            const emptyJson = JSON.stringify({});
            const buffer = Buffer.from(emptyJson);

            // Act
            const result = parseConnectionDetails(buffer);

            // Assert
            expect(result).to.deep.equal({});
        });
    });

    describe('error handling', () => {
        it('should throw error when buffer is null', () => {
            // Act & Assert
            expect(() => parseConnectionDetails(null)).to.throw('Connection details content is null or undefined');
        });

        it('should throw error when buffer is undefined', () => {
            // Act & Assert
            expect(() => parseConnectionDetails(undefined)).to.throw('Connection details content is null or undefined');
        });

        it('should throw error when JSON is invalid', () => {
            // Arrange
            const invalidJson = Buffer.from('{invalid: json}');

            // Act & Assert
            expect(() => parseConnectionDetails(invalidJson)).to.throw(SyntaxError);
        });

        it('should throw error when buffer contains non-JSON data', () => {
            // Arrange
            const nonJsonBuffer = Buffer.from('This is not JSON');

            // Act & Assert
            expect(() => parseConnectionDetails(nonJsonBuffer)).to.throw(SyntaxError);
        });
    });

    describe('edge cases', () => {
        it('should handle JSON with empty string values', () => {
            // Arrange
            const emptyValuesJson = JSON.stringify({
                Connection: '',
                ContainerName: '',
                BlobName: '',
            });
            const buffer = Buffer.from(emptyValuesJson);

            // Act
            const result = parseConnectionDetails(buffer);

            // Assert
            expect(result).to.deep.equal({
                Connection: '',
                ContainerName: '',
                BlobName: '',
            });
        });

        it('should handle JSON with Unicode characters', () => {
            // Arrange
            const unicodeJson = JSON.stringify({
                Connection: 'TestConnection',
                ContainerName: 'test-контейнер',
                BlobName: '测试文件.txt',
            });
            const buffer = Buffer.from(unicodeJson);

            // Act
            const result = parseConnectionDetails(buffer);

            // Assert
            expect(result).to.deep.equal({
                Connection: 'TestConnection',
                ContainerName: 'test-контейнер',
                BlobName: '测试文件.txt',
            });
        });

        it('should handle JSON with missing properties', () => {
            // Arrange
            const incompleteJson = JSON.stringify({
                Connection: 'TestConnection',
                // Missing ContainerName and BlobName
            });
            const buffer = Buffer.from(incompleteJson);

            // Act
            const result = parseConnectionDetails(buffer);

            // Assert
            expect(result).to.deep.equal({
                Connection: 'TestConnection',
            });
            expect(result.ContainerName).to.be.undefined;
            expect(result.BlobName).to.be.undefined;
        });
    });
});
