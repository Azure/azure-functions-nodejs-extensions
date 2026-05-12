# Implement secure-aware gRPC transport

- Task ID: `harden-servicebus-grpc-transport`
- Round: 1
- Branch: worker/task-1
- Dependencies: (none)

## Description

Refactor the internal connection setup for Service Bus settlement. Extend `azure-functions-nodejs-extensions-servicebus/src/util/grpcUriBuilder.ts` or add a dedicated helper to prefer `--functions-uri`, derive a raw gRPC address plus security metadata, detect loopback hosts, and choose explicit channel credentials (`grpc.credentials.createSsl()` for secure/TLS URIs, `createInsecure()` only for supported loopback endpoints). Update `azure-functions-nodejs-extensions-servicebus/src/servicebus/ServiceBusMessageActions.ts` to consume that helper, and remove the insecure default from `azure-functions-nodejs-extensions-servicebus/src/grpcClientFactory.ts` so call sites must pass credentials intentionally. Keep the public settlement API and exported types unchanged, preserve current Azure Functions loopback behavior, and reject unsupported insecure remote endpoints instead of silently connecting.