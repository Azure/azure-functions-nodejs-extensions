# @azure/functions-extensions-express

Express integration for Azure Functions - run Express apps natively within Azure Functions with full middleware and streaming support.

## Features

- **Native Express** - Express runs as a real HTTP server, not an adapter
- **Full Middleware Support** - All Express middleware works without modification
- **Streaming** - Server-Sent Events and large responses stream natively
- **Zero Code Changes** - Use your existing Express app as-is

## Installation

```bash
npm install @azure/functions-extensions-express express
```

## Quick Start

```typescript
import express from 'express';
import { expressApp } from '@azure/functions-extensions-express';

// Create your Express app
const app = express();

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.get('/users', (req, res) => {
    res.json([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
    ]);
});

// Register with Azure Functions
expressApp('api', app, {
    route: 'api/{*path}',
    basePath: '/api'
});
```

## Streaming Example (Server-Sent Events)

```typescript
import express from 'express';
import { expressApp } from '@azure/functions-extensions-express';

const app = express();

app.get('/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let count = 0;
    const interval = setInterval(() => {
        res.write(`data: ${JSON.stringify({ event: ++count })}\n\n`);
        if (count >= 10) {
            clearInterval(interval);
            res.end();
        }
    }, 1000);
});

expressApp('api', app, {
    route: 'api/{*path}',
    basePath: '/api',
    enableStreaming: true
});
```

## API Reference

### `expressApp(name, app, options?)`

Registers an Express application as an Azure Function.

**Parameters:**
- `name` - Function name (string)
- `app` - Express application
- `options` - Configuration options (optional)

**Options:**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `route` | string | `'{*path}'` | Azure Functions route pattern |
| `basePath` | string | `''` | Path prefix to strip before routing to Express |
| `methods` | string[] | All methods | HTTP methods to accept |
| `authLevel` | string | `'anonymous'` | Azure Functions auth level |
| `enableStreaming` | boolean | `true` | Enable streaming responses |
| `timeout` | number | `30000` | Request timeout (ms) |
| `port` | number | `0` | Express server port (0 = auto) |

**Returns:** `ExpressServer` - Server instance for lifecycle management

### `stopAllServers()`

Stops all Express servers. Use during app termination.

```typescript
import { app } from '@azure/functions';
import { stopAllServers } from '@azure/functions-extensions-express';

app.hook.appTerminate(async () => {
    await stopAllServers();
});
```

### `getServer(name)`

Gets an Express server by function name.

```typescript
import { getServer } from '@azure/functions-extensions-express';

const server = getServer('api');
console.log(`Server running on port ${server?.port}`);
```

## How It Works

This extension runs Express as a real HTTP server on localhost within the Azure Functions worker process. When an HTTP request arrives at Azure Functions:

1. The request is proxied to the Express server
2. Express handles it with full middleware support
3. The response is streamed back to the client

This architecture provides true Express compatibility without adaptation layers.

## Requirements

- Node.js 18+
- @azure/functions ^4.0.0
- Express ^4.0.0 or ^5.0.0

## License

MIT
