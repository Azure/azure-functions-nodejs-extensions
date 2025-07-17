// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import parseArgs from 'minimist';

/**
 *  GrpcUriBuilder is a utility class to build a gRPC URI from command line arguments.
 *  It expects two arguments: 'host' and 'port'.
 */
export class GrpcUriBuilder {
    /**
     *  Builds a gRPC URI from command line arguments.
     *  The expected arguments are 'host' and 'port'.
     * @returns A string representing the gRPC URI in the format "host:port".
     * @throws Error if 'host' or 'port' arguments are missing.
     */
    static build(): { uri: string; grpcMaxMessageLength: number } {
        const parsedArgs = parseArgs(process.argv.slice(2));
        console.log('Parsed arguments:', parsedArgs);
        const { host, port, 'functions-grpc-max-message-length': grpcMaxMessageLength } = parsedArgs;

        const missing: string[] = [];
        if (!host) missing.push("'host'");
        if (!port) missing.push("'port'");
        if (!grpcMaxMessageLength) missing.push("'functions-grpc-max-message-length'");

        if (missing.length) {
            throw new Error(`Missing required arguments: ${missing.join(', ')}`);
        }

        return { uri: `${String(host)}:${String(port)}`, grpcMaxMessageLength: Number(grpcMaxMessageLength) };
    }
}
