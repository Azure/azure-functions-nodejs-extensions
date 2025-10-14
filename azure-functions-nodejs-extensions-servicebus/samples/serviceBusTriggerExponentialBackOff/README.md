# Service Bus Exponential Backoff Demo - Simplified

This simplified sample demonstrates exponential backoff behavior for Azure Service Bus triggers.

## Hardcoded Behavior

**Every message sent to this function will:**
1. **Fail on delivery 1** (immediate)
2. **Fail on delivery 2** (~2 second delay)  
3. **Fail on delivery 3** (~4 second delay)
4. **Succeed on delivery 4** (~8 second delay)

Uses Service Bus `deliveryCount` to track retry attempts (not custom counters).

4. **Succeed on attempt 4** (~8 second delay)- **Proper error handling** with abandon/deadletter operations

- **Different failure scenarios** (transient, poison, timeout)

This predictable pattern makes it easy to observe and validate exponential backoff timing.

## Configuration

## Quick Start

### Host.json Settings

1. **Configure Service Bus connection** in `local.settings.json`:The `host.json` is configured for optimal exponential backoff testing:

   ```json

   {```json

     "Values": {{

       "ServiceBusConnection": "Endpoint=sb://your-namespace.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=your-key"  "extensions": {

     }    "serviceBus": {

   }      "prefetchCount": 1,           // Process one message at a time

   ```      "maxConcurrentCalls": 1,      // Single threaded for clear tracking

      "maxMessageBatchSize": 1      // One message per invocation

2. **Create a queue named `testqueue`** in your Service Bus namespace    }

  },

3. **Start the function**:  "retry": {

   ```bash    "strategy": "exponentialBackoff",

   npm install    "maxRetryCount": 5,             // Maximum retry attempts

   npm run build    "minimumInterval": "00:00:02",  // Start with 2 second delay

   func start    "maximumInterval": "00:00:30",  // Cap at 30 seconds

   ```    "deltaBackoff": "00:00:02"      // Backoff increment

  }

4. **Send a test message**:}

   ```bash```

   node sendTestMessage.js

   ```### Queue Configuration

- **Queue Name**: `exponential-backoff-test-queue`

## Expected Log Output- **SDK Binding**: `true` (enables advanced message operations)

- **Auto Complete**: `false` (manual message completion for error handling)

```

📬 Processing Message ID: backoff-demo-1634567890123## Testing Scenarios

📊 Delivery Count: 1 | Attempt: 1

❌ Simulated failure 1/3 - triggering exponential backoff### 1. Transient Failures

🔄 Abandoning message for exponential backoff retry...Send a message with `failureType: "transient"`:



[~2 seconds later]```json

📬 Processing Message ID: backoff-demo-1634567890123  {

📊 Delivery Count: 2 | Attempt: 2  "failureType": "transient",

⏱️ Time since last attempt: 2 seconds  "data": "test data"

❌ Simulated failure 2/3 - triggering exponential backoff}

🔄 Abandoning message for exponential backoff retry...```



[~4 seconds later]**Expected Behavior**:

📬 Processing Message ID: backoff-demo-1634567890123- Fails 3 times, succeeds on 4th attempt

📊 Delivery Count: 3 | Attempt: 3  - Demonstrates exponential backoff timing

⏱️ Time since last attempt: 4 seconds- Message is completed after successful retry

❌ Simulated failure 3/3 - triggering exponential backoff

🔄 Abandoning message for exponential backoff retry...### 2. Poison Messages

Send a message with `failureType: "poison"`:

[~8 seconds later]

📬 Processing Message ID: backoff-demo-1634567890123```json

📊 Delivery Count: 4 | Attempt: 4{

⏱️ Time since last attempt: 8 seconds  "failureType": "poison",

✅ SUCCESS on attempt 4! Processing message.  "data": "problematic data"

🎉 Message completed successfully after 4 attempts}

``````



## Key Configuration**Expected Behavior**:

- Continues failing until max delivery count (5)

- **Queue**: `testqueue`- Eventually sent to deadletter queue

- **Manual message completion**: Ensures proper error handling- Demonstrates poison message handling

- **Single message processing**: Clear timing observation

- **Max delivery count**: 5 (messages deadletter after 5 failed deliveries)### 3. Timeout Scenarios

Send a message with `failureType: "timeout"`:

This simplified approach removes complexity and focuses purely on demonstrating the exponential backoff pattern in action!
```json
{
  "failureType": "timeout",
  "data": "slow processing data"
}
```

**Expected Behavior**:
- Simulates 2-second processing delays
- Fails twice, succeeds on 3rd attempt
- Shows timeout recovery patterns

### 4. Successful Processing
Send a message with no `failureType` or `failureType: "none"`:

```json
{
  "data": "normal processing data"
}
```

**Expected Behavior**:
- Processes successfully on first attempt
- Demonstrates normal message flow

## What the Sample Tracks

### Timing Analysis
- **Attempt Count**: Number of processing attempts per message
- **Delivery Count**: Service Bus delivery count 
- **Time Intervals**: Actual time between retry attempts
- **Backoff Ratios**: Comparison of actual vs expected backoff timing

### Expected Exponential Backoff Pattern
- **Attempt 1**: Immediate (0 seconds)
- **Attempt 2**: ~2 seconds after attempt 1
- **Attempt 3**: ~4 seconds after attempt 2  
- **Attempt 4**: ~8 seconds after attempt 3
- **Attempt 5**: ~16 seconds after attempt 4

### Sample Log Output
```
=== Service Bus Exponential Backoff Analysis ===
Message ID: test-message-123
Delivery Count: 2
Attempt Count: 3
Enqueued Time: 2025-10-13T10:15:30.000Z
Current Time: 2025-10-13T10:15:38.000Z
Time since last attempt: 4 seconds
Expected backoff (theoretical): ~4 seconds
Backoff ratio (actual/expected): 1.05
🔄 Simulating transient failure (attempt 3/4)
❌ Processing failed: Error: Transient failure simulation - attempt 3
🔄 Abandoning message for retry. Delivery count: 3
```

## Setup Instructions

1. **Create Service Bus Resources**:
   ```bash
   # Create a Service Bus namespace and queue
   az servicebus namespace create --name your-namespace --resource-group your-rg
   az servicebus queue create --name exponential-backoff-test-queue --namespace-name your-namespace --resource-group your-rg
   ```

2. **Configure Connection String**:
   Update `local.settings.json`:
   ```json
   {
     "Values": {
       "ServiceBusConnection": "Endpoint=sb://your-namespace.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=your-key"
     }
   }
   ```

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Start the Function**:
   ```bash
   func start
   ```

5. **Send Test Messages**:
   Use Azure Portal, Service Bus Explorer, or Azure CLI to send messages with different `failureType` values.

## Validation Points

✅ **Exponential Backoff Timing**: Verify increasing delays between attempts  
✅ **Retry Limits**: Confirm messages deadletter after max attempts  
✅ **Message State Management**: Check proper complete/abandon/deadletter operations  
✅ **Error Handling**: Validate different failure scenario responses  
✅ **Delivery Count Tracking**: Monitor Service Bus delivery count increments  

## Notes

- The sample uses in-memory tracking for demonstration purposes
- In production, consider persistent storage for attempt tracking
- Timing may vary slightly due to Service Bus processing overhead
- The exponential backoff is managed by the Azure Functions runtime and Service Bus service