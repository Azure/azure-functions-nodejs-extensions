# Express on Azure Functions - Getting Started

This sample shows how to create a new Express API from scratch and host it on Azure Functions using [`@azure/functions-extensions-express`](../../README.md). It demonstrates CRUD routes, middleware, Server-Sent Events (SSE) streaming, and graceful shutdown — all with standard Express code.

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Azure Functions Core Tools](https://learn.microsoft.com/azure/azure-functions/functions-run-tools) v4
- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) (for deployment)

## Quick Start

```bash
# Install dependencies
npm install

# Build and run locally
npm start
```

The Functions host will start and list every registered endpoint:

```
api-GET-health       -> http://localhost:7071/health
api-GET-items        -> http://localhost:7071/items
api-GET-items-id     -> http://localhost:7071/items/:id
api-POST-items       -> http://localhost:7071/items
api-PUT-items-id     -> http://localhost:7071/items/:id
api-DELETE-items-id  -> http://localhost:7071/items/:id
api-GET-stream       -> http://localhost:7071/stream
```

## Project Structure

```
express-getting-started/
├── src/
│   └── functions/
│       └── index.ts           # Express app — start here!
├── scripts/
│   ├── create-deploy-zip.js   # Zip packaging for deployment
│   └── create-deploy-zip.ps1
├── host.json                  # Azure Functions host config
├── local.settings.json        # Local development settings
├── package.json
└── tsconfig.json
```

## How It Works

### 1. Create your Express app

Write regular Express code — middleware, routes, error handlers — exactly as you would in any Node.js project:

```typescript
import express, { Request, Response, NextFunction } from 'express';

const expressApp = express();
expressApp.use(express.json());

expressApp.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

expressApp.get('/items', (_req, res) => res.json(items));
```

### 2. Register with Azure Functions

A single call to `expressApp()` from `@azure/functions-extensions-express` auto-discovers your routes and registers each one as a separate Azure Function:

```typescript
import { expressApp as registerExpress } from '@azure/functions-extensions-express';

const server = registerExpress('endpoint', expressApp, {
    enableStreaming: true,
});
```

### 3. Optional: graceful shutdown

```typescript
import { app } from '@azure/functions';

app.hook.appTerminate(async () => {
    await server.stop();
});
```

That's it — no wrappers, no adapters, just your regular Express code.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| GET | /items | List all items |
| GET | /items/:id | Get a single item |
| POST | /items | Create a new item |
| PUT | /items/:id | Update an item |
| DELETE | /items/:id | Delete an item |
| GET | /stream | Server-Sent Events stream |

## Test the API

```bash
# Health check
curl http://localhost:7071/health

# List items
curl http://localhost:7071/items

# Create item
curl -X POST http://localhost:7071/items \
  -H "Content-Type: application/json" \
  -d '{"name": "New Item", "description": "A new item"}'

# Update item
curl -X PUT http://localhost:7071/items/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name"}'

# Delete item
curl -X DELETE http://localhost:7071/items/1

# Streaming (Server-Sent Events)
curl -N http://localhost:7071/stream
```

## Deploy to Azure

### Option A: Azure Functions Core Tools

```bash
az login

# Create a Function App (if not already created)
az functionapp create \
  --resource-group <resource-group> \
  --consumption-plan-location <region> \
  --runtime node --runtime-version 20 \
  --functions-version 4 \
  --name <app-name> \
  --storage-account <storage>

# Publish
func azure functionapp publish <app-name>
```

### Option B: Zip Deploy

The project includes a packaging script that resolves local symlinks/junctions and produces a Linux-compatible zip:

```bash
# Build first
npm run build

# Create deploy.zip
node scripts/create-deploy-zip.js

# Deploy
az functionapp deployment source config-zip \
  -g <resource-group> -n <app-name> --src deploy.zip
```

## Adding More Features

Add routes, middleware, and routers exactly as you would in any Express project:

```typescript
// Authentication middleware
expressApp.use('/admin', authMiddleware);

// Additional routes
expressApp.get('/users', userController.getAll);
expressApp.post('/orders', orderController.create);

// Express Router for organization
const v1 = express.Router();
v1.get('/products', productController.list);
expressApp.use('/v1', v1);
```

All new routes are automatically registered as Azure Functions on the next start.

## Key Benefits

- **No code changes** — Use your existing Express knowledge and code as-is
- **Full middleware support** — All Express middleware works without modification
- **Streaming** — SSE and large responses stream natively
- **Per-route functions** — Each Express route becomes its own Azure Function for independent scaling and monitoring
- **Serverless scaling** — Azure Functions handles scaling automatically
