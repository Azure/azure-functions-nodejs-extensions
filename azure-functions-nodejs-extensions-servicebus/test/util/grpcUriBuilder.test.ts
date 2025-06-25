// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { expect } from 'chai';
import sinon from 'sinon';
import { GrpcUriBuilder } from '../../src/util/grpcUriBuilder';

describe('GrpcUriBuilder', () => {
    let originalArgv: string[];

    beforeEach(() => {
        // Save the original process.argv
        originalArgv = process.argv;
    });

    afterEach(() => {
        // Restore original argv after each test
        process.argv = originalArgv;
        sinon.restore();
    });

    it('should build URI correctly when all arguments are provided', () => {
        process.argv = [
            'node',
            'script',
            '--host=localhost',
            '--port=5000',
            '--functions-grpc-max-message-length=123456',
        ];

        const result = GrpcUriBuilder.build();
        expect(result).to.deep.equal({
            uri: 'localhost:5000',
            grpcMaxMessageLength: 123456,
        });
    });

    it('should throw an error if host is missing', () => {
        process.argv = ['node', 'script', '--port=5000', '--functions-grpc-max-message-length=123456'];

        expect(() => GrpcUriBuilder.build()).to.throw("Missing required arguments: 'host'");
    });

    it('should throw an error if port is missing', () => {
        process.argv = ['node', 'script', '--host=localhost', '--functions-grpc-max-message-length=123456'];

        expect(() => GrpcUriBuilder.build()).to.throw("Missing required arguments: 'port'");
    });

    it('should throw an error if grpc max message length is missing', () => {
        process.argv = ['node', 'script', '--host=localhost', '--port=5000'];

        expect(() => GrpcUriBuilder.build()).to.throw(
            "Missing required arguments: 'functions-grpc-max-message-length'"
        );
    });

    it('should throw an error if all required arguments are missing', () => {
        process.argv = ['node', 'script'];

        expect(() => GrpcUriBuilder.build()).to.throw(
            "Missing required arguments: 'host', 'port', 'functions-grpc-max-message-length'"
        );
    });
});
