// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { registerKafkaRecordFactory } from './kafka/registerKafkaRecordFactory';

registerKafkaRecordFactory();

// Export types for customer consumption
export type { KafkaHeader, KafkaRecord, KafkaTimestamp, KafkaTimestampType } from '../types';
