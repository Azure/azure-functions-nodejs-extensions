# Express on Azure Functions - Getting Started

This sample shows how to create a new Express API from scratch and host it on Azure Functions.

## Quick Start

```bash
# Install dependencies
npm install

# Build and run
npm start
```

## Project Structure

```
express-getting-started/
├── src/
│   └── functions/
│       └── index.ts       # Your Express app - start here!
├── host.json              # Azure Functions host configuration
├── local.settings.json    # Local development settings
├── package.json
└── tsconfig.json
```

## How It Works

1. **Create your Express app** just like you normally would:
   ```typescript
   const expressApp = express();
   expressApp.use(express.json());
   expressApp.get('/items', (req, res) => res.json(items));
   ```

2. **Register it with Azure Functions** in one line:
   ```typescript
   app.express('api', expressApp, {
       route: '{*path}',
       basePath: '/api'
   });
   ```

That's it! No wrappers, no special syntax - just your regular Express code.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Health check |
| GET | /api/items | Get all items |
| GET | /api/items/:id | Get single item |
| POST | /api/items | Create new item |
| PUT | /api/items/:id | Update item |
| DELETE | /api/items/:id | Delete item |

## Test the API

```bash
# Health check
curl http://localhost:7071/api/health

# Get all items
curl http://localhost:7071/api/items

# Create item
curl -X POST http://localhost:7071/api/items \
  -H "Content-Type: application/json" \
  -d '{"name": "New Item", "description": "A new item"}'

# Update item
curl -X PUT http://localhost:7071/api/items/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name"}'

# Delete item
curl -X DELETE http://localhost:7071/api/items/1
```

## Benefits

- **No code changes required** - Use your existing Express knowledge
- **Same Node.js process** - No cold starts for Express, runs in the same worker
- **Full Express ecosystem** - Use any Express middleware, router, etc.
- **Serverless scaling** - Azure Functions handles scaling automatically

## Adding More Features

Want to add more routes? Just add them to your Express app:

```typescript
// Add authentication middleware
expressApp.use('/admin', authMiddleware);

// Add more routes
expressApp.get('/users', userController.getAll);
expressApp.post('/orders', orderController.create);

// Use Express Router for organization
const apiRouter = express.Router();
apiRouter.get('/products', productController.list);
expressApp.use('/v1', apiRouter);
```

## Deploy to Azure

```bash
# Login to Azure
az login

# Create a Function App
az functionapp create --resource-group <rg> --consumption-plan-location <region> \
  --runtime node --runtime-version 20 --functions-version 4 \
  --name <app-name> --storage-account <storage>

# Deploy
func azure functionapp publish <app-name>
```
