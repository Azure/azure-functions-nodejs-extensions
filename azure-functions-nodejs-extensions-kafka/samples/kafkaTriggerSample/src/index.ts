// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

// Import the Kafka extension to register the KafkaRecord factory.
// This import has side effects — it registers the Protobuf deserializer
// with the ResourceFactoryResolver so KafkaTrigger can bind to KafkaRecord.
import '@azure/functions-extensions-kafka';
