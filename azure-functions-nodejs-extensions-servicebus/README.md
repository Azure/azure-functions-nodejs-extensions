## Azure Functions Node.js Extensions - Blob

This project provides extensions for working with Azure Blob Storage in Azure Functions using Node.js. It simplifies the integration and interaction with Blob Storage, enabling developers to build scalable and efficient serverless applications.

### Features

-   **Blob Trigger**: Automatically trigger Azure Functions when a blob is created or updated in a specified container.
-   **Blob Input Binding**: Read blob content as input to your function.
-   **Cached Client Management**: Optimized client reuse with intelligent caching
-   **Resource Management**: Proper disposal patterns for Azure resource clients
-   **Performance Optimizations**: Reduced overhead for blob operations

### Prerequisites

-   [Node.js](https://nodejs.org/) (LTS version recommended)
-   [Azure Functions Core Tools](https://learn.microsoft.com/azure/azure-functions/functions-run-local)
-   An active [Azure subscription](https://azure.microsoft.com/free/)

### Installation

To install the required dependencies, run:

```bash
npm install @azure/functions-extensions-blob
```

### Usage

1. **Set up your Azure Blob Storage account**:

    - Create a storage account in the Azure portal.
    - Create a container within the storage account.

2. **Configure your function**:

    - Update the `function.json` file to include the appropriate bindings for Blob Storage.

3. **Import and initialize the extension:**

```javascript
import '@azure/functions-extensions-blob'; // Ensures at the top of the file
```

Using in Azure Functions

```javascript
import "@azure/functions-extensions-blob"; // Ensures side effects run
import { StorageBlobClient } from "@azure/functions-extensions-blob";
import { app, InvocationContext } from "@azure/functions";

export async function storageBlobTrigger1(
  blobStorageClient: StorageBlobClient,
  context: InvocationContext
): Promise<void> {
  context.log(
    `Storage blob function processed blob "${context.triggerMetadata.name}"`
  );
  try {
     // Use the cached client for better performance
    const downloadBlockBlobResponse =
      await blobStorageClient.blobClient.download();
// Additional operations...

  }
}

app.storageBlob("storageBlobTrigger1", {
  path: "snippets/SomeFolder/{name}",
  connection: "AzureWebJobsStorage",
  sdkBinding: true, //Ensure this is set to true
  handler: storageBlobTrigger1,
});


```

4. **Run locally**:

-   Use the Azure Functions Core Tools to run your function locally:
    `bash
     func start
     `

4. **Deploy to Azure**:

-   Deploy your function to Azure using the following command:
    `bash
      func azure functionapp publish <YourFunctionAppName>
      `

### Contributing

Contributions are welcome! Please follow the [contribution guidelines](CONTRIBUTING.md) when submitting issues or pull requests.

### License

This project is licensed under the [MIT License](LICENSE).

### Resources

-   [Azure Functions Documentation](https://learn.microsoft.com/azure/azure-functions/)
-   [Azure Blob Storage Documentation](https://learn.microsoft.com/azure/storage/blobs/)
-   [Azure SDK for JavaScript](https://learn.microsoft.com/azure/javascript/)
