// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path = require('path');

/**
 *  Creates a gRPC client for a specified service defined in a .proto file.
 *  This function loads the .proto file, constructs the service client, and returns it.
 * @param param0 - Configuration for creating a gRPC client.
 * @param param0.protoPath - Path to the .proto file defining the gRPC service.
 * @param param0.serviceName - Name of the service to create a client for.
 * @returns A gRPC client instance for the specified service.
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
