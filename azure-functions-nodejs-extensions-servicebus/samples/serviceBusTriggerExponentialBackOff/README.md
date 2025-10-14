# Service Bus Exponential Backoff Demo

This sample demonstrates how Azure Service Bus automatically handles exponential backoff when messages are abandoned. It simulates a failing service that eventually succeeds after multiple retry attempts.

## How It Works

**Every message sent to this function will:**
1. **Fail on delivery attempt 1** (with 2s processing delay)
2. **Fail on delivery attempt 2** (with 4s processing delay) 
3. **Fail on delivery attempt 3** (with 8s processing delay)
4. **Succeed on delivery attempt 4+** (with 16s processing delay)

The sample uses Service Bus `deliveryCount` to determine which attempt this is, and Service Bus automatically handles the exponential backoff timing between retries.

## Key Features

- **Predictable failure pattern** for easy observation of backoff timing
- **Processing delays** that increase exponentially (2s, 4s, 8s, 16s)
- **Proper message handling** with abandon/complete/deadletter operations
- **Manual message completion** for full control over message lifecycle

## Quick Start

1. **Configure Service Bus connection** in `local.settings.json`:
   ```json
   {
     "Values": {
       "ServiceBusConnection": "Endpoint=sb://your-namespace.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=your-key"
     }
   }
   ```

2. **Create a queue named `testqueue`** in your Service Bus namespace

3. **Install dependencies and start the function**:
   ```bash
   npm install
   npm run build
   func start
   ```

4. **Send a test message**:
   ```bash
   node sendTestMessage.js
   ```

## Expected Log Output

```
Processing message backoff-demo-1634567890123, delivery attempt: 1
Simulating 2s processing time...
Simulated failure on attempt 1 - abandoning message
Processing failed: Error: Intentional failure for demo (attempt 1)

[Service Bus automatically waits ~2-4 seconds before retry]

Processing message backoff-demo-1634567890123, delivery attempt: 2  
Simulating 4s processing time...
Simulated failure on attempt 2 - abandoning message
Processing failed: Error: Intentional failure for demo (attempt 2)

[Service Bus automatically waits ~4-8 seconds before retry]

Processing message backoff-demo-1634567890123, delivery attempt: 3
Simulating 8s processing time...
Simulated failure on attempt 3 - abandoning message  
Processing failed: Error: Intentional failure for demo (attempt 3)

[Service Bus automatically waits ~8-16 seconds before retry]

Processing message backoff-demo-1634567890123, delivery attempt: 4
Simulating 16s processing time...
Success on attempt 4! Completing message.
```

## Configuration Details

### Function Settings
- **Queue**: `testqueue` 
- **SDK Binding**: `true` (enables advanced message operations)
- **Auto Complete**: `false` (manual message completion for error handling)
- **Cardinality**: `one` (processes one message at a time for clarity)

### Service Bus Behavior
- **Max Delivery Count**: 5 (messages are sent to dead letter queue after 5 failed attempts)
- **Exponential Backoff**: Managed automatically by Service Bus when messages are abandoned
- **Processing Delays**: Simulated in the function (2s, 4s, 8s, 16s) to demonstrate increasing load
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

## How the Sample Works

The sample implements a simple hardcoded failure pattern:

1. **Processing Simulation**: Each attempt includes an increasing processing delay:
   - Attempt 1: 2 seconds
   - Attempt 2: 4 seconds  
   - Attempt 3: 8 seconds
   - Attempt 4: 16 seconds

2. **Failure Logic**: The function intentionally fails on delivery attempts 1-3 and succeeds on attempt 4+

3. **Message Actions**:
   - **Failed attempts**: `abandon()` - triggers Service Bus exponential backoff
   - **Successful attempts**: `complete()` - removes message from queue
   - **Max retries exceeded**: `deadletter()` - sends to dead letter queue

## Code Structure

The sample consists of:
- **Main function**: `serviceBusExponentialBackoffTrigger` - handles message processing
- **Test utility**: `sendTestMessage.js` - sends test messages to the queue  
- **Configuration**: `host.json` and `local.settings.json` - function and Service Bus settings

## Validation Points

✅ **Exponential Backoff Timing**: Observe increasing delays between retry attempts  
✅ **Delivery Count Progression**: Verify Service Bus increments deliveryCount correctly  
✅ **Message Lifecycle**: Confirm proper abandon/complete/deadletter operations  
✅ **Processing Delays**: See exponential increase in simulated processing time  
✅ **Dead Letter Handling**: Messages with 5+ delivery attempts go to dead letter queue

## Notes

- **Backoff Timing**: Managed automatically by Azure Service Bus (not the function)
- **Processing Delays**: Simulated using `setTimeout()` to demonstrate increasing load
- **Message Flow**: Each message follows the same predictable 3-fail-then-succeed pattern
- **Observability**: Simple logging shows delivery count, processing time, and outcomes