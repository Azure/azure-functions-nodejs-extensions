// Simple Test Message Sender for Exponential Backoff Demo
// Uses keyless authentication with DefaultAzureCredential (az login)

const { ServiceBusClient } = require('@azure/service-bus');
const { DefaultAzureCredential } = require('@azure/identity');

// Configuration - Update with your Service Bus namespace
const fullyQualifiedNamespace =
    process.env.SERVICE_BUS_NAMESPACE || 'funcext-sb-test.servicebus.windows.net';
const queueName = 'testqueue';

async function sendTestMessage() {
    // Use DefaultAzureCredential for keyless authentication
    const credential = new DefaultAzureCredential();
    const sbClient = new ServiceBusClient(fullyQualifiedNamespace, credential);
    const sender = sbClient.createSender(queueName);

    try {
        console.log('🚀 Sending test message for exponential backoff demo...\n');

        await sender.sendMessages({
            messageId: `backoff-demo-${Date.now()}`,
            body: 'This message will fail 3 times and succeed on the 4th attempt!',
            label: 'ExponentialBackoffDemo',
        });

        console.log('✅ Test message sent successfully!');
        console.log('\n📊 Expected behavior:');
        console.log('  - Attempt 1: Immediate failure');
        console.log('  - Attempt 2: ~2 second delay, then failure');
        console.log('  - Attempt 3: ~4 second delay, then failure');
        console.log('  - Attempt 4: ~8 second delay, then SUCCESS!');
        console.log('\n📱 Watch your Azure Functions logs to see the exponential backoff in action!');
    } catch (error) {
        console.error('❌ Error sending test message:', error);
    } finally {
        await sender.close();
        await sbClient.close();
    }
}

sendTestMessage().catch(console.error);
