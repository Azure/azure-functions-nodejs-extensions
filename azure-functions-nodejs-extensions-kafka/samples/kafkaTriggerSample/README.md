# Kafka Record Trigger Sample

This sample demonstrates how to use the `@azure/functions-extensions-kafka` extension to bind to raw Apache Kafka records with full metadata access.

## Overview

This sample shows how to:
- Set up a Kafka trigger with the `KafkaRecord` binding
- Access raw key/value as `Buffer` (user controls deserialization)
- Read record metadata: topic, partition, offset, timestamp, leader epoch
- Iterate over Kafka headers

## Key Features

- **Raw Bytes**: Key and value are `Buffer` — no automatic deserialization, full control
- **Full Metadata**: Access topic, partition, offset, timestamp type, leader epoch
- **Headers**: Iterate over all Kafka record headers with raw byte values
- **Non-breaking**: Existing string/generic bindings continue to work — opt in via `KafkaRecord` type

## Code Structure

### Main Function (`kafkaTrigger.ts`)

```typescript
import '@azure/functions-extensions-kafka';
import { app } from '@azure/functions';
import type { KafkaRecord } from '@azure/functions-extensions-kafka';

export async function kafkaTrigger(record: KafkaRecord, context) {
    context.log(`Topic: ${record.topic}, Partition: ${record.partition}, Offset: ${record.offset}`);

    if (record.key) {
        context.log(`Key: ${Buffer.from(record.key).toString('utf-8')}`);
    }
    if (record.value) {
        context.log(`Value: ${Buffer.from(record.value).toString('utf-8')}`);
    }

    context.log(`Timestamp: ${new Date(record.timestamp.unixTimestampMs).toISOString()}`);

    for (const header of record.headers) {
        const value = header.value ? Buffer.from(header.value).toString('utf-8') : '(null)';
        context.log(`Header: ${header.key} = ${value}`);
    }
}

app.generic('kafkaTrigger1', {
    trigger: {
        type: 'kafkaTrigger',
        direction: 'in',
        name: 'record',
        topic: 'my-topic',
        brokerList: '%BrokerList%',
        consumerGroup: '$Default',
    },
    handler: kafkaTrigger,
});
```

### Extension Registration (`index.ts`)

```typescript
// Import the Kafka extension to register the KafkaRecord factory.
// This import has side effects — it registers the Protobuf deserializer.
import '@azure/functions-extensions-kafka';
```

## Prerequisites

- Node.js 20+
- [Azure Functions Core Tools](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local) v4
- A Kafka broker (Confluent Cloud, Azure Event Hubs with Kafka endpoint, or local Docker broker)

## Quick Start

### 1. Configure local settings

Copy the example file and update your Kafka broker settings:

```bash
cp local.settings.json.example local.settings.json
```

Edit `local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "BrokerList": "<your-kafka-broker>:9092"
  }
}
```

For **Confluent Cloud** or **SASL/SSL** brokers, add authentication settings to the trigger configuration:

```typescript
app.generic('kafkaTrigger1', {
    trigger: {
        type: 'kafkaTrigger',
        direction: 'in',
        name: 'record',
        topic: 'my-topic',
        brokerList: '%BrokerList%',
        consumerGroup: '$Default',
        protocol: 'SaslSsl',
        authenticationMode: 'Plain',
        username: '%KafkaUsername%',
        password: '%KafkaPassword%',
    },
    handler: kafkaTrigger,
});
```

For **Azure Event Hubs** with Kafka endpoint:

```json
{
  "Values": {
    "BrokerList": "<your-namespace>.servicebus.windows.net:9093",
    "KafkaUsername": "$ConnectionString",
    "KafkaPassword": "Endpoint=sb://<your-namespace>.servicebus.windows.net/;SharedAccessKeyName=...;SharedAccessKey=..."
  }
}
```

### 2. Install, build, and run

```bash
npm install
npm run build
func start
```

### 3. Produce messages

Send messages to your Kafka topic using any Kafka producer (e.g., `kafkajs`, `kcat`, Confluent Cloud console, or Azure Event Hubs portal).

## Configuration

### Trigger Settings

| Setting | Value | Description |
|---------|-------|-------------|
| `type` | `'kafkaTrigger'` | Kafka trigger binding type |
| `topic` | `'my-topic'` | Kafka topic to consume from |
| `brokerList` | `'%BrokerList%'` | Bootstrap server(s), resolved from app settings |
| `consumerGroup` | `'$Default'` | Consumer group name |
| `protocol` | (optional) | `'SaslSsl'`, `'SaslPlaintext'`, `'Ssl'`, `'Plaintext'` |
| `authenticationMode` | (optional) | `'Plain'`, `'ScramSha256'`, `'ScramSha512'` |

### KafkaRecord Properties

| Property | Type | Description |
|----------|------|-------------|
| `topic` | `string` | Topic name |
| `partition` | `number` | Partition number |
| `offset` | `number` | Offset within partition |
| `key` | `Buffer \| null` | Raw key bytes |
| `value` | `Buffer \| null` | Raw value bytes |
| `timestamp` | `KafkaTimestamp` | Record timestamp with `unixTimestampMs` and `type` |
| `headers` | `KafkaHeader[]` | Array of headers with `key` (string) and `value` (Buffer \| null) |
| `leaderEpoch` | `number \| null` | Leader epoch, if available |

### KafkaTimestampType

| Value | Name | Description |
|-------|------|-------------|
| `0` | `NotAvailable` | Timestamp not available |
| `1` | `CreateTime` | Set by the producer |
| `2` | `LogAppendTime` | Set by the broker |

## Troubleshooting

### Common Issues

1. **Extension not loaded**: Make sure `import '@azure/functions-extensions-kafka'` is in your `src/index.ts`
2. **Connection errors**: Verify `BrokerList` is correct and accessible from your dev machine
3. **No messages**: Confirm the topic exists and the consumer group has no prior offsets (or try a new group)
4. **Build errors**: Run `npm run build` to compile TypeScript before `func start`

### Useful Commands

```bash
# Clean and rebuild
npm run clean && npm run build

# Watch for changes during development
npm run watch

# Start with verbose logging
func start --verbose
```

## Related

- [Azure Functions Kafka Extension documentation](https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-kafka)
- [Parent issue: Azure/azure-functions-kafka-extension#612](https://github.com/Azure/azure-functions-kafka-extension/issues/612)
