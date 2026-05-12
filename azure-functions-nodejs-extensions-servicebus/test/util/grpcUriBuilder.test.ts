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

    it('should report only the missing arguments when some are present', () => {
        process.argv = ['node', 'script', '--host=localhost'];

        expect(() => GrpcUriBuilder.build()).to.throw(
            "Missing required arguments: 'port', 'functions-grpc-max-message-length'"
        );
    });

    it('should support space-separated argument form', () => {
        process.argv = [
            'node',
            'script',
            '--host',
            'localhost',
            '--port',
            '5000',
            '--functions-grpc-max-message-length',
            '123456',
        ];

        const result = GrpcUriBuilder.build();
        expect(result).to.deep.equal({
            uri: 'localhost:5000',
            grpcMaxMessageLength: 123456,
        });
    });

    it('should ignore unknown flags passed by the host process', () => {
        process.argv = [
            'node',
            'script',
            '--host=localhost',
            '--port=5000',
            '--functions-grpc-max-message-length=123456',
            '--some-unknown-flag=foo',
            '--workerId=abc',
        ];

        const result = GrpcUriBuilder.build();
        expect(result).to.deep.equal({
            uri: 'localhost:5000',
            grpcMaxMessageLength: 123456,
        });
    });

    it('should tolerate positional arguments', () => {
        process.argv = [
            'node',
            'script',
            'positional1',
            '--host=localhost',
            '--port=5000',
            'positional2',
            '--functions-grpc-max-message-length=123456',
        ];

        const result = GrpcUriBuilder.build();
        expect(result).to.deep.equal({
            uri: 'localhost:5000',
            grpcMaxMessageLength: 123456,
        });
    });

    it('should use the last value when a flag is repeated', () => {
        process.argv = [
            'node',
            'script',
            '--host=127.0.0.2',
            '--host=localhost',
            '--port=5000',
            '--functions-grpc-max-message-length=123456',
        ];

        const result = GrpcUriBuilder.build();
        expect(result.uri).to.equal('localhost:5000');
    });

    // The following tests document edge cases that are likely bugs in the
    // current implementation. Un-skip once the desired behavior is decided.

    it.skip('should accept 0 as a valid grpc max message length', () => {
        // Currently `if (!grpcMaxMessageLength)` rejects "0" because the
        // empty/zero check runs against the raw string. Today this throws
        // "Missing required arguments". Likely should be allowed (or rejected
        // with a clearer "invalid value" error).
        process.argv = ['node', 'script', '--host=localhost', '--port=5000', '--functions-grpc-max-message-length=0'];

        const result = GrpcUriBuilder.build();
        expect(result.grpcMaxMessageLength).to.equal(0);
    });

    it.skip('should reject a non-numeric grpc max message length', () => {
        // Currently produces { grpcMaxMessageLength: NaN } silently.
        process.argv = [
            'node',
            'script',
            '--host=localhost',
            '--port=5000',
            '--functions-grpc-max-message-length=not-a-number',
        ];

        expect(() => GrpcUriBuilder.build()).to.throw(/functions-grpc-max-message-length/);
    });
});
