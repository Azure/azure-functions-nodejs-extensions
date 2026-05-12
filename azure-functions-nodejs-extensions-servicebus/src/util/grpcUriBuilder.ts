// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { parseArgs } from 'node:util';
import * as grpc from '@grpc/grpc-js';

/**
 *  GrpcUriBuilder is a utility class to build a gRPC URI from command line arguments.
 *  It prefers the modern `functions-uri` flag, and falls back to the legacy `host`/`port`
 *  pair when necessary.
 */
export class GrpcUriBuilder {
    /**
     *  Builds a raw gRPC address from command line arguments.
     * @returns A string representing the gRPC address in the format "host:port".
     * @throws Error if the required arguments are missing.
     */
    static build(): { uri: string; grpcMaxMessageLength: number } {
        const { address, grpcMaxMessageLength } = this.buildConnection();
        return { uri: address, grpcMaxMessageLength };
    }

    /**
     * Resolves the gRPC endpoint and explicit channel credentials from command line arguments.
     */
    static buildConnection(): {
        address: string;
        credentials: grpc.ChannelCredentials;
        grpcMaxMessageLength: number;
        isLoopback: boolean;
        isSecure: boolean;
    } {
        const { values: parsedArgs } = parseArgs({
            args: process.argv.slice(2),
            options: {
                host: { type: 'string' },
                port: { type: 'string' },
                'functions-uri': { type: 'string' },
                'functions-grpc-max-message-length': { type: 'string' },
            },
            strict: false,
        });

        const host = parsedArgs.host;
        const port = parsedArgs.port;
        const functionsUri = parsedArgs['functions-uri'];
        const grpcMaxMessageLengthArg = parsedArgs['functions-grpc-max-message-length'];

        const missing: string[] = [];
        if (!functionsUri) {
            if (!host) missing.push("'host'");
            if (!port) missing.push("'port'");
        }
        if (!grpcMaxMessageLengthArg) {
            missing.push("'functions-grpc-max-message-length'");
        }
        if (missing.length) {
            throw new Error(`Missing required arguments: ${missing.join(', ')}`);
        }

        const grpcMaxMessageLength = Number(grpcMaxMessageLengthArg);
        if (!Number.isFinite(grpcMaxMessageLength)) {
            throw new Error("Invalid argument 'functions-grpc-max-message-length': expected a finite number.");
        }

        if (functionsUri) {
            return this.buildConnectionFromFunctionsUri(String(functionsUri), grpcMaxMessageLength);
        }

        return this.buildLegacyLoopbackConnection(String(host), String(port), grpcMaxMessageLength);
    }

    private static buildConnectionFromFunctionsUri(
        functionsUri: string,
        grpcMaxMessageLength: number
    ): {
        address: string;
        credentials: grpc.ChannelCredentials;
        grpcMaxMessageLength: number;
        isLoopback: boolean;
        isSecure: boolean;
    } {
        let parsedUri: URL;
        try {
            parsedUri = new URL(functionsUri);
        } catch {
            throw new Error(`Invalid argument 'functions-uri': ${functionsUri}`);
        }

        const protocol = parsedUri.protocol.toLowerCase();
        const host = this.normalizeHost(parsedUri.hostname);
        const port = parsedUri.port || this.getDefaultPort(protocol);

        if (!host) {
            throw new Error(`Invalid argument 'functions-uri': ${functionsUri}`);
        }
        if (!port) {
            throw new Error(
                `Invalid argument 'functions-uri': ${functionsUri}. A port is required for the ${protocol} scheme.`
            );
        }

        const isLoopback = this.isLoopbackHost(host);
        const isSecure = this.isSecureProtocol(protocol);
        const credentials = this.createChannelCredentials({
            endpoint: functionsUri,
            isLoopback,
            isSecure,
        });

        return {
            address: this.formatAddress(host, port),
            credentials,
            grpcMaxMessageLength,
            isLoopback,
            isSecure,
        };
    }

    private static buildLegacyLoopbackConnection(
        host: string,
        port: string,
        grpcMaxMessageLength: number
    ): {
        address: string;
        credentials: grpc.ChannelCredentials;
        grpcMaxMessageLength: number;
        isLoopback: boolean;
        isSecure: boolean;
    } {
        const normalizedHost = this.normalizeHost(host);
        const isLoopback = this.isLoopbackHost(normalizedHost);
        const address = this.formatAddress(normalizedHost, port);

        return {
            address,
            credentials: this.createChannelCredentials({
                endpoint: address,
                isLoopback,
                isSecure: false,
            }),
            grpcMaxMessageLength,
            isLoopback,
            isSecure: false,
        };
    }

    private static createChannelCredentials({
        endpoint,
        isLoopback,
        isSecure,
    }: {
        endpoint: string;
        isLoopback: boolean;
        isSecure: boolean;
    }): grpc.ChannelCredentials {
        if (isSecure) {
            return grpc.credentials.createSsl();
        }

        if (isLoopback) {
            return grpc.credentials.createInsecure();
        }

        throw new Error(
            `Unsupported insecure gRPC endpoint "${endpoint}". Only loopback endpoints may use insecure transport.`
        );
    }

    private static isSecureProtocol(protocol: string): boolean {
        switch (protocol) {
            case 'https:':
            case 'grpcs:':
                return true;
            case 'http:':
            case 'grpc:':
                return false;
            default:
                throw new Error(`Unsupported functions-uri protocol "${protocol}"`);
        }
    }

    private static getDefaultPort(protocol: string): string | undefined {
        switch (protocol) {
            case 'http:':
            case 'grpc:':
                return '80';
            case 'https:':
            case 'grpcs:':
                return '443';
            default:
                return undefined;
        }
    }

    private static isLoopbackHost(host: string): boolean {
        return host === 'localhost' || host === '::1' || /^127(?:\.\d{1,3}){0,3}$/.test(host);
    }

    private static normalizeHost(host: string): string {
        return host
            .replace(/^\[(.*)\]$/, '$1')
            .trim()
            .toLowerCase();
    }

    private static formatAddress(host: string, port: string): string {
        return host.includes(':') ? `[${host}]:${port}` : `${host}:${port}`;
    }
}
