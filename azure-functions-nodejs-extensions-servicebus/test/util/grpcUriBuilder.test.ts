// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from '@grpc/grpc-js';
import { expect } from 'chai';
import sinon from 'sinon';
import { GrpcUriBuilder } from '../../src/util/grpcUriBuilder';

describe('GrpcUriBuilder', () => {
    let originalArgv: string[];

    function setArgv(...args: string[]): void {
        process.argv = ['node', 'script', ...args];
    }

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
        setArgv('--host=localhost', '--port=5000', '--functions-grpc-max-message-length=123456');

        const result = GrpcUriBuilder.build();
        expect(result).to.deep.equal({
            uri: 'localhost:5000',
            grpcMaxMessageLength: 123456,
        });
    });

    it('should throw an error if host is missing', () => {
        setArgv('--port=5000', '--functions-grpc-max-message-length=123456');

        expect(() => GrpcUriBuilder.build()).to.throw("Missing required arguments: 'host'");
    });

    it('should throw an error if port is missing', () => {
        setArgv('--host=localhost', '--functions-grpc-max-message-length=123456');

        expect(() => GrpcUriBuilder.build()).to.throw("Missing required arguments: 'port'");
    });

    it('should throw an error if grpc max message length is missing', () => {
        setArgv('--host=localhost', '--port=5000');

        expect(() => GrpcUriBuilder.build()).to.throw(
            "Missing required arguments: 'functions-grpc-max-message-length'"
        );
    });

    it('should throw an error if all required arguments are missing', () => {
        setArgv();

        expect(() => GrpcUriBuilder.build()).to.throw(
            "Missing required arguments: 'host', 'port', 'functions-grpc-max-message-length'"
        );
    });

    it('should report only the missing arguments when some are present', () => {
        setArgv('--host=localhost');

        expect(() => GrpcUriBuilder.build()).to.throw(
            "Missing required arguments: 'port', 'functions-grpc-max-message-length'"
        );
    });

    it('should support space-separated argument form', () => {
        setArgv('--host', 'localhost', '--port', '5000', '--functions-grpc-max-message-length', '123456');

        const result = GrpcUriBuilder.build();
        expect(result).to.deep.equal({
            uri: 'localhost:5000',
            grpcMaxMessageLength: 123456,
        });
    });

    it('should ignore unknown flags passed by the host process', () => {
        setArgv(
            '--host=localhost',
            '--port=5000',
            '--functions-grpc-max-message-length=123456',
            '--some-unknown-flag=foo',
            '--workerId=abc'
        );

        const result = GrpcUriBuilder.build();
        expect(result).to.deep.equal({
            uri: 'localhost:5000',
            grpcMaxMessageLength: 123456,
        });
    });

    it('should tolerate positional arguments', () => {
        setArgv(
            'positional1',
            '--host=localhost',
            '--port=5000',
            'positional2',
            '--functions-grpc-max-message-length=123456'
        );

        const result = GrpcUriBuilder.build();
        expect(result).to.deep.equal({
            uri: 'localhost:5000',
            grpcMaxMessageLength: 123456,
        });
    });

    it('should use the last value when a flag is repeated', () => {
        setArgv('--host=127.0.0.2', '--host=localhost', '--port=5000', '--functions-grpc-max-message-length=123456');

        const result = GrpcUriBuilder.build();
        expect(result.uri).to.equal('localhost:5000');
    });

    it('should accept 0 as a valid grpc max message length', () => {
        setArgv('--host=localhost', '--port=5000', '--functions-grpc-max-message-length=0');

        const result = GrpcUriBuilder.build();
        expect(result.grpcMaxMessageLength).to.equal(0);
    });

    it('should reject a non-numeric grpc max message length', () => {
        setArgv('--host=localhost', '--port=5000', '--functions-grpc-max-message-length=not-a-number');

        expect(() => GrpcUriBuilder.build()).to.throw(/functions-grpc-max-message-length/);
    });

    describe('buildConnection()', () => {
        it('should prefer functions-uri over legacy host and port arguments', () => {
            const secureCredentials = { transport: 'tls' } as unknown as grpc.ChannelCredentials;
            const createSslStub = sinon.stub(grpc.credentials, 'createSsl').returns(secureCredentials);

            setArgv(
                '--functions-uri=https://Functions.Example.test:8443',
                '--host=localhost',
                '--port=5000',
                '--functions-grpc-max-message-length=123456'
            );

            const result = GrpcUriBuilder.buildConnection();

            expect(result.address).to.equal('functions.example.test:8443');
            expect(result.credentials).to.equal(secureCredentials);
            expect(result.grpcMaxMessageLength).to.equal(123456);
            expect(result.isLoopback).to.be.false;
            expect(result.isSecure).to.be.true;
            expect(createSslStub.calledOnce).to.be.true;
        });

        it('should fall back to host and port for loopback endpoints', () => {
            const loopbackCredentials = { transport: 'loopback' } as unknown as grpc.ChannelCredentials;
            const createInsecureStub = sinon.stub(grpc.credentials, 'createInsecure').returns(loopbackCredentials);

            setArgv('--host=127.0.0.1', '--port=5000', '--functions-grpc-max-message-length=123456');

            const result = GrpcUriBuilder.buildConnection();

            expect(result.address).to.equal('127.0.0.1:5000');
            expect(result.credentials).to.equal(loopbackCredentials);
            expect(result.isLoopback).to.be.true;
            expect(result.isSecure).to.be.false;
            expect(createInsecureStub.calledOnce).to.be.true;
        });

        it('should allow insecure loopback functions-uri values and apply the default port', () => {
            const loopbackCredentials = { transport: 'loopback' } as unknown as grpc.ChannelCredentials;
            const createInsecureStub = sinon.stub(grpc.credentials, 'createInsecure').returns(loopbackCredentials);

            setArgv('--functions-uri=http://localhost', '--functions-grpc-max-message-length=123456');

            const result = GrpcUriBuilder.buildConnection();

            expect(result.address).to.equal('localhost:80');
            expect(result.credentials).to.equal(loopbackCredentials);
            expect(result.isLoopback).to.be.true;
            expect(result.isSecure).to.be.false;
            expect(createInsecureStub.calledOnce).to.be.true;
        });

        it('should create secure credentials for TLS functions-uri values and apply the default port', () => {
            const secureCredentials = { transport: 'tls' } as unknown as grpc.ChannelCredentials;
            const createSslStub = sinon.stub(grpc.credentials, 'createSsl').returns(secureCredentials);

            setArgv('--functions-uri=grpcs://servicebus.example.test', '--functions-grpc-max-message-length=123456');

            const result = GrpcUriBuilder.buildConnection();

            expect(result.address).to.equal('servicebus.example.test:443');
            expect(result.credentials).to.equal(secureCredentials);
            expect(result.isLoopback).to.be.false;
            expect(result.isSecure).to.be.true;
            expect(createSslStub.calledOnce).to.be.true;
        });

        it('should reject insecure non-loopback functions-uri endpoints', () => {
            setArgv('--functions-uri=http://example.com:7071', '--functions-grpc-max-message-length=123456');

            expect(() => GrpcUriBuilder.buildConnection()).to.throw(
                'Unsupported insecure gRPC endpoint "http://example.com:7071". Only loopback endpoints may use insecure transport.'
            );
        });

        it('should reject unsupported functions-uri protocols before port validation', () => {
            setArgv('--functions-uri=ftp://example.com', '--functions-grpc-max-message-length=123456');

            expect(() => GrpcUriBuilder.buildConnection()).to.throw('Unsupported functions-uri protocol "ftp:"');
        });

        it('should reject insecure non-loopback host and port endpoints', () => {
            setArgv('--host=10.0.0.5', '--port=5000', '--functions-grpc-max-message-length=123456');

            expect(() => GrpcUriBuilder.buildConnection()).to.throw(
                'Unsupported insecure gRPC endpoint "10.0.0.5:5000". Only loopback endpoints may use insecure transport.'
            );
        });

        it('should reject host values with invalid 127.x.x.x octets', () => {
            setArgv('--host=127.999.999.999', '--port=5000', '--functions-grpc-max-message-length=123456');

            expect(() => GrpcUriBuilder.buildConnection()).to.throw(
                'Unsupported insecure gRPC endpoint "127.999.999.999:5000". Only loopback endpoints may use insecure transport.'
            );
        });

        it('should reject non dotted-quad 127 host values', () => {
            setArgv('--host=127', '--port=5000', '--functions-grpc-max-message-length=123456');

            expect(() => GrpcUriBuilder.buildConnection()).to.throw(
                'Unsupported insecure gRPC endpoint "127:5000". Only loopback endpoints may use insecure transport.'
            );
        });
    });
});
