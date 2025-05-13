# Azure Functions Node.js Extensions Base

The Azure Functions Node.js Extensions Base Library provides core interfaces, classes, and utilities for building extension components for Azure Functions in JavaScript and TypeScript.

## Features

-   **Resource Factory Resolver**: Core singleton class for registering and retrieving Azure resource factories
-   **Model Binding Support**: Types and interfaces for binding Azure resources to Function parameters
-   **Type-Safe Bindings**: Type definitions for supported Azure binding types
-   **Extension Registration**: Foundation for registering extensions in Azure Functions

## Getting Started

To use this library in your Azure Functions project, follow these steps:

1. **Install the package**:

    ```bash
    npm install @azure/functions-extensions-base
    ```

2. **Import and use the components**:

    ```javascript
    import { resourceFactoryResolver, ModelBindingData } from '@azure/functions-extensions-base';
    // Register a factory for creating Azure Storage clients
    resourceFactoryResolver.registerResourceFactory('AzureStorageBlobs', (modelBindingData: ModelBindingData) => {
        // Create and return storage client
        return new StorageBlobClient(/* configuration from modelBindingData */);
    });
    ```

3. **Creating a Client with Resource Factory Resolver**

```javascript
import { resourceFactoryResolver, ModelBindingData } from '@azure/functions-extensions-base';

// Client code to get a client instance
const modelBindingData: ModelBindingData = {
    content: Buffer.from(
        JSON.stringify({
            /* connection details */
        })
    ),
    contentType: 'application/json',
    source: 'connection-string-source',
};

const storageClient = resourceFactoryResolver.createClient('AzureStorageBlobs', modelBindingData);
```

4. **Checking for Factory Registration**

```javascript
import { resourceFactoryResolver } from '@azure/functions-extensions-base';

// Check if a factory is registered
if (resourceFactoryResolver.hasResourceFactory('AzureStorageBlobs')) {
    console.log('Storage Blob client factory is registered');
}
```

## API Reference

**ResourceFactoryResolver:**
The ResourceFactoryResolver is a singleton class that manages resource factory registrations.

```javascript
// Get the singleton instance
const resolver = resourceFactoryResolver;

// Register a factory
resolver.registerResourceFactory(resourceType: string, factory: ResourceFactory): void

// Check if factory exists
resolver.hasResourceFactory(resourceType: string): boolean

// Create client instance
resolver.createClient(resourceType: string, modelBindingData: ModelBindingData): unknown
```

**ModelBindingData:**
Interface for data used in resource binding.

```javascript
interface ModelBindingData {
    content?: Buffer | null;
    contentType?: string | null;
    source?: string | null;
    version?: string | null;
}
```

## Integration with Azure Functions

This library serves as a foundation for Azure Functions extensions that provide additional bindings or integration capabilities. For examples of extensions built on this library, see:

-   @azure/functions-extensions-blob
-   @azure/functions-extensions-servicebus

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Submit a pull request with a detailed description of your changes.

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

## Resources

-   [Azure Functions Documentation](https://learn.microsoft.com/azure/azure-functions/)
-   [Azure SDK for JavaScript](https://github.com/Azure/azure-sdk-for-js)

---

## Reporting Issues

If you find a bug or have a suggestion for improvement, please [open an issue](https://github.com/Azure/azure-functions-nodejs-extensions/issues) on our GitHub repository.
