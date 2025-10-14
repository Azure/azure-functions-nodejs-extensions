// Simple Test Message Sender for Exponential Backoff Demo
// Sends a message that will trigger the hardcoded 3-fail-then-succeed behavior

const { ServiceBusClient } = require('@azure/service-bus');

// Configuration - Update with your connection string
const connectionString =
    process.env.ServiceBusConnection ||
    'Endpoint=sb://your-namespace.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=your-key';
const queueName = 'testqueue';

async function sendTestMessage() {
    if (connectionString.includes('your-namespace')) {
        console.log('❌ Please set the ServiceBusConnection environment variable or update the connection string');
        process.exit(1);
    }

    const sbClient = new ServiceBusClient(connectionString);
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
