## Azure Functions Node.js Extensions - Service Bus

This project provides extensions for working with Azure Service Bus in Azure Functions using Node.js. It simplifies the integration and interaction with Service Bus, enabling developers to build scalable and efficient serverless applications.

### Features

-   **Service Bus Trigger**: Automatically trigger Azure Functions when messages arrive in queues or subscriptions.
-   **Service Bus Input Binding**: Read Service Bus messages as input to your function.
-   **Service Bus Output Binding**: Send messages to Service Bus queues and topics.
-   **Cached Client Management**: Optimized client reuse with intelligent caching
-   **Resource Management**: Proper disposal patterns for Azure resource clients
-   **Performance Optimizations**: Reduced overhead for messaging operations

### Prerequisites

-   [Node.js](https://nodejs.org/) (LTS version recommended)
-   [Azure Functions Core Tools](https://learn.microsoft.com/azure/azure-functions/functions-run-local)
-   An active [Azure subscription](https://azure.microsoft.com/free/)

### Installation

To install the required dependencies, run:

```bash
npm install @azure/functions-extensions-servicebus
```

### Usage

1. **Set up your Azure Service Bus namespace**:

  - Create a Service Bus namespace in the Azure portal.
  - Create queues, topics, and subscriptions as needed.

2. **Configure your function**:

  - Update the `function.json` file to include the appropriate bindings for Service Bus.

3. **Import and initialize the extension:**

```javascript
import '@azure/functions-extensions-servicebus'; // Ensures at the top of the file
```

Using in Azure Functions

```javascript
import "@azure/functions-extensions-servicebus";
import {ServiceBusMessageContext} from "@azure/functions-extensions-servicebus"
import { app, InvocationContext } from "@azure/functions";

export async function serviceBusTrigger1(
  serviceBusClient: ServiceBusClient,
  message: unknown,
  context: InvocationContext
): Promise<void> {
  context.log(
  `Service Bus function processed message: ${JSON.stringify(message)}`
  );
  try {
    //Actual Message
    context.log("triggerMetadata: ", context.triggerMetadata);
    context.log('Completing the message', ServiceBusMessageContext.messages[0]);
    //Use serviceBusMessageActions to action on the messages
    await ServiceBusMessageContext.serviceBusMessageActions.complete(ServiceBusMessageContext.messages[0]);
    context.log('Completing the body', ServiceBusMessageContext.messages[0].body);
  }
}

app.serviceBusQueue("serviceBusTrigger1", {
  connection: "ServiceBusConnection",
  queueName: "myqueue",
  sdkBinding: true, //Ensure this is set to true
  autoCompleteMessages: false, //Exposing this so that customer can take action on the messages
  handler: serviceBusTrigger1,
});
```

4. **Run locally**:

-   Use the Azure Functions Core Tools to run your function locally:
  ```bash
  func start
  ```

5. **Deploy to Azure**:

-   Deploy your function to Azure using the following command:
  ```bash
  func azure functionapp publish <YourFunctionAppName>
  ```

### Contributing

Contributions are welcome! Please follow the [contribution guidelines](CONTRIBUTING.md) when submitting issues or pull requests.

### License

This project is licensed under the [MIT License](LICENSE).

### Resources

-   [Azure Functions Documentation](https://learn.microsoft.com/azure/azure-functions/)
-   [Azure Service Bus Documentation](https://learn.microsoft.com/azure/service-bus-messaging/)
-   [Azure SDK for JavaScript](https://learn.microsoft.com/azure/javascript/)
