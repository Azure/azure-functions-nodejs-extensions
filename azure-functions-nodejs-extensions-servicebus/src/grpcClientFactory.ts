// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { SETTLEMENT_PROTO_CONTENT } from './constants/settlementProtoConstant';

// Cache for the loaded package definition to avoid repeated parsing
let cachedPackageDefinition: grpc.GrpcObject | null = null;

/**
 * Creates and returns a gRPC client for the Settlement service using embedded proto definition.
 * This approach completely eliminates the need for external .proto files by creating a temporary
 * proto file from the embedded content, loading it, and then cleaning up.
 *
 * @template T - The type of gRPC client to create, extends grpc.Client
 *
 * @param options - The configuration options for creating the gRPC client
 * @param options.serviceName - Name of the service in the proto definition
 * @param options.address - The server address to connect to (e.g., "localhost:50051")
 * @param options.credentials - gRPC channel credentials to use for secure communication (defaults to insecure)
 * @param options.grpcMaxMessageLength - Maximum message length in bytes for both sending and receiving gRPC messages
 *
 * @returns A new instance of the specified gRPC client
 */
export function createGrpcClient<T extends grpc.Client = grpc.Client>({
    serviceName,
    address,
    credentials = grpc.credentials.createInsecure(),
    grpcMaxMessageLength,
}: {
    serviceName: string;
    address: string;
    credentials?: grpc.ChannelCredentials;
    grpcMaxMessageLength: number;
}): T {
    // Load the embedded proto definition if not already cached
    if (!cachedPackageDefinition) {
        // Create a temporary proto file from the embedded content
        const tempDir = os.tmpdir();
        const tempProtoFile = path.join(tempDir, `settlement.proto`);

        try {
            // Write the proto content to a temporary file
            fs.writeFileSync(tempProtoFile, SETTLEMENT_PROTO_CONTENT);

            // Load the proto definition from the temporary file
            const packageDefinition = protoLoader.loadSync(tempProtoFile, {
                keepCase: false,
                longs: String,
                enums: String,
                defaults: true,
                oneofs: true,
                includeDirs: [tempDir],
            });

            cachedPackageDefinition = grpc.loadPackageDefinition(packageDefinition);
        } finally {
            // Clean up the temporary file
            try {
                fs.unlinkSync(tempProtoFile);
            } catch {
                // Ignore cleanup errors
            }
        }
    }

    // Retrieve the service client constructor from the loaded gRPC object
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    const ServiceClientConstructor = (cachedPackageDefinition as any)[serviceName] as grpc.ServiceClientConstructor;

    // Throw an error if the service is not found
    if (!ServiceClientConstructor) {
        throw new Error(`Service "${serviceName}" not found in embedded proto definition`);
    }

    const clientOptions: grpc.ChannelOptions = {
        'grpc.max_send_message_length': grpcMaxMessageLength,
        'grpc.max_receive_message_length': grpcMaxMessageLength,
    };

    // Create and return a new instance of the service client
    return new ServiceClientConstructor(address, credentials, clientOptions) as unknown as T;
}
