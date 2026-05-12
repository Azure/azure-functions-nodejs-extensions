There is a SFI work item in this file - azure-functions-nodejs-extensions-servicebus/src/servicebus/ServiceBusMessageActions.ts

Multiple language workers use plaintext/insecure gRPC channels, enabling MITM attacks.
Node.js extensions: Uses grpc.credentials.createInsecure for ServiceBus message actions

Can you fix it? It would be great to identify these things - 
- Is the fix necessary?
- What was the historical context of designing the code as is? Was it intentional or a missed gap?
- Can you confirm if there will be any regressions if the fix is made? 
- Will there be a contract or a breaking change for the customer?
- How well is it tested?