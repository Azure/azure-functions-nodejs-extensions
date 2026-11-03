# @azure/functions-extensions-kafka

Node.js Kafka extension for Azure Functions — raw `KafkaRecord` binding with full metadata access.

## Installation

```bash
npm install @azure/functions-extensions-kafka
```

## Usage

```typescript
// src/index.ts — register the extension (required, has side effects)
import '@azure/functions-extensions-kafka';
```

```typescript
// src/functions/kafkaTrigger.ts
import '@azure/functions-extensions-kafka';
import { app } from '@azure/functions';
import type { KafkaRecord } from '@azure/functions-extensions-kafka';

app.generic('kafkaTrigger1', {
    trigger: {
        type: 'kafkaTrigger',
        direction: 'in',
        name: 'record',
        topic: 'my-topic',
        brokerList: '%BrokerList%',
        consumerGroup: '$Default',
    },
    handler: async (record: KafkaRecord, context) => {
        context.log(`Topic: ${record.topic}, Partition: ${record.partition}`);
        context.log(`Value: ${Buffer.from(record.value!).toString('utf-8')}`);

        for (const header of record.headers) {
            const value = header.value ? Buffer.from(header.value).toString('utf-8') : '(null)';
            context.log(`Header: ${header.key} = ${value}`);
        }
    },
});
```

## KafkaRecord Properties

| Property | Type | Description |
|----------|------|-------------|
| `topic` | `string` | Topic name |
| `partition` | `number` | Partition number |
| `offset` | `number` | Offset within partition |
| `key` | `Buffer \| null` | Raw key bytes |
| `value` | `Buffer \| null` | Raw value bytes |
| `timestamp` | `KafkaTimestamp` | Timestamp with `unixTimestampMs` and `type` |
| `headers` | `KafkaHeader[]` | Headers with `key` and `value` (Buffer) |
| `leaderEpoch` | `number \| null` | Leader epoch |

## How It Works

This extension registers a `KafkaRecordFactory` with the Azure Functions `ResourceFactoryResolver`. When a Kafka trigger delivers a message, the factory:

1. Receives Protobuf-encoded `ModelBindingData` from the host process
2. Decodes the binary payload into a `KafkaRecord` object
3. Provides the record to your function with all metadata preserved

No changes are needed to `@azure/functions` (library) or the Node.js worker — only this extension package.

## Samples

See [`samples/kafkaTriggerSample`](./samples/kafkaTriggerSample/) for a complete working example.

## Related

- [Azure Functions Kafka Extension](https://github.com/Azure/azure-functions-kafka-extension)
- [Kafka bindings documentation](https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-kafka)
