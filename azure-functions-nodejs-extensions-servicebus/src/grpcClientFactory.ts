// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

/**
 * Creates and returns a gRPC client for the specified service.
 *
 * @template T - The type of gRPC client to create, extends grpc.Client
 *
 * @param options - The configuration options for creating the gRPC client
 * @param options.protoPath - Path to the .proto file that defines the service
 * @param options.serviceName - Name of the service in the proto file
 * @param options.address - The server address to connect to (e.g., "localhost:50051")
 * @param options.credentials - gRPC channel credentials to use for secure communication (defaults to insecure)
 * @param options.grpcMaxMessageLength - Maximum message length in bytes for both sending and receiving gRPC messages
 * @param options.includeDirs - Additional directories to search for imported .proto files
 *
 * @returns A new instance of the specified gRPC client
 *
 * @throws {Error} When the specified service name is not found in the proto file
 *
 * @example
 * const client = createGrpcClient<MyServiceClient>({
 *   protoPath: './protos/my_service.proto',
 *   serviceName: 'MyService',
 *   address: 'localhost:50051',
 *   grpcMaxMessageLength: 4 * 1024 * 1024, // 4MB
 * });
 */
export function createGrpcClient<T extends grpc.Client = grpc.Client>({
    protoPath,
    serviceName,
    address,
    credentials = grpc.credentials.createInsecure(),
    grpcMaxMessageLength,
    includeDirs = [],
}: {
    protoPath: string;
    serviceName: string;
    address: string;
    credentials?: grpc.ChannelCredentials;
    grpcMaxMessageLength: number;
    includeDirs?: string[];
}): T {
    // Load the .proto file and generate the package definition
    const packageDefinition = protoLoader.loadSync(protoPath, {
        keepCase: false,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
        includeDirs: [path.dirname(protoPath), ...includeDirs],
    });

    // Load the gRPC object from the package definition
    const grpcObject = grpc.loadPackageDefinition(packageDefinition) as Record<string, any>;

    // Retrieve the service client constructor from the loaded gRPC object
    const ServiceClientConstructor = grpcObject[serviceName] as grpc.ServiceClientConstructor;

    // Throw an error if the service is not found in the proto file
    if (!ServiceClientConstructor) {
        throw new Error(`Service "${serviceName}" not found in proto file: ${protoPath}`);
    }

    const clientOptions: grpc.ChannelOptions = {
        'grpc.max_send_message_length': grpcMaxMessageLength,
        'grpc.max_receive_message_length': grpcMaxMessageLength,
    };

    // Create and return a new instance of the service client
    return new ServiceClientConstructor(address, credentials, clientOptions) as unknown as T;
}
