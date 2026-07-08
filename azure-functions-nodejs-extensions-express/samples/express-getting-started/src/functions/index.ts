/**
 * Express API on Azure Functions - Getting Started
 *
 * This sample shows how to create a new Express API from scratch
 * and host it on Azure Functions. Just write your Express code
 * like you normally would!
 */

import express, { Request, Response, NextFunction } from 'express';
import { app } from '@azure/functions';
import { expressApp as registerExpress } from '@azure/functions-extensions-express';

// ============================================================================
// STEP 1: Create your Express app (just like you normally would!)
// ============================================================================
const expressApp = express();

// Add middleware
expressApp.use(express.json());

// Simple request logging
expressApp.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ============================================================================
// STEP 2: Define your API routes
// ============================================================================

// Health check endpoint
expressApp.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Simple CRUD example with in-memory storage
interface Item {
    id: number;
    name: string;
    description?: string;
}

const items: Item[] = [
    { id: 1, name: 'First Item', description: 'This is the first item' },
    { id: 2, name: 'Second Item', description: 'This is the second item' },
];
let nextId = 3;

// GET all items
expressApp.get('/items', (_req: Request, res: Response) => {
    console.log('Fetching all items');
    res.json(items);
});

// GET single item
expressApp.get('/items/:id', (req: Request, res: Response) => {
    const item = items.find((i) => i.id === parseInt(req.params.id));
    if (!item) {
        res.status(404).json({ error: 'Item not found' });
        return;
    }
    res.json(item);
});

// CREATE new item
expressApp.post('/items', (req: Request, res: Response) => {
    const { name, description } = req.body as { name?: string; description?: string };
    if (!name) {
        res.status(400).json({ error: 'Name is required' });
        return;
    }
    const newItem: Item = { id: nextId++, name, description };
    items.push(newItem);
    res.status(201).json(newItem);
});

// UPDATE item
expressApp.put('/items/:id', (req: Request, res: Response) => {
    const item = items.find((i) => i.id === parseInt(req.params.id));
    if (!item) {
        res.status(404).json({ error: 'Item not found' });
        return;
    }
    const { name, description } = req.body as { name?: string; description?: string };
    if (name) item.name = name;
    if (description !== undefined) item.description = description;
    res.json(item);
});

// DELETE item
expressApp.delete('/items/:id', (req: Request, res: Response) => {
    const index = items.findIndex((i) => i.id === parseInt(req.params.id));
    if (index === -1) {
        res.status(404).json({ error: 'Item not found' });
        return;
    }
    const deleted = items.splice(index, 1)[0];
    res.json({ message: 'Deleted', item: deleted });
});

// ============================================================================
// BONUS: Streaming endpoint - showcases sidecar's streaming capability!
// ============================================================================
expressApp.get('/stream', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let count = 0;
    const maxEvents = 5;

    console.log('Starting SSE stream...');

    const interval = setInterval(() => {
        count++;
        const data = {
            event: count,
            timestamp: new Date().toISOString(),
            message: `Server-Sent Event #${count}`,
        };

        res.write(`data: ${JSON.stringify(data)}\n\n`);
        console.log(`Sent event ${count}`);

        if (count >= maxEvents) {
            clearInterval(interval);
            res.write(`data: ${JSON.stringify({ event: 'done', message: 'Stream ended' })}\n\n`);
            res.end();
            console.log('Stream ended');
        }
    }, 1000);

    // Handle client disconnect
    res.on('close', () => {
        clearInterval(interval);
        console.log('Client disconnected from stream');
    });
});

// Error handler
expressApp.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
});

// ============================================================================
// STEP 3: Register your Express app with Azure Functions
//
// expressApp() automatically discovers ALL routes you defined above
// and creates a separate Azure Function for each one:
//
//   api-GET-health        -> route: 'health'
//   api-GET-items         -> route: 'items'
//   api-GET-items-id      -> route: 'items/{id}'
//   api-POST-items        -> route: 'items'
//   api-PUT-items-id      -> route: 'items/{id}'
//   api-DELETE-items-id   -> route: 'items/{id}'
//   api-GET-stream        -> route: 'stream'
//
// Express runs as a real HTTP server on localhost, which provides
// FULL Express compatibility including:
// - Streaming responses (SSE, file downloads)
// - All middleware works exactly as designed
// - Real socket connections
// ============================================================================
const server = registerExpress('endpoint', expressApp, {
    enableStreaming: true, // Enable streaming for SSE support
});

// Optional: Handle graceful shutdown
app.hook.appTerminate(async () => {
    console.log('Shutting down Express server...');
    await server.stop();
});

// ============================================================================
// That's it! Each Express route is now a separate Azure Function.
//
// To run locally:
//   npm install
//   npm start
//
// You'll see each function registered individually:
//   api-GET-health       -> http://localhost:7071/api/health
//   api-GET-items        -> http://localhost:7071/api/items
//   api-GET-items-id     -> http://localhost:7071/api/items/:id
//   api-POST-items       -> http://localhost:7071/api/items
//   api-PUT-items-id     -> http://localhost:7071/api/items/:id
//   api-DELETE-items-id  -> http://localhost:7071/api/items/:id
//   api-GET-stream       -> http://localhost:7071/api/stream  (SSE!)
// ============================================================================
