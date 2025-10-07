// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Embedded protobuf definition as string - eliminates the need for external .proto files
const SETTLEMENT_PROTO_CONTENT = `
syntax = "proto3";

import "google/protobuf/empty.proto";
import "google/protobuf/wrappers.proto";
import "google/protobuf/timestamp.proto";

// this namespace will be shared between isolated worker and WebJobs extension so make it somewhat generic
option csharp_namespace = "Microsoft.Azure.ServiceBus.Grpc";

// The settlement service definition.
service Settlement {
  // Completes a message
  rpc Complete (CompleteRequest) returns (google.protobuf.Empty) {}

  // Abandons a message
  rpc Abandon (AbandonRequest) returns (google.protobuf.Empty) {}

  // Deadletters a message
  rpc Deadletter (DeadletterRequest) returns (google.protobuf.Empty) {}

  // Defers a message
  rpc Defer (DeferRequest) returns (google.protobuf.Empty) {}

  // Renew message lock
  rpc RenewMessageLock (RenewMessageLockRequest) returns (google.protobuf.Empty) {}

  // Get session state
  rpc GetSessionState (GetSessionStateRequest) returns (GetSessionStateResponse) {}

  // Set session state
  rpc SetSessionState (SetSessionStateRequest) returns (google.protobuf.Empty) {}

  // Release session
  rpc ReleaseSession (ReleaseSessionRequest) returns (google.protobuf.Empty) {}

  // Renew session lock
  rpc RenewSessionLock (RenewSessionLockRequest) returns (RenewSessionLockResponse) {}
}

// The complete message request containing the locktoken.
message CompleteRequest {
  string locktoken = 1;
}

// The abandon message request containing the locktoken and properties to modify.
message AbandonRequest {
  string locktoken = 1;
  bytes propertiesToModify = 2;
}

// The deadletter message request containing the locktoken and properties to modify along with the reason/description.
message DeadletterRequest {
  string locktoken = 1;
  bytes propertiesToModify = 2;
  google.protobuf.StringValue deadletterReason = 3;
  google.protobuf.StringValue deadletterErrorDescription = 4;
}

// The defer message request containing the locktoken and properties to modify.
message DeferRequest {
  string locktoken = 1;
  bytes propertiesToModify = 2;
}

// The renew message lock request containing the locktoken.
message RenewMessageLockRequest {
  string locktoken = 1;
}

// The get message request.
message GetSessionStateRequest {
  string sessionId = 1;
}

// The set message request.
message SetSessionStateRequest {
  string sessionId = 1;
  bytes sessionState = 2;
}

// Get response containing the session state.
message GetSessionStateResponse {
  bytes sessionState = 1;
}

// Release session.
message ReleaseSessionRequest {
  string sessionId = 1;
}

// Renew session lock.
message RenewSessionLockRequest {
  string sessionId = 1;
}

// Renew session lock.
message RenewSessionLockResponse {
  google.protobuf.Timestamp lockedUntil = 1;
}
`;

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
        const tempProtoFile = path.join(tempDir, `settlement-${Date.now()}.proto`);

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
