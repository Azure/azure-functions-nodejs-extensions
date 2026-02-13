// Test Message Sender for Binary Data Access Demo
// Uses keyless authentication with DefaultAzureCredential (az login)
//
// Usage:
//   node sendTestMessage.js                    # Send all test messages
//   node sendTestMessage.js json               # Send normal JSON message only
//   node sendTestMessage.js largeNumber        # Send large number JSON message only
//   node sendTestMessage.js binary             # Send non-JSON binary message only

const { ServiceBusClient } = require('@azure/service-bus');
const { DefaultAzureCredential } = require('@azure/identity');

// Configuration - Update with your Service Bus namespace
const fullyQualifiedNamespace =
    process.env.SERVICE_BUS_NAMESPACE || 'funcext-sb-test.servicebus.windows.net';
const queueName = 'testqueue';

async function sendTestMessages(filter) {
    const credential = new DefaultAzureCredential();
    const sbClient = new ServiceBusClient(fullyQualifiedNamespace, credential);
    const sender = sbClient.createSender(queueName);

    try {
        // Test 1: Normal JSON message
        if (!filter || filter === 'json') {
            console.log('--- Test 1: Normal JSON message ---');
            await sender.sendMessages({
                messageId: `json-test-${Date.now()}`,
                body: JSON.stringify({ name: 'test', value: 42, nested: { key: 'hello' } }),
                contentType: 'application/json',
            });
            console.log('Sent normal JSON message');
        }

        // Test 2: JSON with large numbers (Issue #27 use case)
        if (!filter || filter === 'largeNumber') {
            console.log('\n--- Test 2: JSON with large numbers (Issue #27 use case) ---');
            // This JSON contains a number outside Number.MAX_SAFE_INTEGER range
            const largeNumberJson = '{"orderId":"abc-123","amount":9007199254740993,"currency":"USD"}';
            await sender.sendMessages({
                messageId: `large-number-test-${Date.now()}`,
                body: largeNumberJson,
                contentType: 'application/json',
            });
            console.log('Sent large number JSON message');
            console.log('Note: 9007199254740993 > Number.MAX_SAFE_INTEGER (9007199254740991)');
        }

        // Test 3: Non-JSON binary data (will trigger DLQ)
        if (!filter || filter === 'binary') {
            console.log('\n--- Test 3: Non-JSON binary data (expected to go to DLQ) ---');
            await sender.sendMessages({
                messageId: `binary-test-${Date.now()}`,
                body: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // PNG header bytes
                contentType: 'application/octet-stream',
            });
            console.log('Sent non-JSON binary data (PNG header bytes)');
            console.log('Expected: This message should be sent to Dead Letter Queue');
        }

        console.log('\nAll test messages sent. Watch your Azure Functions logs!');
    } catch (error) {
        console.error('Error sending test messages:', error);
    } finally {
        await sender.close();
        await sbClient.close();
    }
}

const filter = process.argv[2]; // optional: 'json', 'largeNumber', or 'binary'
sendTestMessages(filter).catch(console.error);
