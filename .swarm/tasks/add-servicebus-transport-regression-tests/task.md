# Add transport policy regression tests

- Task ID: `add-servicebus-transport-regression-tests`
- Round: 1
- Branch: worker/task-2
- Dependencies: harden-servicebus-grpc-transport

## Description

Update the unit suite to cover the new credential policy. Adjust `azure-functions-nodejs-extensions-servicebus/test/servicebus/ServiceBusMessageActions.test.ts` and `azure-functions-nodejs-extensions-servicebus/test/util/grpcUriBuilder.test.ts` (or add a new helper test file) to verify `functions-uri` parsing, host/port fallback, loopback insecure allowance, secure credential selection for TLS URIs, and failure/guardrail behavior for insecure non-loopback endpoints. Replace the current insecure-by-default assertion with expectations on explicit credential selection, and run the servicebus package tests in a dependency-enabled environment or CI to confirm no settlement API regressions after the refactor.